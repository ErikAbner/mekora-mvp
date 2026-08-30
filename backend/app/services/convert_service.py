"""
Serviço de conversão para EPUB — Fase 5 / Fase A.

Usa `ebook-convert` do Calibre para converter qualquer formato suportado
para EPUB, injetando metadados (título, autor, idioma) e capa selecionada.

Formatos de entrada suportados pelo Calibre nativamente:
    PDF, DOCX, ODT, RTF, TXT, HTML, EPUB e outros.

Pré-requisito no macOS:
    Calibre instalado em /Applications/calibre.app
    Adicionar ao PATH: /Applications/calibre.app/Contents/MacOS/
    Ou criar symlink: ln -s /Applications/calibre.app/Contents/MacOS/ebook-convert /usr/local/bin/ebook-convert
"""

from __future__ import annotations

import subprocess  # noqa: F401  # mantido para compatibilidade com testes que fazem monkeypatch
from pathlib import Path
from typing import Optional

from app.core.config import STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP
from app.core.limits import limits
from app.services.subprocess_runner import ExternalToolError, run_external


class ConversionFailedError(Exception):
    """Lançada quando ebook-convert retorna código de saída diferente de 0."""


def convert_to_epub(
    input_path: Path,
    output_epub: Path,
    title: str,
    author: str,
    language: str,
    cover: Optional[Path] = None,
) -> None:
    """
    Converte *input_path* para EPUB via ebook-convert (Calibre).

    Args:
        input_path:   Arquivo de entrada em qualquer formato suportado pelo Calibre
                      (PDF, DOCX, ODT, RTF, TXT, HTML, EPUB, etc.).
        output_epub:  Caminho de destino do EPUB gerado.
        title:        Título a embutir nos metadados do EPUB.
        author:       Autor a embutir nos metadados do EPUB.
        language:     Código de idioma ISO 639-2 (ex: "por", "eng").
        cover:        Imagem PNG/JPEG opcional para usar como capa.

    Raises:
        ConversionFailedError: Se ebook-convert retornar código ≠ 0.
    """
    output_epub.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ebook-convert",
        str(input_path),
        str(output_epub),
        "--title", title,
        "--authors", author,
        "--language", language,
    ]
    if cover and cover.exists():
        cmd += ["--cover", str(cover)]

    try:
        run_external(
            cmd,
            timeout_seconds=limits.calibre_timeout_seconds,
            tool_label="ebook-convert",
            input_path=input_path,
            allowed_roots=(STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP),
        )
    except ExternalToolError as exc:
        raise ConversionFailedError(exc.public_message)
