"""A seção apagada pode voltar — com o mesmo id.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-02

O Erik: "Undo should normally restore the same logical entity. Otherwise future
features can break: edges pointing to Section; saved relationships; parent
references; redo consistency."

Ele está certo, e o conserto é apagar EM DUAS ETAPAS. `apagado_em` marca a linha
como fora da superfície sem destruí-la; desfazer limpa a marca e a seção volta
sendo a MESMA — mesmo id, mesmo nome, mesma geometria.

A nota não precisa disto: o que "tirar" apaga é a POSIÇÃO dela, e a identidade
que importa — `nota_id` — nunca saiu do lugar. A seção é diferente porque ela é o
objeto, e é ela que amanhã será apontada por uma ligação ou por uma referência de
Estudo.
"""

from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("canvas_grupos", sa.Column("apagado_em", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("canvas_grupos", "apagado_em")
