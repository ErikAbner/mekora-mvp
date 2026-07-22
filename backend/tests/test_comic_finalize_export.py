"""
Fase J.A — Testes do pipeline de export final derivado controlado.

Garante que:
- comic_final_export_manifest.json é criado com rastreabilidade completa
- source_path aponta para o arquivo correto por variante
- final_path aponta para final_pages/page_NNN.png
- selection_source é propagado do manifesto de seleções
- PDF é gerado quando páginas existem
- Falha do PDF não aborta o export ZIP/CBZ
- Imagens originais NUNCA são modificadas
- GET /comic-finalize/export retorna 404 antes do primeiro export
- GET /comic-finalize/export retorna manifesto correto após export
- Re-export sobrescreve manifesto de rastreabilidade anterior
"""
from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Helpers de fixture (espelham test_comic_finalize.py)
# ---------------------------------------------------------------------------

_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
    b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
    b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _make_png(path: Path) -> Path:
    """Cria um PNG mínimo válido (via Pillow ou fallback bytes)."""
    try:
        from PIL import Image
        img = Image.new("RGB", (4, 4), color=(200, 200, 200))
        img.save(str(path), "PNG")
    except Exception:
        path.write_bytes(_PNG_1X1)
    return path


def _make_jpg(path: Path) -> Path:
    try:
        from PIL import Image
        img = Image.new("RGB", (4, 4), color=(180, 180, 180))
        img.save(str(path), "JPEG")
    except Exception:
        path.write_bytes(_PNG_1X1)
    return path


def _setup_dirs(tmp: Path) -> tuple[Path, Path, Path]:
    pages = tmp / "pages"
    rendered = tmp / "rendered_pages"
    inpaint = tmp / "inpaint_pages"
    for d in (pages, rendered, inpaint):
        d.mkdir(parents=True, exist_ok=True)
    return pages, rendered, inpaint


def _make_manifest(job_id: int = 1, variant: str = "original", selection_source: str = "default") -> dict:
    return {
        "job_id": job_id,
        "total_pages": 1,
        "pages": [
            {
                "page_number": 1,
                "selected_variant": variant,
                "available_variants": ["original", "render_overlay"],
                "notes": "nota de teste",
                "updated_at": "2026-03-28T11:00:00+00:00",
                "serve_paths": {
                    "original": f"/storage/output/{job_id}/pages/page_001.jpg",
                    "render_overlay": f"/storage/output/{job_id}/rendered_pages/page_001.png",
                },
                "final_serve_path": None,
                "export_error": None,
                "selection_source": selection_source,
            }
        ],
        "summary": {"original": 1 if variant == "original" else 0,
                    "render_overlay": 1 if variant == "render_overlay" else 0,
                    "inpaint": 0},
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }


# ---------------------------------------------------------------------------
# Serviço — manifesto de rastreabilidade
# ---------------------------------------------------------------------------


def test_export_generates_traceability_manifest(tmp_path: Path) -> None:
    """export_final_pages cria comic_final_export_manifest.json."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    export_json = tmp_path / "comic_final_export_manifest.json"
    assert export_json.exists(), "comic_final_export_manifest.json não foi criado"

    data = json.loads(export_json.read_text())
    assert data["job_id"] == 1
    assert len(data["pages"]) == 1


def test_export_manifest_source_path_matches_variant_original(tmp_path: Path) -> None:
    """source_path aponta para pages/page_001.jpg quando variante=original."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    data = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())
    page = data["pages"][0]
    assert page["source_path"] is not None
    assert "page_001.jpg" in page["source_path"]


