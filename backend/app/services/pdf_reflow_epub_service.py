"""Converte PDFs com camada textual em EPUB de leitura adaptável.

PDFs vindos de digitalizações costumam guardar duas coisas na mesma página:
uma fotografia e uma camada de OCR invisível. Transformar todas as páginas em
JPEG preserva a aparência, mas elimina seleção, busca, ajuste de fonte e
acessibilidade. Aqui a camada textual vira o conteúdo principal. Páginas sem
texto suficiente (capa, ilustração, separador) continuam como imagem.
"""
from __future__ import annotations

import re
import statistics
import uuid
from pathlib import Path
from typing import Callable, Optional

import fitz
from ebooklib import epub
from spellchecker import SpellChecker
from wordfreq import zipf_frequency

from app.services.convert_service import ConversionCancelled, ConversionFailedError
from app.services.pdf_semantics_service import (
    InlineMark,
    SemanticBlock,
    classify_blocks,
    link_explicit_notes,
    merge_continuations,
    render_blocks,
)


def _reading_regions(page: fitz.Page) -> list[fitz.Rect]:
    """Devolve a ordem física de leitura da página.

    Digitalizações de livros frequentemente guardam duas páginas impressas em
    uma única página PDF horizontal. O ``sort=True`` do PyMuPDF ordena por Y e
    intercala as linhas das duas metades. Quando há texto suficiente dos dois
    lados e pouco texto atravessando o vinco central, lemos primeiro a página
    esquerda inteira e depois a direita inteira.
    """
    rect = page.rect
    if rect.width <= rect.height * 1.15:
        return [rect]

    words = page.get_text("words")
    if len(words) < 40:
        return [rect]
    center = rect.x0 + rect.width / 2
    gutter = max(8.0, rect.width * 0.012)
    left = sum(1 for word in words if word[2] < center - gutter)
    right = sum(1 for word in words if word[0] > center + gutter)
    crossing = len(words) - left - right
    if min(left, right) < 20 or crossing > len(words) * 0.08:
        return [rect]

    return [
        fitz.Rect(rect.x0, rect.y0, center, rect.y1),
        fitz.Rect(center, rect.y0, rect.x1, rect.y1),
    ]


_TOKEN = re.compile(r"^([^\wÀ-ÿ]*)([\wÀ-ÿ'’\-]+)([^\wÀ-ÿ]*)$", re.UNICODE)
_PORTUGUESE_SPELLER: SpellChecker | None = None


def _word_core(value: str) -> tuple[str, str, str]:
    match = _TOKEN.match(value.strip())
    if match:
        return match.group(1), match.group(2), match.group(3)
    # OCR pode colar dois fragmentos com pontuação no meio (``cspmto;á``).
    # O maior trecho alfabético ainda pode ser comparado com a outra camada.
    candidates = list(re.finditer(r"[A-Za-zÀ-ÿ]+(?:[-'’][A-Za-zÀ-ÿ]+)*", value))
    if not candidates:
        return "", value, ""
    core = max(candidates, key=lambda item: len(item.group(0)))
    prefix = re.sub(r"[\wÀ-ÿ]+", "", value[:core.start()])
    suffix = re.sub(r"[\wÀ-ÿ]+", "", value[core.end():])
    return prefix, core.group(0), suffix


def _obvious_corruption(value: str) -> bool:
    """Sinais conservadores de ruído, sem tentar 'corrigir' nomes próprios."""
    core = _word_core(value)[1]
    return (
        any(char.isdigit() for char in core) and any(char.isalpha() for char in core)
    ) or any(char in core for char in "|~<>[]{}_")


