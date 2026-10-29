"""A qualidade deixa de ser só uma contagem.

Revision ID: b0c1d2e3f4a5
Revises: a9b0c1d2e3f4
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b0c1d2e3f4a5"
down_revision: Union[str, Sequence[str], None] = "a9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.add_column(sa.Column("quality_manifest", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.drop_column("quality_manifest")
