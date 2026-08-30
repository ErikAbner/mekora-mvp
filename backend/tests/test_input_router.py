"""
Testes para input_router_service — Fase A.
"""

from __future__ import annotations

import pytest

from app.services.input_router_service import (
    detect_input_format,
    detect_processing_mode,
    get_accepted_extensions,
    is_accepted,
)


# ---------------------------------------------------------------------------
# detect_processing_mode
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("filename", [
    "manga.cbz",
    "comic.CBZ",
    "volume.cbr",
    "doujin.cb7",
    "collection.cbc",
])
def test_detect_mode_comic(filename: str) -> None:
    assert detect_processing_mode(filename) == "comic"


@pytest.mark.parametrize("filename", [
    "book.pdf",
    "report.PDF",
    "document.docx",
    "chapter.epub",
    "notes.txt",
    "page.html",
    "page.htm",
    "doc.odt",
    "file.rtf",
])
def test_detect_mode_document(filename: str) -> None:
    assert detect_processing_mode(filename) == "document"


def test_pdf_defaults_to_document() -> None:
    """PDF deve ser 'document' por padrão — override é feito pela UI."""
    assert detect_processing_mode("manga.pdf") == "document"


# ---------------------------------------------------------------------------
# is_accepted
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("filename", [
    "book.pdf", "book.docx", "book.odt", "book.rtf",
    "book.txt", "book.html", "book.htm", "book.epub",
    "book.cbz", "book.cbr", "book.cb7", "book.cbc",
])
def test_is_accepted_valid(filename: str) -> None:
    assert is_accepted(filename) is True


@pytest.mark.parametrize("filename", [
    "book.xyz", "book.exe", "book.mp4", "book.", "book",
])
def test_is_accepted_invalid(filename: str) -> None:
    assert is_accepted(filename) is False


def test_get_accepted_extensions_contains_all() -> None:
    exts = get_accepted_extensions()
    for ext in (".pdf", ".docx", ".cbz", ".cbr", ".cb7", ".cbc", ".epub", ".txt"):
        assert ext in exts


# ---------------------------------------------------------------------------
# detect_input_format
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("filename,expected", [
    ("book.PDF", "pdf"),
    ("manga.CBZ", "cbz"),
    ("doc.Docx", "docx"),
    ("file.TXT", "txt"),
])
def test_detect_input_format_lowercase(filename: str, expected: str) -> None:
    assert detect_input_format(filename) == expected


def test_detect_input_format_no_extension() -> None:
    assert detect_input_format("noextension") == ""
