from pathlib import Path
import math
import re

import fitz  # PyMuPDF

# PDFs com média abaixo deste limiar de caracteres/página são tratados como escaneados
SCANNED_THRESHOLD = 50

# QUANTOS CARACTERES FAZEM UMA PÁGINA "TER TEXTO".
#
# Não é zero. Uma página de rosto com o número dela no rodapé devolve dois ou
# três caracteres, e chamá-la de página com texto faria a contagem dizer que
# está tudo bem num livro que veio quase todo vazio. Vinte é o tamanho de uma
# linha curta — abaixo disso não há frase.
LETRAS_PARA_TER_TEXTO = 20

_MARCADORES_TEXTO_CORROMPIDO = re.compile(r"[~^¬¦�]")


def texto_parece_corrompido(texto: str) -> bool:
    """Detecta uma camada OCR extensa, mas imprópria para virar EPUB."""
    if not texto:
        return False
    marcadores = len(_MARCADORES_TEXTO_CORROMPIDO.findall(texto))
    letras = sum(1 for caractere in texto if caractere.isalpha())
    return marcadores >= 10 and marcadores / max(1, letras) >= 0.0035


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
            # Nada foi contado: sem a senha não dá para abrir página nenhuma.
            "paginas_ilegiveis": None,
            "paginas_sem_texto": None,
            "capitulos_declarados": None,
        }

    metadata = doc.metadata
    page_count = doc.page_count

    # DENSIDADE DE TEXTO, E MAIS DUAS CONTAS NA MESMA PASSADA.
    #
    # O laço já abria página por página e só somava caracteres — jogava fora
    # quais falharam ao abrir e quais vieram vazias. As duas coisas são frases do
    # desenho que ficaram de fora por não existir onde guardá-las:
    # "nenhuma página corrompida — 96 de 96 abriram sem erro" (nó 895:7856) e
    # "três páginas ficaram sem texto" (nó 895:7631).
    #
    # Contar aqui não custa uma leitura a mais: custa dois inteiros.
    total_chars = 0
    ilegiveis = 0
    sem_texto = 0
    texto_suspeito = 0
    for pagina in doc:
        try:
            texto = pagina.get_text().strip()
        except Exception:
            # PÁGINA QUE NÃO ABRE É UMA COISA, e página vazia é outra. Um PDF
            # truncado no meio do download tem páginas que levantam ao serem
            # lidas; uma digitalização tem páginas que abrem e não têm letra
            # nenhuma. Somar as duas num número só esconderia qual é o problema.
            ilegiveis += 1
            continue
        total_chars += len(texto)
        if len(texto) < LETRAS_PARA_TER_TEXTO:
            sem_texto += 1
        if texto_parece_corrompido(texto):
            texto_suspeito += 1

    avg_chars = total_chars / page_count if page_count > 0 else 0.0
    qualidade_suspeita = texto_suspeito >= max(1, math.ceil(page_count * 0.2))
    is_scanned = avg_chars < SCANNED_THRESHOLD or qualidade_suspeita

    # Miniaturas das primeiras 5 páginas a 50% do tamanho original
    thumbnails_dir.mkdir(parents=True, exist_ok=True)
    for i in range(min(5, page_count)):
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
        pix.save(str(thumbnails_dir / f"page_{i}.png"))

    capitulos_declarados = len(doc.get_toc() or [])
    doc.close()

    return {
        "title": (metadata.get("title") or "").strip(),
        "author": (metadata.get("author") or "").strip(),
        "language": (metadata.get("language") or "").strip(),
        "page_count": page_count,
        "is_scanned": is_scanned,
        "avg_chars_per_page": round(avg_chars, 2),
        "needs_password": False,
        "paginas_ilegiveis": ilegiveis,
        "paginas_sem_texto": sem_texto,
        "paginas_texto_suspeito": texto_suspeito,
        # OS CAPÍTULOS QUE O ARQUIVO DECLARA, e não os que alguém adivinhou.
        #
        # "A partir dos 14 títulos de capítulo que encontrei" (nó 895:7856)
        # ficava sem número: quem lê o sumário é o navegador, e só DEPOIS da
        # conversão. Mas um PDF costuma trazer o próprio sumário como marcadores,
        # e `get_toc()` os devolve — quando o arquivo tem, dá para dizer quantos.
        #
        # Zero e nulo dizem coisas diferentes: zero é "o arquivo não traz sumário
        # próprio", e nulo é "ninguém contou" — um trabalho analisado antes disto
        # existir. A tela precisa separar os dois.
        "capitulos_declarados": capitulos_declarados,
    }


def get_thumbnail_urls(endereco: str, page_count: int, job_id: int) -> list[str]:
    """Retorna as URLs das miniaturas QUE ESTÃO EM DISCO.

    Recebe o ENDEREÇO PÚBLICO do trabalho, não o número dele, para montar a
    URL: a miniatura é vista durante a análise, que acontece antes de existir
    conta — e pelo número ela só abriria para um dono que ainda não há
    (DEC-0039 §5). O número entra para achar a pasta, e não a URL.

    A CONFERÊNCIA EM DISCO É NOVA, e é o motivo de o número ter passado a ser
    exigido. A lista saía de `page_count` sozinho: cinco URLs para um trabalho
    de cinco páginas, existissem os arquivos ou não. `cleanup_old_jobs` apaga
    `temp/{id}` por idade, então para todo trabalho velho esta função devolvia
    cinco endereços que dão 404 — e a tela de escolher capa mostrava cinco
    molduras quebradas em vez de dizer que as miniaturas não estão mais lá.

    Lista vazia é uma resposta: significa "não há miniatura", que é diferente de
    "há cinco e todas falham".
    """
    from app.core.config import STORAGE_TEMP

    pasta = STORAGE_TEMP / str(job_id)
    return [
        f"/storage/temp/{endereco}/page_{i}.png"
        for i in range(min(5, page_count))
        if (pasta / f"page_{i}.png").exists()
    ]
