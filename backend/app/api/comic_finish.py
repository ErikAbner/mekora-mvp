"""
Fase N.A — Endpoints de acabamento visual assistido.

NÃO sobrescreve imagens originais, render_overlay, inpaint nem final_pages.
Cria e gerencia comic_finish_manifest.json com ajustes por página.
Exporta páginas finalizadas em finished_pages/ + ZIP + CBZ + PDF.
"""
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import PROJECT_ROOT, STORAGE_OUTPUT
from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import FinishGlobalPatch, FinishManifest, FinishResponse
import app.services.comic_finish_service as svc

router = APIRouter(tags=["comic-finish"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _output_dir(job_id: int) -> Path:
    return STORAGE_OUTPUT / str(job_id)


def _final_manifest_path(job_id: int) -> Path:
    return _output_dir(job_id) / "comic_final_manifest.json"


def _load_final_manifest(job_id: int) -> dict:
    import json

    p = _final_manifest_path(job_id)
    if not p.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "comic_final_manifest.json não encontrado. "
                "Execute a Fase I.B (curadoria) antes do acabamento."
            ),
        )
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def _compute_quality_score(manifest: dict) -> Optional[int]:
    """
    Calcula score de qualidade 0–100 a partir dos layout_issues do manifesto.
    Retorna None se a análise ainda não foi executada (analyzed_at ausente).
    """
    if not manifest.get("analyzed_at"):
        return None
    pages = manifest.get("pages", [])
    if not pages:
        return None
    deductions = 0
    for page in pages:
        for issue in page.get("layout_issues", []):
            sev = issue.get("severity", "warning")
            deductions += 10 if sev == "error" else 5
    return max(0, 100 - deductions)


def _to_response(manifest: dict) -> dict:
    return {"manifest": manifest, "quality_score": _compute_quality_score(manifest)}


# ---------------------------------------------------------------------------
# GET — Carregar manifesto de acabamento
# ---------------------------------------------------------------------------


@router.get("/jobs/{job_id}/comic-finish", response_model=FinishResponse)
def get_comic_finish(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    m = svc.load_finish_manifest(_output_dir(job_id))
    if m is None:
        raise HTTPException(
            status_code=404,
            detail="Manifesto de acabamento não encontrado. Inicialize primeiro.",
        )
    return _to_response(m)


# ---------------------------------------------------------------------------
# POST — Inicializar manifesto de acabamento
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/comic-finish", response_model=FinishResponse, status_code=201)
def init_comic_finish(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    final_manifest = _load_final_manifest(job_id)
    m = svc.initialize_finish_manifest(job_id, final_manifest, _output_dir(job_id))
    return _to_response(m)


# ---------------------------------------------------------------------------
# PATCH — Atualizar ajustes globais e/ou por página
# ---------------------------------------------------------------------------


@router.patch("/jobs/{job_id}/comic-finish", response_model=FinishResponse)
def patch_comic_finish(
    job_id: int,
    body: FinishGlobalPatch,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    manifest = svc.load_finish_manifest(_output_dir(job_id))
    if manifest is None:
        raise HTTPException(status_code=404, detail="Manifesto de acabamento não encontrado.")

    try:
        updated = svc.apply_finish_patches(manifest, body.model_dump(exclude_none=False))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    svc.save_finish_manifest(updated, _output_dir(job_id))
    return _to_response(updated)


# ---------------------------------------------------------------------------
# POST /export — Gerar finished_pages
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/comic-finish/export", response_model=FinishResponse)
def export_comic_finish(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    manifest = svc.load_finish_manifest(_output_dir(job_id))
    if manifest is None:
        raise HTTPException(status_code=404, detail="Manifesto de acabamento não encontrado.")

    updated = svc.export_finished_pages(
        job_id=job_id,
        manifest=manifest,
        output_dir=_output_dir(job_id),
        project_root=PROJECT_ROOT,
    )
    return _to_response(updated)


# ---------------------------------------------------------------------------
# POST /analyze — Detectar problemas de layout (Fase N.B)
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/comic-finish/analyze", response_model=FinishResponse)
def analyze_comic_finish_layout(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    manifest = svc.load_finish_manifest(_output_dir(job_id))
    if manifest is None:
        raise HTTPException(status_code=404, detail="Manifesto de acabamento não encontrado.")

    updated = svc.analyze_finish_layout(
        job_id=job_id,
        manifest=manifest,
        output_dir=_output_dir(job_id),
        project_root=PROJECT_ROOT,
    )
    return _to_response(updated)
