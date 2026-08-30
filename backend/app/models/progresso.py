"""Onde a pessoa parou de ler.

O QUE SE GUARDA, E O QUE NÃO SE GUARDA
======================================
Não se guarda a página. O `CLAUDE.md` deste repositório já tinha decidido isso, e
a razão é mecânica: a página muda quando a fonte muda. Alguém aumenta o corpo do
texto, ou vira o telefone, e a página 40 passa a ser outro trecho — então voltar
para "a página 40" devolve a pessoa a um lugar que ela não deixou.

O que se guarda é o CAPÍTULO e o DESLOCAMENTO dentro dele: o mesmo par que o
destaque já usa. Ele sobrevive a mudança de corpo, de largura e de aparelho,
porque descreve o texto e não a apresentação dele.

POR QUE NO SERVIDOR
===================
Progresso é o dado mais básico de um ambiente de leitura, e no navegador ele
morre de duas formas comuns: limpar os dados do site, e trocar de aparelho —
justamente quando a pessoa mais precisa dele, ao voltar no telefone o que
começou no computador.

Sem conta não há progresso salvo, e isso é coerente com a DEC-0018: a estante é a
conta. Quem lê sem entrar continua lendo; só não encontra a marca depois.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint

from app.db.database import Base
from app.models.pessoa import agora


class Progresso(Base):
    __tablename__ = "progressos"

    # Uma linha por pessoa e livro. A restrição está no BANCO e não só no
    # código: sem ela, duas abas salvando ao mesmo tempo criam duas marcas para
    # o mesmo livro, e a leitura seguinte pega uma das duas por sorte.
    __table_args__ = (UniqueConstraint("pessoa_id", "job_id", name="uq_progressos_pessoa_id"),)

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("processing_jobs.id", ondelete="CASCADE"), nullable=False, index=True)

    capitulo = Column(Integer, nullable=False, default=0)
    # Deslocamento em caracteres desde o início do capítulo — a mesma unidade do
    # destaque. Guardar o índice do bloco seria mais simples e quebraria no dia
    # em que a extração mudasse: um parágrafo dividido em dois move todos os
    # índices seguintes, e o de caracteres não se move.
    deslocamento = Column(Integer, nullable=False, default=0)

    atualizado_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)
