from app.services.pdf_semantics_service import (
    InlineMark,
    SemanticBlock,
    classify_blocks,
    merge_continuations,
    render_blocks,
)


def block(
    text: str,
    *,
    page: int = 0,
    region: int = 0,
    x0: float = 60,
    y0: float = 100,
    x1: float = 440,
    y1: float = 130,
    size: float = 10,
    kind: str = "paragraph",
    level: int = 0,
    marks=(),
) -> SemanticBlock:
    return SemanticBlock(
        text=text,
        page=page,
        region=region,
        bbox=(x0, y0, x1, y1),
        page_width=500,
        page_height=600,
        font_size=size,
        line_height=12,
        kind=kind,
        level=level,
        marks=tuple(marks),
    )


def test_paragraph_continues_on_next_page_and_removes_print_hyphen() -> None:
    first = block("documentar os momentos mais emocio-", y0=430, y1=500)
    second = block("nantes da vida política brasileira.", page=1, y0=70, y1=100)
    merged = merge_continuations([first, second])
    assert [item.text for item in merged] == [
        "documentar os momentos mais emocionantes da vida política brasileira."
    ]


def test_real_paragraph_break_is_not_joined_indiscriminately() -> None:
    first = block("O primeiro parágrafo termina aqui.", y0=100, y1=140)
    second = block("Um novo parágrafo começa recuado.", x0=82, y0=150, y1=180)
    classified = classify_blocks([first, second])
    merged = merge_continuations(classified)
    assert len(merged) == 2


def test_heading_note_quote_list_and_section_are_classified_from_layout() -> None:
    samples = [
        block("Capítulo um", y0=60, y1=92, size=18),
        block("Texto de corpo longo o bastante para definir a medida tipográfica.", y0=120, y1=150),
        block("Outro texto de corpo longo que estabiliza a medida da página.", y0=160, y1=190),
        block("Uma citação recuada em relação às duas margens do corpo.", x0=90, x1=410, y0=210, y1=250),
        block("• primeiro item", y0=270, y1=290),
        block("1 Nosso século, 1945-1960. São Paulo, Abril Cultural, 1980.", y0=500, y1=525, size=7),
    ]
    result = classify_blocks(samples)
    assert [item.kind for item in result] == [
        "heading", "paragraph", "paragraph", "quote", "list_item", "note"
    ]
    assert result[0].level == 1


def test_inline_italic_bold_and_auxiliary_content_survive_xhtml() -> None:
    text = "Bonde do Catete explica"
    rendered = render_blocks([
        block(
            text,
            marks=(InlineMark(0, 15, "emphasis"), InlineMark(16, 23, "strong")),
        ),
        block("Trecho citado", kind="quote"),
        block("Nota explicativa", kind="note"),
        block("- item da lista", kind="list_item"),
        block("Nova seção", kind="heading", level=2),
    ])
    assert "<em>Bonde do Catete</em>" in rendered
    assert "<strong>explica</strong>" in rendered
    assert "<blockquote>Trecho citado</blockquote>" in rendered
    assert 'epub:type="footnote"' in rendered
    assert "<ul><li>item da lista</li></ul>" in rendered
    assert "<h2>Nova seção</h2>" in rendered
