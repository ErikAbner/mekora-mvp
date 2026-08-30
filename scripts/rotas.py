#!/usr/bin/env python3
"""Descobre quais caminhos pertencem ao backend, e escreve isso onde a borda lê.

    python3 scripts/rotas.py            # gera contrato/rotas.js e Caddyfile
    python3 scripts/rotas.py --conferir # falha se algo estiver fora de data

POR QUE ISTO É GERADO
=====================
As rotas do backend não têm prefixo comum: são `/upload`, `/analyze`, `/jobs`,
`/history` e mais vinte, todas na raiz. Quem está na frente delas — o proxy do
Vite em desenvolvimento, o Caddy em produção — precisa saber quais caminhos
repassar e quais servir como interface.

Essa lista já existia escrita à mão no `vite.config.js`. Uma segunda cópia no
Caddyfile faria duas listas para manter, e elas divergiriam: alguém cria uma
rota, testa em desenvolvimento onde a lista do Vite foi atualizada, e em
produção o pedido cai no SPA e volta como HTML. O código faz `.json()` num
`<!doctype html>` e o erro que aparece é `Unexpected token '<'` — que não diz
nada sobre rota faltando na borda.

Então a lista não é copiada: ela é PERGUNTADA ao FastAPI, que é quem sabe.
"""

import argparse
import os
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "backend"))

# O app cria tabelas ao ser importado. Aponta para um banco descartável: gerar
# uma lista de rotas não é motivo para tocar no banco de verdade.
_tmp = Path(tempfile.gettempdir()) / "mekora-rotas.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}"

from main import app  # noqa: E402

# Caminhos que o backend declara mas que a borda NÃO deve repassar.
# `/{full_path:path}` é o catch-all que serve o frontend legado: em produção
# quem serve interface é o Caddy, e repassar tudo para cá entregaria o legado
# no lugar do produto.
IGNORADAS = {
    "/openapi.json",
    "/docs",
    "/redoc",
    "/docs/oauth2-redirect",
    # `/assets` é do frontend LEGADO, montado pelo backend. Em produção esse
    # mesmo caminho carrega o CSS e o JavaScript do produto, que o Vite escreve
    # em `dist/assets/`. Repassá-lo ao backend entregaria o site sem estilo e
    # sem código — a página abriria, em branco, sem erro nenhum no servidor.
    "/assets",
}


def prefixos():
    fora = set()
    for rota in app.routes:
        caminho = getattr(rota, "path", "")
        if not caminho.startswith("/") or caminho in IGNORADAS:
            continue
        primeiro = caminho.split("/")[1] if len(caminho.split("/")) > 1 else ""
        # Um segmento com chave é o catch-all do SPA, não uma rota de API.
        if not primeiro or primeiro.startswith("{"):
            continue
        fora.add("/" + primeiro)
    return sorted(fora)


CABECALHO_JS = '''/* GERADO por scripts/rotas.py — não editar à mão.
 *
 * Os caminhos que pertencem ao backend. O proxy de desenvolvimento e a borda de
 * produção leem a MESMA lista, para que uma rota nova funcione nos dois lugares
 * ou em nenhum — e nunca só em desenvolvimento, que é o modo de falhar caro.
 *
 * Para atualizar:  python3 scripts/rotas.py
 */
'''


def escrever_js(lista):
    destino = RAIZ / "contrato" / "rotas.js"
    corpo = CABECALHO_JS + "export const PREFIXOS_API = [\n"
    corpo += "".join(f'  "{p}",\n' for p in lista)
    corpo += "];\n"
    return destino, corpo


def escrever_caddy(lista):
    destino = RAIZ / "Caddyfile"
    atual = destino.read_text(encoding="utf-8")
    inicio = "\t# ── rotas do backend ── GERADO por scripts/rotas.py, não editar à mão\n"
    fim = "\t# ── fim das rotas geradas ──\n"
    bloco = inicio
    bloco += "\thandle " + " ".join(f"{p}/*" for p in lista) + " {\n"
    bloco += "\t\treverse_proxy backend:8000\n\t}\n"
    # As rotas exatas, sem barra: /health responde em /health, não em /health/.
    bloco += "\thandle " + " ".join(lista) + " {\n"
    bloco += "\t\treverse_proxy backend:8000\n\t}\n"
    bloco += fim

    if inicio in atual:
        antes = atual[: atual.index(inicio)]
        depois = atual[atual.index(fim) + len(fim) :]
        return destino, antes + bloco + depois
    marca = "\thandle {\n"
    i = atual.index(marca)
    return destino, atual[:i] + bloco + "\n" + atual[i:]


def conferir_colisao(lista):
    """As rotas de tela e as de API dividem o mesmo espaço de caminhos.

    Se alguém criar `/metrics` como tela, ela nunca abre: a borda repassa o
    pedido ao backend antes de o roteador do navegador ver. O erro aparece como
    "essa página não carrega" e some quando se testa em desenvolvimento, onde a
    rota é servida pelo Vite — que é o pior modo de um defeito existir.
    """
    import re

    app_jsx = (RAIZ / "web" / "src" / "App.jsx").read_text(encoding="utf-8")
    telas = set(re.findall(r'path="([^"]*)"', app_jsx))
    topo = {"/" + t.strip("/").split("/")[0] for t in telas if t.strip("/")}
    return sorted(set(lista) & topo)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--conferir", action="store_true")
    a = p.parse_args()

    lista = prefixos()

    colisao = conferir_colisao(lista)
    if colisao:
        print("COLISÃO entre rota de tela e rota de API: " + " ".join(colisao))
        print("Uma das duas precisa mudar de nome — a borda não tem como servir as duas.")
        return 1

    saidas = [escrever_js(lista), escrever_caddy(lista)]

    if a.conferir:
        ruim = [d for d, c in saidas if not d.exists() or d.read_text(encoding="utf-8") != c]
        if ruim:
            print("FORA DE DATA — rode `python3 scripts/rotas.py`:")
            for d in ruim:
                print("  " + str(d.relative_to(RAIZ)))
            return 1
        print(f"em dia: {len(lista)} prefixos, {len(saidas)} arquivos")
        return 0

    for destino, corpo in saidas:
        destino.write_text(corpo, encoding="utf-8")
        print("escrito: " + str(destino.relative_to(RAIZ)))
    print(f"\n{len(lista)} prefixos: " + " ".join(lista))
    return 0


if __name__ == "__main__":
    sys.exit(main())
