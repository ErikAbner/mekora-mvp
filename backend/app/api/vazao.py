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

# QUANTOS LINKS DE ENTRADA UMA ORIGEM PEDE POR HORA.
#
# O `acesso_service` já contava cinco por dez minutos, mas contava POR E-MAIL
# PEDIDO — e o número de e-mails distintos não tem teto. O limite real de quem
# chamava a rota era, portanto, cinco mensagens *por endereço que ele
# escolhesse*, sem conta e sem nada. Duas consequências, e a primeira é a que
# não se desfaz: a conta SMTP do Mekora vira máquina de mandar e-mail para
# terceiros, e a reputação de remetente do domínio é gasta por um estranho.
#
# Vinte por hora é folgado para o uso real — uma pessoa pede um link, erra o
# endereço, pede outro; uma casa ou um escritório dividem uma saída — e fecha o
# uso que não é de ninguém.
#
# ISTO SÓ VALE DEPOIS DE `_de_onde` SER CONFIÁVEL. Enquanto ela lia o primeiro
# elemento do `X-Forwarded-For`, um teto por origem era teatro: a origem era
# escolhida por quem estava sendo contado. Por isso a correção veio depois da
# do cabeçalho, e não antes.
LINKS_POR_ORIGEM = 20

_envios: dict = defaultdict(list)
_links: dict = defaultdict(list)


def _de_onde(request: Request) -> str:
    """Quem está pedindo, para efeito de contagem.

    Atrás do Caddy, `request.client.host` é o próprio Caddy — todos os
    visitantes viram um só, e o limite de dez valeria para o mundo inteiro
    junto. `X-Forwarded-For` traz o visitante.

    Ele SÓ é lido quando há domínio configurado, isto é, quando o Mekora está
    atrás da borda que o escreve. Fora disso o cabeçalho é texto que qualquer um
    manda, e confiar nele daria a cada pedido uma identidade nova — um limite
    que não limita nada.

    O ÚLTIMO ELEMENTO, E NÃO O PRIMEIRO — e a troca é o conserto de 03/09.
    ====================================================================
    `X-Forwarded-For` é uma lista que CRESCE pela direita: cada proxy acrescenta
    o endereço de quem falou com ele. O primeiro elemento é, portanto, o mais
    antigo — e num pedido que chega da internet, o mais antigo é o que o próprio
    visitante escreveu antes de sair de casa. O último é o que o proxy imediato
    acrescentou, e esse ninguém de fora consegue forjar.

    Ler o primeiro deixava a chave de contagem na mão de quem estava sendo
    contado. Medido em 03/09, contra este mesmo código: mandando
    `X-Forwarded-For: 198.51.100.<n>, 203.0.113.9` e girando o `<n>`, doze
    envios seguidos passaram, todos 201 — o teto de dez simplesmente não
    existia. Com o cabeçalho fixo, o 429 aparecia no 11º, como deve.

    A borda foi corrigida junto: o `Caddyfile` agora manda
    `header_up X-Forwarded-For {remote_host}`, que SOBRESCREVE a lista inteira
    em vez de acrescentar a ela. As duas metades se seguram sozinhas de
    propósito — uma borda trocada um dia não pode reabrir o buraco calada, e um
    backend posto atrás de outro proxy também não.

    O teste é `tests/test_vazao_cabecalho.py`, e ele reproduz as três rodadas da
    medição.
    """
    atras_de_proxy = os.getenv("MEKORA_DOMINIO", "").strip() not in ("", "localhost")
    if atras_de_proxy:
        encaminhado = request.headers.get("x-forwarded-for", "")
        partes = [p.strip() for p in encaminhado.split(",") if p.strip()]
        if partes:
            return partes[-1]
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


def limitar_links(request: Request) -> None:
    """Quantos links de entrada uma ORIGEM pede por hora.

    A CONTAGEM É DE QUEM PEDE, E NÃO DO QUE FOI PEDIDO — e essa é a diferença
    inteira. O `acesso_service.pedir_link` conta chaves recentes da PESSOA, o
    que impede insistir no mesmo endereço e não impede nada além disso: trocar o
    endereço zerava a conta.

    Aqui não há sessão a consultar: quem pede um link de entrada é, por
    definição, alguém que ainda não entrou. A única identidade disponível é a
    origem da conexão, e ela agora vale alguma coisa — desde a correção do
    `_de_onde` logo acima, o `X-Forwarded-For` é escrito pela borda e não pelo
    visitante.

    O 429 NÃO ESTRAGA O SIGILO DA ROTA. `/entrar/pedir` responde 204 sempre, de
    propósito: uma resposta que variasse conforme o e-mail já tem conta deixaria
    qualquer um descobrir quem usa o Mekora, um endereço por vez. Este 429 não
    fala do endereço pedido — fala do volume de quem está pedindo, que é um fato
    sobre o próprio requisitante. Ele não distingue endereço nenhum de outro.
    """
    chave = f"link:{_de_onde(request)}"
    agora = time.monotonic()
    recentes = [t for t in _links[chave] if agora - t < JANELA]

    if len(recentes) >= LINKS_POR_ORIGEM:
        _links[chave] = recentes
        raise HTTPException(
            status_code=429,
            detail="Muitos pedidos de link daqui. Espere um pouco e tente de novo.",
        )

    recentes.append(agora)
    _links[chave] = recentes
