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
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Cookie, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob

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
    # O nome do EPUB vem do titulo/autor e pode legitimamente conter parenteses,
    # virgulas e outros sinais. A seguranca nao depende de reduzir o alfabeto do
    # nome: `_validate_segments` barra separadores, ocultos e traversal, e
    # `_serve_validated` confirma que o caminho resolvido continua dentro do job.
    re.compile(r"^.+\.epub$"),  # EPUBs gerados (KCC/Calibre)
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

# Um segmento pode conservar a pontuacao real do titulo do livro. NUL e os dois
# separadores de caminho continuam proibidos; pontos isolados e arquivos ocultos
# sao recusados separadamente em `_validate_segments`.
_SAFE_SEGMENT = re.compile(r"^[^/\\\x00]+$")
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
    headers = {"X-Content-Type-Options": "nosniff"}
    if media_type == "text/html":
        # Os relatórios são conteúdo gerado a partir de arquivo enviado. Mesmo
        # que uma interpolação futura esqueça o escape, esta página não ganha
        # script, formulário, navegação superior nem acesso à aplicação.
        headers["Content-Security-Policy"] = (
            "default-src 'none'; img-src 'self' data:; "
            "style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; "
            "frame-ancestors 'none'; sandbox"
        )
    return FileResponse(str(resolved), media_type=media_type, headers=headers)


# ---------------------------------------------------------------------------
# Rotas
# ---------------------------------------------------------------------------

def _autorizar(ref: str, sessao: Optional[str], db: Session) -> int:
    """Diz de qual pasta o arquivo pode sair, ou nega.

    `ref` é o que veio no endereço, e ele aceita duas formas:

    O ENDEREÇO PÚBLICO — um token aleatório. Quem o tem, pode ler. É o que
    sustenta o trabalho feito SEM conta, que a DEC-0018 garante existir: não há
    dono para conferir, então a prova é conhecer um endereço que ninguém
    adivinha.

    O NÚMERO DO TRABALHO — que era a única forma até 30/08 e é a razão desta
    função existir. Ele é sequencial, então `/storage/output/7/livro.epub`
    respondia para quem contasse até sete (DEC-0039 §5). Por número, agora, só
    passa quem está logado E é o dono.

    O 404 é o mesmo nos dois casos de recusa, e isso é deliberado: um 403 em
    trabalho existente e 404 em inexistente contaria quais números existem, que é
    metade do que se está protegendo.
    """
    from app.services import acesso_service

    trabalho = None
    if ref.isdigit():
        trabalho = db.query(ProcessingJob).filter(ProcessingJob.id == int(ref)).first()
        if trabalho is None:
            raise _not_found()
        # Sem dono e pedido por número: não há como provar nada. O endereço
        # público existe justamente para este caso.
        if trabalho.dono_id is None:
            raise _not_found()
        pessoa = acesso_service.quem_e(db, sessao)
        if pessoa is None or pessoa.id != trabalho.dono_id:
            raise _not_found()
    else:
        trabalho = db.query(ProcessingJob).filter(ProcessingJob.token_publico == ref).first()
        if trabalho is None:
            raise _not_found()

    return trabalho.id


@router.get("/storage/output/{ref}/{artifact_path:path}")
def serve_job_artifact(
    ref: str,
    artifact_path: str,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Serve um artefato permitido de um job. Tudo fora da allowlist → 404."""
    from app.core.config import STORAGE_OUTPUT  # lazy p/ testes

    segments = _validate_segments(artifact_path)
    if not _is_allowed_artifact(segments):
        raise _not_found()
    job_id = _autorizar(ref, mekora_sessao, db)
    return _serve_validated(STORAGE_OUTPUT / str(job_id), segments)


@router.get("/storage/temp/{ref}/{filename}")
def serve_thumbnail(
    ref: str,
    filename: str,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Serve apenas thumbnails de análise (page_0..page_4.png).

    Passa pela mesma porta: a miniatura é a PRIMEIRA PÁGINA do documento, e a
    primeira página costuma trazer título, autor e às vezes o nome de quem
    recebeu. Proteger o EPUB e deixar a miniatura aberta protegeria o livro e
    entregaria a capa.
    """
    from app.core.config import STORAGE_TEMP  # lazy p/ testes

    if not _THUMBNAIL_NAME.match(filename):
        raise _not_found()
    job_id = _autorizar(ref, mekora_sessao, db)
    return _serve_validated(STORAGE_TEMP / str(job_id), [filename])


@router.get("/storage/covers/{ref}/{filename}")
def serve_cover(
    ref: str,
    filename: str,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Serve a capa PROMOVIDA — `storage/covers/{id}/capa.png`.

    Mesma porta que a miniatura, e pela mesma razão: a capa é a primeira página
    do documento, e a primeira página costuma trazer título, autor e às vezes o
    nome de quem recebeu.

    Ela existe separada de `/storage/temp/` porque a limpeza por idade apaga
    `temp/{id}` e deixa `output/{id}` — a capa estava do lado errado dessa
    linha, ilustrando uma estante permanente a partir de uma pasta que a
    política existe para apagar. Ver `services/capa_service.py`.
    """
    from app.core.config import STORAGE_COVERS  # lazy p/ testes

    if filename != "capa.png":
        raise _not_found()
    job_id = _autorizar(ref, mekora_sessao, db)
    return _serve_validated(STORAGE_COVERS / str(job_id), [filename])


@router.get("/storage/{rest:path}")
def storage_catch_all(rest: str) -> None:
    """Qualquer outro caminho de /storage (db, config, input, backups…) → 404."""
    raise _not_found()
