"""Os marcadores: dobrar, listar, desdobrar — e as guardas de dono.

POR QUE ESTE ARQUIVO EXISTE: a rota de criar é idempotente por conferência em
Python, e a unicidade que a sustenta mora no banco. Duas afirmações que ninguém
vê acontecer sem um teste que as veja recusar — e uma delas é a que impede a
mesma dobra de aparecer duas vezes na gaveta.

E a lista é de uma PESSOA dentro de um LIVRO: o dono está no filtro, não numa
conferência depois. Um teste para cada sentido.
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
        token = "sessao-da-outra-nos-marcadores"
        db.add(Sessao(pessoa_id=pessoa.id, resumo=resumir(token), expira_em=agora() + timedelta(days=1)))
        db.commit()
        return {"id": pessoa.id, "cookies": {"mekora_sessao": token}}
    finally:
        db.close()


@pytest.fixture
def livro(test_engine):
    """Um trabalho para as dobras terem onde morar.

    SEM DONO, de propósito. O `client` dos testes apresenta a chave pública do
    trabalho sozinho, então as duas pessoas atravessam a porta de acesso — e é
    isso que deixa a guarda do MARCADOR aparecer. Com dono, quem responderia
    primeiro seria a porta, e o filtro por pessoa da rota nunca seria exercido.
    """
    from app.models.processing_job import ProcessingJob

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        job = ProcessingJob(original_filename="livro.epub", status="converted")
        db.add(job)
        db.commit()
        db.refresh(job)
        return job.id
    finally:
        db.close()


def _dobrar(client, job_id, capitulo, deslocamento, trecho="", cookies=None):
    return client.post(
        f"/jobs/{job_id}/marcadores",
        json={"capitulo": capitulo, "deslocamento": deslocamento, "trecho": trecho},
        cookies=cookies,
    )


def test_dobrar_guarda_o_lugar_e_o_trecho(client, livro):
    r = _dobrar(client, livro, 3, 812, "onde a expedição parou")
    assert r.status_code == 201, r.text
    feito = r.json()
    assert feito["capitulo"] == 3
    assert feito["deslocamento"] == 812
    assert feito["trecho"] == "onde a expedição parou"
    assert feito["ja_estava"] is False

    lista = client.get(f"/jobs/{livro}/marcadores").json()
    assert [m["id"] for m in lista] == [feito["id"]]


def test_dobrar_o_mesmo_lugar_duas_vezes_e_uma_dobra_so(client, livro):
    """Idempotente: o segundo pedido devolve o primeiro, e não um erro."""
    primeiro = _dobrar(client, livro, 3, 812, "o mesmo ponto").json()
    segundo = _dobrar(client, livro, 3, 812, "o mesmo ponto").json()

    assert segundo["ja_estava"] is True
    assert segundo["id"] == primeiro["id"]
    assert len(client.get(f"/jobs/{livro}/marcadores").json()) == 1


def test_o_banco_recusa_a_dobra_repetida_mesmo_sem_a_conferencia(client, livro, test_engine):
    """A restrição é do BANCO, e não só da rota.

    A conferência em Python dá a resposta boa; ela não é a garantia. Duas abas
    passam por ela ao mesmo tempo, e o que sobra entre a segunda e uma lista com
    a mesma linha duas vezes é a restrição.
    """
    from sqlalchemy.exc import IntegrityError

    from app.models.marcador import Marcador
    from app.models.pessoa import Pessoa

    _dobrar(client, livro, 1, 100, "primeiro")

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        eu = db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").first()
        db.add(Marcador(pessoa_id=eu.id, job_id=livro, capitulo=1, deslocamento=100, trecho="de novo"))
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_a_lista_vem_em_ordem_de_leitura(client, livro):
    _dobrar(client, livro, 5, 10, "quinto")
    _dobrar(client, livro, 1, 900, "primeiro, mais adiante")
    _dobrar(client, livro, 1, 20, "primeiro, no começo")

    lista = client.get(f"/jobs/{livro}/marcadores").json()
    assert [(m["capitulo"], m["deslocamento"]) for m in lista] == [(1, 20), (1, 900), (5, 10)]


def test_a_lista_so_traz_o_que_e_meu(client, livro, outra):
    meu = _dobrar(client, livro, 2, 50, "meu").json()
    _dobrar(client, livro, 7, 70, "dela", cookies=outra["cookies"])

    lista = client.get(f"/jobs/{livro}/marcadores").json()
    assert [m["id"] for m in lista] == [meu["id"]]


def test_nao_se_apaga_o_marcador_de_outra_pessoa(client, livro, outra):
    dela = _dobrar(client, livro, 7, 70, "dela", cookies=outra["cookies"]).json()

    r = client.delete(f"/jobs/{livro}/marcadores/{dela['id']}")
    assert r.status_code == 404, r.text

    ainda = client.get(f"/jobs/{livro}/marcadores", cookies=outra["cookies"]).json()
    assert [m["id"] for m in ainda] == [dela["id"]]


def test_desdobrar_tira_da_lista(client, livro):
    m = _dobrar(client, livro, 2, 50, "sai").json()
    assert client.delete(f"/jobs/{livro}/marcadores/{m['id']}").status_code == 204
    assert client.get(f"/jobs/{livro}/marcadores").json() == []


def test_o_trecho_longo_e_cortado(client, livro):
    """Duzentos caracteres é o que a gaveta mostra; o resto engordaria a linha."""
    from app.api.marcadores import TAMANHO_DO_TRECHO

    m = _dobrar(client, livro, 0, 0, "a" * (TAMANHO_DO_TRECHO + 500)).json()
    assert len(m["trecho"]) == TAMANHO_DO_TRECHO


def test_quem_nao_prova_nada_nao_alcanca_os_marcadores(client_cru, livro):
    """Sem sessão E sem a chave do trabalho, a porta responde antes da rota.

    404, e não 401: é o mesmo 404 de "não existe", e a razão está em
    `exigir_acesso` — um 403 em trabalho existente contaria quais números
    existem, que é metade do que se está protegendo.
    """
    assert client_cru.get(f"/jobs/{livro}/marcadores").status_code == 404
    r = client_cru.post(f"/jobs/{livro}/marcadores", json={"capitulo": 0, "deslocamento": 0, "trecho": ""})
    assert r.status_code == 404
