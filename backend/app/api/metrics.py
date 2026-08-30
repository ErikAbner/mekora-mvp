"""
Fase L — Endpoints de métricas do pipeline.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.metrics_service import (
    get_job_timeline,
    get_recent_failures,
    get_stages_stats,
    get_summary,
    get_usage_distribution,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary")
def metrics_summary(db: Session = Depends(get_db)) -> dict:
    return get_summary(db)


@router.get("/stages")
def metrics_stages(db: Session = Depends(get_db)) -> list:
    return get_stages_stats(db)


@router.get("/failures")
def metrics_failures(db: Session = Depends(get_db)) -> list:
    return get_recent_failures(db)


@router.get("/usage")
def metrics_usage(db: Session = Depends(get_db)) -> dict:
    return get_usage_distribution(db)


@router.get("/jobs/{job_id}")
def metrics_job_timeline(job_id: int, db: Session = Depends(get_db)) -> list:
    entries = get_job_timeline(db, job_id)
    if not entries:
        raise HTTPException(status_code=404, detail="Nenhuma métrica encontrada para este job.")
    return entries
