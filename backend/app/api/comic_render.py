"""
Fase H — Endpoints de renderização visual não destrutiva para quadrinhos/mangá.

NÃO modifica imagens originais nem nenhum artefato anterior.
Gera PNGs derivados em storage/output/{job_id}/rendered_pages/.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import RenderResponse

router = APIRouter(tags=["comic-render"])


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
    return STORAGE_OUTPUT / str(job_id) / "comic_render.json"


def _pages_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "pages"


def _output_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id)


# ---------------------------------------------------------------------------
# POST — renderiza (ou re-renderiza) as páginas
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/comic-render", response_model=RenderResponse)
def render_comic(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Renderiza páginas com overlays posicionados em PNGs derivados.

    - Requer comic_translation_status == 'done'
    - Requer comic_overlay.json inicializado (GET /jobs/{id}/comic-overlay primeiro)
    - Salva rendered_pages/page_NNN.png e comic_render.json
    - Gera rendered_pages.zip e rendered_pages.cbz se houver páginas renderizadas
    - Re-renderizar sobrescreve a renderização anterior
    - A arte original (pages/) NUNCA é modificada
    """
    from app.services.comic_overlay_service import load_overlay
    from app.services.comic_render_service import (
        export_rendered_cbz,
        export_rendered_zip,
        render_overlay_pages,
        save_render_manifest,
    )

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
    out_dir = _output_dir(job_id)
    pages_dir = _pages_dir(job_id)

    manifest = render_overlay_pages(
        overlay_data=overlay_data,
        pages_dir=pages_dir,
        output_dir=out_dir,
        job_id=job_id,
    )

    if manifest["rendered_pages"] > 0:
        manifest["zip_path"] = export_rendered_zip(manifest, out_dir, job_id)
        manifest["cbz_path"] = export_rendered_cbz(manifest, out_dir, job_id)

    save_render_manifest(_manifest_path(job_id), manifest)

    return {"manifest": manifest}


# ---------------------------------------------------------------------------
# GET — manifesto da última renderização
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}/comic-render", response_model=RenderResponse)
def get_render_manifest(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Retorna o manifesto da última renderização.

    404 se POST /jobs/{id}/comic-render ainda não foi executado.
    """
    from app.services.comic_render_service import load_render_manifest

    _get_job_or_404(db, job_id)

    manifest_path = _manifest_path(job_id)
    if not manifest_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Renderização não encontrada. Execute POST /jobs/{id}/comic-render primeiro.",
        )

    return {"manifest": load_render_manifest(manifest_path)}
