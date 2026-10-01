"""Reconstrói a semântica editorial perdida na extração geométrica de PDF.

O OCR devolve caixas; um EPUB precisa de parágrafos, títulos, listas, citações
e notas. Este módulo mantém essa decisão separada do reconhecimento das letras:
ele recebe evidências de layout já normalizadas e devolve blocos semânticos.
"""
from __future__ import annotations

import html
import re
import statistics
from dataclasses import dataclass, field, replace


@dataclass(frozen=True)
class InlineMark:
    start: int
    end: int
    kind: str  # emphasis | strong


@dataclass(frozen=True)
class SemanticBlock:
    text: str
    page: int
    region: int
    bbox: tuple[float, float, float, float]
    page_width: float
    page_height: float
    font_size: float
    line_height: float
    marks: tuple[InlineMark, ...] = ()
    kind: str = "paragraph"
    level: int = 0
    indent: float = 0.0
    confidence: float = 1.0
    anchor: str | None = None


_LIST = re.compile(r"^\s*(?:[•·▪◦‣⁃*-]|\(?\d{1,3}[.)]|[A-Za-z][.)])\s+")
_TERMINAL = re.compile(r"[.!?…][\"'”’)]*$")


def classify_blocks(blocks: list[SemanticBlock]) -> list[SemanticBlock]:
    """Classifica por evidências relativas à página, nunca por tamanho fixo."""
    if not blocks:
        return []
    sizes = [b.font_size for b in blocks if len(b.text) >= 35 and b.font_size > 0]
    body_size = statistics.median(sizes) if sizes else statistics.median(
        b.font_size for b in blocks if b.font_size > 0
    )

    by_region: dict[tuple[int, int], list[SemanticBlock]] = {}
    for block in blocks:
        by_region.setdefault((block.page, block.region), []).append(block)

    body_left: dict[tuple[int, int], float] = {}
    body_right: dict[tuple[int, int], float] = {}
    body_sizes: dict[tuple[int, int], float] = {}
    top_has_page_number: dict[tuple[int, int], bool] = {}
    for key, region_blocks in by_region.items():
        candidates = [
            b for b in region_blocks
            if len(b.text) >= 45 and .12 <= b.bbox[1] / b.page_height <= .82
        ] or region_blocks
        body_left[key] = statistics.median(b.bbox[0] for b in candidates)
        body_right[key] = statistics.median(b.bbox[2] for b in candidates)
        local_sizes = [b.font_size for b in candidates if b.font_size > 0]
        body_sizes[key] = statistics.median(local_sizes) if local_sizes else body_size
        top_has_page_number[key] = any(
            b.bbox[1] / b.page_height < .11 and re.search(r"\b\d{1,4}\b", b.text)
            for b in region_blocks
        )

    result: list[SemanticBlock] = []
    for block in blocks:
        text = block.text.strip()
        y0, y1 = block.bbox[1] / block.page_height, block.bbox[3] / block.page_height
        key = (block.page, block.region)
        left = body_left[key]
        right = body_right[key]
        indent = max(0.0, block.bbox[0] - left)
        right_inset = max(0.0, right - block.bbox[2])
        ratio = block.font_size / max(body_sizes[key], .1)
        short = len(text) <= 180
        uppercase = short and any(c.isalpha() for c in text) and text.upper() == text
        contains_page_number = bool(re.search(r"\b\d{1,4}\b", text))
        alpha = sum(char.isalpha() for char in text)
        visible = sum(not char.isspace() for char in text)
        low_noise = alpha >= 5 and alpha / max(visible, 1) >= .58
        approximate_lines = max(1.0, (block.bbox[3] - block.bbox[1]) / max(block.line_height, 1))
        marked = sum(mark.end - mark.start for mark in block.marks if mark.kind == "emphasis")
        emphasis_ratio = marked / max(len(text), 1)

        # Cabeçalho/rodapé corrido: posição extrema + corpo pequeno ou fórmula
        # editorial curta. Eles não pertencem ao fluxo do capítulo.
        if (y0 < .105 or y1 > .955) and short and (
            ratio <= .92 or (uppercase and contains_page_number) or top_has_page_number[key]
        ):
            kind, level = "running", 0
        # Nota: faixa inferior, corpo menor e texto editorial suficiente. O
        # marcador ajuda, mas não é obrigatório porque OCR erra ¹ como ! ou I.
        elif y0 >= .78 and ratio <= .86 and len(text) >= 12:
            kind, level = "note", 0
        elif _LIST.match(text):
            kind, level = "list_item", 0
        elif short and low_noise and approximate_lines <= 3.2 and ratio >= 1.55:
            kind, level = "heading", 1
        elif short and emphasis_ratio >= .55 and 1.05 <= ratio < 1.55:
            kind, level = "byline", 0
        elif short and low_noise and approximate_lines <= 3.2 and (
            ratio >= 1.28 or (uppercase and ratio >= 1.0 and y0 < .35)
        ):
            kind, level = "heading", 2
        elif indent >= max(18.0, block.page_width * .04) and right_inset >= max(12.0, block.page_width * .025):
            kind, level = "quote", 0
        else:
            kind, level = "paragraph", 0
        result.append(replace(block, kind=kind, level=level, indent=indent))
    # Itálico sozinho não significa autoria: subtítulos editoriais também o
    # usam. Uma autoria só é aceita logo após o título principal, próxima dele
    # e com aparência de nome; os demais voltam a subtítulo.
    normalized: list[SemanticBlock] = []
    for block in result:
        if block.kind == "byline":
            previous = next((item for item in reversed(normalized) if item.kind != "running"), None)
            words = re.findall(r"[A-Za-zÀ-ÿ]+", block.text)
            name_like = 2 <= len(words) <= 8 and sum(word[:1].isupper() for word in words) >= len(words) / 2
            close_to_title = bool(
                previous
                and previous.kind == "heading"
                and previous.level == 1
                and (previous.page, previous.region) == (block.page, block.region)
                and block.bbox[1] - previous.bbox[3] <= block.line_height * 6
            )
            if not (name_like and close_to_title):
                block = replace(block, kind="heading", level=2)
        normalized.append(block)
    return normalized


