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

    # SÓ A LARGURA. A altura vem do conteúdo: uma altura fixa corta o texto, e um
    # cartão que esconde o que a pessoa escreveu erra o propósito do Canvas.
    largura = Column(Float, nullable=False, default=375, server_default="375")

    # A QUE SEÇÃO ESTE NÓ PERTENCE — e pertencer é EXPLÍCITO.
    #
    # A versão anterior derivava isto da geometria a cada gesto, e reprovou nos
    # testes: com duas áreas sobrepostas o objeto andava com as duas, e esticar
    # uma área por motivo de respiro adotava tudo que o traço cruzasse. A relação
    # mudava sem ninguém tê-la mudado.
    #
    # Agora a geometria só SUGERE: ela acende a área candidata durante o arrasto.
    # Quem decide é o gesto — soltar dentro, soltar fora, ou criar a seção a
    # partir de uma escolha.
    grupo_id = Column(
        Integer, ForeignKey("canvas_grupos.id", ondelete="SET NULL"), nullable=True, index=True
    )

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


class GrupoCanvas(Base):
    """Uma área nomeada na superfície — o nó `895:6938`.

    O desenho mostra cartões dentro de um retângulo tracejado com título:
    *"Design & Tecnologia"*. É um agrupamento ESPACIAL, e é isso que o distingue
    de um Estudo: o Estudo é uma lista de notas reunidas por assunto, e existe
    fora do Canvas; o grupo é um pedaço de chão com nome, e uma nota pertence a
    ele por estar em cima dele.

    POR ISSO O GRUPO NÃO GUARDA QUAIS NOTAS ESTÃO DENTRO. Guardar a lista criaria
    duas verdades: a nota estaria dentro do retângulo na tela e fora dele na
    tabela, ou o contrário, e a cada arrasto alguém teria de reconciliar as
    duas. Quem está dentro é quem está por cima — a geometria responde.
    """

    __tablename__ = "canvas_grupos"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)

    nome = Column(String, nullable=False, default="")

    # Ponto flutuante pelo mesmo motivo do nó: o arrasto produz frações, e
    # arredondar a cada movimento faz a área andar aos saltos.
    x = Column(Float, nullable=False, default=0)
    y = Column(Float, nullable=False, default=0)
    largura = Column(Float, nullable=False, default=480)
    altura = Column(Float, nullable=False, default=320)

    criado_em = Column(DateTime, default=agora, nullable=False)
    movido_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)

    # APAGAR É EM DUAS ETAPAS, para o desfazer devolver a MESMA seção.
    #
    # Recriar com id novo daria um objeto que só se PARECE com o anterior — e
    # qualquer coisa que aponte para a seção (uma ligação, uma referência de
    # Estudo, um comentário) ficaria apontando para o vazio depois de um desfazer.
    # A marca guarda a identidade; a superfície simplesmente não mostra o que a
    # tem.
    apagado_em = Column(DateTime, nullable=True)


class MidiaCanvas(Base):
    """A imagem de uma nota de mídia — a primeira ferramenta do dock.

    POR QUE UMA TABELA, E NÃO UMA COLUNA EM `Nota`
    ==============================================
    A `Nota` é a entidade compartilhada por leitura, estudos, caderno e Canvas.
    Pendurar `imagem` nela faria toda nota do produto carregar um campo que só
    uma minoria usa, e faria a pergunta "esta nota tem imagem?" existir em
    lugares onde ela não faz sentido. Aqui a relação é a resposta: existe linha,
    tem imagem.

    O TOKEN NÃO É O `id`
    ====================
    O arquivo é servido por `/canvas/midia/{token}`, e o token é aleatório. Com
    o `id` sequencial no endereço, qualquer pessoa entrando com um número
    descobre quantas imagens existem no sistema e tenta as vizinhas — é o mesmo
    defeito que o `token_publico` dos jobs já resolveu neste repositório.

    A propriedade é conferida no banco de qualquer jeito. O token aleatório é a
    segunda tranca, e não a primeira.
    """

    __tablename__ = "canvas_midias"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)
    nota_id = Column(
        Integer, ForeignKey("notas.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    token = Column(String, nullable=False, unique=True, index=True)

    # O TAMANHO FICA GUARDADO para a tela poder reservar o espaço do cartão antes
    # de a imagem chegar. Sem isso o Canvas dá um pulo quando cada imagem carrega
    # — e num plano onde a pessoa está arrastando coisas, o pulo move o alvo
    # debaixo do dedo.
    largura = Column(Integer, nullable=False, default=0)
    altura = Column(Integer, nullable=False, default=0)

    criada_em = Column(DateTime, default=agora, nullable=False)


class LivroCanvas(Base):
    """Um livro posto na superfície — e ele é uma REFERÊNCIA, não uma cópia.

    O modelo já fazia isso certo com a nota: `NoCanvas` guarda `nota_id` e a nota
    continua sendo da estante. O livro segue a mesma regra, e a razão é a mesma —
    o Canvas é onde as coisas ESTÃO, não onde elas vivem.

    Disso saem as três remoções, que precisam ser diferentes e ditas com todas as
    letras:

      tirar do Canvas    apaga esta linha, e nada mais
      tirar do Estudo    desfaz o vínculo com aquele Estudo
      apagar o livro     apaga o arquivo, e isso NÃO pertence ao Canvas

    Só a terceira destrói alguma coisa.

    POR QUE UMA TABELA E NÃO UM `canvas_itens(tipo, ref_id)`: polimorfismo com
    dois tipos é abstração antes da segunda dor. As duas tabelas têm o mesmo
    formato de propósito — se um terceiro tipo aparecer, a migração é pequena.
    """

    __tablename__ = "canvas_livros"

    # Um livro aparece uma vez só na superfície, pela mesma razão da nota: dois
    # cliques em "trazer" fariam dois cartões do mesmo livro, e mover um deixaria
    # o outro para trás.
    __table_args__ = (UniqueConstraint("pessoa_id", "job_id", name="uq_canvas_livros_pessoa_job"),)

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("processing_jobs.id", ondelete="CASCADE"), nullable=False, index=True)

    x = Column(Float, nullable=False, default=0)
    y = Column(Float, nullable=False, default=0)
    largura = Column(Float, nullable=False, default=280, server_default="280")

    # Mesma regra da nota: pertencer é explícito. Ver `NoCanvas.grupo_id`.
    grupo_id = Column(
        Integer, ForeignKey("canvas_grupos.id", ondelete="SET NULL"), nullable=True, index=True
    )

    criado_em = Column(DateTime, default=agora, nullable=False)
    movido_em = Column(DateTime, default=agora, onupdate=agora, nullable=False)
