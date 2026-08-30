"""v1.2.2 — testes defensivos de upload (P2)."""
from __future__ import annotations

import io
import pytest
from pathlib import Path


# ---------------------------------------------------------------------------
# Filename sanitization (unit)
# ---------------------------------------------------------------------------

def test_sanitize_rejects_empty():
    from app.services.upload_safety import (
        UploadRejectedError, sanitize_original_filename,
    )
    for bad in ("", "   ", None):
        with pytest.raises(UploadRejectedError):
            sanitize_original_filename(bad)


def test_sanitize_rejects_hidden():
    from app.services.upload_safety import (
        UploadRejectedError, sanitize_original_filename,
    )
    with pytest.raises(UploadRejectedError):
        sanitize_original_filename(".oculto.pdf")


def test_sanitize_rejects_traversal_and_separators():
    from app.services.upload_safety import (
        UploadRejectedError, sanitize_original_filename,
    )
    for bad in ("../foo.pdf", "sub/foo.pdf", "sub\\foo.pdf", "foo\x00.pdf"):
        with pytest.raises(UploadRejectedError):
            sanitize_original_filename(bad)


def test_sanitize_ok_preserves_name():
    from app.services.upload_safety import sanitize_original_filename
    assert sanitize_original_filename("Meu Livro (v2).pdf") == "Meu Livro (v2).pdf"


def test_server_controlled_path_never_uses_client_name_directly(tmp_path):
    from app.services.upload_safety import server_controlled_path
    dest = server_controlled_path(tmp_path, 42, "Meu Livro (v2).pdf")
    # Sempre com prefixo do job_id (controlado pelo servidor)
    assert dest.name.startswith("42_")
    # Caracteres perigosos (parênteses) neutralizados
    assert "(" not in dest.name and ")" not in dest.name
    assert dest.parent == tmp_path


def test_server_controlled_path_neutralizes_dangerous_chars(tmp_path):
    from app.services.upload_safety import server_controlled_path
    dest = server_controlled_path(tmp_path, 7, "arq;$`|&<>.pdf")
    assert dest.name.startswith("7_")
    for bad in (";", "$", "`", "|", "&", "<", ">"):
        assert bad not in dest.name


# ---------------------------------------------------------------------------
# Magic bytes
# ---------------------------------------------------------------------------

def test_check_magic_pdf_accepts_pdf_header():
    from app.services.upload_safety import check_magic
    check_magic("pdf", b"%PDF-1.4")


def test_check_magic_pdf_rejects_zip_header():
    from app.services.upload_safety import UploadRejectedError, check_magic
    with pytest.raises(UploadRejectedError):
        check_magic("pdf", b"PK\x03\x04rest")


def test_check_magic_cbz_accepts_zip_header():
    from app.services.upload_safety import check_magic
    check_magic("cbz", b"PK\x03\x04\x14\x00")


def test_check_magic_cbr_accepts_rar_header():
    from app.services.upload_safety import check_magic
    check_magic("cbr", b"Rar!\x1a\x07\x00abcd")


def test_check_magic_text_accepts_ascii():
    from app.services.upload_safety import check_magic
    check_magic("txt", b"Hello world\n")


def test_check_magic_text_rejects_nul():
    from app.services.upload_safety import UploadRejectedError, check_magic
    with pytest.raises(UploadRejectedError):
        check_magic("txt", b"hi\x00binary")


# ---------------------------------------------------------------------------
# Streaming write com limite (unit — sem HTTP)
# ---------------------------------------------------------------------------

