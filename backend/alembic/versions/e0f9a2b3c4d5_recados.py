"""O recado que a pessoa quis deixar.

Revision ID: e0f9a2b3c4d5
Revises: d9e8f1a2b3c4
Create Date: 2026-09-03

`pessoa_id` é NULO quando quem escreveu não tinha conta — converter sem conta é
garantia da DEC-0018, e quem faz isso é quem mais tem a dizer sobre a primeira
impressão. `CASCADE` porque a tela de privacidade promete que apagar a conta
apaga tudo.
"""

from alembic import op
import sqlalchemy as sa

revision = "e0f9a2b3c4d5"
down_revision = "d9e8f1a2b3c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recados",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=True),
        sa.Column("humor", sa.String(), nullable=True),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("onde", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recados_id"), "recados", ["id"], unique=False)
    op.create_index(op.f("ix_recados_pessoa_id"), "recados", ["pessoa_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_recados_pessoa_id"), table_name="recados")
    op.drop_index(op.f("ix_recados_id"), table_name="recados")
    op.drop_table("recados")
