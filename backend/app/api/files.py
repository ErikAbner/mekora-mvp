"""
v1.2.1 — Servição controlada de arquivos (substitui o mount amplo de /storage).

Mantém o shape de URL `/storage/output/{job_id}/...` e `/storage/temp/{job_id}/...`
para compatibilidade com os serve paths dos manifests, mas com:

- allowlist estrita de artefatos por job (nada de path arbitrário);
- validação de path traversal (`..`), symlinks e arquivos ocultos;
- confirmação de arquivo regular contido no diretório permitido do job;
- sem listagem de diretórios.

NÃO são acessíveis via HTTP: kindle_tool.db, config.json, config_presets.json,
storage/input, storage/backups, storage/models, storage/logs, progress/ interno,
manifests internos (comic_*_manifest.json, comic_render.json etc.) e ocultos.
"""
from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(tags=["files"])

# ---------------------------------------------------------------------------
# Allowlist de artefatos dentro de storage/output/{job_id}/
# ---------------------------------------------------------------------------

# Arquivos permitidos na raiz do job (downloads voltados ao usuário)
_ROOT_FILE_PATTERNS = [
    re.compile(r"^comic_translation\.(json|html)$"),
    re.compile(r"^comic_review\.(json|html|md)$"),
    re.compile(r"^comic_overlay\.html$"),
    re.compile(r"^final_pages\.(zip|cbz|pdf)$"),
    re.compile(r"^finished_pages\.(zip|cbz|pdf)$"),
    re.compile(r"^rendered_pages\.(zip|cbz)$"),
    re.compile(r"^inpaint_pages\.zip$"),
    re.compile(r"^[\w\-. ]+\.epub$"),  # EPUBs gerados (KCC/Calibre)
]

# Subdiretórios permitidos (1 nível) → extensões permitidas neles
_SUBDIR_EXTS: dict[str, set[str]] = {
    "pages": {".jpg", ".jpeg", ".png"},
    "rendered_pages": {".png"},
    "inpaint_pages": {".png"},
    "final_pages": {".png", ".jpg", ".jpeg"},
    "finished_pages": {".png"},
    "consistency_previews": {".jpg", ".jpeg", ".png"},
    "comic_export": {".epub", ".cbz"},
}

_SAFE_SEGMENT = re.compile(r"^[\w\-. ]+$")
_THUMBNAIL_NAME = re.compile(r"^page_[0-4]\.png$")

_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".json": "application/json",
    ".html": "text/html",
    ".md": "text/markdown",
    ".zip": "application/zip",
    ".cbz": "application/vnd.comicbook+zip",
    ".pdf": "application/pdf",
    ".epub": "application/epub+zip",
}


def _not_found() -> HTTPException:
    # 404 uniforme: não revelar se o caminho existe mas é proibido
    return HTTPException(status_code=404, detail="Arquivo não encontrado.")


def _validate_segments(artifact_path: str) -> list[str]:
    """Rejeita traversal, ocultos, absolutos e segmentos suspeitos."""
    if not artifact_path or artifact_path.startswith(("/", "\\")):
        raise _not_found()
    segments = artifact_path.replace("\\", "/").split("/")
    for seg in segments:
        if (
            not seg
            or seg in (".", "..")
            or seg.startswith(".")
            or not _SAFE_SEGMENT.match(seg)
        ):
            raise _not_found()
    return segments


def _is_allowed_artifact(segments: list[str]) -> bool:
    if len(segments) == 1:
        name = segments[0]
        return any(p.match(name) for p in _ROOT_FILE_PATTERNS)
    if len(segments) == 2:
        subdir, name = segments
        exts = _SUBDIR_EXTS.get(subdir)
        if exts is None:
            return False
        return Path(name).suffix.lower() in exts
    return False


def _serve_validated(base_dir: Path, segments: list[str]) -> FileResponse:
    """
    Resolve e confirma: arquivo regular, contido no diretório permitido
    (resolve() segue symlinks — symlink escapando é rejeitado).
    """
    candidate = base_dir.joinpath(*segments)
    try:
        resolved = candidate.resolve(strict=True)
        base_resolved = base_dir.resolve(strict=True)
        resolved.relative_to(base_resolved)
    except (OSError, ValueError):
        raise _not_found()
    if not resolved.is_file():
        raise _not_found()
    media_type = _MEDIA_TYPES.get(resolved.suffix.lower(), "application/octet-stream")
    return FileResponse(str(resolved), media_type=media_type)


# ---------------------------------------------------------------------------
# Rotas
# ---------------------------------------------------------------------------

@router.get("/storage/output/{job_id}/{artifact_path:path}")
def serve_job_artifact(job_id: int, artifact_path: str) -> FileResponse:
    """Serve um artefato permitido de um job. Tudo fora da allowlist → 404."""
    from app.core.config import STORAGE_OUTPUT  # lazy p/ testes

    segments = _validate_segments(artifact_path)
    if not _is_allowed_artifact(segments):
        raise _not_found()
    return _serve_validated(STORAGE_OUTPUT / str(job_id), segments)


@router.get("/storage/temp/{job_id}/{filename}")
def serve_thumbnail(job_id: int, filename: str) -> FileResponse:
    """Serve apenas thumbnails de análise (page_0..page_4.png)."""
    from app.core.config import STORAGE_TEMP  # lazy p/ testes

    if not _THUMBNAIL_NAME.match(filename):
        raise _not_found()
    return _serve_validated(STORAGE_TEMP / str(job_id), [filename])


@router.get("/storage/{rest:path}")
def storage_catch_all(rest: str) -> None:
    """Qualquer outro caminho de /storage (db, config, input, backups…) → 404."""
    raise _not_found()
