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


# ---------------------------------------------------------------------------
# Rascunho — a nota que ficou pela metade (nó 895:7631)
# ---------------------------------------------------------------------------

def test_rascunho_nao_entra_em_estudo(client):
    """O Erik definiu em 02/09: rascunho é a nota "começada e não terminada,
    abandonada, logo não sendo possível ir para os estudos". A regra mora no
    SERVIDOR, e não só na tela — a tela pode esconder o botão, mas se a garantia
    for só dela, a mesma nota entra por outro caminho."""
    envio = client.post("/upload", files={"file": ("x.txt", b"texto de prova", "text/plain")})
    job_id = envio.json()["upload_id"]

    nota = client.post(f"/jobs/{job_id}/notas", json={
        "capitulo": 0, "de": 0, "ate": 5, "trecho": "texto", "cor": "amarelo",
    })
    assert nota.status_code == 201, nota.text
    nota_id = nota.json()["id"]

    estudo = client.post("/estudos/novo", json={"nome": "Um estudo", "sobre": ""})
    estudo_id = estudo.json()["id"]

    # Antes de marcar, entra.
    assert client.post(f"/estudos/{estudo_id}/notas", json={"nota_id": nota_id}).status_code == 201
    client.delete(f"/estudos/{estudo_id}/notas/{nota_id}")

    marcada = client.patch(f"/jobs/{job_id}/notas/{nota_id}", json={"estado": "rascunho"})
    assert marcada.status_code == 200
    assert marcada.json()["estado"] == "rascunho"

    recusa = client.post(f"/estudos/{estudo_id}/notas", json={"nota_id": nota_id})
    assert recusa.status_code == 409
    assert "rascunho" in recusa.json()["detail"]

    # E TIRAR A MARCA DEVOLVE: string vazia apaga o estado, e `None` não mexe.
    limpa = client.patch(f"/jobs/{job_id}/notas/{nota_id}", json={"estado": ""})
    assert limpa.json()["estado"] is None
    assert client.post(f"/estudos/{estudo_id}/notas", json={"nota_id": nota_id}).status_code == 201


def test_estado_desconhecido_e_recusado(client):
    """A lista de estados existe para o segundo entrar por ela, e não como um
    `if` espalhado — e para um valor inventado não virar coluna com lixo."""
    envio = client.post("/upload", files={"file": ("x.txt", b"texto", "text/plain")})
    job_id = envio.json()["upload_id"]
    nota_id = client.post(f"/jobs/{job_id}/notas", json={
        "capitulo": 0, "de": 0, "ate": 5, "trecho": "texto", "cor": "amarelo",
    }).json()["id"]

    r = client.patch(f"/jobs/{job_id}/notas/{nota_id}", json={"estado": "arquivada"})
    assert r.status_code == 422


def test_rascunho_fica_de_fora_de_voce_ligou(client):
    """A seção oferece juntar o grupo num estudo, e rascunho não entra em
    estudo: um grupo com um dentro traria um botão que responde 409 na metade."""
    envio = client.post("/upload", files={"file": ("x.txt", b"texto", "text/plain")})
    job_id = envio.json()["upload_id"]

    ids = []
    for i in range(3):
        ids.append(client.post(f"/jobs/{job_id}/notas", json={
            "capitulo": i, "de": 0, "ate": 5,
            "trecho": "repeticao fotografica imagem comparacao registro",
            "cor": "amarelo",
        }).json()["id"])

    antes = client.get("/notas/agrupadas").json()["olhadas"]
    client.patch(f"/jobs/{job_id}/notas/{ids[0]}", json={"estado": "rascunho"})
    depois = client.get("/notas/agrupadas").json()["olhadas"]
    assert depois == antes - 1


# ---------------------------------------------------------------------------
# Ignorar um grupo (nó 895:8849)
# ---------------------------------------------------------------------------

