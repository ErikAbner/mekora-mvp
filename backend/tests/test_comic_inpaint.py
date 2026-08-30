"""
Testes para comic_inpaint_service e endpoints de inpainting — Fase I.A.

Garante que:
- Imagens originais (pages/) NUNCA são modificadas
- Máscara é construída corretamente a partir de overlay_position/bbox
- Blocos invisíveis não entram na máscara
- Padding expande a máscara corretamente
- Blur fallback funciona quando OpenCV indisponível
- Algoritmos "telea"/"ns" recuam para blur se OpenCV ausente
- PNGs derivados são gerados em inpaint_pages/
- ZIP é gerado corretamente
- Endpoints GET/POST funcionam conforme esperado
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


def _make_test_image(tmp_path: Path, filename: str = "page_001.jpg", size=(20, 20)) -> Path:
    """Cria JPEG colorida para testes (maior que 1x1 para blur funcionar)."""
    try:
        from PIL import Image
        img = Image.new("RGB", size, color=(180, 180, 180))
        p = tmp_path / filename
        img.save(str(p), "JPEG")
        return p
    except Exception:
        p = tmp_path / filename
        p.write_bytes(_PNG_1X1)
        return p


def _block(
    block_id: str = "p1_b0",
    bbox=None,
    overlay_position=None,
    visibility: bool = True,
    status: str = "edited",
) -> dict:
    return {
        "block_id": block_id,
        "translated_text": "texto",
        "reviewed_text": "texto revisado",
        "review_status": status,
        "bbox": bbox or [0.1, 0.1, 0.5, 0.5],
        "overlay_position": overlay_position,
        "overlay_style": None,
        "overlay_visibility": visibility,
    }


def _make_overlay_data(job_id: int = 1, blocks=None) -> dict:
    if blocks is None:
        blocks = [_block()]
    return {
        "job_id": job_id,
        "source_language": "por",
        "target_language": "eng",
        "pages": [
            {
                "page_number": 1,
                "image_path": f"/storage/output/{job_id}/pages/page_001.jpg",
                "blocks": blocks,
                "error": None,
            }
        ],
    }


# ---------------------------------------------------------------------------
# Serviço — build_mask
# ---------------------------------------------------------------------------


def test_build_mask_from_bbox() -> None:
    """Máscara tem pixels brancos na área do bbox."""
    from app.services.comic_inpaint_service import build_mask

    blocks = [_block(bbox=[0.1, 0.1, 0.5, 0.5])]
    # img 100x100: bbox → x=10, y=10, x2=60, y2=60
    mask = build_mask(blocks, 100, 100, padding=0)

    assert mask is not None
    assert mask.getpixel((20, 20)) == 255   # dentro da área
    assert mask.getpixel((5, 5)) == 0       # fora da área


def test_build_mask_overlay_position_overrides_bbox() -> None:
    """overlay_position tem prioridade sobre bbox na construção da máscara."""
    from app.services.comic_inpaint_service import build_mask

    # bbox na região esquerda, overlay_position na direita
    blocks = [_block(
        bbox=[0.0, 0.0, 0.2, 0.2],
        overlay_position=[0.6, 0.6, 0.3, 0.3],
    )]
    mask = build_mask(blocks, 100, 100, padding=0)

    assert mask is not None
    # overlay_position cobre x=60-90, y=60-90
    assert mask.getpixel((70, 70)) == 255   # dentro do overlay_position
    assert mask.getpixel((10, 10)) == 0     # dentro do bbox → NÃO mascarado (overlay_position substituiu)


def test_build_mask_hidden_block_excluded() -> None:
    """Bloco com overlay_visibility=False não aparece na máscara."""
    from app.services.comic_inpaint_service import build_mask

    blocks = [_block(visibility=False)]
    mask = build_mask(blocks, 100, 100, padding=0)

    assert mask is not None
    assert mask.getbbox() is None  # máscara completamente preta


def test_build_mask_padding_expands_region() -> None:
    """Padding expande a região mascarada além do bbox original."""
    from app.services.comic_inpaint_service import build_mask

    # bbox → x=20, y=20, x2=30, y2=30 (img 100x100)
    blocks = [_block(bbox=[0.2, 0.2, 0.1, 0.1])]

    mask_no_pad = build_mask(blocks, 100, 100, padding=0)
    mask_with_pad = build_mask(blocks, 100, 100, padding=5)

    # Sem padding, pixel (18,18) está fora
    assert mask_no_pad.getpixel((18, 18)) == 0
    # Com padding=5: x = 20-5=15 → pixel (18,18) está dentro
    assert mask_with_pad.getpixel((18, 18)) == 255


def test_build_mask_no_position_block_skipped() -> None:
    """Bloco sem bbox nem overlay_position não gera região na máscara."""
    from app.services.comic_inpaint_service import build_mask

    blocks = [{
        "block_id": "p1_b0",
        "review_status": "edited",
        "overlay_visibility": True,
        "bbox": None,
        "overlay_position": None,
    }]
    mask = build_mask(blocks, 100, 100, padding=0)

    assert mask is not None
    assert mask.getbbox() is None


# ---------------------------------------------------------------------------
# Serviço — inpaint_page
# ---------------------------------------------------------------------------


def test_inpaint_page_blur_fallback_returns_png(tmp_path: Path) -> None:
    """Blur fallback retorna bytes PNG válidos."""
    from app.services.comic_inpaint_service import inpaint_page

    img_path = _make_test_image(tmp_path)
    blocks = [_block()]

    png_bytes, warnings, algo = inpaint_page(
        img_path, blocks, algorithm="blur", mask_padding=0, inpaint_radius=2
    )

    assert png_bytes is not None
    assert png_bytes[:4] == b"\x89PNG"
    assert algo == "blur"


def test_inpaint_page_telea_falls_back_to_blur_without_opencv(
    tmp_path: Path, monkeypatch
) -> None:
    """Algoritmo 'telea' sem OpenCV → recai para 'blur' com aviso."""
    import app.services.comic_inpaint_service as svc

    monkeypatch.setattr(svc, "_INPAINT_AVAILABLE", False)

    img_path = _make_test_image(tmp_path)
    blocks = [_block()]

    png_bytes, warnings, algo = svc.inpaint_page(
        img_path, blocks, algorithm="telea", mask_padding=0
    )

    assert png_bytes is not None
    assert algo == "blur"
    assert any("opencv" in w.lower() for w in warnings)


def test_inpaint_page_ns_falls_back_to_blur_without_opencv(
    tmp_path: Path, monkeypatch
) -> None:
    """Algoritmo 'ns' sem OpenCV → recai para 'blur' com aviso."""
    import app.services.comic_inpaint_service as svc

    monkeypatch.setattr(svc, "_INPAINT_AVAILABLE", False)

    img_path = _make_test_image(tmp_path)
    blocks = [_block()]

    png_bytes, warnings, algo = svc.inpaint_page(
        img_path, blocks, algorithm="ns", mask_padding=0
    )

    assert png_bytes is not None
    assert algo == "blur"
    assert any("opencv" in w.lower() for w in warnings)


def test_inpaint_page_empty_mask_returns_original(tmp_path: Path) -> None:
    """Máscara vazia (bloco oculto) retorna imagem original com aviso."""
    from app.services.comic_inpaint_service import inpaint_page

    img_path = _make_test_image(tmp_path)
    blocks = [_block(visibility=False)]  # oculto → máscara vazia

    png_bytes, warnings, algo = inpaint_page(img_path, blocks, algorithm="blur")

    assert png_bytes is not None
    assert any("vazia" in w.lower() for w in warnings)


def test_inpaint_page_pil_unavailable(tmp_path: Path, monkeypatch) -> None:
    """Sem Pillow retorna (None, [msg])."""
    import app.services.comic_inpaint_service as svc

    monkeypatch.setattr(svc, "_PIL_AVAILABLE", False)

    png_bytes, warnings, _ = svc.inpaint_page(Path("fake.jpg"), [], algorithm="blur")
    assert png_bytes is None
    assert len(warnings) == 1


# ---------------------------------------------------------------------------
# Pipeline — inpaint_overlay_pages
# ---------------------------------------------------------------------------


def test_inpaint_overlay_pages_creates_png(tmp_path: Path) -> None:
    """inpaint_overlay_pages salva PNG e retorna manifesto com serve_path."""
    from app.services.comic_inpaint_service import inpaint_overlay_pages

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    _make_test_image(pages_dir, "page_001.jpg")

    out_dir = tmp_path / "output"
    out_dir.mkdir()

    overlay_data = _make_overlay_data(job_id=42)
    manifest = inpaint_overlay_pages(
        overlay_data, pages_dir, out_dir, job_id=42, algorithm="blur"
    )

    assert manifest["inpainted_pages"] == 1
    assert manifest["total_pages"] == 1
    png_path = out_dir / "inpaint_pages" / "page_001.png"
    assert png_path.exists()
    assert manifest["pages"][0]["serve_path"] == (
        "/storage/output/42/inpaint_pages/page_001.png"
    )


def test_inpaint_overlay_pages_records_algorithm_used(tmp_path: Path) -> None:
    """Manifesto registra algorithm_used por página."""
    from app.services.comic_inpaint_service import inpaint_overlay_pages

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    _make_test_image(pages_dir, "page_001.jpg")

    overlay_data = _make_overlay_data(job_id=1)
    manifest = inpaint_overlay_pages(
        overlay_data, pages_dir, tmp_path, job_id=1, algorithm="blur"
    )

    assert manifest["pages"][0]["algorithm_used"] == "blur"


def test_original_image_not_modified(tmp_path: Path) -> None:
    """Imagem base NÃO é modificada pela operação de inpainting."""
    from app.services.comic_inpaint_service import inpaint_overlay_pages

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    img_path = _make_test_image(pages_dir, "page_001.jpg")

    hash_before = hashlib.sha256(img_path.read_bytes()).hexdigest()

    overlay_data = _make_overlay_data(job_id=1)
    inpaint_overlay_pages(overlay_data, pages_dir, tmp_path, job_id=1, algorithm="blur")

    hash_after = hashlib.sha256(img_path.read_bytes()).hexdigest()
    assert hash_before == hash_after, "Imagem original foi modificada — violação Fase I.A"


# ---------------------------------------------------------------------------
# Exportação ZIP
# ---------------------------------------------------------------------------


def test_export_inpaint_zip_contains_pages(tmp_path: Path) -> None:
    """ZIP contém os PNGs inpaintados."""
    from app.services.comic_inpaint_service import export_inpaint_zip, inpaint_overlay_pages

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    _make_test_image(pages_dir, "page_001.jpg")

    out_dir = tmp_path / "output"
    out_dir.mkdir()

    overlay_data = _make_overlay_data(job_id=7)
    manifest = inpaint_overlay_pages(
        overlay_data, pages_dir, out_dir, job_id=7, algorithm="blur"
    )
    zip_serve = export_inpaint_zip(manifest, out_dir, job_id=7)

    zip_file = out_dir / "inpaint_pages.zip"
    assert zip_file.exists()
    assert zip_serve == "/storage/output/7/inpaint_pages.zip"
    with zipfile.ZipFile(zip_file) as zf:
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
    """Cria comic_overlay.json + imagem de página para o job."""
    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    overlay = {
        "job_id": job_id,
        "source_language": "por",
        "target_language": "eng",
        "pages": [{
            "page_number": 1,
            "image_path": f"/storage/output/{job_id}/pages/page_001.jpg",
            "blocks": [{
                "block_id": "p1_b0",
                "original_text": "orig",
                "translated_text": "trans",
                "reviewed_text": "rev",
                "review_status": "edited",
                "bbox": [0.1, 0.1, 0.5, 0.5],
                "overlay_position": None,
                "overlay_style": None,
                "overlay_visibility": True,
            }],
            "error": None,
        }],
    }
    (out / "comic_overlay.json").write_text(json.dumps(overlay), encoding="utf-8")

    pages_dir = out / "pages"
    pages_dir.mkdir(exist_ok=True)
    try:
        from PIL import Image
        img = Image.new("RGB", (20, 20), color=(180, 180, 180))
        img.save(str(pages_dir / "page_001.jpg"), "JPEG")
    except Exception:
        (pages_dir / "page_001.jpg").write_bytes(_PNG_1X1)


def test_post_inpaint_409_not_done(client, tmp_path: Path) -> None:
    """Retorna 409 quando comic_translation_status != done."""
    job_id = _upload_comic_job(client, tmp_path)
    resp = client.post(f"/jobs/{job_id}/comic-inpaint")
    assert resp.status_code == 409


def test_post_inpaint_404_no_overlay(client, tmp_path: Path) -> None:
    """Retorna 404 quando overlay não foi inicializado."""
    job_id = _upload_comic_job(client, tmp_path)
    _set_comic_done(job_id)
    resp = client.post(f"/jobs/{job_id}/comic-inpaint")
    assert resp.status_code == 404


def test_get_inpaint_404_before_run(client, tmp_path: Path) -> None:
    """GET retorna 404 antes de executar o POST."""
    job_id = _upload_comic_job(client, tmp_path)
    _set_comic_done(job_id)
    resp = client.get(f"/jobs/{job_id}/comic-inpaint")
    assert resp.status_code == 404


def test_post_inpaint_creates_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /comic-inpaint cria manifesto com páginas inpaintadas."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    resp = client.post(
        f"/jobs/{job_id}/comic-inpaint",
        json={"params": {"algorithm": "blur", "mask_padding": 2, "inpaint_radius": 3, "feather": 0}},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "manifest" in data
    assert data["manifest"]["total_pages"] == 1
    assert data["manifest"]["inpainted_pages"] == 1
    assert data["manifest"]["params"]["algorithm"] == "blur"

    manifest_file = tmp_storage / "output" / str(job_id) / "comic_inpaint.json"
    assert manifest_file.exists()


def test_get_inpaint_manifest_after_run(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET /comic-inpaint retorna manifesto após POST ter sido executado."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    client.post(
        f"/jobs/{job_id}/comic-inpaint",
        json={"params": {"algorithm": "blur"}},
    )
    resp = client.get(f"/jobs/{job_id}/comic-inpaint")
    assert resp.status_code == 200
    assert resp.json()["manifest"]["job_id"] == job_id


def test_post_inpaint_original_not_modified(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /comic-inpaint não altera a imagem original em pages/."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)

    orig_img = tmp_storage / "output" / str(job_id) / "pages" / "page_001.jpg"
    hash_before = hashlib.sha256(orig_img.read_bytes()).hexdigest()

    client.post(
        f"/jobs/{job_id}/comic-inpaint",
        json={"params": {"algorithm": "blur"}},
    )

    hash_after = hashlib.sha256(orig_img.read_bytes()).hexdigest()
    assert hash_before == hash_after, "Imagem original foi modificada pelo endpoint de inpainting"
