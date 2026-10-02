from pathlib import Path
from zipfile import ZipFile

import fitz

from app.services.pdf_reflow_epub_service import (
    _join_wrapped_hyphens,
    _paragraphs,
    _prefer_fallback_word,
    _conservative_spelling,
    convert_pdf_to_reflow_epub,
)


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
        first = archive.read("EPUB/section-0001.xhtml").decode("utf-8")
        second = archive.read("EPUB/section-0002.xhtml").decode("utf-8")
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


def test_text_fusion_uses_only_a_clearly_better_portuguese_word() -> None:
    assert _prefer_fallback_word("cufona", "euforia", "por") == "euforia"
    assert _prefer_fallback_word("intcgraf", "integrar", "por") == "integrar"
    # A camada antiga pode colar a sigla à palavra anterior. A caixa grande
    # toca as duas palavras visuais, mas não pode duplicar "governo".
    assert _prefer_fallback_word("JK", "governo]K", "por") == "JK"
    # Nome próprio raro não pode ser trocado só porque a outra camada também
    # contém um token raro diferente.
    assert _prefer_fallback_word("Gonçalves", "GQll", "por") == "Gonçalves"


def test_wrapped_hyphen_is_removed_only_for_a_known_joined_word() -> None:
    assert _join_wrapped_hyphens("apre-\nsentam", "por") == "apresentam"
    assert _join_wrapped_hyphens("estado-\nnovista", "por") == "estado-novista"


def test_spelling_correction_is_conservative_around_names_and_short_words() -> None:
    assert _conservative_spelling("desenvolvimernito", "por") == "desenvolvimento"
    assert _conservative_spelling("congrçsso", "por") == "congresso"
    assert _conservative_spelling("paertês", "por") == "paertês"
    assert _conservative_spelling("Gatete", "por") == "Gatete"
