"""
Export final de quadrinhos — Estabilização v1.

Converte as páginas visuais finalizadas (finished_pages/ ou final_pages/)
em um CBZ de staging determinístico e em EPUB via KCC.

Políticas centrais:
- NUNCA usa job.input_path como fonte (ausência de fonte final → erro estruturado).
- A fonte da verdade é a lista/ordem do manifest real (finish → finalize),
  validada arquivo a arquivo (existência, extensão suportada, integridade PIL,
  duplicatas lógicas, contagem).
- Export atômico: staging em diretório temporário, promoção via os.replace,
  manifest gravado por último. Falha nunca deixa EPUB parcial parecendo válido.
- Proveniência real por página (variant/origem/tradução visual aplicada) e
  estado agregado translation_state: full | partial | none | not_applicable.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

from app.core.config import PROJECT_ROOT

try:
    from PIL import Image as _PILImage
    _PIL_AVAILABLE = True
except ImportError:  # pragma: no cover
    _PILImage = None  # type: ignore[assignment]
    _PIL_AVAILABLE = False

EXPORT_DIR_NAME = "comic_export"
MANIFEST_NAME = "comic_export_manifest.json"
MANIFEST_VERSION = 1

# Extensões produzidas pelo pipeline atual (pages/*.jpg, rendered/finished *.png).
# webp NÃO é produzido pelo pipeline — rejeitado até que haja suporte real.
SUPPORTED_EXTS = {".png", ".jpg", ".jpeg"}

_FINISH_MANIFEST = "comic_finish_manifest.json"
_FINAL_MANIFEST = "comic_final_manifest.json"
_TRANSLATION_SIDECAR = "comic_translation.json"


class ComicExportSourceError(Exception):
    """Fonte de export ausente ou inconsistente. payload → detail 409."""

    def __init__(
        self,
        code: str,
        message: str,
        missing_pages: Optional[list[int]] = None,
        next_step: Optional[str] = None,
    ) -> None:
        self.payload: dict[str, Any] = {
            "code": code,
            "message": message,
            "missing_pages": missing_pages or [],
            "next_step": next_step,
        }
        super().__init__(message)


class ComicExportFailedError(Exception):
    """Falha durante staging/KCC/validação do EPUB."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serve_to_local(serve_path: str, output_dir: Path) -> Path:
    """
    Converte '/storage/output/{id}/x.png' em caminho local.

    Resolve prioritariamente relativo a output_dir (robusto em testes com
    storage isolado); cai para PROJECT_ROOT quando o prefixo não bate.
    """
    prefix = f"/storage/output/{output_dir.name}/"
    if serve_path.startswith(prefix):
        return output_dir / serve_path[len(prefix):]
    return PROJECT_ROOT / serve_path.lstrip("/")


def _load_json(path: Path) -> Optional[dict]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def slugify(name: str) -> str:
    """Slug seguro para nome de arquivo (sem path traversal)."""
    base = re.sub(r"[^A-Za-z0-9_-]+", "-", name).strip("-")
    return base[:80] or "comic"


def _validate_image(path: Path) -> Optional[str]:
    """Retorna None se a imagem é válida; mensagem de erro caso contrário."""
    if not path.exists() or not path.is_file():
        return "arquivo ausente"
    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTS:
        return f"extensão não suportada: {ext or '(sem extensão)'}"
    if _PIL_AVAILABLE:
        try:
            with _PILImage.open(path) as img:
                img.verify()
        except Exception as exc:
            return f"imagem ilegível: {exc}"
    return None


def _detect_logical_duplicates(source_dir: Path) -> list[int]:
    """
    Detecta duplicatas lógicas: mesmo page stem com mais de uma extensão
    suportada no diretório fonte (ex.: page_001.png E page_001.jpg).
    """
    seen: dict[str, set[str]] = {}
    for f in source_dir.iterdir() if source_dir.exists() else []:
        ext = f.suffix.lower()
        if f.is_file() and ext in SUPPORTED_EXTS:
            seen.setdefault(f.stem.lower(), set()).add(ext)
    dups: list[int] = []
    for stem, exts in seen.items():
        if len(exts) > 1:
            m = re.search(r"(\d+)", stem)
            dups.append(int(m.group(1)) if m else -1)
    return sorted(dups)