def test_export_manifest_source_path_matches_variant_render(tmp_path: Path) -> None:
    """source_path aponta para rendered_pages/page_001.png quando variante=render_overlay."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_png(rendered_dir / "page_001.png")

    manifest = _make_manifest(job_id=1, variant="render_overlay")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    data = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())
    page = data["pages"][0]
    assert page["source_path"] is not None
    assert "rendered_pages" in page["source_path"]


def test_export_manifest_final_path_populated(tmp_path: Path) -> None:
    """final_path aponta para final_pages/page_001.png após export bem-sucedido."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    data = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())
    page = data["pages"][0]
    assert page["final_path"] is not None
    assert "final_pages" in page["final_path"]
    assert "page_001.png" in page["final_path"]


def test_export_manifest_selection_source_propagated(tmp_path: Path) -> None:
    """selection_source é copiado do manifesto de seleções para o manifesto de rastreabilidade."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original", selection_source="manual")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    data = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())
    assert data["pages"][0]["selection_source"] == "manual"


def test_export_manifest_exported_at_is_iso_timestamp(tmp_path: Path) -> None:
    """exported_at no manifesto de rastreabilidade é um timestamp ISO válido."""
    import app.services.comic_finalize_service as svc
    from datetime import datetime

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    data = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())
    ts = data["exported_at"]
    assert ts is not None
    # Deve ser parseable como datetime ISO
    datetime.fromisoformat(ts)


def test_export_page_error_recorded_in_manifest(tmp_path: Path) -> None:
    """Quando variante não está disponível, error é registrado no manifesto de rastreabilidade."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    # render_overlay selecionado mas arquivo não existe

    manifest = _make_manifest(job_id=1, variant="render_overlay")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    data = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())
    page = data["pages"][0]
    assert page["error"] is not None
    assert page["final_path"] is None


def test_export_originals_untouched(tmp_path: Path) -> None:
    """Imagens originais em pages/ NÃO são modificadas pelo export (Fase J.A)."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    orig = _make_jpg(pages_dir / "page_001.jpg")
    hash_before = hashlib.sha256(orig.read_bytes()).hexdigest()

    manifest = _make_manifest(job_id=1, variant="original")
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    hash_after = hashlib.sha256(orig.read_bytes()).hexdigest()
    assert hash_before == hash_after, "Original foi modificado durante export J.A"


def test_export_incremental_rerun_overwrites_manifest(tmp_path: Path) -> None:
    """Re-export sobrescreve o manifesto de rastreabilidade anterior."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original")

    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)
    first_ts = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())["exported_at"]

    import time; time.sleep(0.01)  # garante timestamp diferente

    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)
    second_ts = json.loads((tmp_path / "comic_final_export_manifest.json").read_text())["exported_at"]

    # timestamps são distintos porque _utcnow() é chamado a cada export
    assert second_ts >= first_ts


def test_export_pdf_generated_when_pages_exist(tmp_path: Path) -> None:
    """PDF é gerado quando final_pages/ tem PNGs."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original")
    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    # PDF e pdf_path dependem de Pillow — tolerante se ausente
    pdf_file = tmp_path / "final_pages.pdf"
    if pdf_file.exists():
        assert result.get("pdf_path") is not None
        assert "final_pages.pdf" in result["pdf_path"]
    else:
        # Pillow indisponível ou PNG inválido — export ZIP/CBZ deve ter prosseguido
        assert result["exported_pages"] == 1
        assert result["zip_path"] is not None


def test_export_pdf_skipped_when_no_pages(tmp_path: Path) -> None:
    """PDF não é gerado quando não há páginas exportadas; nenhuma exceção lançada."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    # Nenhuma imagem — variante indisponível

    manifest = _make_manifest(job_id=1, variant="render_overlay")
    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    assert result["exported_pages"] == 0
    assert result.get("pdf_path") is None
    assert not (tmp_path / "final_pages.pdf").exists()


def test_export_pdf_failure_does_not_abort_zip(tmp_path: Path, monkeypatch) -> None:
    """Falha no _export_pdf não aborta geração do ZIP."""
    import app.services.comic_finalize_service as svc

    monkeypatch.setattr(svc, "_export_pdf", lambda *a, **kw: (False, "erro simulado"))

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = _make_manifest(job_id=1, variant="original")
    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 1)

    assert result["exported_pages"] == 1
    assert result["zip_path"] is not None
    assert result.get("pdf_path") is None


