"""A caixa de recado.

O que ela precisa garantir, e por quê:

  ESCREVER É PÚBLICO. Converter sem conta é garantia da DEC-0018, e quem
  converteu sem conta é justamente quem tem a primeira impressão. Exigir
  cadastro para reclamar garante que só quem já gostou reclame.

  LER É DO DONO. Texto livre e e-mail são dado pessoal.

  O RECADO SOME COM A CONTA. A tela de privacidade promete que apagar apaga
  tudo, e uma tabela que sobrevive transforma a promessa em mentira.
"""
from __future__ import annotations

import pytest

from app.models.recado import LIMITE_DO_TEXTO, Recado


def test_qualquer_um_deixa_recado_sem_conta(client_cru):
    r = client_cru.post("/recados", json={"texto": "o botão de enviar some no telefone"})
    assert r.status_code == 201, r.text
    assert r.json() == {"recebido": True}


def test_o_recado_guarda_onde_a_pessoa_estava(client_cru, test_engine):
    from sqlalchemy.orm import sessionmaker

    client_cru.post("/recados", json={"texto": "não achei o índice", "onde": "/leitura/:id", "humor": "ruim"})
    db = sessionmaker(bind=test_engine)()
    try:
        r = db.query(Recado).order_by(Recado.id.desc()).first()
        assert r.onde == "/leitura/:id"
        assert r.humor == "ruim"
        assert r.pessoa_id is None
    finally:
        db.close()


def test_humor_desconhecido_vira_nada_e_nao_erro(client_cru, test_engine):
    """Perder o texto de alguém por causa de uma palavra é a troca errada."""
    from sqlalchemy.orm import sessionmaker

    r = client_cru.post("/recados", json={"texto": "isto veio de uma versão nova da tela", "humor": "eufórico"})
    assert r.status_code == 201

    db = sessionmaker(bind=test_engine)()
    try:
        guardado = db.query(Recado).order_by(Recado.id.desc()).first()
        assert guardado.humor is None
        assert guardado.texto == "isto veio de uma versão nova da tela"
    finally:
        db.close()


def test_recado_vazio_nao_entra(client_cru):
    assert client_cru.post("/recados", json={"texto": "   "}).status_code == 422
    assert client_cru.post("/recados", json={"texto": ""}).status_code == 422


def test_texto_grande_demais_nao_entra(client_cru):
    r = client_cru.post("/recados", json={"texto": "a" * (LIMITE_DO_TEXTO + 1)})
    assert r.status_code == 422


def test_o_email_de_quem_tem_conta_nao_e_copiado(client, test_engine):
    """Já está no `pessoa_id`. Guardar duas vezes é criar duas coisas para apagar."""
    from sqlalchemy.orm import sessionmaker

    client.post("/recados", json={"texto": "logada aqui", "email": "outro@exemplo.com"})
    db = sessionmaker(bind=test_engine)()
    try:
        r = db.query(Recado).order_by(Recado.id.desc()).first()
        assert r.pessoa_id is not None
        assert r.email is None
    finally:
        db.close()


def test_o_teto_por_hora_existe(client_cru):
    from app.api.recados import TETO, _mandados

    _mandados.clear()
    for i in range(TETO):
        assert client_cru.post("/recados", json={"texto": f"recado {i}"}).status_code == 201
    r = client_cru.post("/recados", json={"texto": "o sétimo"})
    assert r.status_code == 429
    # A MENSAGEM PRECISA DIZER QUE O TEXTO NÃO SE PERDEU: quem perde o que
    # escreveu não escreve de novo.
    assert "daqui a pouco" in r.json()["detail"]
    _mandados.clear()


# ── quem lê ─────────────────────────────────────────────────────────────────

def test_estranho_com_conta_nao_le_os_recados(client_cru, correio_recado, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    _entrar(client_cru, correio_recado, "estranha@exemplo.com")
    assert client_cru.get("/recados").status_code == 403


def test_visitante_sem_conta_nao_le_os_recados(client_cru):
    assert client_cru.get("/recados").status_code == 401


def test_o_dono_le(client, test_engine):
    """O `client` é nomeado dono no conftest."""
    client.post("/recados", json={"texto": "um recado para ler", "humor": "bom"})
    r = client.get("/recados")
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["total"] >= 1
    assert corpo["recados"][0]["texto"] == "um recado para ler"
    assert corpo["recados"][0]["tem_conta"] is True


# ── apagar a conta leva o recado ────────────────────────────────────────────

def test_apagar_a_conta_apaga_o_recado(client, test_engine):
    from sqlalchemy.orm import sessionmaker

    client.post("/recados", json={"texto": "some comigo"})
    db = sessionmaker(bind=test_engine)()
    try:
        antes = db.query(Recado).filter(Recado.pessoa_id.isnot(None)).count()
        assert antes >= 1
    finally:
        db.close()

    r = client.post("/privacidade/apagar", json={"email": "teste@mekora.local"})
    assert r.status_code in (200, 204), r.text

    db = sessionmaker(bind=test_engine)()
    try:
        assert db.query(Recado).filter(Recado.pessoa_id.isnot(None)).count() == 0
    finally:
        db.close()


# ── ajudantes ───────────────────────────────────────────────────────────────

@pytest.fixture
def correio_recado(monkeypatch):
    from app.services import acesso_service

    caixa = []
    monkeypatch.setattr(acesso_service, "enviar_link", lambda email, token, base_url: caixa.append(token))
    return caixa


def _entrar(client, caixa, email):
    assert client.post("/entrar/pedir", json={"email": email}).status_code == 204
    assert client.get(f"/entrar/{caixa[-1]}", follow_redirects=False).status_code == 303
