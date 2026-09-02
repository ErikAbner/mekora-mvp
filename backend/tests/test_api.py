"""
Testes de integração das rotas da API.
"""

from __future__ import annotations


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_history_empty(client):
    response = client.get("/history")
    assert response.status_code == 200
    assert response.json() == []


def test_upload_pdf(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("sample.pdf", f, "application/pdf")},
        )
    assert response.status_code == 201
    data = response.json()
    assert "upload_id" in data
    assert data["filename"] == "sample.pdf"
    assert data["status"] == "uploaded"


def test_get_history_after_upload(client, sample_pdf, logado):
    with open(sample_pdf, "rb") as f:
        client.post("/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    response = client.get("/history")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_history_tolerates_null_str_fields(client, test_engine, logado):
    """GET /history deve retornar 200 quando input_format/processing_mode são NULL no banco.

    Simula jobs criados antes da Fase A, quando esses campos não existiam.
    Reproduz o bug ResponseValidationError: Input should be a valid string, input: None.
    """
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    Session = sessionmaker(bind=test_engine)
    db = Session()
    try:
        job = ProcessingJob(
            # A estante é de alguém a partir da DEC-0039: sem dono, este
            # trabalho não apareceria — e é isso que o teste quer ver.
            dono_id=logado[1],
            original_filename="legado.pdf",
            status="uploaded",
            input_format=None,    # NULL — campo não preenchido em jobs antigos
            processing_mode=None, # NULL — campo não preenchido em jobs antigos
        )
        db.add(job)
        db.commit()
    finally:
        db.close()

    response = client.get("/history")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["input_format"] == ""
    assert data[0]["processing_mode"] == ""


def test_analyze_returns_analyzing(client, sample_pdf, monkeypatch):
    """Verifica que /analyze/{id} retorna status 'analyzing' imediatamente."""
    import app.api.jobs as jobs_mod

    # Impede que a tarefa de análise real seja executada durante o teste
    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id, operation_id=None: None)

    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]

    r = client.get(f"/analyze/{upload_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "analyzing"


def test_analyze_idempotent(client, sample_pdf, monkeypatch):
    """Segunda chamada a /analyze/{id} retorna o job sem reiniciar a análise."""
    import app.api.jobs as jobs_mod

    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id, operation_id=None: None)

    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]

    client.get(f"/analyze/{upload_id}")  # primeira chamada
    r2 = client.get(f"/analyze/{upload_id}")  # segunda chamada
    assert r2.status_code == 200
    # Status não volta a "uploaded" — mantém o estado atual
    assert r2.json()["status"] != "uploaded"


def test_app_config_defaults(client):
    response = client.get("/app-config")
    assert response.status_code == 200
    data = response.json()
    assert "ocr_languages" in data
    assert "retention_days" in data
    assert isinstance(data["ocr_languages"], list)


def test_patch_app_config(client):
    response = client.patch("/app-config", json={"retention_days": 7})
    assert response.status_code == 200
    assert response.json()["retention_days"] == 7


def test_get_job_not_found(client):
    response = client.get("/jobs/9999")
    assert response.status_code == 404


def test_get_job_status_not_found(client):
    response = client.get("/jobs/9999/status")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Fase B — tradução
# ---------------------------------------------------------------------------

def test_translation_status_in_status_response(client, sample_pdf, monkeypatch):
    """GET /jobs/{id}/status deve incluir translation_status."""
    import app.api.jobs as jobs_mod

    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id, operation_id=None: None)

    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]

    # Dispara análise (mock — não executa de fato)
    client.get(f"/analyze/{upload_id}")

    r = client.get(f"/jobs/{upload_id}/status")
    assert r.status_code == 200
    data = r.json()
    assert "translation_status" in data
    assert data["translation_status"] == "not_started"


def test_translate_comic_returns_409(client, sample_pdf, monkeypatch):
    """POST /jobs/{id}/translate deve retornar 409 se processing_mode='comic'."""
    import app.api.jobs as jobs_mod

    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id, operation_id=None: None)

    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]

    # Override para comic
    client.post(f"/jobs/{upload_id}/metadata", json={"processing_mode": "comic"})

    r = client.post(f"/jobs/{upload_id}/translate")
    assert r.status_code == 409
    assert "quadrinhos" in r.json()["detail"].lower() or "comic" in r.json()["detail"].lower()


