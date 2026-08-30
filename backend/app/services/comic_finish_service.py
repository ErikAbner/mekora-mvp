"""
Fase N.A — Finalização visual assistida (acabamento não destrutivo).

Aplica ajustes visuais (contraste, brilho, nitidez, saturação) sobre as páginas
derivadas selecionadas na Fase I.B, gerando finished_pages/ como novo artefato.

Princípios:
- NÃO modifica páginas originais, render_overlay, inpaint, nem final_pages.
- Lê a variante selecionada de comic_final_manifest.json (Fase I.B).
- Salva manifesto próprio: comic_finish_manifest.json.
- Tolerante a falhas por página: registra warnings, continua as demais.
"""
from __future__ import annotations

import copy
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Pillow — opcional (mesmo padrão dos outros serviços)
# ---------------------------------------------------------------------------
try:
    from PIL import Image as _PILImage
    from PIL import ImageEnhance as _ImageEnhance

    _PIL_AVAILABLE = True
except ImportError:  # pragma: no cover
    _PILImage = None  # type: ignore[assignment]
    _ImageEnhance = None  # type: ignore[assignment]
    _PIL_AVAILABLE = False

# ---------------------------------------------------------------------------
# Presets visuais embutidos
# ---------------------------------------------------------------------------

_VISUAL_PRESETS: dict[str, dict[str, float]] = {
    "none": {
        "contrast": 1.0,
        "brightness": 1.0,
        "sharpness": 1.0,
        "saturation": 1.0,
    },
    "clean_manga_bw": {
        "contrast": 1.4,
        "brightness": 1.05,
        "sharpness": 1.6,
        "saturation": 0.0,
    },
    "comic_caption_box": {
        "contrast": 1.2,
        "brightness": 1.0,
        "sharpness": 1.3,
        "saturation": 0.9,
    },
    "soft_subtitle_box": {
        "contrast": 1.1,
        "brightness": 1.05,
        "sharpness": 1.0,
        "saturation": 1.0,
    },
    "high_contrast_overlay": {
        "contrast": 1.6,
        "brightness": 0.95,
        "sharpness": 1.8,
        "saturation": 0.7,
    },
    # Fase P.B — presets adicionais para recomendação assistida
    "manga_bw_high_contrast": {
        "contrast": 1.7,
        "brightness": 1.0,
        "sharpness": 1.8,
        "saturation": 0.0,
    },
    "subtitle_minimal": {
        "contrast": 1.05,
        "brightness": 1.02,
        "sharpness": 1.1,
        "saturation": 1.0,
    },
    "dense_text_compact": {
        "contrast": 1.3,
        "brightness": 1.0,
        "sharpness": 1.5,
        "saturation": 0.85,
    },
}

VALID_PRESETS: frozenset[str] = frozenset(_VISUAL_PRESETS)

_MANIFEST_NAME = "comic_finish_manifest.json"
_FINISH_DIR_NAME = "finished_pages"
_ZIP_NAME = "finished_pages.zip"
_CBZ_NAME = "finished_pages.cbz"
_PDF_NAME = "finished_pages.pdf"


# ---------------------------------------------------------------------------
# Helpers de manifesto
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_finish_manifest(output_dir: Path) -> dict | None:
    """Carrega comic_finish_manifest.json ou retorna None se não existir."""
    p = output_dir / _MANIFEST_NAME
    if not p.exists():
        return None
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def save_finish_manifest(manifest: dict, output_dir: Path) -> None:
    """Persiste comic_finish_manifest.json."""
    output_dir.mkdir(parents=True, exist_ok=True)
    p = output_dir / _MANIFEST_NAME
    with p.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Inicialização
# ---------------------------------------------------------------------------

