"""
Fase Q — Testes para job_state_service (funções puras).
"""
import json
from pathlib import Path

import pytest

from app.services.job_state_service import get_job_health, repair_job


# ---------------------------------------------------------------------------
# Helpers de fixture
# ---------------------------------------------------------------------------


def _job(
    *,
    status: str = "done",
    input_path: str = "",
    processing_mode: str = "comic",
    conversion_status: str = "",
) -> dict:
    return {
        "id": 1,
        "status": status,
        "input_path": input_path,
        "processing_mode": processing_mode,
        "conversion_status": conversion_status,
    }


def _write_manifest(output_dir: Path, filename: str, valid: bool = True) -> None:
    path = output_dir / filename
    if valid:
        path.write_text(json.dumps({"job_id": 1}), encoding="utf-8")
    else:
        path.write_text("{ not valid json {{", encoding="utf-8")


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


def test_healthy_comic_job_with_all_manifests(tmp_path: Path) -> None:
    """Job comic com todos os manifestos principais → is_healthy=True."""
    (tmp_path / "file.pdf").write_bytes(b"%PDF")
    job = _job(input_path=str(tmp_path / "file.pdf"))

    for filename in [
        "comic_consistency_manifest.json",
        "comic_finish_manifest.json",
        "comic_final_manifest.json",
    ]:
        _write_manifest(tmp_path, filename)

    result = get_job_health(job, tmp_path)

    assert result["is_healthy"] is True
    assert "comic_consistency_manifest.json" in result["manifests_present"]
    assert "comic_finish_manifest.json" in result["manifests_present"]
    assert result["manifests_missing"] == []


def test_unhealthy_job_status_error(tmp_path: Path) -> None:
    """Job com status=error → is_healthy=False."""
    job = _job(status="error")
    result = get_job_health(job, tmp_path)

    assert result["is_healthy"] is False
    status_check = next(c for c in result["checks"] if "Status" in c["name"])
    assert status_check["ok"] is False
    assert "erro" in result["recommended_next_action"].lower()


def test_missing_input_file_detected(tmp_path: Path) -> None:
    """input_path inexistente → check 'Arquivo original' false."""
    job = _job(input_path="/nonexistent/path/file.pdf")
    result = get_job_health(job, tmp_path)

    assert result["is_healthy"] is False
    file_check = next(c for c in result["checks"] if "original" in c["name"].lower())
    assert file_check["ok"] is False


def test_missing_consistency_manifest_recommendation(tmp_path: Path) -> None:
    """Job comic sem manifesto de consistência → recommended_next_action menciona consistência."""
    (tmp_path / "file.pdf").write_bytes(b"%PDF")
    job = _job(status="done", input_path=str(tmp_path / "file.pdf"))

    result = get_job_health(job, tmp_path)

    assert "consistência" in result["recommended_next_action"].lower()


def test_repair_removes_invalid_manifest(tmp_path: Path) -> None:
    """Manifesto JSON inválido é renomeado para .bak pelo repair."""
    (tmp_path / "file.pdf").write_bytes(b"%PDF")
    job = _job(input_path=str(tmp_path / "file.pdf"))

    _write_manifest(tmp_path, "comic_consistency_manifest.json", valid=False)

    result = repair_job(job, tmp_path)

    assert any("comic_consistency_manifest.json" in r for r in result["repaired"])
    assert not (tmp_path / "comic_consistency_manifest.json").exists()
    assert (tmp_path / "comic_consistency_manifest.json.bak").exists()


def test_repair_no_action_when_clean(tmp_path: Path) -> None:
    """Diretório limpo (sem arquivos problemáticos) → repaired vazio."""
    job = _job()
    result = repair_job(job, tmp_path)

    assert result["repaired"] == []
    assert result["not_repaired"] == []


