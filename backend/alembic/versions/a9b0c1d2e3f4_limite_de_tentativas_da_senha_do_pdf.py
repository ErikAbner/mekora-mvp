"""A senha errada não pode ser tentada sem teto.

Revision ID: a9b0c1d2e3f4
Revises: e9f03a5c16d4
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, Sequence[str], None] = "e9f03a5c16d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.add_column(sa.Column("tentativas_senha", sa.Integer(), nullable=False, server_default="0"))
        lote.add_column(sa.Column("senha_bloqueada_ate", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.drop_column("senha_bloqueada_ate")
        lote.drop_column("tentativas_senha")
