"""
Fase N.B — Análise heurística de layout para acabamento visual assistido.

Funções puras sem efeitos colaterais (sem I/O).
Detecta problemas de legibilidade/layout em blocos de overlay e gera sugestões
de ajuste (font_scale). NÃO usa IA generativa.

Heurísticas implementadas:
- overflow: texto estimado excede a altura da caixa
- small_font: font_size < 9px
- border_proximity: caixa a < 3% da borda da imagem
- low_contrast: bg_opacity < 0.30 (fundo muito transparente)
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_REF_W: int = 800   # largura de referência (px) quando dimensão real desconhecida
_REF_H: int = 1200  # altura de referência

_DEFAULT_FONT_SIZE_REM: float = 0.7   # padrão do render_service
_DEFAULT_BG_OPACITY: float = 0.85     # padrão do render_service
_BORDER_MARGIN: float = 0.03          # 3% das bordas
_MIN_FONT_PX: int = 9                 # abaixo → small_font issue
_LOW_CONTRAST_THRESHOLD: float = 0.30 # abaixo → low_contrast issue

# Issue types públicos
ISSUE_OVERFLOW = "overflow"
ISSUE_SMALL_FONT = "small_font"
ISSUE_BORDER_PROXIMITY = "border_proximity"
ISSUE_LOW_CONTRAST = "low_contrast"


# ---------------------------------------------------------------------------
# Análise por página
# ---------------------------------------------------------------------------

def analyze_page(
    overlay_page: dict,
    image_w: int = _REF_W,
    image_h: int = _REF_H,
) -> tuple[list[dict], dict | None]:
    """
    Analisa uma página do overlay (dict com "blocks") e retorna:
      (issues, suggestions)

    issues  — lista de dicts com issue_type, block_id, severity, detail
    suggestions — dict com font_scale, detail, has_overflow, has_low_contrast
                  ou None se não houver problemas
    """
    blocks = overlay_page.get("blocks", [])
    all_issues: list[dict] = []

    for block in blocks:
        if not block.get("overlay_visibility", True):
            continue
        all_issues.extend(_detect_block_issues(block, image_w, image_h))

    suggestions = _generate_suggestions(all_issues)
    return all_issues, suggestions


# ---------------------------------------------------------------------------
# Detecção de issues por bloco
# ---------------------------------------------------------------------------

def _detect_block_issues(
    block: dict,
    image_w: int,
    image_h: int,
) -> list[dict]:
    """Retorna lista de issues para um único bloco de overlay."""
    issues: list[dict] = []
    block_id: str = str(block.get("block_id", "?"))

    pos = block.get("overlay_position") or block.get("bbox")
    if not pos or len(pos) < 4:
        return issues

    bx, by, bw, bh = float(pos[0]), float(pos[1]), float(pos[2]), float(pos[3])
    box_w_px = bw * image_w
    box_h_px = bh * image_h

    sty = block.get("overlay_style") or {}
    font_size_rem = float(sty.get("font_size", _DEFAULT_FONT_SIZE_REM))
    font_size_px = max(8, int(font_size_rem * 16))
    bg_opacity = float(sty.get("bg_opacity", _DEFAULT_BG_OPACITY))
    text = (block.get("reviewed_text") or block.get("translated_text") or "").strip()

    # 1. Fonte muito pequena
    if font_size_px < _MIN_FONT_PX:
        issues.append({
            "issue_type": ISSUE_SMALL_FONT,
            "block_id": block_id,
            "severity": "warning",
            "detail": f"font_size={font_size_px}px (rem={font_size_rem:.2f}) abaixo de {_MIN_FONT_PX}px",
        })

    # 2. Caixa próxima às bordas
    if (
        bx < _BORDER_MARGIN
        or by < _BORDER_MARGIN
        or (bx + bw) > (1.0 - _BORDER_MARGIN)
        or (by + bh) > (1.0 - _BORDER_MARGIN)
    ):
        issues.append({
            "issue_type": ISSUE_BORDER_PROXIMITY,
            "block_id": block_id,
            "severity": "warning",
            "detail": (
                f"Caixa ({bx:.2f}, {by:.2f}, {bw:.2f}, {bh:.2f}) "
                f"dentro de {_BORDER_MARGIN*100:.0f}% da borda."
            ),
        })

    # 3. Contraste baixo (fundo muito transparente)
    if bg_opacity < _LOW_CONTRAST_THRESHOLD:
        issues.append({
            "issue_type": ISSUE_LOW_CONTRAST,
            "block_id": block_id,
            "severity": "warning",
            "detail": f"bg_opacity={bg_opacity:.2f} — fundo muito transparente (< {_LOW_CONTRAST_THRESHOLD}).",
        })

    # 4. Overflow — estimativa de quebra de linha
    if text and box_w_px > 0 and box_h_px > 0:
        padding_px = 4
        inner_w = max(1.0, box_w_px - 2 * padding_px)
        # Estimativas empíricas consistentes com render_service
        char_w = font_size_px * 0.55
        line_h = font_size_px * 1.4 + 2  # +2 = offset do _line_height do render

        chars_per_line = max(1, int(inner_w / char_w))
        lines = _estimate_lines(text, chars_per_line)
        needed_h = lines * line_h + 2 * padding_px

        if needed_h > box_h_px * 0.9:
            severity = "error" if needed_h > box_h_px * 1.3 else "warning"
            issues.append({
                "issue_type": ISSUE_OVERFLOW,
                "block_id": block_id,
                "severity": severity,
                "detail": (
                    f"~{lines} linhas estimadas ({needed_h:.0f}px) "
                    f"vs box_height={box_h_px:.0f}px."
                ),
            })

    return issues


def _estimate_lines(text: str, chars_per_line: int) -> int:
    """Estimativa de quebra de linha por palavras (equivale ao _wrap_text do render_service)."""
    words = text.split()
    lines = 1
    current = 0
    for word in words:
        wlen = len(word)
        if current == 0:
            current = wlen
        elif current + 1 + wlen > chars_per_line:
            lines += 1
            current = wlen
        else:
            current += 1 + wlen
    return lines


# ---------------------------------------------------------------------------
# Geração de sugestões
# ---------------------------------------------------------------------------

def _generate_suggestions(issues: list[dict]) -> dict | None:
    """
    Retorna sugestões de ajuste baseadas nos issues detectados.
    font_scale é o multiplicador a aplicar em overlay_style.font_size.
    """
    if not issues:
        return None

    has_overflow = any(i["issue_type"] == ISSUE_OVERFLOW for i in issues)
    has_small_font = any(i["issue_type"] == ISSUE_SMALL_FONT for i in issues)
    has_low_contrast = any(i["issue_type"] == ISSUE_LOW_CONTRAST for i in issues)
    has_border = any(i["issue_type"] == ISSUE_BORDER_PROXIMITY for i in issues)

    font_scale = 1.0
    detail_parts: list[str] = []

    if has_overflow:
        font_scale = min(font_scale, 0.75)
        detail_parts.append("reduzir fonte 0.75×")

    if has_small_font and not has_overflow:
        font_scale = max(font_scale, 1.3)
        detail_parts.append("aumentar fonte 1.3×")

    if has_low_contrast:
        detail_parts.append("aumentar opacidade do fundo")

    if has_border:
        detail_parts.append("reposicionar caixa para longe das bordas")

    # Limites de segurança
    font_scale = max(0.5, min(2.0, font_scale))

    return {
        "font_scale": round(font_scale, 3),
        "detail": "; ".join(detail_parts) if detail_parts else "sem ajuste de fonte necessário",
        "has_overflow": has_overflow,
        "has_low_contrast": has_low_contrast,
    }
