"""O que a pessoa quis dizer, e não tinha para quem.

POR QUE ISTO EXISTE. Não veio do Figma: não há tela de recado no desenho. Veio
de uma pergunta do Erik — como escutar quem usa — e a resposta é que **medir não
é escutar**. Rastreamento diz onde a pessoa clicou e onde desistiu; ele nunca diz
POR QUÊ, e é o porquê que muda o produto.

O QUE ELE GUARDA, E O QUE NÃO GUARDA
====================================
Guarda o texto, um humor de três degraus, e a rota em que a pessoa estava. A
rota entra porque "não entendi" dito na Mesa e dito na Leitura são dois
problemas diferentes, e perguntar "onde você estava?" num formulário é fazer a
pessoa trabalhar para o Mekora.

NÃO guarda navegador, sistema, tela nem endereço IP. Nada disso responde ao
porquê, e junto vira identificação de quem escreveu — que é o contrário de
deixar alguém falar à vontade.

O `pessoa_id` é OPCIONAL de propósito. Converter não exige conta (DEC-0018), e
quem converteu sem conta é justamente quem mais tem o que dizer sobre a primeira
impressão. O `email` também é opcional, e existe por uma razão só: poder
responder. Está escrito no formulário que é para isso.

O APAGAR LEVA O RECADO JUNTO. `ondelete="CASCADE"`, como todo o resto: a tela de
privacidade promete que apagar a conta apaga tudo, e uma tabela que sobrevive a
isso transforma a promessa em mentira. Recado de quem não tinha conta fica —
não há a quem devolver, e não há a quem ligar.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.database import Base

# Três degraus e não cinco. Uma escala de cinco faz a pessoa calibrar em vez de
# responder, e o meio de uma escala ímpar longa é onde a indecisão se esconde.
HUMORES = ("ruim", "ok", "bom")

# O teto não é técnico: é o ponto em que um campo deixa de ser recado e vira
# lugar de colar um documento inteiro sem querer.
LIMITE_DO_TEXTO = 2000


class Recado(Base):
    __tablename__ = "recados"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(
        Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=True, index=True
    )
    humor = Column(String, nullable=True)
    texto = Column(Text, nullable=False)
    # O caminho, sem parâmetro: `/leitura/:id` e não `/leitura/37`. O número do
    # livro não diz nada sobre o problema e diz o que a pessoa estava lendo.
    onde = Column(String, nullable=True)
    # Só para responder. Vazio é o normal.
    email = Column(String, nullable=True)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
