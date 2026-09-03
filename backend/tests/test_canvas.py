"""As guardas de dono do Canvas.

POR QUE ESTE ARQUIVO EXISTE: as pontas de uma ligação são polimórficas —
`de_tipo`/`de_id` e `para_tipo`/`para_id` —, e uma coluna não pode apontar para
duas tabelas. Não há chave estrangeira, então a única coisa entre a superfície
de uma pessoa e a de outra é uma função Python: `_ponta_existe`. O mesmo vale
para `grupo_id`, que existe como chave estrangeira mas não diz de quem é a
seção.

Uma guarda que só existe em código precisa de um teste que a veja recusar.
"""
from __future__ import annotations

from datetime import timedelta

import pytest
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def outra(test_engine):
    """Uma segunda pessoa, com sessão própria. É ela quem prova a porta."""
    from app.models.pessoa import Pessoa, Sessao, agora
    from app.services.acesso_service import resumir

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        pessoa = Pessoa(email="outra@mekora.local")
        db.add(pessoa)
        db.flush()
        token = "sessao-da-outra"
        db.add(Sessao(pessoa_id=pessoa.id, resumo=resumir(token), expira_em=agora() + timedelta(days=1)))
        db.commit()
        return {"id": pessoa.id, "cookies": {"mekora_sessao": token}}
    finally:
        db.close()


def _nota_de(client, texto, cookies=None):
    r = client.post("/canvas/nos", json={"texto": texto, "x": 0, "y": 0}, cookies=cookies)
    assert r.status_code == 201, r.text
    return r.json()


def _secao_de(client, nome, cookies=None):
    r = client.post("/canvas/grupos", json={"nome": nome, "x": 0, "y": 0, "largura": 400, "altura": 300}, cookies=cookies)
    assert r.status_code == 201, r.text
    return r.json()


def test_a_superficie_so_traz_o_que_e_meu(client, outra):
    _nota_de(client, "minha nota")
    _secao_de(client, "minha seção")
    _nota_de(client, "nota da outra", cookies=outra["cookies"])
    _secao_de(client, "seção da outra", cookies=outra["cookies"])

    meu = client.get("/canvas/superficie").json()
    textos = [n.get("texto") for n in meu["nos"]]
    nomes = [g.get("nome") for g in meu["grupos"]]
    assert "minha nota" in textos
    assert "nota da outra" not in textos
    assert "seção da outra" not in nomes


def test_nao_se_liga_a_nota_de_outra_pessoa(client, outra):
    minha = _nota_de(client, "minha")
    dela = _nota_de(client, "dela", cookies=outra["cookies"])

    r = client.post("/canvas/ligacoes", json={
        "de_tipo": "nota", "de_id": minha["nota_id"],
        "para_tipo": "nota", "para_id": dela["nota_id"],
    })
    assert r.status_code in (400, 404), r.text
    assert client.get("/canvas/superficie").json()["ligacoes"] == []


def test_nao_se_liga_ao_livro_de_outra_pessoa(client, outra, test_engine):
    from app.models.processing_job import ProcessingJob

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        job = ProcessingJob(original_filename="dela.pdf", dono_id=outra["id"])
        db.add(job)
        db.commit()
        job_id = job.id
    finally:
        db.close()

    minha = _nota_de(client, "minha")
    r = client.post("/canvas/ligacoes", json={
        "de_tipo": "nota", "de_id": minha["nota_id"],
        "para_tipo": "livro", "para_id": job_id,
    })
    assert r.status_code in (400, 404), r.text


def test_nao_se_traz_o_livro_de_outra_pessoa_para_a_minha_superficie(client, outra, test_engine):
    from app.models.processing_job import ProcessingJob

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        job = ProcessingJob(original_filename="dela.pdf", dono_id=outra["id"])
        db.add(job)
        db.commit()
        job_id = job.id
    finally:
        db.close()

    r = client.post("/canvas/livros", json={"job_id": job_id, "x": 0, "y": 0})
    assert r.status_code == 404, r.text


def test_nao_se_entra_na_secao_de_outra_pessoa(client, outra):
    minha = _nota_de(client, "minha")
    dela = _secao_de(client, "seção dela", cookies=outra["cookies"])

    r = client.patch(f"/canvas/nos/{minha['id']}", json={"x": 10, "y": 10, "grupo_id": dela["id"]})
    assert r.status_code in (400, 404), r.text

    no = next(n for n in client.get("/canvas/superficie").json()["nos"] if n["id"] == minha["id"])
    assert no.get("grupo_id") is None


