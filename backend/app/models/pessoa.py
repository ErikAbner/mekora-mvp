"""Quem entra no Mekora, e como o acesso é guardado.

Três tabelas, e a divisão entre elas é o desenho:

`Pessoa` é a identidade — um e-mail, e nada além disso. Não há senha para
guardar, então não há hash de senha para escolher, força mínima para exigir, nem
vazamento para temer. A DEC-0039 §1 escolheu link no e-mail justamente porque
essa ausência é a maior parte do ganho.

`Chave` é o link enviado: vale 15 minutos, serve uma vez, e some.

`Sessao` é o que sustenta a pessoa logada depois disso.

O QUE FICA GRAVADO É O RESUMO, NUNCA O VALOR
============================================
Nem a chave nem a sessão guardam o token que o navegador tem. Guardam o `sha256`
dele. A diferença aparece no dia ruim: um banco que vaze não entrega nenhum link
utilizável nem nenhuma sessão sequestrável — entrega resumos, dos quais não se
volta.

É o mesmo raciocínio de senha, aplicado a algo que também é credencial. Um token
de sessão em texto puro no banco é uma senha em texto puro no banco.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.database import Base

# Quinze minutos, e a escolha é sobre onde o link vive depois de enviado: caixa
# de entrada, histórico de e-mail, às vezes encaminhado. Ele precisa deixar de
# valer muito antes de deixar de existir.
VALIDADE_DA_CHAVE = timedelta(minutes=15)

# Trinta dias sem precisar pedir outro link. Mais que isso transforma o cookie
# numa credencial permanente; menos, e o produto vira um pedinte de e-mail.
VALIDADE_DA_SESSAO = timedelta(days=30)


def agora() -> datetime:
    """UTC, sem fuso anexado — e a ausência é imposta pelo banco, não escolhida.

    A primeira versão devolvia `datetime.now(timezone.utc)`, com fuso, pelo
    motivo certo: um horário sem fuso parece local e não é. Só que O SQLITE NÃO
    GUARDA FUSO. O valor entra consciente e volta ingênuo, e a comparação
    seguinte — `expira_em > agora()` — estoura com "can't compare offset-naive
    and offset-aware datetimes", na primeira validação de link.

    Um valor que sai diferente de como entrou é pior que um valor sem fuso desde
    o começo: o segundo é uma convenção, o primeiro é uma surpresa.

    A convenção, então: TUDO AQUI É UTC. Nada de `datetime.now()` sem argumento,
    que devolve o horário da máquina — e a máquina do servidor não está no mesmo
    fuso de quem lê.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Pessoa(Base):
    __tablename__ = "pessoas"

    id = Column(Integer, primary_key=True, index=True)
    # Guardado em minúsculas e sem espaço nas pontas. Sem isso, `Erik@x.com` e
    # `erik@x.com` viram duas contas com duas estantes, e a pessoa perde a dela
    # por causa da tecla shift.
    email = Column(String, unique=True, nullable=False, index=True)

    # COMO A PESSOA QUER SER CHAMADA, e ela escolhe.
    #
    # A trilha da conta já mostrava um nome, e ele era INVENTADO: `App.jsx` fazia
    # `email.split("@")[0]`, então `erik@mekora.local` virava "erik". Enquanto
    # isso a tela de privacidade afirmava "não há nome, telefone nem foto" — uma
    # das duas mentia, e era a primeira.
    #
    # Nulo é o estado normal, e não um defeito: converter não exige conta
    # (DEC-0018), e entrar não pede nome nenhum. Quem não escreveu é chamado
    # pelo e-mail, que é o que o produto realmente sabe.
    nome = Column(String)

    # O RETRATO, guardado como CAMINHO e servido por rota com sessão.
    #
    # Não há URL adivinhável: o arquivo sai por `GET /eu/retrato`, que exige o
    # biscoito. As capas dos livros usam token público porque um trabalho sem
    # dono precisa ser alcançável sem conta; um retrato nunca precisa.
    #
    # O que entra aqui é sempre reescrito pelo servidor — PNG quadrado, lado
    # fixo —, e não os bytes que chegaram. Guardar o arquivo original seria
    # guardar metadado de câmera, GPS e o que mais o EXIF trouxer.
    retrato = Column(String)

    criada_em = Column(DateTime(timezone=True), default=agora, nullable=False)
    ultimo_acesso = Column(DateTime(timezone=True))

    chaves = relationship("Chave", back_populates="pessoa", cascade="all, delete-orphan")
    sessoes = relationship("Sessao", back_populates="pessoa", cascade="all, delete-orphan")


class Chave(Base):
    """O link do e-mail. Nasce, serve uma vez, e morre."""

    __tablename__ = "chaves"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)
    resumo = Column(String, unique=True, nullable=False, index=True)
    criada_em = Column(DateTime(timezone=True), default=agora, nullable=False)
    expira_em = Column(DateTime(timezone=True), nullable=False)
    # Marcar em vez de apagar: uma chave usada que ainda existe permite dizer
    # "este link já foi usado", que é uma resposta útil. Apagada, ela vira
    # "link inválido" — e a pessoa não sabe se errou o link ou se já entrou.
    usada_em = Column(DateTime(timezone=True))

    pessoa = relationship("Pessoa", back_populates="chaves")

    @property
    def vale(self) -> bool:
        return self.usada_em is None and self.expira_em > agora()


class Sessao(Base):
    """A pessoa logada. Uma linha por navegador."""

    __tablename__ = "sessoes"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)
    resumo = Column(String, unique=True, nullable=False, index=True)
    criada_em = Column(DateTime(timezone=True), default=agora, nullable=False)
    expira_em = Column(DateTime(timezone=True), nullable=False)
    ultimo_uso = Column(DateTime(timezone=True))
    encerrada = Column(Boolean, default=False, nullable=False)

    pessoa = relationship("Pessoa", back_populates="sessoes")

    @property
    def vale(self) -> bool:
        return not self.encerrada and self.expira_em > agora()
