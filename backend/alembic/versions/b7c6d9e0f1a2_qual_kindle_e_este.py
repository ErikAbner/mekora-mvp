"""Qual Kindle é este — o "Paperwhite · 1236 × 1680" do nó 895:10599.

A Amazon não conta o modelo, e não há como descobrir pelo endereço de e-mail.
Quem sabe é a pessoa, e o Erik decidiu em 02/09/2026 que o produto pergunta.

Saber muda o que o preparo faz: até aqui quadrinho saía no perfil da INSTALAÇÃO
(`kcc_profile`, um valor só para todo mundo), e quem tem um Oasis recebia páginas
montadas para um Paperwhite.

Nulo continua sendo resposta válida — "não sei", "outro", ou um modelo que a
lista ainda não conhece — e nesse caso tudo segue como era.

Revision ID: b7c6d9e0f1a2
Revises: a6b5c8d9e0f1
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c6d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "a6b5c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("aparelhos") as lote:
        lote.add_column(sa.Column("modelo", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("aparelhos") as lote:
        lote.drop_column("modelo")
