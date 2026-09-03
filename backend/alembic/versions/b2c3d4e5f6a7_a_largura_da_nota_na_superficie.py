"""A largura da nota na superfície.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-02

O Erik: "click em itens deveria redimensionar quando o click é nas laterais do
objeto, ou então é para mover itens". Para a nota poder esticar, a largura tem de
ser dela e não da folha de estilo.

Só a LARGURA. A altura continua vindo do conteúdo: uma altura fixa corta o texto,
e um cartão que esconde o que a pessoa escreveu erra o propósito do Canvas.

`375` é o valor que estava no CSS — o padrão não muda para quem já tem notas lá.
"""

from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "canvas_nos",
        sa.Column("largura", sa.Float(), nullable=False, server_default="375"),
    )


def downgrade() -> None:
    op.drop_column("canvas_nos", "largura")
