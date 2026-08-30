"""
Fase I.B — Curadoria visual e export final derivado para quadrinhos/mangá.
Fase J.A — Pipeline de export final derivado controlado (rastreabilidade + PDF).

NÃO modifica imagens originais (pages/) nem artefatos das Fases D–I.A.
Cria um manifesto de curadoria (comic_final_manifest.json) onde o usuário
seleciona, por página, qual variante será a "final derivada":
  - "original"       → pages/page_NNN.jpg  (arte intocada)
  - "render_overlay" → rendered_pages/page_NNN.png (Fase H)
  - "inpaint"        → inpaint_pages/page_NNN.png  (Fase I.A)

Export (I.B): copia as imagens selecionadas para final_pages/page_NNN.png
e empacota em final_pages.zip e final_pages.cbz.

Export (J.A): gera manifesto de rastreabilidade comic_final_export_manifest.json
com source_path, final_path, exported_at e selection_source por página;
exporta também final_pages.pdf via Pillow (tolerante a falhas).
"""
from __future__ import annotations

import copy
import json
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_VALID_VARIANTS = {"original", "render_overlay", "inpaint"}

FinalManifestDict = dict[str, Any]


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _utcnow() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _local_paths(
    page_entry: dict,
    pages_dir: Path,
    rendered_dir: Path,
    inpaint_dir: Path,
) -> dict[str, Path]:
    """Retorna dict variant → Path local existente para cada variante disponível."""
    page_num = page_entry.get("page_number", 0)
    img_path_serve = page_entry.get("image_path")
    available: dict[str, Path] = {}

    # Original — nome do arquivo extraído do serve_path do overlay
    if img_path_serve:
        img_filename = Path(img_path_serve).name
        orig = pages_dir / img_filename
        if orig.exists():
            available["original"] = orig

    # Render overlay (Fase H)
    ren = rendered_dir / f"page_{page_num:03d}.png"
    if ren.exists():
        available["render_overlay"] = ren

    # Inpaint (Fase I.A)
    inp = inpaint_dir / f"page_{page_num:03d}.png"
    if inp.exists():
        available["inpaint"] = inp

    return available


def _serve_paths_for_page(
    page_entry: dict,
    available_local: dict[str, Path],
    job_id: int,
) -> dict[str, str]:
    """Constrói serve_paths para as variantes disponíveis."""
    page_num = page_entry.get("page_number", 0)
    img_path_serve = page_entry.get("image_path")
    serve: dict[str, str] = {}

    if "original" in available_local and img_path_serve:
        serve["original"] = img_path_serve
    if "render_overlay" in available_local:
        serve["render_overlay"] = (
            f"/storage/output/{job_id}/rendered_pages/page_{page_num:03d}.png"
        )
    if "inpaint" in available_local:
        serve["inpaint"] = (
            f"/storage/output/{job_id}/inpaint_pages/page_{page_num:03d}.png"
        )
    return serve


# ---------------------------------------------------------------------------
# Inicialização do manifesto
# ---------------------------------------------------------------------------

def initialize_final_manifest(
    overlay_data: dict,
    pages_dir: Path,
    rendered_dir: Path,
    inpaint_dir: Path,
    job_id: int,
) -> FinalManifestDict:
    """
    Cria (ou reinicializa) o manifesto de curadoria final.

    - Descobre variantes disponíveis para cada página via sistema de arquivos.
    - Define selected_variant="original" por padrão (opção mais conservadora).
    - Idempotente: re-executar recalcula disponibilidade e reseta seleções.
    - NUNCA modifica nenhum arquivo de imagem.
    """
    pages_result: list[dict] = []

    for page in overlay_data.get("pages", []):
        page_num = page.get("page_number", 0)
        available_local = _local_paths(page, pages_dir, rendered_dir, inpaint_dir)
        available_variants = list(available_local.keys())
        serve = _serve_paths_for_page(page, available_local, job_id)

        pages_result.append(
            {
                "page_number": page_num,
                "selected_variant": "original",
                "available_variants": available_variants,
                "notes": None,
                "updated_at": _utcnow(),
                "serve_paths": serve,
                "final_serve_path": None,
                "export_error": None,
                "selection_source": "default",
            }
        )

    return {
        "job_id": job_id,
        "total_pages": len(pages_result),
        "pages": pages_result,
        "summary": _compute_summary(pages_result),
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
    }


