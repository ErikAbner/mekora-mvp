from pathlib import Path
from zipfile import ZipFile

import fitz

from app.services.pdf_fixed_epub_service import convert_pdf_to_fixed_epub


def test_pdf_becomes_one_ordered_image_per_page(tmp_path: Path) -> None:
    source = tmp_path / "visual.pdf"
    output = tmp_path / "visual.epub"
    document = fitz.open()
    for label in ("Primeira", "Segunda"):
        page = document.new_page()
        page.insert_text((72, 72), label)
    document.save(source)
    document.close()

    progress: list[tuple[int, int]] = []
    convert_pdf_to_fixed_epub(
        source, output, "Livro visual", "Autoria", "por",
        progresso=lambda current, total: progress.append((current, total)),
    )

    with ZipFile(output) as archive:
        names = archive.namelist()
        assert len([name for name in names if name.endswith(".jpg")]) == 2
        assert "EPUB/page-0001.xhtml" in names
        assert "EPUB/page-0002.xhtml" in names
    assert progress == [(1, 2), (2, 2)]
