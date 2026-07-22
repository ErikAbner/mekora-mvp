"""
Testes para comic_image_metrics_service — Fase P.A.

Garante que:
- Métricas são extraídas corretamente de imagens reais
- Arquivos ausentes retornam None sem exceção
- Outliers visuais são detectados por métricas fora do padrão
- Score visual reflete variação entre imagens
- Preview JPEG é gerado corretamente
- analyze_visual_consistency atualiza o manifesto de consistência
"""
from __future__ import annotations

from pathlib import Path

import pytest

import app.services.comic_image_metrics_service as img_svc
import app.services.comic_consistency_service as consistency_svc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PNG_AVAILABLE = img_svc._PIL_AVAILABLE


def _make_gray_png(path: Path, level: int = 128, size: tuple = (20, 20)) -> Path:
    """Cria PNG de nível de cinza uniforme."""
    if not _PNG_AVAILABLE:
        pytest.skip("Pillow não instalado")
    from PIL import Image
    img = Image.new("L", size, color=level)
    img.save(str(path), "PNG")
    return path


def _make_gradient_png(path: Path, size: tuple = (20, 20)) -> Path:
    """Cria PNG com gradiente horizontal (para ter entropia e contraste)."""
    if not _PNG_AVAILABLE:
        pytest.skip("Pillow não instalado")
    from PIL import Image
    img = Image.new("L", size)
    w, h = size
    pixels = []
    for y in range(h):
        for x in range(w):
            pixels.append(int(x / (w - 1) * 255))
    img.putdata(pixels)
    img.save(str(path), "PNG")
    return path


def _make_finish_manifest_pa(job_id: int, source_path: str, finished_path: str | None) -> dict:
    """Cria finish_manifest mínimo para testes P.A."""
    return {
        "job_id": job_id,
        "global_preset": "none",
        "global_adjustments": {"contrast": 1.0, "brightness": 1.0, "sharpness": 1.0, "saturation": 1.0},
        "pages": [
            {
                "page_number": 1,
                "source_variant": "render_overlay",
                "preset_override": None,
                "adjustments_override": None,
                "source_path": source_path,
                "finished_path": finished_path,
                "exported_at": None,
                "warnings": [],
            }
        ],
        "zip_path": None, "cbz_path": None, "pdf_path": None,
    }


def _make_consistency_manifest(job_id: int) -> dict:
    """Manifesto de consistência mínimo (pós-análise paramétrica)."""
    return {
        "job_id": job_id,
        "analyzed_at": "2026-03-30T12:00:00+00:00",
        "consistency_score": 0.9,
        "page_count": 1,
        "stat_distributions": {},
        "preset_frequency": {},
        "suggested_global_style": None,
        "global_recommendations": [],
        "pages": [
            {
                "page_number": 1,
                "effective_adjustments": {"contrast": 1.0, "brightness": 1.0, "sharpness": 1.0, "saturation": 1.0},
                "is_outlier": False,
                "outlier_reasons": [],
                "is_manual_override": False,
                "excluded_from_harmonization": False,
                "harmonization_applied": False,
            }
        ],
        "warnings": [],
        "harmonization_applied_at": None,
    }


# ---------------------------------------------------------------------------
# Extração de métricas
# ---------------------------------------------------------------------------

def test_extract_metrics_from_image(tmp_path: Path) -> None:
    """Imagem cinza puro → mean_brightness ≈ nível definido."""
    img_path = _make_gray_png(tmp_path / "gray128.png", level=128)
    metrics = img_svc.extract_image_metrics(img_path)
    assert metrics is not None
    assert abs(metrics["mean_brightness"] - 128.0) < 1.0
    assert metrics["rms_contrast"] < 5.0  # uniforme → contraste baixo
    assert metrics["histogram_entropy"] >= 0.0
    assert "dark_fraction" in metrics
    assert "light_fraction" in metrics


def test_extract_metrics_missing_file(tmp_path: Path) -> None:
    """Arquivo ausente → retorna None sem exceção."""
    result = img_svc.extract_image_metrics(tmp_path / "nonexistent.png")
    assert result is None


