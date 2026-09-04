"""A marca de revisar, e a sugestão dispensada.

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-09-03

Duas coisas da frente de Notas, e as duas existem para que um estado do produto
pare de ser mantido à mão.

`notas.revisar_desde` — QUANDO a pessoa marcou "revisar depois". Guarda a data, e
não um `true`, porque o que TIRA a marca é derivado dela: a nota sai da lista
quando é editada DEPOIS da marca, e isso se lê comparando `revisar_desde` com
`atualizada_em`. Marcar é explícito, porque é intenção e intenção não se deduz;
limpar é fato, e por isso nunca envelhece. É o "estado derivado, corrigível à
mão" do `CLAUDE.md` — e desmarcar continua possível.

`sugestoes_dispensadas` — o par que a pessoa recusou. O `SISTEMA.md` já declarava
a relação **dispensada** como forma vigente: *"a pessoa recusou a sugestão, e ela
não volta — uma sugestão que volta na próxima visita deixa de ser sugestão e vira
insistência"*. Existia para grupos, nos Estudos (`grupos_ignorados`), e não
existia no nível da nota.

O PAR É NORMALIZADO, como nas ligações: `a_id < b_id`, sempre. Sem isso,
dispensar A→B e depois receber a sugestão B→A traria de volta exatamente o que
foi recusado, e a pessoa veria a insistência que a norma proíbe.
"""

from alembic import op
import sqlalchemy as sa

revision = "e1f2a3b4c5d6"
down_revision = "d0e1f2a3b4c5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notas", sa.Column("revisar_desde", sa.DateTime(), nullable=True))

    op.create_table(
        "sugestoes_dispensadas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=False),
        sa.Column("a_id", sa.Integer(), nullable=False),
        sa.Column("b_id", sa.Integer(), nullable=False),
        sa.Column("criada_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoas.id"], ondelete="CASCADE"),
        # AS PONTAS SÃO NOTAS, e as notas somem quando a pessoa as apaga. A
        # dispensa de um par cuja nota não existe mais é lixo, e sai junto.
        sa.ForeignKeyConstraint(["a_id"], ["notas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["b_id"], ["notas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pessoa_id", "a_id", "b_id", name="uq_sugestoes_dispensadas_par"),
    )
    op.create_index(op.f("ix_sugestoes_dispensadas_id"), "sugestoes_dispensadas", ["id"], unique=False)
    op.create_index(op.f("ix_sugestoes_dispensadas_pessoa_id"), "sugestoes_dispensadas", ["pessoa_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sugestoes_dispensadas_pessoa_id"), table_name="sugestoes_dispensadas")
    op.drop_index(op.f("ix_sugestoes_dispensadas_id"), table_name="sugestoes_dispensadas")
    op.drop_table("sugestoes_dispensadas")
    op.drop_column("notas", "revisar_desde")
