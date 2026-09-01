#!/usr/bin/env python3
"""Um link de entrada gravado DIRETO no banco, sem passar pelo pedido.

POR QUE ISTO EXISTE: `/entrar/pedir` tem limite de cinco pedidos a cada dez
minutos por e-mail — que existe para o campo aberto na internet não virar
máquina de incomodar, e está certo. Em desenvolvimento ele vira uma parede: quem
está olhando o produto pede link, o link serve uma vez, e na sexta vez em dez
minutos o `ver.sh` responde "não saiu link" e não há mais como entrar.

Aqui a chave é ESCRITA no banco. O limite continua valendo para a rota — este
script não passa por ela. É seguro porque só roda em quem já tem o arquivo do
banco na mão: quem chegou aqui já pode ler tudo de qualquer jeito.

    uso:  MEKORA_PROVA=.ver MEKORA_EMAIL=erik@mekora.local python3 scripts/chave-local.py

Imprime o token. Nada mais vai para a saída — ele é uma credencial.
"""
from __future__ import annotations

import hashlib
import os
import secrets
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(os.environ.get("MEKORA_PROVA", ".ver"))
EMAIL = os.environ.get("MEKORA_EMAIL", "erik@mekora.local")
BANCO = RAIZ / "storage" / "kindle_tool.db"

# Um dia, e não os quinze minutos da rota. O link de produção é curto porque
# viaja por e-mail e pode ser lido por quem não devia; este fica na máquina de
# quem o gerou, e quinze minutos obrigariam a rodar o script a cada olhada.
VALIDADE = timedelta(days=1)

if not BANCO.exists():
    print(f"banco não encontrado em {BANCO}", file=sys.stderr)
    raise SystemExit(1)

c = sqlite3.connect(BANCO)
c.execute("PRAGMA foreign_keys = ON")

agora = datetime.now(timezone.utc)

linha = c.execute("SELECT id FROM pessoas WHERE email = ?", (EMAIL,)).fetchone()
if linha is None:
    c.execute(
        "INSERT INTO pessoas (email, criada_em, vista_em) VALUES (?, ?, ?)",
        (EMAIL, agora, agora),
    )
    pessoa = c.execute("SELECT id FROM pessoas WHERE email = ?", (EMAIL,)).fetchone()[0]
else:
    pessoa = linha[0]

# O TOKEN NÃO É GUARDADO — o banco recebe o resumo, como na rota de verdade. Um
# script de desenvolvimento que guardasse o token em claro ensinaria a fazer
# isso, e um dia alguém copiaria o padrão para o código que vai ao ar.
token = secrets.token_urlsafe(32)
resumo = hashlib.sha256(token.encode("utf-8")).hexdigest()

c.execute(
    "INSERT INTO chaves (pessoa_id, resumo, criada_em, expira_em) VALUES (?, ?, ?, ?)",
    (pessoa, resumo, agora, agora + VALIDADE),
)
c.commit()

print(token)
