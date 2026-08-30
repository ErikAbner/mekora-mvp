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
    """Devolve `(exatas, com_subcaminho)`.

    A divisão existe por causa de `/entrar`: o backend responde em
    `/entrar/pedir` e `/entrar/{token}`, e `/entrar` sozinho é uma TELA — a
    caixa de e-mail que a pessoa vê. Tratar tudo como prefixo mandaria a tela
    para o backend; tratar tudo como exato deixaria o link do e-mail cair no
    SPA.

    Então um caminho só entra em `exatas` se o backend de fato responder nele
    sem nada depois.
    """
    exatas, com_sub = set(), set()
    for rota in app.routes:
        caminho = getattr(rota, "path", "")
        if not caminho.startswith("/") or caminho in IGNORADAS:
            continue
        partes = [p for p in caminho.split("/") if p]
        if not partes or partes[0].startswith("{"):
            continue
        raiz = "/" + partes[0]
        if len(partes) == 1:
            exatas.add(raiz)
        else:
            com_sub.add(raiz)
    return sorted(exatas), sorted(com_sub)


CABECALHO_JS = '''/* GERADO por scripts/rotas.py — não editar à mão.
 *
 * Os caminhos que pertencem ao backend. O proxy de desenvolvimento e a borda de
 * produção leem a MESMA lista, para que uma rota nova funcione nos dois lugares
 * ou em nenhum — e nunca só em desenvolvimento, que é o modo de falhar caro.
 *
 * A LISTA VEM PARTIDA EM DUAS, e a partição custou uma sessão para aparecer:
 *
 *   COM_SUBCAMINHO  o backend responde ABAIXO deste caminho — /jobs/1/status,
 *                   /entrar/{token}. O caminho sozinho não é dele.
 *   EXATAS          o backend responde NELE — /eu, /health, /upload.
 *
 * `/entrar` é o caso que obriga a distinção: o backend responde em
 * /entrar/pedir e /entrar/{token}, e /entrar sozinho é uma TELA. Tratado como
 * prefixo simples, o pedido da tela ia para o backend — e ia SÓ EM
 * DESENVOLVIMENTO, porque a borda de produção já separava. A tela abria no
 * servidor e não abria na máquina de quem a escreveu.
 *
 * Para atualizar:  python3 scripts/rotas.py
 */
'''


def escrever_js(exatas, com_sub):
    destino = RAIZ / "contrato" / "rotas.js"
    corpo = CABECALHO_JS
    corpo += "export const COM_SUBCAMINHO = [\n"
    corpo += "".join(f'  "{p}",\n' for p in com_sub)
    corpo += "];\n\nexport const EXATAS = [\n"
    corpo += "".join(f'  "{p}",\n' for p in exatas)
    corpo += "];\n\n/* Todos, para quem só precisa saber se um caminho é do backend. */\n"
    corpo += "export const PREFIXOS_API = [...new Set([...COM_SUBCAMINHO, ...EXATAS])].sort();\n"
    return destino, corpo


def escrever_caddy(exatas, com_sub):
    destino = RAIZ / "Caddyfile"
    atual = destino.read_text(encoding="utf-8")
    inicio = "\t# ── rotas do backend ── GERADO por scripts/rotas.py, não editar à mão\n"
    fim = "\t# ── fim das rotas geradas ──\n"
    bloco = inicio
    if com_sub:
        bloco += "\thandle " + " ".join(f"{p}/*" for p in com_sub) + " {\n"
        bloco += "\t\treverse_proxy backend:8000\n\t}\n"
    if exatas:
        # Sem barra: /health responde em /health. E `/entrar` NÃO está aqui —
        # o backend não responde nele, quem responde é a tela.
        bloco += "\thandle " + " ".join(exatas) + " {\n"
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

    exatas, com_sub = prefixos()
    lista = sorted(set(exatas) | set(com_sub))

    # A colisão só é fatal para as EXATAS: `/entrar` de tela convive com
    # `/entrar/pedir` de backend, porque a borda separa por caminho.
    colisao = conferir_colisao(exatas)
    if colisao:
        print("COLISÃO entre rota de tela e rota de API: " + " ".join(colisao))
        print("Uma das duas precisa mudar de nome — a borda não tem como servir as duas.")
        return 1

    saidas = [escrever_js(exatas, com_sub), escrever_caddy(exatas, com_sub)]

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
