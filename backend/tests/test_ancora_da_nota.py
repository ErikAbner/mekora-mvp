"""A âncora da nota guarda o texto em volta — `DEC-0016`.

POR QUE ESTE ARQUIVO EXISTE: a escada de cinco degraus que reancora uma nota
mora no NAVEGADOR, porque é lá que o texto do livro existe — o servidor nunca
abriu o EPUB. O que o servidor precisa garantir é que a outra metade da âncora
chegue inteira e volte inteira: guardada com teto, devolvida na listagem, e
opcional para quem não a manda.

Sem isto, o degrau 2 — "o mesmo parágrafo, casando com o texto em volta" — não
tem com o que casar, e a escada inteira degrada para a citação sozinha, que é
ambígua justamente nos casos em que ela importa.
"""
from __future__ import annotations

import pytest
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def livro(test_engine):
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


def _nota(client, job, **campos):
    corpo = {"capitulo": 1, "de": 10, "ate": 15, "cor": "amarelo", "trecho": "verme", **campos}
    r = client.post(f"/jobs/{job}/notas", json=corpo)
    assert r.status_code == 201, r.text
    return r.json()


def test_o_texto_em_volta_e_guardado_e_devolvido(client, livro):
    feita = _nota(client, livro, antes="O ", depois=" que primeiro roeu")
    assert feita["antes"] == "O "
    assert feita["depois"] == " que primeiro roeu"

    lista = client.get(f"/jobs/{livro}/notas").json()
    assert [(n["antes"], n["depois"]) for n in lista] == [("O ", " que primeiro roeu")]


def test_a_nota_sem_contexto_continua_valendo(client, livro):
    """A nota antiga não tem contexto, e a escada foi feita para degradar.

    Recusar o pedido sem `antes`/`depois` quebraria todo cliente que grava uma
    nota do livro inteiro — a do "Escrever sobre o livro", que não tem trecho e
    portanto não tem volta.
    """
    feita = _nota(client, livro, fonte="livro", trecho="", de=0, ate=0)
    assert feita["antes"] == ""
    assert feita["depois"] == ""


def test_o_contexto_tem_teto(client, livro):
    """Cento e vinte de cada lado. O que desambigua é a frase ao redor, não a
    página — e sem teto o banco guardaria o parágrafo inteiro duas vezes por
    nota."""
    from app.api.notas import CONTEXTO

    feita = _nota(client, livro, antes="a" * (CONTEXTO + 400), depois="b" * (CONTEXTO + 400))
    assert len(feita["antes"]) == CONTEXTO
    assert len(feita["depois"]) == CONTEXTO


def test_a_nota_de_outra_pessoa_nao_entrega_o_contexto(client, livro, test_engine):
    """O contexto é um pedaço do livro de alguém, e sai pela mesma porta do
    resto da nota. Se a porta se afrouxar, este teste fica vermelho junto."""
    from datetime import timedelta

    from app.models.pessoa import Pessoa, Sessao, agora
    from app.services.acesso_service import resumir

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        outra = Pessoa(email="outra@mekora.local")
        db.add(outra)
        db.flush()
        token = "sessao-da-outra-na-ancora"
        db.add(Sessao(pessoa_id=outra.id, resumo=resumir(token), expira_em=agora() + timedelta(days=1)))
        db.commit()
    finally:
        db.close()

    _nota(client, livro, antes="segredo antes", depois="segredo depois")

    dela = client.get(f"/jobs/{livro}/notas", cookies={"mekora_sessao": token}).json()
    assert dela == []
