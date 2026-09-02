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

    # PDF COM SENHA NÃO É PDF QUEBRADO, e o produto tratava os dois igual.
    #
    # O PyMuPDF ABRE um arquivo protegido sem reclamar: `doc.needs_pass` fica
    # `True` e o texto sai vazio. Com isso a densidade de caracteres dava zero, o
    # arquivo era classificado como digitalização, o OCR rodava numa página que
    # ninguém consegue renderizar, e a pessoa recebia "OCR falhou" para um
    # arquivo que só precisava de uma senha.
    #
    # A análise para aqui. Quem sabe o que fazer é a pessoa — é o "Precisa de
    # você" do nó 895:9348.
    if doc.needs_pass:
        doc.close()
        return {
            "title": "",
            "author": "",
            "language": "",
            "page_count": 0,
            "is_scanned": False,
            "avg_chars_per_page": 0.0,
            "needs_password": True,
        }

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
        "needs_password": False,
    }


def get_thumbnail_urls(endereco: str, page_count: int) -> list[str]:
    """Retorna as URLs relativas dos thumbnails gerados para um upload.

    Recebe o ENDEREÇO PÚBLICO do trabalho, não o número dele. A miniatura é
    vista durante a análise, que acontece antes de existir conta — e pelo número
    ela só abriria para um dono que ainda não há (DEC-0039 §5).
    """
    return [
        f"/storage/temp/{endereco}/page_{i}.png"
        for i in range(min(5, page_count))
    ]
