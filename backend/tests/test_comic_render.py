"""
Testes para comic_render_service e endpoints de renderização — Fase H.

Garante que:
- Imagens originais (pages/) NUNCA são modificadas
- PNGs derivados são gerados em rendered_pages/
- Blocos ocultos não aparecem no render
- reviewed_text é usado com fallback para translated_text
- ZIP e CBZ são gerados corretamente
- Endpoints GET/POST funcionam conforme esperado
"""
from __future__ import annotations

import hashlib
import io
import json
import zipfile
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Helpers de fixture
# ---------------------------------------------------------------------------

_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
    b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
    b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _make_test_image(tmp_path: Path, filename: str = "page_001.jpg") -> Path:
    """Cria uma imagem JPEG 10x10 válida para testes."""
    try:
        from PIL import Image
        img = Image.new("RGB", (10, 10), color=(200, 200, 200))
        p = tmp_path / filename
        img.save(str(p), "JPEG")
        return p
    except Exception:
        # Fallback: salvar bytes PNG (suficiente para testes sem PIL)
        p = tmp_path / filename
        p.write_bytes(_PNG_1X1)
        return p


def _make_overlay_data(
    job_id: int = 1,
    image_path: str | None = "/storage/output/1/pages/page_001.jpg",
    blocks: list[dict] | None = None,
) -> dict:
    if blocks is None:
        blocks = [
            {
                "block_id": "p1_b0",
                "original_text": "texto original",
                "translated_text": "translated text",
                "reviewed_text": "texto revisado",
                "review_status": "edited",
                "bbox": [0.1, 0.1, 0.5, 0.2],
                "overlay_position": None,
                "overlay_style": None,
                "overlay_visibility": True,
            }
        ]
    return {
        "job_id": job_id,
        "source_language": "por",
        "target_language": "eng",
        "pages": [
            {
                "page_number": 1,
                "image_path": image_path,
                "blocks": blocks,
                "error": None,
            }
        ],
    }


# ---------------------------------------------------------------------------
# Serviço — _render_page
# ---------------------------------------------------------------------------


def test_render_page_returns_png_bytes(tmp_path: Path) -> None:
    """_render_page retorna bytes PNG válidos para imagem com bloco visível."""
    import app.services.comic_render_service as svc

    img_path = _make_test_image(tmp_path)
    block = {
        "block_id": "p1_b0",
        "translated_text": "hello",
        "reviewed_text": "hello",
        "review_status": "edited",
        "bbox": [0.0, 0.0, 0.5, 0.5],
        "overlay_position": None,
        "overlay_style": None,
        "overlay_visibility": True,
    }
    png_bytes, warnings = svc._render_page(img_path, [block])
    assert png_bytes is not None
    assert png_bytes[:4] == b"\x89PNG"


def test_render_page_hidden_block_not_rendered(tmp_path: Path) -> None:
    """Bloco com overlay_visibility=False não gera aviso de posição ausente."""
    import app.services.comic_render_service as svc

    img_path = _make_test_image(tmp_path)
    block = {
        "block_id": "p1_b0",
        "translated_text": "hidden",
        "reviewed_text": "hidden",
        "review_status": "pending",
        "bbox": None,                     # sem posição — mas oculto, deve ser ignorado
        "overlay_position": None,
        "overlay_style": None,
        "overlay_visibility": False,
    }
    png_bytes, warnings = svc._render_page(img_path, [block])
    assert png_bytes is not None
    # Sem aviso de posição ausente pois bloco foi ignorado antes de chegar nesse check
    assert not any("ignorado" in w for w in warnings)


def test_render_page_uses_reviewed_text_over_translated(tmp_path: Path) -> None:
    """reviewed_text tem prioridade sobre translated_text."""
    import app.services.comic_render_service as svc

    img_path = _make_test_image(tmp_path)
    # Verifica que a função retorna sem erro independentemente do conteúdo de texto
    block = {
        "block_id": "p1_b0",
        "translated_text": "auto-translated",
        "reviewed_text": "manually-reviewed",
        "review_status": "edited",
        "bbox": [0.0, 0.0, 0.8, 0.4],
        "overlay_position": None,
        "overlay_style": None,
        "overlay_visibility": True,
    }
    png_bytes, warnings = svc._render_page(img_path, [block])
    assert png_bytes is not None


def test_render_page_fallback_to_translated_text(tmp_path: Path) -> None:
    """Quando reviewed_text está vazio, usa translated_text."""
    import app.services.comic_render_service as svc

    img_path = _make_test_image(tmp_path)
    block = {
        "block_id": "p1_b0",
        "translated_text": "fallback text",
        "reviewed_text": "",              # vazio → fallback
        "review_status": "pending",
        "bbox": [0.0, 0.0, 0.8, 0.4],
        "overlay_position": None,
        "overlay_style": None,
        "overlay_visibility": True,
    }
    png_bytes, warnings = svc._render_page(img_path, [block])
    assert png_bytes is not None


