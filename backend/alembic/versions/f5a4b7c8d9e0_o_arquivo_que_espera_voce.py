"""O arquivo que espera você — o "Precisa de você" do nó 895:9348.

Faltava um estado: BLOQUEADO. Um PDF com senha não é um PDF quebrado, e o
produto tratava os dois igual — o PyMuPDF abre o arquivo protegido sem reclamar,
o texto sai vazio, a densidade dá zero, o OCR roda numa página que ninguém
consegue renderizar, e a pessoa recebe "OCR falhou" para um arquivo que só
precisava de uma senha.

`bloqueio` guarda o NOME do que trava — hoje só `"senha"` —, e nulo quer dizer
que nada trava. Não é um booleano de propósito: o segundo motivo vai aparecer, e
`is_blocked` obrigaria uma segunda coluna para dizer por quê.

Revision ID: f5a4b7c8d9e0
Revises: e4f3a6b7c8d9
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f5a4b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "e4f3a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.add_column(sa.Column("bloqueio", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("processing_jobs") as lote:
        lote.drop_column("bloqueio")
