"""
Fase I.C — Endpoints de curadoria semi-automática (sugestões por heurística).

NÃO modifica imagens originais nem artefatos das Fases D–I.B.
Computa e persiste comic_suggestion_manifest.json com scores explicáveis.
"""
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import SuggestionResponse

router = APIRouter(tags=["comic-suggestions"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _job_out(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id)


def _load_json(path: Path) -> "dict | None":
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# POST /recompute — (re)computa sugestões por heurística
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/comic-suggestions/recompute",
    response_model=SuggestionResponse,
)
def recompute_suggestions(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Computa (ou recomputa) o manifesto de sugestões heurísticas.

    Lê os manifestos existentes (overlay, render, inpaint, final) e gera
    scores por variante para cada página.  Scores são explicáveis via
    campo `reasons`.

    Requer comic_overlay.json (execute GET /jobs/{id}/comic-overlay primeiro).
    render e inpaint são opcionais — páginas sem eles recebem score 0 nessas variantes.
    """
    from app.services.comic_scoring_service import (
        compute_suggestion_manifest,
        save_suggestion_manifest,
    )

    _get_job_or_404(db, job_id)
    out = _job_out(job_id)

    overlay_data = _load_json(out / "comic_overlay.json")
    if overlay_data is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Overlay não inicializado. "
                "Carregue primeiro via GET /jobs/{id}/comic-overlay."
            ),
        )

    render_manifest  = _load_json(out / "comic_render.json")
    inpaint_manifest = _load_json(out / "comic_inpaint.json")
    final_manifest   = _load_json(out / "comic_final_manifest.json")

    suggestion_manifest = compute_suggestion_manifest(
        overlay_data=overlay_data,
        render_manifest=render_manifest,
        inpaint_manifest=inpaint_manifest,
        final_manifest=final_manifest,
        job_id=job_id,
    )

    save_suggestion_manifest(out / "comic_suggestion_manifest.json", suggestion_manifest)

    return {"manifest": suggestion_manifest}


# ---------------------------------------------------------------------------
# GET — retorna manifesto de sugestões atual
# ---------------------------------------------------------------------------

@router.get(
    "/jobs/{job_id}/comic-suggestions",
    response_model=SuggestionResponse,
)
def get_suggestions(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Retorna o manifesto de sugestões atual.

    404 se POST /jobs/{id}/comic-suggestions/recompute ainda não foi executado.
    """
    from app.services.comic_scoring_service import load_suggestion_manifest

    _get_job_or_404(db, job_id)

    path = _job_out(job_id) / "comic_suggestion_manifest.json"
    manifest = load_suggestion_manifest(path)
    if manifest is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de sugestões não encontrado. "
                "Execute POST /jobs/{id}/comic-suggestions/recompute primeiro."
            ),
        )

    return {"manifest": manifest}
