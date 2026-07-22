"""
Fase L — Testes para metrics_service e endpoints /metrics/*.
"""
from __future__ import annotations

import pytest
from sqlalchemy.orm import sessionmaker


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_stage(db, **kwargs):
    from app.models.stage_metric import StageMetric
    from datetime import datetime
    defaults = dict(
        job_id=1, stage="analyze", status="completed",
        duration_ms=100.0, processing_mode="document",
        input_format="pdf", translator_engine=None,
        error_type=None, error_message=None,
        created_at=datetime.utcnow(),
    )
    defaults.update(kwargs)
    row = StageMetric(**defaults)
    db.add(row)
    db.commit()
    return row


def _add_job(db, status="analyzed"):
    from app.models.processing_job import ProcessingJob
    from datetime import datetime
    job = ProcessingJob(
        original_filename="test.pdf",
        status=status,
        input_format="pdf",
        processing_mode="document",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


# ---------------------------------------------------------------------------
# record_stage
# ---------------------------------------------------------------------------

def test_record_stage_creates_row(test_engine):
    from app.services.metrics_service import record_stage
    from app.models.stage_metric import StageMetric
    from sqlalchemy.orm import sessionmaker

    Session = sessionmaker(bind=test_engine)
    db = Session()

    # Patch SessionLocal to use test engine
    import app.db.database as db_mod
    original = db_mod.SessionLocal
    db_mod.SessionLocal = Session
    try:
        record_stage(42, "analyze", "completed", duration_ms=250.5, processing_mode="document")
    finally:
        db_mod.SessionLocal = original

    rows = db.query(StageMetric).filter(StageMetric.job_id == 42).all()
    db.close()
    assert len(rows) == 1
    assert rows[0].stage == "analyze"
    assert rows[0].status == "completed"
    assert rows[0].duration_ms == pytest.approx(250.5)


def test_record_stage_never_raises_on_db_error(monkeypatch):
    """record_stage silencia qualquer exceção."""
    from app.services.metrics_service import record_stage
    import app.db.database as db_mod

    def boom():
        raise RuntimeError("DB explodiu")

    monkeypatch.setattr(db_mod, "SessionLocal", boom)
    # Não deve lançar
    record_stage(1, "upload", "completed")


# ---------------------------------------------------------------------------
# get_summary
# ---------------------------------------------------------------------------

def test_get_summary_counts_jobs(test_engine):
    from app.services.metrics_service import get_summary

    Session = sessionmaker(bind=test_engine)
    db = Session()

    _add_job(db, status="converted")
    _add_job(db, status="error")
    _add_job(db, status="analyzing")
    _add_job(db, status="converted")

    result = get_summary(db)
    db.close()

    assert result["total"] == 4
    assert result["done"] == 2
    assert result["error"] == 1
    assert result["in_progress"] == 1


# ---------------------------------------------------------------------------
# get_stages_stats
# ---------------------------------------------------------------------------

def test_get_stages_stats_empty(test_engine):
    from app.services.metrics_service import get_stages_stats

    Session = sessionmaker(bind=test_engine)
    db = Session()
    result = get_stages_stats(db)
    db.close()
    assert result == []


def test_get_stages_stats_with_data(test_engine):
    from app.services.metrics_service import get_stages_stats

    Session = sessionmaker(bind=test_engine)
    db = Session()

    for ms in [100.0, 200.0, 300.0]:
        _add_stage(db, stage="analyze", status="completed", duration_ms=ms)
    _add_stage(db, stage="analyze", status="failed", duration_ms=50.0)

    result = get_stages_stats(db)
    db.close()

    assert len(result) == 1
    s = result[0]
    assert s["stage"] == "analyze"
    assert s["total"] == 4
    assert s["completed"] == 3
    assert s["failed"] == 1
    assert s["avg_ms"] == pytest.approx(200.0)
    assert s["fail_pct"] == pytest.approx(25.0)


# ---------------------------------------------------------------------------
# get_recent_failures
# ---------------------------------------------------------------------------

def test_get_recent_failures(test_engine):
    from app.services.metrics_service import get_recent_failures

    Session = sessionmaker(bind=test_engine)
    db = Session()

    _add_stage(db, stage="convert", status="failed", job_id=5,
               error_type="ConversionFailedError", error_message="falhou")
    _add_stage(db, stage="analyze", status="completed", job_id=6)

    result = get_recent_failures(db)
    db.close()

    assert len(result) == 1
    assert result[0]["job_id"] == 5
    assert result[0]["stage"] == "convert"
    assert result[0]["error_type"] == "ConversionFailedError"


# ---------------------------------------------------------------------------
# get_job_timeline
# ---------------------------------------------------------------------------

def test_get_job_timeline(test_engine):
    from app.services.metrics_service import get_job_timeline

    Session = sessionmaker(bind=test_engine)
    db = Session()

    _add_stage(db, job_id=10, stage="upload", status="completed", duration_ms=10.0)
    _add_stage(db, job_id=10, stage="analyze", status="completed", duration_ms=500.0)
    _add_stage(db, job_id=99, stage="upload", status="completed")  # outro job

    result = get_job_timeline(db, 10)
    db.close()

    assert len(result) == 2
    stages = [r["stage"] for r in result]
    assert "upload" in stages
    assert "analyze" in stages


# ---------------------------------------------------------------------------
# API — GET /metrics/*
# ---------------------------------------------------------------------------

def test_api_summary(client):
    resp = client.get("/metrics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "done" in data
    assert "error" in data


def test_api_stages(client):
    resp = client.get("/metrics/stages")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_api_failures(client):
    resp = client.get("/metrics/failures")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_api_usage(client):
    resp = client.get("/metrics/usage")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_mode" in data
    assert "by_format" in data
    assert "by_engine" in data


def test_api_job_timeline_404_when_empty(client):
    resp = client.get("/metrics/jobs/99999")
    assert resp.status_code == 404


def test_api_job_timeline_returns_entries(client, tmp_storage):
    """Upload cria uma métrica de 'upload' que aparece no timeline."""
    import io
    content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
    resp = client.post(
        "/upload",
        files={"file": ("test.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert resp.status_code == 201
    job_id = resp.json()["upload_id"]

    resp2 = client.get(f"/metrics/jobs/{job_id}")
    assert resp2.status_code == 200
    entries = resp2.json()
    assert len(entries) >= 1
    stages = [e["stage"] for e in entries]
    assert "upload" in stages


def test_api_upload_creates_stage_metric(client, tmp_storage):
    """POST /upload deve criar um registro stage_metric de 'upload'."""
    import io
    content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
    resp = client.post(
        "/upload",
        files={"file": ("book.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert resp.status_code == 201
    job_id = resp.json()["upload_id"]

    # Verifica via endpoint de timeline
    resp2 = client.get(f"/metrics/jobs/{job_id}")
    assert resp2.status_code == 200
    entries = resp2.json()
    upload_entries = [e for e in entries if e["stage"] == "upload"]
    assert len(upload_entries) == 1
    assert upload_entries[0]["status"] == "completed"
