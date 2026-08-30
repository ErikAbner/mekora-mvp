"""
Serviço de OCR — Fase 4.

Utiliza OCRmyPDF (que por sua vez usa Tesseract) para adicionar uma camada
de texto pesquisável a PDFs escaneados.

Pré-requisitos no macOS:
    brew install tesseract tesseract-lang ghostscript
    pip install ocrmypdf
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Optional


class OCRFailedError(Exception):
    """Lançada quando o ocrmypdf não consegue processar o arquivo."""


def apply_ocr(
    input_pdf: Path,
    output_pdf: Path,
    languages: Optional[list[str]] = None,
) -> bool:
    """
    Aplica OCR em *input_pdf* e salva o resultado em *output_pdf*.

    Args:
        input_pdf:  Caminho do PDF escaneado original.
        output_pdf: Caminho de destino do PDF com texto OCR embutido.
        languages:  Lista de códigos de idioma Tesseract.
                    Padrão: ["por", "eng", "spa"].
                    Serão concatenados com "+" para o ocrmypdf (ex: "por+eng+spa").

    Returns:
        True se o OCR foi concluído sem erros.

    Raises:
        OCRFailedError: Se o ocrmypdf lançar qualquer exceção durante o processamento.
    """
    if not shutil.which('gs'):
        raise OCRFailedError(
            "Ghostscript não encontrado no PATH. "
            "Instale com: brew install ghostscript"
        )

    import ocrmypdf  # importação local — falha clara se pacote não instalado

    if languages is None:
        languages = ["por", "eng", "spa"]

    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    try:
        ocrmypdf.ocr(
            input_pdf,
            output_pdf,
            language="+".join(languages),
            deskew=True,
            force_ocr=True,
            progress_bar=False,
        )
        return True
    except Exception as exc:
        raise OCRFailedError(str(exc)) from exc
