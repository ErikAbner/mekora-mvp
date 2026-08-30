"""
Fase P.A — Métricas visuais de imagem para análise de consistência global.

Funções puras: leitura de imagens e escrita de previews.
Usa apenas Pillow (PIL). Sem IA, sem OpenCV, sem modificação de imagens originais.

Métricas extraídas (todas explicáveis, baseadas em histograma):
  mean_brightness   — luminância média (0–255)
  rms_contrast      — desvio padrão dos pixels de luminância (proxy RMS contrast)
  histogram_entropy — entropia do histograma de níveis de cinza (0–8 bits)
  dark_fraction     — fração de pixels < 64 (escuros)
  light_fraction    — fração de pixels > 192 (claros/saturados)

Preview:
  Miniatura lado a lado: imagem de origem | imagem finalizada.
  Salva como JPEG em consistency_previews/.
"""
from __future__ import annotations

import math
import statistics
from pathlib import Path

_DARK_THRESHOLD = 64
_LIGHT_THRESHOLD = 192
_THUMB_W = 300
_THUMB_H = 400

try:
    from PIL import Image, ImageStat

    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False


# ---------------------------------------------------------------------------
# Extração de métricas
# ---------------------------------------------------------------------------

def extract_image_metrics(image_path: Path) -> dict | None:
    """
    Extrai métricas visuais de uma imagem de forma eficiente (histograma, sem pixel-loop).
    Retorna None se Pillow não estiver instalado ou se a imagem não puder ser lida.
    """
    if not _PIL_AVAILABLE:
        return None
    if not image_path.exists():
        return None

    try:
        img = Image.open(image_path).convert("L")  # escala de cinza
        w, h = img.size
        n = w * h
        if n == 0:
            return None

        # Mean e stddev via ImageStat (sem loop sobre pixels)
        stat = ImageStat.Stat(img)
        mean_brightness: float = stat.mean[0]
        rms_contrast: float = stat.stddev[0]

        # Histograma (256 buckets) — eficiente, já calculado internamente pelo PIL
        hist = img.histogram()

        # Entropia de Shannon (bits)
        entropy = 0.0
        for count in hist:
            if count > 0:
                p = count / n
                entropy -= p * math.log2(p)

        dark_fraction = sum(hist[:_DARK_THRESHOLD]) / n
        light_fraction = sum(hist[_LIGHT_THRESHOLD:]) / n

        return {
            "mean_brightness": round(mean_brightness, 2),
            "rms_contrast": round(rms_contrast, 2),
            "histogram_entropy": round(entropy, 3),
            "dark_fraction": round(dark_fraction, 3),
            "light_fraction": round(light_fraction, 3),
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Detecção de outliers visuais
# ---------------------------------------------------------------------------

_VISUAL_METRIC_KEYS = ("mean_brightness", "rms_contrast", "histogram_entropy")


def detect_visual_outliers(metrics_list: list[dict]) -> list[list[str]]:
    """
    Para cada entrada em metrics_list, retorna lista de motivos de outlier visual.
    Usa o mesmo método Tukey IQR (com fallback mediana±2σ) da análise paramétrica.

    Resultado: reasons[i] para metrics_list[i].
    """
    bounds: dict[str, tuple[float, float]] = {}
    for key in _VISUAL_METRIC_KEYS:
        values = [m[key] for m in metrics_list if key in m]
        bounds[key] = _tukey_bounds(values) if len(values) >= 2 else (-math.inf, math.inf)

    reasons_per: list[list[str]] = []
    for m in metrics_list:
        reasons: list[str] = []
        for key in _VISUAL_METRIC_KEYS:
            if key not in m:
                continue
            v = m[key]
            lo, hi = bounds[key]
            if v < lo or v > hi:
                reasons.append(
                    f"{key}={v:.2f} fora do intervalo [{lo:.2f}, {hi:.2f}]"
                )
        reasons_per.append(reasons)
    return reasons_per


def _tukey_bounds(values: list[float]) -> tuple[float, float]:
    """Cercas de Tukey; fallback mediana±2σ quando IQR=0."""
    n = len(values)
    if n < 2:
        return (-math.inf, math.inf)
    sv = sorted(values)
    if n < 4:
        std = statistics.pstdev(values)
        if std < 1e-9:
            return (-math.inf, math.inf)
        median = sv[n // 2]
        return (median - 2 * std, median + 2 * std)
    q1, q3 = sv[n // 4], sv[(3 * n) // 4]
    iqr = q3 - q1
    if iqr < 1e-9:
        std = statistics.pstdev(values)
        if std < 1e-9:
            return (-math.inf, math.inf)
        median = sv[n // 2]
        return (median - 2 * std, median + 2 * std)
    return (q1 - 1.5 * iqr, q3 + 1.5 * iqr)


# ---------------------------------------------------------------------------
# Score de consistência visual
# ---------------------------------------------------------------------------

def visual_consistency_score(metrics_list: list[dict]) -> float:
    """
    Score 0.0 (inconsistente) a 1.0 (consistente) baseado em CV médio das métricas visuais.
    Chaves: mean_brightness, rms_contrast, histogram_entropy.
    """
    if len(metrics_list) < 2:
        return 1.0

    cvs: list[float] = []
    for key in _VISUAL_METRIC_KEYS:
        values = [m[key] for m in metrics_list if key in m]
        if len(values) < 2:
            continue
        mean = statistics.mean(values)
        std = statistics.pstdev(values)
        # Normalizar pelo range esperado de cada métrica
        normalizer = {"mean_brightness": 128.0, "rms_contrast": 64.0, "histogram_entropy": 4.0}
        ref = normalizer.get(key, max(abs(mean), 1.0))
        cv = std / ref if ref > 0 else std
        cvs.append(cv)

    if not cvs:
        return 1.0

    avg_cv = sum(cvs) / len(cvs)
    return round(max(0.0, min(1.0, 1.0 - avg_cv * 2)), 3)


# ---------------------------------------------------------------------------
# Preview lado a lado
# ---------------------------------------------------------------------------

def generate_preview(before_path: Path, after_path: Path, dest_path: Path) -> bool:
    """
    Gera miniatura lado a lado (before | after) e salva como JPEG.
    Retorna True se bem-sucedido, False em caso de erro.
    """
    if not _PIL_AVAILABLE:
        return False
    if not before_path.exists() or not after_path.exists():
        return False

    try:
        before_thumb = _load_thumbnail(before_path, _THUMB_W, _THUMB_H)
        after_thumb = _load_thumbnail(after_path, _THUMB_W, _THUMB_H)

        gap = 4
        combined = Image.new("RGB", (_THUMB_W * 2 + gap, _THUMB_H), (180, 180, 180))
        combined.paste(before_thumb, (0, 0))
        combined.paste(after_thumb, (_THUMB_W + gap, 0))

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        combined.save(str(dest_path), "JPEG", quality=75)
        return True
    except Exception:
        return False


def _load_thumbnail(path: Path, w: int, h: int) -> "Image.Image":
    """Carrega imagem, redimensiona mantendo proporção, centraliza em fundo cinza."""
    img = Image.open(path).convert("RGB")
    img.thumbnail((w, h), Image.LANCZOS)
    bg = Image.new("RGB", (w, h), (220, 220, 220))
    ox = (w - img.width) // 2
    oy = (h - img.height) // 2
    bg.paste(img, (ox, oy))
    return bg
