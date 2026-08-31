"""O Canvas: notas postas no espaço, e as ligações entre elas.

O QUE O CANVAS É, PELA DEC-0030
===============================
    Canvas organiza. Conexões descobre.

Ele é a superfície onde a pessoa arruma o que leu, deliberadamente. Não é
gerenciador de biblioteca, não é descoberta automática, e não cria "nota de
Canvas": as entidades são as mesmas do resto do Mekora.

DUAS TABELAS, E A RAZÃO DA PRIMEIRA
===================================
`NoCanvas` é a nota NA SUPERFÍCIE — a posição dela, e nada mais. Guardar `x` e
`y` dentro de `Nota` seria mais simples e erraria o item 5 do contrato: *remover
da superfície sem apagar a entidade*. Com a posição na própria nota, tirar do
Canvas exigiria apagar coordenadas e ainda deixaria a pergunta "esta nota está
no Canvas?" sem resposta — `x = 0` é uma posição legítima.

Assim, tirar do Canvas é apagar UMA LINHA de `NoCanvas`. A nota continua na
estante, no livro, no caderno.

`Ligacao` é a relação entre duas notas. O contrato pede que ela seja a MESMA
usada em Conexões, que ainda não existe — então ela nasce sem nada de Canvas no
nome nem no formato: duas notas e como a relação foi feita.
"""

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint

from app.db.database import Base
from app.models.pessoa import agora


class NoCanvas(Base):
    __tablename__ = "canvas_nos"

    # Uma nota aparece uma vez só na superfície. No banco, e não só no código:
    # sem isso, dois cliques em "trazer" criam dois nós da mesma nota, e mover
    # um deixa o outro para trás — dois retângulos com o mesmo texto.
    __table_args__ = (UniqueConstraint("pessoa_id", "nota_id", name="uq_canvas_nos_pessoa_id"),)

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)
    nota_id = Column(Integer, ForeignKey("notas.id", ondelete="CASCADE"), nullable=False, index=True)

    # Coordenadas em ponto flutuante, e não inteiro: o arrasto produz frações, e
    # arredondar a cada movimento faz a nota andar aos saltos.
    x = Column(Float, nullable=False, default=0)
    y = Column(Float, nullable=False, default=0)

    movido_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)


class Ligacao(Base):
    """Uma relação entre duas notas.

    Sem "canvas" no nome de propósito: o item 8 da DEC-0030 pede que o Canvas
    reutilize a MESMA relação que Notas e Conexões usam. Batizá-la de
    `LigacaoDeCanvas` criaria a ontologia paralela que o item 7 proíbe.
    """

    __tablename__ = "ligacoes"

    # A mesma dupla não se liga duas vezes. A ordem importa para a restrição,
    # mas não para o sentido: a ligação é MÚTUA — ver `normalizar` na API, que
    # guarda sempre o menor id primeiro para que A→B e B→A sejam a mesma linha.
    __table_args__ = (UniqueConstraint("pessoa_id", "de_id", "para_id", name="uq_ligacoes_pessoa_id"),)

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)

    de_id = Column(Integer, ForeignKey("notas.id", ondelete="CASCADE"), nullable=False, index=True)
    para_id = Column(Integer, ForeignKey("notas.id", ondelete="CASCADE"), nullable=False, index=True)

    # `mao` quando a pessoa ligou; deixa espaço para `sugerida` quando Conexões
    # existir. Guardado porque a tela precisa distinguir: uma ligação sugerida
    # que se pareça com uma feita à mão apresenta palpite como fato — que é o
    # que o CLAUDE.md chama de "tratar sugestão como fato".
    como = Column(String, nullable=False, default="mao")

    criada_em = Column(DateTime, default=agora, nullable=False)
