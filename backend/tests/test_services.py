"""
Testes unitários dos serviços app_config e cleanup.
"""

from __future__ import annotations

import json
from pathlib import Path


# ---------------------------------------------------------------------------
# app_config_service
# ---------------------------------------------------------------------------


def test_load_defaults_when_no_file(tmp_path, monkeypatch):
    """load_app_config retorna DEFAULTS quando config.json não existe."""
    import app.services.app_config_service as acs

    monkeypatch.setattr(acs, "CONFIG_PATH", tmp_path / "config.json")

    config = acs.load_app_config()
    assert config["ocr_languages"] == acs.DEFAULTS["ocr_languages"]
    assert config["retention_days"] == acs.DEFAULTS["retention_days"]
    assert config["polling_interval_ms"] == acs.DEFAULTS["polling_interval_ms"]


def test_save_and_reload(tmp_path, monkeypatch):
    """save_app_config persiste e load_app_config recupera os valores."""
    import app.services.app_config_service as acs

    config_path = tmp_path / "config.json"
    monkeypatch.setattr(acs, "CONFIG_PATH", config_path)

    acs.save_app_config({"retention_days": 14, "ocr_languages": ["eng"]})
    loaded = acs.load_app_config()

    assert loaded["retention_days"] == 14
    assert loaded["ocr_languages"] == ["eng"]
    # polling_interval_ms mantém o default pois não foi alterado
    assert loaded["polling_interval_ms"] == acs.DEFAULTS["polling_interval_ms"]


def test_load_merges_defaults_with_partial_file(tmp_path, monkeypatch):
    """Campos ausentes no JSON são preenchidos com DEFAULTS."""
    import app.services.app_config_service as acs

    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps({"retention_days": 60}))
    monkeypatch.setattr(acs, "CONFIG_PATH", config_path)

    loaded = acs.load_app_config()
    assert loaded["retention_days"] == 60
    assert loaded["ocr_languages"] == acs.DEFAULTS["ocr_languages"]


def test_load_returns_defaults_on_invalid_json(tmp_path, monkeypatch):
    """JSON inválido → silenciosamente retorna DEFAULTS."""
    import app.services.app_config_service as acs

    config_path = tmp_path / "config.json"
    config_path.write_text("{ broken json }")
    monkeypatch.setattr(acs, "CONFIG_PATH", config_path)

    config = acs.load_app_config()
    assert config == acs.DEFAULTS


# ---------------------------------------------------------------------------
# cleanup_service
# ---------------------------------------------------------------------------


def test_cleanup_empty_db_returns_zero(tmp_path, monkeypatch):
    """cleanup_old_jobs com banco vazio retorna deleted_jobs_files == 0."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    import app.core.config as cfg
    import app.db.database as db_mod

    # Redireciona paths de storage
    for attr in ("STORAGE_INPUT", "STORAGE_OUTPUT", "STORAGE_TEMP"):
        path = tmp_path / attr.lower().replace("storage_", "")
        path.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(cfg, attr, path)

    # Banco de teste
    engine = create_engine(
        f"sqlite:///{tmp_path}/cleanup_test.db",
        connect_args={"check_same_thread": False},
    )
    from app.db.database import Base
    from app.models.processing_job import ProcessingJob  # noqa: F401

    Base.metadata.create_all(bind=engine)
    TestSL = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(db_mod, "SessionLocal", TestSL)

    from app.services.cleanup_service import cleanup_old_jobs

    result = cleanup_old_jobs(30)
    assert result["deleted_jobs_files"] == 0
    assert "cutoff" in result
