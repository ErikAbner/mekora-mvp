"""
v1.2.2 — Validação central de arquivos compactados (CBZ/CBR/CB7/CBC).

Consolida limites e checagens estruturais antes de qualquer `.read()`
ou `.extractall()`. Usado por `comic_translation_service._extract_*`.

Regras aplicadas por `inspect_zip_members` / `inspect_rar_members`:
- nº de entradas ≤ `limits.archive_max_entries`
- soma de `file_size` declarada ≤ `limits.archive_max_total_mb`
- cada `file_size` declarada ≤ `limits.archive_max_entry_mb`
- nomes vazios, absolutos, com `..`, com separadores estranhos são rejeitados
- entradas não-regulares (links, dispositivos) são rejeitadas
- para extração real: destino resolvido deve permanecer dentro do tmpdir
- para 7z: a extração real conta bytes efetivamente escritos e aborta
  ao exceder o limite (não confia no metadata sozinho)
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any, Iterable, Optional

from app.core.limits import limits


class ArchiveSafetyError(Exception):
    """Falha estrutural no arquivo compactado."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


_MAX_NAME_LEN = 512


def _safe_member_name(name: str) -> Optional[str]:
    """Retorna None se o nome é seguro; caso contrário, código do erro."""
    if not name or len(name) > _MAX_NAME_LEN:
        return "EMPTY_OR_LONG_NAME"
    normalized = name.replace("\\", "/")
    if normalized.startswith("/"):
        return "ABSOLUTE_PATH"
    # Windows absoluto (C:\...)
    if len(normalized) >= 2 and normalized[1] == ":":
        return "ABSOLUTE_PATH"
    parts = [p for p in normalized.split("/") if p]
    for p in parts:
        if p in (".", ".."):
            return "PATH_TRAVERSAL"
        if p.startswith("."):
            # Ocultos (.hidden, .DS_Store) nunca fazem parte de CBZ/CBR válidos
            return "HIDDEN_NAME"
        # Caracteres de controle e NUL nunca aparecem em CBZ/CBR válidos
        if any(ord(c) < 32 or c == "\x7f" for c in p):
            return "CONTROL_CHAR_IN_NAME"
    if not parts:
        return "EMPTY_NAME"
    return None


def _limits_bytes() -> tuple[int, int]:
    """(max_entry_bytes, max_total_bytes) — usa a política central."""
    return (
        limits.archive_max_entry_mb * 1024 * 1024,
        limits.archive_max_total_mb * 1024 * 1024,
    )


def inspect_zip_members(zip_file: Any) -> None:
    """
    Valida um `zipfile.ZipFile` ANTES de qualquer `.read()`.
    Levanta `ArchiveSafetyError` no primeiro problema encontrado.
    """
    max_entry, max_total = _limits_bytes()
    infolist = zip_file.infolist()
    if len(infolist) > limits.archive_max_entries:
        raise ArchiveSafetyError(
            "ARCHIVE_TOO_MANY_ENTRIES",
            f"Arquivo tem {len(infolist)} entradas; limite é "
            f"{limits.archive_max_entries}.",
        )
    total = 0
    for info in infolist:
        err = _safe_member_name(info.filename)
        if err:
            raise ArchiveSafetyError(
                err, f"Entrada do arquivo com nome inválido ({err})."
            )
        # ZipInfo.file_size é o tamanho descomprimido declarado
        size = int(getattr(info, "file_size", 0) or 0)
        if size > max_entry:
            raise ArchiveSafetyError(
                "ARCHIVE_ENTRY_TOO_LARGE",
                f"Entrada excede {limits.archive_max_entry_mb} MB.",
            )
        # Bit externo indicando link simbólico em ZIP (unix mode 0xA000)
        external = getattr(info, "external_attr", 0) or 0
        mode = (external >> 16) & 0xFFFF
        if mode and (mode & 0o170000) == 0o120000:
            raise ArchiveSafetyError(
                "ARCHIVE_NON_REGULAR_ENTRY",
                "Arquivo contém link simbólico interno — rejeitado.",
            )
        total += size
        if total > max_total:
            raise ArchiveSafetyError(
                "ARCHIVE_TOTAL_TOO_LARGE",
                f"Soma descomprimida excede "
                f"{limits.archive_max_total_mb} MB.",
            )


def inspect_rar_members(rar_file: Any) -> None:
    """Mesma política, adaptada para `rarfile.RarFile`."""
    max_entry, max_total = _limits_bytes()
    infolist = rar_file.infolist()
    if len(infolist) > limits.archive_max_entries:
        raise ArchiveSafetyError(
            "ARCHIVE_TOO_MANY_ENTRIES",
            f"Arquivo tem {len(infolist)} entradas; limite é "
            f"{limits.archive_max_entries}.",
        )
    total = 0
    for info in infolist:
        err = _safe_member_name(info.filename)
        if err:
            raise ArchiveSafetyError(
                err, f"Entrada do arquivo com nome inválido ({err})."
            )
        size = int(getattr(info, "file_size", 0) or 0)
        if size > max_entry:
            raise ArchiveSafetyError(
                "ARCHIVE_ENTRY_TOO_LARGE",
                f"Entrada excede {limits.archive_max_entry_mb} MB.",
            )
        # rarfile expõe is_dir / is_file (>=4.0); is_symlink em versões novas
        is_symlink = getattr(info, "is_symlink", lambda: False)
        try:
            if callable(is_symlink) and is_symlink():
                raise ArchiveSafetyError(
                    "ARCHIVE_NON_REGULAR_ENTRY",
                    "Arquivo contém link simbólico interno — rejeitado.",
                )
        except AttributeError:
            pass
        total += size
        if total > max_total:
            raise ArchiveSafetyError(
                "ARCHIVE_TOTAL_TOO_LARGE",
                f"Soma descomprimida excede "
                f"{limits.archive_max_total_mb} MB.",
            )


