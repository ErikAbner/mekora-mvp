"""Quantos envios cabem numa janela de tempo.

O QUE ISTO IMPEDE
=================
A `DEC-0018` garante que converter não exige conta, e essa garantia é boa — mas
ela deixa `/upload` aberto a qualquer um. Havia limite de TAMANHO por arquivo
(600 MB) e nenhum de QUANTIDADE: numa VPS de 50 GB, oitenta e três envios enchem
o disco, e quem os fez não precisou nem digitar um e-mail.

Não é um ataque sofisticado. É o que acontece com qualquer coisa aberta na
internet por tempo suficiente.

POR QUE A JANELA É NA MEMÓRIA
=============================
Contar no banco daria uma escrita por envio recusado — exatamente o caminho que
se quer barato. E a contagem não precisa sobreviver a um reinício: quem estava
no limite ganha uma janela nova, e isso é aceitável para um teto que existe
contra volume, não contra fraude.

Um dicionário na memória funciona porque o Mekora roda com UM worker — SQLite
aceita um escritor por vez, e o `Dockerfile` fixa isso. Com vários, cada um
teria a própria contagem e o teto real seria N vezes maior; o comentário está
aqui para que quem mudar o número de workers veja o que mais muda junto.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db

JANELA = 3600  # uma hora

# Com conta o teto é alto: a pessoa é identificável, e o limite existe contra
# acidente — um script em laço — e não contra ela.
COM_CONTA = 60

# Sem conta é apertado, e deliberadamente. Converter sem cadastro precisa
# funcionar para quem está experimentando o produto; dez arquivos por hora
# cobrem isso com folga e não cobrem encher um disco.
SEM_CONTA = 10

_envios: dict = defaultdict(list)


def _de_onde(request: Request) -> str:
    """Quem está pedindo, para efeito de contagem.

    Atrás do Caddy, `request.client.host` é o próprio Caddy — todos os
    visitantes viram um só, e o limite de dez valeria para o mundo inteiro
    junto. `X-Forwarded-For` traz o visitante.

    Ele SÓ é lido quando há domínio configurado, isto é, quando o Mekora está
    atrás da borda que o escreve. Fora disso o cabeçalho é texto que qualquer um
    manda, e confiar nele daria a cada pedido uma identidade nova — um limite
    que não limita nada.
    """
    atras_de_proxy = os.getenv("MEKORA_DOMINIO", "").strip() not in ("", "localhost")
    if atras_de_proxy:
        encaminhado = request.headers.get("x-forwarded-for", "")
        if encaminhado:
            return encaminhado.split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"


def limitar_envios(
    request: Request,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    from app.services import acesso_service

    pessoa = acesso_service.quem_e(db, mekora_sessao)
    # Com conta a contagem é por PESSOA, e não por endereço de rede: trocar de
    # rede não deveria zerar o limite de quem está identificado, nem duas
    # pessoas na mesma rede deveriam dividir o teto uma da outra.
    chave = f"pessoa:{pessoa.id}" if pessoa else f"rede:{_de_onde(request)}"
    teto = COM_CONTA if pessoa else SEM_CONTA

    agora = time.monotonic()
    recentes = [t for t in _envios[chave] if agora - t < JANELA]

    if len(recentes) >= teto:
        _envios[chave] = recentes
        raise HTTPException(
            status_code=429,
            detail=(
                "Muitos arquivos em pouco tempo. Espere um pouco e tente de novo."
                if pessoa
                else "Muitos arquivos em pouco tempo. Entrar na sua conta aumenta esse limite."
            ),
        )

    recentes.append(agora)
    _envios[chave] = recentes
