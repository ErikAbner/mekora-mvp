"""
Extração estruturada de texto por formato de documento — Fase B.

Produz uma lista de TextBlocks ordenados com tipo semântico preservado
(heading, paragraph, list_item, quote, preformatted, unknown).

Formatos suportados: pdf, docx, odt, rtf, txt, html, htm, epub.
"""

from __future__ import annotations

import re
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from uuid import uuid4


@dataclass
class TextBlock:
    id: str
    type: str   # heading | paragraph | list_item | quote | preformatted | unknown
    order: int
    text: str
    metadata: dict = field(default_factory=dict)  # ex: {"level": 1} para headings


# ---------------------------------------------------------------------------
# Função pública
# ---------------------------------------------------------------------------

def extract_blocks(file_path: Path, input_format: str) -> list[TextBlock]:
    """
    Extrai blocos estruturados do arquivo em *file_path* de acordo com *input_format*.
    Blocos com texto vazio são descartados.
    """
    fmt = input_format.lower().lstrip(".")
    extractors = {
        "pdf":  _extract_pdf,
        "docx": _extract_docx,
        "odt":  _extract_odt,
        "rtf":  _extract_rtf,
        "txt":  _extract_txt,
        "html": _extract_html,
        "htm":  _extract_html,
        "epub": _extract_epub,
    }
    extractor = extractors.get(fmt, _extract_txt_fallback)
    blocks = extractor(file_path)
    return [b for b in blocks if b.text.strip()]


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _make_block(block_type: str, order: int, text: str, **meta: object) -> TextBlock:
    return TextBlock(
        id=uuid4().hex,
        type=block_type,
        order=order,
        text=text.strip(),
        metadata=dict(meta),
    )


def _blocks_from_paragraphs(paragraphs: list[str]) -> list[TextBlock]:
    """Converte lista de strings de parágrafo em TextBlocks, descartando vazios."""
    blocks: list[TextBlock] = []
    for i, para in enumerate(paragraphs):
        text = para.strip()
        if text:
            blocks.append(_make_block("paragraph", i, text))
    return blocks


# ---------------------------------------------------------------------------
# Extratores por formato
# ---------------------------------------------------------------------------

def _extract_txt(file_path: Path) -> list[TextBlock]:
    text = file_path.read_text(encoding="utf-8", errors="replace")
    paragraphs = re.split(r"\n{2,}", text)
    return _blocks_from_paragraphs(paragraphs)


def _extract_txt_fallback(file_path: Path) -> list[TextBlock]:
    """Fallback genérico: lê como texto plano."""
    try:
        text = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return []
    paragraphs = re.split(r"\n{2,}", text)
    return _blocks_from_paragraphs(paragraphs)


def _extract_pdf(file_path: Path) -> list[TextBlock]:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return _extract_txt_fallback(file_path)

    doc = fitz.open(str(file_path))
    all_sizes: list[float] = []

    # Primeiro passo: coletar todos os tamanhos de fonte para calcular mediana
    raw_blocks: list[tuple[float, str]] = []  # (max_font_size, text)
    for page in doc:
        blocks = page.get_text("dict").get("blocks", [])
        for block in blocks:
            if block.get("type") != 0:  # 0 = texto
                continue
            lines = block.get("lines", [])
            block_text_parts: list[str] = []
            block_max_size: float = 0.0
            for line in lines:
                for span in line.get("spans", []):
                    size = span.get("size", 0.0)
                    t = span.get("text", "")
                    if t.strip():
                        block_text_parts.append(t)
                        if size > block_max_size:
                            block_max_size = size
                        all_sizes.append(size)
            text = " ".join(block_text_parts).strip()
            if text:
                raw_blocks.append((block_max_size, text))

    median_size = statistics.median(all_sizes) if all_sizes else 12.0

    result: list[TextBlock] = []
    for order, (size, text) in enumerate(raw_blocks):
        if size >= median_size * 1.4:
            result.append(_make_block("heading", order, text, level=1))
        elif size >= median_size * 1.2:
            result.append(_make_block("heading", order, text, level=2))
        else:
            result.append(_make_block("paragraph", order, text))

    doc.close()
    return result


