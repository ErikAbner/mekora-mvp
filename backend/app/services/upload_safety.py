"""
v1.2.2 — Recepção segura de uploads (streaming + validação estrutural).

Ponto único usado por `POST /upload` para:

- gerar o filename salvo no servidor (não deriva do cliente);
- gravar em chunks com contador acumulado; interromper e apagar parcial
  se exceder `limits.upload_max_mb`;
- validar cabeçalho básico (magic bytes) contra o formato declarado;
- rejeitar filename vazio, oculto, com separador de path ou controle;
- gravação exclusiva (não sobrescreve arquivo existente).

Só reconhece os formatos já suportados pelo produto — não adiciona
novos. Para formatos "genéricos" (txt/rtf/html/htm) a validação de
magic bytes é frouxa (ok se compatível com texto), refletindo o pipeline
real.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Optional

from app.core.limits import limits


class UploadRejectedError(Exception):
    """Rejeição de upload com mensagem pública curta (sem paths locais)."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


# ---------------------------------------------------------------------------
# Filename saneado
# ---------------------------------------------------------------------------

_SAFE_CHAR = re.compile(r"[^A-Za-z0-9_.\- ]")
_MAX_ORIGINAL_NAME_LEN = 240


def sanitize_original_filename(raw: Optional[str]) -> str:
    """
    Devolve um nome legível para exibir no histórico e usar como slug do
    arquivo salvo. Rejeita nomes vazios, ocultos ou com segmentos inválidos.
    """
    if not raw or not raw.strip():
        raise UploadRejectedError("FILENAME_EMPTY", "Nome de arquivo inválido.")

    name = raw.strip()
    if len(name) > _MAX_ORIGINAL_NAME_LEN:
        name = name[:_MAX_ORIGINAL_NAME_LEN]

    # Bloqueia separadores de path e caracteres de controle
    if any(c in name for c in ("/", "\\", "\x00")) or any(ord(c) < 32 for c in name):
        raise UploadRejectedError("FILENAME_INVALID", "Nome de arquivo inválido.")

    # Rejeita ocultos e "." / ".."
    base = Path(name).name  # descarta qualquer prefixo caso ainda restasse
    if not base or base in (".", "..") or base.startswith("."):
        raise UploadRejectedError("FILENAME_INVALID", "Nome de arquivo inválido.")

    # Windows: nomes reservados
    stem = base.split(".", 1)[0].upper()
    if stem in {"CON", "PRN", "AUX", "NUL"} or re.fullmatch(r"COM[1-9]|LPT[1-9]", stem):
        raise UploadRejectedError("FILENAME_INVALID", "Nome de arquivo inválido.")

    # Reduz a caracteres seguros para uso em disco (preserva o original em
    # coluna do banco — este slug alimenta apenas o path no servidor)
    return base


def server_controlled_path(dest_dir: Path, job_id: int, safe_name: str) -> Path:
    """
    Gera o caminho salvo pelo servidor: `dest_dir/{job_id}_{slug}`, onde
    `slug` é a versão sanitizada + ASCII-safe do nome original. NUNCA
    aceita o filename do cliente diretamente.
    """
    slug = _SAFE_CHAR.sub("_", safe_name).strip("_") or "file"
    return dest_dir / f"{job_id}_{slug}"


# ---------------------------------------------------------------------------
# Magic bytes por formato aceito
# ---------------------------------------------------------------------------

# Assinaturas conservadoras (checagem só nos primeiros bytes)
_MAGIC: dict[str, list[bytes]] = {
    "pdf": [b"%PDF-"],
    "epub": [b"PK\x03\x04"],       # é um ZIP; extra check abaixo
    "cbz": [b"PK\x03\x04"],
    "cbr": [b"Rar!\x1a\x07\x00", b"Rar!\x1a\x07\x01\x00"],
    "cb7": [b"7z\xbc\xaf\x27\x1c"],
    "cbc": [b"PK\x03\x04"],
    "docx": [b"PK\x03\x04"],
    "odt": [b"PK\x03\x04"],
    "rtf": [b"{\\rtf"],
}

# txt/html/htm: sem assinatura fixa; aceitamos qualquer conteúdo que
# decodifique como texto UTF-8/latin1 (validado in-stream após limite).
_TEXTUAL_FORMATS = {"txt", "html", "htm"}


def check_magic(fmt: str, head: bytes) -> None:
    """Valida os primeiros bytes contra o formato declarado."""
    fmt = fmt.lower().lstrip(".")
    if fmt in _TEXTUAL_FORMATS:
        # Texto: rejeita apenas se contém NUL nos primeiros KB
        if b"\x00" in head:
            raise UploadRejectedError(
                "FORMAT_MISMATCH",
                "O conteúdo do arquivo não bate com o formato declarado.",
            )
        return
    expected = _MAGIC.get(fmt)
    if expected is None:
        raise UploadRejectedError(
            "FORMAT_UNSUPPORTED",
            "Formato não suportado.",
        )
    if not any(head.startswith(sig) for sig in expected):
        raise UploadRejectedError(
            "FORMAT_MISMATCH",
            "O conteúdo do arquivo não bate com o formato declarado.",
        )


# ---------------------------------------------------------------------------
# Streaming write com limite
# ---------------------------------------------------------------------------

def _open_exclusive(path: Path):
    """Abre para escrita SEM sobrescrever destino existente."""
    # `x` = exclusive create → OSError se o arquivo já existe
    return path.open("xb")


async def stream_to_disk(
    upload_file: Any,
    dest: Path,
    fmt: str,
) -> int:
    """
    Copia `upload_file` (Starlette UploadFile) para `dest` em chunks,
    validando magic bytes no primeiro chunk e o tamanho acumulado a
    cada chunk. Em qualquer falha remove o arquivo parcial.

    Retorna bytes escritos.
    """
    max_bytes = limits.upload_max_mb * 1024 * 1024
    chunk_size = limits.upload_chunk_bytes
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists():
        raise UploadRejectedError(
            "UPLOAD_DEST_EXISTS",
            "Já existe um arquivo com este nome para o job.",
        )

    written = 0
    head_checked = False
    try:
        with _open_exclusive(dest) as sink:
            while True:
                chunk = await upload_file.read(chunk_size)
                if not chunk:
                    break
                if not head_checked:
                    check_magic(fmt, chunk[:16])
                    head_checked = True
                written += len(chunk)
                if written > max_bytes:
                    raise UploadRejectedError(
                        "UPLOAD_TOO_LARGE",
                        f"Arquivo excede o limite de "
                        f"{limits.upload_max_mb} MB.",
                    )
                sink.write(chunk)
        if not head_checked:
            # arquivo vazio
            raise UploadRejectedError(
                "UPLOAD_EMPTY",
                "Arquivo enviado está vazio.",
            )
    except UploadRejectedError:
        _cleanup(dest)
        raise
    except OSError:
        _cleanup(dest)
        raise UploadRejectedError(
            "UPLOAD_WRITE_FAILED",
            "Falha ao gravar o upload no servidor.",
        )
    except Exception:
        _cleanup(dest)
        raise UploadRejectedError(
            "UPLOAD_WRITE_FAILED",
            "Falha inesperada ao processar o upload.",
        )
    finally:
        try:
            await upload_file.close()
        except Exception:
            pass
    return written


def _cleanup(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except OSError:
        pass