def _prefer_fallback_word(ocr_word: str, fallback_word: str, language: str) -> str:
    """Escolhe entre OCR novo e camada antiga apenas com evidência forte.

    A camada textual original de uma digitalização pode acertar uma palavra que
    o OCR novo errou, e vice-versa. Frequência lexical é usada somente como
    desempate forte; tokens raros, nomes, números e citações permanecem no OCR.
    """
    prefix, ocr_core, suffix = _word_core(ocr_word)
    fallback_prefix, fallback_core, fallback_suffix = _word_core(fallback_word)
    def decorated(core: str) -> str:
        # Se a leitura escolhida perdeu apenas a pontuação que delimita a
        # palavra/frase, a camada alternativa pode devolvê-la. Pontuação que já
        # existe na leitura principal continua soberana.
        return f"{prefix or fallback_prefix}{core}{suffix or fallback_suffix}"
    if not ocr_core or not fallback_core:
        return ocr_word
    if ocr_core == fallback_core:
        return decorated(ocr_core)
    # Camadas antigas frequentemente colam uma sigla à palavra anterior
    # (``governoJK``). A caixa combinada cobre as duas palavras do OCR visual;
    # sem esta guarda, ``JK`` era substituído por ``governo`` e o leitor via
    # "governo governo". Palavra curta só aceita alternativa de tamanho
    # compatível.
    if min(len(ocr_core), len(fallback_core)) <= 3 and abs(len(ocr_core) - len(fallback_core)) > 1:
        return ocr_word
    if (
        ocr_core.isupper()
        and fallback_core.isupper()
        and len(fallback_core) == len(ocr_core) + 1
        and ocr_core in fallback_core
    ):
        return decorated(fallback_core)
    if not all(char.isalpha() or char in "-'’" for char in ocr_core + fallback_core):
        if _obvious_corruption(ocr_core) and not _obvious_corruption(fallback_core):
            return decorated(fallback_core)
        return ocr_word

    lang = "pt" if (language or "").lower().startswith("por") else (language or "pt")[:2]
    ocr_score = zipf_frequency(ocr_core.lower(), lang)
    fallback_score = zipf_frequency(fallback_core.lower(), lang)
    strong_improvement = fallback_score >= 2.5 and fallback_score - ocr_score >= 1.25
    if strong_improvement or (
        _obvious_corruption(ocr_core) and not _obvious_corruption(fallback_core)
    ):
        return decorated(fallback_core)
    return ocr_word


def _edit_distance(first: str, second: str) -> int:
    previous = list(range(len(second) + 1))
    for row, left in enumerate(first, start=1):
        current = [row]
        for column, right in enumerate(second, start=1):
            current.append(min(
                current[-1] + 1,
                previous[column] + 1,
                previous[column - 1] + (left != right),
            ))
        previous = current
    return previous[-1]


