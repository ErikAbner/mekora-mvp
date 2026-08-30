"""
Testes para o fix do modo comic:
- Trocar para comic limpa error_message de OCR e ocr_status
- Modo document preserva error_message de OCR
- OCR não é disparado para jobs em modo comic
"""
from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _upload_and_analyze(client, sample_pdf, monkeypatch):
    """Upload + dispara análise (mock) e retorna upload_id."""
    import app.api.jobs as jobs_mod

    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id: None)

    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]
    client.get(f"/analyze/{upload_id}")  # dispara análise (mock no-op)
    return upload_id


def _force_ocr_error(client, upload_id):
    """Injeta diretamente no DB um estado de erro de OCR via endpoint de metadata."""
    # Simula o estado pós-análise com OCR falhado via SQL direto (mais simples:
    # usamos o TestClient com uma rota interna alternativa).
    # Como não temos rota para forçar estado, usamos a fixture DB diretamente
    # por meio do conftest. Aqui apenas retornamos o upload_id para uso nas fixtures.
    return upload_id


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------

def test_comic_mode_clears_ocr_error(client, sample_pdf, monkeypatch, test_engine):
    """PATCH processing_mode=comic limpa error_message de OCR e seta ocr_status=not_needed."""
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    upload_id = _upload_and_analyze(client, sample_pdf, monkeypatch)

    # Força error_message de OCR e ocr_status=failed diretamente no banco de teste
    Session = sessionmaker(bind=test_engine)
    with Session() as db:
        job = db.query(ProcessingJob).filter_by(id=upload_id).first()
        job.error_message = "OCR falhou: Could not find program 'gs' on the PATH"
        job.ocr_status = "failed"
        db.commit()

    r = client.post(f"/jobs/{upload_id}/metadata", json={"processing_mode": "comic"})
    assert r.status_code == 200
    data = r.json()
    assert data["processing_mode"] == "comic"
    assert data["error_message"] is None, "error_message de OCR deve ser limpo ao mudar para comic"
    assert data["ocr_status"] == "not_needed", "ocr_status deve ser not_needed em modo comic"


def test_document_mode_preserves_ocr_error(client, sample_pdf, monkeypatch, test_engine):
    """PATCH processing_mode=document não limpa error_message de OCR."""
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    upload_id = _upload_and_analyze(client, sample_pdf, monkeypatch)

    Session = sessionmaker(bind=test_engine)
    with Session() as db:
        job = db.query(ProcessingJob).filter_by(id=upload_id).first()
        job.error_message = "OCR falhou: Could not find program 'gs' on the PATH"
        job.ocr_status = "failed"
        db.commit()

    r = client.post(f"/jobs/{upload_id}/metadata", json={"processing_mode": "document"})
    assert r.status_code == 200
    data = r.json()
    assert data["processing_mode"] == "document"
    assert data["error_message"] is not None, "error_message de OCR deve ser preservado em modo document"
    assert "OCR" in data["error_message"]


def test_comic_mode_clears_ocr_needed(client, sample_pdf, monkeypatch, test_engine):
    """PATCH processing_mode=comic também limpa ocr_status='needed'."""
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    upload_id = _upload_and_analyze(client, sample_pdf, monkeypatch)

    Session = sessionmaker(bind=test_engine)
    with Session() as db:
        job = db.query(ProcessingJob).filter_by(id=upload_id).first()
        job.ocr_status = "needed"
        job.error_message = None
        db.commit()

    r = client.post(f"/jobs/{upload_id}/metadata", json={"processing_mode": "comic"})
    assert r.status_code == 200
    data = r.json()
    assert data["ocr_status"] == "not_needed"


def test_non_ocr_error_preserved_in_comic_mode(client, sample_pdf, monkeypatch, test_engine):
    """PATCH processing_mode=comic não limpa error_message que não seja de OCR."""
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    upload_id = _upload_and_analyze(client, sample_pdf, monkeypatch)

    Session = sessionmaker(bind=test_engine)
    with Session() as db:
        job = db.query(ProcessingJob).filter_by(id=upload_id).first()
        job.error_message = "Falha ao baixar modelo NLLB"
        job.ocr_status = "not_needed"
        db.commit()

    r = client.post(f"/jobs/{upload_id}/metadata", json={"processing_mode": "comic"})
    assert r.status_code == 200
    data = r.json()
    # Apenas errors de OCR são limpos; outros erros são mantidos
    assert data["error_message"] == "Falha ao baixar modelo NLLB"


def test_kcc_endpoint_returns_409_when_not_in_path(client, sample_pdf, monkeypatch):
    """POST /comic-convert deve retornar 409 (não 500) quando kcc-c2e não está no PATH."""
    import app.api.jobs as jobs_mod

    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id: None)

    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]

    # Define como comic mode
    client.get(f"/analyze/{upload_id}")
    client.post(f"/jobs/{upload_id}/metadata", json={"processing_mode": "comic"})

    # Mocka _check_kcc para lançar FileNotFoundError (kcc não instalado)
    from app.services import kcc_service
    from app.services.kcc_service import KccNotInstalledError

    def raise_not_installed():
        raise KccNotInstalledError("KCC não encontrado no PATH.")

    monkeypatch.setattr(kcc_service, "_check_kcc", raise_not_installed)

    r = client.post(f"/jobs/{upload_id}/comic-convert")
    assert r.status_code == 409, f"Esperado 409, obtido {r.status_code}: {r.text}"
    assert "KCC" in r.json()["detail"] or "kcc" in r.json()["detail"].lower()


def test_translation_engines_pairs_endpoint(client):
    """GET /translation/engines/pairs retorna estrutura correta."""
    r = client.get("/translation/engines/pairs")
    assert r.status_code == 200
    data = r.json()
    assert "argos" in data
    assert isinstance(data["argos"], list)


def test_comic_tools_status_endpoint_structure(client):
    """GET /tools/comic-status retorna kcc e argos com campos esperados."""
    r = client.get("/tools/comic-status")
    assert r.status_code == 200
    data = r.json()
    assert "kcc" in data
    assert "available" in data["kcc"]
    assert "argos" in data
    assert "library_installed" in data["argos"]
    assert "pairs" in data["argos"]
    assert isinstance(data["argos"]["pairs"], list)


def test_comic_tools_status_kcc_available(client, monkeypatch):
    """GET /tools/comic-status reporta KCC como disponível quando kcc-c2e responde."""
    from app.services import kcc_service

    monkeypatch.setattr(kcc_service, "get_kcc_status", lambda: {"available": True, "path": "/venv/bin/kcc-c2e"})
    r = client.get("/tools/comic-status")
    assert r.status_code == 200
    assert r.json()["kcc"]["available"] is True


def test_comic_tools_status_kcc_unavailable(client, monkeypatch):
    """GET /tools/comic-status reporta KCC como indisponível quando não instalado."""
    from app.services import kcc_service

    monkeypatch.setattr(kcc_service, "get_kcc_status", lambda: {"available": False, "path": None})
    r = client.get("/tools/comic-status")
    assert r.status_code == 200
    assert r.json()["kcc"]["available"] is False
    assert r.json()["kcc"]["path"] is None
