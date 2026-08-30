"""v1.2.2 — validação central de arquivos compactados (P3)."""
from __future__ import annotations

import io
import zipfile
from pathlib import Path

import pytest


class _FakeInfo:
    def __init__(self, filename: str, file_size: int = 100, external_attr: int = 0):
        self.filename = filename
        self.file_size = file_size
        self.external_attr = external_attr


class _FakeZip:
    """Simula `zipfile.ZipFile` para `inspect_zip_members`."""
    def __init__(self, infos):
        self._infos = infos
    def infolist(self):
        return list(self._infos)
    def namelist(self):
        return [i.filename for i in self._infos]


def test_valid_zip_passes():
    from app.services.archive_safety import inspect_zip_members
    inspect_zip_members(_FakeZip([
        _FakeInfo("page_001.jpg", 500_000),
        _FakeInfo("page_002.jpg", 400_000),
    ]))


def test_too_many_entries_rejected(monkeypatch):
    from app.services import archive_safety as a
    from app.core.limits import Limits
    tiny = Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=2, archive_max_total_mb=100, archive_max_entry_mb=50,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(a, "limits", tiny)
    with pytest.raises(a.ArchiveSafetyError) as exc:
        a.inspect_zip_members(_FakeZip([_FakeInfo(f"p{i}.jpg", 10) for i in range(5)]))
    assert exc.value.code == "ARCHIVE_TOO_MANY_ENTRIES"


def test_entry_too_large_rejected(monkeypatch):
    from app.services import archive_safety as a
    from app.core.limits import Limits
    tiny = Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=100, archive_max_entry_mb=1,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(a, "limits", tiny)
    with pytest.raises(a.ArchiveSafetyError) as exc:
        a.inspect_zip_members(_FakeZip([_FakeInfo("huge.jpg", 5 * 1024 * 1024)]))
    assert exc.value.code == "ARCHIVE_ENTRY_TOO_LARGE"


def test_total_too_large_rejected(monkeypatch):
    from app.services import archive_safety as a
    from app.core.limits import Limits
    tiny = Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=2, archive_max_entry_mb=1,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(a, "limits", tiny)
    with pytest.raises(a.ArchiveSafetyError) as exc:
        a.inspect_zip_members(_FakeZip([
            _FakeInfo(f"p{i}.jpg", 900_000) for i in range(5)
        ]))
    assert exc.value.code == "ARCHIVE_TOTAL_TOO_LARGE"


def test_absolute_path_rejected():
    from app.services.archive_safety import ArchiveSafetyError, inspect_zip_members
    with pytest.raises(ArchiveSafetyError) as exc:
        inspect_zip_members(_FakeZip([_FakeInfo("/etc/passwd", 100)]))
    assert exc.value.code == "ABSOLUTE_PATH"


def test_traversal_rejected():
    from app.services.archive_safety import ArchiveSafetyError, inspect_zip_members
    with pytest.raises(ArchiveSafetyError) as exc:
        inspect_zip_members(_FakeZip([_FakeInfo("../../etc/passwd", 100)]))
    assert exc.value.code == "PATH_TRAVERSAL"


def test_empty_name_rejected():
    from app.services.archive_safety import ArchiveSafetyError, inspect_zip_members
    with pytest.raises(ArchiveSafetyError):
        inspect_zip_members(_FakeZip([_FakeInfo("", 100)]))


def test_control_char_in_name_rejected():
    from app.services.archive_safety import ArchiveSafetyError, inspect_zip_members
    with pytest.raises(ArchiveSafetyError):
        inspect_zip_members(_FakeZip([_FakeInfo("bad\x01.jpg", 100)]))


def test_symlink_entry_rejected():
    """Bit unix 0o120000 (symlink) no external_attr → rejeitado."""
    from app.services.archive_safety import ArchiveSafetyError, inspect_zip_members
    symlink_mode = (0o120000) << 16
    with pytest.raises(ArchiveSafetyError) as exc:
        inspect_zip_members(_FakeZip([_FakeInfo("link", 0, external_attr=symlink_mode)]))
    assert exc.value.code == "ARCHIVE_NON_REGULAR_ENTRY"


def test_safe_iter_filters_by_extension():
    from app.services.archive_safety import safe_iter_image_names
    names = ["page_001.jpg", "junk.txt", "../etc", "photo.PNG", ".hidden.jpg"]
    out = safe_iter_image_names(names, {".jpg", ".jpeg", ".png"})
    assert "page_001.jpg" in out
    assert "photo.PNG" in out
    assert "junk.txt" not in out
    assert "../etc" not in out
    assert ".hidden.jpg" not in out


# ---------------------------------------------------------------------------
# Integração: _extract_cbz real com ZIPs pequenos sintéticos
# ---------------------------------------------------------------------------

def _make_zip(path: Path, entries: dict[str, bytes]) -> None:
    with zipfile.ZipFile(path, "w") as zf:
        for name, data in entries.items():
            zf.writestr(name, data)


def _tiny_png() -> bytes:
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def test_extract_cbz_valid(tmp_path):
    from app.services.comic_translation_service import extract_comic_pages
    p = tmp_path / "ok.cbz"
    _make_zip(p, {"page_001.png": _tiny_png(), "page_002.png": _tiny_png()})
    pages = extract_comic_pages(str(p), "cbz")
    assert len(pages) == 2


def test_extract_cbz_traversal_rejected(tmp_path):
    from app.services.archive_safety import ArchiveSafetyError
    from app.services.comic_translation_service import extract_comic_pages
    p = tmp_path / "bad.cbz"
    _make_zip(p, {"../evil.png": _tiny_png()})
    with pytest.raises(ArchiveSafetyError):
        extract_comic_pages(str(p), "cbz")


def test_extract_cbz_over_entries_rejected(tmp_path, monkeypatch):
    from app.services import archive_safety as a
    from app.core.limits import Limits
    tiny = Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=2, archive_max_total_mb=100, archive_max_entry_mb=50,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(a, "limits", tiny)
    from app.services.comic_translation_service import extract_comic_pages
    p = tmp_path / "many.cbz"
    _make_zip(p, {f"page_{i:03d}.png": _tiny_png() for i in range(5)})
    with pytest.raises(a.ArchiveSafetyError):
        extract_comic_pages(str(p), "cbz")


def test_cb7_tempdir_cleaned_after_failure(tmp_path, monkeypatch):
    """CB7: mesmo com falha na extração, TemporaryDirectory limpa tudo."""
    from app.services import archive_safety as a

    # Força safe_extract_7z a levantar a metade — não podemos rodar 7z real
    def _fail(zf, dest):
        raise a.ArchiveSafetyError("ARCHIVE_EXTRACT_FAILED", "boom")

    monkeypatch.setattr("app.services.comic_translation_service.safe_extract_7z", _fail)

    class _FakeSZ:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def getnames(self): return ["a.png"]
        def extractall(self, path=None): pass

    monkeypatch.setattr(
        "app.services.comic_translation_service.py7zr",
        type("m", (), {"SevenZipFile": lambda self, *a, **k: _FakeSZ()})(),
        raising=False,
    )
    # Mock direto do módulo importado dentro da função
    import sys, types
    fake_py7zr = types.ModuleType("py7zr")
    fake_py7zr.SevenZipFile = lambda *a, **k: _FakeSZ()
    monkeypatch.setitem(sys.modules, "py7zr", fake_py7zr)

    from app.services.comic_translation_service import extract_comic_pages
    with pytest.raises(a.ArchiveSafetyError):
        extract_comic_pages(str(tmp_path / "any.cb7"), "cb7")
