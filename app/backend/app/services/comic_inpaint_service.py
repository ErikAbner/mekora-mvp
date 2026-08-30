"""
Fase I.A — Inpainting experimental não destrutivo para quadrinhos/mangá.

EXPERIMENTAL — resultados variam conforme complexidade do fundo.
NÃO modifica imagens originais (pages/).
NÃO altera artefatos das Fases D–H.
Gera páginas derivadas em storage/output/{job_id}/inpaint_pages/page_NNN.png.

Algoritmos:
  "telea"  — OpenCV INPAINT_TELEA (requer opencv-python + numpy)
  "ns"     — OpenCV INPAINT_NS    (requer opencv-python + numpy)
  "blur"   — Fallback PIL GaussianBlur (sempre disponível)

Se "telea" ou "ns" for solicitado mas OpenCV não estiver instalado,
o serviço usa "blur" automaticamente e registra um aviso no manifesto.
Instale opencv-python para resultados de melhor qualidade.
"""
from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Any

# OpenCV + NumPy — opcionais
try:
    import cv2 as _cv2
    import numpy as _np
    _INPAINT_AVAILABLE = True
except ImportError:
    _cv2 = None  # type: ignore[assignment]
    _np = None   # type: ignore[assignment]
    _INPAINT_AVAILABLE = False

# Pillow — necessário para blur fallback e manipulação de máscara
try:
    from PIL import Image as _PILImage
    from PIL import ImageDraw as _ImageDraw
    from PIL import ImageFilter as _ImageFilter
    _PIL_AVAILABLE = True
except ImportError:
    _PILImage = None   # type: ignore[assignment]
    _ImageDraw = None  # type: ignore[assignment]
    _ImageFilter = None  # type: ignore[assignment]
    _PIL_AVAILABLE = False

_VALID_ALGORITHMS = {"telea", "ns", "blur"}
_DEFAULT_STATUSES = {"pending", "edited", "approved", "skipped"}

InpaintManifestDict = dict[str, Any]


# ---------------------------------------------------------------------------
# Construção de máscara
# ---------------------------------------------------------------------------

def build_mask(
    blocks: list[dict],
    img_w: int,
    img_h: int,
    padding: int = 2,
    statuses: set[str] | None = None,
):
    """
    Cria máscara binária (PIL Image L) a partir dos blocos de overlay.

    - Pixels brancos (255) = área para inpainting
    - Pixels pretos (0)  = preservar
    - Usa overlay_position se existir; senão bbox
    - Ignora blocos com overlay_visibility=False
    - Filtra por statuses (None → todos os status)

    Requer Pillow. Retorna None se Pillow indisponível.
    """
    if not _PIL_AVAILABLE:
        return None

    if statuses is None:
        statuses = _DEFAULT_STATUSES

    mask = _PILImage.new("L", (img_w, img_h), 0)
    draw = _ImageDraw.Draw(mask)

    for block in blocks:
        if not block.get("overlay_visibility", True):
            continue
        if block.get("review_status", "pending") not in statuses:
            continue

        pos = block.get("overlay_position") or block.get("bbox")
        if not pos or len(pos) < 4:
            continue

        x = int(pos[0] * img_w) - padding
        y = int(pos[1] * img_h) - padding
        x2 = int(pos[0] * img_w) + int(pos[2] * img_w) + padding
        y2 = int(pos[1] * img_h) + int(pos[3] * img_h) + padding

        # Clamp to image bounds
        x  = max(0, x)
        y  = max(0, y)
        x2 = min(img_w - 1, x2)
        y2 = min(img_h - 1, y2)

        draw.rectangle([x, y, x2, y2], fill=255)

    return mask


# ---------------------------------------------------------------------------
# Inpainting interno
# ---------------------------------------------------------------------------

