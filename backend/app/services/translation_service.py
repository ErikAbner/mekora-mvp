"""
Pipeline de tradução textual — Fase B.

Fluxo: extract_blocks → chunk_blocks → translate_blocks → blocks_to_html
O HTML resultante é um artefato intermediário salvo antes da conversão via Calibre.
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
from pathlib import Path

from app.services.document_extractor_service import TextBlock, extract_blocks
from app.services.translation_engine import TranslatorEngine, teto_de_entrada

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

def partir_texto(texto: str, teto: int) -> list[str]:
    """Divide *texto* em pedaços de até *teto* caracteres, sem perder nada.

    Corta na fronteira mais respeitosa que couber: fim de frase, senão espaço,
    senão no limite bruto — que só acontece com uma "palavra" maior que o teto,
    e aí não há fronteira nenhuma a respeitar.

    ISTO EXISTE PORQUE O CORTE ACONTECIA DE QUALQUER JEITO, e sem devolver o
    resto: o motor recebia o bloco inteiro e truncava em silêncio.
    """
    if teto <= 0 or len(texto) <= teto:
        return [texto]
    partes: list[str] = []
    resto = texto
    while len(resto) > teto:
        janela = resto[:teto]
        corte = -1
        for marca in (". ", "! ", "? ", "\n"):
            corte = max(corte, janela.rfind(marca) + len(marca))
        if corte <= 0:
            corte = janela.rfind(" ") + 1
        if corte <= 0:
            corte = teto
        partes.append(resto[:corte])
        resto = resto[corte:]
    if resto:
        partes.append(resto)
    return partes


def translate_blocks(
    blocks: list[TextBlock],
    engine: TranslatorEngine,
    source: str,
    target: str,
    progress_callback=None,
    checkpoint_path: Path | None = None,
) -> list[TextBlock]:
    """
    Traduz uma lista de TextBlocks mantendo a estrutura (id, type, order, metadata).

    Envia cada chunk como uma única chamada ao motor usando o separador _BLOCK_SEP.
    Retorna novos objetos (blocos originais são imutáveis).
    progress_callback(stage, current, total, message) opcional (P4): chamado
    a cada chunk; exceções do callback propagam (ex.: cancelamento).

    O TETO É DO MOTOR, e não deste arquivo. Antes de 08/09 o agrupamento usava
    2000 caracteres para qualquer motor, e o NLLB — que roda com
    `max_length=512, truncation=True` — devolvia o bloco cortado sem dizer.
    Medido: um parágrafo de 5.840 caracteres voltava com 37% do texto.

    Um bloco maior que o teto é PARTIDO e recomposto, e não entregue inteiro
    para ser truncado: a saída tem os mesmos blocos da entrada, na mesma ordem,
    com a mesma estrutura.
    """
    if not blocks:
        return []

    teto = teto_de_entrada(engine)

    # Parte os blocos grandes, guardando de qual bloco cada pedaço veio.
    pedacos: list[TextBlock] = []
    origem: list[int] = []
    for indice, bloco in enumerate(blocks):
        for parte in partir_texto(bloco.text, teto):
            pedacos.append(dataclasses.replace(bloco, text=parte))
            origem.append(indice)

    chunks = chunk_blocks(pedacos, max_chars=teto)
    translated_blocks: list[TextBlock] = []
    joined_chunks = [_BLOCK_SEP.join(b.text for b in chunk) for chunk in chunks]
    identity = ":".join((
        type(engine).__name__,
        str(getattr(engine, "model_name", "")),
        str(getattr(engine, "model_dir", "")),
        source,
        target,
    ))
    cache: dict[str, str] = {}
    if checkpoint_path is not None:
        try:
            raw = json.loads(checkpoint_path.read_text(encoding="utf-8"))
            if raw.get("identity") == identity and isinstance(raw.get("translations"), dict):
                cache = raw["translations"]
        except Exception:
            cache = {}

    def key_for(text: str) -> str:
        return hashlib.sha256((identity + "\0" + text).encode("utf-8")).hexdigest()

    def save_checkpoint() -> None:
        if checkpoint_path is None:
            return
        checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = checkpoint_path.with_suffix(checkpoint_path.suffix + ".tmp")
        temporary.write_text(
            json.dumps({"identity": identity, "translations": cache}, ensure_ascii=False),
            encoding="utf-8",
        )
        temporary.replace(checkpoint_path)

    translated_joined_chunks: list[str | None] = [cache.get(key_for(text)) for text in joined_chunks]
    missing = [index for index, value in enumerate(translated_joined_chunks) if value is None]
    supports_batch = callable(getattr(type(engine), "translate_many", None))
    batch_size = 4 if supports_batch else 1
    for start in range(0, len(missing), batch_size):
        indices = missing[start:start + batch_size]
        if progress_callback is not None and indices:
            progress_callback(
                "translate", indices[0], len(chunks),
                f"Traduzindo bloco {indices[0] + 1} de {len(chunks)}",
            )
        texts = [joined_chunks[index] for index in indices]
        if supports_batch:
            results = engine.translate_many(texts, source, target)  # type: ignore[attr-defined]
            if len(results) != len(texts):
                results = [engine.translate(text, source, target) for text in texts]
        else:
            results = [engine.translate(text, source, target) for text in texts]
        for index, translated in zip(indices, results):
            translated_joined_chunks[index] = translated
            cache[key_for(joined_chunks[index])] = translated
        save_checkpoint()

    for chunk, translated_value in zip(chunks, translated_joined_chunks):
        translated_joined = translated_value or ""
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

    # Recompõe os pedaços de volta nos blocos de origem. Sem isto, um parágrafo
    # partido chegaria à saída como vários parágrafos — a perda de texto viraria
    # uma mudança de estrutura, que é outro defeito com a mesma causa.
    reunidos: list[TextBlock] = []
    for indice, bloco in enumerate(blocks):
        partes = [t.text for t, i in zip(translated_blocks, origem) if i == indice]
        reunidos.append(dataclasses.replace(bloco, text=" ".join(p for p in partes if p)))
    return reunidos


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
        checkpoint_path=output_html_path.with_suffix(".translation-checkpoint.json"),
    )
    html = blocks_to_html(translated)
    output_html_path.parent.mkdir(parents=True, exist_ok=True)
    output_html_path.write_text(html, encoding="utf-8")