def _merge_text(left: str, right: str) -> tuple[str, int]:
    if left.endswith("-") and right[:1].islower():
        return left[:-1] + right, len(left) - 1
    return left.rstrip() + " " + right.lstrip(), len(left.rstrip()) + 1


def _should_continue(previous: SemanticBlock, current: SemanticBlock) -> bool:
    if previous.kind != "paragraph" or current.kind != "paragraph":
        return False
    same_region = (previous.page, previous.region) == (current.page, current.region)
    next_printed_page = (
        current.page > previous.page
        or (current.page == previous.page and current.region > previous.region)
    )
    if same_region:
        gap = current.bbox[1] - previous.bbox[3]
        spatially_close = gap <= max(previous.line_height, current.line_height) * 1.8
    elif next_printed_page:
        spatially_close = previous.bbox[3] / previous.page_height >= .68 and current.bbox[1] / current.page_height <= .28
    else:
        return False

    explicit_word_break = previous.text.rstrip().endswith("-") and current.text[:1].islower()
    grammatical_flow = not _TERMINAL.search(previous.text.rstrip()) and current.text[:1].islower()
    no_new_paragraph_indent = current.indent < max(12.0, current.page_width * .025)
    return spatially_close and (explicit_word_break or (grammatical_flow and no_new_paragraph_indent))


