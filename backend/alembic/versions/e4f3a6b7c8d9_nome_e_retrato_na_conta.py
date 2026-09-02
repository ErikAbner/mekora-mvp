"""Nome e retrato na conta — a decisão que faltava.

A trilha da conta já mostrava um nome, e ele era INVENTADO: o `App.jsx` fazia
`email.split("@")[0]`, então `erik@mekora.local` virava "erik". Enquanto isso a
tela de privacidade afirmava "não há nome, telefone nem foto". Uma das duas
mentia, e era a primeira.

O Erik decidiu em 02/09/2026: a conta tem nome e retrato, os dois escolhidos por
quem entra. Nulo continua sendo estado normal — converter não exige conta
(DEC-0018) e entrar não pede nome.

`retrato` guarda CAMINHO, não bytes: a imagem é reescrita pelo servidor como PNG
quadrado e servida por rota com sessão, sem URL adivinhável.

Revision ID: e4f3a6b7c8d9
Revises: d3e2f5a6b7c8
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e4f3a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "d3e2f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("pessoas") as lote:
        lote.add_column(sa.Column("nome", sa.String(), nullable=True))
        lote.add_column(sa.Column("retrato", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("pessoas") as lote:
        lote.drop_column("retrato")
        lote.drop_column("nome")
