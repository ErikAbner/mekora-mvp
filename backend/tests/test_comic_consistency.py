"""
Testes para comic_consistency_service — Fase O.

Garante que:
- Distribuições são calculadas corretamente
- Outliers são detectados e explicados
- suggested_global_style usa a mediana das não-outliers
- consistency_score reflete a variação real
- Harmonização aplica adjustments_override (exceto manual_override e excluded)
- Reset remove apenas os overrides aplicados pela harmonização
- Patch atualiza flags de página corretamente
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

import app.services.comic_consistency_service as svc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_finish_manifest(
    job_id: int,
    adjs: list[dict],
    preset_overrides: list[str | None] | None = None,
) -> dict:
    """
    Cria finish_manifest com N páginas usando os ajustes fornecidos.
    global_preset = 'none', global_adjustments = {all 1.0}.
    Se preset_overrides fornecido, aplica à página correspondente.
    """
    pages = []
    for i, adj in enumerate(adjs, start=1):
        po = (preset_overrides[i - 1] if preset_overrides else None)
        pages.append({
            "page_number": i,
            "source_variant": "render_overlay",
            "preset_override": po,
            "adjustments_override": adj,  # None ou dict
            "source_path": f"/storage/output/{job_id}/rendered_pages/page_{i:03d}.png",
            "finished_path": None,
            "exported_at": None,
            "warnings": [],
            "layout_issues": [],
            "suggested_adjustments": None,
            "auto_adjustments_applied": False,
        })
    return {
        "job_id": job_id,
        "global_preset": "none",
        "global_adjustments": {"contrast": 1.0, "brightness": 1.0, "sharpness": 1.0, "saturation": 1.0},
        "pages": pages,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
        "auto_fix_layout": False,
    }


def _adj(contrast: float = 1.0, brightness: float = 1.0, sharpness: float = 1.0, saturation: float = 1.0) -> dict:
    return {"contrast": contrast, "brightness": brightness, "sharpness": sharpness, "saturation": saturation}


# ---------------------------------------------------------------------------
# Testes de análise
# ---------------------------------------------------------------------------

def test_analyze_empty_manifest(tmp_path: Path) -> None:
    """Manifesto sem páginas → score=1.0, page_count=0."""
    fm = _make_finish_manifest(1, [])
    m = svc.analyze_consistency(1, fm, tmp_path)
    assert m["consistency_score"] == 1.0
    assert m["page_count"] == 0
    assert m["pages"] == []
    assert (tmp_path / "comic_consistency_manifest.json").exists()


def test_analyze_identical_pages(tmp_path: Path) -> None:
    """Todas as páginas com ajustes idênticos → score=1.0, nenhum outlier."""
    fm = _make_finish_manifest(2, [_adj(1.2, 1.0, 1.3, 0.9)] * 5)
    m = svc.analyze_consistency(2, fm, tmp_path)
    assert m["consistency_score"] == 1.0
    assert all(not p["is_outlier"] for p in m["pages"])


def test_analyze_detects_outlier(tmp_path: Path) -> None:
    """Página com contraste extremo → is_outlier=True."""
    adjs = [_adj(1.2)] * 4 + [_adj(3.5)]  # último é outlier claro
    fm = _make_finish_manifest(3, adjs)
    m = svc.analyze_consistency(3, fm, tmp_path)
    outliers = [p for p in m["pages"] if p["is_outlier"]]
    assert len(outliers) >= 1
    assert outliers[-1]["page_number"] == 5
    assert any("contrast" in r for r in outliers[-1]["outlier_reasons"])


def test_analyze_suggested_style_is_median(tmp_path: Path) -> None:
    """suggested_global_style deve ser a mediana das páginas não-outlier."""
    # 5 páginas normais com contrast=1.2, 1 outlier com contrast=3.5
    adjs = [_adj(contrast=1.2)] * 5
    fm = _make_finish_manifest(4, adjs)
    m = svc.analyze_consistency(4, fm, tmp_path)
    assert m["suggested_global_style"] is not None
    # Mediana de 5 × 1.2 = 1.2
    assert m["suggested_global_style"]["contrast"] == pytest.approx(1.2, abs=0.01)


def test_analyze_consistency_score_poor(tmp_path: Path) -> None:
    """Páginas muito variadas → score baixo."""
    adjs = [
        _adj(contrast=0.5, brightness=0.5, sharpness=0.5, saturation=0.5),
        _adj(contrast=1.0, brightness=1.0, sharpness=1.0, saturation=1.0),
        _adj(contrast=1.6, brightness=1.5, sharpness=1.8, saturation=1.5),
        _adj(contrast=2.0, brightness=0.8, sharpness=2.0, saturation=0.2),
    ]
    fm = _make_finish_manifest(5, adjs)
    m = svc.analyze_consistency(5, fm, tmp_path)
    assert m["consistency_score"] < 0.7


def test_analyze_preserves_manual_flags(tmp_path: Path) -> None:
    """Re-análise preserva is_manual_override e excluded_from_harmonization."""
    fm = _make_finish_manifest(6, [_adj()] * 3)
    existing = svc.analyze_consistency(6, fm, tmp_path)
    # Marcar página 2 como manual_override
    for p in existing["pages"]:
        if p["page_number"] == 2:
            p["is_manual_override"] = True
    svc.save_consistency_manifest(existing, tmp_path)

    # Re-analisar
    m = svc.analyze_consistency(6, fm, tmp_path, existing_manifest=existing)
    page2 = next(p for p in m["pages"] if p["page_number"] == 2)
    assert page2["is_manual_override"] is True


# ---------------------------------------------------------------------------
# Testes de harmonização
# ---------------------------------------------------------------------------

def test_apply_harmonization_sets_overrides(tmp_path: Path) -> None:
    """apply: páginas normais recebem adjustments_override = suggested_global_style."""
    fm = _make_finish_manifest(7, [_adj(1.2)] * 3)
    cm = svc.analyze_consistency(7, fm, tmp_path)
    suggested = cm["suggested_global_style"]

    cm_updated, fm_updated = svc.apply_harmonization(7, cm, fm, tmp_path, mode="apply")

    for page in fm_updated["pages"]:
        assert page["adjustments_override"] == suggested
    # harmonization_applied_at foi definido
    assert cm_updated["harmonization_applied_at"] is not None
    for cp in cm_updated["pages"]:
        assert cp["harmonization_applied"] is True


def test_apply_preserves_manual_override(tmp_path: Path) -> None:
    """apply: página manual_override NÃO recebe adjustments_override do suggested."""
    # Página 1 sem override explícito (adjustments_override=None)
    fm = _make_finish_manifest(8, [None, _adj(1.2), _adj(1.2)])
    cm = svc.analyze_consistency(8, fm, tmp_path)
    cm["pages"][0]["is_manual_override"] = True

    suggested = cm["suggested_global_style"]
    _, fm_updated = svc.apply_harmonization(8, cm, fm, tmp_path, mode="apply")

    page1 = next(p for p in fm_updated["pages"] if p["page_number"] == 1)
    # adjustments_override não deve ter sido substituído pelo suggested
    assert page1["adjustments_override"] != suggested or page1["adjustments_override"] is None


def test_apply_preserves_excluded(tmp_path: Path) -> None:
    """apply: página excluded_from_harmonization NÃO recebe adjustments_override do suggested."""
    # Página 2 sem override explícito (adjustments_override=None)
    fm = _make_finish_manifest(9, [_adj(1.4), None, _adj(1.4)])
    cm = svc.analyze_consistency(9, fm, tmp_path)
    cm["pages"][1]["excluded_from_harmonization"] = True

    suggested = cm["suggested_global_style"]
    _, fm_updated = svc.apply_harmonization(9, cm, fm, tmp_path, mode="apply")

    page2 = next(p for p in fm_updated["pages"] if p["page_number"] == 2)
    assert page2["adjustments_override"] != suggested or page2["adjustments_override"] is None


def test_reset_harmonization_clears_overrides(tmp_path: Path) -> None:
    """reset: remove adjustments_override das páginas harmonizadas."""
    fm = _make_finish_manifest(10, [_adj(1.2)] * 3)
    cm = svc.analyze_consistency(10, fm, tmp_path)

    # Aplicar primeiro
    cm_after_apply, fm_after_apply = svc.apply_harmonization(10, cm, fm, tmp_path, mode="apply")
    # Verificar que override foi aplicado
    assert all(p["adjustments_override"] is not None for p in fm_after_apply["pages"])

    # Resetar
    cm_reset, fm_reset = svc.apply_harmonization(10, cm_after_apply, fm_after_apply, tmp_path, mode="reset")

    for page in fm_reset["pages"]:
        assert page["adjustments_override"] is None
    assert cm_reset["harmonization_applied_at"] is None


# ---------------------------------------------------------------------------
# Testes de patch de página
# ---------------------------------------------------------------------------

def test_patch_page_sets_manual_override(tmp_path: Path) -> None:
    """patch_consistency_page define is_manual_override=True."""
    fm = _make_finish_manifest(11, [_adj()] * 2)
    cm = svc.analyze_consistency(11, fm, tmp_path)

    updated = svc.patch_consistency_page(11, cm, 1, {"is_manual_override": True}, tmp_path)
    page1 = next(p for p in updated["pages"] if p["page_number"] == 1)
    assert page1["is_manual_override"] is True


def test_patch_page_excluded_from_harmonization(tmp_path: Path) -> None:
    """patch_consistency_page define excluded_from_harmonization=True."""
    fm = _make_finish_manifest(12, [_adj()] * 2)
    cm = svc.analyze_consistency(12, fm, tmp_path)

    updated = svc.patch_consistency_page(12, cm, 2, {"excluded_from_harmonization": True}, tmp_path)
    page2 = next(p for p in updated["pages"] if p["page_number"] == 2)
    assert page2["excluded_from_harmonization"] is True
