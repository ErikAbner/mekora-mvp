"""
Fase P.B — Endpoints de recomendação de preset assistida.

Endpoints:
  GET  /jobs/{job_id}/comic-preset-recommendation
  POST /jobs/{job_id}/comic-preset-recommendation/recommend
  POST /jobs/{job_id}/comic-preset-recommendation/apply
  POST /jobs/{job_id}/comic-preset-recommendation/preview
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import PROJECT_ROOT, STORAGE_OUTPUT
from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import PresetApplyBody, PresetRecommendationResponse
import app.services.comic_preset_recommendation_service as svc
import app.services.comic_consistency_service as consistency_svc
import app.services.comic_finish_service as finish_svc

router = APIRouter(tags=["comic-preset-recommendation"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _output_dir(job_id: int) -> Path:
    return STORAGE_OUTPUT / str(job_id)


# ---------------------------------------------------------------------------
# GET — Carregar recomendação existente
# ---------------------------------------------------------------------------

@router.get(
    "/jobs/{job_id}/comic-preset-recommendation",
    response_model=PresetRecommendationResponse,
)
def get_preset_recommendation(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    rec = svc.load_recommendation(_output_dir(job_id))
    if rec is None:
        raise HTTPException(
            status_code=404,
            detail="Recomendação de preset não encontrada. Execute /recommend primeiro.",
        )
    return {"recommendation": rec}


# ---------------------------------------------------------------------------
# POST /recommend — Gerar recomendação
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/comic-preset-recommendation/recommend",
    response_model=PresetRecommendationResponse,
)
def recommend_preset(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    output_dir = _output_dir(job_id)

    cm = consistency_svc.load_consistency_manifest(output_dir)
    if cm is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de consistência não encontrado. "
                "Execute /comic-consistency/analyze antes de recomendar um preset."
            ),
        )

    fm = finish_svc.load_finish_manifest(output_dir)
    if fm is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de acabamento não encontrado. "
                "Execute a Fase N.A antes de recomendar um preset."
            ),
        )

    existing = svc.load_recommendation(output_dir)
    rec = svc.recommend_preset(
        job_id=job_id,
        consistency_manifest=cm,
        finish_manifest=fm,
        output_dir=output_dir,
        existing_rec=existing,
    )
    return {"recommendation": rec}


# ---------------------------------------------------------------------------
# POST /apply — Aplicar preset ao FinishManifest
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/comic-preset-recommendation/apply",
    response_model=PresetRecommendationResponse,
)
def apply_preset(
    job_id: int,
    body: PresetApplyBody,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    output_dir = _output_dir(job_id)

    rec = svc.load_recommendation(output_dir)
    if rec is None:
        raise HTTPException(
            status_code=404,
            detail="Recomendação não encontrada. Execute /recommend primeiro.",
        )

    cm = consistency_svc.load_consistency_manifest(output_dir)
    if cm is None:
        raise HTTPException(status_code=404, detail="Manifesto de consistência não encontrado.")

    fm = finish_svc.load_finish_manifest(output_dir)
    if fm is None:
        raise HTTPException(status_code=404, detail="Manifesto de acabamento não encontrado.")

    valid_modes = {"apply_to_all_eligible", "apply_to_filtered", "reset_to_previous"}
    if body.mode not in valid_modes:
        raise HTTPException(
            status_code=422,
            detail=f"mode deve ser um de: {sorted(valid_modes)}",
        )

    from app.services.comic_finish_service import VALID_PRESETS
    if body.mode != "reset_to_previous" and body.preset not in VALID_PRESETS:
        raise HTTPException(
            status_code=422,
            detail=f"Preset '{body.preset}' inválido.",
        )

    updated_rec, updated_fm = svc.apply_preset_recommendation(
        job_id=job_id,
        recommendation=rec,
        finish_manifest=fm,
        consistency_manifest=cm,
        output_dir=output_dir,
        preset=body.preset,
        mode=body.mode,
        target_pages=body.target_pages,
    )

    # Persiste o FinishManifest atualizado
    finish_svc.save_finish_manifest(updated_fm, output_dir)

    return {"recommendation": updated_rec}


# ---------------------------------------------------------------------------
# POST /preview — Gerar thumbnails de preview
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/comic-preset-recommendation/preview",
    response_model=PresetRecommendationResponse,
)
def preview_preset(
    job_id: int,
    preset: str = Query(..., description="Nome do preset para preview"),
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    output_dir = _output_dir(job_id)

    from app.services.comic_finish_service import VALID_PRESETS
    if preset not in VALID_PRESETS:
        raise HTTPException(status_code=422, detail=f"Preset '{preset}' inválido.")

    fm = finish_svc.load_finish_manifest(output_dir)
    if fm is None:
        raise HTTPException(status_code=404, detail="Manifesto de acabamento não encontrado.")

    preview_entries = svc.generate_preset_previews(
        job_id=job_id,
        finish_manifest=fm,
        preset_name=preset,
        output_dir=output_dir,
        project_root=PROJECT_ROOT,
    )

    # Atualiza preview_entries no manifesto de recomendação
    rec = svc.load_recommendation(output_dir) or {
        "job_id": job_id,
        "recommended_preset": preset,
        "alternatives": [],
        "reasons": [],
        "confidence_score": 0.0,
        "page_level_exceptions": [],
        "applied_preset": None,
        "manual_overrides_present": False,
        "recommended_at": None,
        "applied_at": None,
    }
    rec["preview_entries"] = preview_entries
    svc.save_recommendation(output_dir, rec)

    return {"recommendation": rec}
