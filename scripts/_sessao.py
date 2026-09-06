#!/usr/bin/env python3
"""As duas metades do `sessao-de-prova.sh`, num arquivo que não é heredoc.

    python3 scripts/_sessao.py <banco> <email> criar      # imprime o token
    python3 scripts/_sessao.py <banco> <email> livro      # imprime o primeiro livro
    python3 scripts/_sessao.py <banco> <email> analisado  # o parado em `analyzed`
    python3 scripts/_sessao.py <banco> <email> convertendo [id]  # põe em conversão
    python3 scripts/_sessao.py <banco> <email> parado [id]       # desfaz o de cima
    python3 scripts/_sessao.py <banco> <email> secao-coberta     # uma secao dentro de outra

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

elif oque == "analisado":
    # O TRABALHO PARADO EM `analyzed` — o do Preparo "o que encontrei".
    #
    # Ele existe por causa de uma tela que a bancada nunca mostrou: todo
    # trabalho semeado nascia em `converted`, e `/preparo/{id}` caía na tela de
    # espera. Quem mede precisa apontar para ESTE, e não para o primeiro livro —
    # e por isso ele tem endereço próprio aqui, em vez de a prova adivinhar.
    #
    # Zero quando não há: a prova que o pedir vai reprovar dizendo que a bancada
    # não tem o estado, que é a resposta certa — e não medir a tela errada.
    c = sqlite3.connect(f"file:{banco}?mode=ro", uri=True)
    p = c.execute("SELECT id FROM pessoas WHERE email = ?", (email,)).fetchone()
    achado = None
    if p:
        achado = c.execute(
            "SELECT id FROM processing_jobs WHERE dono_id = ? AND status = 'analyzed' ORDER BY id LIMIT 1",
            (p[0],),
        ).fetchone()
    c.close()
    print(achado[0] if achado else 0)

elif oque in ("convertendo", "parado"):
    # UM TRABALHO COM CONVERSÃO EM CURSO — o do R-54.
    #
    # A bancada nunca teve um: o conversor de teste falha na hora, e a única
    # forma de a tela de andamento existir por meio segundo era clicar. Quem
    # mede o R-54 precisa do outro caso — CHEGAR no endereço com a conversão já
    # rodando, sem ter clicado nada nesta aba.
    #
    # Ele é ESCRITO, e não semeado: pega o trabalho parado em `analyzed` e põe
    # `conversion_status = 'converting'` com uma operação em curso, que é o que
    # o servidor teria escrito. Imprime o id, ou zero se não houver em que
    # escrever — e a prova que o pedir reprova dizendo isso.
    # O ID PODE VIR DE FORA, e vem quando quem chama já sabe qual trabalho é —
    # a prova, por exemplo, tem o `analisado` em mãos e não precisa procurar de
    # novo. Sem ele, procura pelo dono do e-mail.
    dado = sys.argv[4] if len(sys.argv) > 4 else None
    c = sqlite3.connect(banco)
    achado = (int(dado),) if dado else None
    if achado is None:
        p = c.execute("SELECT id FROM pessoas WHERE email = ?", (email,)).fetchone()
        if p:
            achado = c.execute(
                "SELECT id FROM processing_jobs WHERE dono_id = ? AND status = 'analyzed'"
                " ORDER BY id LIMIT 1",
                (p[0],),
            ).fetchone()
    if achado:
        if oque == "convertendo":
            c.execute(
                "UPDATE processing_jobs SET conversion_status = 'converting',"
                " active_operation = 'convert:prova' WHERE id = ?",
                (achado[0],),
            )
        else:
            # DESFAZER É PARTE DA PROVA: a bancada tem UMA pessoa por rodada, e
            # deixar o trabalho em conversão faria a prova seguinte medir outra
            # tela sem saber por quê.
            c.execute(
                "UPDATE processing_jobs SET conversion_status = 'not_started',"
                " active_operation = NULL WHERE id = ?",
                (achado[0],),
            )
        c.commit()
    c.close()
    print(achado[0] if achado else 0)

elif oque == "secao-coberta":
    # UMA SEÇÃO INTEIRAMENTE DENTRO DE OUTRA — o caso do R-15.
    #
    # O acervo semeado traz UMA seção só ("Design & Tecnologia", 620x420), e por
    # isso a sobreposição que o Erik descreveu nunca pôde ser medida: a nota de
    # 04/09 diz, com todas as letras, "não deu para medir a sobreposição na
    # tela". Um defeito que a bancada não consegue mostrar é um defeito que
    # ninguém consegue fechar.
    #
    # Esta escreve a segunda, cabendo dentro da primeira. Imprime o id, ou zero
    # se não houver seção em que caber.
    c = sqlite3.connect(banco)
    p = c.execute("SELECT id FROM pessoas WHERE email = ?", (email,)).fetchone()
    nova = None
    if p:
        mae = c.execute(
            "SELECT x, y, largura, altura FROM canvas_grupos"
            " WHERE pessoa_id = ? AND apagado_em IS NULL ORDER BY id LIMIT 1",
            (p[0],),
        ).fetchone()
        if mae:
            x, y, larg, alt = mae
            cur = c.execute(
                "INSERT INTO canvas_grupos (pessoa_id, nome, x, y, largura, altura)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (p[0], "Coberta", x + 60, y + 60, max(200.0, larg / 3), max(160.0, alt / 3)),
            )
            nova = (cur.lastrowid,)
            c.commit()
    c.close()
    print(nova[0] if nova else 0)

else:
    print(f"não sei fazer {oque!r}", file=sys.stderr)
    sys.exit(1)
