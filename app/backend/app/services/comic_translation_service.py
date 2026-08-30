"""
Fase D — Tradução experimental de quadrinhos/mangá.

NÃO edita imagens. NÃO altera o pipeline KCC.
Gera um sidecar JSON/HTML com o texto OCR traduzido de cada página.
"""
from __future__ import annotations

import html as _html
import io
import json
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from app.core.limits import limits
from app.services.archive_safety import (
    ArchiveSafetyError,
    inspect_rar_members,
    inspect_zip_members,
    safe_extract_7z,
    safe_iter_image_names,
)

# Importações opcionais — evita falha em CI sem as dependências
try:
    import pytesseract as _pytesseract
    from PIL import Image as _PILImage
    _OCR_AVAILABLE = True
    # P5 — proteção nativa contra decompression bomb do Pillow
    # (converte imagens absurdamente grandes em DecompressionBombError
    # em vez de alocar memória sem limite)
    _PILImage.MAX_IMAGE_PIXELS = limits.image_max_pixels
except ImportError:
    _pytesseract = None  # type: ignore[assignment]
    _PILImage = None  # type: ignore[assignment]
    _OCR_AVAILABLE = False


class PageLimitExceededError(Exception):
    """Total de páginas excede `limits.max_pages`."""


class ImageBombError(Exception):
    """Imagem excede `limits.image_max_pixels` — provável decompression bomb."""

# Tipo de dados: resultado por página
PageResult = dict[str, Any]  # {page: int, blocks: [{text, translated}], error?: str}

# Mapa de código de idioma → lang do Tesseract
_LANG_MAP: dict[str, str] = {
    "por": "por",
    "eng": "eng",
    "spa": "spa",
    "fra": "fra",
    "deu": "deu",
}

# Extensões de imagem aceitas em arquivos de quadrinhos
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


# ---------------------------------------------------------------------------
# Extração de páginas
# ---------------------------------------------------------------------------

def extract_comic_pages(job_path: str, input_format: str) -> list[bytes]:
    """
    Extrai páginas de imagem de um arquivo de quadrinhos.
    Retorna lista de bytes de cada imagem, ordenada por nome de arquivo.
    """
    fmt = (input_format or "").lower().lstrip(".")

    if fmt == "cbz":
        return _extract_cbz(job_path)
    if fmt == "cbr":
        return _extract_cbr(job_path)
    if fmt == "cb7":
        return _extract_cb7(job_path)
    if fmt == "cbc":
        return _extract_cbc(job_path)
    if fmt == "pdf":
        return _extract_pdf(job_path)

    raise ValueError(f"Formato não suportado para extração de quadrinhos: {fmt!r}")


def _extract_cbz(path: str) -> list[bytes]:
    pages: list[tuple[str, bytes]] = []
    with zipfile.ZipFile(path, "r") as zf:
        # P3 — validação estrutural ANTES de qualquer .read()
        inspect_zip_members(zf)
        allowed = safe_iter_image_names(zf.namelist(), _IMAGE_EXTS)
        for name in allowed:
            pages.append((name, zf.read(name)))
    pages.sort(key=lambda x: x[0])
    return [data for _, data in pages]


def _extract_cbr(path: str) -> list[bytes]:
    import rarfile  # já em requirements.txt

    pages: list[tuple[str, bytes]] = []
    with rarfile.RarFile(path, "r") as rf:
        inspect_rar_members(rf)  # P3
        allowed = safe_iter_image_names(
            (info.filename for info in rf.infolist()), _IMAGE_EXTS,
        )
        for name in allowed:
            pages.append((name, rf.read(name)))
    pages.sort(key=lambda x: x[0])
    return [data for _, data in pages]


def _extract_cb7(path: str) -> list[bytes]:
    import py7zr  # já em requirements.txt

    pages: list[tuple[str, bytes]] = []
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_root = Path(tmpdir)
        with py7zr.SevenZipFile(path, mode="r") as zf:
            # P3 — extração segura: valida nomes, aplica limite total pós-extração
            safe_extract_7z(zf, tmp_root)
        for img_path in sorted(tmp_root.rglob("*")):
            if img_path.is_file() and img_path.suffix.lower() in _IMAGE_EXTS:
                pages.append((str(img_path), img_path.read_bytes()))
    pages.sort(key=lambda x: x[0])
    return [data for _, data in pages]