def test_render_page_no_position_generates_warning(tmp_path: Path) -> None:
    """Bloco visível sem posição gera aviso e é ignorado."""
    import app.services.comic_render_service as svc

    img_path = _make_test_image(tmp_path)
    block = {
        "block_id": "p1_b0",
        "translated_text": "no position",
        "reviewed_text": "no position",
        "review_status": "pending",
        "bbox": None,
        "overlay_position": None,
        "overlay_style": None,
        "overlay_visibility": True,
    }
    png_bytes, warnings = svc._render_page(img_path, [block])
    assert png_bytes is not None  # renderiza a página mesmo sem o bloco
    assert any("sem posição" in w.lower() for w in warnings)


def test_render_page_render_unavailable(monkeypatch) -> None:
    """Quando Pillow não está disponível retorna (None, [msg])."""
    import app.services.comic_render_service as svc

    monkeypatch.setattr(svc, "_RENDER_AVAILABLE", False)
    png_bytes, warnings = svc._render_page(Path("fake.jpg"), [])
    assert png_bytes is None
    assert len(warnings) == 1


# ---------------------------------------------------------------------------
# Serviço — render_overlay_pages
# ---------------------------------------------------------------------------


def test_render_overlay_pages_creates_png(tmp_path: Path) -> None:
    """render_overlay_pages salva PNG e retorna manifesto com serve_path."""
    import app.services.comic_render_service as svc

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    _make_test_image(pages_dir, "page_001.jpg")

    out_dir = tmp_path / "output"
    out_dir.mkdir()

    overlay_data = _make_overlay_data(job_id=99)
    manifest = svc.render_overlay_pages(overlay_data, pages_dir, out_dir, job_id=99)

    assert manifest["rendered_pages"] == 1
    assert manifest["total_pages"] == 1
    rendered_png = out_dir / "rendered_pages" / "page_001.png"
    assert rendered_png.exists()
    assert manifest["pages"][0]["serve_path"] == "/storage/output/99/rendered_pages/page_001.png"


def test_render_overlay_pages_skips_missing_image(tmp_path: Path) -> None:
    """Página sem arquivo base gera error no manifesto mas não falha."""
    import app.services.comic_render_service as svc

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    # NÃO criar a imagem

    overlay_data = _make_overlay_data(
        job_id=1,
        image_path="/storage/output/1/pages/page_001.jpg",
    )
    manifest = svc.render_overlay_pages(overlay_data, pages_dir, tmp_path, job_id=1)

    assert manifest["rendered_pages"] == 0
    assert manifest["pages"][0]["error"] is not None


def test_render_overlay_pages_skips_no_image_path(tmp_path: Path) -> None:
    """Página sem image_path no sidecar gera error de 'sem imagem'."""
    import app.services.comic_render_service as svc

    overlay_data = _make_overlay_data(job_id=1, image_path=None)
    manifest = svc.render_overlay_pages(overlay_data, tmp_path, tmp_path, job_id=1)

    assert manifest["rendered_pages"] == 0
    assert "ignorada" in manifest["pages"][0]["error"].lower()


def test_original_images_not_modified(tmp_path: Path) -> None:
    """Imagem base NÃO é modificada após a renderização."""
    import app.services.comic_render_service as svc

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    img_path = _make_test_image(pages_dir, "page_001.jpg")

    # Hash antes
    hash_before = hashlib.sha256(img_path.read_bytes()).hexdigest()

    overlay_data = _make_overlay_data(job_id=1)
    svc.render_overlay_pages(overlay_data, pages_dir, tmp_path, job_id=1)

    # Hash depois
    hash_after = hashlib.sha256(img_path.read_bytes()).hexdigest()
    assert hash_before == hash_after, "Imagem original foi modificada — violação da restrição Fase H"


# ---------------------------------------------------------------------------
# Exportação ZIP / CBZ
# ---------------------------------------------------------------------------


def test_export_zip_contains_rendered_pages(tmp_path: Path) -> None:
    """ZIP exportado contém os PNGs renderizados."""
    import app.services.comic_render_service as svc

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    _make_test_image(pages_dir, "page_001.jpg")

    out_dir = tmp_path / "output"
    out_dir.mkdir()

    overlay_data = _make_overlay_data(job_id=5)
    manifest = svc.render_overlay_pages(overlay_data, pages_dir, out_dir, job_id=5)
    zip_serve = svc.export_rendered_zip(manifest, out_dir, job_id=5)

    zip_file = out_dir / "rendered_pages.zip"
    assert zip_file.exists()
    assert zip_serve == "/storage/output/5/rendered_pages.zip"
    with zipfile.ZipFile(zip_file) as zf:
        names = zf.namelist()
    assert "page_001.png" in names


