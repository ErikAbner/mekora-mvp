"""Ler o `My Clippings.txt` do Kindle.

O QUE É ESTE ARQUIVO
====================
Todo Kindle mantém um arquivo de texto com tudo que a pessoa marcou, em todos os
livros. Ele fica na raiz do aparelho quando ligado por cabo, e é a única forma
de tirar destaques do Kindle sem passar por serviço nenhum.

O FORMATO, E O QUE ELE NÃO GARANTE
==================================
Registros separados por uma linha de dez sinais de igual. Cada um tem título e
autor na primeira linha, uma linha de metadados, uma linha em branco, e o texto.

    Enviesados (Rian Dutra)
    - Seu destaque na página 12 | posição 176-178 | Adicionado: ...

    O texto marcado.
    ==========

Três coisas que o formato não garante, e que decidem a implementação:

O IDIOMA MUDA. Um Kindle em inglês escreve "Your Highlight on page 12 | location
176-178 | Added on ...". O mesmo arquivo pode ter registros nos dois idiomas se
o aparelho mudou de idioma no meio da vida. Então o tipo não pode ser detectado
por palavra exata.

O AUTOR PODE NÃO EXISTIR, e o título pode ter parênteses. "Dom Casmurro (Machado
de Assis)" e "Cem Anos (1967) (García Márquez)" — quebrar no primeiro parêntese
erra o segundo.

MARCADORES NÃO TÊM TEXTO. Um "bookmark" é uma posição sem conteúdo, e importá-lo
criaria uma nota vazia.
"""

from __future__ import annotations

import re
from typing import List

SEPARADOR = "=========="

# O tipo é detectado por RAIZ de palavra, e não pela frase inteira: "destaque",
# "Highlight", "Markierung" e "surlignement" cobrem os idiomas que aparecem, e
# uma lista de frases exatas quebraria no primeiro Kindle configurado noutra
# língua.
TIPOS = [
    ("nota", re.compile(r"\b(nota|note|notiz|anmerkung)\b", re.I)),
    ("marcador", re.compile(r"\b(marcador|bookmark|lesezeichen|signet)\b", re.I)),
    ("destaque", re.compile(r"\b(destaque|highlight|markierung|surlign)\w*", re.I)),
]


def _titulo_e_autor(linha: str) -> tuple:
    """Separa "Título (Autor)" pelo ÚLTIMO parêntese, e não pelo primeiro.

    "Cem Anos de Solidão (1967) (García Márquez)" tem dois grupos, e o autor é o
    último. Quebrar no primeiro devolveria o ano como autor.
    """
    linha = linha.strip().lstrip("﻿")
    fecha = linha.rfind(")")
    abre = linha.rfind("(") if fecha != -1 else -1
    if abre > 0 and fecha > abre:
        return linha[:abre].strip(), linha[abre + 1 : fecha].strip()
    return linha, ""


def _tipo(linha: str) -> str:
    for nome, forma in TIPOS:
        if forma.search(linha):
            return nome
    return "destaque"


def _posicao(linha: str) -> str:
    """A posição como o Kindle a escreve, guardada COMO TEXTO.

    Ela não vira `de`/`ate`: aqueles são deslocamento de caractere no texto que
    o Mekora extraiu, e a posição do Kindle é outra unidade, do arquivo dele.
    Guardar uma na outra faria a nota apontar um trecho qualquer com toda a
    confiança de uma âncora de verdade.
    """
    m = re.search(r"(?:posi[çc][ãa]o|location|position)\s*([\d\-–]+)", linha, re.I)
    if m:
        return m.group(1)
    m = re.search(r"(?:p[áa]gina|page|seite)\s*([\w\-–]+)", linha, re.I)
    return f"p. {m.group(1)}" if m else ""


# A LINHA DE METADADOS TEM FORMA, e é ela que separa um clippings de qualquer
# outro texto. Ela começa com hífen e traz campos separados por barra vertical:
#
#     - Seu destaque na página 12 | posição 176-178 | Adicionado: ...
#
# Sem conferir isso, um PDF virava uma nota chamada "%PDF-1.7": o primeiro
# pedaço do arquivo binário caía como título e o resto como texto marcado.
# Importar lixo é pior que recusar — a pessoa fica com uma nota que não sabe de
# onde veio, na estante, para sempre.
METADADOS = re.compile(r"^\s*[-–—]\s*\S.*\|", re.M)


def parece_clippings(texto: str) -> bool:
    """Um registro bem formado basta. Um arquivo pode ter lixo no fim."""
    return SEPARADOR in texto and bool(METADADOS.search(texto))


def ler(texto: str) -> List[dict]:
    """Devolve os registros que viram nota. Marcadores e vazios ficam de fora."""
    # O Kindle escreve com fim de linha do Windows, e alguns arquivos vêm com
    # marca de ordem de byte no começo.
    texto = texto.replace("\r\n", "\n").replace("\r", "\n").lstrip("﻿")

    if not parece_clippings(texto):
        return []

    fora = []
    for bruto in texto.split(SEPARADOR):
        linhas = [l for l in bruto.split("\n") if l.strip()]
        if len(linhas) < 2:
            continue

        titulo, autor = _titulo_e_autor(linhas[0])
        if not titulo:
            continue

        # O registro também precisa da linha de metadados: um arquivo pode
        # começar como clippings e ter lixo no fim.
        if not METADADOS.match(linhas[1]):
            continue

        tipo = _tipo(linhas[1])
        if tipo == "marcador":
            continue

        conteudo = "\n".join(linhas[2:]).strip()
        if not conteudo:
            # Destaque sem texto acontece em arquivo truncado. Uma nota vazia na
            # estante é pior que uma nota a menos.
            continue

        fora.append({
            "livro": titulo,
            "autor": autor,
            "tipo": tipo,
            "posicao": _posicao(linhas[1]),
            "texto": conteudo,
        })
    return fora
