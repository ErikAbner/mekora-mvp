"""O lugar para onde voltar.

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-09-03

Os marcadores. Tabela própria, e não uma coluna em `notas`: a nota é o que a
pessoa marcou e escreveu, e ela aparece no Canvas, nos Estudos e em `/notas` —
telas cujo assunto é o texto escrito. Uma dobra de página não é isso, e guardá-la
ali faria as três filtrarem um tipo que não deveria estar lá. A razão longa está
no cabeçalho de `app/models/marcador.py`.

A âncora é capítulo mais deslocamento, o mesmo par do progresso e do destaque.

`CASCADE` nos dois lados: a tela de Privacidade promete que apagar a conta apaga
tudo, e apagar o livro tem de levar as dobras dele — senão sobra uma lista
apontando para um livro que não existe.

A unicidade é do LUGAR: marcar duas vezes o mesmo ponto é um marcador só, e a
restrição está no banco porque duas abas conseguem o que um clique duplo não
consegue.
"""

from alembic import op
import sqlalchemy as sa

revision = "b8c9d0e1f2a3"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "marcadores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("capitulo", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deslocamento", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trecho", sa.Text(), nullable=False, server_default=""),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["processing_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "pessoa_id", "job_id", "capitulo", "deslocamento",
            name="uq_marcadores_lugar",
        ),
    )
    op.create_index(op.f("ix_marcadores_id"), "marcadores", ["id"], unique=False)
    op.create_index(op.f("ix_marcadores_pessoa_id"), "marcadores", ["pessoa_id"], unique=False)
    op.create_index(op.f("ix_marcadores_job_id"), "marcadores", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_marcadores_job_id"), table_name="marcadores")
    op.drop_index(op.f("ix_marcadores_pessoa_id"), table_name="marcadores")
    op.drop_index(op.f("ix_marcadores_id"), table_name="marcadores")
    op.drop_table("marcadores")
