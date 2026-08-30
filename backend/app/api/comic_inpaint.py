"""
Fase I.A — Endpoints de inpainting experimental não destrutivo.

EXPERIMENTAL — resultados variam conforme complexidade do fundo.
NÃO sobrescreve imagens originais nem artefatos das Fases D–H.
Gera PNGs derivados em storage/output/{job_id}/inpaint_pages/.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import InpaintRequest, InpaintResponse

router = APIRouter(tags=["comic-inpaint"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _overlay_path(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "comic_overlay.json"


def _manifest_path(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "comic_inpaint.json"


def _pages_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "pages"


def _output_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id)


# ---------------------------------------------------------------------------
# POST — executa (ou re-executa) inpainting com parâmetros
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/comic-inpaint", response_model=InpaintResponse)
def run_inpaint(
    job_id: int,
    body: InpaintRequest = InpaintRequest(),
    db: Session = Depends(get_db),
) -> dict:
    """
    Gera páginas experimentalmente inpaintadas (remoção básica de texto original).

    EXPERIMENTAL: resultados variam conforme complexidade do fundo.

    - Requer comic_translation_status == 'done'
    - Requer comic_overlay.json (GET /jobs/{id}/comic-overlay primeiro)
    - Aceita parâmetros: algorithm, mask_padding, inpaint_radius, feather
    - Re-executar com novos parâmetros sobrescreve a rodada anterior
    - Imagens originais (pages/) NUNCA são modificadas
    """
    from app.services.comic_inpaint_service import (
        export_inpaint_zip,
        inpaint_overlay_pages,
        save_inpaint_manifest,
    )
    from app.services.comic_overlay_service import load_overlay

    job = _get_job_or_404(db, job_id)

    if job.comic_translation_status != "done":
        raise HTTPException(
            status_code=409,
            detail="Tradução de quadrinhos não concluída. Execute a tradução primeiro.",
        )

    overlay_path = _overlay_path(job_id)
    if not overlay_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Overlay não inicializado. "
                "Carregue primeiro via GET /jobs/{id}/comic-overlay."
            ),
        )

    overlay_data = load_overlay(overlay_path)
    p = body.params
    out_dir = _output_dir(job_id)

    manifest = inpaint_overlay_pages(
        overlay_data=overlay_data,
        pages_dir=_pages_dir(job_id),
        output_dir=out_dir,
        job_id=job_id,
        algorithm=p.algorithm,
        mask_padding=p.mask_padding,
        inpaint_radius=p.inpaint_radius,
        feather=p.feather,
    )

    if manifest["inpainted_pages"] > 0:
        manifest["zip_path"] = export_inpaint_zip(manifest, out_dir, job_id)

    save_inpaint_manifest(_manifest_path(job_id), manifest)

    return {"manifest": manifest}


# ---------------------------------------------------------------------------
# GET — manifesto da última operação de inpainting
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}/comic-inpaint", response_model=InpaintResponse)
def get_inpaint_manifest(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Retorna o manifesto do último inpainting executado.

    404 se POST /jobs/{id}/comic-inpaint ainda não foi executado.
    """
    from app.services.comic_inpaint_service import load_inpaint_manifest

    _get_job_or_404(db, job_id)

    manifest_path = _manifest_path(job_id)
    if not manifest_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Inpainting não encontrado. "
                "Execute POST /jobs/{id}/comic-inpaint primeiro."
            ),
        )

    return {"manifest": load_inpaint_manifest(manifest_path)}
