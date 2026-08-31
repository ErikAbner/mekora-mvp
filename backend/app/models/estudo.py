"""Os Estudos: uma pergunta, e o que você reuniu em volta dela.

O QUE UM ESTUDO É
=================
O protótipo já tinha a forma: um nome, um `sobre` que é o centro, e as notas
reunidas. Os livros não são campo — saem das notas.

O CENTRO PODE SER PERGUNTA OU AFIRMAÇÃO, e isso está no próprio protótipo, com a
razão escrita ao lado da semente: *"o centro deste é uma AFIRMAÇÃO, e é de
propósito: das cinco notas escritas lendo neste material, cinco são afirmações.
Exigir pergunta faria o centro do estudo ser gramaticalmente diferente de tudo o
que mora dentro dele."*

Por isso `sobre` é texto livre e não tem validação de forma.

FECHAR NÃO É ARQUIVAR
=====================
Um estudo fechado continua inteiro e visível — fechar diz que a pergunta foi
respondida, não que ela deixou de interessar. O protótipo tem um caso semente
com exatamente isso: fechado com um dos livros dele ainda em leitura, porque
*"fechar é decisão sua, e continuar lendo não a desfaz"*.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from app.db.database import Base
from app.models.pessoa import agora


class Estudo(Base):
    __tablename__ = "estudos"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)

    nome = Column(String, nullable=False, default="")
    # O centro. Pergunta ou afirmação — ver a explicação no topo.
    sobre = Column(Text, nullable=False, default="")

    fechado = Column(Boolean, nullable=False, default=False)

    criado_em = Column(DateTime, default=agora, nullable=False)
    mexido_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)


class EstudoNota(Base):
    """Uma nota reunida num estudo.

    Tabela própria, e não uma coluna `estudo_id` em `Nota`: a MESMA nota pode
    estar em dois estudos. Uma frase sobre repetição serve tanto ao estudo sobre
    método quanto ao sobre série, e obrigar a escolher faria a pessoa duplicar a
    nota — e aí ela tem duas, que divergem quando uma é editada.
    """

    __tablename__ = "estudo_notas"

    __table_args__ = (UniqueConstraint("estudo_id", "nota_id", name="uq_estudo_notas_estudo_id"),)

    id = Column(Integer, primary_key=True, index=True)
    estudo_id = Column(Integer, ForeignKey("estudos.id", ondelete="CASCADE"), nullable=False, index=True)
    nota_id = Column(Integer, ForeignKey("notas.id", ondelete="CASCADE"), nullable=False, index=True)

    reunida_em = Column(DateTime, default=agora, nullable=False)
