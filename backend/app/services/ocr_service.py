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

from app.services.language_detection_service import normalize_language_code


class OCRFailedError(Exception):
    """Lançada quando o ocrmypdf não consegue processar o arquivo."""


def choose_ocr_languages(
    document_language: str | None,
    configured_languages: Optional[list[str]] = None,
) -> list[str]:
    """Escolhe o vocabulário do OCR sem misturar idiomas desnecessariamente.

    O Tesseract não trata ``por+eng+spa`` como uma rede de segurança neutra:
    todos os vocabulários competem pela mesma palavra. Em uma digitalização em
    português isso fazia ``são`` virar ``sáo``, ``mudança`` virar ``mudanga`` e
    ``questões`` virar ``questóes``. Quando a análise já identificou o idioma e
    ele está entre os instalados, usar somente esse modelo é mais fiel.

    A lista completa continua sendo o plano B para documento sem idioma
    confiável ou para uma instalação que não tenha o modelo detectado.
    """
    configured = [
        normalize_language_code(code)
        for code in (configured_languages or ["por", "eng", "spa"])
        if normalize_language_code(code)
    ]
    configured = list(dict.fromkeys(configured))
    detected = normalize_language_code(document_language)
    if detected and detected in configured:
        return [detected]
    return configured or ["por"]


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
            rotate_pages=True,
            # Muitos acervos antigos guardam uma fotografia de 150 dpi. O
            # aumento não inventa detalhe, mas dá ao segmentador uma grade
            # estável e melhora letras pequenas e acentos antes do Tesseract.
            oversample=300,
            force_ocr=True,
            progress_bar=False,
        )
        return True
    except Exception as exc:
        raise OCRFailedError(str(exc)) from exc
