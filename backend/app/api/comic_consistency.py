"""
Fase O — Endpoints de consistência visual global.

NÃO sobrescreve imagens originais, render_overlay, inpaint nem final_pages.
Apenas modifica comic_finish_manifest.json (adjustments_override) e
cria/atualiza comic_consistency_manifest.json.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import PROJECT_ROOT, STORAGE_OUTPUT
from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import (
    ConsistencyApplyBody,
    ConsistencyPagePatch,
    ConsistencyResponse,
)
import app.services.comic_consistency_service as svc
import app.services.comic_finish_service as finish_svc

router = APIRouter(tags=["comic-consistency"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _output_dir(job_id: int) -> Path:
    return STORAGE_OUTPUT / str(job_id)


# ---------------------------------------------------------------------------
# GET — Carregar manifesto de consistência
# ---------------------------------------------------------------------------


@router.get("/jobs/{job_id}/comic-consistency", response_model=ConsistencyResponse)
def get_comic_consistency(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    m = svc.load_consistency_manifest(_output_dir(job_id))
    if m is None:
        raise HTTPException(
            status_code=404,
            detail="Manifesto de consistência não encontrado. Execute /analyze primeiro.",
        )
    return {"manifest": m}


# ---------------------------------------------------------------------------
# POST /analyze — Analisar consistência
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/comic-consistency/analyze", response_model=ConsistencyResponse)
def analyze_comic_consistency(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    output_dir = _output_dir(job_id)

    finish_manifest = finish_svc.load_finish_manifest(output_dir)
    if finish_manifest is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de acabamento não encontrado. "
                "Execute a Fase N.A (acabamento visual) antes da análise de consistência."
            ),
        )

    existing = svc.load_consistency_manifest(output_dir)
    m = svc.analyze_consistency(job_id, finish_manifest, output_dir, existing_manifest=existing)
    return {"manifest": m}


# ---------------------------------------------------------------------------
# POST /apply — Aplicar ou desfazer harmonização
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/comic-consistency/apply", response_model=ConsistencyResponse)
def apply_comic_consistency(
    job_id: int,
    body: ConsistencyApplyBody,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    output_dir = _output_dir(job_id)

    cm = svc.load_consistency_manifest(output_dir)
    if cm is None:
        raise HTTPException(
            status_code=404,
            detail="Manifesto de consistência não encontrado. Execute /analyze primeiro.",
        )

    fm = finish_svc.load_finish_manifest(output_dir)
    if fm is None:
        raise HTTPException(
            status_code=404,
            detail="Manifesto de acabamento não encontrado.",
        )

    if body.mode not in ("apply", "reset"):
        raise HTTPException(status_code=422, detail="mode deve ser 'apply' ou 'reset'.")

    cm_updated, _ = svc.apply_harmonization(job_id, cm, fm, output_dir, mode=body.mode)
    return {"manifest": cm_updated}


# ---------------------------------------------------------------------------
# POST /analyze-visual — Análise visual baseada em imagem real (Fase P.A)
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/comic-consistency/analyze-visual", response_model=ConsistencyResponse)
def analyze_visual_consistency(
    job_id: int,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    output_dir = _output_dir(job_id)

    cm = svc.load_consistency_manifest(output_dir)
    if cm is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de consistência não encontrado. "
                "Execute /analyze antes da análise visual."
            ),
        )

    fm = finish_svc.load_finish_manifest(output_dir)
    if fm is None:
        raise HTTPException(
            status_code=404,
            detail="Manifesto de acabamento não encontrado.",
        )

    updated = svc.analyze_visual_consistency(
        job_id=job_id,
        consistency_manifest=cm,
        finish_manifest=fm,
        output_dir=output_dir,
        project_root=PROJECT_ROOT,
    )
    return {"manifest": updated}


# ---------------------------------------------------------------------------
# PATCH /page/{page_number} — Flags de página (manual override / excluir)
# ---------------------------------------------------------------------------


@router.patch(
    "/jobs/{job_id}/comic-consistency/page/{page_number}",
    response_model=ConsistencyResponse,
)
def patch_consistency_page(
    job_id: int,
    page_number: int,
    body: ConsistencyPagePatch,
    db: Session = Depends(get_db),
) -> dict:
    _get_job_or_404(db, job_id)
    output_dir = _output_dir(job_id)

    cm = svc.load_consistency_manifest(output_dir)
    if cm is None:
        raise HTTPException(
            status_code=404,
            detail="Manifesto de consistência não encontrado.",
        )

    updated = svc.patch_consistency_page(
        job_id=job_id,
        consistency_manifest=cm,
        page_number=page_number,
        patch=body.model_dump(exclude_none=True),
        output_dir=output_dir,
    )
    return {"manifest": updated}
