#!/usr/bin/env python3
"""As duas metades do `sessao-de-prova.sh`, num arquivo que não é heredoc.

    python3 scripts/_sessao.py <banco> <email> criar    # imprime o token
    python3 scripts/_sessao.py <banco> <email> livro    # imprime o primeiro livro

POR QUE É UM ARQUIVO E NÃO UM HEREDOC: a primeira versão embutia este código no
`.sh` com `<<'PY'`, e o texto dentro dele continha `<<'PY'` de novo — o
delimitador fechou o heredoc de fora no meio, e o shell tentou executar Python.
Um arquivo não tem essa aresta.

O sublinhado no nome diz que ele é peça do `sessao-de-prova.sh`, e não um
instrumento que alguém chame direto.
"""

import hashlib
import secrets
import sqlite3
import sys
from datetime import datetime, timedelta

banco, email, oque = sys.argv[1], sys.argv[2], sys.argv[3]

# SEM FUSO, e a razão está no `models/pessoa.py`: o `agora()` do produto devolve
# UTC NAIVE porque "o SQLite não guarda fuso", e uma data com `+00:00` escrita
# aqui volta do banco como aware — a comparação de `Sessao.vale` põe aware
# contra naive e a sessão nunca vale.
#
# Medido: a sessão era criada, o biscoito era aceito pelo navegador, e a tela
# continuava mostrando "Criar conta no Mekora". Três voltas até olhar a coluna.
agora = datetime.utcnow()


def quando(d=0):
    return (agora + timedelta(days=d)).isoformat(" ", "seconds")


if oque == "criar":
    c = sqlite3.connect(banco)
    linha = c.execute("SELECT id FROM pessoas WHERE email = ?", (email,)).fetchone()
    if linha is None:
        c.execute("INSERT INTO pessoas (email, criada_em) VALUES (?, ?)", (email, quando()))
        linha = c.execute("SELECT id FROM pessoas WHERE email = ?", (email,)).fetchone()
    pessoa = linha[0]

    # O MESMO RESUMO QUE O SERVIDOR CONFERE. `acesso_service.resumir` é sha256 do
    # token; guardar o token em claro faria a sessão de medida ser mais fraca que
    # a de verdade, e uma prova que roda por um caminho mais fraco não prova o
    # caminho.
    token = secrets.token_urlsafe(32)
    resumo = hashlib.sha256(token.encode("utf-8")).hexdigest()

    # `encerrada` é NOT NULL e o padrão dela mora no ORM — e padrão de ORM não
    # chega ao banco: ele é aplicado ao criar o objeto em Python. Escrevendo por
    # SQL, o valor vai à mão. É a mesma pegadinha do `server_default` nas
    # migrações, do outro lado.
    c.execute(
        "INSERT INTO sessoes (pessoa_id, resumo, criada_em, expira_em, encerrada) VALUES (?, ?, ?, ?, 0)",
        (pessoa, resumo, quando(), quando(1)),
    )
    c.commit()
    c.close()
    print(token)

elif oque == "livro":
    c = sqlite3.connect(f"file:{banco}?mode=ro", uri=True)
    p = c.execute("SELECT id FROM pessoas WHERE email = ?", (email,)).fetchone()
    livro = None
    if p:
        # COM EPUB DE PREFERÊNCIA: a leitura medida sobre um livro sem texto abre
        # o exemplo, e a medida sai de outra tela sem ninguém ver.
        livro = c.execute(
            "SELECT id FROM processing_jobs WHERE dono_id = ? AND epub_path IS NOT NULL ORDER BY id LIMIT 1",
            (p[0],),
        ).fetchone()
        if livro is None:
            livro = c.execute(
                "SELECT id FROM processing_jobs WHERE dono_id = ? ORDER BY id LIMIT 1", (p[0],)
            ).fetchone()
    c.close()
    print(livro[0] if livro else 0)

else:
    print(f"não sei fazer {oque!r}", file=sys.stderr)
    sys.exit(1)