def _pages_from_finish(output_dir: Path) -> Optional[dict]:
    """
    Tenta resolver a fonte a partir do manifest de Acabamento (finish).
    Retorna dict de resolução se COMPLETA; None se o manifest não existe;
    levanta ComicExportSourceError apenas para inconsistências graves
    (duplicata lógica / arquivo inválido) — ausências fazem cair para finalize.
    """
    manifest = _load_json(output_dir / _FINISH_MANIFEST)
    if not manifest or not manifest.get("pages"):
        return None

    source_dir = output_dir / "finished_pages"
    entries: list[dict] = []
    missing: list[int] = []

    for page in manifest["pages"]:
        page_num = int(page.get("page_number", 0))
        serve = page.get("finished_path")
        if not serve:
            missing.append(page_num)
            continue
        local = _serve_to_local(serve, output_dir)
        err = _validate_image(local)
        if err:
            missing.append(page_num)
            continue
        entries.append({
            "page_id": page_num,
            "path": local,
            "selected_variant": page.get("source_variant", "original"),
            "origin": "finished_pages",
            "visual_translation_applied": page.get("source_variant") == "render_overlay",
        })

    if missing:
        return None  # incompleto → tentar finalize

    dups = _detect_logical_duplicates(source_dir)
    if dups:
        raise ComicExportSourceError(
            "EXPORT_SOURCE_INCOMPLETE",
            f"Duplicata lógica de página em finished_pages: {dups}. "
            "Remova a versão duplicada e re-execute o Acabamento.",
            missing_pages=dups,
            next_step="finish",
        )

    return {
        "source": "finished_pages",
        "source_dir": str(source_dir),
        "pages": entries,
    }


def _pages_from_finalize(output_dir: Path) -> Optional[dict]:
    """Resolve a fonte a partir do manifest de Curadoria Final (finalize)."""
    manifest = _load_json(output_dir / _FINAL_MANIFEST)
    if not manifest or not manifest.get("pages"):
        return None

    source_dir = output_dir / "final_pages"
    entries: list[dict] = []
    missing: list[int] = []

    for page in manifest["pages"]:
        page_num = int(page.get("page_number", 0))
        serve = page.get("final_serve_path")
        if not serve:
            missing.append(page_num)
            continue
        local = _serve_to_local(serve, output_dir)
        err = _validate_image(local)
        if err:
            missing.append(page_num)
            continue
        entries.append({
            "page_id": page_num,
            "path": local,
            "selected_variant": page.get("selected_variant", "original"),
            "origin": "final_pages",
            "visual_translation_applied": page.get("selected_variant") == "render_overlay",
        })

    if not entries:
        return None

    if missing:
        raise ComicExportSourceError(
            "EXPORT_SOURCE_INCOMPLETE",
            f"{len(missing)} página(s) sem export na Curadoria Final: {missing}. "
            "Re-execute o export da Curadoria Final antes de exportar.",
            missing_pages=missing,
            next_step="finalize",
        )

    dups = _detect_logical_duplicates(source_dir)
    if dups:
        raise ComicExportSourceError(
            "EXPORT_SOURCE_INCOMPLETE",
            f"Duplicata lógica de página em final_pages: {dups}. "
            "Re-execute o export da Curadoria Final.",
            missing_pages=dups,
            next_step="finalize",
        )

    return {
        "source": "final_pages",
        "source_dir": str(source_dir),
        "pages": entries,
    }


def resolve_export_source(output_dir: Path) -> dict:
    """
    Determina a fonte final do export.

    Prioridade: finished_pages (completa) → final_pages (completa) → erro.
    NUNCA cai para o arquivo original.
    """
    resolution = _pages_from_finish(output_dir)
    if resolution is None:
        resolution = _pages_from_finalize(output_dir)
    if resolution is None:
        raise ComicExportSourceError(
            "EXPORT_SOURCE_MISSING",
            "Nenhuma fonte final consistente encontrada. Execute a Curadoria "
            "Final (e opcionalmente o Acabamento) antes de exportar.",
            next_step="finalize",
        )
    if not resolution["pages"]:
        raise ComicExportSourceError(
            "EXPORT_SOURCE_MISSING",
            "A fonte final não contém nenhuma página exportada.",
            next_step="finalize",
        )
    # Duplicata de page_id dentro do próprio manifest
    seen: set[int] = set()
    for e in resolution["pages"]:
        if e["page_id"] in seen:
            raise ComicExportSourceError(
                "EXPORT_SOURCE_INCOMPLETE",
                f"Página {e['page_id']} duplicada no manifest da fonte.",
                missing_pages=[e["page_id"]],
                next_step="finalize" if resolution["source"] == "final_pages" else "finish",
            )
        seen.add(e["page_id"])
    return resolution


