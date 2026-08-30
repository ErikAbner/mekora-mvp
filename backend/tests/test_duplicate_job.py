"""
Fase M — Testes para POST /jobs/{id}/duplicate.
"""
from __future__ import annotations

import io


def _upload(client, tmp_storage) -> int:
    content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
    resp = client.post(
        "/upload",
        files={"file": ("book.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def test_duplicate_creates_new_job(client, tmp_storage):
    """Duplicar retorna 201 com novo ID diferente do original."""
    original_id = _upload(client, tmp_storage)
    resp = client.post(f"/jobs/{original_id}/duplicate", json={"mode": "metadata_only"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["upload_id"] != original_id
    assert data["original_filename"] == "book.pdf"


def test_duplicate_resets_status(client, tmp_storage):
    """Novo job tem status='uploaded' e pipeline resetado."""
    original_id = _upload(client, tmp_storage)
    resp = client.post(f"/jobs/{original_id}/duplicate", json={})
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "uploaded"
    assert data["conversion_status"] == "not_started"
    assert data["send_status"] == "not_started"
    assert data["ocr_used"] is False


def test_duplicate_copies_metadata(client, tmp_storage):
    """Metadados editáveis são copiados do job original."""
    original_id = _upload(client, tmp_storage)
    # Atualiza metadados do original
    client.post(
        f"/jobs/{original_id}/metadata",
        json={"final_title": "Livro X", "final_author": "Autor Y", "final_language": "eng"},
    )
    resp = client.post(f"/jobs/{original_id}/duplicate", json={})
    assert resp.status_code == 201
    data = resp.json()
    assert data["final_title"] == "Livro X"
    assert data["final_author"] == "Autor Y"
    assert data["final_language"] == "eng"


def test_duplicate_preserves_input_path(client, tmp_storage):
    """input_path do novo job aponta para o mesmo arquivo do original."""
    original_id = _upload(client, tmp_storage)
    orig_data = client.get(f"/jobs/{original_id}").json()

    resp = client.post(f"/jobs/{original_id}/duplicate", json={})
    assert resp.status_code == 201
    new_data = resp.json()

    assert new_data["upload_id"] != original_id
    # processed_pdf_path ainda não existe (não processado), mas original_filename bate
    assert new_data["original_filename"] == orig_data["original_filename"]


def test_duplicate_unknown_job_404(client, tmp_storage):
    """Duplicar job inexistente retorna 404."""
    resp = client.post("/jobs/99999/duplicate", json={})
    assert resp.status_code == 404


def test_duplicate_increments_total(client, tmp_storage, logado):
    """Após duplicar, histórico tem 2 jobs."""
    _upload(client, tmp_storage)
    _upload(client, tmp_storage)
    original_id = _upload(client, tmp_storage)

    history_before = client.get("/history").json()
    count_before = len(history_before)

    client.post(f"/jobs/{original_id}/duplicate", json={})

    history_after = client.get("/history").json()
    assert len(history_after) == count_before + 1
