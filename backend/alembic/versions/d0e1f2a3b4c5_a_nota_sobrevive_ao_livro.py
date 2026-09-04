"""A nota sobrevive ao livro.

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-09-03

A `DEC-0021 §15` manda: a nota **sobrevive à exclusão do item**, com a origem
marcada como removida. A razão está escrita na norma e não é de conveniência —
é trabalho intelectual de quem escreveu, e não derivado do arquivo.

O esquema fazia o contrário. `notas.job_id` tinha `ondelete="CASCADE"`, então
apagar um livro apagava as notas dele, e o código sabia: o docstring de
`remover_da_estante` escrevia "AS NOTAS SAEM JUNTO, por cascata". O produto
avisava antes — era honesto — e mesmo assim destruía o que a norma manda
preservar. Pela ordem de autoridade do `docs/README.md`, isso é bug.

DUAS MUDANÇAS, E A SEGUNDA É O QUE FAZ A PRIMEIRA VALER
=======================================================
`SET NULL` sozinho deixaria uma nota sem livro e sem explicação — indistinguível
da nota escrita no Canvas, que nunca teve livro. São coisas diferentes e a tela
precisa dizer qual é qual.

Por isso `origem_removida_em`: a data em que a origem saiu. Nula é o normal.

O MOLDE VEM DO CANVAS
=====================
"O contêiner some e o conteúdo fica" já foi resolvido aqui, em `dissolver`: a
seção é apagada, os membros continuam, e o vínculo é guardado para poder voltar.
A diferença é que um livro apagado não volta — então o que se guarda não é o
vínculo, é o NOME: `origem` recebe o título do livro antes de ele sumir, para a
nota poder dizer de onde veio depois que o de-onde não existe mais.

SQLITE NÃO ALTERA CHAVE ESTRANGEIRA
===================================
Ele recria a tabela. `batch_alter_table` faz isso — tabela nova, cópia, troca —,
e é por isso que a convenção de nomes existe no `metadata`: sem nome, a restrição
não é copiada e a migração para com "Constraint must have a name".
"""

from alembic import op
import sqlalchemy as sa

revision = "d0e1f2a3b4c5"
down_revision = "c9d0e1f2a3b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notas", sa.Column("origem_removida_em", sa.DateTime(), nullable=True))
    with op.batch_alter_table("notas", schema=None) as lote:
        lote.drop_constraint("fk_notas_job_id_processing_jobs", type_="foreignkey")
        lote.create_foreign_key(
            "fk_notas_job_id_processing_jobs", "processing_jobs",
            ["job_id"], ["id"], ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("notas", schema=None) as lote:
        lote.drop_constraint("fk_notas_job_id_processing_jobs", type_="foreignkey")
        lote.create_foreign_key(
            "fk_notas_job_id_processing_jobs", "processing_jobs",
            ["job_id"], ["id"], ondelete="CASCADE",
        )
    op.drop_column("notas", "origem_removida_em")