def initialize_finish_manifest(
    job_id: int,
    final_manifest: dict,
    output_dir: Path,
) -> dict:
    """
    Cria comic_finish_manifest.json a partir do comic_final_manifest.json
    da Fase I.B.  Cada página herda a variante selecionada e o source_path
    mais específico disponível.
    """
    pages: list[dict] = []
    for fp in final_manifest.get("pages", []):
        page_num = fp["page_number"]
        selected_variant = fp.get("selected_variant", "original")
        serve_paths: dict = fp.get("serve_paths", {})

        # Determinar o source_path: prefere a variante selecionada, senão usa
        # o caminho do serve_paths convertido em local.  Na Fase N.A usamos
        # os serve_paths diretamente (o estático é montado e os arquivos
        # existem no sistema local).  Aqui guardamos o serve_path para o
        # frontend e derivamos o path local no momento do export.
        source_serve_path = serve_paths.get(selected_variant)

        pages.append(
            {
                "page_number": page_num,
                "source_variant": selected_variant,
                "preset_override": None,
                "adjustments_override": None,
                "source_path": source_serve_path,
                "finished_path": None,
                "exported_at": None,
                "warnings": [],
            }
        )

    manifest: dict = {
        "job_id": job_id,
        "global_preset": "none",
        "global_adjustments": {
            "contrast": 1.0,
            "brightness": 1.0,
            "sharpness": 1.0,
            "saturation": 1.0,
        },
        "pages": pages,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }
    save_finish_manifest(manifest, output_dir)
    return copy.deepcopy(manifest)


# ---------------------------------------------------------------------------
# Resolução de ajustes efetivos por página
# ---------------------------------------------------------------------------

def _effective_adjustments(manifest: dict, page: dict) -> dict[str, float]:
    """
    Retorna os ajustes efetivos para a página, respeitando a hierarquia:
      adjustments_override > preset_override > global_preset > global_adjustments.
    """
    # Se existe um ajuste fino por página, ele é o definitivo
    if page.get("adjustments_override") is not None:
        ao = page["adjustments_override"]
        return {
            "contrast": float(ao.get("contrast", 1.0)),
            "brightness": float(ao.get("brightness", 1.0)),
            "sharpness": float(ao.get("sharpness", 1.0)),
            "saturation": float(ao.get("saturation", 1.0)),
        }

    # Se há preset por página, usar seus valores
    if page.get("preset_override") is not None:
        return dict(_VISUAL_PRESETS.get(page["preset_override"], _VISUAL_PRESETS["none"]))

    # Caso contrário, usar o ajuste global (que já reflete o global_preset)
    ga = manifest.get("global_adjustments", {})
    return {
        "contrast": float(ga.get("contrast", 1.0)),
        "brightness": float(ga.get("brightness", 1.0)),
        "sharpness": float(ga.get("sharpness", 1.0)),
        "saturation": float(ga.get("saturation", 1.0)),
    }


# ---------------------------------------------------------------------------
# Aplicação PIL
# ---------------------------------------------------------------------------

def _apply_pil_adjustments(
    source_local: Path,
    dest_path: Path,
    adj: dict[str, float],
) -> list[str]:
    """
    Aplica ajustes de ImageEnhance sobre source_local e salva em dest_path.
    Retorna lista de warnings (vazia em caso de sucesso).
    """
    warnings: list[str] = []

    if not _PIL_AVAILABLE:
        warnings.append("Pillow não instalado — página copiada sem ajustes.")
        import shutil
        shutil.copy2(source_local, dest_path)
        return warnings

    if not source_local.exists():
        warnings.append(f"Fonte não encontrada: {source_local.name}")
        return warnings

    try:
        img = _PILImage.open(source_local).convert("RGB")
        img = _ImageEnhance.Contrast(img).enhance(adj["contrast"])
        img = _ImageEnhance.Brightness(img).enhance(adj["brightness"])
        img = _ImageEnhance.Sharpness(img).enhance(adj["sharpness"])
        img = _ImageEnhance.Color(img).enhance(adj["saturation"])
        img.save(str(dest_path), "PNG")
    except Exception as exc:
        warnings.append(f"Erro ao processar {source_local.name}: {exc}")

    return warnings


# ---------------------------------------------------------------------------
# Resolução do path local a partir do serve_path
# ---------------------------------------------------------------------------

