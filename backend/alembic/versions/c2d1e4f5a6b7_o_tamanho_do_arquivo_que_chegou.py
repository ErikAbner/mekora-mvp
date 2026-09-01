"""O tamanho do arquivo que chegou — o selo "11.5 MB" do nó 966:31504.

Ele existia só no disco, e ler o disco a cada abertura de tela faria a ficha
depender de um arquivo que a limpeza pode ter apagado: `cleanup_old_jobs` remove
o input e deixa o EPUB.

NULO PARA O QUE JÁ EXISTE, e não zero. Nulo é "não sei" — a tela cala. Zero
seria o produto afirmando que o arquivo tem zero bytes, que é falso para todos
eles.

Revision ID: c2d1e4f5a6b7
Revises: b1c0d2e3f4a5
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c2d1e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "b1c0d2e3f4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # `render_as_batch` está ligado no env.py — o SQLite não altera tabela no
    # lugar, e sem ele um ADD COLUMN com default falharia.
    with op.batch_alter_table("processing_jobs") as lote:
        lote.add_column(sa.Column("input_bytes", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.drop_column("input_bytes")
