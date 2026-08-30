"""
Estabilização v1 — P3: endpoints do Modo Recomendado (quick pipeline).

GET  /jobs/{id}/comic-quick-pipeline/preflight → validação sem efeitos
POST /jobs/{id}/comic-quick-pipeline           → executa (background, com progresso)
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob

router = APIRouter(tags=["comic-quick"])


def _get_job_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


def _output_dir(job_id: int) -> Path:
    from app.core.config import STORAGE_OUTPUT
    return STORAGE_OUTPUT / str(job_id)


def _job_dict(job: ProcessingJob) -> dict:
    return {
        "input_path": job.input_path,
        "input_format": job.input_format,
        "source_language": job.source_language,
        "target_language": job.target_language,
        "translator_engine": job.translator_engine,
        "comic_translation_enabled": job.comic_translation_enabled,
        "comic_translation_status": job.comic_translation_status,
        "active_operation": job.active_operation,
    }


@router.get("/jobs/{job_id}/comic-quick-pipeline/preflight")
def quick_pipeline_preflight(job_id: int, db: Session = Depends(get_db)) -> dict:
    """Preflight do quick pipeline — nenhuma alteração de estado."""
    from app.services.app_config_service import load_app_config
    from app.services.comic_quick_pipeline_service import run_preflight

    job = _get_job_or_404(db, job_id)
    if job.processing_mode != "comic":
        raise HTTPException(
            status_code=409,
            detail="Modo Recomendado disponível apenas para quadrinhos.",
        )
    cfg = load_app_config()
    result = run_preflight(_job_dict(job), _output_dir(job_id), cfg)
    return {"job_id": job_id, **result}


def _bg_quick_pipeline(job_id: int, operation_id: str) -> None:
    import time
    from app.db.database import SessionLocal
    from app.services.app_config_service import load_app_config
    from app.services.comic_quick_pipeline_service import (
        QuickPipelineError,
        run_quick_pipeline,
    )
    from app.services.progress_service import (
        OperationCancelled,
        end_operation,
        raise_if_cancelled,
        report_progress,
    )
    from app.services.translation_engine import (
        EngineNotInstalledError,
        LanguagePairNotAvailableError,
    )

    db = SessionLocal()
    job = None
    t0 = time.monotonic()
    op_status = "completed"
    output_dir = _output_dir(job_id)
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        cfg = load_app_config()
        engine_name = job.translator_engine or cfg.get("translator_engine_default", "argos") or "argos"
        from app.api.jobs import _build_engine
        engine = _build_engine(engine_name, cfg)

        def _cb(stage: str, current: int, total: int | None = None, message: str | None = None) -> None:
            raise_if_cancelled(output_dir, operation_id)
            report_progress(output_dir, operation_id, stage, current, total, message)

        job.comic_translation_status = "in_progress" if not (
            output_dir / "comic_translation.json"
        ).exists() else job.comic_translation_status
        db.commit()

        run_quick_pipeline(
            job_id=job_id,
            input_path=job.input_path or "",
            input_format=job.input_format or "",
            source_lang=job.source_language or "por",
            target_lang=job.target_language or "eng",
            engine=engine,
            output_dir=output_dir,
            progress_callback=_cb,
        )

        # Sincroniza campos do job com os artefatos gerados
        translation_json = output_dir / "comic_translation.json"
        if translation_json.exists():
            job.comic_translation_status = "done"
            job.comic_translation_artifact_path = str(translation_json)
            job.comic_translation_artifact_format = "json"
            job.comic_translation_error = None

        from app.services.metrics_service import record_stage
        record_stage(job_id, "quick_pipeline", "completed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     processing_mode=job.processing_mode,
                     input_format=job.input_format)

    except OperationCancelled:
        op_status = "cancelled"
        if job and job.comic_translation_status == "in_progress":
            job.comic_translation_status = (
                "done" if (output_dir / "comic_translation.json").exists() else "not_started"
            )

    except (QuickPipelineError, EngineNotInstalledError,
            LanguagePairNotAvailableError, RuntimeError) as exc:
        op_status = "failed"
        if job:
            if job.comic_translation_status == "in_progress":
                job.comic_translation_status = (
                    "done" if (output_dir / "comic_translation.json").exists() else "failed"
                )
            job.comic_translation_error = str(exc)
        from app.services.metrics_service import record_stage
        record_stage(job_id, "quick_pipeline", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    except Exception as exc:
        op_status = "failed"
        if job:
            try:
                if job.comic_translation_status == "in_progress":
                    job.comic_translation_status = "failed"
                job.comic_translation_error = f"Erro inesperado no modo recomendado: {exc}"
            except Exception:
                pass
        from app.services.metrics_service import record_stage
        record_stage(job_id, "quick_pipeline", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    finally:
        try:
            if job:
                from app.services.progress_service import end_operation as _end
                _end(job, output_dir, operation_id, op_status)
                job.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            pass
        db.close()


@router.post("/jobs/{job_id}/comic-quick-pipeline")
def start_quick_pipeline(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Executa o quick pipeline (tradução → revisão auto-aprovada → overlay →
    render → curadoria+export de páginas). Requer confirmação prévia do
    usuário na UI (o preflight apresenta o resumo do que será automatizado).

    - 409 se preflight crítico falhar ou operação ativa existir
    - NÃO exporta o EPUB final (confirmação na etapa Exportar)
    """
    from app.services.app_config_service import load_app_config
    from app.services.comic_quick_pipeline_service import run_preflight
    from app.services.progress_service import OperationInProgressError, begin_operation

    job = _get_job_or_404(db, job_id)
    if job.processing_mode != "comic":
        raise HTTPException(
            status_code=409,
            detail="Modo Recomendado disponível apenas para quadrinhos.",
        )
    if not job.comic_translation_enabled:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "TRANSLATION_NOT_ENABLED",
                "message": "O modo Recomendado automatiza a tradução visual. "
                           "Para converter sem tradução, use a conversão rápida via KCC.",
            },
        )

    cfg = load_app_config()
    preflight = run_preflight(_job_dict(job), _output_dir(job_id), cfg)
    if not preflight["ok"]:
        failed = [c["detail"] for c in preflight["checks"] if c["critical"] and not c["ok"]]
        raise HTTPException(
            status_code=409,
            detail={
                "code": "PREFLIGHT_FAILED",
                "message": "Pré-requisitos do modo Recomendado não atendidos.",
                "failures": failed,
            },
        )

    try:
        op_id = begin_operation(job, _output_dir(job_id), "quick_pipeline")
    except OperationInProgressError as exc:
        raise HTTPException(status_code=409, detail=exc.payload)

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_bg_quick_pipeline, job_id, op_id)
    return {
        "job_id": job_id,
        "operation_id": op_id,
        "started": True,
        "plan": preflight["plan"],
    }
