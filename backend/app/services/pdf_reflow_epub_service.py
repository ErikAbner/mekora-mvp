"""Converte PDFs com camada textual em EPUB de leitura adaptável."""
from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Callable, Optional

import fitz
from ebooklib import epub

from app.services.convert_service import ConversionCancelled, ConversionFailedError


def _reading_regions(page: fitz.Page) -> list[fitz.Rect]:
    """Ordena páginas duplas digitalizadas: esquerda inteira, depois direita."""
    rect = page.rect
    if rect.width <= rect.height * 1.15:
        return [rect]

    words = page.get_text("words")
    if len(words) < 40:
        return [rect]
    center = rect.x0 + rect.width / 2
    gutter = max(8.0, rect.width * 0.012)
    left = sum(1 for word in words if word[2] < center - gutter)
    right = sum(1 for word in words if word[0] > center + gutter)
    crossing = len(words) - left - right
    if min(left, right) < 20 or crossing > len(words) * 0.08:
        return [rect]

    return [
        fitz.Rect(rect.x0, rect.y0, center, rect.y1),
        fitz.Rect(center, rect.y0, rect.x1, rect.y1),
    ]


def _paragraphs(page: fitz.Page) -> list[str]:
    flags = fitz.TEXTFLAGS_TEXT | fitz.TEXT_DEHYPHENATE
    paragraphs: list[str] = []
    for region in _reading_regions(page):
        text = page.get_text("text", sort=True, flags=flags, clip=region)
        text = text.replace("\u00ad", "").replace("\x00", "")
        paragraphs.extend(
            re.sub(r"[ \t]+", " ", part).strip()
            for part in re.split(r"\n\s*\n", text)
            if part.strip()
        )
    return paragraphs


def _escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def convert_pdf_to_reflow_epub(
    input_path: Path,
    output_epub: Path,
    title: str,
    author: str,
    language: str,
    cover: Optional[Path] = None,
    deve_parar: Optional[Callable[[], bool]] = None,
    progresso: Optional[Callable[[int, int], None]] = None,
) -> None:
    """Cria um EPUB refluível e conserva como imagem apenas páginas visuais."""
    output_epub.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_epub.with_suffix(".epub.part")
    temporary.unlink(missing_ok=True)
    document: fitz.Document | None = None
    try:
        document = fitz.open(input_path)
        book = epub.EpubBook()
        book.set_identifier(str(uuid.uuid4()))
        book.set_title(title)
        book.set_language(language or "por")
        book.add_author(author)
        if cover and cover.exists():
            book.set_cover(f"cover{cover.suffix.lower() or '.jpg'}", cover.read_bytes())

        style = epub.EpubItem(
            uid="reading-style",
            file_name="styles/reading.css",
            media_type="text/css",
            content=(
                "body{font-family:serif;line-height:1.55;margin:5%;}"
                "p{margin:0 0 1em;}h2{font-size:1.15em;margin:0 0 1.2em;}"
                "figure{margin:0;text-align:center;}img{max-width:100%;height:auto;}"
                ".pagina{color:#666;font-size:.8em;}"
            ).encode("utf-8"),
        )
        book.add_item(style)

        chapters: list[epub.EpubHtml] = []
        total = document.page_count
        for index, page in enumerate(document):
            if deve_parar and deve_parar():
                raise ConversionCancelled()
            paragraphs = _paragraphs(page)
            plain = " ".join(paragraphs)
            body: list[str] = [f'<p class="pagina">Página {index + 1}</p>']

            if len(plain) < 120:
                pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
                image_name = f"images/page-{index + 1:04d}.jpg"
                image = epub.EpubItem(
                    uid=f"visual-page-{index + 1}",
                    file_name=image_name,
                    media_type="image/jpeg",
                    content=pixmap.tobytes("jpeg", jpg_quality=92),
                )
                book.add_item(image)
                body.append(f'<figure><img src="{image_name}" alt="Página visual {index + 1}"/></figure>')
            else:
                for paragraph in paragraphs:
                    body.append(f"<p>{_escape(paragraph)}</p>")

            chapter = epub.EpubHtml(
                title=f"Página {index + 1}",
                file_name=f"page-{index + 1:04d}.xhtml",
                lang=language or "por",
            )
            chapter.add_item(style)
            chapter.content = "<html><body>" + "\n".join(body) + "</body></html>"
            book.add_item(chapter)
            chapters.append(chapter)
            if progresso:
                progresso(index + 1, total)

        book.toc = tuple(chapters)
        book.spine = chapters
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        epub.write_epub(temporary, book, {})
        temporary.replace(output_epub)
    except ConversionCancelled:
        temporary.unlink(missing_ok=True)
        raise
    except Exception as exc:
        temporary.unlink(missing_ok=True)
        raise ConversionFailedError(f"Não consegui criar a leitura adaptável do PDF: {exc}") from exc
    finally:
        if document is not None:
            document.close()
