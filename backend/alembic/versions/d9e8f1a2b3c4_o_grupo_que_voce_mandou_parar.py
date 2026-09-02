"""O grupo de notas que a pessoa mandou parar de sugerir.

O nó 895:8849 põe um "Ignorar" ao lado de cada fio, e ele ficou de fora de
propósito: ignorar precisa ser LEMBRADO, e não havia onde. Um botão que esquece
ao recarregar é pior que botão nenhum.

O que identifica um grupo não é um id — eles nascem de uma varredura e não
existem como registro. O que se guarda é o CONJUNTO de notas, ordenado. A
consequência é a certa: um grupo ignorado que ganha nota nova volta a aparecer,
porque aí o Mekora tem coisa nova a dizer sobre aquele assunto.

Revision ID: d9e8f1a2b3c4
Revises: c8d7e0f1a2b3
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d9e8f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "c8d7e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "grupos_ignorados",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=False),
        sa.Column("assinatura", sa.String(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pessoa_id", "assinatura", name="uq_grupo_ignorado"),
    )
    op.create_index("ix_grupos_ignorados_pessoa_id", "grupos_ignorados", ["pessoa_id"])
    op.create_index("ix_grupos_ignorados_assinatura", "grupos_ignorados", ["assinatura"])


def downgrade() -> None:
    op.drop_index("ix_grupos_ignorados_assinatura", table_name="grupos_ignorados")
    op.drop_index("ix_grupos_ignorados_pessoa_id", table_name="grupos_ignorados")
    op.drop_table("grupos_ignorados")
