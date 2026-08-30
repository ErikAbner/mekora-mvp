"""
Fase E — Endpoints de revisão humana do sidecar de tradução de quadrinhos.

NÃO sobrescreve o sidecar bruto da Fase D (comic_translation.json).
Persiste alterações em comic_review.json dentro de storage/output/{job_id}/.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import (
    ComicReviewExportResponse,
    ComicReviewPatchRequest,
    ComicReviewResponse,
)

router = APIRouter(tags=["comic-review"])


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


# ---------------------------------------------------------------------------
# GET — carrega (ou inicializa) o sidecar de revisão
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}/comic-translation/review", response_model=ComicReviewResponse)
def get_review(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Carrega o sidecar de revisão.

    - Se comic_review.json já existe: carrega e retorna.
    - Se não existe mas comic_translation.json existe: inicializa a partir do raw.
    - Retorna 409 se comic_translation_status != 'done'.
    - Retorna 404 se o sidecar bruto não foi encontrado em disco.
    """
    from app.services.comic_review_service import (
        compute_stats,
        initialize_review,
        load_review,
        save_review,
    )

    job = _get_job_or_404(db, job_id)

    if job.comic_translation_status != "done":
        raise HTTPException(
            status_code=409,
            detail=(
                "Sidecar de tradução ainda não disponível. "
                "Execute a tradução de quadrinhos primeiro."
            ),
        )

    raw_path = _raw_sidecar_path(job_id)
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="Sidecar bruto não encontrado em disco.")

    review_path = _review_path(job_id)
    if review_path.exists():
        data = load_review(review_path)
    else:
        data = initialize_review(raw_path)
        save_review(review_path, data)

    return {"sidecar": data, "stats": compute_stats(data)}


# ---------------------------------------------------------------------------
# PATCH — aplica patches em blocos específicos
# ---------------------------------------------------------------------------

@router.patch("/jobs/{job_id}/comic-translation/review", response_model=ComicReviewResponse)
def patch_review(
    job_id: int,
    body: ComicReviewPatchRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Aplica patches em blocos específicos do sidecar de revisão.

    Persiste as alterações em comic_review.json.
    NÃO toca em comic_translation.json (sidecar bruto da Fase D).
    """
    from app.services.comic_review_service import (
        apply_patches,
        compute_stats,
        load_review,
        save_review,
    )

    _get_job_or_404(db, job_id)

    review_path = _review_path(job_id)
    if not review_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Sidecar de revisão não inicializado. Carregue primeiro via GET.",
        )

    data = load_review(review_path)
    data = apply_patches(data, [p.model_dump() for p in body.patches])
    save_review(review_path, data)

    return {"sidecar": data, "stats": compute_stats(data)}


# ---------------------------------------------------------------------------
# POST /export — gera artefatos revisados (JSON + HTML + Markdown)
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/comic-translation/review/export",
    response_model=ComicReviewExportResponse,
)
def export_review(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Exporta o sidecar revisado como JSON + HTML + Markdown.

    Os arquivos são salvos em storage/output/{job_id}/ e servíveis via /storage.
    comic_review.json já é o JSON exportado — apenas gera HTML e Markdown.
    """
    from app.services.comic_review_service import export_html, export_markdown, load_review

    _get_job_or_404(db, job_id)

    review_path = _review_path(job_id)
    if not review_path.exists():
        raise HTTPException(status_code=404, detail="Sidecar de revisão não encontrado.")

    data = load_review(review_path)
    from app.core.config import STORAGE_OUTPUT
    output_dir = STORAGE_OUTPUT / str(job_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    html_path = output_dir / "comic_review.html"
    md_path = output_dir / "comic_review.md"

    html_path.write_text(export_html(data), encoding="utf-8")
    md_path.write_text(export_markdown(data), encoding="utf-8")

    return {
        "json_path": f"/storage/output/{job_id}/comic_review.json",
        "html_path": f"/storage/output/{job_id}/comic_review.html",
        "md_path": f"/storage/output/{job_id}/comic_review.md",
    }