def test_get_health_document_mode_job(tmp_path: Path) -> None:
    """Job de documento não verifica manifestos comic."""
    (tmp_path / "file.pdf").write_bytes(b"%PDF")
    job = _job(
        processing_mode="document",
        status="done",
        input_path=str(tmp_path / "file.pdf"),
        conversion_status="done",
    )

    result = get_job_health(job, tmp_path)

    assert result["is_healthy"] is True
    assert result["manifests_present"] == []
    assert "Pronto para enviar" in result["recommended_next_action"]


def test_manifests_present_list_accuracy(tmp_path: Path) -> None:
    """Apenas manifestos realmente presentes aparecem em manifests_present."""
    (tmp_path / "file.pdf").write_bytes(b"%PDF")
    job = _job(input_path=str(tmp_path / "file.pdf"))

    _write_manifest(tmp_path, "comic_consistency_manifest.json")
    # comic_finish_manifest.json NÃO criado

    result = get_job_health(job, tmp_path)

    assert "comic_consistency_manifest.json" in result["manifests_present"]
    assert "comic_finish_manifest.json" not in result["manifests_present"]


def test_repair_removes_empty_lock_file(tmp_path: Path) -> None:
    """Arquivo .lock vazio é removido pelo repair."""
    (tmp_path / "pipeline.lock").write_bytes(b"")
    job = _job()

    result = repair_job(job, tmp_path)

    assert any(".lock" in r for r in result["repaired"])
    assert not (tmp_path / "pipeline.lock").exists()


# ---------------------------------------------------------------------------
# Estabilização v1 — get_comic_pipeline_state
# ---------------------------------------------------------------------------


def _comic_job(**over):
    base = {
        "id": 1, "status": "analyzed", "processing_mode": "comic",
        "comic_translation_status": "not_started", "comic_export_status": "not_started",
    }
    base.update(over)
    return base


def _steps_by_id(result):
    return {s["id"]: s for s in result["steps"]}


def test_pipeline_state_initial_blocks_downstream(tmp_path):
    from app.services.job_state_service import get_comic_pipeline_state
    result = get_comic_pipeline_state(_comic_job(), tmp_path)
    steps = _steps_by_id(result)
    assert steps["analysis"]["status"] == "done"
    assert steps["translation"]["status"] == "available"
    assert steps["review"]["status"] == "blocked"
    assert steps["review"]["prerequisite_step"] == "translation"
    assert steps["export"]["status"] == "blocked"
    assert steps["export"]["prerequisite_step"] == "finalize"
    assert result["current_step"] == "translation"


def test_pipeline_state_export_available_after_finalize(tmp_path):
    import json as _json
    from app.services.job_state_service import get_comic_pipeline_state
    (tmp_path / "comic_translation.json").write_text("{}")
    (tmp_path / "comic_overlay.json").write_text("{}")
    (tmp_path / "comic_final_manifest.json").write_text(
        _json.dumps({"exported_pages": 2, "pages": []})
    )
    result = get_comic_pipeline_state(
        _comic_job(comic_translation_status="done"), tmp_path
    )
    steps = _steps_by_id(result)
    assert steps["finalize"]["status"] == "done"
    assert steps["export"]["status"] == "available"
    # Consistência bloqueada NÃO bloqueia o export
    assert steps["consistency"]["status"] == "blocked"


def test_pipeline_state_export_done(tmp_path):
    import json as _json
    from app.services.job_state_service import get_comic_pipeline_state
    (tmp_path / "comic_translation.json").write_text("{}")
    (tmp_path / "comic_overlay.json").write_text("{}")
    (tmp_path / "comic_final_manifest.json").write_text(
        _json.dumps({"exported_pages": 2, "pages": []})
    )
    (tmp_path / "comic_export").mkdir()
    (tmp_path / "comic_export" / "comic_export_manifest.json").write_text("{}")
    result = get_comic_pipeline_state(
        _comic_job(comic_translation_status="done", comic_export_status="done"),
        tmp_path,
    )
    assert _steps_by_id(result)["export"]["status"] == "done"
