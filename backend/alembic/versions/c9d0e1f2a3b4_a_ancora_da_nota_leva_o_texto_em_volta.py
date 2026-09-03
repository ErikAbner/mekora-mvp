"""A âncora da nota leva o texto em volta.

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-09-03

A `DEC-0016` diz que a âncora de uma nota é **a citação mais o texto em volta**,
e que o deslocamento é dica de busca. O produto guardava só a citação e o
deslocamento — o que basta para PERCEBER que a âncora escorregou e não basta para
resolver o degrau 2 da escada, "o mesmo parágrafo, casando com o texto em volta".

Duas colunas de texto, e nada mais. Elas nascem vazias: nota antiga não tem
contexto guardado, e continua resolvendo pelos outros degraus — pela citação
dentro do parágrafo, pelo capítulo, pelo livro. A escada foi escrita para
degradar, e é aqui que ela degrada pela primeira vez.

`server_default` em texto vazio, e não NULL: a coluna é NOT NULL, e sem o padrão
a migração passa em tabela vazia e falha na primeira que tenha linhas — o defeito
que o `scripts/provar-migracao.py` existe para pegar.
"""

from alembic import op
import sqlalchemy as sa

revision = "c9d0e1f2a3b4"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notas", sa.Column("antes", sa.Text(), nullable=False, server_default=""))
    op.add_column("notas", sa.Column("depois", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("notas", "depois")
    op.drop_column("notas", "antes")
