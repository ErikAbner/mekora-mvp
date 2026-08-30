"""
Fase L — Observabilidade e métricas do pipeline.

record_stage() é a única função de escrita e NUNCA lança exceção.
As funções get_* recebem uma sessão de banco aberta pelo chamador.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any


# ---------------------------------------------------------------------------
# Escrita — tolerante a falhas
# ---------------------------------------------------------------------------

def record_stage(
    job_id: int,
    stage: str,
    status: str,
    *,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
    duration_ms: float | None = None,
    processing_mode: str | None = None,
    input_format: str | None = None,
    translator_engine: str | None = None,
    error_type: str | None = None,
    error_message: str | None = None,
) -> None:
    """Persiste uma métrica de etapa do pipeline. Nunca lança exceção."""
    try:
        from app.db.database import SessionLocal
        from app.models.stage_metric import StageMetric

        db = SessionLocal()
        try:
            row = StageMetric(
                job_id=job_id,
                stage=stage,
                status=status,
                started_at=started_at,
                finished_at=finished_at,
                duration_ms=duration_ms,
                processing_mode=processing_mode,
                input_format=input_format,
                translator_engine=translator_engine,
                error_type=error_type,
                error_message=(error_message or "")[:500] if error_message else None,
                created_at=datetime.utcnow(),
            )
            db.add(row)
            db.commit()
        finally:
            db.close()
    except Exception:
        pass  # métricas nunca quebram o pipeline


# ---------------------------------------------------------------------------
# Leitura — recebem db aberto pelo chamador
# ---------------------------------------------------------------------------

def get_summary(db: Any) -> dict:
    """Contagem de ProcessingJob por status agregado."""
    from app.models.processing_job import ProcessingJob

    jobs = db.query(ProcessingJob).all()
    total = len(jobs)
    done = sum(1 for j in jobs if j.status in ("converted", "sent"))
    error = sum(1 for j in jobs if j.status == "error")
    pending_send = sum(
        1 for j in jobs
        if getattr(j, "send_status", None) == "pending"
    )
    in_progress = sum(
        1 for j in jobs
        if j.status in ("analyzing", "converting", "translating")
    )
    return {
        "total": total,
        "done": done,
        "error": error,
        "pending_send": pending_send,
        "in_progress": in_progress,
    }


def get_stages_stats(db: Any) -> list[dict]:
    """Estatísticas por stage: total, completed, failed, avg_ms, p95_ms, fail_pct."""
    from app.models.stage_metric import StageMetric

    rows = db.query(StageMetric).all()

    # Agrupar por stage
    by_stage: dict[str, list[StageMetric]] = {}
    for r in rows:
        by_stage.setdefault(r.stage, []).append(r)

    result = []
    for stage, entries in sorted(by_stage.items()):
        completed = [e for e in entries if e.status == "completed"]
        failed = [e for e in entries if e.status == "failed"]
        durations = sorted(
            e.duration_ms for e in completed if e.duration_ms is not None
        )
        avg_ms = (sum(durations) / len(durations)) if durations else None
        p95_ms = durations[int(len(durations) * 0.95)] if durations else None
        total = len(entries)
        fail_pct = round(len(failed) / total * 100, 1) if total else 0.0
        result.append(
            {
                "stage": stage,
                "total": total,
                "completed": len(completed),
                "failed": len(failed),
                "avg_ms": round(avg_ms, 1) if avg_ms is not None else None,
                "p95_ms": round(p95_ms, 1) if p95_ms is not None else None,
                "fail_pct": fail_pct,
            }
        )
    return result


def get_recent_failures(db: Any, limit: int = 20) -> list[dict]:
    """Últimas falhas registradas, mais recentes primeiro."""
    from app.models.stage_metric import StageMetric

    rows = (
        db.query(StageMetric)
        .filter(StageMetric.status == "failed")
        .order_by(StageMetric.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "job_id": r.job_id,
            "stage": r.stage,
            "error_type": r.error_type,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


def get_usage_distribution(db: Any) -> dict:
    """Distribuição de uso por processing_mode, input_format e translator_engine."""
    from app.models.stage_metric import StageMetric

    rows = db.query(StageMetric).all()

    by_mode: dict[str, int] = {}
    by_format: dict[str, int] = {}
    by_engine: dict[str, int] = {}

    for r in rows:
        if r.processing_mode:
            by_mode[r.processing_mode] = by_mode.get(r.processing_mode, 0) + 1
        if r.input_format:
            by_format[r.input_format] = by_format.get(r.input_format, 0) + 1
        if r.translator_engine:
            by_engine[r.translator_engine] = by_engine.get(r.translator_engine, 0) + 1

    return {"by_mode": by_mode, "by_format": by_format, "by_engine": by_engine}


def get_job_timeline(db: Any, job_id: int) -> list[dict]:
    """Todos os registros StageMetric de um job, ordenados por created_at."""
    from app.models.stage_metric import StageMetric

    rows = (
        db.query(StageMetric)
        .filter(StageMetric.job_id == job_id)
        .order_by(StageMetric.created_at.asc())
        .all()
    )
    return [
        {
            "stage": r.stage,
            "status": r.status,
            "duration_ms": r.duration_ms,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "error_type": r.error_type,
        }
        for r in rows
    ]