def compute_translation_state(
    output_dir: Path,
    pages: list[dict],
    comic_translation_done: bool,
) -> str:
    """
    Estado agregado da tradução visual no export, por proveniência real.

    - not_applicable: tradução nunca solicitada/concluída (ou sem blocos de texto)
    - full: todas as páginas com texto traduzível usam resultado visual traduzido
    - partial: apenas parte delas usa
    - none: nenhuma usa (export sairá com páginas sem tradução visual)
    """
    if not comic_translation_done:
        return "not_applicable"

    sidecar = _load_json(output_dir / _TRANSLATION_SIDECAR)
    need: set[int] = set()
    if sidecar:
        for p in sidecar.get("pages", []):
            if p.get("blocks"):
                # sidecar da Fase D usa "page"; manter compat com "page_number"
                need.add(int(p.get("page", p.get("page_number", 0))))
    if not need:
        return "not_applicable"

    translated = {
        e["page_id"] for e in pages
        if e["page_id"] in need and e.get("visual_translation_applied")
    }
    if not translated:
        return "none"
    # full exige que TODAS as páginas com texto traduzível usem resultado
    # visual traduzido (página necessária ausente do export conta contra)
    if translated == need:
        return "full"
    return "partial"


def _pages_digest(pages: list[dict]) -> str:
    h = hashlib.sha256()
    for e in pages:
        st = e["path"].stat()
        h.update(f"{e['path'].name}|{st.st_size}|{st.st_mtime}".encode())
    return h.hexdigest()


def load_export_manifest(output_dir: Path) -> Optional[dict]:
    return _load_json(output_dir / EXPORT_DIR_NAME / MANIFEST_NAME)


def _save_export_manifest(manifest: dict, output_dir: Path) -> None:
    export_dir = output_dir / EXPORT_DIR_NAME
    export_dir.mkdir(parents=True, exist_ok=True)
    tmp = export_dir / f".{MANIFEST_NAME}.tmp"
    tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, export_dir / MANIFEST_NAME)


def _build_staging_cbz(pages: list[dict], cbz_path: Path) -> None:
    """
    Monta CBZ determinístico: páginas na ordem do manifest, renumeradas
    sequencialmente (page_001..page_NNN) preservando a extensão original.
    """
    with zipfile.ZipFile(cbz_path, "w", compression=zipfile.ZIP_STORED) as zf:
        for idx, entry in enumerate(pages):
            ext = entry["path"].suffix.lower()
            arcname = f"page_{idx + 1:03d}{ext}"
            zf.write(entry["path"], arcname=arcname)


def _validate_cbz(cbz_path: Path, expected_count: int) -> None:
    if not cbz_path.exists() or cbz_path.stat().st_size == 0:
        raise ComicExportFailedError("CBZ de staging não foi gerado.")
    try:
        with zipfile.ZipFile(cbz_path) as zf:
            bad = zf.testzip()
            names = zf.namelist()
    except zipfile.BadZipFile as exc:
        raise ComicExportFailedError(f"CBZ de staging inválido: {exc}")
    if bad is not None:
        raise ComicExportFailedError(f"CBZ de staging corrompido em '{bad}'.")
    if len(names) != expected_count:
        raise ComicExportFailedError(
            f"CBZ de staging contém {len(names)} entradas; esperado {expected_count}."
        )


def _validate_epub(epub_path: Path) -> None:
    if not epub_path.exists() or not epub_path.is_file():
        raise ComicExportFailedError("KCC não gerou o EPUB esperado.")
    if epub_path.stat().st_size == 0:
        raise ComicExportFailedError("EPUB gerado está vazio.")
    if not zipfile.is_zipfile(epub_path):
        raise ComicExportFailedError("EPUB gerado não é um ZIP válido.")
    try:
        with zipfile.ZipFile(epub_path) as zf:
            names = zf.namelist()
        if "mimetype" not in names:
            raise ComicExportFailedError("EPUB gerado sem 'mimetype' — arquivo inválido.")
    except zipfile.BadZipFile as exc:
        raise ComicExportFailedError(f"EPUB gerado ilegível: {exc}")


def validate_export_artifact(output_dir: Path, artifact_path: str) -> Optional[Path]:
    """
    Validação de segurança para download/envio: o path registrado precisa
    existir, ser arquivo regular e estar contido em output_dir/comic_export/.
    Retorna o Path resolvido ou None se inválido.
    """
    try:
        resolved = Path(artifact_path).resolve()
        allowed = (output_dir / EXPORT_DIR_NAME).resolve()
        if not resolved.is_file():
            return None
        resolved.relative_to(allowed)
        return resolved
    except (ValueError, OSError):
        return None