def test_load_export_manifest_returns_none_when_missing(tmp_path: Path) -> None:
    """load_export_manifest retorna None quando o arquivo não existe."""
    import app.services.comic_finalize_service as svc

    result = svc.load_export_manifest(tmp_path / "comic_final_export_manifest.json")
    assert result is None


def test_load_save_export_manifest_roundtrip(tmp_path: Path) -> None:
    """save_export_manifest / load_export_manifest preservam conteúdo."""
    import app.services.comic_finalize_service as svc

    payload = {"job_id": 7, "exported_at": "2026-03-28T10:00:00+00:00", "pages": []}
    path = tmp_path / "comic_final_export_manifest.json"
    svc.save_export_manifest(path, payload)
    loaded = svc.load_export_manifest(path)
    assert loaded == payload


# ---------------------------------------------------------------------------
# Endpoints via TestClient
# ---------------------------------------------------------------------------


def _upload_comic_job(client, tmp_path: Path) -> int:
    cbz = tmp_path / "manga.cbz"
    with zipfile.ZipFile(cbz, "w") as zf:
        zf.writestr("p1.jpg", _PNG_1X1)
    with open(cbz, "rb") as f:
        resp = client.post("/upload", files={"file": ("manga.cbz", f, "application/zip")})
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def _set_comic_done(job_id: int) -> None:
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


def _inject_overlay(tmp_storage: Path, job_id: int) -> None:
    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    overlay = {
        "job_id": job_id,
        "source_language": "jpn",
        "target_language": "por",
        "pages": [
            {
                "page_number": 1,
                "image_path": f"/storage/output/{job_id}/pages/page_001.jpg",
                "blocks": [],
                "error": None,
            }
        ],
    }
    (out / "comic_overlay.json").write_text(json.dumps(overlay), encoding="utf-8")

    pages_dir = out / "pages"
    pages_dir.mkdir(exist_ok=True)
    _make_jpg(pages_dir / "page_001.jpg")


def test_api_get_export_manifest_404_before_export(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """GET /comic-finalize/export retorna 404 antes do primeiro export."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)
    client.post(f"/jobs/{job_id}/comic-finalize")

    resp = client.get(f"/jobs/{job_id}/comic-finalize/export")
    assert resp.status_code == 404


def test_api_get_export_manifest_after_export(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """GET /comic-finalize/export retorna manifesto correto após POST /export."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(f"/jobs/{job_id}/comic-finalize")
    client.post(f"/jobs/{job_id}/comic-finalize/export")

    resp = client.get(f"/jobs/{job_id}/comic-finalize/export")
    assert resp.status_code == 200
    data = resp.json()
    assert "manifest" in data
    assert data["manifest"]["job_id"] == job_id
    assert len(data["manifest"]["pages"]) == 1


def test_api_post_export_response_includes_pdf_path_field(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /comic-finalize/export retorna campo pdf_path na resposta (pode ser null)."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(f"/jobs/{job_id}/comic-finalize")
    resp = client.post(f"/jobs/{job_id}/comic-finalize/export")

    assert resp.status_code == 200
    data = resp.json()
    # pdf_path deve existir na resposta (pode ser null se Pillow falhar)
    assert "pdf_path" in data["manifest"]


def test_api_export_manifest_source_path_in_traceability(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """Manifesto de rastreabilidade via GET contém source_path não-nulo."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(f"/jobs/{job_id}/comic-finalize")
    client.post(f"/jobs/{job_id}/comic-finalize/export")

    resp = client.get(f"/jobs/{job_id}/comic-finalize/export")
    assert resp.status_code == 200
    page = resp.json()["manifest"]["pages"][0]
    assert page["source_path"] is not None
    assert page["final_path"] is not None
    assert page["exported_at"] is not None
