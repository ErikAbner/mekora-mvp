"""
Fase I.B — Endpoints de curadoria visual e export final derivado.

NÃO sobrescreve imagens originais nem artefatos das Fases D–I.A.
Cria e gerencia comic_final_manifest.json com seleções por página.
Exporta páginas finais em final_pages/ + ZIP + CBZ.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import (
    ApplySuggestionsRequest,
    ApplySuggestionsResponse,
    ExportResponse,
    FinalPatchRequest,
    FinalResponse,
)

router = APIRouter(tags=["comic-finalize"])


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
    return STORAGE_OUTPUT / str(job_id) / "comic_final_manifest.json"


def _pages_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "pages"


def _rendered_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "rendered_pages"


def _inpaint_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "inpaint_pages"


def _output_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id)


def _export_manifest_path(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id) / "comic_final_export_manifest.json"


# ---------------------------------------------------------------------------
# POST — inicializa (ou reinicializa) o manifesto de curadoria
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/comic-finalize", response_model=FinalResponse)
def init_final_manifest(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Inicializa o manifesto de curadoria final.

    - Requer comic_translation_status == 'done'
    - Requer comic_overlay.json (GET /jobs/{id}/comic-overlay primeiro)
    - Descobre variantes disponíveis (original, render_overlay, inpaint) por página
    - Define selected_variant='original' por padrão para todas as páginas
    - Re-executar reinicializa o manifesto (reseta seleções)
    - NUNCA modifica imagens originais nem artefatos anteriores
    """
    from app.services.comic_finalize_service import (
        initialize_final_manifest,
        save_final_manifest,
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
    manifest = initialize_final_manifest(
        overlay_data=overlay_data,
        pages_dir=_pages_dir(job_id),
        rendered_dir=_rendered_dir(job_id),
        inpaint_dir=_inpaint_dir(job_id),
        job_id=job_id,
    )
    save_final_manifest(_manifest_path(job_id), manifest)

    return {"manifest": manifest}


# ---------------------------------------------------------------------------
# GET — manifesto atual de curadoria
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}/comic-finalize", response_model=FinalResponse)
def get_final_manifest(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Retorna o manifesto de curadoria atual.

    404 se POST /jobs/{id}/comic-finalize ainda não foi executado.
    """
    from app.services.comic_finalize_service import load_final_manifest

    _get_job_or_404(db, job_id)

    mp = _manifest_path(job_id)
    if not mp.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de curadoria não encontrado. "
                "Execute POST /jobs/{id}/comic-finalize primeiro."
            ),
        )

    return {"manifest": load_final_manifest(mp)}


# ---------------------------------------------------------------------------
# PATCH — atualiza seleções de variante por página
# ---------------------------------------------------------------------------

@router.patch("/jobs/{job_id}/comic-finalize", response_model=FinalResponse)
def patch_final_manifest(
    job_id: int,
    body: FinalPatchRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Atualiza selected_variant (e opcionalmente notes) para as páginas indicadas.

    - selected_variant deve ser: 'original' | 'render_overlay' | 'inpaint'
    - Variantes inválidas são ignoradas silenciosamente
    - Requer que o manifesto já exista (POST primeiro)
    """
    from app.services.comic_finalize_service import (
        apply_final_patches,
        load_final_manifest,
        save_final_manifest,
    )

    _get_job_or_404(db, job_id)

    mp = _manifest_path(job_id)
    if not mp.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de curadoria não encontrado. "
                "Execute POST /jobs/{id}/comic-finalize primeiro."
            ),
        )

    manifest = load_final_manifest(mp)
    updated = apply_final_patches(
        manifest,
        [p.model_dump(exclude_unset=True) for p in body.patches],
    )
    save_final_manifest(mp, updated)

    return {"manifest": updated}


