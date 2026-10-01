from __future__ import annotations

import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from app.services.epub_figure_repair_service import repair_displaced_figures


def _xhtml(body: str) -> str:
    return f'''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body>{body}</body></html>'''


def _write_epub(path: Path, chapters: dict[str, str]) -> None:
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip")
        for name, body in chapters.items():
            archive.writestr(name, _xhtml(body))


def _figures(path: Path, chapter: str) -> list[tuple[list[str], list[str]]]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read(chapter))
    found = []
    for figure in (node for node in root.iter() if node.tag.endswith("figure")):
        images = [node.attrib["src"] for node in figure.iter() if node.tag.endswith("img")]
        captions = ["".join(node.itertext()) for node in figure.iter() if node.tag.endswith("figcaption")]
        found.append((images, captions))
    return found


def test_repairs_displaced_chain_across_chapters(tmp_path: Path) -> None:
    epub = tmp_path / "book.epub"
    _write_epub(
        epub,
        {
            "one.xhtml": '<figure><img src="ok.png"/></figure><figure><img src="first.png"/></figure>',
            "two.xhtml": (
                '<figure><img src="second.png"/><figcaption>Primeira</figcaption></figure>'
                '<figure><img src="third.png"/><figcaption>Segunda</figcaption></figure>'
                '<figure><figcaption>Terceira</figcaption></figure>'
            ),
        },
    )

    result = repair_displaced_figures(epub)

    assert result.repaired_chains == 1
    assert result.shifted_images == 3
    assert _figures(epub, "one.xhtml") == [(["ok.png"], [])]
    assert _figures(epub, "two.xhtml") == [
        (["first.png"], ["Primeira"]),
        (["second.png"], ["Segunda"]),
        (["third.png"], ["Terceira"]),
    ]


def test_leaves_valid_epub_untouched(tmp_path: Path) -> None:
    epub = tmp_path / "valid.epub"
    _write_epub(
        epub,
        {"one.xhtml": '<figure><img src="one.png"/><figcaption>Uma</figcaption></figure>'},
    )
    before = epub.read_bytes()

    result = repair_displaced_figures(epub)

    assert result.repaired_chains == 0
    assert epub.read_bytes() == before


def test_explicit_donor_can_cross_uncaptioned_figures(tmp_path: Path) -> None:
    epub = tmp_path / "malformed-book.epub"
    _write_epub(
        epub,
        {
            "one.xhtml": '<figure><img src="donor.png"/></figure>',
            "two.xhtml": (
                '<figure><img src="second.png"/></figure>'
                '<figure><img src="third.png"/><figcaption>Segunda</figcaption></figure>'
                '<figure><figcaption>Terceira</figcaption></figure>'
            ),
        },
    )

    result = repair_displaced_figures(epub, donor_image_name="donor.png")

    assert result.repaired_chains == 1
    assert _figures(epub, "one.xhtml") == []
    assert _figures(epub, "two.xhtml") == [
        (["donor.png"], []),
        (["second.png"], ["Segunda"]),
        (["third.png"], ["Terceira"]),
    ]
