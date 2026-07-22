"""
Testes para comic_overlay_service e endpoints de overlay visual — Fase F.

Garante que:
- comic_translation.json e comic_review.json nunca são modificados
- comic_overlay.json é criado/atualizado corretamente
- patches atualizam reviewed_text, overlay_visibility e overlay_position
- exportação HTML contém imagem e blocos
- bbox retorna None quando OCR indisponível
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest


# ---------------------------------------------------------------------------
# Fixtures de dados
# ---------------------------------------------------------------------------


def _make_review_sidecar(tmp_path: Path) -> Path:
    """Cria um comic_review.json no formato Fase E."""
    output_dir = tmp_path / "output" / "1"
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "comic_review.json"
    data = {
        "job_id": 1,
        "source_language": "por",
        "target_language": "eng",
        "pages": [
            {
                "page_number": 1,
                "blocks": [
                    {
                        "block_id": "p1_b0",
                        "original_text": "texto original",
                        "translated_text": "translated text",
                        "reviewed_text": "",
                        "review_status": "pending",
                        "confidence": None,
                        "bbox": None,
                    },
                    {
                        "block_id": "p1_b1",
                        "original_text": "outro texto",
                        "translated_text": "other text",
                        "reviewed_text": "revisado",
                        "review_status": "edited",
                        "confidence": None,
                        "bbox": None,
                    },
                ],
                "error": None,
            }
        ],
    }
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


def _make_cbz(tmp_path: Path) -> Path:
    """CBZ mínimo com uma página PNG 1×1."""
    cbz_path = tmp_path / "manga.cbz"
    png_1x1 = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    with zipfile.ZipFile(cbz_path, "w") as zf:
        zf.writestr("p001.jpg", png_1x1)
    return cbz_path


# ---------------------------------------------------------------------------
# initialize_overlay — serviço
# ---------------------------------------------------------------------------


def test_initialize_overlay_creates_structure(tmp_path: Path, monkeypatch) -> None:
    """initialize_overlay cria sidecar com estrutura correta sem bbox."""
    import app.services.comic_overlay_service as svc

    monkeypatch.setattr(svc, "_OCR_AVAILABLE", False)

    # Mock extract_comic_pages para evitar arquivo real
    import app.services.comic_translation_service as trans
    monkeypatch.setattr(trans, "extract_comic_pages", lambda *a: [])

    review_path = _make_review_sidecar(tmp_path)
    out_dir = tmp_path / "output" / "1"

    data = svc.initialize_overlay(
        review_path=review_path,
        input_path="fake.cbz",
        input_format="cbz",
        output_dir=out_dir,
        job_id=1,
    )

    assert data["job_id"] == 1
    assert data["source_language"] == "por"
    assert len(data["pages"]) == 1
    page = data["pages"][0]
    assert page["page_number"] == 1
    assert len(page["blocks"]) == 2

    b0 = page["blocks"][0]
    assert b0["block_id"] == "p1_b0"
    assert b0["original_text"] == "texto original"
    assert b0["translated_text"] == "translated text"
    assert b0["reviewed_text"] == ""
    assert b0["review_status"] == "pending"
    assert b0["bbox"] is None
    assert b0["overlay_position"] is None
    assert b0["overlay_visibility"] is True


def test_initialize_overlay_does_not_touch_review(tmp_path: Path, monkeypatch) -> None:
    """O sidecar de revisão (Fase E) não é modificado durante a inicialização."""
    import app.services.comic_overlay_service as svc
    import app.services.comic_translation_service as trans

    monkeypatch.setattr(svc, "_OCR_AVAILABLE", False)
    monkeypatch.setattr(trans, "extract_comic_pages", lambda *a: [])

    review_path = _make_review_sidecar(tmp_path)
    review_before = review_path.read_text(encoding="utf-8")

    svc.initialize_overlay(
        review_path=review_path,
        input_path="fake.cbz",
        input_format="cbz",
        output_dir=tmp_path / "output" / "1",
        job_id=1,
    )

    assert review_path.read_text(encoding="utf-8") == review_before


# ---------------------------------------------------------------------------
# render_page_images — serviço
# ---------------------------------------------------------------------------


def test_render_page_images_saves_jpeg(tmp_path: Path, monkeypatch) -> None:
    """render_page_images salva arquivos JPEG e retorna caminhos servíveis."""
    import app.services.comic_overlay_service as svc
    import app.services.comic_translation_service as trans

    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    monkeypatch.setattr(trans, "extract_comic_pages", lambda *a: [png_bytes, png_bytes])

    out_dir = tmp_path / "output" / "42"
    paths = svc.render_page_images("fake.cbz", "cbz", out_dir)

    assert len(paths) == 2
    assert paths[0] == "/storage/output/42/pages/page_001.jpg"
    assert paths[1] == "/storage/output/42/pages/page_002.jpg"
    assert (out_dir / "pages" / "page_001.jpg").exists()
    assert (out_dir / "pages" / "page_002.jpg").exists()


def test_render_page_images_tolerates_missing_file(tmp_path: Path, monkeypatch) -> None:
    """render_page_images retorna lista vazia quando o arquivo não existe."""
    import app.services.comic_overlay_service as svc
    import app.services.comic_translation_service as trans

    monkeypatch.setattr(
        trans, "extract_comic_pages", lambda *a: (_ for _ in ()).throw(ValueError("not found"))
    )

    paths = svc.render_page_images("missing.cbz", "cbz", tmp_path / "out")
    assert paths == []


# ---------------------------------------------------------------------------
# extract_block_bboxes_for_page — serviço
# ---------------------------------------------------------------------------


def test_extract_bboxes_no_ocr_available(monkeypatch) -> None:
    """Retorna lista de None quando OCR indisponível."""
    import app.services.comic_overlay_service as svc

    monkeypatch.setattr(svc, "_OCR_AVAILABLE", False)

    result = svc.extract_block_bboxes_for_page(b"fake", "eng", 3)
    assert result == [None, None, None]


def test_extract_bboxes_zero_expected(monkeypatch) -> None:
    """Retorna lista vazia quando expected_count=0."""
    import app.services.comic_overlay_service as svc

    result = svc.extract_block_bboxes_for_page(b"fake", "eng", 0)
    assert result == []


def test_extract_bboxes_pytesseract_exception(monkeypatch) -> None:
    """Retorna lista de None quando pytesseract lança exceção."""
    import app.services.comic_overlay_service as svc

    mock_pil = MagicMock()
    mock_pil.open.side_effect = Exception("PIL error")
    monkeypatch.setattr(svc, "_OCR_AVAILABLE", True)
    monkeypatch.setattr(svc, "_PILImage", mock_pil)

    result = svc.extract_block_bboxes_for_page(b"fake", "eng", 2)
    assert result == [None, None]


# ---------------------------------------------------------------------------
# apply_overlay_patches — serviço
# ---------------------------------------------------------------------------


def test_apply_patches_reviewed_text(tmp_path: Path) -> None:
    """Patch com reviewed_text atualiza bloco e define status=edited."""
    from app.services.comic_overlay_service import apply_overlay_patches

    data = {
        "pages": [{"page_number": 1, "blocks": [
            {"block_id": "p1_b0", "reviewed_text": "", "review_status": "pending",
             "overlay_visibility": True, "overlay_position": None},
        ]}]
    }
    result = apply_overlay_patches(data, [{"block_id": "p1_b0", "reviewed_text": "novo texto"}])
    block = result["pages"][0]["blocks"][0]
    assert block["reviewed_text"] == "novo texto"
    assert block["review_status"] == "edited"


def test_apply_patches_overlay_visibility(tmp_path: Path) -> None:
    """Patch com overlay_visibility=False oculta o bloco."""
    from app.services.comic_overlay_service import apply_overlay_patches

    data = {
        "pages": [{"page_number": 1, "blocks": [
            {"block_id": "p1_b0", "reviewed_text": "", "review_status": "pending",
             "overlay_visibility": True, "overlay_position": None},
        ]}]
    }
    result = apply_overlay_patches(data, [{"block_id": "p1_b0", "overlay_visibility": False}])
    assert result["pages"][0]["blocks"][0]["overlay_visibility"] is False


def test_apply_patches_overlay_position(tmp_path: Path) -> None:
    """Patch com overlay_position define a posição customizada."""
    from app.services.comic_overlay_service import apply_overlay_patches

    data = {
        "pages": [{"page_number": 1, "blocks": [
            {"block_id": "p1_b0", "reviewed_text": "", "review_status": "pending",
             "overlay_visibility": True, "overlay_position": None},
        ]}]
    }
    pos = [0.1, 0.2, 0.3, 0.1]
    result = apply_overlay_patches(data, [{"block_id": "p1_b0", "overlay_position": pos}])
    assert result["pages"][0]["blocks"][0]["overlay_position"] == pos


def test_apply_patches_reset_position() -> None:
    """overlay_position=None (chave presente) reseta posição customizada para None."""
    from app.services.comic_overlay_service import apply_overlay_patches

    data = {
        "pages": [{"page_number": 1, "blocks": [
            {"block_id": "p1_b0", "reviewed_text": "", "review_status": "pending",
             "overlay_visibility": True, "overlay_position": [0.1, 0.2, 0.3, 0.1]},
        ]}]
    }
    result = apply_overlay_patches(data, [{"block_id": "p1_b0", "overlay_position": None}])
    assert result["pages"][0]["blocks"][0]["overlay_position"] is None


def test_apply_patches_overlay_style() -> None:
    """overlay_style dict é persistido no bloco."""
    from app.services.comic_overlay_service import apply_overlay_patches

    data = {
        "pages": [{"page_number": 1, "blocks": [
            {"block_id": "p1_b0", "reviewed_text": "", "review_status": "pending",
             "overlay_visibility": True, "overlay_position": None, "overlay_style": None},
        ]}]
    }
    style = {"font_size": 0.9, "text_color": "#ff0000"}
    result = apply_overlay_patches(data, [{"block_id": "p1_b0", "overlay_style": style}])
    block = result["pages"][0]["blocks"][0]
    assert block["overlay_style"] == style


def test_apply_patches_reset_style() -> None:
    """overlay_style=None (chave presente) reseta o estilo para None."""
    from app.services.comic_overlay_service import apply_overlay_patches

    data = {
        "pages": [{"page_number": 1, "blocks": [
            {"block_id": "p1_b0", "reviewed_text": "", "review_status": "pending",
             "overlay_visibility": True, "overlay_position": None,
             "overlay_style": {"font_size": 1.2, "border_color": "#abcdef"}},
        ]}]
    }
    result = apply_overlay_patches(data, [{"block_id": "p1_b0", "overlay_style": None}])
    assert result["pages"][0]["blocks"][0]["overlay_style"] is None


def test_export_html_applies_styles() -> None:
    """HTML exportado reflete border_color e font_size de overlay_style."""
    from app.services.comic_overlay_service import export_overlay_html

    data = {
        "job_id": 1,
        "source_language": "por",
        "target_language": "eng",
        "pages": [{
            "page_number": 1,
            "image_path": "/storage/output/1/pages/page_001.jpg",
            "blocks": [{
                "block_id": "p1_b0",
                "original_text": "orig",
                "translated_text": "trans",
                "reviewed_text": "rev",
                "review_status": "edited",
                "bbox": [0.1, 0.2, 0.3, 0.1],
                "overlay_position": None,
                "overlay_style": {"border_color": "#ff00ff", "font_size": 1.2},
                "overlay_visibility": True,
            }],
            "error": None,
        }],
    }
    html = export_overlay_html(data)
    assert "#ff00ff" in html
    assert "1.20rem" in html


# ---------------------------------------------------------------------------
# export_overlay_html — serviço
# ---------------------------------------------------------------------------


def test_export_overlay_html_with_image() -> None:
    """HTML exportado contém tag img e seção de página."""
    from app.services.comic_overlay_service import export_overlay_html

    data = {
        "job_id": 1,
        "source_language": "por",
        "target_language": "eng",
        "pages": [{
            "page_number": 1,
            "image_path": "/storage/output/1/pages/page_001.jpg",
            "blocks": [{
                "block_id": "p1_b0",
                "original_text": "orig",
                "translated_text": "trans",
                "reviewed_text": "rev",
                "review_status": "edited",
                "bbox": [0.1, 0.2, 0.3, 0.1],
                "overlay_position": None,
                "overlay_visibility": True,
            }],
            "error": None,
        }],
    }
    html = export_overlay_html(data)
    assert "page_001.jpg" in html
    assert "Página 1" in html
    assert "rev" in html


def test_export_overlay_html_without_image() -> None:
    """HTML funciona corretamente sem imagem — blocos na seção de lista."""
    from app.services.comic_overlay_service import export_overlay_html

    data = {
        "job_id": 2,
        "source_language": "eng",
        "target_language": "por",
        "pages": [{
            "page_number": 1,
            "image_path": None,
            "blocks": [{
                "block_id": "p1_b0",
                "original_text": "hello",
                "translated_text": "olá",
                "reviewed_text": "",
                "review_status": "pending",
                "bbox": None,
                "overlay_position": None,
                "overlay_visibility": True,
            }],
            "error": None,
        }],
    }
    html = export_overlay_html(data)
    assert "hello" in html
    assert "olá" in html
    assert "Blocos sem posição" in html


# ---------------------------------------------------------------------------
# Endpoints via TestClient
# ---------------------------------------------------------------------------


def _upload_comic_job(client, tmp_path: Path) -> int:
    cbz = tmp_path / "manga.cbz"
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    with zipfile.ZipFile(cbz, "w") as zf:
        zf.writestr("p1.jpg", png)
    with open(cbz, "rb") as f:
        resp = client.post("/upload", files={"file": ("manga.cbz", f, "application/zip")})
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def _inject_raw_sidecar(tmp_storage: Path, job_id: int) -> Path:
    output_dir = tmp_storage / "output" / str(job_id)
    output_dir.mkdir(parents=True, exist_ok=True)
    raw = {
        "job_id": job_id,
        "source_language": "por",
        "target_language": "eng",
        "pages": [{"page": 1, "blocks": [{"text": "orig", "translated": "trans"}]}],
    }
    path = output_dir / "comic_translation.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    return path


def _set_comic_translation_done(client, job_id: int) -> None:
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob

    db = SessionLocal()
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if job:
            job.comic_translation_status = "done"
            job.processing_mode = "comic"
            db.commit()
    finally:
        db.close()


def test_get_overlay_409_not_done(client, tmp_path: Path) -> None:
    """Retorna 409 quando comic_translation_status != done."""
    job_id = _upload_comic_job(client, tmp_path)
    resp = client.get(f"/jobs/{job_id}/comic-overlay")
    assert resp.status_code == 409


def test_get_overlay_initializes(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET inicializa comic_overlay.json na primeira chamada."""
    import app.services.comic_overlay_service as svc
    import app.services.comic_translation_service as trans

    # Evitar extração real de imagens durante o teste
    import pytest
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(svc, "_OCR_AVAILABLE", False)
    monkeypatch.setattr(trans, "extract_comic_pages", lambda *a: [])

    job_id = _upload_comic_job(client, tmp_path)
    _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)

    resp = client.get(f"/jobs/{job_id}/comic-overlay")
    assert resp.status_code == 200
    data = resp.json()
    assert "sidecar" in data
    assert "stats" in data
    assert data["sidecar"]["pages"][0]["blocks"][0]["block_id"] == "p1_b0"

    overlay_path = tmp_storage / "output" / str(job_id) / "comic_overlay.json"
    assert overlay_path.exists()

    monkeypatch.undo()


