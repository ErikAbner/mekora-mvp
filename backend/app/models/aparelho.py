"""Os Kindles de uma pessoa.

POR QUE ISTO PRECISA EXISTIR
============================
O endereço de destino era `KINDLE_EMAIL`, uma variável do `.env` — portanto UM
endereço para a instalação inteira. Na máquina de quem desenvolve isso funciona,
porque a instalação e a pessoa são a mesma. Servido na internet, deixa de
funcionar de um jeito específico: não existe "o Kindle dela", existe o Kindle do
servidor, e todo envio de todo mundo vai para lá.

É a mesma classe do endereço de arquivo adivinhável que a DEC-0039 §5 fechou —
dado de uma pessoa alcançável por outra —, só que aqui o dado sai do produto e
chega no aparelho de alguém.

O REMETENTE PRECISA ESTAR AUTORIZADO NA AMAZON
==============================================
Isto não é detalhe de implementação, é a condição para o recurso funcionar: a
Amazon só aceita um documento se ele vier de um endereço que a própria pessoa
cadastrou na lista de remetentes aprovados dela. O Mekora não tem como fazer
isso por ninguém.

Por isso `autorizado_em` existe: não como permissão que o produto concede, mas
como a data em que a PESSOA disse ter feito a parte dela. Sem esse registro, o
primeiro envio falha com uma mensagem da Amazon e ninguém sabe o que fazer.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.db.database import Base
from app.models.pessoa import agora


class Aparelho(Base):
    __tablename__ = "aparelhos"

    # Um endereço por pessoa. A restrição está no banco: sem ela, dois cliques
    # seguidos no botão criam dois aparelhos iguais, e "tornar principal"
    # escolhe um dos dois por sorte.
    __table_args__ = (UniqueConstraint("pessoa_id", "endereco", name="uq_aparelhos_pessoa_id"),)

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)

    nome = Column(String, nullable=False, default="")
    endereco = Column(String, nullable=False)

    # Para onde vai o envio quando ninguém escolheu outro. Guardado como
    # bandeira e não como "o primeiro da lista": a ordem muda ao apagar um
    # aparelho, e o destino não pode mudar junto sem alguém ter pedido.
    # QUAL KINDLE É ESTE. O Erik decidiu em 02/09/2026 que o produto pergunta.
    #
    # A Amazon não conta o modelo, e não há como descobrir pelo endereço de
    # e-mail. Quem sabe é a pessoa — e saber muda o que o preparo faz: até aqui
    # quadrinho saía no perfil da INSTALAÇÃO, um valor só para todo mundo, e
    # quem tem um Oasis recebia páginas montadas para um Paperwhite.
    #
    # Nulo é sempre uma resposta válida — "não sei", "outro", ou um modelo que a
    # lista ainda não conhece —, e nesse caso tudo segue como sempre foi. A
    # lista de modelos vive em `services/kindles.py`, fora do banco: ela
    # envelhece, e envelhecer numa coluna é bem pior.
    modelo = Column(String)

    principal = Column(Boolean, nullable=False, default=False)

    autorizado_em = Column(DateTime)
    ultimo_envio = Column(DateTime)
    criado_em = Column(DateTime, default=agora, nullable=False)
