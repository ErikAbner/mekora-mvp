"""
Testes unitários para comic_layout_service.py (Fase N.B).
Funções puras — sem I/O, sem banco.
"""
import pytest

from app.services.comic_layout_service import (
    ISSUE_BORDER_PROXIMITY,
    ISSUE_LOW_CONTRAST,
    ISSUE_OVERFLOW,
    ISSUE_SMALL_FONT,
    analyze_page,
    _detect_block_issues,
    _generate_suggestions,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _block(
    block_id: str = "b1",
    text: str = "Hello",
    bx: float = 0.1,
    by: float = 0.1,
    bw: float = 0.3,
    bh: float = 0.1,
    font_size_rem: float = 0.7,
    bg_opacity: float = 0.85,
    visible: bool = True,
) -> dict:
    return {
        "block_id": block_id,
        "overlay_visibility": visible,
        "overlay_position": [bx, by, bw, bh],
        "overlay_style": {"font_size": font_size_rem, "bg_opacity": bg_opacity},
        "reviewed_text": text,
    }


def _page(blocks: list[dict]) -> dict:
    return {"page_number": 1, "blocks": blocks}


# ---------------------------------------------------------------------------
# Detecção individual de issues
# ---------------------------------------------------------------------------

def test_detect_overflow():
    """Bloco com texto muito longo relativo à caixa pequena → issue overflow."""
    long_text = " ".join(["palavra"] * 50)
    block = _block(text=long_text, bw=0.1, bh=0.05)
    issues = _detect_block_issues(block, 800, 1200)
    types = [i["issue_type"] for i in issues]
    assert ISSUE_OVERFLOW in types


def test_detect_small_font():
    """font_size_rem muito baixo → issue small_font (font_size_px < 9)."""
    # rem=0.4 → 0.4*16=6px < 9px
    block = _block(font_size_rem=0.4)
    issues = _detect_block_issues(block, 800, 1200)
    types = [i["issue_type"] for i in issues]
    assert ISSUE_SMALL_FONT in types


def test_detect_border_proximity():
    """Caixa com bx=0.01 (< 3% da borda) → issue border_proximity."""
    block = _block(bx=0.01, by=0.1, bw=0.3, bh=0.1)
    issues = _detect_block_issues(block, 800, 1200)
    types = [i["issue_type"] for i in issues]
    assert ISSUE_BORDER_PROXIMITY in types


def test_detect_low_contrast():
    """bg_opacity=0.1 (< 0.30) → issue low_contrast."""
    block = _block(bg_opacity=0.1)
    issues = _detect_block_issues(block, 800, 1200)
    types = [i["issue_type"] for i in issues]
    assert ISSUE_LOW_CONTRAST in types


def test_no_issues_clean_block():
    """Bloco com parâmetros saudáveis → nenhum issue."""
    block = _block(
        text="Texto curto",
        bx=0.1, by=0.1, bw=0.4, bh=0.15,
        font_size_rem=0.8,
        bg_opacity=0.85,
    )
    issues = _detect_block_issues(block, 800, 1200)
    assert issues == []


# ---------------------------------------------------------------------------
# Sugestões
# ---------------------------------------------------------------------------

def test_suggestions_overflow():
    """Issue overflow → font_scale=0.75."""
    issues = [{"issue_type": ISSUE_OVERFLOW, "block_id": "b1", "severity": "warning", "detail": ""}]
    suggestion = _generate_suggestions(issues)
    assert suggestion is not None
    assert suggestion["font_scale"] == 0.75
    assert suggestion["has_overflow"] is True


def test_suggestions_small_font_no_overflow():
    """Issue small_font sem overflow → font_scale=1.3."""
    issues = [{"issue_type": ISSUE_SMALL_FONT, "block_id": "b1", "severity": "warning", "detail": ""}]
    suggestion = _generate_suggestions(issues)
    assert suggestion is not None
    assert suggestion["font_scale"] == 1.3
    assert suggestion["has_overflow"] is False


# ---------------------------------------------------------------------------
# Visibilidade e analyze_page
# ---------------------------------------------------------------------------

def test_invisible_block_skipped():
    """Bloco com overlay_visibility=False não gera issues."""
    long_text = " ".join(["palavra"] * 50)
    block = _block(text=long_text, bw=0.05, bh=0.03, visible=False)
    issues, suggestions = analyze_page(_page([block]))
    assert issues == []
    assert suggestions is None
