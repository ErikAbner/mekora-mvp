"""
Fixtures compartilhadas para os testes do Kindle Local Tool.

Estratégia de isolamento:
- banco de dados: SQLite em arquivo temporário por teste
- storage: diretórios dentro de tmp_path (sem tocar em storage/ real)
- config.json: CONFIG_PATH redirecionado para tmp_path
- SessionLocal patchado para que background tasks usem o banco de teste
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Garante que backend/ esteja no sys.path (necessário ao rodar de fora do diretório)
_backend_dir = Path(__file__).resolve().parents[1]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))


@pytest.fixture(scope="function")
def tmp_storage(tmp_path, monkeypatch):
    """Redireciona todas as constantes de storage e CONFIG_PATH para tmp_path."""
    import app.core.config as cfg

    dirs = {
        "STORAGE_INPUT": tmp_path / "input",
        "STORAGE_OUTPUT": tmp_path / "output",
        "STORAGE_TEMP": tmp_path / "temp",
        "STORAGE_COVERS": tmp_path / "covers",
        "STORAGE_LOGS": tmp_path / "logs",
    }
    for name, path in dirs.items():
        path.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(cfg, name, path)

    # Redirecionar CONFIG_PATH do app_config_service
    import app.services.app_config_service as acs

    monkeypatch.setattr(acs, "CONFIG_PATH", tmp_path / "config.json")

    # Redirecionar PRESET_PATH do preset_service (Fase K)
    import app.services.preset_service as ps

    monkeypatch.setattr(ps, "PRESET_PATH", tmp_path / "config_presets.json")

    return tmp_path


@pytest.fixture(scope="function")
def test_engine(tmp_path):
    """Engine SQLite isolado para cada teste."""
    db_path = tmp_path / "test_kindle.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    from app.db.database import Base
    from app.models.processing_job import ProcessingJob  # noqa: F401 — registra modelo
    from app.models.stage_metric import StageMetric  # noqa: F401 — registra modelo Fase L

    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def client(test_engine, tmp_storage, monkeypatch):
    """TestClient com banco e storage isolados. Patches SessionLocal globalmente."""
    import app.db.database as db_mod

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    # Patch SessionLocal para que _bg_analyze/_bg_convert usem o banco de teste
    monkeypatch.setattr(db_mod, "SessionLocal", TestingSessionLocal)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    from main import app  # noqa: backend/ está em sys.path
    from app.db.database import get_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def sample_pdf(tmp_path):
    """Cria um PDF mínimo válido usando PyMuPDF (sem dependência extra)."""
    import fitz  # PyMuPDF

    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 72), "Sample PDF for testing. Hello Kindle!")
    pdf_path = tmp_path / "sample.pdf"
    doc.save(str(pdf_path))
    doc.close()
    return pdf_path
