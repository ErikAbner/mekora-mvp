"""quanto do livro ja foi lido

Revision ID: 00ebfd9a1a0e
Revises: 9615f2831f57
Create Date: 2026-08-31 23:43:17.492106

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00ebfd9a1a0e'
down_revision: Union[str, Sequence[str], None] = '9615f2831f57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """A fracao lida, de 0 a 1.

    NULLABLE de proposito: progresso gravado antes desta coluna nao tem fracao, e
    nulo e a resposta certa — zero afirmaria que a leitura esta no comeco.

    `render_as_batch` porque o banco e SQLite, que nao tem ALTER COLUMN.
    """
    with op.batch_alter_table("progressos", schema=None) as batch:
        batch.add_column(sa.Column("fracao", sa.Float(), nullable=True))



def downgrade() -> None:
    with op.batch_alter_table("progressos", schema=None) as batch:
        batch.drop_column("fracao")
