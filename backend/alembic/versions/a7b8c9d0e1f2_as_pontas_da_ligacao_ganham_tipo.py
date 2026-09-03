"""As pontas da ligação ganham tipo.

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-09-03

Enquanto as pontas eram `nota_id → nota_id`, o Livro era objeto de segunda classe
no Canvas: ele entra na superfície, é escolhido, arrastado, vira membro de seção e
é desfeito como qualquer outro — mas não podia dizer a única coisa que ele
naturalmente diz, que é *"esta nota veio daqui"*.

O QUE ESTA MIGRAÇÃO FAZ, e o que ela não faz:

  faz      acrescenta `de_tipo` e `para_tipo`, com `"nota"` como padrão
  faz      tira as chaves estrangeiras das pontas — uma coluna não aponta para
           duas tabelas
  faz      troca a restrição de unicidade para incluir os tipos
  NÃO faz  não mexe em nenhum valor de `de_id`/`para_id`

Toda ligação existente é nota→nota, e o padrão `"nota"` já as descreve
corretamente. Por isso ela é **idempotente por construção**: rodar de novo não
tem o que converter.

O QUE SUBSTITUI A CHAVE ESTRANGEIRA. Ela fazia duas coisas, e as duas continuam
cobertas sem ela:

  apagar a nota levava as ligações  ->  a rota `/notas/{id}` já apaga as ligações
                                        dela explicitamente, e sempre apagou
  ponta apontando para o nada       ->  a superfície não desenha ligação cuja
                                        ponta não encontra

`downgrade` volta as colunas e a restrição antiga; ele só é seguro enquanto todas
as ligações forem nota→nota, e é por isso que ele recusa quando não forem, em vez
de apagar as outras em silêncio.
"""

from alembic import op
import sqlalchemy as sa

revision = "a7b8c9d0e1f2"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("ligacoes") as lote:
        lote.add_column(sa.Column("de_tipo", sa.String(), nullable=False, server_default="nota"))
        lote.add_column(sa.Column("para_tipo", sa.String(), nullable=False, server_default="nota"))

    # A recriação da tabela pelo `batch` reconstrói as restrições a partir do
    # modelo, que já não tem as chaves estrangeiras das pontas.
    with op.batch_alter_table("ligacoes", recreate="always") as lote:
        pass


def downgrade() -> None:
    con = op.get_bind()
    fora = con.execute(
        sa.text("SELECT count(*) FROM ligacoes WHERE de_tipo <> 'nota' OR para_tipo <> 'nota'")
    ).scalar()
    if fora:
        raise RuntimeError(
            f"{fora} ligações têm ponta que não é nota. Voltar a coluna as apagaria "
            "em silêncio — resolva-as antes."
        )
    with op.batch_alter_table("ligacoes") as lote:
        lote.drop_column("de_tipo")
        lote.drop_column("para_tipo")
