#!/usr/bin/env python3
"""Tira do SVG a precisão que ninguém vê.

    python3 scripts/svg.py             # reescreve os ícones
    python3 scripts/svg.py --conferir  # falha se algum estiver por enxugar

POR QUE
=======
O Figma exporta coordenada com seis casas decimais. Um ícone de 20,8 por 21,6
sai com 179 comandos e 1044 números só no primeiro traço, e o arquivo dá 51 KB.
Somados, os 29 arquivos davam 666 KB — 290 KB comprimidos, que é o que viaja.

QUANTAS CASAS, E COMO ISSO FOI DECIDIDO
=======================================
Não por argumento. Cada nível foi gerado, desenhado num Chrome de verdade a 24 e
a 96 pixels, e comparado com o original PIXEL A PIXEL — no alfa, porque estes
arquivos são forma e não cor. A 24 pixels, que é o tamanho de uso:

    casas   pixels que mudam mais que 32/255   tamanho no fio
    0                   49,90%                  −73%
    1                    1,22%                  −60%
    2                    0,19%                  −38%
    3                    0,01%                  −22%

Zero casa destrói o desenho: metade dos pixels muda. Isso mata o corte mais
tentador — 73% de economia — e é por isso que ele está escrito aqui, para
ninguém tentar de novo achando que ninguém mediu.

Uma casa é honesta demais para o próprio bem: 1,22% é 204 pixels somando os 29
ícones, tudo em borda, nada de forma. Passaria. Mas custa 6 vezes mais desvio
que duas casas para ganhar 22 pontos de compressão, e desvio de borda é a coisa
que ninguém percebe até o dia em que percebe.

DUAS CASAS: 31 pixels ao todo, nos 29 arquivos juntos, e 38% menos peso no fio —
290 KB comprimidos viram 178 KB. É o ponto em que o desenho não muda e o arquivo
muda muito.

O QUE SAI, E O QUE NÃO SAI
==========================
Sai: casa decimal além da primeira, quebra de linha, espaço repetido, e os
`id=` que o Figma inventa (`Vector`, `Group`, `Vector_2`) e que ninguém aponta.

NÃO sai cor. Estes arquivos são MÁSCARA: quem pinta é o `currentColor` do
`Icone`, e o portão recusa tinta cravada dentro de asset justamente para essa
decisão não fugir para dentro de um arquivo. Mexer em `fill` aqui seria abrir a
porta que ele fecha.

NÃO sai `viewBox`, `preserveAspectRatio` nem `overflow`: são eles que decidem
como a máscara se encaixa na caixa, e tirar qualquer um muda desenho.
"""

import argparse
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ICONES = RAIZ / "web" / "publico" / "icones"

# Duas casas. O cabeçalho traz a tabela que escolheu este número, medida em
# Chrome. Mexer aqui sem refazer a medição é trocar desenho por byte no escuro.
CASAS = 2


def _arredonda(m):
    v = f"%.{CASAS}f" % float(m.group())
    v = v.rstrip("0").rstrip(".")
    return v or "0"


def enxuto(texto):
    """Devolve o mesmo desenho, escrito com menos letras."""
    t = re.sub(r'\s(?:id|data-name)="[^"]*"', "", texto)
    t = re.sub(r"-?\d+\.\d+", _arredonda, t)
    t = re.sub(r"\s*\n\s*", "", t)
    t = re.sub(r"  +", " ", t)
    return t.strip() + "\n"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--conferir", action="store_true", help="não escreve; só falha")
    args = p.parse_args()

    arquivos = sorted(ICONES.glob("*.svg"))
    if not arquivos:
        print(f"nenhum SVG em {ICONES}", file=sys.stderr)
        return 1

    antes = depois = 0
    pendentes = []
    for f in arquivos:
        atual = f.read_text()
        novo = enxuto(atual)
        antes += len(atual)
        depois += len(novo)
        if novo != atual:
            pendentes.append(f.name)
            if not args.conferir:
                f.write_text(novo)

    if args.conferir:
        if pendentes:
            print(
                f"{len(pendentes)} SVG por enxugar: {', '.join(pendentes[:5])}"
                f"{'…' if len(pendentes) > 5 else ''}\n"
                f"Rode: python3 scripts/svg.py",
                file=sys.stderr,
            )
            return 1
        print(f"{len(arquivos)} SVG enxutos.")
        return 0

    print(
        f"{len(arquivos)} SVG: {antes / 1024:.0f} KB → {depois / 1024:.0f} KB "
        f"({100 - 100 * depois / antes:.0f}% menor). {len(pendentes)} reescritos."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
