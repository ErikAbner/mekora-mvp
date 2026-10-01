"""
Estabilização v1 — Export final de quadrinhos.

POST /jobs/{id}/comic-export  → gera CBZ de staging + EPUB via KCC (background)
GET  /jobs/{id}/comic-export  → manifest e URLs do export

Política: a fonte é SEMPRE finished_pages/final_pages validadas.
job.input_path nunca é usado como fallback.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core import quadrinhos
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import ComicExportRequest, ComicExportResponse

router = APIRouter(tags=["comic-export"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _output_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id)


def _export_slug(job: ProcessingJob) -> str:
    from app.services.comic_export_service import slugify
    base = (
        job.final_filename
        or job.final_title
        or Path(job.original_filename or "comic").stem
    )
    return slugify(str(base))


def _to_response(job: ProcessingJob, manifest: dict | None) -> dict:
    return {
        "job_id": job.id,
        "comic_export_status": job.comic_export_status or "not_started",
        "comic_export_error": job.comic_export_error,
        "manifest": manifest,
        "epub_url": (manifest or {}).get("epub_serve_path"),
        "cbz_url": (manifest or {}).get("cbz_serve_path"),
    }


def _bg_comic_export(
    job_id: int, force: bool, build_epub: bool, operation_id: str | None = None
) -> None:
    """Executa o export final em segundo plano (sessão própria)."""
    import time
    from app.db.database import SessionLocal
    from app.services.app_config_service import load_app_config
    from app.services.comic_export_service import (
        ComicExportFailedError,
        ComicExportSourceError,
        run_comic_export,
    )
    from app.services.kcc_service import KccConversionFailedError, KccNotInstalledError
    from app.services.progress_service import end_operation, report_progress

    db = SessionLocal()
    t0 = time.monotonic()
    op_status = "completed"
    job = None
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        config = load_app_config()
        profile = config.get("kcc_profile", "KPW5")
        output_dir = _output_dir(job_id)

        def _cb(stage: str, current: int, total: int | None = None, message: str | None = None) -> None:
            if operation_id:
                report_progress(output_dir, operation_id, stage, current, total, message)

        try:
            manifest = run_comic_export(
                job_id,
                output_dir,
                slug=_export_slug(job),
                title=job.final_title or "",
                author=job.final_author or "",
                language=job.final_language or "",
                profile=profile,
                manga_mode=bool(job.comic_mode),
                rtl=bool(job.manga_rtl),
                comic_translation_done=(job.comic_translation_status == "done"),
                build_epub=build_epub,
                force=force,
                progress_callback=_cb if operation_id else None,
            )
            job.comic_export_status = "done"
            job.comic_export_path = manifest.get("epub_path") or manifest.get("staging_cbz")
            job.comic_export_source = manifest.get("source")
            job.comic_export_error = None

            from app.services.metrics_service import record_stage
            record_stage(job_id, "comic_export", "completed",
                         duration_ms=(time.monotonic() - t0) * 1000,
                         processing_mode=job.processing_mode,
                         input_format=job.input_format)

        except (ComicExportSourceError, ComicExportFailedError,
                KccConversionFailedError, KccNotInstalledError) as exc:
            op_status = "failed"
            job.comic_export_status = "failed"
            job.comic_export_error = str(exc)

            from app.services.metrics_service import record_stage
            record_stage(job_id, "comic_export", "failed",
                         duration_ms=(time.monotonic() - t0) * 1000,
                         error_type=type(exc).__name__,
                         error_message=str(exc)[:500])

        except Exception as exc:  # nunca deixar o job preso em in_progress
            op_status = "failed"
            job.comic_export_status = "failed"
            job.comic_export_error = f"Erro inesperado no export: {exc}"

        job.updated_at = datetime.utcnow()
        db.commit()
    finally:
        try:
            if job and operation_id:
                end_operation(job, _output_dir(job_id), operation_id, op_status)
                db.commit()
        except Exception:
            pass
        db.close()


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/comic-export
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/comic-export",
    response_model=ComicExportResponse,
    dependencies=[Depends(quadrinhos.exigir)],
)
def start_comic_export(
    job_id: int,
    body: ComicExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Dispara o export final do quadrinho.

    - target='epub' (padrão): CBZ de staging + EPUB via KCC (background)
    - target='cbz': somente CBZ de staging (background, sem KCC)
    - 409 estruturado quando a fonte final não existe/está incompleta
    """
    from app.services.comic_export_service import (
        ComicExportSourceError,
        resolve_export_source,
    )

    job = _get_job_or_404(db, job_id)

    if job.processing_mode != "comic":
        raise HTTPException(
            status_code=409,
            detail="Export final disponível apenas para jobs em modo quadrinhos.",
        )

    if body.target not in ("epub", "cbz"):
        raise HTTPException(
            status_code=422,
            detail="Formato de export não suportado. Use 'epub' ou 'cbz'.",
        )

    # Pré-validação síncrona da fonte — falha rápida e estruturada
    try:
        resolve_export_source(_output_dir(job_id))
    except ComicExportSourceError as exc:
        raise HTTPException(status_code=409, detail=exc.payload)

    build_epub = body.target == "epub"
    if build_epub:
        from app.services.kcc_service import KccNotInstalledError, _check_kcc
        try:
            _check_kcc()
        except KccNotInstalledError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

    # P4 — operação exclusiva por job (recupera órfãs; 409 se ocupada)
    from app.services.progress_service import OperationInProgressError, begin_operation
    try:
        op_id = begin_operation(job, _output_dir(job_id), "comic_export")
    except OperationInProgressError as exc:
        raise HTTPException(status_code=409, detail=exc.payload)

    job.comic_export_status = "in_progress"
    job.comic_export_error = None
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_bg_comic_export, job_id, body.force, build_epub, op_id)

    from app.services.comic_export_service import load_export_manifest
    return _to_response(job, load_export_manifest(_output_dir(job_id)))


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/comic-export
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}/comic-export", response_model=ComicExportResponse)
def get_comic_export(job_id: int, db: Session = Depends(get_db)) -> dict:
    """Retorna o manifest do export final (404 se nunca exportado)."""
    from app.services.comic_export_service import load_export_manifest

    job = _get_job_or_404(db, job_id)
    manifest = load_export_manifest(_output_dir(job_id))
    if manifest is None and (job.comic_export_status or "not_started") == "not_started":
        raise HTTPException(
            status_code=404,
            detail="Nenhum export final foi executado para este job.",
        )
    return _to_response(job, manifest)