def _extract_docx(file_path: Path) -> list[TextBlock]:
    try:
        from docx import Document  # type: ignore[import-untyped]
    except ImportError:
        return _extract_txt_fallback(file_path)

    doc = Document(str(file_path))
    result: list[TextBlock] = []
    order = 0
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style_name = para.style.name if para.style else ""
        if style_name.startswith("Heading"):
            # "Heading 1", "Heading 2", etc.
            parts = style_name.split()
            level = int(parts[-1]) if len(parts) > 1 and parts[-1].isdigit() else 1
            result.append(_make_block("heading", order, text, level=level))
        elif "List" in style_name:
            result.append(_make_block("list_item", order, text))
        elif style_name.startswith("Quote") or style_name == "Intense Quote":
            result.append(_make_block("quote", order, text))
        else:
            result.append(_make_block("paragraph", order, text))
        order += 1
    return result


def _extract_odt(file_path: Path) -> list[TextBlock]:
    try:
        from odf.opendocument import load as odf_load  # type: ignore[import-untyped]
        from odf.text import H, P  # type: ignore[import-untyped]
        from odf import teletype  # type: ignore[import-untyped]
    except ImportError:
        return _extract_txt_fallback(file_path)

    doc = odf_load(str(file_path))
    result: list[TextBlock] = []
    order = 0
    for elem in doc.text.childNodes:
        tag = getattr(elem, "qname", ("", ""))[1] if hasattr(elem, "qname") else ""
        text = teletype.extractText(elem).strip()
        if not text:
            continue
        if tag == "h":
            level_attr = elem.getAttribute("outlinelevel") or "1"
            try:
                level = int(level_attr)
            except (ValueError, TypeError):
                level = 1
            result.append(_make_block("heading", order, text, level=level))
        elif tag == "p":
            result.append(_make_block("paragraph", order, text))
        else:
            result.append(_make_block("unknown", order, text))
        order += 1
    return result


def _extract_rtf(file_path: Path) -> list[TextBlock]:
    try:
        from striprtf.striprtf import rtf_to_text  # type: ignore[import-untyped]
    except ImportError:
        return _extract_txt_fallback(file_path)

    raw = file_path.read_text(encoding="utf-8", errors="replace")
    plain = rtf_to_text(raw)
    paragraphs = re.split(r"\n{2,}", plain)
    return _blocks_from_paragraphs(paragraphs)


def _extract_html(file_path: Path) -> list[TextBlock]:
    try:
        from bs4 import BeautifulSoup  # type: ignore[import-untyped]
    except ImportError:
        return _extract_txt_fallback(file_path)

    content = file_path.read_bytes()
    soup = BeautifulSoup(content, "html.parser")
    return _parse_html_soup(soup)


def _parse_html_soup(soup: object) -> list[TextBlock]:
    """Extrai blocos de um objeto BeautifulSoup."""
    from bs4 import BeautifulSoup, Tag  # type: ignore[import-untyped]

    result: list[TextBlock] = []
    order = 0
    body = soup.find("body") or soup  # type: ignore[union-attr]

    HEADING_TAGS = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}

    for elem in body.descendants:  # type: ignore[union-attr]
        if not isinstance(elem, Tag):
            continue
        tag = elem.name
        if tag not in ("h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote", "pre"):
            continue
        text = elem.get_text(separator=" ", strip=True)
        if not text:
            continue
        if tag in HEADING_TAGS:
            result.append(_make_block("heading", order, text, level=HEADING_TAGS[tag]))
        elif tag == "p":
            result.append(_make_block("paragraph", order, text))
        elif tag == "li":
            result.append(_make_block("list_item", order, text))
        elif tag == "blockquote":
            result.append(_make_block("quote", order, text))
        elif tag == "pre":
            result.append(_make_block("preformatted", order, text))
        order += 1

    return result


def _extract_epub(file_path: Path) -> list[TextBlock]:
    try:
        import ebooklib  # type: ignore[import-untyped]
        from ebooklib import epub
        from bs4 import BeautifulSoup  # type: ignore[import-untyped]
    except ImportError:
        return _extract_txt_fallback(file_path)

    book = epub.read_epub(str(file_path), options={"ignore_ncx": True})

    # Obter itens do spine em ordem linear
    spine_ids = [idref for idref, linear in book.spine if linear]
    if not spine_ids:
        spine_ids = [idref for idref, _ in book.spine]

    result: list[TextBlock] = []
    order = 0
    for idref in spine_ids:
        item = book.get_item_with_id(idref)
        if item is None or item.get_type() != ebooklib.ITEM_DOCUMENT:
            continue
        content = item.get_content()
        soup = BeautifulSoup(content, "html.parser")
        chapter_blocks = _parse_html_soup(soup)
        for block in chapter_blocks:
            block.order = order
            order += 1
            result.append(block)

    return result
