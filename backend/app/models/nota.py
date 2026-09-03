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

    # NULO QUANDO A NOTA NÃO VEIO DE UM LIVRO DAQUI.
    #
    # As notas do `My Clippings.txt` são de livros lidos no Kindle, e a maioria
    # nunca passou pelo Mekora. Exigir `job_id` obrigaria a inventar um trabalho
    # falso para cada livro importado — um registro de conversão que nunca
    # aconteceu, poluindo a Mesa e a estante com coisas que não são arquivos.
    job_id = Column(Integer, ForeignKey("processing_jobs.id", ondelete="CASCADE"), index=True)

    # De onde a nota veio, quando não é de um trabalho. Para a nota importada é
    # o título que o Kindle escreveu; para a nota feita lendo aqui, fica vazio
    # porque o trabalho já diz.
    origem = Column(String, nullable=False, default="")

    # `leitura` (feita aqui, marcando um trecho), `kindle` (importada do
    # My Clippings) ou `solta` (escrita direto no Canvas, sem livro).
    #
    # Guardado, e não deduzido de `job_id is None`: uma nota solta e uma nota do
    # Kindle têm as duas `job_id` nulo, e são coisas diferentes na tela.
    fonte = Column(String, nullable=False, default="leitura")

    capitulo = Column(Integer, nullable=False, default=0)

    # A ÂNCORA SÓ EXISTE PARA A NOTA FEITA AQUI.
    #
    # O Kindle informa "posição 176-178", que é a unidade dele e não a nossa: um
    # deslocamento de caractere no texto que o Mekora extraiu. Guardar o número
    # do Kindle nestes campos faria a nota importada apontar um trecho qualquer
    # do capítulo zero, com toda a confiança de uma âncora de verdade.
    de = Column(Integer, nullable=False, default=0)
    ate = Column(Integer, nullable=False, default=0)

    cor = Column(String, nullable=False, default="amarelo")

    # O texto marcado, como estava quando foi marcado. Ver a explicação acima:
    # é o que permite descobrir que a âncora escorregou.
    trecho = Column(Text, nullable=False, default="")

    # O TEXTO EM VOLTA — e é ele que transforma "percebi que escorregou" em
    # "achei de novo".
    #
    # A `DEC-0016` diz que a âncora é a citação MAIS o texto em volta. A razão é
    # que a citação sozinha é ambígua: "ele disse que não" aparece quatro vezes
    # num capítulo, e reancorar pela citação pode grudar a nota na ocorrência
    # errada com toda a confiança. Com o que vinha antes e depois, a ocorrência
    # certa se distingue das outras três.
    #
    # Vazio é legítimo, e não é falta: a nota escrita antes destas colunas não
    # tem contexto, e a escada de degraus foi feita para isso — ela cai para o
    # degrau seguinte em vez de falhar.
    antes = Column(Text, nullable=False, default="")
    depois = Column(Text, nullable=False, default="")

    # O que a pessoa escreveu. Vazio é o caso comum — marcar sem comentar é a
    # forma mais frequente de anotar, e exigir texto transformaria um gesto de
    # um clique num formulário.
    comentario = Column(Text, nullable=False, default="")

    # A NOTA QUE FICOU PELA METADE.
    #
    # O Erik definiu em 02/09/2026: rascunho é a nota "começada e não terminada,
    # abandonada" — e a consequência que ele nomeou junto é o que faz o campo
    # valer alguma coisa: **ela não pode ir para um estudo**. Sem consequência,
    # seria só uma etiqueta a mais para manter.
    #
    # É MARCADO PELA PESSOA, e não deduzido. O produto poderia adivinhar — uma
    # nota sem comentário, parada há duas semanas — e adivinhar aqui seria o
    # produto decidindo o que você abandonou. É a "IA mágica" que o `CLAUDE.md`
    # proíbe, com outra roupa.
    #
    # Nulo é o normal, como em `bloqueio`: guarda o NOME do estado quando ele
    # existe, e nada quando a nota é uma nota comum.
    estado = Column(String)

    criada_em = Column(DateTime, default=agora, nullable=False)
    atualizada_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)
