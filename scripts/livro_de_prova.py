#!/usr/bin/env python3
"""Um EPUB de verdade, montado aqui, para a leitura ter o que abrir.

POR QUE ISTO EXISTE: o `semear.py` cria livros que nunca foram convertidos —
mentira confessa, e boa o bastante para a estante, que só precisa de título,
capa e contagem. A LEITURA não: ela abre o arquivo no navegador, lê a espinha,
o sumário e o texto. Sem EPUB em disco, `/leitura/:id` cai no texto de exemplo,
e o índice, as notas e a barra de seleção — que são o que há para ver ali —
nunca aparecem.

O texto é de domínio público (Machado de Assis, *Memórias Póstumas de Brás
Cubas*, 1881), e está aqui em trechos curtos. Usar um livro do Erik seria pôr
documento pessoal dentro de um script de semeadura, que é o contrário do que
este arquivo deve fazer.

O EPUB traz o `nav` de EPUB 3 E o `toc.ncx` de EPUB 2, de propósito: são os dois
formatos que o `epub.js` sabe ler, e um livro de prova que só tenha um deles
deixa metade do código sem exercício fora dos testes.
"""
from __future__ import annotations

import zipfile
from pathlib import Path

TITULO = "Memórias Póstumas de Brás Cubas"
AUTOR = "Machado de Assis"

CAPITULOS = [
    ("Ao leitor", [
        "Que Stendhal confessasse haver escrito um de seus livros para cem "
        "leitores, coisa é que admira e consterna. O que não admira, nem "
        "provavelmente consternará é se este outro livro não tiver os cem "
        "leitores de Stendhal, nem cinquenta, nem vinte, e quando muito, dez.",
        "Dez? Talvez cinco. Trata-se, na verdade, de uma obra difusa, na qual "
        "eu, Brás Cubas, se adotei a forma livre de um Sterne ou de um Xavier "
        "de Maistre, não sei se lhe meti algumas rabugens de pessimismo.",
    ]),
    ("Óbito do autor", [
        "Algum tempo hesitei se devia abrir estas memórias pelo princípio ou "
        "pelo fim, isto é, se poria em primeiro lugar o meu nascimento ou a "
        "minha morte.",
        "Suposto o uso vulgar seja começar pelo nascimento, duas considerações "
        "me levaram a adotar diferente método: a primeira é que eu não sou "
        "propriamente um autor defunto, mas um defunto autor, para quem a "
        "campa foi outro berço.",
        "A segunda é que o escrito ficaria assim mais galante e mais novo. "
        "Moisés, que também contou a sua morte, não a pôs no intróito, mas no "
        "cabo: diferença radical entre este livro e o Pentateuco.",
    ]),
    ("O emplasto", [
        "Vinte anos antes, compusera eu uma ideia, uma invenção nada menos que "
        "a de um medicamento anti-hipocondríaco, destinado a aliviar a nossa "
        "melancólica humanidade.",
        "Na petição de privilégio que então redigi, chamava eu a atenção do "
        "governo para esse resultado verdadeiramente cristão. Todavia, não "
        "neguei aos amigos as vantagens pecuniárias que deviam resultar da "
        "distribuição de um produto de tamanhos e tão profundos efeitos.",
    ]),
    ("A ideia fixa", [
        "A minha ideia, depois de tantas cabriolas, constituíra-se ideia fixa. "
        "Deus te livre, leitor, de uma ideia fixa; antes um argueiro, antes uma "
        "trave no olho.",
        "As ideias fixas fazem homens fortes e delirantes; a vontade errante e "
        "difusa não faz nem Cromwell nem Maomé.",
    ]),
    ("O delírio", [
        "Sabe o leitor que eu tinha delírio; e há de querer saber se algum "
        "leitor teve o mesmo delírio. Não; o meu foi certamente diferente do "
        "de todos.",
        "Convertido em fio de água, corri por um vale, e fui dar num rio, e "
        "depois no mar, e depois num céu de nuvens muito altas, das quais eu "
        "via a terra pequenina e distante.",
    ]),
    ("O velho diálogo de Adão e Eva", [
        "Este capítulo é de duas pessoas que conversam sem que se saiba o que "
        "dizem; e é assim mesmo que devem ser lidos os diálogos velhos.",
        "Um livro que se lê depressa é um livro que não se lê. O tempo que se "
        "gasta com ele é o que dele fica.",
    ]),
]

_XHTML = """<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR">
<head><title>{titulo}</title></head>
<body><h1>{titulo}</h1>{corpo}</body></html>"""


def _opf() -> str:
    itens = "\n".join(
        f'    <item id="c{i}" href="texto/cap{i}.xhtml" media-type="application/xhtml+xml"/>'
        for i in range(len(CAPITULOS))
    )
    espinha = "\n".join(f'    <itemref idref="c{i}"/>' for i in range(len(CAPITULOS)))
    return f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">mekora-livro-de-prova</dc:identifier>
    <dc:title>{TITULO}</dc:title>
    <dc:creator>{AUTOR}</dc:creator>
    <dc:language>pt-BR</dc:language>
  </metadata>
  <manifest>
{itens}
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
{espinha}
  </spine>
</package>"""


def _nav() -> str:
    linhas = "\n".join(
        f'      <li><a href="texto/cap{i}.xhtml">{t}</a></li>'
        for i, (t, _) in enumerate(CAPITULOS)
    )
    return f"""<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Índice</title></head>
<body><nav epub:type="toc"><h1>Índice</h1><ol>
{linhas}
</ol></nav></body></html>"""


def _ncx() -> str:
    pontos = "\n".join(
        f'    <navPoint id="n{i}" playOrder="{i + 1}">'
        f'<navLabel><text>{t}</text></navLabel>'
        f'<content src="texto/cap{i}.xhtml"/></navPoint>'
        for i, (t, _) in enumerate(CAPITULOS)
    )
    return f"""<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="mekora-livro-de-prova"/></head>
  <docTitle><text>{TITULO}</text></docTitle>
  <navMap>
{pontos}
  </navMap>
</ncx>"""


def escrever(destino: Path) -> Path:
    """Grava o EPUB em `destino` e devolve o caminho."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        # O `mimetype` é o PRIMEIRO e vai SEM COMPRESSÃO — é o que a
        # especificação exige, e o que faz um leitor reconhecer o arquivo.
        z.writestr(
            zipfile.ZipInfo("mimetype"), "application/epub+zip",
            compress_type=zipfile.ZIP_STORED,
        )
        z.writestr("META-INF/container.xml", """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/livro.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>""")
        z.writestr("OEBPS/livro.opf", _opf())
        z.writestr("OEBPS/nav.xhtml", _nav())
        z.writestr("OEBPS/toc.ncx", _ncx())
        for i, (titulo, paragrafos) in enumerate(CAPITULOS):
            corpo = "".join(f"<p>{p}</p>" for p in paragrafos)
            z.writestr(f"OEBPS/texto/cap{i}.xhtml", _XHTML.format(titulo=titulo, corpo=corpo))
    return destino


if __name__ == "__main__":
    import sys
    print(escrever(Path(sys.argv[1] if len(sys.argv) > 1 else "livro-de-prova.epub")))
