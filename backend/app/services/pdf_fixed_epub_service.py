"""EPUB de layout fixo para PDFs cuja página visual precisa ser preservada.

O Calibre tenta remontar PDFs e pode separar uma página em camadas de imagem,
serializando-as uma depois da outra. Uma imagem renderizada por página mantém
ordem e composição sem fingir que um PDF de design é texto refluível.
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Callable, Optional

import fitz
from ebooklib import epub

from app.services.convert_service import ConversionCancelled, ConversionFailedError


def convert_pdf_to_fixed_epub(
    input_path: Path,
    output_epub: Path,
    title: str,
    author: str,
    language: str,
    cover: Optional[Path] = None,
    deve_parar: Optional[Callable[[], bool]] = None,
    progresso: Optional[Callable[[int, int], None]] = None,
) -> None:
    output_epub.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_epub.with_suffix(".epub.part")
    temporary.unlink(missing_ok=True)
    try:
        document = fitz.open(input_path)
        book = epub.EpubBook()
        book.set_identifier(str(uuid.uuid4()))
        book.set_title(title)
        book.set_language(language or "por")
        book.add_author(author)
        book.add_metadata("OPF", "meta", "pre-paginated", {"property": "rendition:layout"})
        book.add_metadata("OPF", "meta", "auto", {"property": "rendition:orientation"})
        if cover and cover.exists():
            book.set_cover(f"cover{cover.suffix.lower() or '.jpg'}", cover.read_bytes())

        chapters = []
        total = document.page_count
        for index, page in enumerate(document):
            if deve_parar and deve_parar():
                raise ConversionCancelled()
            # 144 dpi equilibra legibilidade em telas retina e tamanho do livro.
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image_name = f"images/page-{index + 1:04d}.jpg"
            image = epub.EpubItem(
                uid=f"page-image-{index + 1}",
                file_name=image_name,
                media_type="image/jpeg",
                content=pixmap.tobytes("jpeg", jpg_quality=86),
            )
            book.add_item(image)
            chapter = epub.EpubHtml(
                title=f"Página {index + 1}",
                file_name=f"page-{index + 1:04d}.xhtml",
                lang=language or "por",
            )
            chapter.content = (
                '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
                '<meta name="viewport" content="width=device-width,height=device-height"/>'
                '<style>html,body{margin:0;padding:0;width:100%;height:100%;background:#fff}'
                'img{display:block;width:100%;height:100%;object-fit:contain}</style></head>'
                f'<body><img src="{image_name}" alt="Página {index + 1}"/></body></html>'
            )
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
        document.close()
    except ConversionCancelled:
        temporary.unlink(missing_ok=True)
        raise
    except Exception as exc:
        temporary.unlink(missing_ok=True)
        raise ConversionFailedError(f"Não consegui preservar as páginas do PDF: {exc}") from exc
