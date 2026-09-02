"""O que a análise contou página por página.

Três frases do desenho ficaram de fora por não existir onde guardá-las:
"nenhuma página corrompida — 96 de 96 abriram sem erro" (nó 895:7856), "três
páginas ficaram sem texto" (nó 895:7631) e "a partir dos 14 títulos de capítulo
que encontrei" (nó 895:7856).

O laço da análise já abria página por página para contar caracteres e jogava as
três fora. Contar não custa uma leitura a mais — custa três inteiros.

NULO E ZERO DIZEM COISAS DIFERENTES: zero é "contei, e não achei nenhuma"; nulo é
"ninguém contou" — trabalho analisado antes disto, ou PDF que pede senha.

Revision ID: c8d7e0f1a2b3
Revises: b7c6d9e0f1a2
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8d7e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b7c6d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.add_column(sa.Column("paginas_ilegiveis", sa.Integer(), nullable=True))
        lote.add_column(sa.Column("paginas_sem_texto", sa.Integer(), nullable=True))
        lote.add_column(sa.Column("capitulos_declarados", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.drop_column("capitulos_declarados")
        lote.drop_column("paginas_sem_texto")
        lote.drop_column("paginas_ilegiveis")
