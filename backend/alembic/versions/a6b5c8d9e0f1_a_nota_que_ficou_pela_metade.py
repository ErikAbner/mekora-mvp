"""A nota que ficou pela metade — o recorte "rascunho" do nó 895:7631.

O desenho recorta as notas em marcadores, anotações e rascunho. Os dois
primeiros saem do que a nota TEM — trecho, comentário —, e o terceiro não saía
de nada: não havia estado de nota no modelo, e um recorte que devolve sempre
zero não é filtro, é promessa.

O Erik definiu em 02/09/2026: rascunho é a nota começada e não terminada,
abandonada — e ela NÃO PODE IR PARA UM ESTUDO. É a consequência que faz o campo
valer: sem ela seria só uma etiqueta a mais para manter.

Revision ID: a6b5c8d9e0f1
Revises: f5a4b7c8d9e0
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a6b5c8d9e0f1"
down_revision: Union[str, Sequence[str], None] = "f5a4b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("notas") as lote:
        lote.add_column(sa.Column("estado", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("notas") as lote:
        lote.drop_column("estado")
