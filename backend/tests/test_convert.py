"""
Testes unitários do convert_service.

v1.2.2 — o subprocess é executado via `subprocess_runner.run_external`;
os testes mockam esse helper para preservar as asserções semânticas
(retorno sem exceção / ConversionFailedError com mensagem pública curta /
comando com --cover quando aplicável).
"""

from __future__ import annotations

from pathlib import Path

import pytest


def _fake_ok(**kw):
    import subprocess as _sp
    return _sp.CompletedProcess(args=[], returncode=0, stdout="", stderr="")


def test_convert_success(tmp_path, monkeypatch):
    """run_external com retorno OK → converte sem exceção."""
    from app.services import convert_service as cs

    input_pdf = tmp_path / "input.pdf"
    input_pdf.write_bytes(b"%PDF-1.4 fake")
    output_epub = tmp_path / "out" / "book.epub"

    monkeypatch.setattr(cs, "run_external", lambda *a, **kw: _fake_ok())

    cs.convert_to_epub(
        input_pdf, output_epub, title="Título", author="Autor", language="por"
    )


def test_convert_failure_raises(tmp_path, monkeypatch):
    """run_external levanta ExternalToolError → ConversionFailedError.

    A mensagem pública NÃO deve incluir detalhes técnicos brutos: o
    helper já produz "ebook-convert falhou ao processar o arquivo …".
    """
    from app.services import convert_service as cs
    from app.services.subprocess_runner import ExternalToolError

    input_pdf = tmp_path / "input.pdf"
    input_pdf.write_bytes(b"%PDF-1.4 fake")
    output_epub = tmp_path / "out" / "book.epub"

    def _raise(*a, **kw):
        raise ExternalToolError(
            "TOOL_FAILED",
            "ebook-convert falhou ao processar o arquivo (código 1).",
            redacted_detail="detalhe interno com <project>",
        )

    monkeypatch.setattr(cs, "run_external", _raise)

    with pytest.raises(cs.ConversionFailedError) as exc_info:
        cs.convert_to_epub(
            input_pdf, output_epub, title="T", author="A", language="por"
        )
    # Mensagem pública curta, sem detalhe redigido
    assert "ebook-convert falhou" in str(exc_info.value)
    assert "detalhe interno" not in str(exc_info.value)


def test_convert_with_cover(tmp_path, monkeypatch):
    """Quando cover existe, --cover é incluído no comando enviado ao runner."""
    from app.services import convert_service as cs

    input_pdf = tmp_path / "input.pdf"
    input_pdf.write_bytes(b"%PDF-1.4 fake")
    cover = tmp_path / "cover.jpg"
    cover.write_bytes(b"fake image")
    output_epub = tmp_path / "out" / "book.epub"

    captured: dict = {}

    def _capture(cmd, **kwargs):
        captured["cmd"] = list(cmd)
        captured["timeout"] = kwargs.get("timeout_seconds")
        return _fake_ok()

    monkeypatch.setattr(cs, "run_external", _capture)

    cs.convert_to_epub(
        input_pdf, output_epub, title="T", author="A", language="eng", cover=cover
    )

    assert "--cover" in captured["cmd"]
    assert captured["timeout"] and captured["timeout"] > 0