def _serve_to_local(serve_path: str, project_root: Path) -> Path:
    """
    Converte '/storage/output/1/pages/page_001.jpg' em caminho local completo.
    """
    # serve_path começa com '/storage/' → mapeia para project_root/storage/
    relative = serve_path.lstrip("/")
    return project_root / relative


def _export_zip_cbz(
    pages: list[dict],
    output_dir: Path,
    job_id: int,
    finished_dir: Path,
) -> tuple[str | None, str | None]:
    """Gera finished_pages.zip e finished_pages.cbz. Retorna (zip_serve, cbz_serve)."""
    if not pages:
        return None, None

    def _write(archive_path: Path) -> None:
        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for page in pages:
                sp = page.get("finished_path")
                if not sp:
                    continue
                local = finished_dir / Path(sp).name
                if local.exists():
                    zf.write(local, arcname=Path(local).name)

    zip_path = output_dir / _ZIP_NAME
    cbz_path = output_dir / _CBZ_NAME
    _write(zip_path)
    _write(cbz_path)

    return (
        f"/storage/output/{job_id}/{_ZIP_NAME}",
        f"/storage/output/{job_id}/{_CBZ_NAME}",
    )


def _export_pdf(finished_dir: Path, output_path: Path) -> tuple[bool, str | None]:
    """Gera PDF a partir das PNGs em finished_dir. Tolerante a falhas."""
    if not _PIL_AVAILABLE:
        return False, "Pillow não instalado"

    images = sorted(finished_dir.glob("page_*.png"))
    if not images:
        return False, "Nenhuma página disponível"

    try:
        pil_images = [_PILImage.open(p).convert("RGB") for p in images]
        pil_images[0].save(
            str(output_path),
            save_all=True,
            append_images=pil_images[1:],
        )
        return True, None
    except Exception as exc:
        return False, str(exc)


# ---------------------------------------------------------------------------
# Consulta de presets (para o frontend)
# ---------------------------------------------------------------------------

def get_preset_list() -> list[dict[str, Any]]:
    """Retorna lista de presets com name e adjustments para o frontend."""
    return [
        {"name": name, "adjustments": dict(adj)}
        for name, adj in _VISUAL_PRESETS.items()
    ]


# ---------------------------------------------------------------------------
# Fase N.B — Análise de layout e auto_fix
# ---------------------------------------------------------------------------

def analyze_finish_layout(
    job_id: int,
    manifest: dict,
    output_dir: Path,
    project_root: Path,
) -> dict:
    """
    Carrega comic_overlay.json, analisa cada página do manifesto e atualiza:
      - page["layout_issues"]
      - page["suggested_adjustments"]

    Não modifica finished_path, warnings nem exports.
    Tolera overlay.json ausente (retorna manifesto sem issues).
    """
    from app.services import comic_layout_service as layout_svc

    m = copy.deepcopy(manifest)

    overlay_path = output_dir / "comic_overlay.json"
    if not overlay_path.exists():
        # Sem overlay → sem issues de layout possíveis
        for page in m["pages"]:
            page.setdefault("layout_issues", [])
            page.setdefault("suggested_adjustments", None)
            page.setdefault("auto_adjustments_applied", False)
        m["analyzed_at"] = _now_iso()
        save_finish_manifest(m, output_dir)
        return m

    with overlay_path.open(encoding="utf-8") as f:
        overlay_data = json.load(f)

    overlay_by_page: dict[int, dict] = {
        p["page_number"]: p for p in overlay_data.get("pages", [])
    }

    for page in m["pages"]:
        page_num = page["page_number"]
        overlay_page = overlay_by_page.get(page_num, {})

        issues, suggestions = layout_svc.analyze_page(overlay_page)
        page["layout_issues"] = issues
        page["suggested_adjustments"] = suggestions
        page.setdefault("auto_adjustments_applied", False)

    m["analyzed_at"] = _now_iso()
    save_finish_manifest(m, output_dir)
    return m


