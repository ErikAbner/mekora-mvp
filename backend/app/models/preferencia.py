"""As preferências de uma pessoa.

CHAVE E VALOR, E NÃO UMA COLUNA POR PREFERÊNCIA
===============================================
São seis hoje e vão ser mais. Uma coluna para cada exigiria uma migração a cada
opção nova — e migração é o custo que faz alguém desistir de acrescentar a
sétima, ou pior, guardá-la em outro lugar improvisado.

O QUE O SERVIDOR NÃO VALIDA, E POR QUÊ
======================================
Ele não confere se o valor está entre as opções conhecidas. Isso contraria o que
vale para as outras entradas — cor de nota e endereço de Kindle são conferidos
aqui, porque validação que só vive na tela é sugestão.

A diferença é o dano. Uma cor inválida vira destaque invisível; um endereço
inválido faz o arquivo sumir sem erro. Uma preferência desconhecida não faz
nada: a tela não a reconhece e usa o padrão. Escrever a lista de opções aqui
criaria uma segunda cópia dela, que ficaria desatualizada na primeira opção nova
— e aí o servidor recusaria uma escolha legítima.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.db.database import Base
from app.models.pessoa import agora


class Preferencia(Base):
    __tablename__ = "preferencias"

    # Uma linha por pessoa e chave. No banco, e não só no código: sem isso, duas
    # abas salvando ao mesmo tempo criam duas linhas para a mesma preferência, e
    # a leitura seguinte pega uma das duas por sorte.
    __table_args__ = (UniqueConstraint("pessoa_id", "chave", name="uq_preferencias_pessoa_id"),)

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)

    chave = Column(String, nullable=False)
    valor = Column(String, nullable=False, default="")

    atualizada_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)
