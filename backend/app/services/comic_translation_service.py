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
from app.services.translation_engine import (
    EngineNotInstalledError,
    LanguagePairNotAvailableError,
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

def contar_paginas(job_path: str, input_format: str) -> int:
    """Quantas páginas o arquivo tem, SEM ler o conteúdo delas.

    Existe porque a proteção de `limits.max_pages` rodava depois da extração
    inteira. Medido em 08/09 com um CBZ de 4.000 páginas — acima do limite de
    3.000 e abaixo do limite de 5.000 entradas do `archive_safety`, que é a
    faixa onde nenhuma outra proteção alcança: **49 MB já estavam na memória**
    quando o `PageLimitExceededError` foi levantado. Com páginas de tamanho real
    em vez das de prova, seriam gigabytes.

    Ler o índice não lê os bytes: `namelist()`, `infolist()` e `page_count`
    respondem pelo cabeçalho do arquivo.
    """
    fmt = (input_format or "").lower().lstrip(".")
    try:
        if fmt == "cbz":
            with zipfile.ZipFile(job_path, "r") as zf:
                inspect_zip_members(zf)
                return len(safe_iter_image_names(zf.namelist(), _IMAGE_EXTS))
        if fmt == "cbr":
            import rarfile

            with rarfile.RarFile(job_path, "r") as rf:
                inspect_rar_members(rf)
                return len(
                    safe_iter_image_names(
                        (i.filename for i in rf.infolist()), _IMAGE_EXTS
                    )
                )
        if fmt == "pdf":
            import fitz

            doc = fitz.open(job_path)
            try:
                return doc.page_count
            finally:
                doc.close()
    except ArchiveSafetyError:
        raise
    except Exception:  # noqa: BLE001
        # NÃO SABER NÃO É ZERO. Um formato que este atalho não alcança — cb7 e
        # cbc precisam extrair para contar — devolve -1, e quem chama entende
        # que a contagem tem de esperar a extração. Devolver 0 aqui faria a
        # proteção passar por omissão, que é o defeito clássico da casa.
        return -1
    return -1


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
                img.close()
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
    # A IMAGEM É FECHADA, e antes ficava aberta uma por página. Num álbum de
    # 3.000 páginas são 3.000 descritores esperando o coletor de lixo, e o
    # limite de descritores do sistema chega antes dele.
    try:
        raw: str = _pytesseract.image_to_string(img, lang=tess_lang)
    finally:
        img.close()
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
    # A PROTEÇÃO VEM ANTES DE LER OS BYTES — ver `contar_paginas`.
    previstas = contar_paginas(input_path, input_format)
    if previstas > limits.max_pages:
        raise PageLimitExceededError(
            f"O arquivo tem {previstas} páginas; o limite é {limits.max_pages}."
        )

    pages_bytes = extract_comic_pages(input_path, input_format)
    total_pages = len(pages_bytes)

    # E DE NOVO DEPOIS, para os formatos que a contagem barata não alcança
    # (`cb7` e `cbc` precisam extrair para contar, e devolvem -1). Duas
    # verificações não é redundância: a de cima poupa memória quando dá, e esta
    # é a que garante o limite sempre.
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
            translated_blocks = _translate_blocks(
                blocks, source_lang, target_lang, engine,
                # O CANCELAMENTO CHEGA DENTRO DA PÁGINA. Ele só era conferido
                # ENTRE páginas, e uma página de quadrinho tem dezenas de
                # balões: pedir para cancelar deixava o job rodando até o fim da
                # página corrente, uma chamada ao modelo por balão.
                aviso=progress_callback, pagina=page_num, total=total_pages,
            )
            results.append({"page": page_num, "blocks": translated_blocks})
        except RuntimeError:
            # pytesseract ausente — abortar (erro de configuração)
            raise
        except ImageBombError as exc:
            # Página inválida por tamanho absurdo — registrar mas não abortar
            results.append({"page": page_num, "blocks": [], "error": str(exc)})
        except (EngineNotInstalledError, LanguagePairNotAvailableError):
            # ERRO DE MOTOR ABORTA, e agora pela classe e não pelo nome dela.
            #
            # A comparação era `type(exc).__name__ in ("EngineNotInstalled...")`,
            # e o comentário dizia que era "para evitar import circular".
            # Conferido em 08/09: **não existe import circular** — o
            # `translation_engine` não importa nada de `app.` (o arquivo não tem
            # uma linha `from app.`). O custo do disfarce é real: uma subclasse
            # não casa, e renomear a classe transforma um erro de configuração
            # que devia abortar num "erro daquela página" — o job termina
            # "com sucesso", com todas as páginas vazias e um erro repetido
            # dentro do JSON.
            raise
        except Exception as exc:  # noqa: BLE001
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
    # OS DOIS ARTEFATOS APARECEM JUNTOS, ou nenhum aparece.
    #
    # A escrita era `json_path.write_text(...)` seguida de
    # `html_path.write_text(...)`, e entre as duas cabe um disco cheio, um
    # `KeyboardInterrupt` ou uma queda. O que sobrava era um JSON sem o HTML que
    # ele promete — um par pela metade que a próxima leitura trata como
    # resultado completo.
    #
    # Escreve em temporários no MESMO diretório (rename entre discos não é
    # atômico) e renomeia por cima. `Path.replace` é atômico no POSIX: ou o
    # arquivo antigo, ou o novo, nunca meio arquivo.
    output_dir.mkdir(parents=True, exist_ok=True)
    tmp_json = json_path.with_suffix(".json.parcial")
    tmp_html = html_path.with_suffix(".html.parcial")
    try:
        tmp_json.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        tmp_html.write_text(
            _build_html_sidecar(results, title=f"Job {job_id}"), encoding="utf-8"
        )
        tmp_json.replace(json_path)
        tmp_html.replace(html_path)
    finally:
        # O que sobrar de uma escrita interrompida sai daqui: um `.parcial`
        # esquecido no diretório de saída seria o lixo que este bloco existe
        # para não deixar.
        tmp_json.unlink(missing_ok=True)
        tmp_html.unlink(missing_ok=True)

    return json_path, html_path


def _translate_blocks(
    blocks: list[str],
    src: str,
    tgt: str,
    engine: Any,
    aviso: Any = None,
    pagina: int = 0,
    total: int = 0,
) -> list[dict[str, str]]:
    """Traduz os balões de uma página, um a um.

    UM A UM É DIFERENTE DO TEXTO CORRIDO, e a diferença é justificada: no
    `translation_service` os blocos vão agrupados por `chunk_blocks` com um
    separador, porque são parágrafos de um mesmo fluxo e o motor lucra com o
    contexto. Aqui cada bloco é um balão isolado, e juntá-los com um separador
    faria o modelo tratar falas de personagens diferentes como um texto só — o
    separador vira parte da frase traduzida, e a divisão de volta erra.

    O custo é uma chamada por balão, e ele é conhecido: é o preço de não
    misturar falas.
    """
    result: list[dict[str, str]] = []
    for block in blocks:
        # A exceção do aviso propaga — é assim que o cancelamento chega.
        if aviso is not None:
            aviso("comic_translate", pagina - 1, total, f"Traduzindo página {pagina}")
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
