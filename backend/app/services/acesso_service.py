"""Entrar no Mekora: gerar o link, enviá-lo, conferir quem voltou.

As decisões que importam estão aqui, e cada uma tem um modo de falhar que só
aparece depois de estar no ar.
"""

from __future__ import annotations

import hashlib
import os
import re
import secrets
import smtplib
from datetime import timedelta
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.pessoa import (
    VALIDADE_DA_CHAVE,
    VALIDADE_DA_SESSAO,
    Chave,
    Pessoa,
    Sessao,
    agora,
)

# `token_urlsafe(32)` são 256 bits de aleatoriedade do sistema operacional, não
# do gerador de números do Python. `random` é previsível por desenho — quem vê
# saídas suficientes prevê as próximas —, e para credencial isso é o bastante
# para ser arrombado.
TAMANHO_DO_TOKEN = 32

# E-mail é validado de leve de propósito. A regra completa da especificação
# rejeita endereços válidos que existem de verdade, e aqui não há nada a ganhar
# com isso: o endereço se prova sozinho, recebendo o link ou não recebendo.
FORMA_DE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Quantos links a mesma pessoa pode pedir em dez minutos. Sem limite, um campo
# de e-mail aberto na internet vira uma máquina de enviar mensagem para o
# endereço de quem alguém quiser incomodar — e o remetente é o Mekora.
PEDIDOS_POR_JANELA = 5
JANELA_DE_PEDIDOS = timedelta(minutes=10)


def resumir(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def normalizar(email: str) -> str:
    return email.strip().lower()


def email_parece_valido(email: str) -> bool:
    return bool(FORMA_DE_EMAIL.match(normalizar(email)))


def _pessoa(db: Session, email: str) -> Pessoa:
    email = normalizar(email)
    pessoa = db.query(Pessoa).filter(Pessoa.email == email).first()
    if pessoa is None:
        pessoa = Pessoa(email=email)
        db.add(pessoa)
        db.flush()
    return pessoa


def pedir_link(db: Session, email: str, base_url: str) -> tuple[str, str] | None:
    """Cria a chave e devolve `(token, email)`. `None` se passou do limite.

    O token é devolvido em vez de enviado aqui porque enviar e-mail é lento e
    falha, e quem chama precisa poder decidir o que fazer com isso. O valor em
    claro existe só nesta volta: o que fica no banco é o resumo.
    """
    pessoa = _pessoa(db, email)

    recentes = (
        db.query(Chave)
        .filter(Chave.pessoa_id == pessoa.id, Chave.criada_em > agora() - JANELA_DE_PEDIDOS)
        .count()
    )
    if recentes >= PEDIDOS_POR_JANELA:
        return None

    token = secrets.token_urlsafe(TAMANHO_DO_TOKEN)
    db.add(
        Chave(
            pessoa_id=pessoa.id,
            resumo=resumir(token),
            expira_em=agora() + VALIDADE_DA_CHAVE,
        )
    )
    db.commit()
    return token, pessoa.email


def _em_producao() -> bool:
    dominio = os.getenv("MEKORA_DOMINIO", "").strip()
    return bool(dominio) and dominio != "localhost"


def enviar_link(email: str, token: str, base_url: str) -> None:
    """Manda o link. Reusa o mesmo SMTP que já leva os documentos ao Kindle."""
    faltando = [
        n for n, v in {
            "SMTP_HOST": settings.smtp_host,
            "SMTP_USER": settings.smtp_user,
            "SMTP_PASS": settings.smtp_pass,
        }.items() if not v
    ]
    link = f"{base_url.rstrip('/')}/entrar/{token}"

    if faltando:
        # SEM SMTP EM PRODUÇÃO, NINGUÉM ENTRA — e isso precisa ser barulhento,
        # porque é uma configuração faltando e não um caso de uso.
        if _em_producao():
            raise RuntimeError("Configuração SMTP incompleta: " + ", ".join(faltando))

        # Fora de produção, o link vai para o terminal do servidor. Sem isto,
        # desenvolver o produto exigiria um servidor de e-mail configurado só
        # para conseguir passar da primeira tela — e a saída fácil seria abrir
        # um buraco permanente, do tipo "modo de teste que entra sem link".
        print(
            "\n" + "=" * 70
            + f"\nSEM SMTP CONFIGURADO — o link de {email} vai aqui, e não por e-mail:"
            + f"\n\n    {link}\n\n"
            + "Isto só acontece fora de produção. Com MEKORA_DOMINIO definido,\n"
            + "a falta de SMTP vira erro, porque ali ela impede qualquer um de entrar.\n"
            + "=" * 70 + "\n",
            flush=True,
        )
        return
    msg = EmailMessage()
    msg["Subject"] = "Entrar no Mekora"
    msg["From"] = settings.smtp_user
    msg["To"] = email
    # Texto puro, e não é economia de esforço: uma mensagem de entrar em HTML,
    # com botão e imagem, é indistinguível de uma tentativa de golpe. A que
    # parece uma nota escrita à mão é mais fácil de confiar e mais difícil de
    # imitar de forma convincente.
    msg.set_content(
        "Para entrar no Mekora, abra este link:\n\n"
        f"{link}\n\n"
        "Ele vale por 15 minutos e por uma vez só.\n\n"
        "Se não foi você que pediu, não precisa fazer nada: sem abrir o link, "
        "nada acontece.\n"
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_pass)
        smtp.send_message(msg)


def usar_link(db: Session, token: str) -> str | None:
    """Troca a chave por uma sessão. Devolve o token da sessão, ou `None`.

    A chave é marcada como usada ANTES de a sessão existir. Se algo falhar
    depois disso, o pior caso é a pessoa pedir outro link — contra o pior caso
    da ordem inversa, que é um link continuar valendo depois de ter servido.
    """
    chave = db.query(Chave).filter(Chave.resumo == resumir(token)).first()
    if chave is None or not chave.vale:
        return None

    chave.usada_em = agora()

    token_de_sessao = secrets.token_urlsafe(TAMANHO_DO_TOKEN)
    sessao = Sessao(
        pessoa_id=chave.pessoa_id,
        resumo=resumir(token_de_sessao),
        expira_em=agora() + VALIDADE_DA_SESSAO,
        ultimo_uso=agora(),
    )
    db.add(sessao)

    chave.pessoa.ultimo_acesso = agora()
    db.commit()
    return token_de_sessao


def quem_e(db: Session, token: str | None) -> Pessoa | None:
    if not token:
        return None
    sessao = db.query(Sessao).filter(Sessao.resumo == resumir(token)).first()
    if sessao is None or not sessao.vale:
        return None
    sessao.ultimo_uso = agora()
    db.commit()
    return sessao.pessoa


def sair(db: Session, token: str | None) -> None:
    if not token:
        return
    sessao = db.query(Sessao).filter(Sessao.resumo == resumir(token)).first()
    if sessao is not None:
        sessao.encerrada = True
        db.commit()


def limpar_vencidas(db: Session) -> int:
    """Apaga chaves usadas ou vencidas. Elas não servem para nada e crescem para
    sempre — e uma tabela que só cresce é um problema que chega calado."""
    n = db.query(Chave).filter(Chave.expira_em < agora()).delete(synchronize_session=False)
    db.commit()
    return n