def test_a_secao_de_outra_pessoa_nao_se_renomeia_nem_se_dissolve(client, outra):
    dela = _secao_de(client, "seção dela", cookies=outra["cookies"])
    assert client.patch(f"/canvas/grupos/{dela['id']}", json={"nome": "roubada"}).status_code == 404
    assert client.delete(f"/canvas/grupos/{dela['id']}").status_code == 404


def test_dissolver_a_secao_nao_leva_o_conteudo(client):
    secao = _secao_de(client, "estudo")
    nota = _nota_de(client, "dentro")
    assert client.patch(f"/canvas/nos/{nota['id']}", json={"x": 10, "y": 10, "grupo_id": secao["id"]}).status_code == 204
    assert client.delete(f"/canvas/grupos/{secao['id']}").status_code == 204

    superficie = client.get("/canvas/superficie").json()
    vivas = [n for n in superficie["nos"] if n["id"] == nota["id"]]
    assert len(vivas) == 1, "dissolver a seção apagou a nota que estava dentro"
    assert [g for g in superficie["grupos"] if g["id"] == secao["id"]] == []
    # O `grupo_id` FICA APONTANDO para a seção dissolvida, e é de propósito: é
    # o que permite a `voltar` devolver a seção COM o conteúdo. Uma seção que
    # sumiu não aparece na superfície, então o id pendurado não desenha nada.
    assert vivas[0].get("grupo_id") == secao["id"]


def test_devolver_a_secao_traz_o_conteudo_de_volta(client):
    """Dissolver é reversível — e reversível de verdade só se o vínculo voltar."""
    secao = _secao_de(client, "estudo")
    nota = _nota_de(client, "dentro")
    assert client.patch(f"/canvas/nos/{nota['id']}", json={"x": 10, "y": 10, "grupo_id": secao["id"]}).status_code == 204
    assert client.delete(f"/canvas/grupos/{secao['id']}").status_code == 204
    assert client.post(f"/canvas/grupos/{secao['id']}/voltar").status_code == 204

    superficie = client.get("/canvas/superficie").json()
    assert [g["id"] for g in superficie["grupos"] if g["id"] == secao["id"]] == [secao["id"]]
    devolvida = next(n for n in superficie["nos"] if n["id"] == nota["id"])
    assert devolvida.get("grupo_id") == secao["id"]


def test_tirar_a_nota_da_superficie_nao_deixa_ligacao_orfa(client):
    """Sem chave estrangeira, nada limpa a ligação sozinho.

    Uma ligação para um `notas.id` que saiu da superfície continua VERDADEIRA —
    a ligação é entre conhecimentos, e a nota segue na estante. O que não pode
    acontecer é a superfície tentar desenhá-la e quebrar.
    """
    a = _nota_de(client, "a")
    b = _nota_de(client, "b")
    assert client.post("/canvas/ligacoes", json={
        "de_tipo": "nota", "de_id": a["nota_id"], "para_tipo": "nota", "para_id": b["nota_id"],
    }).status_code == 201
    assert client.delete(f"/canvas/nos/{b['id']}").status_code == 204

    superficie = client.get("/canvas/superficie").json()
    assert [n for n in superficie["nos"] if n["id"] == b["id"]] == []
    # A resposta continua íntegra: a tela decide o que fazer com a ponta ausente.
    assert isinstance(superficie["ligacoes"], list)


def test_a_ligacao_nao_se_duplica_nem_ao_contrario(client):
    a = _nota_de(client, "a")
    b = _nota_de(client, "b")
    corpo = {"de_tipo": "nota", "de_id": a["nota_id"], "para_tipo": "nota", "para_id": b["nota_id"]}
    invertido = {"de_tipo": "nota", "de_id": b["nota_id"], "para_tipo": "nota", "para_id": a["nota_id"]}
    assert client.post("/canvas/ligacoes", json=corpo).status_code == 201
    assert client.post("/canvas/ligacoes", json=invertido).status_code == 201
    assert len(client.get("/canvas/superficie").json()["ligacoes"]) == 1


def test_nada_se_liga_a_si_mesmo(client):
    a = _nota_de(client, "a")
    r = client.post("/canvas/ligacoes", json={
        "de_tipo": "nota", "de_id": a["nota_id"], "para_tipo": "nota", "para_id": a["nota_id"],
    })
    assert r.status_code == 400
