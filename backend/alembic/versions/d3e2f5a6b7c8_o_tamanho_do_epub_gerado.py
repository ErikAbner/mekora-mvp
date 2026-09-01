"""O tamanho do EPUB gerado — a segunda metade de "Diário 02.epub · 8,4 MB".

O nó `895:8164` escreve o nome do arquivo E o tamanho dele na faixa de "pronto".
O nome já saía do `epub_path`; o tamanho não existia em lugar nenhum, e um
comentário no `Preparo.jsx` dizia isso com todas as letras — "o backend não o
expõe, e inventar um número numa faixa que existe para dar certeza seria o
oposto do que ela faz".

Revision ID: d3e2f5a6b7c8
Revises: c2d1e4f5a6b7
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d3e2f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c2d1e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.add_column(sa.Column("epub_bytes", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.drop_column("epub_bytes")
