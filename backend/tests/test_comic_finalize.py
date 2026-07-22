"""
Testes para comic_finalize_service e endpoints de curadoria final — Fase I.B.

Garante que:
- Imagens originais (pages/) NUNCA são modificadas
- Artefatos de fases anteriores (rendered_pages/, inpaint_pages/) NUNCA são modificados
- Variantes disponíveis são detectadas corretamente
- Seleções são persistidas e aplicadas no export
- Export com variante indisponível registra erro na página (sem falhar todo o export)
- ZIP e CBZ contêm as imagens corretas
"""
from __future__ import annotations

import hashlib
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


def _make_test_image(tmp_path: Path, filename: str) -> Path:
    try:
        from PIL import Image
        img = Image.new("RGB", (10, 10), color=(200, 200, 200))
        p = tmp_path / filename
        img.save(str(p), "JPEG" if filename.endswith(".jpg") else "PNG")
        return p
    except Exception:
        p = tmp_path / filename
        p.write_bytes(_PNG_1X1)
        return p


def _make_overlay_data(
    job_id: int = 1,
    image_path: str | None = "/storage/output/1/pages/page_001.jpg",
    extra_pages: bool = False,
) -> dict:
    pages = [
        {
            "page_number": 1,
            "image_path": image_path,
            "blocks": [],
            "error": None,
        }
    ]
    if extra_pages:
        pages.append(
            {
                "page_number": 2,
                "image_path": f"/storage/output/{job_id}/pages/page_002.jpg",
                "blocks": [],
                "error": None,
            }
        )
    return {
        "job_id": job_id,
        "source_language": "jpn",
        "target_language": "por",
        "pages": pages,
    }


def _setup_dirs(tmp_path: Path) -> tuple[Path, Path, Path]:
    """Cria pages/, rendered_pages/, inpaint_pages/ e retorna os 3 caminhos."""
    pages_dir = tmp_path / "pages"
    rendered_dir = tmp_path / "rendered_pages"
    inpaint_dir = tmp_path / "inpaint_pages"
    pages_dir.mkdir()
    rendered_dir.mkdir()
    inpaint_dir.mkdir()
    return pages_dir, rendered_dir, inpaint_dir


# ---------------------------------------------------------------------------
# Serviço — initialize_final_manifest
# ---------------------------------------------------------------------------


def test_initialize_manifest_original_only(tmp_path: Path) -> None:
    """Quando só pages/ existe, available_variants=['original'] e selected='original'."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")

    overlay = _make_overlay_data(job_id=1)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)

    assert manifest["total_pages"] == 1
    page = manifest["pages"][0]
    assert page["available_variants"] == ["original"]
    assert page["selected_variant"] == "original"
    assert "original" in page["serve_paths"]


def test_initialize_manifest_all_variants_available(tmp_path: Path) -> None:
    """Quando todas as pastas têm o arquivo, available_variants tem os 3."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")
    _make_test_image(rendered_dir, "page_001.png")
    _make_test_image(inpaint_dir, "page_001.png")

    overlay = _make_overlay_data(job_id=2)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 2)

    page = manifest["pages"][0]
    assert set(page["available_variants"]) == {"original", "render_overlay", "inpaint"}
    assert "render_overlay" in page["serve_paths"]
    assert "inpaint" in page["serve_paths"]


def test_initialize_manifest_no_pages(tmp_path: Path) -> None:
    """Overlay sem páginas → manifesto com total_pages=0."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    overlay = {"job_id": 1, "pages": []}
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)

    assert manifest["total_pages"] == 0
    assert manifest["pages"] == []


# ---------------------------------------------------------------------------
# Serviço — apply_final_patches
# ---------------------------------------------------------------------------


def test_apply_patches_updates_variant(tmp_path: Path) -> None:
    """Patch com selected_variant='render_overlay' atualiza a página."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")
    _make_test_image(rendered_dir, "page_001.png")

    overlay = _make_overlay_data(job_id=1)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)

    updated = svc.apply_final_patches(
        manifest, [{"page_number": 1, "selected_variant": "render_overlay"}]
    )
    assert updated["pages"][0]["selected_variant"] == "render_overlay"


def test_apply_patches_ignores_invalid_variant(tmp_path: Path) -> None:
    """Patch com variante desconhecida é ignorado; seleção original mantida."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")

    overlay = _make_overlay_data(job_id=1)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)

    updated = svc.apply_final_patches(
        manifest, [{"page_number": 1, "selected_variant": "invalid_variant"}]
    )
    assert updated["pages"][0]["selected_variant"] == "original"


def test_apply_patches_preserves_other_pages(tmp_path: Path) -> None:
    """Patch em página 1 não altera página 2."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")
    _make_test_image(pages_dir, "page_002.jpg")
    _make_test_image(rendered_dir, "page_001.png")

    overlay = _make_overlay_data(job_id=1, extra_pages=True)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)

    updated = svc.apply_final_patches(
        manifest, [{"page_number": 1, "selected_variant": "render_overlay"}]
    )
    assert updated["pages"][0]["selected_variant"] == "render_overlay"
    assert updated["pages"][1]["selected_variant"] == "original"


