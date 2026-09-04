"""A frente de Notas: a nota sem livro, a marca de revisar, e a sugestão dispensada.

POR QUE ESTE ARQUIVO EXISTE, e a primeira razão é um defeito que ninguém tinha
visto: **a nota sem livro não podia ser editada nem apagada.** As duas rotas
ficavam em `/jobs/{job_id}/notas/{nota_id}`, a nota do Canvas e a do Kindle têm
`job_id` NULO, e a tela chamava com `job_id ?? 0`. Medido em 03/09: 404 nas duas.
A página funciona para a nota de leitura, que é a maioria, e por isso o buraco
sobreviveu.

As outras duas são estado que o produto decidiu não manter à mão:

`revisar_desde` — marcar é explícito, porque é intenção. **Limpar é derivado:** a
nota sai da lista quando é editada depois da marca. Nunca envelhece, porque a
condição de saída é um fato e não uma tarefa.

`sugestoes_dispensadas` — o par que a pessoa recusou, normalizado, para a
sugestão não voltar. E **desfazível**, porque um gesto silencioso e permanente
mata a sugestão sem que ninguém saiba.
"""
from __future__ import annotations

import pytest
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def solta(client, test_engine):
    """Uma nota SEM livro — escrita no Canvas. É ela que o defeito atingia."""
    from app.models.nota import Nota
    from app.models.pessoa import Pessoa

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        eu = db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").first()
        n = Nota(pessoa_id=eu.id, job_id=None, fonte="solta",
                 trecho="um pensamento sem livro", comentario="")
        db.add(n)
        db.commit()
        db.refresh(n)
        return n.id
    finally:
        db.close()


def _nota(client, i):
    return next(n for n in client.get("/notas/todas").json() if n["id"] == i)


# ── a nota sem livro ────────────────────────────────────────────────────────

def test_a_nota_sem_livro_pode_ser_editada(client, solta):
    r = client.patch(f"/notas/{solta}", json={"comentario": "agora dá"})
    assert r.status_code == 200, r.text
    assert r.json()["comentario"] == "agora dá"


def test_a_nota_sem_livro_pode_ser_apagada(client, solta):
    assert client.delete(f"/notas/{solta}").status_code == 204
    assert all(n["id"] != solta for n in client.get("/notas/todas").json())


def test_a_nota_de_outra_pessoa_nao_se_alcanca(client, solta, test_engine):
    """O escopo saiu do trabalho e passou a ser o DONO — que é o que importava."""
    from datetime import timedelta

    from app.models.pessoa import Pessoa, Sessao, agora
    from app.services.acesso_service import resumir

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        outra = Pessoa(email="outra@mekora.local")
        db.add(outra)
        db.flush()
        token = "sessao-da-outra-em-notas"
        db.add(Sessao(pessoa_id=outra.id, resumo=resumir(token), expira_em=agora() + timedelta(days=1)))
        db.commit()
    finally:
        db.close()

    biscoito = {"mekora_sessao": token}
    assert client.patch(f"/notas/{solta}", json={"comentario": "x"}, cookies=biscoito).status_code == 404
    assert client.delete(f"/notas/{solta}", cookies=biscoito).status_code == 404


# ── a marca de revisar ──────────────────────────────────────────────────────

def test_marcar_para_revisar_guarda_a_data(client, solta):
    assert _nota(client, solta)["revisar_desde"] is None
    r = client.patch(f"/notas/{solta}", json={"revisar": True}).json()
    assert r["revisar_desde"] is not None


def test_a_marca_sobrevive_a_ela_mesma(client, solta):
    """Marcar move `atualizada_em` — e se a marca ficasse atrás dela, a nota
    sairia da lista no instante em que entrou."""
    r = client.patch(f"/notas/{solta}", json={"revisar": True}).json()
    assert r["revisar_desde"] >= r["atualizada_em"], "a marca nasceu já vencida"


def test_editar_depois_da_marca_TIRA_a_nota_da_lista(client, solta):
    """O que limpa é DERIVADO: `atualizada_em` maior que `revisar_desde`.

    O teste afirma a relação entre as duas datas, que é o critério, e não um
    campo booleano — porque campo booleano é justamente o que o produto decidiu
    não ter.
    """
    marcada = client.patch(f"/notas/{solta}", json={"revisar": True}).json()
    depois = client.patch(f"/notas/{solta}", json={"comentario": "mexi nela"}).json()
    assert depois["revisar_desde"] == marcada["revisar_desde"], "a marca foi apagada, e devia ficar"
    assert depois["atualizada_em"] > depois["revisar_desde"], "a edição não derrubou a marca"