# ---------------------------------------------------------------------------
# Patches de seleção
# ---------------------------------------------------------------------------

def apply_final_patches(
    manifest: FinalManifestDict,
    patches: list[dict],
) -> FinalManifestDict:
    """
    Aplica seleções de variante por página.

    - Ignora variantes inválidas silenciosamente.
    - Atualiza updated_at de cada página afetada.
    - Retorna cópia profunda modificada do manifesto.
    """
    m = copy.deepcopy(manifest)
    page_map = {p["page_number"]: p for p in m["pages"]}

    for patch in patches:
        pn = patch.get("page_number")
        variant = patch.get("selected_variant", "")
        if variant not in _VALID_VARIANTS:
            continue
        if pn not in page_map:
            continue
        page_map[pn]["selected_variant"] = variant
        if patch.get("notes") is not None:
            page_map[pn]["notes"] = patch["notes"]
        page_map[pn]["updated_at"] = _utcnow()
        page_map[pn]["selection_source"] = "manual"
        # Limpar resultados de export anteriores ao trocar seleção
        page_map[pn]["final_serve_path"] = None
        page_map[pn]["export_error"] = None

    m["summary"] = _compute_summary(m["pages"])
    return m


# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------

def _compute_summary(pages: list[dict]) -> dict[str, int]:
    summary: dict[str, int] = {"original": 0, "render_overlay": 0, "inpaint": 0}
    for p in pages:
        v = p.get("selected_variant", "original")
        if v in summary:
            summary[v] += 1
    return summary


# ---------------------------------------------------------------------------
# Export final
# ---------------------------------------------------------------------------

def export_final_pages(
    manifest: FinalManifestDict,
    pages_dir: Path,
    rendered_dir: Path,
    inpaint_dir: Path,
    output_dir: Path,
    job_id: int,
) -> FinalManifestDict:
    """
    Copia a variante selecionada de cada página para final_pages/page_NNN.png.

    - NUNCA modifica os arquivos de origem (pages/, rendered_pages/, inpaint_pages/)
    - Se a variante escolhida não estiver disponível como arquivo, registra export_error
    - Gera final_pages.zip, final_pages.cbz e final_pages.pdf (Pillow, tolerante a falhas)
    - Salva manifesto de rastreabilidade comic_final_export_manifest.json (Fase J.A)
    - Retorna manifesto atualizado com resultados por página e zip_path/cbz_path/pdf_path
    """
    m = copy.deepcopy(manifest)
    final_dir = output_dir / "final_pages"
    final_dir.mkdir(parents=True, exist_ok=True)

    exported_count = 0
    export_timestamp = _utcnow()

    # Fase J.A: rastreabilidade por página
    traceability_pages: list[dict] = []

    for page in m["pages"]:
        page_num = page["page_number"]
        variant = page.get("selected_variant", "original")
        out_filename = f"page_{page_num:03d}.png"
        out_path = final_dir / out_filename

        # Limpar resultados anteriores
        page["final_serve_path"] = None
        page["export_error"] = None

        # Determinar arquivo fonte
        src: Path | None = None

        if variant == "original":
            serve_src = page.get("serve_paths", {}).get("original")
            if serve_src:
                src_filename = Path(serve_src).name
                candidate = pages_dir / src_filename
                if candidate.exists():
                    src = candidate
        elif variant == "render_overlay":
            candidate = rendered_dir / f"page_{page_num:03d}.png"
            if candidate.exists():
                src = candidate
        elif variant == "inpaint":
            candidate = inpaint_dir / f"page_{page_num:03d}.png"
            if candidate.exists():
                src = candidate

        trace: dict = {
            "page_number": page_num,
            "selected_variant": variant,
            "source_path": str(src) if src else None,
            "final_path": None,
            "exported_at": export_timestamp,
            "selection_source": page.get("selection_source", "default"),
            "notes": page.get("notes"),
            "error": None,
        }

        if src is None:
            err = (
                f"Variante '{variant}' não disponível para página {page_num}. "
                f"Execute a geração correspondente antes de exportar."
            )
            page["export_error"] = err
            trace["error"] = err
        else:
            shutil.copy2(src, out_path)
            final_serve = f"/storage/output/{job_id}/final_pages/{out_filename}"
            page["final_serve_path"] = final_serve
            trace["final_path"] = str(out_path)
            exported_count += 1

        traceability_pages.append(trace)

    m["exported_pages"] = exported_count

    # Gera archives e PDF
    pdf_path_str: str | None = None
    if exported_count > 0:
        m["zip_path"] = _export_zip(m["pages"], output_dir, job_id)
        m["cbz_path"] = _export_cbz(m["pages"], output_dir, job_id)
        ok, _ = _export_pdf(final_dir, output_dir / "final_pages.pdf")
        if ok:
            pdf_path_str = f"/storage/output/{job_id}/final_pages.pdf"

    m["pdf_path"] = pdf_path_str

    # Fase J.A: salva manifesto de rastreabilidade
    export_manifest: dict = {
        "job_id": job_id,
        "exported_at": export_timestamp,
        "total_pages": len(traceability_pages),
        "pdf_path": pdf_path_str,
        "pages": traceability_pages,
    }
    save_export_manifest(output_dir / "comic_final_export_manifest.json", export_manifest)

    return m


