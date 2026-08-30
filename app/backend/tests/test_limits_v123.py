"""
v1.2.3 — testes específicos das três correções:
1. limite real de pixels (default conservador + checagem exata w×h);
2. preflight real de 7z antes de extractall;
3. KLT_* inválido falha no startup (não cai para default).
"""
from __future__ import annotations

import importlib
import io
import os
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# 1) Limite real de pixels
# ---------------------------------------------------------------------------

def test_image_max_pixels_default_is_conservative():
    from app.core.limits import limits
    # Default v1.2.3: 100 MP (cobre A4 @ 600 DPI). Nunca deve subir
    # silenciosamente. Ficamos ≤ 200 MP como teto de sanidade.
    assert 50_000_000 <= limits.image_max_pixels <= 200_000_000


def test_ocr_page_rejects_over_limit_by_dimensions(monkeypatch, tmp_path):
    """
    Rejeição EXATA por (width × height) antes de img.load() — sem depender
    da regra do Pillow "erro só em 2× MAX_IMAGE_PIXELS". Usa mock, sem
    criar imagem real gigante.
    """
    from app.services import comic_translation_service as cts
    if not cts._OCR_AVAILABLE:
        pytest.skip("pytesseract não instalado")

    load_called = {"n": 0}

    class _FakeImg:
        # 12000×12000 = 144 MP > default 100 MP
        size = (12_000, 12_000)

        def load(self):
            load_called["n"] += 1

    monkeypatch.setattr(cts._PILImage, "open", lambda *a, **kw: _FakeImg())

    with pytest.raises(cts.ImageBombError):
        cts.ocr_page(b"anything", "eng")

    # A rejeição aconteceu ANTES de load()
    assert load_called["n"] == 0


def test_ocr_page_accepts_normal_image(monkeypatch):
    """Imagem normal (bem abaixo do limite) passa."""
    from app.services import comic_translation_service as cts
    if not cts._OCR_AVAILABLE:
        pytest.skip("pytesseract não instalado")

    class _FakeImg:
        size = (2000, 3000)  # 6 MP — bem abaixo do default
        def load(self): pass

    monkeypatch.setattr(cts._PILImage, "open", lambda *a, **kw: _FakeImg())
    monkeypatch.setattr(
        cts, "_pytesseract",
        type("m", (), {"image_to_string": staticmethod(lambda img, lang: "hello\n\nworld")})(),
    )
    assert cts.ocr_page(b"anything", "eng") == ["hello", "world"]


def test_ocr_page_treats_pillow_warning_as_error(monkeypatch):
    """DecompressionBombWarning é elevado a erro no escopo controlado."""
    from app.services import comic_translation_service as cts
    from PIL import Image as _PIL
    if not cts._OCR_AVAILABLE:
        pytest.skip("pytesseract não instalado")

    class _FakeImg:
        size = (5000, 5000)  # abaixo do custom limit, mas Pillow avisa
        def load(self):
            import warnings as _w
            _w.warn("decompression bomb warning", _PIL.DecompressionBombWarning)

    monkeypatch.setattr(cts._PILImage, "open", lambda *a, **kw: _FakeImg())
    with pytest.raises(cts.ImageBombError):
        cts.ocr_page(b"anything", "eng")


def test_pillow_max_image_pixels_not_globally_disabled():
    """Nunca `Image.MAX_IMAGE_PIXELS = None`. Deve ser um int > 0."""
    from PIL import Image
    assert isinstance(Image.MAX_IMAGE_PIXELS, int)
    assert Image.MAX_IMAGE_PIXELS > 0


# ---------------------------------------------------------------------------
# 2) Preflight real de 7z
# ---------------------------------------------------------------------------

class _FakeSZInfo:
    def __init__(self, filename, uncompressed=100, is_directory=False, archivable=True):
        self.filename = filename
        self.uncompressed = uncompressed
        self.compressed = uncompressed  # não usado, mas presente na API
        self.is_directory = is_directory
        self.archivable = archivable