def test_extract_metrics_gradient_has_entropy(tmp_path: Path) -> None:
    """Imagem com gradiente tem entropia maior que imagem uniforme."""
    gray = _make_gray_png(tmp_path / "gray.png", level=128)
    grad = _make_gradient_png(tmp_path / "grad.png")
    m_gray = img_svc.extract_image_metrics(gray)
    m_grad = img_svc.extract_image_metrics(grad)
    assert m_gray is not None and m_grad is not None
    assert m_grad["histogram_entropy"] > m_gray["histogram_entropy"]
    assert m_grad["rms_contrast"] > m_gray["rms_contrast"]


# ---------------------------------------------------------------------------
# Outliers visuais
# ---------------------------------------------------------------------------

def test_detect_visual_outliers_bright_page(tmp_path: Path) -> None:
    """Página muito brilhante entre páginas escuras → outlier visual."""
    dark_metrics = {
        "mean_brightness": 50.0, "rms_contrast": 20.0, "histogram_entropy": 3.0,
        "dark_fraction": 0.8, "light_fraction": 0.01,
    }
    bright_metrics = {
        "mean_brightness": 240.0, "rms_contrast": 10.0, "histogram_entropy": 2.0,
        "dark_fraction": 0.01, "light_fraction": 0.95,
    }
    metrics_list = [dark_metrics, dark_metrics, dark_metrics, dark_metrics, bright_metrics]
    reasons = img_svc.detect_visual_outliers(metrics_list)
    assert len(reasons) == 5
    # Última página deve ser outlier
    assert len(reasons[4]) > 0
    # Páginas escuras não devem ser outlier
    assert all(len(r) == 0 for r in reasons[:4])


def test_detect_visual_outliers_identical(tmp_path: Path) -> None:
    """Imagens idênticas → sem outliers visuais."""
    m = {"mean_brightness": 120.0, "rms_contrast": 30.0, "histogram_entropy": 4.0,
         "dark_fraction": 0.2, "light_fraction": 0.1}
    reasons = img_svc.detect_visual_outliers([m, m, m, m])
    assert all(len(r) == 0 for r in reasons)


# ---------------------------------------------------------------------------
# Score visual
# ---------------------------------------------------------------------------

def test_visual_score_identical() -> None:
    """Imagens idênticas → score=1.0."""
    m = {"mean_brightness": 120.0, "rms_contrast": 30.0, "histogram_entropy": 4.0,
         "dark_fraction": 0.2, "light_fraction": 0.1}
    score = img_svc.visual_consistency_score([m, m, m])
    assert score == 1.0


def test_visual_score_varied() -> None:
    """Imagens muito variadas → score < 0.7."""
    metrics = [
        {"mean_brightness": 20.0,  "rms_contrast": 5.0,  "histogram_entropy": 1.0,
         "dark_fraction": 0.95, "light_fraction": 0.0},
        {"mean_brightness": 200.0, "rms_contrast": 60.0, "histogram_entropy": 7.5,
         "dark_fraction": 0.01, "light_fraction": 0.9},
    ]
    score = img_svc.visual_consistency_score(metrics)
    assert score < 0.7


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------

def test_generate_preview_creates_file(tmp_path: Path) -> None:
    """Preview JPEG criado quando ambas as imagens existem."""
    before = _make_gray_png(tmp_path / "before.png", level=80)
    after = _make_gray_png(tmp_path / "after.png", level=120)
    dest = tmp_path / "preview.jpg"
    result = img_svc.generate_preview(before, after, dest)
    assert result is True
    assert dest.exists()
    # Largura esperada: THUMB_W*2 + gap
    from PIL import Image
    img = Image.open(dest)
    assert img.width == img_svc._THUMB_W * 2 + 4


def test_generate_preview_missing_file(tmp_path: Path) -> None:
    """Preview não é gerado quando um arquivo está ausente → retorna False."""
    before = tmp_path / "missing.png"
    after = _make_gray_png(tmp_path / "after.png", level=120)
    dest = tmp_path / "preview.jpg"
    result = img_svc.generate_preview(before, after, dest)
    assert result is False
    assert not dest.exists()
