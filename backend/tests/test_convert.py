"""
Testes unitários do convert_service (subprocess mockado).
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from unittest.mock import MagicMock

import pytest


def test_convert_success(tmp_path, monkeypatch):
    """subprocess.run com returncode=0 → converte sem exceção."""
    from app.services.convert_service import convert_to_epub

    input_pdf = tmp_path / "input.pdf"
    input_pdf.write_bytes(b"%PDF-1.4 fake")
    output_epub = tmp_path / "out" / "book.epub"

    mock_result = MagicMock()
    mock_result.returncode = 0
    monkeypatch.setattr(subprocess, "run", lambda *a, **kw: mock_result)

    # Deve completar sem lançar exceção
    convert_to_epub(input_pdf, output_epub, title="Título", author="Autor", language="por")


def test_convert_failure_raises(tmp_path, monkeypatch):
    """subprocess.run com returncode=1 → ConversionFailedError."""
    from app.services.convert_service import ConversionFailedError, convert_to_epub

    input_pdf = tmp_path / "input.pdf"
    input_pdf.write_bytes(b"%PDF-1.4 fake")
    output_epub = tmp_path / "out" / "book.epub"

    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stderr = "ebook-convert error detail"
    mock_result.stdout = ""
    monkeypatch.setattr(subprocess, "run", lambda *a, **kw: mock_result)

    with pytest.raises(ConversionFailedError, match="ebook-convert error detail"):
        convert_to_epub(input_pdf, output_epub, title="Título", author="Autor", language="por")


def test_convert_with_cover(tmp_path, monkeypatch):
    """Quando cover existe, --cover é incluído no comando."""
    from app.services.convert_service import convert_to_epub

    input_pdf = tmp_path / "input.pdf"
    input_pdf.write_bytes(b"%PDF-1.4 fake")
    cover = tmp_path / "cover.jpg"
    cover.write_bytes(b"fake image")
    output_epub = tmp_path / "out" / "book.epub"

    captured_cmd: list = []
    mock_result = MagicMock()
    mock_result.returncode = 0

    def fake_run(cmd, **kw):
        captured_cmd.extend(cmd)
        return mock_result

    monkeypatch.setattr(subprocess, "run", fake_run)

    convert_to_epub(input_pdf, output_epub, title="T", author="A", language="eng", cover=cover)

    assert "--cover" in captured_cmd
