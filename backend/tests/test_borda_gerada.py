"""A borda gerada não pode perder o `header_up` — a metade do achado 3 que dá para provar daqui.

O ACHADO 3 TEM DUAS METADES, e elas se seguram sozinhas de propósito:

    o app    lê o ÚLTIMO elemento do `X-Forwarded-For`, que é o que o proxy
             imediato escreveu — `test_vazao_cabecalho.py` prova isso
    a borda  SOBRESCREVE o cabeçalho inteiro com `{remote_host}`, em vez de
             acrescentar a ele

Se a borda só acrescentasse, o visitante escreveria o primeiro elemento e — na
leitura antiga, que pegava o primeiro — escolheria a própria identidade de
contagem. Medido em 03/09: girando o primeiro elemento, doze envios seguidos
passaram com o teto em dez.

O QUE ESTE ARQUIVO PROVA, E O QUE ELE NÃO PROVA
===============================================
Ele prova que o `Caddyfile` versionado manda `header_up X-Forwarded-For
{remote_host}` em TODO bloco de proxy, e que o gerador não consegue produzir um
sem isso. É a garantia contra a regressão mais provável: alguém roda
`scripts/rotas.py` depois de acrescentar uma rota, e o bloco novo sai sem a
linha.

Ele NÃO prova que a borda de verdade faz isso, porque nesta máquina não há
`caddy` nem `docker`. Essa prova é a rodada B do `docs/BORDA-E-WORKER.md`:
vinte e cinco pedidos com o primeiro elemento girando, contra o domínio real —
vinte 204 e um 429. Se os vinte e cinco vierem 204, a borda não está
sobrescrevendo e o teto por origem é enfeite.

Uma prova estática que se apresenta como a prova inteira é pior que nenhuma:
ela fecha o item na cabeça de quem lê.
"""

from __future__ import annotations

import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CADDYFILE = RAIZ / "Caddyfile"

ESCRITA = "header_up X-Forwarded-For {remote_host}"


def _blocos_de_proxy(texto: str) -> list[str]:
    """Cada `reverse_proxy … { … }` do arquivo, com o corpo."""
    return re.findall(r"reverse_proxy[^\n{]*\{(.*?)\n\t\t\}", texto, re.S)


def test_todo_proxy_sobrescreve_a_origem() -> None:
    texto = CADDYFILE.read_text(encoding="utf-8")
    blocos = _blocos_de_proxy(texto)

    assert blocos, "nenhum bloco de proxy no Caddyfile — a borda não repassa nada"
    sem = [b for b in blocos if ESCRITA not in b]
    assert not sem, (
        f"{len(sem)} bloco(s) de proxy sem `{ESCRITA}`.\n"
        "Sem essa linha o Caddy ACRESCENTA ao X-Forwarded-For em vez de "
        "sobrescrever, e quem chega escolhe o começo da lista."
    )


def test_o_gerador_nao_produz_bloco_sem_a_linha() -> None:
    """O arquivo de hoje está certo; o risco é o de amanhã.

    Quem acrescenta uma rota roda `scripts/rotas.py`, e o gerador reescreve os
    blocos. Se a linha morasse só no arquivo, ela sumiria na primeira rota nova
    — sem ninguém notar, porque o produto continua funcionando: o que quebra é
    só o teto por origem, e teto que não limita não avisa.
    """
    fonte = (RAIZ / "scripts" / "rotas.py").read_text(encoding="utf-8")
    assert ESCRITA in fonte, (
        "o gerador não escreve mais o `header_up` — o próximo "
        "`python3 scripts/rotas.py` apaga a metade da borda do achado 3"
    )


def test_borda_endurece_app_e_artefatos_html() -> None:
    texto = CADDYFILE.read_text(encoding="utf-8")

    assert "Strict-Transport-Security" in texto
    assert "Content-Security-Policy" in texto
    assert "header /storage/* Content-Security-Policy" in texto
    assert "default-src 'none'" in texto
    assert "frame-ancestors 'none'" in texto
