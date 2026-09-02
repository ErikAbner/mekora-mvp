"""O ambiente de teste tem de ser o ambiente do produto.

POR QUE ISTO EXISTE
===================
Em 03/09 a suíte dizia `732 passed, 5 skipped`. Os cinco pulados eram:

    could not import 'striprtf'
    pytesseract não instalado   (×4)

As duas bibliotecas estão DECLARADAS em `backend/requirements.txt` e instaladas
na imagem de produção. Faltavam só neste `.venv`, que tinha ficado para trás.

O efeito é o pior tipo: os quatro testes de `pytesseract` cobrem os LIMITES do
OCR — a maior imagem aceita, a maior contagem de páginas — que é o caminho mais
demorado e mais sujeito a falha do produto inteiro. Eles não estavam falhando.
Estavam sendo pulados, e pulado se lê como verde.

`pytest.importorskip` e `pytest.skip` são a ferramenta certa para o que É
opcional. Para o que está no `requirements.txt`, eles transformam "o ambiente
está errado" em "está tudo bem".

Este arquivo faz a pergunta na direção contrária: cada dependência declarada
importa? Se não importa, isto FALHA — em vermelho, com o comando do conserto.
"""
from __future__ import annotations

import importlib
import re
from pathlib import Path

import pytest

REQUISITOS = Path(__file__).resolve().parents[1] / "requirements.txt"

# O nome no PyPI e o nome do import divergem em alguns casos, e adivinhar isso
# geraria falso vermelho. Só o que diverge está aqui.
IMPORTA_COMO = {
    "pillow": "PIL",
    "python-multipart": "multipart",
    "beautifulsoup4": "bs4",
    "pymupdf": "fitz",
    "python-dotenv": "dotenv",
    "pyyaml": "yaml",
    "sqlalchemy": "sqlalchemy",
    "opencv-python-headless": "cv2",
    "scikit-image": "skimage",
    "sentencepiece": "sentencepiece",
    "pydantic-settings": "pydantic_settings",
    "odfpy": "odf",
    "python-docx": "docx",
}

# O QUE NÃO DÁ PARA EXIGIR AQUI, e por quê. Cada linha precisa de uma razão:
# uma lista de exceções sem motivo vira o lugar onde se esconde o que incomoda.
FORA = {
    # O KCC 9 pede Python 3.10 ou mais novo. Este `.venv` é 3.9 e a imagem de
    # produção é 3.11, onde ele instala. O código que o usa importa dentro da
    # função (`comic_export_service`), então a ausência aqui não quebra import
    # nenhum — e os testes de quadrinho não o executam.
    "kindlecomicconverter": "exige Python 3.10+; a imagem de produção é 3.11",
}


def _declarados():
    for linha in REQUISITOS.read_text().splitlines():
        linha = linha.split("#")[0].strip()
        if not linha or linha.startswith("-"):
            continue
        nome = re.split(r"[<>=!\[;]", linha)[0].strip().lower()
        if nome:
            yield nome


@pytest.mark.parametrize("pacote", sorted(set(_declarados())))
def test_o_que_o_requirements_declara_esta_instalado(pacote):
    if pacote in FORA:
        pytest.skip(f"{pacote}: {FORA[pacote]}")

    modulo = IMPORTA_COMO.get(pacote, pacote.replace("-", "_"))
    try:
        importlib.import_module(modulo)
    except ImportError as e:  # pragma: no cover - o corpo é a mensagem
        pytest.fail(
            f"`{pacote}` está no requirements.txt e não importa aqui ({e}).\n"
            f"O teste que depende dele vai PULAR, e pulado se lê como verde.\n"
            f"Conserto:  .venv/bin/pip install -r backend/requirements.txt"
        )


def test_a_lista_de_excecoes_nao_cresceu_sozinha():
    """Cada nome em `FORA` precisa de uma razão escrita, e ela precisa ser sobre
    o AMBIENTE — não sobre ser inconveniente instalar."""
    for nome, razao in FORA.items():
        assert razao and len(razao) > 20, f"{nome} está fora sem razão escrita"
