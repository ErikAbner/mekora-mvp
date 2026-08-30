"""
Fase Q — Endpoints de health check e reparação por job.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import STORAGE_OUTPUT
from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import JobHealthResponse, JobRepairResponse, PipelineStateResponse
import app.services.job_state_service as svc

router = APIRouter(tags=["job-health"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _output_dir(job_id: int) -> Path:
    return STORAGE_OUTPUT / str(job_id)


def _job_to_dict(job: ProcessingJob) -> dict:
    """Converte ORM para dict compatível com job_state_service."""
    return {
        "id": job.id,
        "status": job.status,
        "input_path": job.input_path,
        "processing_mode": getattr(job, "processing_mode", "document"),
        "conversion_status": getattr(job, "conversion_status", ""),
    }


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/health
# ---------------------------------------------------------------------------


@router.get("/jobs/{job_id}/health", response_model=JobHealthResponse)
def get_job_health(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    job = _get_job_or_404(db, job_id)
    result = svc.get_job_health(_job_to_dict(job), _output_dir(job_id))
    return {
        "job_id": job_id,
        **result,
    }


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/repair
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/repair", response_model=JobRepairResponse)
def repair_job(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    job = _get_job_or_404(db, job_id)
    result = svc.repair_job(_job_to_dict(job), _output_dir(job_id))
    health = result["health"]
    return {
        "job_id": job_id,
        "repaired": result["repaired"],
        "not_repaired": result["not_repaired"],
        "health": {
            "job_id": job_id,
            **health,
        },
    }


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/pipeline-state — Estabilização v1 (gating da UI comic)
# ---------------------------------------------------------------------------


@router.get("/jobs/{job_id}/pipeline-state", response_model=PipelineStateResponse)
def get_pipeline_state(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """Estado por etapa do pipeline comic (done/available/blocked)."""
    from app.core.config import STORAGE_OUTPUT as _out  # lazy p/ testes

    job = _get_job_or_404(db, job_id)
    job_dict = {
        "id": job.id,
        "status": job.status,
        "processing_mode": getattr(job, "processing_mode", "document"),
        "comic_translation_status": getattr(job, "comic_translation_status", ""),
        "comic_export_status": getattr(job, "comic_export_status", ""),
    }
    result = svc.get_comic_pipeline_state(job_dict, _out / str(job_id))
    return {"job_id": job_id, **result}