# ---------------------------------------------------------------------------
# POST /apply-suggestions — aplica sugestões semi-automáticas ao manifesto
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/comic-finalize/apply-suggestions",
    response_model=ApplySuggestionsResponse,
)
def apply_suggestions(
    job_id: int,
    body: ApplySuggestionsRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Aplica sugestões do manifesto de scoring ao manifesto final.

    - only_undecided=True (padrão): apenas páginas ainda com selection_source=="default"
    - only_undecided=False: sobrescreve TODAS as páginas, inclusive seleções manuais
    - min_confidence: pula sugestões abaixo deste threshold (0.0 = sem filtro)
    - Requer comic_final_manifest.json (POST /comic-finalize) e
      comic_suggestion_manifest.json (POST /comic-suggestions/recompute)
    - Marca pages alteradas com selection_source="auto"
    - NUNCA modifica imagens originais nem artefatos anteriores
    """
    from app.services.comic_finalize_service import (
        load_final_manifest,
        save_final_manifest,
    )
    from app.services.comic_scoring_service import (
        apply_suggestions_to_manifest,
        load_suggestion_manifest,
    )

    _get_job_or_404(db, job_id)

    mp = _manifest_path(job_id)
    if not mp.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de curadoria não encontrado. "
                "Execute POST /jobs/{id}/comic-finalize primeiro."
            ),
        )

    from app.core.config import STORAGE_OUTPUT
    suggestion_path = STORAGE_OUTPUT / str(job_id) / "comic_suggestion_manifest.json"
    suggestion_manifest = load_suggestion_manifest(suggestion_path)
    if suggestion_manifest is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de sugestões não encontrado. "
                "Execute POST /jobs/{id}/comic-suggestions/recompute primeiro."
            ),
        )

    final_manifest = load_final_manifest(mp)
    updated, count = apply_suggestions_to_manifest(
        suggestion_manifest=suggestion_manifest,
        final_manifest=final_manifest,
        only_undecided=body.only_undecided,
        min_confidence=body.min_confidence,
    )
    save_final_manifest(mp, updated)

    return {"manifest": updated, "applied_count": count}


# ---------------------------------------------------------------------------
# GET /export — manifesto de rastreabilidade do último export (Fase J.A)
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}/comic-finalize/export", response_model=ExportResponse)
def get_export_manifest(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Retorna o manifesto de rastreabilidade do último export (comic_final_export_manifest.json).

    404 se nenhum export foi realizado ainda.
    """
    from app.services.comic_finalize_service import load_export_manifest

    _get_job_or_404(db, job_id)

    ep = _export_manifest_path(job_id)
    manifest = load_export_manifest(ep)
    if manifest is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de rastreabilidade não encontrado. "
                "Execute POST /jobs/{id}/comic-finalize/export primeiro."
            ),
        )

    return {"manifest": manifest}


# ---------------------------------------------------------------------------
# POST /export — exporta páginas finais com base nas seleções
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/comic-finalize/export", response_model=FinalResponse)
def export_final(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Exporta as páginas finais de acordo com as seleções do manifesto.

    - Copia a variante escolhida de cada página para final_pages/page_NNN.png
    - Gera final_pages.zip, final_pages.cbz e final_pages.pdf (Pillow, tolerante a falhas)
    - Salva manifesto de rastreabilidade comic_final_export_manifest.json (Fase J.A)
    - Se a variante selecionada não estiver disponível como arquivo,
      registra export_error na página correspondente
    - NUNCA modifica imagens originais nem artefatos anteriores
    - Requer que o manifesto já exista (POST /comic-finalize primeiro)
    """
    from app.services.comic_finalize_service import (
        export_final_pages,
        load_final_manifest,
        save_final_manifest,
    )

    _get_job_or_404(db, job_id)

    mp = _manifest_path(job_id)
    if not mp.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Manifesto de curadoria não encontrado. "
                "Execute POST /jobs/{id}/comic-finalize primeiro."
            ),
        )

    import time
    t0 = time.monotonic()
    manifest = load_final_manifest(mp)
    updated = export_final_pages(
        manifest=manifest,
        pages_dir=_pages_dir(job_id),
        rendered_dir=_rendered_dir(job_id),
        inpaint_dir=_inpaint_dir(job_id),
        output_dir=_output_dir(job_id),
        job_id=job_id,
    )
    save_final_manifest(mp, updated)

    from app.services.metrics_service import record_stage
    record_stage(job_id, "export", "completed",
                 duration_ms=(time.monotonic() - t0) * 1000,
                 processing_mode="comic")

    return {"manifest": updated}
