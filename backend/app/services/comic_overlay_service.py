"""
Fase F — Overlay visual experimental para quadrinhos/mangá.

NÃO edita imagens originais.
NÃO modifica comic_translation.json (Fase D) nem comic_review.json (Fase E).
Gera comic_overlay.json com metadados visuais por bloco.
Renderiza imagens de página em storage/output/{job_id}/pages/.
"""
from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

# Importações opcionais — evita falha em CI sem as dependências
try:
    import pytesseract as _pytesseract
    from PIL import Image as _PILImage
    _OCR_AVAILABLE = True
except ImportError:
    _pytesseract = None  # type: ignore[assignment]
    _PILImage = None  # type: ignore[assignment]
    _OCR_AVAILABLE = False

_LANG_MAP: dict[str, str] = {
    "por": "por",
    "eng": "eng",
    "spa": "spa",
    "fra": "fra",
    "deu": "deu",
}

_VALID_STATUSES = {"pending", "approved", "edited", "skipped"}

_STATUS_BORDER: dict[str, str] = {
    "pending": "#f59e0b",
    "approved": "#16a34a",
    "edited": "#2563eb",
    "skipped": "#9ca3af",
}

OverlayBlock = dict[str, Any]
OverlayPage = dict[str, Any]
OverlaySidecar = dict[str, Any]


# ---------------------------------------------------------------------------
# Carregar / salvar
# ---------------------------------------------------------------------------

def load_overlay(path: Path) -> OverlaySidecar:
    return json.loads(path.read_text(encoding="utf-8"))


def save_overlay(path: Path, data: OverlaySidecar) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Renderização de imagens de página
# ---------------------------------------------------------------------------

def _save_page_images(
    all_img_bytes: list[bytes],
    output_dir: Path,
    width: int = 900,
) -> list[str]:
    """
    Salva bytes de imagem como JPEGs em output_dir/pages/.
    Retorna caminhos servíveis (/storage/output/{job_id}/pages/page_NNN.jpg).
    String vazia quando a imagem não pôde ser salva.
    """
    pages_dir = output_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    job_id = output_dir.name

    paths: list[str] = []
    for idx, img_bytes in enumerate(all_img_bytes):
        page_num = idx + 1
        out_path = pages_dir / f"page_{page_num:03d}.jpg"
        if not out_path.exists():
            try:
                if _OCR_AVAILABLE:
                    img = _PILImage.open(io.BytesIO(img_bytes))
                    orig_w, orig_h = img.size
                    if orig_w > 0:
                        new_h = int(orig_h * width / orig_w)
                        img = img.resize((width, new_h), _PILImage.LANCZOS)
                    img.convert("RGB").save(str(out_path), "JPEG", quality=85)
                else:
                    out_path.write_bytes(img_bytes)
            except Exception:
                # Fallback: serve os bytes originais quando o reprocessamento
                # PIL falha (stream parcial/corrompido ainda pode ser exibível)
                try:
                    out_path.write_bytes(img_bytes)
                except Exception:
                    pass
        serve = f"/storage/output/{job_id}/pages/page_{page_num:03d}.jpg"
        paths.append(serve if out_path.exists() else "")
    return paths


def render_page_images(
    input_path: str,
    input_format: str,
    output_dir: Path,
    width: int = 900,
) -> list[str]:
    """
    API pública: extrai páginas do arquivo de quadrinhos e salva como JPEG.
    Tolerante a falhas — retorna lista vazia se arquivo indisponível.
    """
    try:
        from app.services.comic_translation_service import extract_comic_pages
        all_bytes = extract_comic_pages(input_path, input_format)
    except Exception:
        return []
    return _save_page_images(all_bytes, output_dir, width)


# ---------------------------------------------------------------------------
# Extração de bboxes via OCR
# ---------------------------------------------------------------------------

