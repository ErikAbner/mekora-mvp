"""
Testes para comic_review_service e endpoints de revisão — Fase E.

Garante que:
- o sidecar bruto (comic_translation.json) nunca é sobrescrito
- o sidecar de revisão (comic_review.json) é criado/atualizado corretamente
- patches atualizam reviewed_text e review_status
- estatísticas são calculadas corretamente
- exportação gera HTML e Markdown corretos
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Fixtures de dados
# ---------------------------------------------------------------------------


def _make_raw_sidecar(tmp_path: Path, pages: int = 2, blocks_per_page: int = 2) -> Path:
    """Cria um sidecar bruto no formato Fase D."""
    path = tmp_path / "comic_translation.json"
    data = {
        "job_id": 1,
        "source_language": "por",
        "target_language": "eng",
        "pages": [
            {
                "page": p,
                "blocks": [
                    {"text": f"orig p{p} b{b}", "translated": f"trans p{p} b{b}"}
                    for b in range(blocks_per_page)
                ],
            }
            for p in range(1, pages + 1)
        ],
    }
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# initialize_review
# ---------------------------------------------------------------------------


def test_initialize_review_maps_blocks(tmp_path: Path) -> None:
    """Converte formato Fase D corretamente — campos renomeados e block_id gerado."""
    from app.services.comic_review_service import initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=1, blocks_per_page=3)
    data = initialize_review(raw)

    assert data["job_id"] == 1
    page = data["pages"][0]
    assert page["page_number"] == 1
    assert len(page["blocks"]) == 3

    b0 = page["blocks"][0]
    assert b0["block_id"] == "p1_b0"
    assert b0["original_text"] == "orig p1 b0"
    assert b0["translated_text"] == "trans p1 b0"
    assert b0["reviewed_text"] == ""
    assert b0["review_status"] == "pending"
    assert b0["confidence"] is None
    assert b0["bbox"] is None


def test_initialize_review_does_not_touch_raw(tmp_path: Path) -> None:
    """O sidecar bruto não é modificado durante a inicialização."""
    from app.services.comic_review_service import initialize_review

    raw = _make_raw_sidecar(tmp_path)
    raw_before = raw.read_text(encoding="utf-8")
    initialize_review(raw)
    assert raw.read_text(encoding="utf-8") == raw_before


def test_initialize_review_multiple_pages(tmp_path: Path) -> None:
    """Cada página tem block_ids únicos e corretos."""
    from app.services.comic_review_service import initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=3, blocks_per_page=2)
    data = initialize_review(raw)

    ids = [b["block_id"] for page in data["pages"] for b in page["blocks"]]
    assert ids == ["p1_b0", "p1_b1", "p2_b0", "p2_b1", "p3_b0", "p3_b1"]


# ---------------------------------------------------------------------------
# apply_patches
# ---------------------------------------------------------------------------


def test_apply_patches_updates_reviewed_text(tmp_path: Path) -> None:
    """Patch com reviewed_text atualiza o bloco e define status=edited."""
    from app.services.comic_review_service import apply_patches, initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=1, blocks_per_page=1)
    data = initialize_review(raw)

    data = apply_patches(data, [{"block_id": "p1_b0", "reviewed_text": "revisado"}])

    block = data["pages"][0]["blocks"][0]
    assert block["reviewed_text"] == "revisado"
    assert block["review_status"] == "edited"


def test_apply_patches_updates_review_status(tmp_path: Path) -> None:
    """Patch com review_status atualiza o status sem mexer em reviewed_text."""
    from app.services.comic_review_service import apply_patches, initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=1, blocks_per_page=1)
    data = initialize_review(raw)

    data = apply_patches(data, [{"block_id": "p1_b0", "review_status": "approved"}])

    block = data["pages"][0]["blocks"][0]
    assert block["review_status"] == "approved"
    assert block["reviewed_text"] == ""


def test_apply_patches_ignores_unknown_block(tmp_path: Path) -> None:
    """Patch com block_id desconhecido não levanta erro — ignorado silenciosamente."""
    from app.services.comic_review_service import apply_patches, initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=1, blocks_per_page=1)
    data = initialize_review(raw)

    # Não deve levantar exceção
    data = apply_patches(data, [{"block_id": "p99_b0", "reviewed_text": "x"}])
    block = data["pages"][0]["blocks"][0]
    assert block["reviewed_text"] == ""


# ---------------------------------------------------------------------------
# compute_stats
# ---------------------------------------------------------------------------


def test_compute_stats_all_pending(tmp_path: Path) -> None:
    from app.services.comic_review_service import compute_stats, initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=2, blocks_per_page=3)
    data = initialize_review(raw)
    stats = compute_stats(data)

    assert stats["total"] == 6
    assert stats["pending"] == 6
    assert stats["approved"] == 0


def test_compute_stats_mixed(tmp_path: Path) -> None:
    from app.services.comic_review_service import apply_patches, compute_stats, initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=1, blocks_per_page=3)
    data = initialize_review(raw)
    data = apply_patches(data, [
        {"block_id": "p1_b0", "review_status": "approved"},
        {"block_id": "p1_b1", "reviewed_text": "texto"},
        {"block_id": "p1_b2", "review_status": "skipped"},
    ])
    stats = compute_stats(data)

    assert stats["total"] == 3
    assert stats["approved"] == 1
    assert stats["edited"] == 1
    assert stats["skipped"] == 1
    assert stats["pending"] == 0


# ---------------------------------------------------------------------------
# export_html / export_markdown
# ---------------------------------------------------------------------------


def test_export_html_contains_reviewed_text(tmp_path: Path) -> None:
    from app.services.comic_review_service import apply_patches, export_html, initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=1, blocks_per_page=1)
    data = initialize_review(raw)
    data = apply_patches(data, [{"block_id": "p1_b0", "reviewed_text": "texto revisado ok"}])

    html = export_html(data)
    assert "texto revisado ok" in html
    assert "orig p1 b0" in html
    assert "trans p1 b0" in html


def test_export_markdown_contains_reviewed_text(tmp_path: Path) -> None:
    from app.services.comic_review_service import apply_patches, export_markdown, initialize_review

    raw = _make_raw_sidecar(tmp_path, pages=1, blocks_per_page=1)
    data = initialize_review(raw)
    data = apply_patches(data, [{"block_id": "p1_b0", "reviewed_text": "revisado md"}])

    md = export_markdown(data)
    assert "revisado md" in md
    assert "orig p1 b0" in md
    assert "p1_b0" in md


# ---------------------------------------------------------------------------
# Endpoints via TestClient
# ---------------------------------------------------------------------------


def _upload_comic_job(client, tmp_path: Path) -> int:
    """Cria um job de quadrinhos e retorna o upload_id."""
    import zipfile

    cbz = tmp_path / "manga.cbz"
    png_1x1 = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    with zipfile.ZipFile(cbz, "w") as zf:
        zf.writestr("p1.jpg", png_1x1)
    with open(cbz, "rb") as f:
        resp = client.post("/upload", files={"file": ("manga.cbz", f, "application/zip")})
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def _inject_raw_sidecar(tmp_storage: Path, job_id: int) -> Path:
    """Injeta um sidecar bruto em disco e marca o job como comic_translation_status=done."""
    output_dir = tmp_storage / "output" / str(job_id)
    output_dir.mkdir(parents=True, exist_ok=True)
    raw = {
        "job_id": job_id,
        "source_language": "por",
        "target_language": "eng",
        "pages": [
            {
                "page": 1,
                "blocks": [
                    {"text": "orig", "translated": "trans"},
                ],
            }
        ],
    }
    path = output_dir / "comic_translation.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    return path


def _set_comic_translation_done(client, job_id: int) -> None:
    """Força comic_translation_status=done diretamente via DB (usando conftest SessionLocal)."""
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


def test_get_review_returns_409_when_not_done(client, tmp_path: Path) -> None:
    """Retorna 409 quando comic_translation_status != done."""
    job_id = _upload_comic_job(client, tmp_path)
    resp = client.get(f"/jobs/{job_id}/comic-translation/review")
    assert resp.status_code == 409


def test_get_review_returns_404_when_raw_missing(client, tmp_path: Path) -> None:
    """Retorna 404 quando sidecar bruto não existe em disco."""
    job_id = _upload_comic_job(client, tmp_path)
    _set_comic_translation_done(client, job_id)
    resp = client.get(f"/jobs/{job_id}/comic-translation/review")
    assert resp.status_code == 404


def test_get_review_initializes_from_raw(client, tmp_path: Path, tmp_storage: Path) -> None:
    """Inicializa comic_review.json a partir do sidecar bruto na primeira chamada."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)

    resp = client.get(f"/jobs/{job_id}/comic-translation/review")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sidecar"]["pages"][0]["blocks"][0]["block_id"] == "p1_b0"
    assert data["stats"]["pending"] == 1

    # Verifica que o review foi salvo em disco
    review_path = tmp_storage / "output" / str(job_id) / "comic_review.json"
    assert review_path.exists()