def test_bg_translate_updates_fields(client, sample_pdf, tmp_path, monkeypatch):
    """_bg_translate deve atualizar translation_status e translated_artifact_path."""
    import app.api.jobs as jobs_mod
    import app.core.config as cfg_mod

    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id, operation_id=None: None)
    monkeypatch.setattr(cfg_mod, "STORAGE_TEMP", tmp_path / "temp")
    (tmp_path / "temp").mkdir(parents=True, exist_ok=True)

    # Arquivo TXT simples
    txt_file = tmp_path / "doc.txt"
    txt_file.write_text("Olá\n\nMundo", encoding="utf-8")
    with open(txt_file, "rb") as f:
        r = client.post("/upload", files={"file": ("doc.txt", f, "text/plain")})
    upload_id = r.json()["upload_id"]
    client.get(f"/analyze/{upload_id}")

    # Mock do pipeline de tradução para não precisar do Argos instalado
    def fake_pipeline(input_path, input_format, source_language, target_language, engine, output_html_path, progress_callback=None):
        output_html_path.parent.mkdir(parents=True, exist_ok=True)
        output_html_path.write_text("<html><body><p>Translated</p></body></html>", encoding="utf-8")

    from app.services import translation_service
    monkeypatch.setattr(translation_service, "run_translation_pipeline", fake_pipeline)

    # Mock do engine para não precisar do Argos
    class FakeEngine:
        def translate(self, text, source, target):
            return text

        def is_pair_available(self, source, target):
            return True

    from app.services import translation_engine as te_mod
    monkeypatch.setattr(te_mod, "ArgosTranslatorEngine", FakeEngine)

    # Executar bg task diretamente
    jobs_mod._bg_translate(upload_id)

    # Verificar resultado no banco
    r = client.get(f"/jobs/{upload_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["translation_status"] == "done"
    assert data["translated_artifact_path"] is not None


# ---------------------------------------------------------------------------
# Estabilização v1 — P6: bloqueio de conversão quando OCR falhou
# ---------------------------------------------------------------------------

def test_convert_blocked_when_ocr_failed(client, sample_pdf, monkeypatch, test_engine):
    """PDF escaneado com OCR falho não pode ser convertido (422)."""
    import app.api.jobs as jobs_mod
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    monkeypatch.setattr(jobs_mod, "_bg_analyze", lambda job_id, operation_id=None: None)
    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("scan.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]
    client.get(f"/analyze/{upload_id}")

    Session = sessionmaker(bind=test_engine)
    db = Session()
    job = db.query(ProcessingJob).filter(ProcessingJob.id == upload_id).first()
    job.status = "analyzed"
    job.is_scanned = True
    job.ocr_status = "failed"
    job.ocr_used = False
    job.error_message = "OCR falhou: ocrmypdf ausente"
    db.commit()
    db.close()

    r = client.post(f"/jobs/{upload_id}/convert")
    assert r.status_code == 422
    assert "OCR" in r.json()["detail"]


def test_convert_allowed_after_ocr_success(client, sample_pdf, monkeypatch, test_engine):
    """Com OCR bem-sucedido (ocr_used=True) a conversão é liberada."""
    import app.api.jobs as jobs_mod
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    # O DUPLO PRECISA FECHAR A OPERAÇÃO, porque a análise de verdade fecha.
    #
    # Desde que a análise virou operação, ela registra um `operation_id` e o
    # encerra no `finally`. Um duplo que não faz nada deixa o trabalho ocupado
    # para sempre, e a conversão responde 409 — o que este teste viu. Não é
    # defeito do produto: em produção o `begin_operation` recupera órfã sozinho,
    # e aqui a operação nunca morre porque nada a matou.
    def _analise_falsa(job_id, operation_id=None):
        if operation_id:
            from app.core.config import STORAGE_OUTPUT
            from app.services.progress_service import end_operation
            from app.db.database import SessionLocal
            db = SessionLocal()
            try:
                j = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
                end_operation(j, STORAGE_OUTPUT / str(job_id), operation_id, "completed")
                db.commit()
            finally:
                db.close()

    monkeypatch.setattr(jobs_mod, "_bg_analyze", _analise_falsa)
    monkeypatch.setattr(jobs_mod, "_bg_convert", lambda job_id, operation_id=None: None)
    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("scan.pdf", f, "application/pdf")})
    upload_id = r.json()["upload_id"]
    client.get(f"/analyze/{upload_id}")

    Session = sessionmaker(bind=test_engine)
    db = Session()
    job = db.query(ProcessingJob).filter(ProcessingJob.id == upload_id).first()
    job.status = "analyzed"
    job.is_scanned = True
    job.ocr_status = "done"
    job.ocr_used = True
    db.commit()
    db.close()

    r = client.post(f"/jobs/{upload_id}/convert")
    assert r.status_code == 200
    assert r.json()["conversion_status"] == "in_progress"
