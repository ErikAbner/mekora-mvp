"""O `My Clippings.txt` do Kindle, e os casos que o formato não garante."""

from app.services.clippings_service import ler

PT = """﻿Enviesados (Rian Dutra)
- Seu destaque na página 12 | posição 176-178 | Adicionado: segunda-feira, 1 de janeiro de 2024 10:30:00

O simpático senhor o anunciara por R$ 22 mil.
==========
Enviesados (Rian Dutra)
- Sua nota na página 12 | posição 178 | Adicionado: segunda-feira, 1 de janeiro de 2024 10:31:00

ancoragem clássica
==========
Enviesados (Rian Dutra)
- Seu marcador na página 40 | posição 600 | Adicionado: terça-feira, 2 de janeiro de 2024 09:00:00


==========
"""


def test_le_destaque_e_nota_e_ignora_marcador():
    """Marcador é posição sem conteúdo: importá-lo criaria uma nota vazia."""
    r = ler(PT)
    assert [x["tipo"] for x in r] == ["destaque", "nota"]
    assert r[0]["texto"] == "O simpático senhor o anunciara por R$ 22 mil."
    assert r[0]["livro"] == "Enviesados"
    assert r[0]["autor"] == "Rian Dutra"


def test_a_marca_de_ordem_de_byte_nao_entra_no_titulo():
    """Arquivo do Kindle vem com BOM. Sem tirá-lo, o primeiro livro do arquivo
    fica com um caractere invisível no nome e nunca casa com nada."""
    assert ler(PT)[0]["livro"] == "Enviesados"


def test_titulo_com_parenteses_no_meio():
    """O autor é o ÚLTIMO grupo de parênteses, não o primeiro."""
    r = ler(
        "Cem Anos de Solidão (1967) (García Márquez)\n"
        "- Seu destaque na página 1 | posição 10-12 | Adicionado: hoje\n\n"
        "Muitos anos depois.\n" + "=" * 10
    )
    assert r[0]["livro"] == "Cem Anos de Solidão (1967)"
    assert r[0]["autor"] == "García Márquez"


def test_livro_sem_autor():
    r = ler("Anotações\n- Seu destaque | posição 1 | Adicionado: hoje\n\nAlgo.\n" + "=" * 10)
    assert r[0]["livro"] == "Anotações"
    assert r[0]["autor"] == ""


def test_kindle_em_ingles():
    """O mesmo arquivo pode ter registros em dois idiomas se o aparelho mudou de
    idioma no meio da vida. O tipo é detectado por raiz de palavra."""
    r = ler(
        "Thinking, Fast and Slow (Daniel Kahneman)\n"
        "- Your Highlight on page 12 | location 176-178 | Added on Monday, January 1, 2024\n\n"
        "The anchor is the number you saw.\n" + "=" * 10
        + "\nThinking, Fast and Slow (Daniel Kahneman)\n"
        "- Your Bookmark on page 40 | location 600 | Added on Monday\n\n\n" + "=" * 10
    )
    assert [x["tipo"] for x in r] == ["destaque"]
    assert r[0]["posicao"] == "176-178"


def test_fim_de_linha_do_windows():
    """O Kindle escreve com CRLF. Sem normalizar, todo texto termina com \\r."""
    r = ler("Livro (Autor)\r\n- Seu destaque | posição 5 | Adicionado: hoje\r\n\r\nTexto.\r\n" + "=" * 10)
    assert r[0]["texto"] == "Texto."


def test_destaque_sem_texto_nao_vira_nota():
    """Acontece em arquivo truncado. Nota vazia na estante é pior que nota a menos."""
    r = ler("Livro (Autor)\n- Seu destaque | posição 5 | Adicionado: hoje\n\n\n" + "=" * 10)
    assert r == []


def test_arquivo_vazio_ou_lixo():
    assert ler("") == []
    assert ler("=" * 10) == []
    assert ler("uma linha solta") == []


def test_pagina_quando_nao_ha_posicao():
    r = ler("Livro (Autor)\n- Seu destaque na página 42 | Adicionado: hoje\n\nTexto.\n" + "=" * 10)
    assert r[0]["posicao"] == "p. 42"


def test_arquivo_que_nao_e_clippings_nao_vira_nota():
    """Um PDF virava uma nota chamada "%PDF-1.7": o começo do binário caía como
    título e o resto como texto marcado. A pessoa ficava com uma nota que não
    sabia de onde veio, na estante, para sempre."""
    assert ler("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>") == []
    assert ler("Um texto qualquer\ncom duas linhas\n\ne um paragrafo.") == []


def test_lixo_no_fim_nao_impede_o_resto():
    """Cada registro é conferido, e não só o arquivo: um clippings verdadeiro
    com sujeira no fim continua sendo importado."""
    bom = ("Livro (Autor)\n- Seu destaque | posição 5 | Adicionado: hoje\n\nTexto bom.\n" + "=" * 10)
    r = ler(bom + "\nlixo sem forma nenhuma\nmais lixo\n" + "=" * 10)
    assert len(r) == 1
    assert r[0]["texto"] == "Texto bom."
