"""O grupo de notas que a pessoa mandou parar de sugerir.

POR QUE ISTO EXISTE. O nó `895:8849` põe um "Ignorar" ao lado de cada fio que o
Mekora encontra, e ele ficou de fora de propósito: **ignorar precisa ser
lembrado**, e não havia onde. Um botão que esquece ao recarregar é pior que botão
nenhum — ele ensina que o produto não escuta.

O QUE IDENTIFICA UM GRUPO NÃO É UM `id`. Os grupos não existem como registro:
eles nascem de uma varredura do acervo, e a mesma varredura amanhã pode devolver
outros. O que dá para guardar é O CONJUNTO DE NOTAS que formava o grupo — e é
isso que a `assinatura` é: os ids das notas, ordenados, colados.

A consequência é a certa, e ela foi escolhida: **um grupo ignorado que ganha uma
nota nova volta a aparecer**. A assinatura muda, e o Mekora tem uma coisa nova a
dizer sobre aquele assunto. Ignorar não é "nunca mais me fale disso"; é "com
estas notas, já entendi".
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.db.database import Base


def agora() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class GrupoIgnorado(Base):
    __tablename__ = "grupos_ignorados"
    __table_args__ = (
        # A MESMA PESSOA NÃO IGNORA O MESMO GRUPO DUAS VEZES. Sem isto, dois
        # cliques rápidos escrevem duas linhas e a lista cresce por acidente.
        UniqueConstraint("pessoa_id", "assinatura", name="uq_grupo_ignorado"),
    )

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(
        Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Os ids das notas do grupo, ordenados e separados por vírgula. Ordenados
    # porque a ordem em que a varredura devolve não é estável, e sem ordenar o
    # mesmo grupo teria duas assinaturas.
    assinatura = Column(String, nullable=False, index=True)
    criado_em = Column(DateTime, default=agora, nullable=False)