def merge_continuations(blocks: list[SemanticBlock]) -> list[SemanticBlock]:
    """Une apenas arestas sustentadas por geometria e continuidade linguística."""
    output: list[SemanticBlock] = []
    last_flow_index: int | None = None
    for block in blocks:
        if block.kind == "running":
            continue
        if (
            block.kind == "paragraph"
            and last_flow_index is not None
            and _should_continue(output[last_flow_index], block)
        ):
            previous = output[last_flow_index]
            text, offset = _merge_text(previous.text, block.text)
            shifted = tuple(
                InlineMark(mark.start + offset, mark.end + offset, mark.kind)
                for mark in block.marks
            )
            output[last_flow_index] = replace(
                previous,
                text=text,
                marks=previous.marks + shifted,
                bbox=(previous.bbox[0], previous.bbox[1], block.bbox[2], block.bbox[3]),
            )
        else:
            if block.kind not in {"note", "caption"}:
                last_flow_index = len(output) if block.kind == "paragraph" else None
            output.append(block)

    # Linhas sucessivas de um mesmo título podem ter sido caixas distintas no
    # OCR. Une-as depois da continuidade da prosa, sem atravessar outro papel.
    headings: list[SemanticBlock] = []
    for block in output:
        if headings and block.kind == "heading" and headings[-1].kind == "heading":
            previous = headings[-1]
            same_place = (previous.page, previous.region) == (block.page, block.region)
            gap = block.bbox[1] - previous.bbox[3]
            similar = abs(previous.font_size - block.font_size) <= max(previous.font_size, block.font_size) * .22
            if same_place and gap <= max(previous.line_height, block.line_height) * 2.2 and similar:
                text, offset = _merge_text(previous.text, block.text)
                headings[-1] = replace(
                    previous,
                    text=text,
                    level=min(previous.level or 2, block.level or 2),
                    marks=previous.marks + tuple(
                        InlineMark(mark.start + offset, mark.end + offset, mark.kind)
                        for mark in block.marks
                    ),
                    bbox=(previous.bbox[0], previous.bbox[1], block.bbox[2], block.bbox[3]),
                )
                continue
        headings.append(block)
    return headings


def render_inline(block: SemanticBlock) -> str:
    if not block.marks:
        return html.escape(block.text)
    boundaries = {0, len(block.text)}
    for mark in block.marks:
        boundaries.update((max(0, mark.start), min(len(block.text), mark.end)))
    points = sorted(boundaries)
    pieces: list[str] = []
    for start, end in zip(points, points[1:]):
        value = html.escape(block.text[start:end])
        active = {m.kind for m in block.marks if m.start <= start and m.end >= end}
        if "emphasis" in active:
            value = f"<em>{value}</em>"
        if "strong" in active:
            value = f"<strong>{value}</strong>"
        pieces.append(value)
    return "".join(pieces)


def render_blocks(blocks: list[SemanticBlock]) -> str:
    """Emite XHTML semântico; listas consecutivas formam uma única lista."""
    parts: list[str] = []
    index = 0
    while index < len(blocks):
        block = blocks[index]
        content = render_inline(block)
        anchor = f' id="{html.escape(block.anchor)}"' if block.anchor else ""
        if block.kind == "list_item":
            items: list[str] = []
            while index < len(blocks) and blocks[index].kind == "list_item":
                item = blocks[index]
                clean = _LIST.sub("", item.text, count=1)
                items.append(f"<li>{html.escape(clean)}</li>")
                index += 1
            parts.append("<ul>" + "".join(items) + "</ul>")
            continue
        if block.kind == "heading":
            tag = f"h{min(max(block.level, 1), 3)}"
        elif block.kind == "quote":
            tag = "blockquote"
        elif block.kind == "caption":
            tag = "figcaption"
        elif block.kind == "note":
            tag = "aside"
            anchor = anchor or f' id="nota-fonte-{block.page}-{block.region}-{index}"'
            parts.append(f'<aside epub:type="footnote"{anchor}>{content}</aside>')
            index += 1
            continue
        elif block.kind == "byline":
            parts.append(f'<p epub:type="contributors" class="byline"{anchor}>{content}</p>')
            index += 1
            continue
        else:
            tag = "p"
        parts.append(f"<{tag}{anchor}>{content}</{tag}>")
        index += 1
    return "\n".join(parts)