def test_patch_review_persists(client, tmp_path: Path, tmp_storage: Path) -> None:
    """PATCH persiste reviewed_text e review_status."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)

    # Inicializar
    client.get(f"/jobs/{job_id}/comic-translation/review")

    # Aplicar patch
    resp = client.patch(
        f"/jobs/{job_id}/comic-translation/review",
        json={"patches": [{"block_id": "p1_b0", "reviewed_text": "corrigido", "review_status": "approved"}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    block = data["sidecar"]["pages"][0]["blocks"][0]
    assert block["reviewed_text"] == "corrigido"
    assert block["review_status"] == "approved"
    assert data["stats"]["approved"] == 1


def test_raw_sidecar_not_modified_by_patch(client, tmp_path: Path, tmp_storage: Path) -> None:
    """O sidecar bruto não é modificado pelo PATCH."""
    job_id = _upload_comic_job(client, tmp_path)
    raw_path = _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)

    raw_before = raw_path.read_text(encoding="utf-8")

    client.get(f"/jobs/{job_id}/comic-translation/review")
    client.patch(
        f"/jobs/{job_id}/comic-translation/review",
        json={"patches": [{"block_id": "p1_b0", "reviewed_text": "alterado"}]},
    )

    assert raw_path.read_text(encoding="utf-8") == raw_before


def test_export_review_creates_files(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /export cria comic_review.html e comic_review.md."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_raw_sidecar(tmp_storage, job_id)
    _set_comic_translation_done(client, job_id)

    client.get(f"/jobs/{job_id}/comic-translation/review")

    resp = client.post(f"/jobs/{job_id}/comic-translation/review/export")
    assert resp.status_code == 200
    data = resp.json()
    assert data["html_path"].endswith("comic_review.html")
    assert data["md_path"].endswith("comic_review.md")

    html_file = tmp_storage / "output" / str(job_id) / "comic_review.html"
    md_file = tmp_storage / "output" / str(job_id) / "comic_review.md"
    assert html_file.exists()
    assert md_file.exists()
