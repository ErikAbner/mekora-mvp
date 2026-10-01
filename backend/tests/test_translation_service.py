"""
Testes do pipeline de tradução textual — Fase B.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.services.document_extractor_service import TextBlock
from app.services.translation_service import (
    _BLOCK_SEP,
    blocks_to_html,
    chunk_blocks,
    run_translation_pipeline,
    translate_blocks,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _block(text: str, btype: str = "paragraph", order: int = 0, **meta) -> TextBlock:
    return TextBlock(id=f"id_{order}", type=btype, order=order, text=text, metadata=dict(meta))


# ---------------------------------------------------------------------------
# chunk_blocks
# ---------------------------------------------------------------------------

def test_chunk_blocks_empty() -> None:
    assert chunk_blocks([]) == []


def test_chunk_blocks_single_chunk() -> None:
    blocks = [_block("A", order=0), _block("B", order=1), _block("C", order=2)]
    chunks = chunk_blocks(blocks, max_chars=9999)
    assert len(chunks) == 1
    assert chunks[0] == blocks


def test_chunk_blocks_split_by_char_limit() -> None:
    # 3 blocos de 100 chars, limite de 200 → chunk1=[0,1] (100+100=200≤200), chunk2=[2]
    blocks = [_block("x" * 100, order=i) for i in range(3)]
    chunks = chunk_blocks(blocks, max_chars=200)
    assert len(chunks) == 2
    assert len(chunks[0]) == 2
    assert len(chunks[1]) == 1


def test_chunk_blocks_oversized_single_block() -> None:
    # Bloco maior que max_chars → vai sozinho
    big = _block("y" * 3000, order=0)
    small = _block("z" * 10, order=1)
    chunks = chunk_blocks([big, small], max_chars=2000)
    assert len(chunks) == 2
    assert chunks[0] == [big]
    assert chunks[1] == [small]


def test_chunk_blocks_preserves_order() -> None:
    blocks = [_block(str(i), order=i) for i in range(5)]
    chunks = chunk_blocks(blocks, max_chars=10)
    flattened = [b for chunk in chunks for b in chunk]
    assert [b.order for b in flattened] == list(range(5))


# ---------------------------------------------------------------------------
# translate_blocks
# ---------------------------------------------------------------------------

def test_translate_blocks_calls_engine() -> None:
    engine = MagicMock()
    engine.translate.return_value = "translated"
    blocks = [_block("Texto", order=0)]
    result = translate_blocks(blocks, engine, "por", "eng")
    assert engine.translate.called
    assert len(result) == 1
    assert result[0].text == "translated"


def test_translate_blocks_preserves_metadata() -> None:
    engine = MagicMock()
    engine.translate.return_value = "T"
    block = _block("Heading", btype="heading", order=0, level=2)
    result = translate_blocks([block], engine, "por", "eng")
    assert result[0].type == "heading"
    assert result[0].metadata["level"] == 2
    assert result[0].id == block.id


def test_translate_blocks_empty() -> None:
    engine = MagicMock()
    result = translate_blocks([], engine, "por", "eng")
    assert result == []
    engine.translate.assert_not_called()


def test_translate_blocks_multiple_chunks() -> None:
    # 2 blocos de 1500 chars → 2 chunks (max_chars=2000 padrão)
    engine = MagicMock()
    # O engine recebe 2 chamadas (uma por chunk)
    engine.translate.side_effect = lambda t, s, tg: t.replace("x", "y")

    blocks = [_block("x" * 1500, order=0), _block("x" * 1500, order=1)]
    result = translate_blocks(blocks, engine, "por", "eng")
    assert len(result) == 2
    assert engine.translate.call_count == 2


def test_translate_blocks_batches_and_reuses_checkpoint(tmp_path: Path) -> None:
    class BatchEngine:
        max_input_chars = 64
        model_name = "test"

        def __init__(self) -> None:
            self.calls = 0

        def translate(self, text: str, source: str, target: str) -> str:
            raise AssertionError("o caminho em lote deveria ser usado")

        def translate_many(self, texts: list[str], source: str, target: str) -> list[str]:
            self.calls += 1
            return [text.upper() for text in texts]

    blocks = [_block(("texto %d. " % i) * 8, order=i) for i in range(8)]
    checkpoint = tmp_path / "translation.json"
    first = BatchEngine()
    result = translate_blocks(blocks, first, "eng", "por", checkpoint_path=checkpoint)
    assert first.calls > 0
    assert all(block.text == block.text.upper() for block in result)

    second = BatchEngine()
    repeated = translate_blocks(blocks, second, "eng", "por", checkpoint_path=checkpoint)
    assert second.calls == 0
    assert [block.text for block in repeated] == [block.text for block in result]


# ---------------------------------------------------------------------------
# blocks_to_html
# ---------------------------------------------------------------------------

def test_blocks_to_html_heading() -> None:
    block = _block("Capítulo 1", btype="heading", order=0, level=1)
    html = blocks_to_html([block])
    assert "<h1>Capítulo 1</h1>" in html


def test_blocks_to_html_heading_clamp_to_h3() -> None:
    block = _block("Deep heading", btype="heading", order=0, level=5)
    html = blocks_to_html([block])
    assert "<h3>Deep heading</h3>" in html


def test_blocks_to_html_paragraph() -> None:
    block = _block("Parágrafo.", order=0)
    html = blocks_to_html([block])
    assert "<p>Parágrafo.</p>" in html


def test_blocks_to_html_list_grouping() -> None:
    blocks = [
        _block("Item 1", btype="list_item", order=0),
        _block("Item 2", btype="list_item", order=1),
    ]
    html = blocks_to_html(blocks)
    assert html.count("<ul>") == 1
    assert html.count("<li>") == 2


def test_blocks_to_html_list_not_merged_across_paragraph() -> None:
    blocks = [
        _block("Item A", btype="list_item", order=0),
        _block("Parágrafo", btype="paragraph", order=1),
        _block("Item B", btype="list_item", order=2),
    ]
    html = blocks_to_html(blocks)
    # Dois <ul> separados pois há um parágrafo no meio
    assert html.count("<ul>") == 2


def test_blocks_to_html_quote() -> None:
    block = _block("Citação", btype="quote", order=0)
    html = blocks_to_html([block])
    assert "<blockquote>Citação</blockquote>" in html


def test_blocks_to_html_preformatted() -> None:
    block = _block("código", btype="preformatted", order=0)
    html = blocks_to_html([block])
    assert "<pre>código</pre>" in html


def test_blocks_to_html_escapes_html_chars() -> None:
    block = _block("<script>alert('xss')</script>", order=0)
    html = blocks_to_html([block])
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


def test_blocks_to_html_has_charset_meta() -> None:
    html = blocks_to_html([_block("texto", order=0)])
    assert 'charset="utf-8"' in html


def test_blocks_to_html_empty() -> None:
    html = blocks_to_html([])
    assert "<body>" in html
    assert "</body>" in html


# ---------------------------------------------------------------------------
# run_translation_pipeline (end-to-end com engine mock)
# ---------------------------------------------------------------------------

def test_run_pipeline_creates_html_file(tmp_path: Path) -> None:
    input_file = tmp_path / "doc.txt"
    input_file.write_text("Olá\n\nMundo", encoding="utf-8")
    output_html = tmp_path / "translated.html"

    engine = MagicMock()
    # Motor passthrough: retorna o mesmo texto separado por sep
    def passthrough(text: str, src: str, tgt: str) -> str:
        return text  # retorna idêntico — blocos separados pelo sep

    engine.translate.side_effect = passthrough

    run_translation_pipeline(
        input_path=input_file,
        input_format="txt",
        source_language="por",
        target_language="eng",
        engine=engine,
        output_html_path=output_html,
    )

    assert output_html.exists()
    content = output_html.read_text(encoding="utf-8")
    assert "<p>" in content
    assert "Olá" in content or "Mundo" in content


def test_run_pipeline_creates_parent_dirs(tmp_path: Path) -> None:
    input_file = tmp_path / "doc.txt"
    input_file.write_text("Texto", encoding="utf-8")
    output_html = tmp_path / "deep" / "nested" / "out.html"

    engine = MagicMock()
    engine.translate.side_effect = lambda t, s, tg: t

    run_translation_pipeline(
        input_path=input_file,
        input_format="txt",
        source_language="por",
        target_language="eng",
        engine=engine,
        output_html_path=output_html,
    )
    assert output_html.exists()
