"""epub web com imagens em webp

Revision ID: 9615f2831f57
Revises: 432c242b7b80
Create Date: 2026-08-31 22:51:15.350711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9615f2831f57'
down_revision: Union[str, Sequence[str], None] = '432c242b7b80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """A coluna do EPUB com imagens em WebP.

    NULLABLE, e por isso sem `server_default`: livro sem imagem que valha
    converter nao tem versao web, e nulo e a resposta certa — nao "".

    `render_as_batch` porque o banco e SQLite, que nao tem ALTER COLUMN: o
    Alembic recria a tabela, e sem isso a migracao passa aqui e falha no
    servidor.
    """
    with op.batch_alter_table("processing_jobs", schema=None) as batch:
        batch.add_column(sa.Column("epub_web_path", sa.String(), nullable=True))



def downgrade() -> None:
    with op.batch_alter_table("processing_jobs", schema=None) as batch:
        batch.drop_column("epub_web_path")
