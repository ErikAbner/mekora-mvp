"""
Fase P.B — Testes do serviço de recomendação de preset.
"""
import pytest
from pathlib import Path

from app.services.comic_preset_recommendation_service import (
    _score_preset,
    recommend_preset,
    apply_preset_recommendation,
    load_recommendation,
    save_recommendation,
    _sample_indices,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cm(sat_mean=1.0, contrast_std=0.05, score_combined=0.85,
        pages=None, image_metrics_list=None):
    """Constrói um ConsistencyManifest mínimo para testes."""
    pgs = pages or []
    if image_metrics_list:
        pgs = [
            {
                "page_number": i + 1,
                "is_manual_override": False,
                "image_metrics": m,
            }
            for i, m in enumerate(image_metrics_list)
        ]
    return {
        "job_id": 1,
        "consistency_score": score_combined,
        "consistency_score_combined": score_combined,
        "stat_distributions": {
            "saturation": {"mean": sat_mean, "std": 0.01, "min": 0.0, "max": 1.0},
            "contrast":   {"mean": 1.2, "std": contrast_std, "min": 1.0, "max": 1.5},
        },
        "pages": pgs,
    }


def _fm(pages=None):
    """Constrói um FinishManifest mínimo para testes."""
    return {
        "job_id": 1,
        "global_preset": "none",
        "global_adjustments": {"contrast": 1.0, "brightness": 1.0, "sharpness": 1.0, "saturation": 1.0},
        "pages": pages or [
            {"page_number": 1, "source_variant": "original", "preset_override": None,
             "adjustments_override": None, "source_path": None, "finished_path": None},
            {"page_number": 2, "source_variant": "original", "preset_override": None,
             "adjustments_override": None, "source_path": None, "finished_path": None},
        ],
    }


# ---------------------------------------------------------------------------
# Testes de heurística (_score_preset)
# ---------------------------------------------------------------------------

def test_recommend_manga_bw():
    """Saturação muito baixa → clean_manga_bw com confiança ≥ 0.80."""
    cm = _cm(sat_mean=0.05)
    preset, reasons, conf, alts = _score_preset(cm)
    assert preset == "clean_manga_bw"
    assert conf >= 0.80
    assert any("saturação" in r for r in reasons)
    assert "manga_bw_high_contrast" in alts


def test_recommend_high_contrast_overlay():
    """Score combinado baixo e desvio de contraste alto → high_contrast_overlay."""
    cm = _cm(sat_mean=0.9, contrast_std=0.25, score_combined=0.45)
    preset, reasons, conf, alts = _score_preset(cm)
    assert preset == "high_contrast_overlay"
    assert conf >= 0.65
    assert any("consistência" in r or "contraste" in r for r in reasons)


def test_recommend_no_visual_data():
    """Sem image_metrics → heurística paramétrica continua funcionando."""
    cm = _cm(sat_mean=0.8, score_combined=0.82)
    preset, reasons, conf, alts = _score_preset(cm)
    # Não explode; retorna algum preset válido com razões
    assert preset in {
        "none", "clean_manga_bw", "manga_bw_high_contrast", "comic_caption_box",
        "soft_subtitle_box", "high_contrast_overlay", "subtitle_minimal", "dense_text_compact",
    }
    assert len(reasons) > 0
    assert 0.0 <= conf <= 1.0


def test_recommend_identifies_exceptions(tmp_path):
    """Páginas com is_manual_override=True devem aparecer em page_level_exceptions."""
    cm = _cm(
        sat_mean=0.9,
        pages=[
            {"page_number": 1, "is_manual_override": True,  "image_metrics": None},
            {"page_number": 2, "is_manual_override": False, "image_metrics": None},
        ],
    )
    fm = _fm()
    rec = recommend_preset(job_id=1, consistency_manifest=cm, finish_manifest=fm,
                           output_dir=tmp_path, existing_rec=None)
    assert rec["manual_overrides_present"] is True
    assert any(e["page_number"] == 1 for e in rec["page_level_exceptions"])
    assert not any(e["page_number"] == 2 for e in rec["page_level_exceptions"])


# ---------------------------------------------------------------------------
# Testes de aplicação
# ---------------------------------------------------------------------------

def test_apply_all_eligible(tmp_path):
    """apply_to_all_eligible → global_preset atualizado, applied_preset salvo."""
    cm = _cm()
    fm = _fm()
    rec = {
        "job_id": 1, "recommended_preset": "clean_manga_bw", "alternatives": [],
        "reasons": [], "confidence_score": 0.85, "page_level_exceptions": [],
        "applied_preset": None, "manual_overrides_present": False,
        "recommended_at": None, "applied_at": None, "preview_entries": [],
    }
    updated_rec, updated_fm = apply_preset_recommendation(
        job_id=1, recommendation=rec, finish_manifest=fm,
        consistency_manifest=cm, output_dir=tmp_path,
        preset="clean_manga_bw", mode="apply_to_all_eligible",
    )
    assert updated_fm["global_preset"] == "clean_manga_bw"
    assert updated_rec["applied_preset"] == "clean_manga_bw"
    assert updated_rec["applied_at"] is not None


def test_apply_preserves_adjustments_override(tmp_path):
    """Páginas com adjustments_override NÃO devem ter preset_override alterado."""
    fm = _fm(pages=[
        {"page_number": 1, "source_variant": "original", "preset_override": None,
         "adjustments_override": {"contrast": 1.5, "brightness": 1.0, "sharpness": 1.0, "saturation": 0.0},
         "source_path": None, "finished_path": None},
        {"page_number": 2, "source_variant": "original", "preset_override": None,
         "adjustments_override": None, "source_path": None, "finished_path": None},
    ])
    cm = _cm()
    rec = {
        "job_id": 1, "recommended_preset": "comic_caption_box",
        "alternatives": [], "reasons": [], "confidence_score": 0.6,
        "page_level_exceptions": [], "applied_preset": None,
        "manual_overrides_present": False, "recommended_at": None,
        "applied_at": None, "preview_entries": [],
    }
    _, updated_fm = apply_preset_recommendation(
        job_id=1, recommendation=rec, finish_manifest=fm,
        consistency_manifest=cm, output_dir=tmp_path,
        preset="comic_caption_box", mode="apply_to_filtered",
        target_pages=[1, 2],
    )
    # Página 1 tem adjustments_override → preset_override NÃO deve ser tocado
    page1 = next(p for p in updated_fm["pages"] if p["page_number"] == 1)
    assert page1["preset_override"] is None
    # Página 2 sem adjustments_override → preset_override setado
    page2 = next(p for p in updated_fm["pages"] if p["page_number"] == 2)
    assert page2["preset_override"] == "comic_caption_box"


def test_apply_to_filtered(tmp_path):
    """apply_to_filtered → apenas target_pages recebem preset_override."""
    fm = _fm(pages=[
        {"page_number": 1, "source_variant": "original", "preset_override": None,
         "adjustments_override": None, "source_path": None, "finished_path": None},
        {"page_number": 2, "source_variant": "original", "preset_override": None,
         "adjustments_override": None, "source_path": None, "finished_path": None},
        {"page_number": 3, "source_variant": "original", "preset_override": None,
         "adjustments_override": None, "source_path": None, "finished_path": None},
    ])
    cm = _cm()
    rec = {
        "job_id": 1, "recommended_preset": "subtitle_minimal",
        "alternatives": [], "reasons": [], "confidence_score": 0.5,
        "page_level_exceptions": [], "applied_preset": None,
        "manual_overrides_present": False, "recommended_at": None,
        "applied_at": None, "preview_entries": [],
    }
    _, updated_fm = apply_preset_recommendation(
        job_id=1, recommendation=rec, finish_manifest=fm,
        consistency_manifest=cm, output_dir=tmp_path,
        preset="subtitle_minimal", mode="apply_to_filtered",
        target_pages=[1, 3],
    )
    page1 = next(p for p in updated_fm["pages"] if p["page_number"] == 1)
    page2 = next(p for p in updated_fm["pages"] if p["page_number"] == 2)
    page3 = next(p for p in updated_fm["pages"] if p["page_number"] == 3)
    assert page1["preset_override"] == "subtitle_minimal"
    assert page2["preset_override"] is None   # não estava em target_pages
    assert page3["preset_override"] == "subtitle_minimal"


def test_reset_to_previous(tmp_path):
    """reset_to_previous → global_preset='none', applied_preset=None."""
    fm = _fm()
    fm["global_preset"] = "clean_manga_bw"
    # Simular páginas com preset_override setado anteriormente
    fm["pages"][0]["preset_override"] = "clean_manga_bw"
    fm["pages"][1]["preset_override"] = "clean_manga_bw"

    cm = _cm()
    rec = {
        "job_id": 1, "recommended_preset": "clean_manga_bw",
        "alternatives": [], "reasons": [], "confidence_score": 0.85,
        "page_level_exceptions": [], "applied_preset": "clean_manga_bw",
        "manual_overrides_present": False,
        "recommended_at": "2026-03-30T12:00:00+00:00",
        "applied_at": "2026-03-30T12:05:00+00:00",
        "preview_entries": [],
    }
    updated_rec, updated_fm = apply_preset_recommendation(
        job_id=1, recommendation=rec, finish_manifest=fm,
        consistency_manifest=cm, output_dir=tmp_path,
        preset="none", mode="reset_to_previous",
    )
    assert updated_fm["global_preset"] == "none"
    assert updated_rec["applied_preset"] is None
    assert updated_rec["applied_at"] is None
    for page in updated_fm["pages"]:
        assert page["preset_override"] is None


# ---------------------------------------------------------------------------
# Teste auxiliar
# ---------------------------------------------------------------------------

def test_sample_indices():
    assert _sample_indices(0, 3) == []
    assert _sample_indices(1, 3) == [0]
    assert _sample_indices(3, 3) == [0, 1, 2]
    indices = _sample_indices(10, 3)
    assert indices[0] == 0
    assert indices[-1] == 9
    assert len(indices) == 3
