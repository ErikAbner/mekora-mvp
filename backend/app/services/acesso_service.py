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


def _em_producao() -> bool:
    dominio = os.getenv("MEKORA_DOMINIO", "").strip()
    return bool(dominio) and dominio != "localhost"


def convidados() -> frozenset[str]:
    """Quem pode pedir um link, lido da configuração a cada chamada.

    LIDO NA HORA, e não no import. Constante de módulo avaliada no import é
    intestável por construção — quando o primeiro teste importa isto, o valor já
    está congelado, e nenhum `monkeypatch` depois disso alcança mais nada. Foi
    exatamente o defeito do `EM_PRODUCAO` do `api/acesso.py`, corrigido em 03/09
    pela mesma razão.

    QUEM LIGA O CONVITE É `CONVIDADOS`, E SÓ ELE. Vazio quer dizer "não
    configurado", e devolve o conjunto vazio — que `foi_convidado` lê como
    ausência de lista, e não como lista de ninguém.

    O DONO ENTRA POR DEFINIÇÃO, mas não LIGA o convite. `DONO_EMAIL` é quem
    manda na instalação, e uma lista de convite escrita sem ele trancaria o dono
    do lado de fora da própria máquina — não há como consertar de dentro. Somá-lo
    aqui e ali era o mesmo erro em dois passos: com `DONO_EMAIL` preenchido e
    `CONVIDADOS` vazio, a lista virava `{dono}` e a instalação fechava para todo
    mundo sem ninguém ter pedido isso. Medido: quatorze casos da suíte
    vermelhos, todos em `test_acesso.py`, todos dizendo "o link não chegou".
    """
    escritos = settings.convidados.strip()
    if not escritos:
        return frozenset()
    return frozenset(
        normalizar(p) for p in f"{escritos},{settings.dono_email}".split(",") if p.strip()
    )


def foi_convidado(email: str) -> bool:
    """O lançamento é por convite, e a falta de lista fecha em produção.

    Vazio fora de produção é ABERTO: a máquina de quem desenvolve não tem
    convite nenhum, e a entrada precisa funcionar ali. Vazio em produção é
    FECHADO, porque o contrário é "esqueci de configurar, então está aberto" —
    a mesma regra que o `DONO_EMAIL` já segue.

    QUEM CHAMA NÃO PODE CONTAR A DIFERENÇA. Esta função responde a uma pergunta
    interna; a rota devolve 204 dos dois jeitos, no mesmo tempo. Uma resposta
    que variasse aqui viraria um oráculo de quem foi convidado — e a lista de
    convidados de um produto de leitura é, ela mesma, informação sobre pessoas.
    """
    lista = convidados()
    if not lista:
        return not _em_producao()
    return normalizar(email) in lista


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

    `None` COBRE DOIS CASOS DE PROPÓSITO: quem não foi convidado e quem passou
    do teto. Quem chama não distingue um do outro, e por isso não pode contar a
    diferença adiante.
    """
    if not foi_convidado(email):
        # ANTES DE `_pessoa`, e é isso que fecha o achado 2. A linha em
        # `pessoas` nascia no PEDIR, sem prova de que o endereço existe ou de
        # que alguém o queria: a tabela crescia com endereços de terceiros
        # escolhidos por um estranho. Sem convite, nada é escrito.
        return None

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


def sessoes_de(db: Session, token: str | None) -> list[dict]:
    """Os navegadores em que esta pessoa entrou, e qual deles é este.

    A LINHA NÃO CARREGA O TOKEN, e não pode. O que existe no banco é o resumo
    sha256, e devolvê-lo daria a quem lesse a resposta a metade que falta para
    reconhecer uma sessão. O `este` é calculado aqui, comparando resumo com
    resumo, e o que sai é um booleano.
    """
    pessoa = quem_e(db, token)
    if pessoa is None:
        return []
    daqui = resumir(token) if token else None
    linhas = (
        db.query(Sessao)
        .filter(Sessao.pessoa_id == pessoa.id, Sessao.encerrada.is_(False))
        .order_by(Sessao.ultimo_uso.desc().nullslast(), Sessao.criada_em.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "este": s.resumo == daqui,
            "criada_em": s.criada_em,
            "ultimo_uso": s.ultimo_uso,
            "expira_em": s.expira_em,
        }
        for s in linhas
        if s.vale
    ]


def encerrar_sessao(db: Session, token: str | None, sessao_id: int) -> bool:
    """Encerra UMA sessão desta pessoa. Devolve se encerrou.

    O filtro por `pessoa_id` não é zelo: sem ele, um id em sequência deixaria
    qualquer pessoa logada derrubar a sessão de qualquer outra.
    """
    pessoa = quem_e(db, token)
    if pessoa is None:
        return False
    sessao = (
        db.query(Sessao)
        .filter(Sessao.id == sessao_id, Sessao.pessoa_id == pessoa.id)
        .first()
    )
    if sessao is None:
        return False
    sessao.encerrada = True
    db.commit()
    return True


def encerrar_as_outras(db: Session, token: str | None) -> int:
    """Sai de todos os outros navegadores, e mantém este.

    É a ação que a pessoa quer quando desconfia de alguma coisa, e ela precisa
    NÃO derrubar quem a está executando — senão o remédio pede o link de novo,
    e a pessoa fica de fora junto com quem ela queria tirar.
    """
    pessoa = quem_e(db, token)
    if pessoa is None:
        return 0
    daqui = resumir(token) if token else None
    outras = (
        db.query(Sessao)
        .filter(
            Sessao.pessoa_id == pessoa.id,
            Sessao.encerrada.is_(False),
            Sessao.resumo != daqui,
        )
        .all()
    )
    for s in outras:
        s.encerrada = True
    db.commit()
    return len(outras)


def limpar_vencidas(db: Session) -> int:
    """Apaga chaves usadas ou vencidas. Elas não servem para nada e crescem para
    sempre — e uma tabela que só cresce é um problema que chega calado."""
    n = db.query(Chave).filter(Chave.expira_em < agora()).delete(synchronize_session=False)
    db.commit()
    return n