def _tres_notas_parecidas(client):
    """TRÊS LIVROS DIFERENTES, e não três capítulos do mesmo.

    Um grupo precisa atravessar livros para existir — três notas do mesmo
    capítulo sobre o mesmo assunto é o capítulo, não uma descoberta. Escrevi este
    ajudante com um livro só na primeira vez, e os dois testes falharam com
    `len([]) == 1`: o grupo nunca se formava, e a razão era a regra funcionando."""
    jobs, ids = [], []
    for i in range(3):
        envio = client.post("/upload", files={"file": (f"x{i}.txt", b"texto", "text/plain")})
        job_id = envio.json()["upload_id"]
        jobs.append(job_id)
        ids.append(client.post(f"/jobs/{job_id}/notas", json={
            "capitulo": 0, "de": 0, "ate": 5,
            "trecho": "repeticao fotografica imagem comparacao registro",
            "cor": "amarelo",
        }).json()["id"])
    return jobs[0], ids


def test_assinatura_de_um_grupo_nao_depende_da_ordem():
    """A varredura devolve na ordem em que a união de conjuntos encontrou, e ela
    não é estável entre execuções. Sem ordenar, o mesmo grupo teria duas
    assinaturas e "ignorar" pararia de funcionar na segunda visita."""
    from app.services.sugestoes_service import assinatura_de

    assert assinatura_de([3, 1, 2]) == assinatura_de([1, 2, 3]) == "1,2,3"
    # Repetido não muda: é um CONJUNTO.
    assert assinatura_de([2, 2, 1]) == "1,2"


def test_ignorar_um_grupo_e_lembrado(client):
    """Um botão que esquece ao recarregar é pior que botão nenhum: ele ensina
    que o produto não escuta."""
    _, ids = _tres_notas_parecidas(client)

    antes = client.get("/notas/agrupadas").json()
    assert len(antes["grupos"]) == 1
    assert antes["calados"] == 0

    assert client.post("/notas/agrupadas/ignorar", json={"notas": ids}).status_code == 204

    depois = client.get("/notas/agrupadas").json()
    assert depois["grupos"] == []
    assert depois["calados"] == 1

    # DUAS VEZES NÃO ESCREVE DUAS LINHAS: dois cliques rápidos fariam a lista
    # crescer por acidente.
    client.post("/notas/agrupadas/ignorar", json={"notas": ids})
    assert client.get("/notas/agrupadas").json()["calados"] == 1

    # E DÁ PARA VOLTAR. Ignorar não é apagar: é dizer "já entendi", que é o tipo
    # de coisa de que a pessoa muda de ideia.
    assert client.delete("/notas/agrupadas/ignorados").status_code == 204
    assert len(client.get("/notas/agrupadas").json()["grupos"]) == 1


def test_grupo_ignorado_que_ganha_nota_nova_volta(client):
    """A consequência é escolhida, e é a certa: a assinatura muda, e o Mekora tem
    coisa nova a dizer sobre aquele assunto."""
    job_id, ids = _tres_notas_parecidas(client)
    client.post("/notas/agrupadas/ignorar", json={"notas": ids})
    assert client.get("/notas/agrupadas").json()["grupos"] == []

    client.post(f"/jobs/{job_id}/notas", json={
        "capitulo": 9, "de": 0, "ate": 5,
        "trecho": "repeticao fotografica imagem comparacao registro",
        "cor": "amarelo",
    })
    assert len(client.get("/notas/agrupadas").json()["grupos"]) == 1


def test_nao_da_para_calar_grupo_com_nota_de_outra_pessoa(client, client_cru):
    """Sem conferir as notas, mandar ids alheios calaria um grupo de outra
    pessoa — e, pior, contaria que aqueles ids existem."""
    r = client.post("/notas/agrupadas/ignorar", json={"notas": [999_999]})
    assert r.status_code == 404
    assert client.post("/notas/agrupadas/ignorar", json={"notas": []}).status_code == 422
    assert client_cru.post("/notas/agrupadas/ignorar", json={"notas": [1]}).status_code == 401


# ---------------------------------------------------------------------------
# Quanto costuma levar (nó 895:8029)
# ---------------------------------------------------------------------------

