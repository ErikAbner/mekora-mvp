"""
Fase H — Renderização visual não destrutiva para quadrinhos/mangá.

NÃO modifica as imagens originais (pages/page_NNN.jpg).
NÃO altera comic_overlay.json nem nenhum artefato anterior.
Gera páginas derivadas em storage/output/{job_id}/rendered_pages/page_NNN.png.
"""
from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Any

try:
    from PIL import Image as _PILImage
    from PIL import ImageDraw as _ImageDraw
    from PIL import ImageFont as _ImageFont
    _RENDER_AVAILABLE = True
except ImportError:
    _PILImage = None  # type: ignore[assignment]
    _ImageDraw = None  # type: ignore[assignment]
    _ImageFont = None  # type: ignore[assignment]
    _RENDER_AVAILABLE = False

# Caminhos de fontes: macOS → Linux → fallback PIL
_FONT_SEARCH_PATHS = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]

_STATUS_BORDER: dict[str, str] = {
    "pending": "#f59e0b",
    "approved": "#16a34a",
    "edited": "#2563eb",
    "skipped": "#9ca3af",
}

RenderManifest = dict[str, Any]


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = h[0] * 2 + h[1] * 2 + h[2] * 2
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _load_font(font_size_px: int):
    """Tenta carregar fonte do sistema; recai no padrão do Pillow."""
    if not _RENDER_AVAILABLE:
        return None
    for path in _FONT_SEARCH_PATHS:
        try:
            return _ImageFont.truetype(path, size=font_size_px)
        except (OSError, IOError):
            continue
    # Pillow >= 10 aceita size= no load_default
    try:
        return _ImageFont.load_default(size=font_size_px)
    except TypeError:
        return _ImageFont.load_default()


def _wrap_text(text: str, font, max_width_px: int, draw) -> list[str]:
    """Quebra texto em linhas que caibam em max_width_px."""
    if not text.strip():
        return []
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        try:
            bbox = draw.textbbox((0, 0), candidate, font=font)
            w = bbox[2] - bbox[0]
        except AttributeError:
            w, _ = draw.textsize(candidate, font=font)  # type: ignore[attr-defined]
        if w <= max_width_px or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _line_height(draw, font) -> int:
    try:
        bb = draw.textbbox((0, 0), "Ag", font=font)
        return bb[3] - bb[1] + 2
    except AttributeError:
        _, h = draw.textsize("Ag", font=font)  # type: ignore[attr-defined]
        return h + 2


def _fit_font_to_box(text: str, inner_w: int, inner_h: int, draw):
    """
    Auto-ajuste de fonte (usado quando overlay_style.font_size não é definido):
    escolhe o maior tamanho que faz o texto caber no bbox após quebra de linha.

    Retorna (font, lines). Mínimo 12px para legibilidade no dispositivo;
    máximo proporcional à altura do bloco (não excede o balão).
    """
    max_px = max(12, min(64, int(inner_h * 0.8)))
    for size in range(max_px, 11, -2):
        font = _load_font(size)
        lines = _wrap_text(text, font, inner_w, draw)
        lh = _line_height(draw, font)
        fits_height = lh * len(lines) <= inner_h
        try:
            fits_width = all(
                (draw.textbbox((0, 0), ln, font=font)[2]) <= inner_w for ln in lines
            )
        except AttributeError:
            fits_width = True
        if fits_height and fits_width:
            return font, lines
    font = _load_font(12)
    return font, _wrap_text(text, font, inner_w, draw)


# ---------------------------------------------------------------------------
# Renderização de uma página
# ---------------------------------------------------------------------------