def test_apply_patches_updates_notes(tmp_path: Path) -> None:
    """Patch com notes atualiza o campo notes da página."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")

    overlay = _make_overlay_data(job_id=1)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)

    updated = svc.apply_final_patches(
        manifest,
        [{"page_number": 1, "selected_variant": "original", "notes": "usar original"}],
    )
    assert updated["pages"][0]["notes"] == "usar original"


def test_compute_summary_correct(tmp_path: Path) -> None:
    """summary conta corretamente as variantes selecionadas."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")
    _make_test_image(pages_dir, "page_002.jpg")
    _make_test_image(rendered_dir, "page_001.png")

    overlay = _make_overlay_data(job_id=1, extra_pages=True)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)

    updated = svc.apply_final_patches(
        manifest, [{"page_number": 1, "selected_variant": "render_overlay"}]
    )
    assert updated["summary"]["render_overlay"] == 1
    assert updated["summary"]["original"] == 1
    assert updated["summary"]["inpaint"] == 0


# ---------------------------------------------------------------------------
# Serviço — export_final_pages
# ---------------------------------------------------------------------------


def test_export_copies_original(tmp_path: Path) -> None:
    """Export com selected_variant='original' copia pages/page_001.jpg para final_pages/."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")

    overlay = _make_overlay_data(job_id=5)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 5)

    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 5)

    assert result["exported_pages"] == 1
    assert (tmp_path / "final_pages" / "page_001.png").exists()
    assert result["pages"][0]["final_serve_path"] == "/storage/output/5/final_pages/page_001.png"
    assert result["pages"][0]["export_error"] is None


def test_export_copies_render_overlay(tmp_path: Path) -> None:
    """Export com selected_variant='render_overlay' copia rendered_pages/page_001.png."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")
    _make_test_image(rendered_dir, "page_001.png")

    overlay = _make_overlay_data(job_id=6)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 6)
    manifest = svc.apply_final_patches(
        manifest, [{"page_number": 1, "selected_variant": "render_overlay"}]
    )

    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 6)

    assert result["exported_pages"] == 1
    assert result["pages"][0]["export_error"] is None


def test_export_copies_inpaint(tmp_path: Path) -> None:
    """Export com selected_variant='inpaint' copia inpaint_pages/page_001.png."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")
    _make_test_image(inpaint_dir, "page_001.png")

    overlay = _make_overlay_data(job_id=7)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 7)
    manifest = svc.apply_final_patches(
        manifest, [{"page_number": 1, "selected_variant": "inpaint"}]
    )

    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 7)

    assert result["exported_pages"] == 1
    assert result["pages"][0]["export_error"] is None


def test_export_error_when_variant_not_available(tmp_path: Path) -> None:
    """Export registra export_error quando arquivo da variante selecionada não existe."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")
    # render_overlay NÃO criado

    overlay = _make_overlay_data(job_id=8)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 8)
    # Força seleção de render_overlay mesmo sem arquivo disponível
    manifest["pages"][0]["selected_variant"] = "render_overlay"

    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 8)

    assert result["exported_pages"] == 0
    assert result["pages"][0]["export_error"] is not None
    assert "render_overlay" in result["pages"][0]["export_error"]


def test_original_not_modified_by_export(tmp_path: Path) -> None:
    """Export NUNCA modifica os arquivos das pastas de origem."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    orig = _make_test_image(pages_dir, "page_001.jpg")
    ren = _make_test_image(rendered_dir, "page_001.png")

    hash_orig_before = hashlib.sha256(orig.read_bytes()).hexdigest()
    hash_ren_before = hashlib.sha256(ren.read_bytes()).hexdigest()

    overlay = _make_overlay_data(job_id=9)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 9)
    svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 9)

    assert hashlib.sha256(orig.read_bytes()).hexdigest() == hash_orig_before
    assert hashlib.sha256(ren.read_bytes()).hexdigest() == hash_ren_before


def test_export_zip_contains_pages(tmp_path: Path) -> None:
    """ZIP gerado contém as páginas exportadas."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")

    overlay = _make_overlay_data(job_id=10)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 10)
    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 10)

    assert result["zip_path"] == "/storage/output/10/final_pages.zip"
    zip_file = tmp_path / "final_pages.zip"
    assert zip_file.exists()
    with zipfile.ZipFile(zip_file) as zf:
        assert "page_001.png" in zf.namelist()