def extract_block_bboxes_for_page(
    img_bytes: bytes,
    lang: str,
    expected_count: int,
) -> list[list[float] | None]:
    """
    Extrai bounding boxes normalizadas [x, y, w, h] (0.0..1.0) de blocos de texto.

    Usa pytesseract.image_to_data agrupando palavras por (block_num, par_num).
    Retorna lista de None se pytesseract indisponível ou em caso de erro.
    """
    if not _OCR_AVAILABLE or expected_count == 0:
        return [None] * expected_count

    try:
        img = _PILImage.open(io.BytesIO(img_bytes))
        w_img, h_img = img.size
        if w_img == 0 or h_img == 0:
            return [None] * expected_count

        tess_lang = _LANG_MAP.get(lang, "eng")
        data = _pytesseract.image_to_data(
            img, lang=tess_lang, output_type=_pytesseract.Output.DICT
        )

        from collections import defaultdict
        groups: dict[tuple[int, int], list[int]] = defaultdict(list)
        n = len(data["level"])
        for i in range(n):
            if int(data["conf"][i]) < 0:
                continue
            key = (int(data["block_num"][i]), int(data["par_num"][i]))
            groups[key].append(i)

        para_bboxes: list[list[float]] = []
        for key in sorted(groups.keys()):
            indices = groups[key]
            lefts  = [int(data["left"][i]) for i in indices]
            tops   = [int(data["top"][i]) for i in indices]
            rights = [int(data["left"][i]) + int(data["width"][i]) for i in indices]
            bots   = [int(data["top"][i]) + int(data["height"][i]) for i in indices]
            x = min(lefts); y = min(tops)
            bw = max(rights) - x; bh = max(bots) - y
            if bw > 0 and bh > 0:
                para_bboxes.append(
                    [x / w_img, y / h_img, bw / w_img, bh / h_img]
                )

        result: list[list[float] | None] = []
        for i in range(expected_count):
            result.append(para_bboxes[i] if i < len(para_bboxes) else None)
        return result

    except Exception:
        return [None] * expected_count


# ---------------------------------------------------------------------------
# Inicializar overlay a partir do sidecar revisado (Fase E)
# ---------------------------------------------------------------------------

def initialize_overlay(
    review_path: Path,
    input_path: str,
    input_format: str,
    output_dir: Path,
    job_id: int,
) -> OverlaySidecar:
    """
    Cria o sidecar de overlay a partir do sidecar revisado (comic_review.json).

    - Extrai imagens de página e salva em output_dir/pages/
    - Tenta obter bboxes via pytesseract (opcional — tolerante a falhas)
    - NÃO sobrescreve comic_review.json nem comic_translation.json
    """
    review = json.loads(review_path.read_text(encoding="utf-8"))
    src_lang = review.get("source_language", "")

    # Extrair todas as páginas de uma vez só
    try:
        from app.services.comic_translation_service import extract_comic_pages
        all_img_bytes = extract_comic_pages(input_path, input_format)
    except Exception:
        all_img_bytes = []

    # Salvar imagens
    image_paths = _save_page_images(all_img_bytes, output_dir) if all_img_bytes else []

    overlay_pages: list[OverlayPage] = []
    for page_idx, review_page in enumerate(review.get("pages", [])):
        page_num = review_page.get("page_number", page_idx + 1)
        review_blocks = review_page.get("blocks", [])

        img_path: str | None = (
            image_paths[page_idx] if page_idx < len(image_paths) else ""
        ) or None

        # Tentar extrair bboxes
        bboxes: list[list[float] | None] = [None] * len(review_blocks)
        if page_idx < len(all_img_bytes) and review_blocks:
            bboxes = extract_block_bboxes_for_page(
                all_img_bytes[page_idx], src_lang, len(review_blocks)
            )

        overlay_blocks: list[OverlayBlock] = []
        for blk_idx, rb in enumerate(review_blocks):
            overlay_blocks.append({
                "block_id": rb.get("block_id", f"p{page_num}_b{blk_idx}"),
                "original_text": rb.get("original_text", ""),
                "translated_text": rb.get("translated_text", ""),
                "reviewed_text": rb.get("reviewed_text", ""),
                "review_status": rb.get("review_status", "pending"),
                "bbox": bboxes[blk_idx] if blk_idx < len(bboxes) else None,
                "overlay_position": None,
                "overlay_style": None,
                "overlay_visibility": True,
            })

        overlay_pages.append({
            "page_number": page_num,
            "image_path": img_path,
            "blocks": overlay_blocks,
            "error": review_page.get("error"),
        })

    return {
        "job_id": job_id,
        "source_language": src_lang,
        "target_language": review.get("target_language", ""),
        "pages": overlay_pages,
    }


# ---------------------------------------------------------------------------
# Aplicar patches
# ---------------------------------------------------------------------------