def _extract_cbc(path: str) -> list[bytes]:
    """CBC é um ZIP de CBZs — usa o primeiro CBZ encontrado."""
    with zipfile.ZipFile(path, "r") as zf:
        inspect_zip_members(zf)  # P3
        cbz_names = sorted(
            n for n in safe_iter_image_names(zf.namelist(), {".cbz"})
        )
        if not cbz_names:
            raise ValueError("Arquivo CBC não contém nenhum CBZ interno.")
        cbz_data = zf.read(cbz_names[0])
    with tempfile.NamedTemporaryFile(suffix=".cbz", delete=False) as tmp:
        tmp.write(cbz_data)
        tmp_path = tmp.name
    try:
        return _extract_cbz(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _extract_pdf(path: str) -> list[bytes]:
    import fitz  # PyMuPDF — já em requirements.txt

    pages: list[bytes] = []
    doc = fitz.open(path)
    try:
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            pages.append(pix.tobytes("png"))
    finally:
        doc.close()
    return pages


# ---------------------------------------------------------------------------
# OCR de página
# ---------------------------------------------------------------------------

def ocr_page(img_bytes: bytes, lang: str) -> list[str]:
    """
    Aplica OCR em uma imagem e retorna lista de blocos de texto.
    Levanta RuntimeError se pytesseract não estiver instalado.
    Levanta ImageBombError se a imagem exceder `limits.image_max_pixels`.

    v1.2.3 — a checagem de pixels é EXATA (`width × height > max_pixels`)
    e roda ANTES de `img.load()`, para rejeitar imagens gigantes sem
    depender da semântica "erro só em 2× MAX_IMAGE_PIXELS" do Pillow.
    Também trata `DecompressionBombWarning` como erro no escopo controlado
    da abertura, e continua capturando `DecompressionBombError`.
    """
    if not _OCR_AVAILABLE:
        raise RuntimeError(
            "pytesseract não está instalado. Execute: pip install pytesseract Pillow"
        )
    tess_lang = _LANG_MAP.get(lang, lang)

    import warnings as _warnings
    try:
        with _warnings.catch_warnings():
            _warnings.simplefilter(
                "error", _PILImage.DecompressionBombWarning
            )
            img = _PILImage.open(io.BytesIO(img_bytes))
            # Comparação exata antes de decodificar
            w, h = img.size
            if w * h > limits.image_max_pixels:
                raise ImageBombError(
                    "Imagem com dimensões acima do limite permitido."
                )
            img.load()
    except _PILImage.DecompressionBombError:
        raise ImageBombError(
            "Imagem com dimensões acima do limite permitido."
        )
    except _PILImage.DecompressionBombWarning:
        raise ImageBombError(
            "Imagem com dimensões acima do limite permitido."
        )
    raw: str = _pytesseract.image_to_string(img, lang=tess_lang)
    blocks = [b.strip() for b in raw.split("\n\n") if b.strip()]
    return blocks


# ---------------------------------------------------------------------------
# Pipeline completo
# ---------------------------------------------------------------------------

def run_comic_translation_pipeline(
    job_id: int,
    input_path: str,
    input_format: str,
    source_lang: str,
    target_lang: str,
    engine: Any,
    output_dir: Path,
    progress_callback: Any = None,
) -> tuple[Path, Path]:
    """
    Executa o pipeline completo de OCR + tradução para um job de quadrinhos.

    - Erros por página são registrados no JSON mas não abortam o pipeline.
    - Erros de engine (EngineNotInstalledError, LanguagePairNotAvailableError)
      e RuntimeError (pytesseract ausente) propagam e abortam.
    - progress_callback(stage, current, total, message) opcional (P4): chamado
      a cada página; exceções do callback propagam (ex.: cancelamento).

    Retorna (json_path, html_path).
    """
    pages_bytes = extract_comic_pages(input_path, input_format)
    total_pages = len(pages_bytes)

    # P5 — proteção de páginas ANTES de iniciar tradução/render
    if total_pages > limits.max_pages:
        raise PageLimitExceededError(
            f"O arquivo tem {total_pages} páginas; o limite é "
            f"{limits.max_pages}."
        )

    results: list[PageResult] = []
    for idx, img_bytes in enumerate(pages_bytes):
        page_num = idx + 1
        if progress_callback is not None:
            progress_callback(
                "comic_translate", idx, total_pages,
                f"Traduzindo página {page_num} de {total_pages}",
            )
        try:
            blocks = ocr_page(img_bytes, source_lang)
            translated_blocks = _translate_blocks(blocks, source_lang, target_lang, engine)
            results.append({"page": page_num, "blocks": translated_blocks})
        except RuntimeError:
            # pytesseract ausente — abortar (erro de configuração)
            raise
        except ImageBombError as exc:
            # Página inválida por tamanho absurdo — registrar mas não abortar
            results.append({"page": page_num, "blocks": [], "error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            # Erros de engine (EngineNotInstalledError, LanguagePairNotAvailableError)
            # devem abortar o pipeline — verificar pelo nome da classe para evitar
            # import circular
            exc_type = type(exc).__name__
            if exc_type in ("EngineNotInstalledError", "LanguagePairNotAvailableError"):
                raise
            # Erros por página: registrar e continuar
            results.append({"page": page_num, "blocks": [], "error": str(exc)})

    json_path = output_dir / "comic_translation.json"
    html_path = output_dir / "comic_translation.html"

    payload = {
        "job_id": job_id,
        "source_language": source_lang,
        "target_language": target_lang,
        "pages": results,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    html_path.write_text(
        _build_html_sidecar(results, title=f"Job {job_id}"),
        encoding="utf-8",
    )

    return json_path, html_path


def _translate_blocks(
    blocks: list[str],
    src: str,
    tgt: str,
    engine: Any,
) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    for block in blocks:
        translated = engine.translate(block, src, tgt)
        result.append({"text": block, "translated": translated})
    return result


def _e(text: Any) -> str:
    """Escape HTML consistente para texto dinâmico (OCR/tradução/erros)."""
    return _html.escape(str(text or ""), quote=True)


def _build_html_sidecar(pages: list[PageResult], title: str) -> str:
    safe_title = _e(title)
    parts = [
        "<!DOCTYPE html>",
        "<html lang='pt'>",
        "<head><meta charset='utf-8'>",
        f"<title>{safe_title}</title>",
        "</head>",
        "<body>",
        f"<h1>{safe_title}</h1>",
    ]
    for page in pages:
        pn = int(page.get("page", 0))
        parts.append(f"<section id='page-{pn}'>")
        parts.append(f"<h2>Página {pn}</h2>")
        if page.get("error"):
            parts.append(f"<p class='error'>Erro: {_e(page['error'])}</p>")
        for block in page.get("blocks", []):
            parts.append("<p>")
            parts.append(f"<span class='original'>{_e(block.get('text', ''))}</span><br>")
            parts.append(f"<span class='translated'>{_e(block.get('translated', ''))}</span>")
            parts.append("</p>")
        parts.append("</section>")
    parts.append("</body></html>")
    return "\n".join(parts)