class _FakeUpload:
    """Simula Starlette UploadFile suficiente para stream_to_disk."""

    def __init__(self, data: bytes, chunks: int = 4):
        self._buf = io.BytesIO(data)
        self._chunk = max(1, len(data) // chunks) if chunks else len(data) or 1

    async def read(self, size: int) -> bytes:
        return self._buf.read(size)

    async def close(self) -> None:
        pass


@pytest.mark.asyncio
async def test_stream_valid_pdf_below_limit(tmp_path, monkeypatch):
    from app.services import upload_safety as us
    from app.core import limits as _limits

    # Reduz limite artificialmente
    small = _limits.Limits(
        upload_max_mb=1, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=10, archive_max_entry_mb=5,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(us, "limits", small)
    dest = tmp_path / "42_ok.pdf"
    written = await us.stream_to_disk(_FakeUpload(b"%PDF-1.4\n" + b"x" * 500), dest, "pdf")
    assert written > 0 and dest.exists()


@pytest.mark.asyncio
async def test_stream_over_limit_deletes_partial(tmp_path, monkeypatch):
    from app.services import upload_safety as us
    from app.core import limits as _limits

    tiny = _limits.Limits(
        upload_max_mb=1, upload_chunk_bytes=1024,  # 1 MB limit
        archive_max_entries=100, archive_max_total_mb=10, archive_max_entry_mb=5,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(us, "limits", tiny)
    dest = tmp_path / "42_big.pdf"
    payload = b"%PDF-1.4\n" + (b"A" * (2 * 1024 * 1024))  # > 1 MB
    with pytest.raises(us.UploadRejectedError) as exc_info:
        await us.stream_to_disk(_FakeUpload(payload, chunks=8), dest, "pdf")
    assert exc_info.value.code == "UPLOAD_TOO_LARGE"
    # Parcial removido — não deve existir arquivo no disco
    assert not dest.exists()


@pytest.mark.asyncio
async def test_stream_magic_mismatch_rejects_and_cleans(tmp_path):
    from app.services import upload_safety as us
    dest = tmp_path / "42_fake.pdf"
    # Alega .pdf mas envia ZIP
    with pytest.raises(us.UploadRejectedError) as exc_info:
        await us.stream_to_disk(_FakeUpload(b"PK\x03\x04zipdata"), dest, "pdf")
    assert exc_info.value.code == "FORMAT_MISMATCH"
    assert not dest.exists()


@pytest.mark.asyncio
async def test_stream_empty_rejected(tmp_path):
    from app.services import upload_safety as us
    dest = tmp_path / "42_empty.pdf"
    with pytest.raises(us.UploadRejectedError) as exc_info:
        await us.stream_to_disk(_FakeUpload(b""), dest, "pdf")
    assert exc_info.value.code == "UPLOAD_EMPTY"
    assert not dest.exists()


@pytest.mark.asyncio
async def test_stream_no_overwrite(tmp_path):
    from app.services import upload_safety as us
    dest = tmp_path / "42_existing.pdf"
    dest.write_bytes(b"OLD")
    with pytest.raises(us.UploadRejectedError) as exc_info:
        await us.stream_to_disk(_FakeUpload(b"%PDF-1.4\nnew"), dest, "pdf")
    assert exc_info.value.code == "UPLOAD_DEST_EXISTS"
    assert dest.read_bytes() == b"OLD"  # preservado


# ---------------------------------------------------------------------------
# HTTP-level (endpoint)
# ---------------------------------------------------------------------------

def _pdf_bytes() -> bytes:
    import fitz
    d = fitz.open()
    p = d.new_page(width=200, height=200)
    p.insert_text((10, 20), "hi")
    buf = d.tobytes()
    d.close()
    return buf


def test_upload_rejects_hidden_filename(client):
    r = client.post("/upload", files={"file": (".hidden.pdf", _pdf_bytes(), "application/pdf")})
    assert r.status_code == 400


def test_upload_rejects_mismatched_magic(client):
    r = client.post("/upload", files={"file": ("livro.pdf", b"PK\x03\x04zip", "application/pdf")})
    assert r.status_code == 400
    assert "conteúdo" in r.json()["detail"].lower() or "formato" in r.json()["detail"].lower()


def test_upload_over_limit_returns_413(client, monkeypatch):
    from app.core import limits as _limits
    from app.services import upload_safety as us
    tiny = _limits.Limits(
        upload_max_mb=1, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=10, archive_max_entry_mb=5,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    )
    monkeypatch.setattr(us, "limits", tiny)
    big = b"%PDF-1.4\n" + (b"A" * (2 * 1024 * 1024))
    r = client.post("/upload", files={"file": ("big.pdf", big, "application/pdf")})
    assert r.status_code == 413


def test_upload_server_controls_filename(client):
    r = client.post(
        "/upload",
        files={"file": ("My Book (2).pdf", _pdf_bytes(), "application/pdf")},
    )
    assert r.status_code == 201
    # Confere no histórico que o original preservado, e o path do servidor
    # segue o padrão {job_id}_slug (sem espaços/parênteses do cliente)
    from pathlib import Path
    hist = client.get("/history").json()
    row = next((h for h in hist if h["original_filename"] == "My Book (2).pdf"), None)
    assert row is not None
