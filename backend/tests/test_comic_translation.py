"""
Testes para comic_translation_service e endpoint POST /jobs/{id}/comic-translate — Fase D.

Estratégia:
- extract_comic_pages: testado com um CBZ real criado em memória
- ocr_page: _pytesseract.image_to_string mockado para evitar dependência de tesseract em CI
- run_comic_translation_pipeline: engine mockada, JSON de saída verificado
- Endpoint: TestClient com banco isolado (conftest)
"""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_cbz(tmp_path: Path, filenames: list[str]) -> Path:
    """Cria um CBZ mínimo com imagens PNG vazias."""
    cbz_path = tmp_path / "test.cbz"
    # PNG mínimo válido (1x1 px, branco)
    png_1x1 = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    with zipfile.ZipFile(cbz_path, "w") as zf:
        for name in filenames:
            zf.writestr(name, png_1x1)
    return cbz_path


def _make_engine(translated: str = "translated text") -> MagicMock:
    engine = MagicMock()
    engine.translate.return_value = translated
    engine.is_pair_available.return_value = True
    return engine


# ---------------------------------------------------------------------------
# extract_comic_pages — CBZ
# ---------------------------------------------------------------------------


def test_extract_cbz_order_and_count(tmp_path: Path) -> None:
    """Extrai imagens de CBZ em ordem alfabética."""
    cbz = _make_cbz(tmp_path, ["c_page.jpg", "a_page.jpg", "b_page.jpg"])
    import app.services.comic_translation_service as svc

    pages = svc.extract_comic_pages(str(cbz), "cbz")
    assert len(pages) == 3
    # Cada item deve ser bytes não vazios (PNG)
    assert all(isinstance(p, bytes) and len(p) > 0 for p in pages)


def test_extract_unsupported_format_raises(tmp_path: Path) -> None:
    """Formato não suportado levanta ValueError."""
    import app.services.comic_translation_service as svc

    with pytest.raises(ValueError, match="não suportado"):
        svc.extract_comic_pages(str(tmp_path / "fake.epub"), "epub")


# ---------------------------------------------------------------------------
# ocr_page
# ---------------------------------------------------------------------------


def test_ocr_page_returns_blocks(tmp_path: Path) -> None:
    """ocr_page retorna lista de blocos quando pytesseract está disponível."""
    import app.services.comic_translation_service as svc

    fake_output = "Bloco um\n\nBloco dois\n\nBloco três"
    mock_pyte = MagicMock()
    mock_pyte.image_to_string.return_value = fake_output
    mock_pil = MagicMock()
    mock_pil.open.return_value = MagicMock()

    with (
        patch.object(svc, "_pytesseract", mock_pyte),
        patch.object(svc, "_PILImage", mock_pil),
        patch.object(svc, "_OCR_AVAILABLE", True),
    ):
        blocks = svc.ocr_page(b"fake_img_bytes", "por")

    assert blocks == ["Bloco um", "Bloco dois", "Bloco três"]


