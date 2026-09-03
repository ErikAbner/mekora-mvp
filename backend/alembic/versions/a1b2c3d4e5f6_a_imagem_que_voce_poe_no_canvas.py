"""A imagem que você põe no Canvas.

Revision ID: a1b2c3d4e5f6
Revises: e0f9a2b3c4d5
Create Date: 2026-09-02

Tabela e não coluna em `notas`: a `Nota` é a entidade compartilhada por leitura,
estudos, caderno e Canvas, e pendurar `imagem` nela faria toda nota do produto
carregar um campo que só uma minoria usa. Aqui a relação é a resposta — existe
linha, tem imagem.

`token` único e aleatório porque o arquivo é servido por `/canvas/midia/{token}`:
com o `id` sequencial no endereço, entrar com um número descobre quantas imagens
existem e convida a tentar as vizinhas. `CASCADE` nos dois lados porque a tela de
Privacidade promete que apagar a conta apaga tudo.
"""

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "e0f9a2b3c4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "canvas_midias",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=False),
        sa.Column("nota_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("largura", sa.Integer(), nullable=False),
        sa.Column("altura", sa.Integer(), nullable=False),
        sa.Column("criada_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["nota_id"], ["notas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_canvas_midias_id"), "canvas_midias", ["id"], unique=False)
    op.create_index(op.f("ix_canvas_midias_pessoa_id"), "canvas_midias", ["pessoa_id"], unique=False)
    op.create_index(op.f("ix_canvas_midias_nota_id"), "canvas_midias", ["nota_id"], unique=True)
    op.create_index(op.f("ix_canvas_midias_token"), "canvas_midias", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_canvas_midias_token"), table_name="canvas_midias")
    op.drop_index(op.f("ix_canvas_midias_nota_id"), table_name="canvas_midias")
    op.drop_index(op.f("ix_canvas_midias_pessoa_id"), table_name="canvas_midias")
    op.drop_index(op.f("ix_canvas_midias_id"), table_name="canvas_midias")
    op.drop_table("canvas_midias")
