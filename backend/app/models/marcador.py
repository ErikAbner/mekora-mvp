"""O marcador: o lugar do livro para onde se quer voltar.

POR QUE NÃO É UMA NOTA
======================
A tentação é guardar isto em `notas` com um campo a mais, porque as duas coisas
apontam para um ponto do texto com a mesma âncora. Seria errado, e o erro
apareceria em três telas de uma vez.

Uma nota é o que a pessoa **marcou e escreveu**: ela tem trecho selecionado, cor
e comentário, entra no Canvas, entra num Estudo e aparece em `/notas`. Um
marcador não tem nada disso — ele não é sobre o texto, é sobre a **volta**. Pôr
os dois na mesma tabela faria cada dobra de página virar uma linha nas telas cujo
assunto inteiro é o que se escreveu, e obrigaria todas elas a filtrar um tipo que
não deveria estar ali.

São dois gestos com custo diferente, também: marcar um trecho exige selecionar; a
dobra é um clique de quem vai fechar o livro.

A ÂNCORA É A MESMA DE SEMPRE
============================
Capítulo mais deslocamento de caractere dentro dele — o mesmo par do progresso, do
destaque e da ênfase do autor. Página não serve (muda com a fonte), índice de
bloco não serve (a extração pode dividir um parágrafo em dois). Os quatro vivem no
mesmo sistema de coordenadas, e a tela não precisa saber de onde cada um veio.

E O TRECHO VAI JUNTO, pela razão que a `Nota` já documenta: se a extração mudar, o
deslocamento escorrega alguns caracteres. Com o texto gravado dá para perceber
isso — e, no caso do marcador, ele tem um segundo uso mais imediato: **é o que
faz a lista ser legível.** Uma lista de "capítulo 4, caractere 8112" não diz nada
sobre o lugar que se quis guardar.

UM LUGAR MARCADO DUAS VEZES É UM MARCADOR SÓ
============================================
A restrição de unicidade está no banco, e não só no código. Sem ela, dois cliques
seguidos — ou duas abas — deixam duas dobras no mesmo lugar, e a lista passa a
mostrar a mesma linha duas vezes sem que ninguém tenha feito nada errado.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text, UniqueConstraint

from app.db.database import Base
from app.models.pessoa import agora


class Marcador(Base):
    __tablename__ = "marcadores"

    __table_args__ = (
        UniqueConstraint(
            "pessoa_id", "job_id", "capitulo", "deslocamento",
            name="uq_marcadores_lugar",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False, index=True)

    # OBRIGATÓRIO, ao contrário do que acontece na `Nota`.
    #
    # A nota pode não ter livro daqui — as do `My Clippings.txt` vêm de livros
    # que nunca passaram pelo Mekora. Um marcador, não: ele só existe dentro de
    # um livro que se está lendo AQUI, porque é a esta leitura que ele devolve.
    job_id = Column(Integer, ForeignKey("processing_jobs.id", ondelete="CASCADE"), nullable=False, index=True)

    capitulo = Column(Integer, nullable=False, default=0)
    deslocamento = Column(Integer, nullable=False, default=0)

    # O texto que estava naquele ponto quando a dobra foi feita. É o que a lista
    # mostra, e é o que denuncia uma âncora que escorregou.
    trecho = Column(Text, nullable=False, default="")

    criado_em = Column(DateTime, default=agora, nullable=False)