def _conservative_spelling(value: str, language: str) -> str:
    """Repara somente palavras minúsculas, longas e muito próximas do léxico."""
    global _PORTUGUESE_SPELLER
    prefix, core, suffix = _word_core(value)
    if (
        not (language or "").lower().startswith("por")
        or not core.islower()
        or len(core) < 7
        or zipf_frequency(core, "pt") >= 2.0
    ):
        return value
    if _PORTUGUESE_SPELLER is None:
        _PORTUGUESE_SPELLER = SpellChecker(language="pt")
    candidate = _PORTUGUESE_SPELLER.correction(core)
    if not candidate:
        return value
    distance = _edit_distance(core, candidate)
    if distance <= max(1, len(core) // 6) and zipf_frequency(candidate, "pt") >= 3.0:
        return f"{prefix}{candidate}{suffix}"
    return value


def _overlap_ratio(first: tuple, second: tuple) -> float:
    left = max(first[0], second[0])
    top = max(first[1], second[1])
    right = min(first[2], second[2])
    bottom = min(first[3], second[3])
    intersection = max(0.0, right - left) * max(0.0, bottom - top)
    first_area = max(1.0, (first[2] - first[0]) * (first[3] - first[1]))
    second_area = max(1.0, (second[2] - second[0]) * (second[3] - second[1]))
    return intersection / min(first_area, second_area)


def _join_wrapped_hyphens(text: str, language: str) -> str:
    lang = "pt" if (language or "").lower().startswith("por") else (language or "pt")[:2]

    def join(match: re.Match[str]) -> str:
        left, right = match.group(1), match.group(2)
        joined = left + right
        # Remove o hífen somente quando o vocabulário dá evidência de que ele
        # foi criado pela quebra de linha. Caso contrário preserva o composto,
        # mas elimina o espaço artificial depois do hífen.
        if zipf_frequency(joined.lower(), lang) >= 2.4:
            return joined
        return f"{left}-{right}"

    return re.sub(r"\b([A-Za-zÀ-ÿ]{2,})-\s*\n\s*([A-Za-zÀ-ÿ]{2,})\b", join, text)


def _visual_ocr_words(page: fitz.Page, region: fitz.Rect, language: str) -> list[tuple]:
    """Reconhece uma página impressa por vez, em vez do spread inteiro.

    OCRmyPDF precisa criar um PDF pesquisável genérico e por isso segmenta a
    folha horizontal inteira. Para o EPUB sabemos que cada metade é uma página
    impressa: recortar antes do Tesseract evita mistura de colunas e melhora
    sensivelmente o texto de digitalizações antigas.
    """
    from PIL import Image, ImageFilter, ImageOps
    import pytesseract
    from pytesseract import Output

    lang = "por" if (language or "").lower().startswith("por") else language or "por"

    def recognize(dpi: int, psm: int) -> list[tuple]:
        scale = dpi / 72
        pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=region, alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples).convert("L")
        # O filtro mediano remove vazamento da impressão do verso sem realçar o
        # papel, ao contrário do SHARPEN usado na primeira versão.
        image = ImageOps.autocontrast(image, cutoff=2).filter(ImageFilter.MedianFilter(3))
        data = pytesseract.image_to_data(
            image, lang=lang, config=f"--psm {psm}", output_type=Output.DICT,
        )
        found: list[tuple] = []
        for index, value in enumerate(data["text"]):
            value = value.strip()
            if not value or float(data["conf"][index]) < 0:
                continue
            x = region.x0 + data["left"][index] / scale
            y = region.y0 + data["top"][index] / scale
            width = data["width"][index] / scale
            height = data["height"][index] / scale
            block = int(data["block_num"][index]) * 1000 + int(data["par_num"][index])
            line = int(data["line_num"][index])
            word_number = int(data["word_num"][index])
            found.append((
                x, y, x + width, y + height, value, block, line, word_number,
                float(data["conf"][index]),
            ))
        return found

    # PSM 4 em 400 dpi preserva melhor os parágrafos e cabeçalhos. Uma segunda
    # leitura PSM 6 em 600 dpi enxerga melhor palavras cobertas por sublinhados
    # e marcas; ela só substitui uma palavra da estrutura primária quando o
    # léxico oferece evidência forte. Assim ganhamos fidelidade sem transformar
    # margens e ruído em parágrafos.
    words = recognize(400, 4)
    detailed = recognize(600, 6)
    fused: list[tuple] = []
    for word in words:
        value = str(word[4])
        matches = [
            (_overlap_ratio(word, candidate), candidate)
            for candidate in detailed
            if _overlap_ratio(word, candidate) >= .45
        ]
        if matches:
            center = (word[0] + word[2]) / 2
            # Sublinhados podem fazer a caixa do Tesseract engolir a palavra
            # vizinha. Quando duas caixas cobrem a palavra inteira (empate de
            # sobreposição), o centro horizontal mantém cada alternativa com
            # a sua palavra e evita duplicações.
            candidate = min(
                matches,
                key=lambda item: abs(center - (item[1][0] + item[1][2]) / 2),
            )[1]
            alternative = str(candidate[4])
            preferred = _prefer_fallback_word(value, alternative, language)
            if preferred == value and candidate[8] >= word[8] + 10:
                _, current_core, _ = _word_core(value)
                prefix, alternative_core, suffix = _word_core(alternative)
                lang_code = "pt" if (language or "").lower().startswith("por") else (language or "pt")[:2]
                # O segundo passe só ganha por confiança quando também forma
                # uma palavra plausível. Isso repara ``concmador`` →
                # ``conciliador`` e ``ufàmsra`` → ``ufanista`` sem usar uma
                # tabela específica do livro.
                if (
                    current_core and alternative_core
                    and zipf_frequency(alternative_core.lower(), lang_code) >= 1.8
                    and zipf_frequency(alternative_core.lower(), lang_code)
                        >= zipf_frequency(current_core.lower(), lang_code) + .8
                ):
                    preferred = f"{prefix}{alternative_core}{suffix}"
            if preferred == value:
                _, current_core, _ = _word_core(value)
                prefix, alternative_core, suffix = _word_core(alternative)
                # Duas leituras independentes concordam quase por inteiro,
                # mas a palavra é rara demais para o dicionário de frequência
                # (``capitulacionista`` é um caso real). Para palavras comuns
                # minúsculas e longas, a variante de alta resolução pode
                # vencer por proximidade mesmo sem frequência conhecida. Nomes
                # próprios ficam fora desta regra.
                if (
                    len(current_core) >= 7
                    and current_core.islower()
                    and alternative_core.islower()
                    and candidate[8] >= word[8] - 3
                    and _edit_distance(current_core, alternative_core)
                        <= max(2, len(alternative_core) // 3)
                ):
                    preferred = f"{prefix}{alternative_core}{suffix}"
            value = preferred
        fused.append((*word[:4], value, *word[5:]))
    return fused


def _paragraphs(
    page: fitz.Page,
    fallback_page: fitz.Page | None = None,
    language: str = "por",
    visual_ocr: bool = False,
) -> list[str]:
    paragraphs: list[str] = []
    for region in _reading_regions(page):
        words = (
            _visual_ocr_words(page, region, language)
            if visual_ocr
            else page.get_text("words", sort=True, clip=region)
        )
        fallback_words = (
            fallback_page.get_text("words", sort=True, clip=region)
            if fallback_page is not None
            else []
        )
        grouped: dict[int, dict[int, list[str]]] = {}
        for word in words:
            value = str(word[4]).replace("\u00ad", "").replace("\x00", "")
            if fallback_words:
                matches = sorted(
                    (
                        (_overlap_ratio(word, candidate), candidate)
                        for candidate in fallback_words
                        if _overlap_ratio(word, candidate) >= 0.62
                    ),
                    key=lambda item: item[0],
                    reverse=True,
                )
                if matches:
                    value = _prefer_fallback_word(value, str(matches[0][1][4]), language)
            value = _conservative_spelling(value, language)
            grouped.setdefault(int(word[5]), {}).setdefault(int(word[6]), []).append(value)

        for block in grouped.values():
            text = "\n".join(" ".join(line) for line in block.values())
            text = _join_wrapped_hyphens(text, language)
            text = re.sub(r"[ \t]+", " ", text).strip()
            if text:
                paragraphs.append(text)
    return paragraphs


def _fallback_style_spans(page: fitz.Page, region: fitz.Rect) -> list[tuple]:
    spans: list[tuple] = []
    for block in page.get_text("dict", clip=region).get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if span.get("text", "").strip():
                    spans.append((*span["bbox"], int(span.get("flags", 0)), float(span.get("size", 0))))
    return spans


def _semantic_blocks_for_page(
    page: fitz.Page,
    page_index: int,
    fallback_page: fitz.Page | None,
    secondary_fallback_page: fitz.Page | None,
    language: str,
    visual_ocr: bool,
) -> list[SemanticBlock]:
    raw: list[SemanticBlock] = []
    for region_index, region in enumerate(_reading_regions(page)):
        words = (
            _visual_ocr_words(page, region, language)
            if visual_ocr
            else page.get_text("words", sort=True, clip=region)
        )
        fallback_word_sets: list[list[tuple]] = []
        for alternative in (fallback_page, secondary_fallback_page):
            if alternative is not None:
                fallback_word_sets.append(alternative.get_text("words", sort=True, clip=region))
        style_source = secondary_fallback_page or fallback_page
        style_spans = _fallback_style_spans(style_source, region) if style_source else []
        grouped: dict[int, dict[int, list[tuple[str, tuple, int, float]]]] = {}
        for word in words:
            value = str(word[4]).replace("\u00ad", "").replace("\x00", "")
            flags = 0
            font_size = max(1.0, float(word[3] - word[1]))
            match = None
            if fallback_word_sets:
                # Uma candidata por camada. Misturar todas em uma única lista
                # fazia uma palavra larga tocar duas vizinhas e ser "reparada"
                # pela vizinha errada (``espírito`` podia virar ``já``).
                for fallback_words in fallback_word_sets:
                    candidates = [
                        (_overlap_ratio(word, candidate), candidate)
                        for candidate in fallback_words
                        if _overlap_ratio(word, candidate) >= .45
                    ]
                    if not candidates:
                        continue
                    word_center = (word[0] + word[2]) / 2
                    candidate = min(
                        candidates,
                        key=lambda item: abs(
                            word_center - (item[1][0] + item[1][2]) / 2
                        ),
                    )[1]
                    if match is None:
                        match = candidate
                    value = _prefer_fallback_word(value, str(candidate[4]), language)
            value = _conservative_spelling(value, language)
            style_target = match or word
            styles = [
                (_overlap_ratio(style_target, span), span)
                for span in style_spans
                if _overlap_ratio(style_target, span) >= .45
            ]
            if styles:
                span = max(styles, key=lambda item: item[0])[1]
                flags, font_size = int(span[4]), float(span[5])
            grouped.setdefault(int(word[5]), {}).setdefault(int(word[6]), []).append(
                (value, tuple(float(v) for v in word[:4]), flags, font_size)
            )

        for block in grouped.values():
            flat = [entry for line in block.values() for entry in line]
            if not flat:
                continue
            lines = [" ".join(entry[0] for entry in line) for line in block.values()]
            text = _join_wrapped_hyphens("\n".join(lines), language)
            text = re.sub(r"[ \t]+", " ", text).strip()
            if not text:
                continue
            marks: list[InlineMark] = []
            cursor = 0
            for value, _, flags, _ in flat:
                start = text.find(value, cursor)
                if start < 0:
                    continue
                end = start + len(value)
                if flags & 2:
                    marks.append(InlineMark(start, end, "emphasis"))
                if flags & 16:
                    marks.append(InlineMark(start, end, "strong"))
                cursor = end
            bbox = (
                min(entry[1][0] for entry in flat),
                min(entry[1][1] for entry in flat),
                max(entry[1][2] for entry in flat),
                max(entry[1][3] for entry in flat),
            )
            sizes = [entry[3] for entry in flat if entry[3] > 0]
            line_heights = [entry[1][3] - entry[1][1] for entry in flat]
            raw.append(SemanticBlock(
                text=text,
                page=page_index,
                region=region_index,
                bbox=bbox,
                page_width=region.width,
                page_height=region.height,
                font_size=statistics.median(sizes) if sizes else statistics.median(line_heights),
                line_height=statistics.median(line_heights),
                marks=tuple(marks),
            ))
    return raw


def _escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def convert_pdf_to_reflow_epub(
    input_path: Path,
    output_epub: Path,
    title: str,
    author: str,
    language: str,
    cover: Optional[Path] = None,
    fallback_text_path: Optional[Path] = None,
    visual_ocr: bool = False,
    deve_parar: Optional[Callable[[], bool]] = None,
    progresso: Optional[Callable[[int, int], None]] = None,
) -> None:
    """Cria um EPUB refluível e conserva como imagem apenas páginas visuais."""
    output_epub.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_epub.with_suffix(".epub.part")
    temporary.unlink(missing_ok=True)
    document: fitz.Document | None = None
    fallback_document: fitz.Document | None = None
    try:
        document = fitz.open(input_path)
        if fallback_text_path and fallback_text_path.exists() and fallback_text_path != input_path:
            fallback_document = fitz.open(fallback_text_path)
        book = epub.EpubBook()
        book.set_identifier(str(uuid.uuid4()))
        book.set_title(title)
        book.set_language(language or "por")
        book.add_author(author)
        if cover and cover.exists():
            book.set_cover(f"cover{cover.suffix.lower() or '.jpg'}", cover.read_bytes())

        style = epub.EpubItem(
            uid="reading-style",
            file_name="styles/reading.css",
            media_type="text/css",
            content=(
                "body{font-family:serif;line-height:1.55;margin:5%;}"
                "p{margin:0 0 1em;}h1{font-size:1.7em;margin:1.8em 0 .8em;}"
                "h2{font-size:1.3em;margin:1.5em 0 .7em;}h3{font-size:1.15em;margin:1.3em 0 .6em;}"
                "blockquote{border-left:1px solid;padding-left:1.2em;margin:1.4em 0;}"
                "aside[epub\\:type='footnote']{border-top:1px solid;margin:2em 0 0;padding:1em 0;font-size:.86em;}"
                "figcaption{font-size:.86em;color:#555;margin:.5em 0 1.5em;}"
                "figure{margin:0;text-align:center;}img{max-width:100%;height:auto;}"
                ".pagina{color:#666;font-size:.8em;}"
            ).encode("utf-8"),
        )
        book.add_item(style)

        chapters: list[epub.EpubHtml] = []
        total = document.page_count
        raw_blocks: list[SemanticBlock] = []
        visual_pages: set[int] = set()
        for index, page in enumerate(document):
            if deve_parar and deve_parar():
                raise ConversionCancelled()
            fallback_page = (
                fallback_document[index]
                if fallback_document is not None and index < fallback_document.page_count
                else None
            )
            # Quando o OCRmyPDF foi aplicado, ``document`` contém a camada de
            # texto reparada e ``fallback_document`` é o PDF original. Para a
            # leitura visual devemos reconhecer os pixels ORIGINAIS: a etapa de
            # OCR pode recomprimir/normalizar a imagem e o segundo OCR acabava
            # ampliando os seus artefatos. A camada do OCRmyPDF continua sendo
            # a fonte alternativa palavra a palavra.
            visual_page = fallback_page if visual_ocr and fallback_page is not None else page
            text_fallback = page if visual_page is not page else fallback_page
            page_blocks = _semantic_blocks_for_page(
                visual_page,
                page_index=index,
                fallback_page=text_fallback,
                secondary_fallback_page=(visual_page if visual_ocr else None),
                language=language,
                visual_ocr=visual_ocr,
            )
            if len(" ".join(block.text for block in page_blocks)) < 120:
                visual_pages.add(index)
            else:
                raw_blocks.extend(page_blocks)
            if progresso:
                progresso(index + 1, total)

        semantic = link_explicit_notes(merge_continuations(classify_blocks(raw_blocks)))
        sections: list[tuple[str, object]] = []
        current: list[SemanticBlock] = []
        pending_visual = iter(sorted(visual_pages))
        next_visual = next(pending_visual, None)

        def flush_semantic() -> None:
            nonlocal current
            if current:
                sections.append(("semantic", current))
                current = []

        for block in semantic:
            while next_visual is not None and next_visual < block.page:
                flush_semantic()
                sections.append(("visual", next_visual))
                next_visual = next(pending_visual, None)
            if block.kind == "heading" and block.level == 1 and current:
                flush_semantic()
            current.append(block)
        flush_semantic()
        while next_visual is not None:
            sections.append(("visual", next_visual))
            next_visual = next(pending_visual, None)

        for section_index, (section_type, payload) in enumerate(sections, start=1):
            if section_type == "visual":
                page_index = int(payload)
                page = document[page_index]
                pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
                image_name = f"images/page-{page_index + 1:04d}.jpg"
                image = epub.EpubItem(
                    uid=f"visual-page-{page_index + 1}",
                    file_name=image_name,
                    media_type="image/jpeg",
                    content=pixmap.tobytes("jpeg", jpg_quality=92),
                )
                book.add_item(image)
                body = f'<figure><img src="{image_name}" alt="Página visual {page_index + 1}"/></figure>'
                chapter_title = f"Página {page_index + 1}"
            else:
                blocks = payload
                assert isinstance(blocks, list)
                body = render_blocks(blocks)
                heading = next((block.text for block in blocks if block.kind == "heading"), None)
                chapter_title = heading or (title if section_index == 1 else f"Parte {section_index}")
            chapter = epub.EpubHtml(
                title=chapter_title,
                file_name=f"section-{section_index:04d}.xhtml",
                lang=language or "por",
            )
            chapter.add_item(style)
            chapter.content = "<html xmlns:epub=\"http://www.idpf.org/2007/ops\"><body>" + body + "</body></html>"
            book.add_item(chapter)
            chapters.append(chapter)

        book.toc = tuple(chapters)
        book.spine = chapters
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        epub.write_epub(temporary, book, {})
        temporary.replace(output_epub)
    except ConversionCancelled:
        temporary.unlink(missing_ok=True)
        raise
    except Exception as exc:
        temporary.unlink(missing_ok=True)
        raise ConversionFailedError(f"Não consegui criar a leitura adaptável do PDF: {exc}") from exc
    finally:
        if document is not None:
            document.close()
        if fallback_document is not None:
            fallback_document.close()
