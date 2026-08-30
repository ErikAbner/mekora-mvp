"""
Estabilização v1 — Testes do progresso por operação (P4).

Cenários obrigatórios: encerramento normal, exceção/falha, cancelamento,
active_operation órfã, restart do backend, retry pós-recuperação e
dois cliques concorrentes.
"""
from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

import app.services.progress_service as ps
from app.services.progress_service import (
    OperationCancelled,
    OperationInProgressError,
    begin_operation,
    cancel_requested,
    check_active_operation,
    end_operation,
    get_status_progress,
    raise_if_cancelled,
    read_progress,
    recover_orphan_operation,
    report_progress,
    request_cancel,
)


def _job(active=None):
    return SimpleNamespace(active_operation=active)


# ---------------------------------------------------------------------------
# Ciclo normal
# ---------------------------------------------------------------------------

def test_begin_report_end_normal(tmp_path: Path) -> None:
    job = _job()
    op_id = begin_operation(job, tmp_path, "comic_translate")
    assert job.active_operation == f"comic_translate:{op_id}"

    report_progress(tmp_path, op_id, "comic_translate", 3, 10, "página 4 de 10")
    p = read_progress(tmp_path, op_id)
    assert p["current"] == 3 and p["total"] == 10
    assert p["percent"] == 30.0
    assert p["status"] == "running"
    assert p["message"] == "página 4 de 10"

    end_operation(job, tmp_path, op_id, "completed")
    assert job.active_operation is None
    assert read_progress(tmp_path, op_id)["status"] == "completed"


def test_indeterminate_progress_has_no_percent(tmp_path: Path) -> None:
    job = _job()
    op_id = begin_operation(job, tmp_path, "convert")
    report_progress(tmp_path, op_id, "convert", 0, None, "Convertendo (sem estimativa)")
    p = read_progress(tmp_path, op_id)
    assert p["total"] is None and p["percent"] is None


def test_end_operation_failed(tmp_path: Path) -> None:
    job = _job()
    op_id = begin_operation(job, tmp_path, "translate")
    end_operation(job, tmp_path, op_id, "failed", "engine morreu")
    p = read_progress(tmp_path, op_id)
    assert p["status"] == "failed" and p["message"] == "engine morreu"
    assert job.active_operation is None


def test_report_progress_never_raises(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(ps, "_write_atomic", lambda *a: (_ for _ in ()).throw(OSError("disk")))
    report_progress(tmp_path, "xyz", "s", 1, 2)  # não deve levantar


# ---------------------------------------------------------------------------
# Cancelamento cooperativo
# ---------------------------------------------------------------------------

def test_cancellation_flow(tmp_path: Path) -> None:
    job = _job()
    op_id = begin_operation(job, tmp_path, "comic_translate")
    assert not cancel_requested(tmp_path, op_id)

    request_cancel(tmp_path, op_id)
    assert cancel_requested(tmp_path, op_id)
    with pytest.raises(OperationCancelled):
        raise_if_cancelled(tmp_path, op_id)

    end_operation(job, tmp_path, op_id, "cancelled")
    assert read_progress(tmp_path, op_id)["status"] == "cancelled"
    assert job.active_operation is None
    # flag de cancel limpa
    assert not cancel_requested(tmp_path, op_id)


# ---------------------------------------------------------------------------
# Concorrência (dois cliques)
# ---------------------------------------------------------------------------

def test_double_click_rejected(tmp_path: Path) -> None:
    job = _job()
    begin_operation(job, tmp_path, "comic_export")
    with pytest.raises(OperationInProgressError) as exc:
        begin_operation(job, tmp_path, "comic_export")
    assert exc.value.payload["code"] == "OPERATION_IN_PROGRESS"


def test_different_operation_also_rejected(tmp_path: Path) -> None:
    """Qualquer operação ativa bloqueia novas operações (não só do mesmo tipo)."""
    job = _job()
    begin_operation(job, tmp_path, "comic_translate")
    with pytest.raises(OperationInProgressError):
        begin_operation(job, tmp_path, "comic_export")


# ---------------------------------------------------------------------------
# Órfãs e restart
# ---------------------------------------------------------------------------

def test_orphan_after_restart_is_interrupted_and_released(tmp_path: Path) -> None:
    """Operação registrada por outro boot_id (restart) → interrupted, liberada."""
    job = _job()
    op_id = begin_operation(job, tmp_path, "comic_translate")

    # Simula restart: reescreve o progresso com boot_id de processo anterior
    p = read_progress(tmp_path, op_id)
    p["boot_id"] = "processo-anterior"
    ps._write_atomic(ps._progress_path(tmp_path, op_id), p)

    assert check_active_operation(job.active_operation, tmp_path) == "ok"
    stored = read_progress(tmp_path, op_id)
    assert stored["status"] == "interrupted"
    assert "reinicialização" in stored["message"]


def test_orphan_missing_progress_file_released(tmp_path: Path) -> None:
    job = _job(active="comic_export:fantasma123")
    assert check_active_operation(job.active_operation, tmp_path) == "ok"


def test_recover_orphan_clears_active_operation(tmp_path: Path) -> None:
    job = _job(active="comic_export:fantasma123")
    assert recover_orphan_operation(job, tmp_path) is True
    assert job.active_operation is None


def test_retry_allowed_after_recovery(tmp_path: Path) -> None:
    """Depois da recuperação de órfã, nova operação pode iniciar (sem 409 eterno)."""
    job = _job()
    op_id = begin_operation(job, tmp_path, "comic_translate")
    p = read_progress(tmp_path, op_id)
    p["boot_id"] = "processo-anterior"
    ps._write_atomic(ps._progress_path(tmp_path, op_id), p)

    # begin_operation recupera a órfã e inicia nova operação
    new_id = begin_operation(job, tmp_path, "comic_translate")
    assert new_id != op_id
    assert job.active_operation == f"comic_translate:{new_id}"


def test_stale_heartbeat_same_boot_is_interrupted(tmp_path: Path) -> None:
    job = _job()
    op_id = begin_operation(job, tmp_path, "comic_translate")
    p = read_progress(tmp_path, op_id)
    p["updated_at"] = "2020-01-01T00:00:00+00:00"
    ps._write_atomic(ps._progress_path(tmp_path, op_id), p)
    assert check_active_operation(job.active_operation, tmp_path) == "ok"
    assert read_progress(tmp_path, op_id)["status"] == "interrupted"


# ---------------------------------------------------------------------------
# get_status_progress
# ---------------------------------------------------------------------------

def test_get_status_progress_active(tmp_path: Path) -> None:
    job = _job()
    op_id = begin_operation(job, tmp_path, "comic_translate")
    report_progress(tmp_path, op_id, "comic_translate", 5, 20)
    p = get_status_progress(job.active_operation, tmp_path)
    assert p["operation_id"] == op_id
    assert p["percent"] == 25.0
    assert "boot_id" not in p  # detalhe interno não exposto


def test_get_status_progress_none_when_inactive(tmp_path: Path) -> None:
    assert get_status_progress(None, tmp_path) is None
    assert get_status_progress("malformado", tmp_path) is None
