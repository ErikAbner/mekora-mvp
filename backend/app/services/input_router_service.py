"""Detecta tipo de arquivo e decide qual pipeline usar — Fase A.

A LISTA DE ACEITOS DEIXOU DE SER CONSTANTE. Com a conversão de quadrinhos
desligada (`app/core/quadrinhos.py`), `.cbz`, `.cbr`, `.cb7` e `.cbc` saem da
allowlist do `/upload` — que é o que tira o `unrar` e o `py7zr` do ar. Os
conjuntos continuam existindo: eles descrevem o que o produto SABE fazer, e a
bandeira decide o que ele ACEITA agora.
"""

from pathlib import Path

from app.core import quadrinhos

DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.odt', '.rtf', '.txt', '.html', '.htm', '.epub'}
COMIC_EXTENSIONS = {'.cbz', '.cbr', '.cb7', '.cbc'}
ALL_ACCEPTED = DOCUMENT_EXTENSIONS | COMIC_EXTENSIONS


def get_accepted_extensions() -> set[str]:
    if quadrinhos.ligados():
        return ALL_ACCEPTED
    return set(DOCUMENT_EXTENSIONS)


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
    """Retorna True se a extensão do arquivo é suportada AGORA.

    "Agora" e não "em tese": com os quadrinhos desligados, um `.cbr` é um
    formato que o Mekora conhece e não aceita, e o `/upload` o recusa com a
    razão escrita — que é diferente de fingir que nunca soube abri-lo.
    """
    return Path(filename).suffix.lower() in get_accepted_extensions()