class _FakeSZ:
    def __init__(self, infos, extract_raises=None):
        self._infos = infos
        self._extract_raises = extract_raises
        self.extracted = False

    def list(self):
        return list(self._infos)

    def extractall(self, path=None):
        if self._extract_raises:
            raise self._extract_raises
        self.extracted = True


def test_inspect_7z_rejects_over_limits(monkeypatch, tmp_path):
    """`inspect_7z_members` (preflight) rejeita ANTES de extractall."""
    from app.services import archive_safety as a
    from app.core.limits import Limits

    tiny = Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=1, archive_max_entry_mb=1,
        max_pages=100, image_max_pixels=1000,
        calibre_timeout_seconds=60, kcc_timeout_seconds=60,
        subprocess_output_max_bytes=1024, ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(a, "limits", tiny)
    huge = _FakeSZ([_FakeSZInfo("big.png", uncompressed=5 * 1024 * 1024)])
    with pytest.raises(a.ArchiveSafetyError) as exc:
        a.inspect_7z_members(huge)
    assert exc.value.code == "ARCHIVE_ENTRY_TOO_LARGE"


def test_safe_extract_7z_runs_preflight_before_extractall(monkeypatch, tmp_path):
    """Se a soma declarada excede o limite, extractall NÃO deve rodar."""
    from app.services import archive_safety as a
    from app.core.limits import Limits

    tiny = Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=1, archive_max_entry_mb=100,
        max_pages=100, image_max_pixels=1000,
        calibre_timeout_seconds=60, kcc_timeout_seconds=60,
        subprocess_output_max_bytes=1024, ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(a, "limits", tiny)

    fake = _FakeSZ([
        _FakeSZInfo(f"p{i}.png", uncompressed=700_000)
        for i in range(5)  # soma = 3.5 MB > 1 MB
    ])
    dest = tmp_path / "d"
    dest.mkdir()
    with pytest.raises(a.ArchiveSafetyError) as exc:
        a.safe_extract_7z(fake, dest)
    assert exc.value.code == "ARCHIVE_TOTAL_TOO_LARGE"
    assert fake.extracted is False  # nunca escreveu no disco


def test_safe_extract_7z_rejects_bad_name_before_write(monkeypatch, tmp_path):
    from app.services import archive_safety as a
    fake = _FakeSZ([_FakeSZInfo("../evil.png", uncompressed=100)])
    dest = tmp_path / "d"
    dest.mkdir()
    with pytest.raises(a.ArchiveSafetyError):
        a.safe_extract_7z(fake, dest)
    assert fake.extracted is False


def test_safe_extract_7z_rejects_non_regular(monkeypatch, tmp_path):
    from app.services import archive_safety as a
    fake = _FakeSZ([_FakeSZInfo("weird", uncompressed=10, archivable=False)])
    dest = tmp_path / "d"
    dest.mkdir()
    with pytest.raises(a.ArchiveSafetyError) as exc:
        a.safe_extract_7z(fake, dest)
    assert exc.value.code == "ARCHIVE_NON_REGULAR_ENTRY"
    assert fake.extracted is False


def test_safe_extract_7z_valid_extracts_and_validates(monkeypatch, tmp_path):
    """Metadata OK → extractall roda → validação pós-escrita passa."""
    from app.services import archive_safety as a

    class _RealisticSZ(_FakeSZ):
        def extractall(self, path=None):
            self.extracted = True
            # Escreve pequeno arquivo dentro do dest para simular extração real
            out = Path(path) / "page.png"
            out.write_bytes(b"x" * 50)

    fake = _RealisticSZ([_FakeSZInfo("page.png", uncompressed=50)])
    dest = tmp_path / "d"
    dest.mkdir()
    a.safe_extract_7z(fake, dest)
    assert fake.extracted is True
    assert (dest / "page.png").exists()


def test_safe_extract_7z_cleans_on_extract_failure(monkeypatch, tmp_path):
    """Se extractall falha, dest_dir é limpo e recriado vazio."""
    from app.services import archive_safety as a

    fake = _FakeSZ(
        [_FakeSZInfo("page.png", uncompressed=50)],
        extract_raises=RuntimeError("boom"),
    )
    dest = tmp_path / "d"
    dest.mkdir()
    # Deixa lixo para provar que é limpo
    (dest / "leftover.txt").write_bytes(b"junk")
    with pytest.raises(a.ArchiveSafetyError) as exc:
        a.safe_extract_7z(fake, dest)
    assert exc.value.code == "ARCHIVE_EXTRACT_FAILED"
    assert dest.exists()
    assert list(dest.iterdir()) == []  # limpo


