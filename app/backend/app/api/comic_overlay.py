"""
Fase F — Endpoints de overlay visual experimental para quadrinhos/mangá.

NÃO sobrescreve comic_translation.json (Fase D) nem comic_review.json (Fase E).
Persiste ajustes visuais em comic_overlay.json.
Imagens de página ficam em storage/output/{job_id}/pages/.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import OverlayExportResponse, OverlayPatchRequest, OverlayResponse

router = APIRouter(tags=["comic-overlay"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _raw_sidecar_path(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "comic_translation.json"


def _review_path(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "comic_review.json"


def _overlay_path(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "comic_overlay.json"


def _output_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id)


# ---------------------------------------------------------------------------
# GET — carrega (ou inicializa) o sidecar de overlay
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}/comic-overlay", response_model=OverlayResponse)
def get_overlay(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Carrega o sidecar de overlay visual.

    - Retorna 409 se comic_translation_status != 'done'.
    - Retorna 404 se o sidecar bruto não existe em disco.
    - Auto-inicializa comic_review.json (Fase E) se ainda não existir.
    - Carrega comic_overlay.json se existir; caso contrário, inicializa e salva.
    """
    from app.services.comic_overlay_service import (
        compute_overlay_stats,
        initialize_overlay,
        load_overlay,
        save_overlay,
    )
    from app.services.comic_review_service import (
        initialize_review,
        save_review,
    )

    job = _get_job_or_404(db, job_id)

    if job.comic_translation_status != "done":
        raise HTTPException(
            status_code=409,
            detail="Tradução de quadrinhos não concluída. Execute primeiro.",
        )

    raw_path = _raw_sidecar_path(job_id)
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="Sidecar bruto não encontrado.")

    # Auto-inicializar revisão (Fase E) se necessário
    review_path = _review_path(job_id)
    if not review_path.exists():
        review_data = initialize_review(raw_path)
        save_review(review_path, review_data)

    out_dir = _output_dir(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    overlay_path = _overlay_path(job_id)
    if overlay_path.exists():
        data = load_overlay(overlay_path)
    else:
        data = initialize_overlay(
            review_path=review_path,
            input_path=job.input_path or "",
            input_format=job.input_format or "",
            output_dir=out_dir,
            job_id=job_id,
        )
        save_overlay(overlay_path, data)

    return {"sidecar": data, "stats": compute_overlay_stats(data)}


# ---------------------------------------------------------------------------
# PATCH — aplica patches visuais e textuais
# ---------------------------------------------------------------------------

@router.patch("/jobs/{job_id}/comic-overlay", response_model=OverlayResponse)
def patch_overlay(
    job_id: int,
    body: OverlayPatchRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Aplica patches em blocos do sidecar de overlay.

    Suporta: reviewed_text, review_status, overlay_position,
    overlay_visibility, overlay_style.
    Persiste em comic_overlay.json.
    """
    from app.services.comic_overlay_service import (
        apply_overlay_patches,
        compute_overlay_stats,
        load_overlay,
        save_overlay,
    )

    _get_job_or_404(db, job_id)

    overlay_path = _overlay_path(job_id)
    if not overlay_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Overlay não inicializado. Carregue primeiro via GET.",
        )

    data = load_overlay(overlay_path)
    data = apply_overlay_patches(data, [p.model_dump(exclude_unset=True) for p in body.patches])
    save_overlay(overlay_path, data)

    return {"sidecar": data, "stats": compute_overlay_stats(data)}


# ---------------------------------------------------------------------------
# POST /export — gera HTML visual exportável
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/comic-overlay/export", response_model=OverlayExportResponse)
def export_overlay(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Exporta o overlay como JSON + HTML visual navegável por página.

    comic_overlay.json já é o JSON exportado — apenas gera o HTML.
    """
    from app.services.comic_overlay_service import export_overlay_html, load_overlay

    _get_job_or_404(db, job_id)

    overlay_path = _overlay_path(job_id)
    if not overlay_path.exists():
        raise HTTPException(status_code=404, detail="Overlay não encontrado.")

    data = load_overlay(overlay_path)

    out_dir = _output_dir(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    html_path = out_dir / "comic_overlay.html"
    html_path.write_text(export_overlay_html(data), encoding="utf-8")

    return {
        "json_path": f"/storage/output/{job_id}/comic_overlay.json",
        "html_path": f"/storage/output/{job_id}/comic_overlay.html",
    }