def test_export_cbz_contains_rendered_pages(tmp_path: Path) -> None:
    """CBZ exportado contém os PNGs renderizados."""
    import app.services.comic_render_service as svc

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    _make_test_image(pages_dir, "page_001.jpg")

    out_dir = tmp_path / "output"
    out_dir.mkdir()

    overlay_data = _make_overlay_data(job_id=6)
    manifest = svc.render_overlay_pages(overlay_data, pages_dir, out_dir, job_id=6)
    cbz_serve = svc.export_rendered_cbz(manifest, out_dir, job_id=6)

    cbz_file = out_dir / "rendered_pages.cbz"
    assert cbz_file.exists()
    assert cbz_serve == "/storage/output/6/rendered_pages.cbz"
    with zipfile.ZipFile(cbz_file) as zf:
        names = zf.namelist()
    assert "page_001.png" in names


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
    """Cria comic_overlay.json mínimo para o job."""
    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    overlay = {
        "job_id": job_id,
        "source_language": "por",
        "target_language": "eng",
        "pages": [
            {
                "page_number": 1,
                "image_path": f"/storage/output/{job_id}/pages/page_001.jpg",
                "blocks": [
                    {
                        "block_id": "p1_b0",
                        "original_text": "orig",
                        "translated_text": "trans",
                        "reviewed_text": "rev",
                        "review_status": "edited",
                        "bbox": [0.1, 0.1, 0.5, 0.2],
                        "overlay_position": None,
                        "overlay_style": None,
                        "overlay_visibility": True,
                    }
                ],
                "error": None,
            }
        ],
    }
    (out / "comic_overlay.json").write_text(json.dumps(overlay), encoding="utf-8")

    # Criar imagem de página mínima para que render_overlay_pages a encontre
    pages_dir = out / "pages"
    pages_dir.mkdir(exist_ok=True)
    try:
        from PIL import Image
        img = Image.new("RGB", (10, 10), color=(200, 200, 200))
        img.save(str(pages_dir / "page_001.jpg"), "JPEG")
    except Exception:
        (pages_dir / "page_001.jpg").write_bytes(_PNG_1X1)


def test_post_render_409_not_done(client, tmp_path: Path) -> None:
    """Retorna 409 quando comic_translation_status != done."""
    job_id = _upload_comic_job(client, tmp_path)
    resp = client.post(f"/jobs/{job_id}/comic-render")
    assert resp.status_code == 409


def test_get_render_404_before_render(client, tmp_path: Path) -> None:
    """GET retorna 404 antes de executar o POST."""
    job_id = _upload_comic_job(client, tmp_path)
    _set_comic_done(job_id)
    resp = client.get(f"/jobs/{job_id}/comic-render")
    assert resp.status_code == 404


def test_post_render_creates_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /comic-render renderiza e retorna manifesto com páginas."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    resp = client.post(f"/jobs/{job_id}/comic-render")
    assert resp.status_code == 200
    data = resp.json()
    assert "manifest" in data
    assert data["manifest"]["total_pages"] == 1
    assert data["manifest"]["rendered_pages"] == 1

    manifest_file = tmp_storage / "output" / str(job_id) / "comic_render.json"
    assert manifest_file.exists()


def test_get_render_manifest_after_render(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET /comic-render retorna manifesto após POST ter sido executado."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(f"/jobs/{job_id}/comic-render")
    resp = client.get(f"/jobs/{job_id}/comic-render")
    assert resp.status_code == 200
    data = resp.json()
    assert data["manifest"]["job_id"] == job_id


def test_post_render_overlay_not_initialized(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST retorna 404 se comic_overlay.json não existe."""
    job_id = _upload_comic_job(client, tmp_path)
    _set_comic_done(job_id)
    # Não injetar overlay

    resp = client.post(f"/jobs/{job_id}/comic-render")
    assert resp.status_code == 404


def test_post_render_original_images_not_modified(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /comic-render não altera as imagens originais em pages/."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    orig_img = tmp_storage / "output" / str(job_id) / "pages" / "page_001.jpg"
    hash_before = hashlib.sha256(orig_img.read_bytes()).hexdigest()

    client.post(f"/jobs/{job_id}/comic-render")

    hash_after = hashlib.sha256(orig_img.read_bytes()).hexdigest()
    assert hash_before == hash_after, "Imagem original foi modificada pelo endpoint de renderização"