def _render_page(
    base_image_path: Path,
    blocks: list[dict],
) -> tuple[bytes | None, list[str]]:
    """
    Renderiza uma página com blocos de texto sobrepostos.

    Retorna (bytes PNG, lista de avisos).
    Nunca lança exceção — em caso de erro fatal retorna (None, [msg]).

    Nota: bg_opacity do overlay_style controla a opacidade do fundo branco
    no render PIL (0=transparente, 1=sólido). O padrão 0.85 garante
    legibilidade. Isso difere do HTML overlay onde bg_opacity controla
    uma camada escura — as semânticas são propositalmente diferentes.
    """
    if not _RENDER_AVAILABLE:
        return None, ["Pillow não disponível. Instale Pillow>=10.0.0."]

    try:
        base = _PILImage.open(base_image_path).convert("RGBA")
    except Exception as exc:
        return None, [f"Erro ao abrir imagem base: {exc}"]

    img_w, img_h = base.size
    warnings: list[str] = []

    # Camadas separadas: fundo (semi-transparente) + texto/bordas (sólido)
    bg_layer = _PILImage.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    fg_layer = _PILImage.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    draw_bg = _ImageDraw.Draw(bg_layer)
    draw_fg = _ImageDraw.Draw(fg_layer)

    for block in blocks:
        if not block.get("overlay_visibility", True):
            continue

        pos = block.get("overlay_position") or block.get("bbox")
        if not pos or len(pos) < 4:
            warnings.append(
                f"Bloco {block.get('block_id', '?')} sem posição — ignorado na renderização."
            )
            continue

        text = block.get("reviewed_text") or block.get("translated_text", "")
        if not text.strip():
            continue

        # Bloco-lixo do OCR (só pontuação/símbolos, ex.: '\\', '|', '/')
        # não vira caixa no artefato final
        if not any(c.isalnum() for c in text):
            continue

        sty = block.get("overlay_style") or {}
        text_color_hex = str(sty.get("text_color", "#1a1a1a"))
        # bg_opacity no render: opacidade do fundo branco. Padrão 1.0 (sólido)
        # para COBRIR o texto original — 0.85 deixava o original transparecer
        # no artefato final. Overrides do usuário continuam respeitados.
        bg_opacity = float(sty.get("bg_opacity", 1.0))
        bg_opacity = min(1.0, max(0.0, bg_opacity))
        text_align = str(sty.get("text_align", "left"))

        x_px = int(pos[0] * img_w)
        y_px = int(pos[1] * img_h)
        w_px = max(1, int(pos[2] * img_w))
        h_px = max(1, int(pos[3] * img_h))

        # Fundo branco (sólido por padrão — cobre o original)
        bg_alpha = int(bg_opacity * 255)
        draw_bg.rectangle(
            [x_px, y_px, x_px + w_px - 1, y_px + h_px - 1],
            fill=(255, 255, 255, bg_alpha),
        )

        # Borda: SÓ quando definida explicitamente pelo usuário no estilo.
        # As cores de status de revisão são metadado de processo e não devem
        # aparecer no artefato final.
        explicit_border = sty.get("border_color")
        if explicit_border:
            try:
                border_rgb = _hex_to_rgb(str(explicit_border))
            except Exception:
                border_rgb = (245, 158, 11)
            draw_fg.rectangle(
                [x_px, y_px, x_px + w_px - 1, y_px + h_px - 1],
                outline=(*border_rgb, 255),
                width=2,
            )

        # Fonte: tamanho explícito do usuário OU auto-ajuste ao bbox
        padding = 4
        inner_w = max(1, w_px - 2 * padding)
        inner_h = max(1, h_px - 2 * padding)
        if sty.get("font_size") is not None:
            font_size_px = max(8, int(float(sty["font_size"]) * 16))
            font = _load_font(font_size_px)
            lines = _wrap_text(text, font, inner_w, draw_fg)
        else:
            font, lines = _fit_font_to_box(text, inner_w, inner_h, draw_fg)

        try:
            text_rgb = _hex_to_rgb(text_color_hex)
        except Exception:
            text_rgb = (26, 26, 26)

        lh = _line_height(draw_fg, font)
        y_cursor = y_px + padding

        for line in lines:
            if y_cursor + lh > y_px + h_px - padding:
                warnings.append(
                    f"Bloco {block.get('block_id', '?')}: texto truncado — área insuficiente."
                )
                break
            if text_align == "center":
                try:
                    lb = draw_fg.textbbox((0, 0), line, font=font)
                    lw = lb[2] - lb[0]
                except AttributeError:
                    lw, _ = draw_fg.textsize(line, font=font)  # type: ignore[attr-defined]
                x_cursor = x_px + max(0, (w_px - lw) // 2)
            elif text_align == "right":
                try:
                    lb = draw_fg.textbbox((0, 0), line, font=font)
                    lw = lb[2] - lb[0]
                except AttributeError:
                    lw, _ = draw_fg.textsize(line, font=font)  # type: ignore[attr-defined]
                x_cursor = x_px + max(0, w_px - lw - padding)
            else:
                x_cursor = x_px + padding
            draw_fg.text(
                (x_cursor, y_cursor), line, font=font, fill=(*text_rgb, 255)
            )
            y_cursor += lh

    # Compor: base → fundo → texto/bordas
    canvas = _PILImage.alpha_composite(base.copy(), bg_layer)
    canvas = _PILImage.alpha_composite(canvas, fg_layer)

    # Converter para RGB (fundo branco onde havia transparência)
    result = _PILImage.new("RGB", canvas.size, (255, 255, 255))
    result.paste(canvas, mask=canvas.split()[3])

    buf = io.BytesIO()
    result.save(buf, format="PNG", optimize=True)
    return buf.getvalue(), warnings


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def render_overlay_pages(
    overlay_data: dict,
    pages_dir: Path,
    output_dir: Path,
    job_id: int,
) -> RenderManifest:
    """
    Renderiza todas as páginas com overlays visíveis.

    - Lê imagens base em pages_dir/page_NNN.jpg
    - Salva PNGs derivados em output_dir/rendered_pages/page_NNN.png
    - NUNCA modifica as imagens de origem
    - Retorna manifesto com status por página
    """
    rendered_dir = output_dir / "rendered_pages"
    rendered_dir.mkdir(parents=True, exist_ok=True)

    pages_result: list[dict] = []
    total_visible_blocks = 0
    rendered_count = 0

    for page in overlay_data.get("pages", []):
        page_num = page.get("page_number", 0)
        img_path_serve = page.get("image_path")
        blocks = page.get("blocks", [])

        entry: dict[str, Any] = {
            "page_number": page_num,
            "rendered_path": None,
            "serve_path": None,
            "warnings": [],
            "error": None,
        }

        if not img_path_serve:
            entry["error"] = "Sem imagem de base — página ignorada na renderização."
            pages_result.append(entry)
            continue

        img_filename = Path(img_path_serve).name
        base_img_path = pages_dir / img_filename

        if not base_img_path.exists():
            entry["error"] = f"Imagem base não encontrada: {img_filename}"
            pages_result.append(entry)
            continue

        visible = [b for b in blocks if b.get("overlay_visibility", True)]
        total_visible_blocks += len(visible)

        out_filename = f"page_{page_num:03d}.png"
        out_path = rendered_dir / out_filename

        png_bytes, warnings = _render_page(base_img_path, blocks)
        entry["warnings"] = warnings

        if png_bytes is None:
            entry["error"] = warnings[0] if warnings else "Erro desconhecido na renderização."
        else:
            out_path.write_bytes(png_bytes)
            entry["rendered_path"] = str(out_path)
            entry["serve_path"] = (
                f"/storage/output/{job_id}/rendered_pages/{out_filename}"
            )
            rendered_count += 1

        pages_result.append(entry)

    return {
        "job_id": job_id,
        "source_language": overlay_data.get("source_language", ""),
        "target_language": overlay_data.get("target_language", ""),
        "total_pages": len(pages_result),
        "rendered_pages": rendered_count,
        "total_visible_blocks": total_visible_blocks,
        "pages": pages_result,
        "zip_path": None,
        "cbz_path": None,
    }


# ---------------------------------------------------------------------------
# Exportação ZIP / CBZ
# ---------------------------------------------------------------------------

def export_rendered_zip(manifest: RenderManifest, output_dir: Path, job_id: int) -> str:
    """Empacota os PNGs renderizados em ZIP. Retorna serve path."""
    zip_path = output_dir / "rendered_pages.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for page in manifest.get("pages", []):
            rp = page.get("rendered_path")
            if rp and Path(rp).exists():
                zf.write(rp, arcname=Path(rp).name)
    return f"/storage/output/{job_id}/rendered_pages.zip"


def export_rendered_cbz(manifest: RenderManifest, output_dir: Path, job_id: int) -> str:
    """Empacota os PNGs renderizados em CBZ. Retorna serve path."""
    cbz_path = output_dir / "rendered_pages.cbz"
    with zipfile.ZipFile(cbz_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for page in manifest.get("pages", []):
            rp = page.get("rendered_path")
            if rp and Path(rp).exists():
                zf.write(rp, arcname=Path(rp).name)
    return f"/storage/output/{job_id}/rendered_pages.cbz"


# ---------------------------------------------------------------------------
# Persistência do manifesto
# ---------------------------------------------------------------------------

def load_render_manifest(path: Path) -> RenderManifest:
    return json.loads(path.read_text(encoding="utf-8"))


def save_render_manifest(path: Path, manifest: RenderManifest) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
