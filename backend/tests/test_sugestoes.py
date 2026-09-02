"""As sugestoes de ligacao entre notas.

O teste que importa nao e "a funcao devolve uma lista": e se o que ela sugere faz
sentido para quem le. Cada caso aqui e um par de notas com uma relacao nomeada, e
o teste diz em que faixa ele cai.
"""
from dataclasses import dataclass
from typing import Optional

from app.services.sugestoes_service import PROXIMAS, TALVEZ, faixa, sugerir


@dataclass
class Nota:
    id: int
    trecho: str
    comentario: str = ""
    cor: str = "amarelo"
    origem: str = ""
    job_id: Optional[int] = None


def test_faixas_estao_em_ordem():
    """A ordem e o que a decisao exige — nao o valor exato de cada corte."""
    assert TALVEZ < PROXIMAS
    assert faixa(PROXIMAS + 5) == "proximas"
    assert faixa(PROXIMAS) == "proximas"
    assert faixa(PROXIMAS - 1) == "talvez"
    assert faixa(TALVEZ) == "talvez"
    assert faixa(TALVEZ - 1) is None
    assert faixa(0) is None


def test_notas_do_mesmo_assunto_ficam_proximas():
    a = Nota(1, "A repetição fotográfica produz um padrão que a foto isolada não produz.")
    b = Nota(2, "Uma foto isolada é lembrança; a repetição fotográfica vira padrão de registro.")
    (s,) = sugerir(a, [b])
    assert s["faixa"] == "proximas"
    assert s["quantas"] >= PROXIMAS
    # A EVIDENCIA VAI JUNTO: sem as palavras, a sugestao nao pode ser discordada.
    # AS PALAVRAS SAEM ACENTUADAS, como a pessoa escreveu — nao na forma
    # normalizada que a comparacao usa por dentro. O portao pegou isso: a tela
    # mostrava "tambem" e "memoria" para quem escreveu "também" e "memória".
    assert "repetição" in s["palavras"] and "fotográfica" in s["palavras"]
    assert not any(p in s["palavras"] for p in ("repeticao", "fotografica"))


def test_uma_palavra_em_comum_nao_sugere_nada():
    """E o risco registrado no C16: uma palavra e generoso demais."""
    a = Nota(1, "O acervo cresce e nada o segura.")
    b = Nota(2, "O acervo de fotografias antigas da cidade.")
    assert sugerir(a, [b]) == []


def test_duas_palavras_caem_em_talvez_e_nao_em_proximas():
    a = Nota(1, "A memória do lugar onde se marcou muda a releitura.")
    b = Nota(2, "Releitura de memória sem contexto vira outra coisa.")
    (s,) = sugerir(a, [b])
    assert s["faixa"] == "talvez"


def test_o_comentario_conta_tanto_quanto_o_trecho():
    """Quem escreve ao lado costuma NOMEAR o assunto que o trecho so mostra."""
    a = Nota(1, "Ele parou o carro e olhou.", comentario="ancoragem, negociação, primeiro número")
    b = Nota(2, "O primeiro número dito vira a âncora de toda a negociação seguinte.")
    (s,) = sugerir(a, [b])
    assert s["faixa"] in ("talvez", "proximas")
    assert "negociação" in s["palavras"]


def test_a_propria_nota_nunca_aparece():
    a = Nota(1, "Repetição fotográfica produz padrão de registro visual.")
    assert sugerir(a, [a]) == []


def test_palavras_vazias_e_curtas_nao_ligam_nada():
    """Sem isto, "para o que e um dia" ligaria metade do acervo."""
    a = Nota(1, "Isso é para o que ele fez no dia em que foi lá.")
    b = Nota(2, "Foi para o dia em que isso não deu para ser feito.")
    assert sugerir(a, [b]) == []


def test_nota_vazia_nao_quebra_nem_sugere():
    assert sugerir(Nota(1, ""), [Nota(2, "qualquer coisa escrita aqui")]) == []
    assert sugerir(Nota(1, "assunto qualquer escrito"), []) == []


def test_ordena_da_mais_proxima_para_a_menos_e_respeita_o_teto():
    base = "repetição fotográfica padrão registro decisão"
    a = Nota(1, base)
    muitas = [
        Nota(2, "repetição fotográfica padrão registro decisão idêntica"),   # 5
        Nota(3, "repetição fotográfica padrão"),                              # 3
        Nota(4, "repetição fotográfica"),                                     # 2
    ]
    fora = sugerir(a, muitas)
    assert [s["id"] for s in fora] == [2, 3, 4]
    assert fora[0]["quantas"] > fora[-1]["quantas"]
    assert len(sugerir(a, muitas, teto=2)) == 2


# ---------------------------------------------------------------------------
# Os grupos — "Você ligou" (nó 895:8849)
# ---------------------------------------------------------------------------