def apply_overlay_patches(
    data: OverlaySidecar,
    patches: list[dict],
) -> OverlaySidecar:
    """
    Aplica patches visuais e textuais em blocos do overlay.

    Campos suportados: reviewed_text, review_status, overlay_position,
    overlay_visibility, overlay_style.
    """
    patch_map: dict[str, dict] = {p["block_id"]: p for p in patches}

    for page in data["pages"]:
        for block in page["blocks"]:
            bid = block["block_id"]
            if bid not in patch_map:
                continue
            patch = patch_map[bid]

            new_text = patch.get("reviewed_text")
            new_status = patch.get("review_status")
            if new_text is not None:
                block["reviewed_text"] = new_text
                if new_status is None and new_text.strip():
                    block["review_status"] = "edited"
            if new_status is not None and new_status in _VALID_STATUSES:
                block["review_status"] = new_status

            if "overlay_position" in patch:
                block["overlay_position"] = patch["overlay_position"]

            vis = patch.get("overlay_visibility")
            if vis is not None:
                block["overlay_visibility"] = vis

            if "overlay_style" in patch:
                block["overlay_style"] = patch["overlay_style"]

    return data


# ---------------------------------------------------------------------------
# Estatísticas
# ---------------------------------------------------------------------------

def compute_overlay_stats(data: OverlaySidecar) -> dict[str, int]:
    counts: dict[str, int] = {
        "total": 0, "pending": 0, "approved": 0, "edited": 0, "skipped": 0,
    }
    for page in data["pages"]:
        for block in page.get("blocks", []):
            counts["total"] += 1
            status = block.get("review_status", "pending")
            if status in counts:
                counts[status] += 1
    return counts


# ---------------------------------------------------------------------------
# Exportação HTML visual
# ---------------------------------------------------------------------------

import html as _html_mod
import re as _re_mod


def _e(text: Any) -> str:
    """Escape HTML de texto dinâmico (P6)."""
    return _html_mod.escape(str(text or ""), quote=True)


_STATUS_ALLOWED = {"pending", "approved", "edited", "skipped"}
_HEX_COLOR_RE = _re_mod.compile(r"^#[0-9a-fA-F]{3,8}$")
_ALIGN_ALLOWED = {"left", "center", "right", "justify"}


def _safe_status(status: Any) -> str:
    s = str(status or "pending")
    return s if s in _STATUS_ALLOWED else "pending"


def _safe_color(value: Any, fallback: str) -> str:
    """Aceita apenas hex #RGB/#RRGGBB(AA); demais → fallback."""
    if isinstance(value, str) and _HEX_COLOR_RE.match(value):
        return value
    return fallback


def _safe_align(value: Any) -> str:
    return value if value in _ALIGN_ALLOWED else "left"


def _safe_unit_float(value: Any, low: float, high: float, default: float) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    if f < low or f > high:
        return default
    return f


def _safe_img_src(value: Any) -> str:
    """
    Só permite src relativo dentro do storage servido pelo backend
    (`/storage/output/…`). Bloqueia javascript:, data:, absoluto externo etc.
    """
    if not isinstance(value, str) or not value.startswith("/storage/output/"):
        return ""
    # Escape para atributo (evita fechar aspas ou inserir handler)
    return _e(value)


