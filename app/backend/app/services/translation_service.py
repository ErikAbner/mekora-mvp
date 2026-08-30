"""
Pipeline de tradução textual — Fase B.

Fluxo: extract_blocks → chunk_blocks → translate_blocks → blocks_to_html
O HTML resultante é um artefato intermediário salvo antes da conversão via Calibre.
"""

from __future__ import annotations

import dataclasses
from pathlib import Path

from app.services.document_extractor_service import TextBlock, extract_blocks
from app.services.translation_engine import TranslatorEngine

_BLOCK_SEP = "\n\n---BLOCK_SEP---\n\n"


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_blocks(blocks: list[TextBlock], max_chars: int = 2000) -> list[list[TextBlock]]:
    """
    Agrupa blocos em chunks de no máximo *max_chars* caracteres combinados.

    Um bloco maior que *max_chars* vai sozinho — nunca é dividido.
    """
    if not blocks:
        return []

    chunks: list[list[TextBlock]] = []
    current: list[TextBlock] = []
    current_len = 0

    for block in blocks:
        block_len = len(block.text)
        if current and current_len + block_len > max_chars:
            chunks.append(current)
            current = []
            current_len = 0
        current.append(block)
        current_len += block_len

    if current:
        chunks.append(current)

    return chunks


# ---------------------------------------------------------------------------
# Tradução de blocos
# ---------------------------------------------------------------------------

def translate_blocks(
    blocks: list[TextBlock],
    engine: TranslatorEngine,
    source: str,
    target: str,
    progress_callback=None,
) -> list[TextBlock]:
    """
    Traduz uma lista de TextBlocks mantendo a estrutura (id, type, order, metadata).

    Envia cada chunk como uma única chamada ao motor usando o separador _BLOCK_SEP.
    Retorna novos objetos (blocos originais são imutáveis).
    progress_callback(stage, current, total, message) opcional (P4): chamado
    a cada chunk; exceções do callback propagam (ex.: cancelamento).
    """
    if not blocks:
        return []

    chunks = chunk_blocks(blocks)
    translated_blocks: list[TextBlock] = []

    for chunk_idx, chunk in enumerate(chunks):
        if progress_callback is not None:
            progress_callback(
                "translate", chunk_idx, len(chunks),
                f"Traduzindo bloco {chunk_idx + 1} de {len(chunks)}",
            )
        joined = _BLOCK_SEP.join(b.text for b in chunk)
        translated_joined = engine.translate(joined, source, target)
        parts = translated_joined.split(_BLOCK_SEP.strip())

        # Garante que o número de partes bate com o chunk mesmo se o motor
        # compactar/expandir o separador levemente
        if len(parts) != len(chunk):
            # Fallback: traduzir bloco a bloco
            parts = [engine.translate(b.text, source, target) for b in chunk]

        for block, translated_text in zip(chunk, parts):
            translated_blocks.append(
                dataclasses.replace(block, text=translated_text.strip())
            )

    return translated_blocks


# ---------------------------------------------------------------------------
# Reconstrução HTML
# ---------------------------------------------------------------------------

def blocks_to_html(blocks: list[TextBlock]) -> str:
    """
    Reconstrói um documento HTML a partir de uma lista de TextBlocks.

    Regras de mapeamento:
    - heading (level 1–3)  → <h1>/<h2>/<h3> (level >3 vira h3)
    - paragraph            → <p>
    - list_item            → blocos consecutivos agrupados em <ul><li>
    - quote                → <blockquote>
    - preformatted         → <pre>
    - unknown              → <p>
    """
    parts: list[str] = []
    i = 0

    while i < len(blocks):
        block = blocks[i]

        if block.type == "list_item":
            # Agrupar todos os list_items consecutivos em um único <ul>
            items: list[str] = []
            while i < len(blocks) and blocks[i].type == "list_item":
                items.append(f"  <li>{_escape(blocks[i].text)}</li>")
                i += 1
            parts.append("<ul>\n" + "\n".join(items) + "\n</ul>")
            continue

        if block.type == "heading":
            level = min(block.metadata.get("level", 1), 3)
            tag = f"h{level}"
            parts.append(f"<{tag}>{_escape(block.text)}</{tag}>")

        elif block.type == "paragraph":
            parts.append(f"<p>{_escape(block.text)}</p>")

        elif block.type == "quote":
            parts.append(f"<blockquote>{_escape(block.text)}</blockquote>")

        elif block.type == "preformatted":
            parts.append(f"<pre>{_escape(block.text)}</pre>")

        else:  # unknown
            parts.append(f"<p>{_escape(block.text)}</p>")

        i += 1

    body_content = "\n".join(parts)
    return (
        "<!DOCTYPE html>\n"
        "<html>\n"
        "<head><meta charset=\"utf-8\"></head>\n"
        "<body>\n"
        f"{body_content}\n"
        "</body>\n"
        "</html>\n"
    )


def _escape(text: str) -> str:
    """Escapa caracteres HTML básicos para uso dentro de tags."""
    return (
        text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


# ---------------------------------------------------------------------------
# Pipeline completo
# ---------------------------------------------------------------------------

def run_translation_pipeline(
    input_path: Path,
    input_format: str,
    source_language: str,
    target_language: str,
    engine: TranslatorEngine,
    output_html_path: Path,
    progress_callback=None,
) -> None:
    """
    Orquestra extração → tradução → reconstrução HTML → escrita em disco.

    output_html_path: caminho completo do arquivo HTML a ser gerado.
    """
    blocks = extract_blocks(input_path, input_format)
    translated = translate_blocks(
        blocks, engine, source_language, target_language,
        progress_callback=progress_callback,
    )
    html = blocks_to_html(translated)
    output_html_path.parent.mkdir(parents=True, exist_ok=True)
    output_html_path.write_text(html, encoding="utf-8")
