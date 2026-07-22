"""Detecta tipo de arquivo e decide qual pipeline usar — Fase A."""

from pathlib import Path

DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.odt', '.rtf', '.txt', '.html', '.htm', '.epub'}
COMIC_EXTENSIONS = {'.cbz', '.cbr', '.cb7', '.cbc'}
ALL_ACCEPTED = DOCUMENT_EXTENSIONS | COMIC_EXTENSIONS


def get_accepted_extensions() -> set[str]:
    return ALL_ACCEPTED


def detect_processing_mode(filename: str) -> str:
    """Retorna 'comic' para formatos de quadrinhos, 'document' para os demais.

    PDFs são tratados como 'document' por padrão. O usuário pode fazer
    override manualmente via UI para 'comic' (modo KCC).
    """
    ext = Path(filename).suffix.lower()
    if ext in COMIC_EXTENSIONS:
        return 'comic'
    return 'document'


def detect_input_format(filename: str) -> str:
    """Retorna a extensão sem ponto em minúsculas (ex: 'pdf', 'cbz')."""
    return Path(filename).suffix.lower().lstrip('.')


def is_accepted(filename: str) -> bool:
    """Retorna True se a extensão do arquivo é suportada."""
    return Path(filename).suffix.lower() in ALL_ACCEPTED