def export_overlay_html(data: OverlaySidecar) -> str:
    job_id = _e(data.get("job_id", "?"))
    src = _e(data.get("source_language", ""))
    tgt = _e(data.get("target_language", ""))

    parts = [
        "<!DOCTYPE html>",
        "<html lang='pt'>",
        "<head><meta charset='utf-8'>",
        f"<title>Overlay Visual — Job {job_id}</title>",
        "<style>",
        "body{font-family:system-ui,sans-serif;max-width:1000px;margin:auto;padding:1.5rem;color:#1a1a1a}",
        "h1{font-size:1.25rem;font-weight:700;margin-bottom:.25rem}",
        ".exp{background:#fef3c7;border:1px solid #f59e0b;border-radius:.5rem;padding:.75rem;"
        "margin-bottom:1.5rem;font-size:.875rem}",
        ".ps{margin-bottom:3rem}",
        "h2{font-size:1rem;font-weight:600;margin-bottom:.5rem}",
        ".pc{position:relative;display:inline-block;max-width:100%;"
        "border:1px solid #e5e7eb;border-radius:.5rem;overflow:hidden}",
        ".pi{display:block;width:100%}",
        ".ob{position:absolute;cursor:default;overflow:hidden;padding:1px}",
        ".ot{line-height:1.2;word-break:break-word;"
        "background:rgba(255,255,255,.85);padding:1px;white-space:pre-wrap}",
        ".nl{background:#f9fafb;border:1px solid #e5e7eb;border-radius:.5rem;padding:1rem;margin-top:.5rem}",
        ".bi{border-left:3px solid #d1d5db;padding:.5rem .75rem;margin-bottom:.5rem}",
        ".bi.approved{border-color:#16a34a}.bi.edited{border-color:#2563eb}",
        ".bi.skipped{border-color:#9ca3af;opacity:.7}.bi.pending{border-color:#f59e0b}",
        ".lbl{font-size:.65rem;font-weight:600;text-transform:uppercase;color:#6b7280;margin-bottom:.2rem}",
        ".orig{color:#6b7280;font-size:.8rem;white-space:pre-wrap}.trans{color:#374151;font-size:.8rem;white-space:pre-wrap}",
        ".rev{color:#15803d;font-size:.8rem;font-weight:500;white-space:pre-wrap}",
        "</style></head><body>",
        f"<h1>Overlay Visual — Job {job_id}</h1>",
        f"<p style='color:#6b7280;font-size:.875rem'>{src} → {tgt}</p>",
        "<div class='exp'>⚠ Preview visual experimental. "
        "As imagens originais NÃO são modificadas. "
        "Este arquivo é apenas para revisão.</div>",
    ]

    for page in data["pages"]:
        pn = int(page.get("page_number", 0))
        img_path = _safe_img_src(page.get("image_path"))
        blocks = page.get("blocks", [])
        parts.append(f"<div class='ps'><h2>Página {pn}</h2>")

        if img_path:
            parts.append("<div class='pc'>")
            parts.append(f"<img class='pi' src='{img_path}' alt='Página {pn}'>")
            for block in blocks:
                if not block.get("overlay_visibility", True):
                    continue
                pos = block.get("overlay_position") or block.get("bbox")
                if not pos or len(pos) < 4:
                    continue
                try:
                    x_pct = float(pos[0]) * 100
                    y_pct = float(pos[1]) * 100
                    w_pct = float(pos[2]) * 100
                    h_pct = float(pos[3]) * 100
                except (TypeError, ValueError):
                    continue
                status = _safe_status(block.get("review_status", "pending"))
                text = block.get("reviewed_text") or block.get("translated_text", "")
                sty = block.get("overlay_style") or {}
                border_color = _safe_color(
                    sty.get("border_color"),
                    _STATUS_BORDER.get(status, "#9ca3af"),
                )
                bg_opacity = _safe_unit_float(sty.get("bg_opacity", 0.15), 0.0, 1.0, 0.15)
                font_size = _safe_unit_float(sty.get("font_size", 0.6), 0.3, 3.0, 0.6)
                text_color = _safe_color(sty.get("text_color", "#1a1a1a"), "#1a1a1a")
                text_align = _safe_align(sty.get("text_align", "left"))
                parts.append(
                    f"<div class='ob' style='"
                    f"left:{x_pct:.2f}%;top:{y_pct:.2f}%;"
                    f"width:{w_pct:.2f}%;height:{h_pct:.2f}%;"
                    f"border:2px solid {border_color};"
                    f"background:rgba(0,0,0,{bg_opacity})'>"
                )
                parts.append(
                    f"<div class='ot' style='font-size:{font_size:.2f}rem;"
                    f"color:{text_color};text-align:{text_align}'>{_e(text)}</div>"
                )
                parts.append("</div>")
            parts.append("</div>")

        # Blocos sem posição detectada
        no_pos = [b for b in blocks if not (b.get("overlay_position") or b.get("bbox"))]
        if no_pos:
            parts.append("<div class='nl'>")
            parts.append(
                "<p style='font-size:.75rem;color:#6b7280;margin-bottom:.5rem'>"
                "Blocos sem posição detectada:</p>"
            )
            for block in no_pos:
                status = _safe_status(block.get("review_status", "pending"))
                parts.append(f"<div class='bi {status}'>")
                parts.append(
                    "<div class='lbl'>Original</div>"
                    f"<div class='orig'>{_e(block.get('original_text', ''))}</div>"
                )
                parts.append(
                    "<div class='lbl' style='margin-top:.25rem'>Tradução</div>"
                    f"<div class='trans'>{_e(block.get('translated_text', ''))}</div>"
                )
                rev = block.get("reviewed_text", "")
                if rev:
                    parts.append(
                        "<div class='lbl' style='margin-top:.25rem'>Revisado</div>"
                        f"<div class='rev'>{_e(rev)}</div>"
                    )
                parts.append("</div>")
            parts.append("</div>")

        parts.append("</div>")  # .ps

    parts.append("</body></html>")
    return "\n".join(parts)
