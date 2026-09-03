"""Pertencer a uma seção é explícito.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-02

O modelo anterior era GEOMÉTRICO: quem está dentro é quem está por cima, lido a
cada gesto. Ele foi testado e reprovou em dois cenários medidos —

  duas seções sobrepostas: o objeto no meio andava com as DUAS;
  seção dentro de seção: mover a de fora arrancava o conteúdo da de dentro e
  deixava o retângulo dela para trás.

E o Erik apontou o defeito de fundo, que nenhum desempate matemático resolve:
**a relação mudava sem que ninguém a tivesse mudado.** Esticar uma área por
motivo de respiro adotava tudo que o traço cruzasse.

Agora a geometria SUGERE e o gesto DECIDE. `grupo_id` guarda a decisão.

`SET NULL` e não `CASCADE`: apagar a seção solta o conteúdo, e não o apaga junto.
É a mesma regra que "tirar" já segue em todo o Canvas.
"""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for tabela in ("canvas_nos", "canvas_livros"):
        op.add_column(tabela, sa.Column("grupo_id", sa.Integer(), nullable=True))
        op.create_index(op.f(f"ix_{tabela}_grupo_id"), tabela, ["grupo_id"], unique=False)
        # SQLite não altera chave estrangeira depois; o `batch_alter_table` recria
        # a tabela, e é como o alembic faz isso aqui.
        with op.batch_alter_table(tabela) as lote:
            lote.create_foreign_key(
                f"fk_{tabela}_grupo", "canvas_grupos", ["grupo_id"], ["id"], ondelete="SET NULL"
            )


def downgrade() -> None:
    for tabela in ("canvas_nos", "canvas_livros"):
        with op.batch_alter_table(tabela) as lote:
            lote.drop_constraint(f"fk_{tabela}_grupo", type_="foreignkey")
        op.drop_index(op.f(f"ix_{tabela}_grupo_id"), table_name=tabela)
        op.drop_column(tabela, "grupo_id")