def export_finished_pages(
    job_id: int,
    manifest: dict,
    output_dir: Path,
    project_root: Path,
) -> dict:
    """
    Para cada página do manifesto:
    1. Resolve o path local da fonte (serve_path → local).
    2a. Se auto_fix_layout=True e há issues: re-renderiza com font_scale ajustado
        (usando render_service._render_page com blocos modificados).
    2b. Caso contrário: aplica ajustes PIL ImageEnhance (N.A).
    3. Salva em finished_pages/page_NNN.png.
    4. Gera ZIP, CBZ e PDF derivados.

    Retorna o manifesto atualizado (não modifica a fonte).
    """
    m = copy.deepcopy(manifest)
    finished_dir = output_dir / _FINISH_DIR_NAME
    finished_dir.mkdir(parents=True, exist_ok=True)

    auto_fix = bool(m.get("auto_fix_layout", False))

    # Carregar overlay.json uma vez se auto_fix estiver ativo
    overlay_by_page: dict[int, dict] = {}
    if auto_fix:
        overlay_path = output_dir / "comic_overlay.json"
        if overlay_path.exists():
            with overlay_path.open(encoding="utf-8") as f:
                od = json.load(f)
            overlay_by_page = {p["page_number"]: p for p in od.get("pages", [])}

    for page in m["pages"]:
        page_num = page["page_number"]
        source_serve = page.get("source_path")
        page["warnings"] = []
        page.setdefault("auto_adjustments_applied", False)

        if not source_serve:
            page["warnings"].append("source_path ausente — página ignorada.")
            page["finished_path"] = None
            page["exported_at"] = None
            continue

        source_local = _serve_to_local(source_serve, project_root)
        dest_filename = f"page_{page_num:03d}.png"
        dest_path = finished_dir / dest_filename

        # — Decide caminho de processamento —
        issues = page.get("layout_issues", [])
        suggestions = page.get("suggested_adjustments")
        used_rerender = False

        if (
            auto_fix
            and issues
            and suggestions
            and page.get("source_variant") in ("render_overlay", "inpaint")
            and page_num in overlay_by_page
        ):
            # Tenta re-renderizar com font_scale ajustado
            warnings = _rerender_with_font_scale(
                job_id=job_id,
                page_num=page_num,
                overlay_page=overlay_by_page[page_num],
                font_scale=float(suggestions.get("font_scale", 1.0)),
                output_dir=output_dir,
                dest_path=dest_path,
                project_root=project_root,
            )
            page["warnings"].extend(warnings)
            if dest_path.exists():
                used_rerender = True
                page["auto_adjustments_applied"] = True

        if not used_rerender:
            # Fallback: N.A PIL adjustments
            adj = _effective_adjustments(m, page)
            # Se há low_contrast e auto_fix, amplificar contraste
            if auto_fix and any(
                i.get("issue_type") == "low_contrast" for i in issues
            ):
                adj = dict(adj)
                adj["contrast"] = min(2.0, adj["contrast"] + 0.4)
                adj["brightness"] = min(2.0, adj["brightness"] + 0.1)
                page["auto_adjustments_applied"] = True
            warnings = _apply_pil_adjustments(source_local, dest_path, adj)
            page["warnings"].extend(warnings)

        if dest_path.exists():
            page["finished_path"] = f"/storage/output/{job_id}/{_FINISH_DIR_NAME}/{dest_filename}"
            page["exported_at"] = _now_iso()
        else:
            page["finished_path"] = None
            page["exported_at"] = None

    # ZIP + CBZ
    exported_pages = [p for p in m["pages"] if p.get("finished_path")]
    zip_path, cbz_path = _export_zip_cbz(exported_pages, output_dir, job_id, finished_dir)
    m["zip_path"] = zip_path
    m["cbz_path"] = cbz_path

    # PDF (tolerante)
    ok, _ = _export_pdf(finished_dir, output_dir / _PDF_NAME)
    m["pdf_path"] = f"/storage/output/{job_id}/{_PDF_NAME}" if ok else None

    save_finish_manifest(m, output_dir)
    return m