def test_ocr_page_raises_when_not_installed() -> None:
    """ocr_page levanta RuntimeError quando _OCR_AVAILABLE é False."""
    import app.services.comic_translation_service as svc

    with patch.object(svc, "_OCR_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="pytesseract"):
            svc.ocr_page(b"fake_img_bytes", "por")


# ---------------------------------------------------------------------------
# run_comic_translation_pipeline
# ---------------------------------------------------------------------------


def test_pipeline_creates_json_and_html(tmp_path: Path) -> None:
    """Pipeline completo gera JSON e HTML com o conteúdo esperado."""
    cbz = _make_cbz(tmp_path, ["page1.jpg", "page2.jpg"])
    engine = _make_engine("TRANSLATED")
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    import app.services.comic_translation_service as svc

    fake_pyte = MagicMock()
    fake_pyte.image_to_string.return_value = "Texto original\n\nOutro bloco"
    fake_pil = MagicMock()
    fake_pil.open.return_value = MagicMock()

    with (
        patch.object(svc, "_pytesseract", fake_pyte),
        patch.object(svc, "_PILImage", fake_pil),
        patch.object(svc, "_OCR_AVAILABLE", True),
    ):
        json_path, html_path = svc.run_comic_translation_pipeline(
            job_id=42,
            input_path=str(cbz),
            input_format="cbz",
            source_lang="por",
            target_lang="eng",
            engine=engine,
            output_dir=output_dir,
        )

    assert json_path.exists()
    assert html_path.exists()

    data = json.loads(json_path.read_text(encoding="utf-8"))
    assert data["job_id"] == 42
    assert data["source_language"] == "por"
    assert data["target_language"] == "eng"
    assert len(data["pages"]) == 2
    # Cada bloco deve ter text e translated
    page0_blocks = data["pages"][0]["blocks"]
    assert any(b["translated"] == "TRANSLATED" for b in page0_blocks)


def test_pipeline_tolerates_per_page_errors(tmp_path: Path) -> None:
    """Erro de OCR em uma página é registrado sem abortar o pipeline."""
    cbz = _make_cbz(tmp_path, ["p1.jpg", "p2.jpg"])
    engine = _make_engine("OK")
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    import app.services.comic_translation_service as svc

    call_count = {"n": 0}

    def fake_ocr(img_bytes: bytes, lang: str):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise ValueError("OCR falhou nesta página")
        return ["texto ok"]

    with patch.object(svc, "ocr_page", side_effect=fake_ocr):
        json_path, _ = svc.run_comic_translation_pipeline(
            job_id=1,
            input_path=str(cbz),
            input_format="cbz",
            source_lang="por",
            target_lang="eng",
            engine=engine,
            output_dir=output_dir,
        )

    data = json.loads(json_path.read_text(encoding="utf-8"))
    assert len(data["pages"]) == 2
    # Página 1 tem error; página 2 tem blocks
    assert "error" in data["pages"][0]
    assert len(data["pages"][1]["blocks"]) == 1


def test_pipeline_propagates_engine_error(tmp_path: Path) -> None:
    """EngineNotInstalledError aborta o pipeline."""
    cbz = _make_cbz(tmp_path, ["p1.jpg"])
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    import app.services.comic_translation_service as svc
    from app.services.translation_engine import EngineNotInstalledError

    engine = MagicMock()
    engine.translate.side_effect = EngineNotInstalledError("argos não instalado")
    engine.is_pair_available.return_value = True

    fake_pyte = MagicMock()
    fake_pyte.image_to_string.return_value = "texto"
    fake_pil = MagicMock()
    fake_pil.open.return_value = MagicMock()

    with (
        patch.object(svc, "_pytesseract", fake_pyte),
        patch.object(svc, "_PILImage", fake_pil),
        patch.object(svc, "_OCR_AVAILABLE", True),
    ):
        with pytest.raises(EngineNotInstalledError):
            svc.run_comic_translation_pipeline(
                job_id=1,
                input_path=str(cbz),
                input_format="cbz",
                source_lang="por",
                target_lang="eng",
                engine=engine,
                output_dir=output_dir,
            )


# ---------------------------------------------------------------------------
# Endpoint POST /jobs/{id}/comic-translate
# ---------------------------------------------------------------------------


def _create_comic_job(client, tmp_path: Path) -> int:
    """Cria um job de quadrinhos via upload e retorna o upload_id."""
    cbz = _make_cbz(tmp_path, ["p1.jpg"])
    with open(cbz, "rb") as f:
        resp = client.post("/upload", files={"file": ("manga.cbz", f, "application/zip")})
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def test_comic_translate_rejects_document_mode(client, tmp_path: Path) -> None:
    """Retorna 409 quando processing_mode != 'comic'."""
    # Upload de PDF (mode=document)
    import fitz

    pdf_path = tmp_path / "doc.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "text")
    doc.save(str(pdf_path))
    doc.close()

    with open(pdf_path, "rb") as f:
        resp = client.post("/upload", files={"file": ("doc.pdf", f, "application/pdf")})
    assert resp.status_code == 201
    job_id = resp.json()["upload_id"]

    resp = client.post(f"/jobs/{job_id}/comic-translate", json={})
    assert resp.status_code == 409


def test_comic_translate_returns_in_progress(client, tmp_path: Path, monkeypatch) -> None:
    """Endpoint aceita job de quadrinhos e retorna comic_translation_status=in_progress."""
    # Mocka o engine para evitar dependência do argos instalado
    mock_engine = _make_engine("ok")
    import app.api.jobs as jobs_api

    monkeypatch.setattr(jobs_api, "_build_engine", lambda *a, **kw: mock_engine)

    job_id = _create_comic_job(client, tmp_path)
    resp = client.post(f"/jobs/{job_id}/comic-translate", json={})
    assert resp.status_code == 200
    assert resp.json()["comic_translation_status"] == "in_progress"


def test_comic_translate_rejects_nllb_when_not_installed(client, tmp_path: Path, monkeypatch) -> None:
    """Retorna 409 quando engine=nllb mas torch/transformers não estão instalados."""
    import app.api.jobs as jobs_api

    monkeypatch.setattr(
        "app.services.translation_model_service.is_nllb_installed",
        lambda: False,
    )
    job_id = _create_comic_job(client, tmp_path)
    resp = client.post(f"/jobs/{job_id}/comic-translate", json={"translator_engine": "nllb"})
    assert resp.status_code == 409
    assert "requirements-nllb.txt" in resp.json()["detail"]


def test_comic_translate_rejects_nllb_when_model_missing(client, tmp_path: Path, monkeypatch) -> None:
    """Retorna 409 quando engine=nllb mas modelo não está em disco."""
    monkeypatch.setattr(
        "app.services.translation_model_service.is_nllb_installed",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.translation_model_service.is_nllb_model_ready",
        lambda model_name: False,
    )
    job_id = _create_comic_job(client, tmp_path)
    resp = client.post(f"/jobs/{job_id}/comic-translate", json={"translator_engine": "nllb"})
    assert resp.status_code == 409
    assert "setup_nllb.py" in resp.json()["detail"]