class _Nota:
    """O mínimo que `agrupar` lê. Não é um `Nota` do banco de propósito: o
    serviço é função pura, e amarrá-lo ao ORM faria o teste precisar de sessão
    para provar aritmética de conjuntos."""

    def __init__(self, id, trecho, job_id, comentario=""):
        self.id = id
        self.trecho = trecho
        self.comentario = comentario
        self.cor = "amarelo"
        self.job_id = job_id
        self.origem = "livro"


def test_grupo_precisa_atravessar_livros():
    """Três notas do mesmo capítulo falando do mesmo assunto não é descoberta
    nenhuma — é o capítulo. O que a seção celebra é a travessia."""
    from app.services.sugestoes_service import agrupar

    mesmo_livro = [
        _Nota(1, "A repeticao fotografica produz imagem em dado bruto", 7),
        _Nota(2, "Repeticao fotografica: imagem produz dado quando comparada", 7),
        _Nota(3, "Comparar imagem produz dado, e a repeticao fotografica sustenta", 7),
    ]
    assert agrupar(mesmo_livro) == []

    espalhadas = [
        _Nota(1, "A repeticao fotografica produz imagem em dado bruto", 7),
        _Nota(2, "Repeticao fotografica: imagem produz dado quando comparada", 8),
        _Nota(3, "Comparar imagem produz dado, e a repeticao fotografica sustenta", 9),
    ]
    grupos = agrupar(espalhadas)
    assert len(grupos) == 1
    assert grupos[0]["quantas"] == 3
    assert grupos[0]["livros"] == 3


def test_grupo_precisa_de_tres_notas():
    """Com duas, a ligação entre as duas já diz tudo — e ela aparece na página
    de cada uma."""
    from app.services.sugestoes_service import agrupar

    duas = [
        _Nota(1, "A repeticao fotografica produz imagem em dado bruto", 7),
        _Nota(2, "Repeticao fotografica: imagem produz dado quando comparada", 8),
    ]
    assert agrupar(duas) == []


def test_o_fio_e_transitivo():
    """A e C acabam juntas sem dividirem palavra nenhuma, desde que as duas
    dividam com B. É o que se quer de um assunto: não uma frase repetida, um
    fio."""
    from app.services.sugestoes_service import agrupar

    fio = [
        _Nota(1, "expedicao caderno registro material bruto", 7),
        _Nota(2, "expedicao caderno registro material somado comparacao imagem repeticao", 8),
        _Nota(3, "comparacao imagem repeticao somado dado", 9),
    ]
    grupos = agrupar(fio)
    assert len(grupos) == 1
    assert {n["id"] for n in grupos[0]["notas"]} == {1, 2, 3}


def test_as_palavras_saem_com_acento_como_a_pessoa_escreveu():
    """Normalizar para comparar é correto; mostrar o resultado da normalização é
    devolver à pessoa uma versão pior do que ela escreveu."""
    from app.services.sugestoes_service import agrupar

    # QUATRO palavras em comum, e não três: `PROXIMAS` é 4, e com três o grupo
    # não se forma — foi assim que este teste falhou na primeira escrita.
    notas = [
        _Nota(1, "A memória fotográfica sustenta a comparação do material", 7),
        _Nota(2, "memória fotográfica e comparação de material", 8),
        _Nota(3, "material, memória fotográfica, comparação", 9),
    ]
    palavras = agrupar(notas)[0]["palavras"]
    assert "memória" in palavras
    assert "memoria" not in palavras


def test_notas_sem_assunto_em_comum_nao_viram_grupo():
    from app.services.sugestoes_service import agrupar

    soltas = [
        _Nota(1, "expedicao caderno registro material bruto", 7),
        _Nota(2, "arquitetura urbana malha quadra desenho", 8),
        _Nota(3, "cozinha receita fermento farinha tempo", 9),
    ]
    assert agrupar(soltas) == []


def test_a_rota_devolve_os_criterios(client):
    """Critério escondido é critério em que ninguém pode discordar — a mesma
    regra dos cortes das faixas."""
    r = client.get("/notas/agrupadas")
    assert r.status_code == 200
    corpo = r.json()
    assert set(corpo["criterios"]) == {"palavras", "notas", "livros"}
    assert isinstance(corpo["grupos"], list)
    assert corpo["teto"] >= corpo["olhadas"]


def test_agrupadas_nao_e_lida_como_id_de_nota(client):
    """`/notas/agrupadas` vem ANTES de `/notas/{id}/...` na declaração: sem
    isso o FastAPI tenta ler "agrupadas" como um número. O mesmo cuidado que
    `/notas/importar` já exigiu."""
    assert client.get("/notas/agrupadas").status_code == 200


def test_estranho_nao_ve_os_grupos_de_ninguem(client_cru):
    assert client_cru.get("/notas/agrupadas").status_code == 401