def _rerender_with_font_scale(
    job_id: int,
    page_num: int,
    overlay_page: dict,
    font_scale: float,
    output_dir: Path,
    dest_path: Path,
    project_root: Path,
) -> list[str]:
    """
    Re-renderiza uma página com font_scale aplicado nos blocos.
    Usa render_service._render_page (funções internas — mesmo pacote).
    Nunca modifica overlay_page original.
    Retorna lista de warnings.
    """
    warnings: list[str] = []

    try:
        from app.services.comic_render_service import _render_page  # noqa: PLC0415
    except ImportError:
        warnings.append("render_service não disponível — pulando re-renderização.")
        return warnings

    # Encontrar o path local da imagem original da página
    pages_dir = output_dir / "pages"
    candidates = sorted(pages_dir.glob(f"page_{page_num:03d}.*")) if pages_dir.exists() else []
    if not candidates:
        warnings.append(f"Imagem original da página {page_num} não encontrada.")
        return warnings

    original_image = candidates[0]

    # Copiar blocos com font_size ajustado (não modifica overlay_page)
    import copy as _copy

    modified_blocks = []
    for block in overlay_page.get("blocks", []):
        b = _copy.deepcopy(block)
        sty = dict(b.get("overlay_style") or {})
        current_rem = float(sty.get("font_size", 0.7))
        new_rem = max(0.4, current_rem * font_scale)  # mínimo 0.4 rem (~6px)
        sty["font_size"] = round(new_rem, 3)
        b["overlay_style"] = sty
        modified_blocks.append(b)

    png_bytes, render_warnings = _render_page(original_image, modified_blocks)
    warnings.extend(render_warnings)

    if png_bytes:
        dest_path.write_bytes(png_bytes)
    else:
        warnings.append(f"Re-renderização falhou para página {page_num}.")

    return warnings


# ---------------------------------------------------------------------------
# Patch: suporte a auto_fix_layout no apply_finish_patches
# ---------------------------------------------------------------------------

def apply_finish_patches(manifest: dict, body: dict) -> dict:
    """
    Atualiza preset global, ajustes globais, overrides por página e auto_fix_layout.

    body aceita:
      global_preset: str | None
      global_adjustments: dict | None  (apenas campos presentes são atualizados)
      page_patches: list[{page_number, preset_override, adjustments_override}]
      auto_fix_layout: bool | None
    """
    m = copy.deepcopy(manifest)

    # Global preset
    gp = body.get("global_preset")
    if gp is not None:
        if gp not in VALID_PRESETS:
            raise ValueError(f"Preset inválido: {gp!r}. Válidos: {sorted(VALID_PRESETS)}")
        m["global_preset"] = gp
        m["global_adjustments"] = dict(_VISUAL_PRESETS[gp])

    # Global adjustments (override fino, campo a campo)
    ga = body.get("global_adjustments")
    if ga is not None:
        for key in ("contrast", "brightness", "sharpness", "saturation"):
            if key in ga:
                m["global_adjustments"][key] = float(ga[key])

    # auto_fix_layout
    afl = body.get("auto_fix_layout")
    if afl is not None:
        m["auto_fix_layout"] = bool(afl)

    # Por página
    for patch in body.get("page_patches", []):
        page_num = patch.get("page_number")
        page = next((p for p in m["pages"] if p["page_number"] == page_num), None)
        if page is None:
            continue

        if "preset_override" in patch:
            po = patch["preset_override"]
            if po is not None and po not in VALID_PRESETS:
                raise ValueError(f"Preset inválido: {po!r}")
            page["preset_override"] = po

        if "adjustments_override" in patch:
            page["adjustments_override"] = patch["adjustments_override"]

        page["finished_path"] = None
        page["exported_at"] = None
        page["warnings"] = []

    m["zip_path"] = None
    m["cbz_path"] = None
    m["pdf_path"] = None

    return m
