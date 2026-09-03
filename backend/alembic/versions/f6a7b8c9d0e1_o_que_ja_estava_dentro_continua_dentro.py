"""O que já estava dentro continua dentro.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-02

A migração anterior trocou pertencimento GEOMÉTRICO por EXPLÍCITO. Sem esta, todo
objeto que hoje está dentro de uma seção vira não-membro no instante em que o
código sobe: a área continua desenhada em volta dele e deixa de levá-lo junto.

Medido antes de escrever isto: a seção andou 140px e a nota de dentro andou 0.

Quem reabrisse o Canvas amanhã encontraria a organização de ontem intacta na tela
e morta no comportamento — que é a pior forma de perder alguma coisa, porque não
parece perda.

A conversão usa a regra do CENTRO, que era a que valia antes, e desempata pela
MENOR seção: com duas áreas cobrindo o mesmo ponto, a mais apertada é a mais
específica. O desempate é uma decisão nova, e ela só existe aqui — em tempo de
uso quem decide é o gesto.

`downgrade` limpa os vínculos, e não tem como não limpar: a informação de "quem
estava dentro de quem" volta a ser derivável da geometria, que é de onde ela veio.
"""

from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None

# A altura de um cartão não está no banco — ela vem do texto, e só o navegador a
# sabe. Estes são os valores que a tela usa como piso quando ainda não mediu, e
# são o mais próximo da verdade que este lado tem.
ALTURA_NOTA = 200
ALTURA_LIVRO = 420
LARGURA_LIVRO = 280


def _vincular(con, tabela, largura_padrao, altura):
    grupos = con.execute(
        sa.text(
            "SELECT id, pessoa_id, x, y, largura, altura FROM canvas_grupos "
            "WHERE apagado_em IS NULL"
        )
    ).fetchall()
    itens = con.execute(sa.text(f"SELECT id, pessoa_id, x, y, largura FROM {tabela}")).fetchall()

    for item in itens:
        cx = item.x + (item.largura or largura_padrao) / 2
        cy = item.y + altura / 2
        dentro = [
            g
            for g in grupos
            if g.pessoa_id == item.pessoa_id
            and g.x <= cx <= g.x + g.largura
            and g.y <= cy <= g.y + g.altura
        ]
        if not dentro:
            continue
        # A MENOR ganha: com duas áreas cobrindo o mesmo ponto, a mais apertada é
        # a mais específica.
        escolhida = min(dentro, key=lambda g: g.largura * g.altura)
        con.execute(
            sa.text(f"UPDATE {tabela} SET grupo_id = :g WHERE id = :i"),
            {"g": escolhida.id, "i": item.id},
        )


def upgrade() -> None:
    con = op.get_bind()
    _vincular(con, "canvas_nos", 375, ALTURA_NOTA)
    _vincular(con, "canvas_livros", LARGURA_LIVRO, ALTURA_LIVRO)


def downgrade() -> None:
    con = op.get_bind()
    con.execute(sa.text("UPDATE canvas_nos SET grupo_id = NULL"))
    con.execute(sa.text("UPDATE canvas_livros SET grupo_id = NULL"))
