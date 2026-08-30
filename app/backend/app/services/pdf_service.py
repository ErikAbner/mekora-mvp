from pathlib import Path

import fitz  # PyMuPDF

# PDFs com média abaixo deste limiar de caracteres/página são tratados como escaneados
SCANNED_THRESHOLD = 50


def analyze_pdf(pdf_path: str, thumbnails_dir: Path) -> dict:
    """
    Analisa o PDF e retorna metadados, resultado de detecção de escaneamento
    e salva miniaturas das primeiras 5 páginas em thumbnails_dir.

    Retorna:
        dict com title, author, language, page_count, is_scanned, avg_chars_per_page.
    """
    doc = fitz.open(pdf_path)
    metadata = doc.metadata
    page_count = doc.page_count

    # Densidade de texto: baixa densidade indica PDF escaneado (imagens sem OCR)
    total_chars = sum(len(page.get_text().strip()) for page in doc)
    avg_chars = total_chars / page_count if page_count > 0 else 0.0
    is_scanned = avg_chars < SCANNED_THRESHOLD

    # Miniaturas das primeiras 5 páginas a 50% do tamanho original
    thumbnails_dir.mkdir(parents=True, exist_ok=True)
    for i in range(min(5, page_count)):
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
        pix.save(str(thumbnails_dir / f"page_{i}.png"))

    doc.close()

    return {
        "title": (metadata.get("title") or "").strip(),
        "author": (metadata.get("author") or "").strip(),
        "language": (metadata.get("language") or "").strip(),
        "page_count": page_count,
        "is_scanned": is_scanned,
        "avg_chars_per_page": round(avg_chars, 2),
    }


def get_thumbnail_urls(upload_id: int, page_count: int) -> list[str]:
    """Retorna as URLs relativas dos thumbnails gerados para um upload."""
    return [
        f"/storage/temp/{upload_id}/page_{i}.png"
        for i in range(min(5, page_count))
    ]
