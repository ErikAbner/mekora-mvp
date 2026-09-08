"""O uuid se gera sozinho no banco, e não só no modelo

A `c7d81e3a94b2` criou `pessoas.uuid` obrigatório com o padrão declarado no
modelo SQLAlchemy. Isso cobre o aplicativo e mais nada: **todo `INSERT` por SQL
cru passou a falhar.**

    sqlite3.IntegrityError: NOT NULL constraint failed: pessoas.uuid

Quebrou na primeira execução seguinte de `scripts/sessao-de-prova.sh`, e com ele
as cinquenta provas da interface de uma vez — o `_sessao.py` insere direto, como
o `chave-local.py`. Foram dois nomeados; o terceiro é o que nasce depois desta
migração e não vai lembrar.

O ÔNUS CERTO É O INVERSO, e é o mesmo argumento que a `DEC-0032` usa para o
conteúdo e a `DEC-0040` para a máscara do autocapture: **protege por omissão, em
vez de exigir que alguém lembre.** Um padrão no banco vale para o aplicativo, os
scripts, um `INSERT` colado à mão durante um incidente, e o script que ainda não
existe.

A EXPRESSÃO GERA UUID v4 DE VERDADE, e não hexadecimal solto: o 13º dígito é `4`
e o 17º sai de `89ab`, que são as duas marcas da versão e da variante. É a razão
de não usar `lower(hex(randomblob(16)))`, que daria 32 dígitos sem hífens — e o
produto passaria a ter duas grafias de uuid, a das linhas antigas e a das novas.

Revision ID: d8e92f4b05c3
Revises: c7d81e3a94b2
Create Date: 2026-09-07
"""

import sqlalchemy as sa
from alembic import op

revision = "d8e92f4b05c3"
down_revision = "c7d81e3a94b2"
branch_labels = None
depends_on = None

UUID_V4 = (
    "(lower("
    "hex(randomblob(4)) || '-' || "
    "hex(randomblob(2)) || '-4' || "
    "substr(hex(randomblob(2)), 2) || '-' || "
    "substr('89ab', abs(random()) % 4 + 1, 1) || "
    "substr(hex(randomblob(2)), 2) || '-' || "
    "hex(randomblob(6))"
    "))"
)


def upgrade() -> None:
    # `batch_alter_table` porque o SQLite não sabe alterar um DEFAULT: ele
    # recria a tabela e copia as linhas, preservando o que já existe.
    with op.batch_alter_table("pessoas") as lote:
        lote.alter_column(
            "uuid",
            existing_type=sa.String(length=36),
            existing_nullable=False,
            server_default=sa.text(UUID_V4),
        )


def downgrade() -> None:
    with op.batch_alter_table("pessoas") as lote:
        lote.alter_column(
            "uuid",
            existing_type=sa.String(length=36),
            existing_nullable=False,
            server_default=None,
        )