def _export_pdf(final_pages_dir: Path, output_path: Path) -> tuple[bool, str | None]:
    """
    Gera um PDF simples a partir dos PNGs em final_pages_dir.
    Tolerante a falhas: retorna (False, motivo) em vez de lançar exceção.
    NUNCA modifica os PNGs de origem.
    """
    try:
        from PIL import Image
    except ImportError:
        return False, "Pillow não instalado"

    images = sorted(final_pages_dir.glob("page_*.png"))
    if not images:
        return False, "Nenhuma página disponível"

    try:
        pil_images = [Image.open(p).convert("RGB") for p in images]
        pil_images[0].save(
            output_path,
            save_all=True,
            append_images=pil_images[1:],
        )
        return True, None
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def _export_zip(pages: list[dict], output_dir: Path, job_id: int) -> str:
    zip_path = output_dir / "final_pages.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for page in pages:
            sp = page.get("final_serve_path")
            if not sp:
                continue
            # Reconstruct local path from serve_path
            local = output_dir / "final_pages" / Path(sp).name
            if local.exists():
                zf.write(local, arcname=Path(local).name)
    return f"/storage/output/{job_id}/final_pages.zip"


def _export_cbz(pages: list[dict], output_dir: Path, job_id: int) -> str:
    cbz_path = output_dir / "final_pages.cbz"
    with zipfile.ZipFile(cbz_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for page in pages:
            sp = page.get("final_serve_path")
            if not sp:
                continue
            local = output_dir / "final_pages" / Path(sp).name
            if local.exists():
                zf.write(local, arcname=Path(local).name)
    return f"/storage/output/{job_id}/final_pages.cbz"


# ---------------------------------------------------------------------------
# Persistência do manifesto
# ---------------------------------------------------------------------------

def load_final_manifest(path: Path) -> FinalManifestDict:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    # Retrocompatibilidade: manifestos da I.B não tinham selection_source
    for page in manifest.get("pages", []):
        page.setdefault("selection_source", "default")
    return manifest


def save_final_manifest(path: Path, manifest: FinalManifestDict) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Fase J.A — Manifesto de rastreabilidade de export
# ---------------------------------------------------------------------------

def load_export_manifest(path: Path) -> dict | None:
    """Retorna o manifesto de rastreabilidade ou None se não existir."""
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_export_manifest(path: Path, manifest: dict) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
