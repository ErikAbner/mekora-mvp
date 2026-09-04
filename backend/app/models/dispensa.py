"""A sugestão que a pessoa recusou.

O `SISTEMA.md` já declarava a relação **dispensada** como forma vigente:

> a pessoa recusou a sugestão, e ela não volta — *"uma sugestão que volta na
> próxima visita deixa de ser sugestão e vira insistência"*

Ela existia para GRUPOS, nos Estudos (`grupos_ignorados`), e não existia no nível
da nota: em `/nota/:id` as candidatas voltavam para sempre, e a única saída era
ligar — que é o oposto do que a pessoa quis dizer.

O PAR É NORMALIZADO
===================
`a_id < b_id`, sempre, como as pontas de uma ligação. Sem isso, dispensar A→B e
depois receber a sugestão B→A traria de volta exatamente o que foi recusado.

DISPENSAR NÃO É PARA SEMPRE À FORÇA
===================================
A linha sai quando a pessoa desfaz — e desfazer é oferecido no mesmo instante, no
aviso. Um gesto silencioso e permanente mataria a sugestão sem que ninguém
soubesse, e um clique errado não teria conserto.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint

from app.db.database import Base
from app.models.pessoa import agora


class SugestaoDispensada(Base):
    __tablename__ = "sugestoes_dispensadas"

    __table_args__ = (
        UniqueConstraint("pessoa_id", "a_id", "b_id", name="uq_sugestoes_dispensadas_par"),
    )

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)

    # As duas pontas, sempre com `a_id < b_id`.
    a_id = Column(Integer, ForeignKey("notas.id", ondelete="CASCADE"), nullable=False)
    b_id = Column(Integer, ForeignKey("notas.id", ondelete="CASCADE"), nullable=False)

    criada_em = Column(DateTime, default=agora, nullable=False)


def par(a: int, b: int) -> tuple:
    """As duas pontas em ordem. Uma função, e não uma convenção lembrada: a
    normalização espalhada por três chamadas é a que erra na quarta."""
    return (a, b) if a < b else (b, a)