# ---------------------------------------------------------------------------
# 3) Configuração KLT_* fail-fast
# ---------------------------------------------------------------------------

def _reload_limits():
    """Recarrega o módulo para reavaliar env com _ENV_ERRORS zerado."""
    import app.core.limits as L
    importlib.reload(L)
    return L


def test_env_missing_uses_default(monkeypatch):
    monkeypatch.delenv("KLT_UPLOAD_MAX_MB", raising=False)
    L = _reload_limits()
    assert L.limits.upload_max_mb == 600  # default
    L.validate_limits()  # não deve levantar


def test_env_empty_uses_default(monkeypatch):
    monkeypatch.setenv("KLT_UPLOAD_MAX_MB", "")
    L = _reload_limits()
    assert L.limits.upload_max_mb == 600
    L.validate_limits()


def test_env_valid_integer_accepted(monkeypatch):
    monkeypatch.setenv("KLT_UPLOAD_MAX_MB", "800")
    L = _reload_limits()
    assert L.limits.upload_max_mb == 800
    L.validate_limits()


def test_env_invalid_int_fails_startup(monkeypatch):
    monkeypatch.setenv("KLT_UPLOAD_MAX_MB", "not-a-number")
    L = _reload_limits()
    with pytest.raises(L.LimitsInvalidError) as exc:
        L.validate_limits()
    # Mensagem contém somente o NOME da variável — nunca o valor
    assert "KLT_UPLOAD_MAX_MB" in str(exc.value)
    assert "not-a-number" not in str(exc.value)


def test_env_multiple_invalid_all_reported(monkeypatch):
    monkeypatch.setenv("KLT_UPLOAD_MAX_MB", "abc")
    monkeypatch.setenv("KLT_MAX_PAGES", "xyz")
    L = _reload_limits()
    with pytest.raises(L.LimitsInvalidError) as exc:
        L.validate_limits()
    msg = str(exc.value)
    assert "KLT_UPLOAD_MAX_MB" in msg
    assert "KLT_MAX_PAGES" in msg
    assert "abc" not in msg and "xyz" not in msg


def test_env_zero_fails_startup(monkeypatch):
    monkeypatch.setenv("KLT_UPLOAD_MAX_MB", "0")
    L = _reload_limits()
    with pytest.raises(L.LimitsInvalidError):
        L.validate_limits()


def test_env_negative_fails_startup(monkeypatch):
    monkeypatch.setenv("KLT_MAX_PAGES", "-5")
    L = _reload_limits()
    with pytest.raises(L.LimitsInvalidError):
        L.validate_limits()


def test_env_incoherent_entry_vs_total_fails(monkeypatch):
    monkeypatch.setenv("KLT_ARCHIVE_MAX_ENTRY_MB", "500")
    monkeypatch.setenv("KLT_ARCHIVE_MAX_TOTAL_MB", "10")
    L = _reload_limits()
    with pytest.raises(L.LimitsInvalidError):
        L.validate_limits()


def test_env_float_helper_removed():
    """_env_float era código morto — removido em v1.2.3."""
    import app.core.limits as L
    assert not hasattr(L, "_env_float")


def _tail_cleanup(monkeypatch):
    """Ao final de qualquer teste que setou env, precisamos deixar o
    módulo em estado consistente para o resto da suíte."""
    for var in (
        "KLT_UPLOAD_MAX_MB", "KLT_MAX_PAGES",
        "KLT_ARCHIVE_MAX_ENTRY_MB", "KLT_ARCHIVE_MAX_TOTAL_MB",
    ):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture(autouse=True)
def _restore_limits_module(monkeypatch):
    """Autouse: qualquer teste desta suíte deixa o módulo limpo depois."""
    yield
    _tail_cleanup(monkeypatch)
    _reload_limits()
