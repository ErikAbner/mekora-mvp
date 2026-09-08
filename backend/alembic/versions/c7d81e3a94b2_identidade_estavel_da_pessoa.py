"""Identidade estável da pessoa — item `C10` do `ABERTO.md`

A pessoa era identificada por duas coisas, e nenhuma é estável:

  `pessoas.id`     INTEGER sequencial. Depende da ORDEM DE INSERÇÃO, e por isso
                   muda num restore para um banco novo, numa fusão de bases, ou
                   em qualquer reconstrução. Dois bancos do mesmo produto dão o
                   id 7 a pessoas diferentes.
  `pessoas.email`  a chave natural, e ela muda: a pessoa troca de endereço, e
                   trocar de endereço não pode significar virar outra pessoa.

`uuid` é opaco, imutável e não carrega informação sobre quem é — o que também o
torna o identificador certo para aparecer em log e em registro de auditoria, pelo
critério da `DEC-0040`: id interno opaco é metadado operacional, e-mail não é.

PREENCHIDO PARA QUEM JÁ EXISTE, e é por isso que a coluna nasce anulável e só
depois vira obrigatória: `ALTER TABLE ... ADD COLUMN NOT NULL` sem valor padrão
falha em tabela com linhas, e um padrão único por definição não pode ser
constante.

Revision ID: c7d81e3a94b2
Revises: 8525a9c4c9e3
Create Date: 2026-09-07
"""

import uuid as _uuid

import sqlalchemy as sa
from alembic import op

revision = "c7d81e3a94b2"
down_revision = "8525a9c4c9e3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pessoas", sa.Column("uuid", sa.String(length=36), nullable=True))

    # UM POR LINHA, e em Python: `lower(hex(randomblob(16)))` do SQLite daria um
    # hexadecimal sem os hífens do formato, e o resto do produto passaria a ter
    # duas grafias de uuid — a das linhas antigas e a das novas.
    pessoas = sa.table("pessoas", sa.column("id", sa.Integer), sa.column("uuid", sa.String))
    conexao = op.get_bind()
    for (pessoa_id,) in conexao.execute(sa.select(pessoas.c.id)).fetchall():
        conexao.execute(
            pessoas.update().where(pessoas.c.id == pessoa_id).values(uuid=str(_uuid.uuid4()))
        )

    with op.batch_alter_table("pessoas") as lote:
        lote.alter_column("uuid", existing_type=sa.String(length=36), nullable=False)
        # ÚNICO É O PONTO. Um identificador estável repetido é pior que nenhum:
        # ele parece resolver e junta duas pessoas em silêncio.
        lote.create_unique_constraint("uq_pessoas_uuid", ["uuid"])
    op.create_index("ix_pessoas_uuid", "pessoas", ["uuid"])


def downgrade() -> None:
    op.drop_index("ix_pessoas_uuid", table_name="pessoas")
    with op.batch_alter_table("pessoas") as lote:
        lote.drop_constraint("uq_pessoas_uuid", type_="unique")
        lote.drop_column("uuid")
