"""v1.2.2 — limites de páginas e imagens (P5)."""
from __future__ import annotations

import io

import pytest


def _tiny_png_bytes() -> bytes:
    from PIL import Image
    b = io.BytesIO()
    Image.new("RGB", (16, 16), (100, 100, 100)).save(b, "PNG")
    return b.getvalue()


class _FakeEngine:
    def translate(self, text, src, tgt): return f"T:{text}"
    def is_pair_available(self, s, t): return True


def test_max_pages_enforced(tmp_path, monkeypatch):
    """Extração devolve N páginas > limits.max_pages → PageLimitExceededError."""
    from app.core import limits as _limits
    from app.services import comic_translation_service as cts

    small = _limits.Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=100, archive_max_entry_mb=50,
        max_pages=3, image_max_pixels=1_000_000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(cts, "limits", small)

    def fake_extract(path, fmt): return [_tiny_png_bytes()] * 5
    monkeypatch.setattr(cts, "extract_comic_pages", fake_extract)

    with pytest.raises(cts.PageLimitExceededError):
        cts.run_comic_translation_pipeline(
            job_id=1, input_path="x", input_format="cbz",
            source_lang="eng", target_lang="por",
            engine=_FakeEngine(), output_dir=tmp_path,
        )


def test_image_bomb_becomes_domain_error(tmp_path, monkeypatch):
    """PIL DecompressionBombError → ImageBombError, sem crash."""
    from app.services import comic_translation_service as cts
    from PIL import Image

    if not cts._OCR_AVAILABLE:
        pytest.skip("pytesseract não instalado neste ambiente")

    # Intercepta Image.open já retornando um objeto cujo .load() estoura
    class _BombImg:
        size = (1, 1)
        def load(self):
            raise Image.DecompressionBombError("too big")

    monkeypatch.setattr(cts._PILImage, "open", lambda *a, **kw: _BombImg())

    with pytest.raises(cts.ImageBombError):
        cts.ocr_page(_tiny_png_bytes(), "eng")


def test_pillow_max_image_pixels_set_to_limit():
    """A proteção nativa do Pillow reflete o limite central."""
    from app.core.limits import limits
    from PIL import Image
    assert Image.MAX_IMAGE_PIXELS == limits.image_max_pixels


def test_pipeline_page_bomb_recorded_and_not_aborted(tmp_path, monkeypatch):
    """Uma página bomb registra 'error' na página mas não aborta o pipeline."""
    from app.services import comic_translation_service as cts

    def fake_extract(path, fmt):
        return [_tiny_png_bytes(), _tiny_png_bytes()]

    call_count = {"n": 0}

    def fake_ocr(img_bytes, lang):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise cts.ImageBombError("página gigante")
        return ["hello"]

    monkeypatch.setattr(cts, "extract_comic_pages", fake_extract)
    monkeypatch.setattr(cts, "ocr_page", fake_ocr)

    json_path, _ = cts.run_comic_translation_pipeline(
        job_id=1, input_path="x", input_format="cbz",
        source_lang="eng", target_lang="por",
        engine=_FakeEngine(), output_dir=tmp_path,
    )
    import json
    data = json.loads(json_path.read_text())
    assert data["pages"][0]["error"]  # página 1 marcada com erro
    assert data["pages"][1]["blocks"]  # página 2 processada normalmente
