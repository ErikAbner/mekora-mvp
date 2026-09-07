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

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint

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

    # Quantos capítulos o livro tem, gravado por quem ABRE o livro.
    #
    # O servidor não sabe: o EPUB é lido no navegador, e é lá que a espinha do
    # arquivo é contada. Sem este número, a estante não tem como dizer onde a
    # leitura está — e a alternativa era inventar uma porcentagem, que foi
    # exatamente o que a ficha vinha fazendo com "80% lido" em todo livro.
    #
    # Zero significa "ninguém abriu ainda", e a tela trata isso como não
    # começado em vez de como zero por cento.
    capitulos = Column(Integer, nullable=False, default=0)
    # QUANTO DO LIVRO JA FOI LIDO, de 0 a 1.
    #
    # Calculada NO CLIENTE, e nao aqui, porque so ele conhece a extensao: o EPUB
    # e aberto no navegador, e o servidor nunca ve o tamanho de cada capitulo. O
    # servidor guarda e devolve — nao deriva.
    #
    # Nulo quando o livro foi aberto por uma versao que ainda nao calculava, e a
    # ficha entao cai no "capitulo N de M" de antes. Nulo NAO e zero: zero
    # afirma que a leitura esta no comeco.
    fracao = Column(Float)

    # O ESTADO DE LEITURA, e ele NÃO É O PROGRESSO.
    #
    # "Terminei este livro" é uma declaração da pessoa. "Parei no capítulo 7,
    # caractere 2.140" é um fato medido pelo leitor. Até 07/09 o produto tinha
    # só o segundo, e o quadro de Estudos escrevia posição de leitura para
    # representar declaração — apagando em silêncio onde a pessoa estava.
    #
    # NULO É O NORMAL, e quer dizer "ninguém declarou": aí o estado é derivado
    # da fração, como sempre foi. Preenchido quer dizer que a pessoa disse, e a
    # declaração vence. Uma fonte com padrão derivado, e a precedência escrita
    # num lugar só — `estadoDeLeitura`, no contrato.
    #
    # Três valores, os que o Erik nomeou: "to_read", "reading", "read".
    estado_leitura = Column(String(16))

    atualizado_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)