def test_export_cbz_contains_pages(tmp_path: Path) -> None:
    """CBZ gerado contém as páginas exportadas."""
    import app.services.comic_finalize_service as svc

    pages_dir, rendered_dir, inpaint_dir = _setup_dirs(tmp_path)
    _make_test_image(pages_dir, "page_001.jpg")

    overlay = _make_overlay_data(job_id=11)
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 11)
    result = svc.export_final_pages(manifest, pages_dir, rendered_dir, inpaint_dir, tmp_path, 11)

    assert result["cbz_path"] == "/storage/output/11/final_pages.cbz"
    cbz_file = tmp_path / "final_pages.cbz"
    assert cbz_file.exists()
    with zipfile.ZipFile(cbz_file) as zf:
        assert "page_001.png" in zf.namelist()


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
    try:
        from PIL import Image
        img = Image.new("RGB", (10, 10), color=(200, 200, 200))
        img.save(str(pages_dir / "page_001.jpg"), "JPEG")
    except Exception:
        (pages_dir / "page_001.jpg").write_bytes(_PNG_1X1)


def test_post_finalize_409_not_done(client, tmp_path: Path) -> None:
    """Retorna 409 quando comic_translation_status != done."""
    job_id = _upload_comic_job(client, tmp_path)
    resp = client.post(f"/jobs/{job_id}/comic-finalize")
    assert resp.status_code == 409


def test_post_finalize_404_no_overlay(client, tmp_path: Path) -> None:
    """Retorna 404 quando comic_overlay.json não existe."""
    job_id = _upload_comic_job(client, tmp_path)
    _set_comic_done(job_id)
    resp = client.post(f"/jobs/{job_id}/comic-finalize")
    assert resp.status_code == 404


def test_get_finalize_404_before_post(client, tmp_path: Path) -> None:
    """GET retorna 404 antes de executar o POST."""
    job_id = _upload_comic_job(client, tmp_path)
    _set_comic_done(job_id)
    resp = client.get(f"/jobs/{job_id}/comic-finalize")
    assert resp.status_code == 404


def test_post_finalize_creates_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /comic-finalize cria o manifesto e retorna total_pages correto."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    resp = client.post(f"/jobs/{job_id}/comic-finalize")
    assert resp.status_code == 200
    data = resp.json()
    assert "manifest" in data
    assert data["manifest"]["total_pages"] == 1
    assert data["manifest"]["pages"][0]["selected_variant"] == "original"

    manifest_file = tmp_storage / "output" / str(job_id) / "comic_final_manifest.json"
    assert manifest_file.exists()


def test_patch_finalize_updates_selection(client, tmp_path: Path, tmp_storage: Path) -> None:
    """PATCH atualiza a selected_variant da página."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(f"/jobs/{job_id}/comic-finalize")
    resp = client.patch(
        f"/jobs/{job_id}/comic-finalize",
        json={"patches": [{"page_number": 1, "selected_variant": "render_overlay"}]},
    )
    assert resp.status_code == 200
    assert resp.json()["manifest"]["pages"][0]["selected_variant"] == "render_overlay"


def test_get_finalize_returns_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET retorna o manifesto após POST."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(f"/jobs/{job_id}/comic-finalize")
    resp = client.get(f"/jobs/{job_id}/comic-finalize")
    assert resp.status_code == 200
    assert resp.json()["manifest"]["job_id"] == job_id


def test_post_finalize_export_requires_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /comic-finalize/export retorna 404 se manifesto não existe."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    resp = client.post(f"/jobs/{job_id}/comic-finalize/export")
    assert resp.status_code == 404


def test_post_finalize_export_creates_zip(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /comic-finalize/export gera ZIP quando variante original está disponível."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(f"/jobs/{job_id}/comic-finalize")
    resp = client.post(f"/jobs/{job_id}/comic-finalize/export")
    assert resp.status_code == 200
    data = resp.json()
    assert data["manifest"]["exported_pages"] == 1
    assert data["manifest"]["zip_path"] is not None

    zip_file = tmp_storage / "output" / str(job_id) / "final_pages.zip"
    assert zip_file.exists()


def test_post_finalize_export_original_not_modified(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """Export NUNCA modifica as imagens originais em pages/."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    orig_img = tmp_storage / "output" / str(job_id) / "pages" / "page_001.jpg"
    hash_before = hashlib.sha256(orig_img.read_bytes()).hexdigest()

    client.post(f"/jobs/{job_id}/comic-finalize")
    client.post(f"/jobs/{job_id}/comic-finalize/export")

    hash_after = hashlib.sha256(orig_img.read_bytes()).hexdigest()
    assert hash_before == hash_after, "Imagem original foi modificada pelo export final"