def _reset_dir(dest_dir: Path) -> None:
    shutil.rmtree(dest_dir, ignore_errors=True)
    dest_dir.mkdir(parents=True, exist_ok=True)


def inspect_7z_members(seven_zip_file: Any) -> list[dict]:
    """
    v1.2.3 — Preflight REAL de 7z usando `SevenZipFile.list()` (py7zr >= 0.20).
    Valida nº entradas, nomes, tamanho declarado por entrada e soma total
    DESCOMPRIMIDA antes de qualquer escrita em disco. Diretórios não contam
    para a soma. Retorna lista dos FileInfo aprovados (para o extractor).
    """
    try:
        infos = seven_zip_file.list()
    except Exception as exc:
        raise ArchiveSafetyError(
            "ARCHIVE_METADATA_FAILURE",
            f"Metadata do arquivo 7z ilegível: {type(exc).__name__}",
        )

    max_entry, max_total = _limits_bytes()
    if len(infos) > limits.archive_max_entries:
        raise ArchiveSafetyError(
            "ARCHIVE_TOO_MANY_ENTRIES",
            f"Arquivo tem {len(infos)} entradas; limite é "
            f"{limits.archive_max_entries}.",
        )

    approved: list[dict] = []
    total = 0
    for info in infos:
        name = getattr(info, "filename", "") or ""
        err = _safe_member_name(name)
        if err:
            raise ArchiveSafetyError(
                err, f"Entrada do arquivo com nome inválido ({err})."
            )
        is_dir = bool(getattr(info, "is_directory", False))
        archivable = bool(getattr(info, "archivable", True))
        if not is_dir and not archivable:
            raise ArchiveSafetyError(
                "ARCHIVE_NON_REGULAR_ENTRY",
                "Arquivo contém entrada não regular — rejeitado.",
            )
        size = int(getattr(info, "uncompressed", 0) or 0)
        if is_dir:
            approved.append({"filename": name, "is_directory": True, "size": 0})
            continue
        if size > max_entry:
            raise ArchiveSafetyError(
                "ARCHIVE_ENTRY_TOO_LARGE",
                f"Entrada excede {limits.archive_max_entry_mb} MB.",
            )
        total += size
        if total > max_total:
            raise ArchiveSafetyError(
                "ARCHIVE_TOTAL_TOO_LARGE",
                f"Soma descomprimida excede "
                f"{limits.archive_max_total_mb} MB.",
            )
        approved.append({"filename": name, "is_directory": False, "size": size})
    return approved


def safe_extract_7z(seven_zip_file: Any, dest_dir: Path) -> None:
    """
    v1.2.3 — Preflight declarado + extração + validação pós-escrita.

    1. `inspect_7z_members` valida ANTES de escrever (metadata do arquivo).
    2. `extractall` no `dest_dir` já resolvido.
    3. Enquanto varre o disco, confirma containment (rejeita symlinks e
       destinos fora), soma tamanhos EFETIVAMENTE escritos e aborta se
       exceder os limites (defesa contra tamanho declarado mentiroso).
    4. Qualquer erro remove parciais e recria diretório limpo.
    """
    max_entry, max_total = _limits_bytes()
    dest_dir = dest_dir.resolve(strict=True)

    inspect_7z_members(seven_zip_file)

    try:
        seven_zip_file.extractall(path=str(dest_dir))
    except ArchiveSafetyError:
        raise
    except Exception as exc:
        _reset_dir(dest_dir)
        raise ArchiveSafetyError(
            "ARCHIVE_EXTRACT_FAILED",
            f"Falha ao extrair arquivo 7z: {type(exc).__name__}",
        )

    total_written = 0
    for root, dirs, files in os.walk(dest_dir):
        for name in files:
            path = Path(root) / name
            if path.is_symlink():
                _reset_dir(dest_dir)
                raise ArchiveSafetyError(
                    "ARCHIVE_NON_REGULAR_ENTRY",
                    "Extração produziu link simbólico — rejeitado.",
                )
            try:
                resolved = path.resolve(strict=True)
                resolved.relative_to(dest_dir)
            except (OSError, ValueError):
                _reset_dir(dest_dir)
                raise ArchiveSafetyError(
                    "PATH_TRAVERSAL",
                    "Extração produziu destino fora do diretório permitido.",
                )
            size = path.stat().st_size
            if size > max_entry:
                _reset_dir(dest_dir)
                raise ArchiveSafetyError(
                    "ARCHIVE_ENTRY_TOO_LARGE",
                    f"Entrada excede {limits.archive_max_entry_mb} MB.",
                )
            total_written += size
            if total_written > max_total:
                _reset_dir(dest_dir)
                raise ArchiveSafetyError(
                    "ARCHIVE_TOTAL_TOO_LARGE",
                    f"Extração excede {limits.archive_max_total_mb} MB.",
                )


def safe_iter_image_names(names: Iterable[str], image_exts: set[str]) -> list[str]:
    """
    Filtra somente entradas cujo nome é seguro E cuja extensão é imagem
    permitida — pronto para uso após `inspect_*_members`.
    """
    out = []
    for n in names:
        if _safe_member_name(n) is not None:
            continue
        if Path(n).suffix.lower() in image_exts:
            out.append(n)
    return out
