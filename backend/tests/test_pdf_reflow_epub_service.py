from pathlib import Path
from zipfile import ZipFile

import fitz

from app.services.pdf_reflow_epub_service import _paragraphs, convert_pdf_to_reflow_epub


def test_pdf_textual_becomes_adjustable_text_and_keeps_visual_page(tmp_path: Path) -> None:
    source = tmp_path / "book.pdf"
    output = tmp_path / "book.epub"
    document = fitz.open()
    textual = document.new_page()
    textual.insert_textbox(
        fitz.Rect(72, 72, 520, 500),
        "Selectable and adjustable text. " * 12,
        fontsize=12,
    )
    visual = document.new_page()
    visual.draw_rect(fitz.Rect(80, 80, 400, 500), color=(0, 0, 0), fill=(0.5, 0.5, 0.5))
    document.save(source)
    document.close()

    progress: list[tuple[int, int]] = []
    convert_pdf_to_reflow_epub(
        source, output, "Accessible book", "Author", "eng",
        progresso=lambda current, total: progress.append((current, total)),
    )

    with ZipFile(output) as archive:
        first = archive.read("EPUB/page-0001.xhtml").decode("utf-8")
        second = archive.read("EPUB/page-0002.xhtml").decode("utf-8")
        assert "Selectable and adjustable text" in first
        assert "<img" not in first
        assert "<img" in second
        assert len([name for name in archive.namelist() if name.endswith(".jpg")]) == 1
    assert progress == [(1, 2), (2, 2)]


def test_landscape_book_spread_reads_left_page_before_right_page(tmp_path: Path) -> None:
    source = tmp_path / "spread.pdf"
    document = fitz.open()
    page = document.new_page(width=840, height=600)
    for row in range(12):
        page.insert_text((70, 70 + row * 25), f"ESQUERDA linha {row} com texto suficiente", fontsize=11)
        page.insert_text((500, 70 + row * 25), f"DIREITA linha {row} com texto suficiente", fontsize=11)
    document.save(source)
    document.close()

    document = fitz.open(source)
    text = " ".join(_paragraphs(document[0]))
    document.close()

    assert text.index("ESQUERDA linha 11") < text.index("DIREITA linha 0")