def test_etapa_com_poucas_medidas_nao_aparece(test_engine):
    """Previsão sem base é invenção com cara de dado. Com uma conversão, o número
    é aquela conversão.

    O BANCO É O DO TESTE, e não o `SessionLocal` global. A primeira versão usava
    o global, que é escrito por toda a suíte: ela esperava a tabela vazia e
    encontrou trinta e quatro medidas de `analyze` de outros testes — e, pior,
    passava ou falhava conforme a ordem em que a suíte rodasse."""
    from sqlalchemy.orm import sessionmaker

    from app.models.stage_metric import StageMetric
    from app.services.metrics_service import MINIMO_PARA_ESTIMAR, quanto_costuma_levar

    db = sessionmaker(bind=test_engine)()
    try:
        for _ in range(MINIMO_PARA_ESTIMAR - 1):
            db.add(StageMetric(job_id=1, stage="prova_poucas", status="completed", duration_ms=900))
        db.commit()
        fora = quanto_costuma_levar(db)
        assert "prova_poucas" not in fora["etapas"]
        assert fora["minimo"] == MINIMO_PARA_ESTIMAR
    finally:
        db.close()


def test_a_mediana_ignora_a_execucao_esquisita(test_engine):
    """MEDIANA, e não média: uma conversão que travou e demorou vinte minutos
    puxa a média para um número que nunca vai acontecer de novo."""
    from sqlalchemy.orm import sessionmaker

    from app.models.stage_metric import StageMetric
    from app.services.metrics_service import quanto_costuma_levar

    db = sessionmaker(bind=test_engine)()
    try:
        for ms in (1000, 1100, 1200, 1300, 1_200_000):
            db.add(StageMetric(job_id=1, stage="prova_mediana", status="completed", duration_ms=ms))
        # Uma que FALHOU não entra: o tempo até quebrar não descreve o normal.
        db.add(StageMetric(job_id=1, stage="prova_mediana", status="failed", duration_ms=50))
        db.commit()

        medido = quanto_costuma_levar(db)["etapas"]["prova_mediana"]
        # A média destes cinco seria 240 segundos — quatro minutos que nunca vão
        # acontecer de novo. A mediana é 1,2.
        assert medido["segundos"] == 1.2
        assert medido["medidas"] == 5
    finally:
        db.close()


def test_eventos_de_uso_sao_apagados_depois_de_noventa_dias(test_engine, monkeypatch):
    """Eles não eram apagados nunca, por ausência de regra — e "para sempre" é o
    prazo que ninguém escolhe e todo mundo acaba tendo.

    Noventa dias é o que a MEDIDA precisa: a estimativa de "costuma levar" exige
    cinco execuções da mesma etapa, e num uso de fim de semana isso leva semanas
    para acumular. Trinta apagaria a base antes de ela virar número.
    """
    from datetime import datetime, timedelta

    from sqlalchemy.orm import sessionmaker

    import app.db.database as db_mod
    from app.models.stage_metric import StageMetric
    from app.services.cleanup_service import DIAS_DOS_EVENTOS, limpar_eventos_antigos

    assert DIAS_DOS_EVENTOS == 90

    Sessao = sessionmaker(bind=test_engine)
    monkeypatch.setattr(db_mod, "SessionLocal", Sessao)

    db = Sessao()
    agora = datetime.utcnow()
    db.add(StageMetric(job_id=1, stage="prova_prazo", status="completed",
                       duration_ms=100, created_at=agora - timedelta(days=91)))
    db.add(StageMetric(job_id=2, stage="prova_prazo", status="completed",
                       duration_ms=100, created_at=agora - timedelta(days=89)))
    db.commit()
    db.close()

    saíram = limpar_eventos_antigos()
    assert saíram == 1

    db = Sessao()
    try:
        ficaram = db.query(StageMetric).filter(StageMetric.stage == "prova_prazo").all()
        assert len(ficaram) == 1, "só o de 91 dias tinha de sair"
    finally:
        db.close()


def test_a_limpeza_de_eventos_nunca_levanta(monkeypatch):
    """Ela roda no startup, e uma falha aqui não pode impedir o servidor de
    subir — pelo mesmo motivo que o `record_stage` não levanta ao escrever."""
    import app.db.database as db_mod
    from app.services.cleanup_service import limpar_eventos_antigos

    def quebrado():
        raise RuntimeError("banco fora do ar")

    monkeypatch.setattr(db_mod, "SessionLocal", quebrado)
    assert limpar_eventos_antigos() == 0