def test_patch_overlay_persists(client, tmp_path: Path, tmp_storage: Path) -> None:
    """PATCH persiste reviewed_text e overlay_visibility."""
    import app.services.comic_overlay_service as svc
    import app.services.comic_translation_service as trans

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(svc, "_OCR_AVAILABLE", False)
    monkeypatch.setattr(trans, "extract_comic_pages", lambda *a: [])

    job_id = _upload_comic_job(client, tmp_path)
    _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)

    # Inicializar
    client.get(f"/jobs/{job_id}/comic-overlay")

    resp = client.patch(
        f"/jobs/{job_id}/comic-overlay",
        json={"patches": [
            {"block_id": "p1_b0", "reviewed_text": "corrigido", "overlay_visibility": False},
        ]},
    )
    assert resp.status_code == 200
    block = resp.json()["sidecar"]["pages"][0]["blocks"][0]
    assert block["reviewed_text"] == "corrigido"
    assert block["overlay_visibility"] is False
    assert block["review_status"] == "edited"

    monkeypatch.undo()


def test_post_export_creates_html(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /export cria comic_overlay.html."""
    import app.services.comic_overlay_service as svc
    import app.services.comic_translation_service as trans

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(svc, "_OCR_AVAILABLE", False)
    monkeypatch.setattr(trans, "extract_comic_pages", lambda *a: [])

    job_id = _upload_comic_job(client, tmp_path)
    _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)
    client.get(f"/jobs/{job_id}/comic-overlay")

    resp = client.post(f"/jobs/{job_id}/comic-overlay/export")
    assert resp.status_code == 200
    data = resp.json()
    assert data["html_path"].endswith("comic_overlay.html")
    assert data["json_path"].endswith("comic_overlay.json")

    html_file = tmp_storage / "output" / str(job_id) / "comic_overlay.html"
    assert html_file.exists()

    monkeypatch.undo()


def test_review_not_modified_by_overlay(client, tmp_path: Path, tmp_storage: Path) -> None:
    """comic_review.json não é modificado após operações de overlay."""
    import app.services.comic_overlay_service as svc
    import app.services.comic_translation_service as trans

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(svc, "_OCR_AVAILABLE", False)
    monkeypatch.setattr(trans, "extract_comic_pages", lambda *a: [])

    job_id = _upload_comic_job(client, tmp_path)
    _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)

    # Inicializar revisão manualmente para ter conteúdo conhecido
    client.get(f"/jobs/{job_id}/comic-translation/review")
    review_path = tmp_storage / "output" / str(job_id) / "comic_review.json"
    review_before = review_path.read_text(encoding="utf-8")

    # Operações de overlay
    client.get(f"/jobs/{job_id}/comic-overlay")
    client.patch(
        f"/jobs/{job_id}/comic-overlay",
        json={"patches": [{"block_id": "p1_b0", "reviewed_text": "alterado via overlay"}]},
    )

    assert review_path.read_text(encoding="utf-8") == review_before

    monkeypatch.undo()