def test_desmarcar_a_mao_continua_possivel(client, solta):
    client.patch(f"/notas/{solta}", json={"revisar": True})
    r = client.patch(f"/notas/{solta}", json={"revisar": False}).json()
    assert r["revisar_desde"] is None


# ── a sugestão dispensada ───────────────────────────────────────────────────

@pytest.fixture
def duas_parecidas(client, test_engine):
    """Duas notas que dividem palavras o bastante para uma sugerir a outra."""
    from app.models.nota import Nota
    from app.models.pessoa import Pessoa

    texto = "a repetição fotográfica transforma registro em comparação e dado"
    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        eu = db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").first()
        a = Nota(pessoa_id=eu.id, fonte="solta", trecho=texto, comentario="")
        b = Nota(pessoa_id=eu.id, fonte="solta", trecho=texto + " outra vez", comentario="")
        db.add_all([a, b])
        db.commit()
        return (a.id, b.id)
    finally:
        db.close()


def test_a_dispensada_some_da_sugestao(client, duas_parecidas):
    a, b = duas_parecidas
    antes = client.get(f"/notas/{a}/sugestoes").json()
    assert any(s["id"] == b for faixa in ("proximas", "talvez") for s in antes.get(faixa, [])), \
        "a semente não produziu sugestão — o resto do caso não prova nada"

    assert client.post(f"/notas/{a}/dispensar/{b}").status_code == 204

    depois = client.get(f"/notas/{a}/sugestoes").json()
    assert not any(s["id"] == b for faixa in ("proximas", "talvez") for s in depois.get(faixa, []))


def test_a_dispensa_vale_nos_DOIS_sentidos(client, duas_parecidas):
    """O par é normalizado. Sem isso, dispensar A→B e receber B→A traria de volta
    exatamente o que foi recusado."""
    a, b = duas_parecidas
    client.post(f"/notas/{a}/dispensar/{b}")

    daoutra = client.get(f"/notas/{b}/sugestoes").json()
    assert not any(s["id"] == a for faixa in ("proximas", "talvez") for s in daoutra.get(faixa, []))


def test_desfazer_devolve_a_sugestao(client, duas_parecidas):
    """Sem desfazer, dispensar seria silencioso E permanente."""
    a, b = duas_parecidas
    client.post(f"/notas/{a}/dispensar/{b}")
    assert client.delete(f"/notas/{a}/dispensar/{b}").status_code == 204

    devolta = client.get(f"/notas/{a}/sugestoes").json()
    assert any(s["id"] == b for faixa in ("proximas", "talvez") for s in devolta.get(faixa, []))


def test_dispensar_duas_vezes_e_uma_dispensa(client, duas_parecidas):
    a, b = duas_parecidas
    assert client.post(f"/notas/{a}/dispensar/{b}").status_code == 204
    assert client.post(f"/notas/{b}/dispensar/{a}").status_code == 204

    from app.models.dispensa import SugestaoDispensada
    from sqlalchemy.orm import sessionmaker

    # A unicidade é do PAR, e a segunda chamada veio na ordem invertida.
    lista = client.get("/privacidade").json()["itens"]
    quantas = next(i["quantos"] for i in lista if i["chave"] == "sugestoes_dispensadas")
    assert quantas == 1


# ── o recorte "sem ligação" ─────────────────────────────────────────────────

def test_a_lista_diz_quantas_ligacoes_cada_nota_tem(client, duas_parecidas):
    """O recorte "Sem ligação" precisa disto, e numa consulta só: um pedido por
    nota numa lista de trezentas é o jeito de fazer a página demorar."""
    a, b = duas_parecidas
    assert all(n["ligadas"] == 0 for n in client.get("/notas/todas").json())

    client.post("/canvas/ligacoes", json={"de_tipo": "nota", "de_id": a, "para_tipo": "nota", "para_id": b})

    contagens = {n["id"]: n["ligadas"] for n in client.get("/notas/todas").json()}
    assert contagens[a] == 1 and contagens[b] == 1
