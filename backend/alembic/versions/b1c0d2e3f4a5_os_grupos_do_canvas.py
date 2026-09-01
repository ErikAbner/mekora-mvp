"""Os grupos do Canvas — o nó 895:6938.

Uma área nomeada na superfície: um retângulo com título, e as notas que estão em
cima dele. O grupo NÃO guarda quais notas estão dentro — quem está dentro é quem
está por cima, e a geometria responde. Guardar a lista criaria duas verdades a
reconciliar a cada arrasto.

Revision ID: b1c0d2e3f4a5
Revises: 00ebfd9a1a0e
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b1c0d2e3f4a5"
down_revision: Union[str, Sequence[str], None] = "00ebfd9a1a0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "canvas_grupos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(), server_default="", nullable=False),
        # `server_default` em toda coluna não-nula: sem ele, uma linha criada por
        # um caminho que não passe pelo ORM entra sem valor e a tabela recusa.
        sa.Column("x", sa.Float(), server_default="0", nullable=False),
        sa.Column("y", sa.Float(), server_default="0", nullable=False),
        sa.Column("largura", sa.Float(), server_default="480", nullable=False),
        sa.Column("altura", sa.Float(), server_default="320", nullable=False),
        sa.Column("criado_em", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("movido_em", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_canvas_grupos_id"), "canvas_grupos", ["id"])
    op.create_index(op.f("ix_canvas_grupos_pessoa_id"), "canvas_grupos", ["pessoa_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_canvas_grupos_pessoa_id"), table_name="canvas_grupos")
    op.drop_index(op.f("ix_canvas_grupos_id"), table_name="canvas_grupos")
    op.drop_table("canvas_grupos")