def _inpaint_opencv(pil_img, mask, algorithm: str, radius: int):
    """Inpainting via OpenCV (TELEA ou NS). Requer cv2 e numpy."""
    img_np = _np.array(pil_img.convert("RGB"))
    img_bgr = _cv2.cvtColor(img_np, _cv2.COLOR_RGB2BGR)
    mask_np = _np.array(mask.convert("L"))
    flag = _cv2.INPAINT_TELEA if algorithm == "telea" else _cv2.INPAINT_NS
    result_bgr = _cv2.inpaint(img_bgr, mask_np, radius, flag)
    result_rgb = _cv2.cvtColor(result_bgr, _cv2.COLOR_BGR2RGB)
    return _PILImage.fromarray(result_rgb)


def _inpaint_blur(pil_img, mask, radius: int):
    """
    Fallback PIL: borra a região mascarada com Gaussian blur pesado.

    Resultado: os pixels mascarados viram a média suavizada da vizinhança,
    ocultando o texto mas sem reconstrução inteligente do fundo.
    Qualidade inferior ao OpenCV — suficiente para preview experimental.
    """
    blur_radius = max(5, radius * 6)
    blurred = pil_img.filter(_ImageFilter.GaussianBlur(radius=blur_radius))
    result = pil_img.copy()
    result.paste(blurred, mask=mask)
    return result


# ---------------------------------------------------------------------------
# Inpainting de uma página
# ---------------------------------------------------------------------------

def inpaint_page(
    base_image_path: Path,
    blocks: list[dict],
    algorithm: str = "telea",
    mask_padding: int = 2,
    inpaint_radius: int = 3,
    feather: int = 0,
    statuses: set[str] | None = None,
) -> tuple[bytes | None, list[str], str]:
    """
    Aplica inpainting em uma página.

    Retorna (bytes PNG | None, lista de avisos, algoritmo_usado).
    Nunca lança exceção — em caso de erro fatal retorna (None, [msg], algorithm).

    algorithm_used pode diferir de algorithm quando:
    - "telea"/"ns" solicitado mas OpenCV não disponível → usa "blur"
    """
    warnings: list[str] = []

    if not _PIL_AVAILABLE:
        return None, ["Pillow não disponível. Instale Pillow>=10.0.0."], algorithm

    try:
        base = _PILImage.open(base_image_path).convert("RGB")
    except Exception as exc:
        return None, [f"Erro ao abrir imagem base: {exc}"], algorithm

    img_w, img_h = base.size
    mask = build_mask(blocks, img_w, img_h, padding=mask_padding, statuses=statuses)

    if mask is None:
        return None, ["Pillow indisponível para construção de máscara."], algorithm

    # Máscara vazia — nenhum bloco para inpainting
    if mask.getbbox() is None:
        buf = io.BytesIO()
        base.save(buf, format="PNG")
        return (
            buf.getvalue(),
            ["Máscara vazia — nenhum bloco visível/posicionado para inpainting."],
            algorithm,
        )

    # Feather (suavização das bordas da máscara)
    if feather > 0:
        mask = mask.filter(_ImageFilter.GaussianBlur(radius=feather))

    # Selecionar algoritmo
    algorithm_used = algorithm
    if algorithm in ("telea", "ns"):
        if _INPAINT_AVAILABLE:
            try:
                result = _inpaint_opencv(base, mask, algorithm, inpaint_radius)
            except Exception as exc:
                warnings.append(f"OpenCV inpaint falhou ({exc}) — usando fallback blur.")
                algorithm_used = "blur"
                result = _inpaint_blur(base, mask, inpaint_radius)
        else:
            warnings.append(
                f"OpenCV não disponível — usando fallback blur (instale opencv-python "
                f"para inpainting {algorithm.upper()} de melhor qualidade)."
            )
            algorithm_used = "blur"
            result = _inpaint_blur(base, mask, inpaint_radius)
    else:
        result = _inpaint_blur(base, mask, inpaint_radius)

    buf = io.BytesIO()
    result.save(buf, format="PNG")
    return buf.getvalue(), warnings, algorithm_used


# ---------------------------------------------------------------------------
# Pipeline completo
# ---------------------------------------------------------------------------

