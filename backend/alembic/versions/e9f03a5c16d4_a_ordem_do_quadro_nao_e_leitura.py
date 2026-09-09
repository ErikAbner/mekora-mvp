"""A ordem do quadro não é leitura

Revision ID: e9f03a5c16d4
Revises: d8e92f4b05c3
Create Date: 2026-09-08

O Kanban de Estudos já separava estado declarado de progresso medido, mas não
guardava posição dentro da coluna. Soltar um livro acima de outro na mesma
coluna não tinha representação e, portanto, não fazia nada.

`ordem_leitura` mora no trabalho/livro e não em `progressos`: organizar a fila
não é abrir o livro. Criar uma linha de progresso durante a organização faria a
Mesa interpretar um gesto de arrumação como leitura recente.

Nulo preserva o acervo anterior. A interface usa a ordem estável já recebida
até a primeira organização explícita.
"""

import sqlalchemy as sa
from alembic import op

revision = "e9f03a5c16d4"
down_revision = "d8e92f4b05c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("processing_jobs", sa.Column("ordem_leitura", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("processing_jobs", "ordem_leitura")
