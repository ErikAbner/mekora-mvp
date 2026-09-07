"""Estado de leitura, separado do progresso.

Revision ID: 8525a9c4c9e3
Revises: e1f2a3b4c5d6
Create Date: 2026-09-07

O QUADRO DE ESTUDOS PASSOU A ARRASTAR, E O ARRASTO ESCREVIA O PROGRESSO.

A primeira versão do arrasto entre "A ler", "Lendo" e "Lido" gravava a posição
de leitura: soltar em Lido punha a marca no último capítulo com fração 1, soltar
em A ler zerava, soltar em Lendo fabricava um capítulo de N. O argumento era que
a coluna é derivada da fração, e que corrigir o derivado é a lei do projeto.

O Erik recusou em 07/09, e a razão é uma distinção que o modelo não tinha:

    "Estado de leitura e progresso de leitura são conceitos diferentes. O
    drag-and-drop altera o estado. A leitura efetiva altera o progresso."

São mesmo. "Terminei este livro" é uma declaração da pessoa; "parei no capítulo
7, caractere 2.140" é um fato medido pelo leitor. Escrever o segundo para
representar o primeiro apaga onde ela estava — e apaga em silêncio, como efeito
colateral de um gesto que não prometia mexer no histórico.

UMA COLUNA, E NÃO UMA SEGUNDA VERDADE
=====================================
`estado_leitura` é anulável, e o nulo é o normal. Nulo quer dizer "ninguém
declarou", e aí o estado é DERIVADO da fração, como sempre foi. Preenchido quer
dizer que a pessoa disse, e a declaração dela vence.

Isso não cria duas fontes concorrentes: cria uma fonte com padrão derivado e
precedência escrita num lugar só, o `estadoDeLeitura` do contrato. Duas verdades
seria guardar o estado E continuar derivando sem dizer qual manda.

Os três valores são os que o Erik nomeou: `to_read`, `reading`, `read`.

A COLUNA MORA EM `progressos` porque a granularidade é a mesma — uma linha por
pessoa e livro, com a restrição única já no banco. Uma tabela nova teria a mesma
chave, a mesma cardinalidade e o mesmo ciclo de vida, e mais uma junção.

E ela é anulável também no sentido do dado antigo: todo progresso que já existe
continua sem declaração, e a estante continua mostrando o que mostrava.
"""

from alembic import op
import sqlalchemy as sa

revision = "8525a9c4c9e3"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("progressos", sa.Column("estado_leitura", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("progressos", "estado_leitura")