def inpaint_overlay_pages(
    overlay_data: dict,
    pages_dir: Path,
    output_dir: Path,
    job_id: int,
    algorithm: str = "telea",
    mask_padding: int = 2,
    inpaint_radius: int = 3,
    feather: int = 0,
    statuses: set[str] | None = None,
) -> InpaintManifestDict:
    """
    Gera páginas inpaintadas para todos os entries do overlay.

    - Lê imagens base de pages_dir/page_NNN.jpg
    - Salva PNGs derivados em output_dir/inpaint_pages/page_NNN.png
    - NUNCA modifica as imagens de origem
    - Retorna manifesto com status por página
    """
    inpaint_dir = output_dir / "inpaint_pages"
    inpaint_dir.mkdir(parents=True, exist_ok=True)

    pages_result: list[dict] = []
    inpainted_count = 0

    for page in overlay_data.get("pages", []):
        page_num = page.get("page_number", 0)
        img_path_serve = page.get("image_path")
        blocks = page.get("blocks", [])

        entry: dict[str, Any] = {
            "page_number": page_num,
            "inpainted_path": None,
            "serve_path": None,
            "masked_blocks": 0,
            "algorithm_used": "",
            "warnings": [],
            "error": None,
        }

        if not img_path_serve:
            entry["error"] = "Sem imagem de base — página ignorada."
            pages_result.append(entry)
            continue

        img_filename = Path(img_path_serve).name
        base_img_path = pages_dir / img_filename

        if not base_img_path.exists():
            entry["error"] = f"Imagem base não encontrada: {img_filename}"
            pages_result.append(entry)
            continue

        # Contar blocos que entrarão na máscara
        _statuses = statuses if statuses is not None else _DEFAULT_STATUSES
        masked = [
            b for b in blocks
            if b.get("overlay_visibility", True)
            and b.get("review_status", "pending") in _statuses
            and (b.get("overlay_position") or b.get("bbox"))
        ]
        entry["masked_blocks"] = len(masked)

        out_filename = f"page_{page_num:03d}.png"
        out_path = inpaint_dir / out_filename

        png_bytes, page_warnings, algo_used = inpaint_page(
            base_img_path,
            blocks,
            algorithm=algorithm,
            mask_padding=mask_padding,
            inpaint_radius=inpaint_radius,
            feather=feather,
            statuses=statuses,
        )
        entry["warnings"] = page_warnings
        entry["algorithm_used"] = algo_used

        if png_bytes is None:
            entry["error"] = page_warnings[0] if page_warnings else "Erro desconhecido."
        else:
            out_path.write_bytes(png_bytes)
            entry["inpainted_path"] = str(out_path)
            entry["serve_path"] = (
                f"/storage/output/{job_id}/inpaint_pages/{out_filename}"
            )
            inpainted_count += 1

        pages_result.append(entry)

    return {
        "job_id": job_id,
        "source_language": overlay_data.get("source_language", ""),
        "target_language": overlay_data.get("target_language", ""),
        "total_pages": len(pages_result),
        "inpainted_pages": inpainted_count,
        "params": {
            "algorithm": algorithm,
            "mask_padding": mask_padding,
            "inpaint_radius": inpaint_radius,
            "feather": feather,
        },
        "pages": pages_result,
        "zip_path": None,
    }


# ---------------------------------------------------------------------------
# Exportação ZIP
# ---------------------------------------------------------------------------

def export_inpaint_zip(manifest: InpaintManifestDict, output_dir: Path, job_id: int) -> str:
    """Empacota os PNGs inpaintados em ZIP. Retorna serve path."""
    zip_path = output_dir / "inpaint_pages.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for page in manifest.get("pages", []):
            ip = page.get("inpainted_path")
            if ip and Path(ip).exists():
                zf.write(ip, arcname=Path(ip).name)
    return f"/storage/output/{job_id}/inpaint_pages.zip"


# ---------------------------------------------------------------------------
# Persistência do manifesto
# ---------------------------------------------------------------------------

def load_inpaint_manifest(path: Path) -> InpaintManifestDict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_inpaint_manifest(path: Path, manifest: InpaintManifestDict) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