# ---------------------------------------------------------------------------
# Export principal
# ---------------------------------------------------------------------------

def run_comic_export(
    job_id: int,
    output_dir: Path,
    *,
    slug: str,
    title: str = "",
    author: str = "",
    language: str = "",
    profile: str = "KPW5",
    manga_mode: bool = False,
    rtl: bool = False,
    comic_translation_done: bool = False,
    build_epub: bool = True,
    force: bool = False,
    progress_callback: Optional[Callable[[str, int, Optional[int], Optional[str]], None]] = None,
) -> dict:
    """
    Executa o export final atômico. Retorna o manifest gravado.

    Raises:
        ComicExportSourceError: fonte ausente/inconsistente.
        ComicExportFailedError: falha em staging/KCC/validação.
    """
    def _report(stage: str, current: int, total: Optional[int] = None, msg: Optional[str] = None) -> None:
        if progress_callback:
            try:
                progress_callback(stage, current, total, msg)
            except Exception:
                pass

    resolution = resolve_export_source(output_dir)
    pages = resolution["pages"]
    digest = _pages_digest(pages)
    translation_state = compute_translation_state(
        output_dir, pages, comic_translation_done
    )

    slug = slugify(slug)
    export_dir = output_dir / EXPORT_DIR_NAME
    final_cbz = export_dir / f"{slug}.cbz"
    final_epub = export_dir / f"{slug}.epub"

    # Cache/idempotência: só aceita manifest completo e consistente
    if not force:
        cached = load_export_manifest(output_dir)
        if (
            cached
            and cached.get("manifest_version") == MANIFEST_VERSION
            and cached.get("pages_digest") == digest
            and cached.get("staging_cbz")
            and Path(cached["staging_cbz"]).exists()
            and (not build_epub or (cached.get("epub_path") and Path(cached["epub_path"]).exists()))
        ):
            cached["cached"] = True
            return cached

    # Staging atômico em diretório temporário da operação
    tmp_dir = export_dir / f".tmp-{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    try:
        _report("comic_export", 0, None, "Montando CBZ de staging")
        tmp_cbz = tmp_dir / f"{slug}.cbz"
        _build_staging_cbz(pages, tmp_cbz)
        _validate_cbz(tmp_cbz, len(pages))

        epub_size: Optional[int] = None
        tmp_epub: Optional[Path] = None
        if build_epub:
            _report("comic_export", 0, None, "Convertendo via KCC (sem estimativa)")
            from app.services.kcc_service import convert_comic

            epub_out = convert_comic(
                tmp_cbz,
                tmp_dir,
                profile=profile,
                manga_mode=manga_mode,
                rtl=rtl,
                title=title or None,
                author=author or None,
            )
            _validate_epub(epub_out)
            tmp_epub = epub_out
            epub_size = epub_out.stat().st_size

        # Promoção atômica
        export_dir.mkdir(parents=True, exist_ok=True)
        os.replace(tmp_cbz, final_cbz)
        if tmp_epub is not None:
            os.replace(tmp_epub, final_epub)

        page_entries = []
        for entry in pages:
            st = entry["path"].stat()
            page_entries.append({
                "file": entry["path"].name,
                "page_id": entry["page_id"],
                "selected_variant": entry["selected_variant"],
                "origin": entry["origin"],
                "visual_translation_applied": bool(entry["visual_translation_applied"]),
                "size": st.st_size,
                "mtime": st.st_mtime,
            })

        manifest: dict[str, Any] = {
            "manifest_version": MANIFEST_VERSION,
            "job_id": job_id,
            "source": resolution["source"],
            "source_dir": resolution["source_dir"],
            "page_count": len(pages),
            "pages": page_entries,
            "pages_digest": digest,
            "staging_cbz": str(final_cbz),
            "cbz_serve_path": f"/storage/output/{job_id}/{EXPORT_DIR_NAME}/{final_cbz.name}",
            "epub_path": str(final_epub) if tmp_epub is not None else None,
            "epub_serve_path": (
                f"/storage/output/{job_id}/{EXPORT_DIR_NAME}/{final_epub.name}"
                if tmp_epub is not None else None
            ),
            "epub_size_bytes": epub_size,
            "size_warning": bool(epub_size and epub_size > 50 * 1024 * 1024),
            "title": title,
            "author": author,
            "language": language,
            "translation_included": translation_state == "full",
            "translation_state": translation_state,
            "kcc_profile": profile,
            "manga_rtl": rtl,
            "exported_at": _utcnow(),
        }
        # Manifest gravado por último (atomicidade)
        _save_export_manifest(manifest, output_dir)
        return manifest

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
