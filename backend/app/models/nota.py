"""As notas: o que a pessoa marcou e o que escreveu ao lado.

A ÂNCORA
========
Uma nota aponta para um trecho, e o trecho precisa continuar sendo o mesmo
amanhã. Três formas de apontar, e duas delas quebram:

Por página não serve — a página muda quando a fonte muda, e é a mesma razão pela
qual o progresso não a usa.

Por índice de bloco não serve — um parágrafo dividido em dois pela extração move
todos os índices seguintes, e cada nota do capítulo passa a apontar um bloco
adiante.

Por deslocamento de caractere dentro do capítulo é o que sobra, e é o mesmo par
que o progresso e a ênfase do autor já usam. Os três vivem no mesmo sistema de
coordenadas, e a tela não precisa saber de onde cada um veio.

E MESMO ASSIM, O TRECHO É GUARDADO JUNTO
========================================
O deslocamento é estável enquanto a extração for a mesma. Se ela mudar — e ela
vai, porque `texto.js` ainda vai aprender a ler EPUB melhor —, todo deslocamento
antigo passa a apontar alguns caracteres para o lado.

Com o trecho gravado, dá para perceber que a âncora escorregou (o texto naquele
lugar não é mais aquele) e, no mínimo, mostrar à pessoa o que ela marcou. Sem
ele, uma nota deslocada é indistinguível de uma nota certa: ela destaca a
palavra errada com toda a confiança.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.database import Base
from app.models.pessoa import agora

# As quatro do sistema. A lista está aqui e não só na tela porque o servidor
# aceita o que gravar: sem ela, um pedido com `cor: "roxo"` entra no banco e
# aparece na leitura como destaque sem cor nenhuma.
CORES = ("verde", "amarelo", "rosa", "azul")


class Nota(Base):
    __tablename__ = "notas"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("processing_jobs.id", ondelete="CASCADE"), nullable=False, index=True)

    capitulo = Column(Integer, nullable=False, default=0)
    de = Column(Integer, nullable=False)
    ate = Column(Integer, nullable=False)

    cor = Column(String, nullable=False, default="amarelo")

    # O texto marcado, como estava quando foi marcado. Ver a explicação acima:
    # é o que permite descobrir que a âncora escorregou.
    trecho = Column(Text, nullable=False, default="")

    # O que a pessoa escreveu. Vazio é o caso comum — marcar sem comentar é a
    # forma mais frequente de anotar, e exigir texto transformaria um gesto de
    # um clique num formulário.
    comentario = Column(Text, nullable=False, default="")

    criada_em = Column(DateTime, default=agora, nullable=False)
    atualizada_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)
