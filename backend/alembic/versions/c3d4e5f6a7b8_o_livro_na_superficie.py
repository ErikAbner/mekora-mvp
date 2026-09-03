"""O livro na superfície.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-02

Referência, e não cópia: a linha guarda `job_id` e o livro continua sendo da
estante. Tirar do Canvas apaga esta linha e nada mais.

`CASCADE` nos dois lados porque a tela de Privacidade promete que apagar a conta
apaga tudo — e porque apagar o livro de verdade deve levar a posição dele junto,
senão sobra um cartão apontando para nada.
"""

from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "canvas_livros",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("x", sa.Float(), nullable=False, server_default="0"),
        sa.Column("y", sa.Float(), nullable=False, server_default="0"),
        sa.Column("largura", sa.Float(), nullable=False, server_default="280"),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("movido_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["processing_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pessoa_id", "job_id", name="uq_canvas_livros_pessoa_job"),
    )
    op.create_index(op.f("ix_canvas_livros_id"), "canvas_livros", ["id"], unique=False)
    op.create_index(op.f("ix_canvas_livros_pessoa_id"), "canvas_livros", ["pessoa_id"], unique=False)
    op.create_index(op.f("ix_canvas_livros_job_id"), "canvas_livros", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_canvas_livros_job_id"), table_name="canvas_livros")
    op.drop_index(op.f("ix_canvas_livros_pessoa_id"), table_name="canvas_livros")
    op.drop_index(op.f("ix_canvas_livros_id"), table_name="canvas_livros")
    op.drop_table("canvas_livros")
