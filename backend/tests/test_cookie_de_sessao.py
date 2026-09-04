"""O cookie de sessão, nos DOIS ambientes.

POR QUE ESTE ARQUIVO NÃO EXISTIA
================================
Não é que ninguém tenha lembrado. É que não dava.

O `acesso.py` tinha `EM_PRODUCAO = os.getenv("MEKORA_DOMINIO", ...)` no nível do
módulo, avaliado no IMPORT. Quando o primeiro teste da suíte importa `main`, o
valor congela — e `monkeypatch.setenv` depois disso não alcança mais nada. O
ramo de produção, que é o cookie com `Secure`, era **intestável por
construção**.

É o membro mais duro da família do achado 10 da auditoria de 03/09: caminho de
código que só existe com variável de ambiente de produção. Os outros aceitam
`monkeypatch` e faltava alguém escrever o teste; este não aceitava nem isso.

`em_producao()` virou função lida na hora da chamada, e os dois lados passaram a
ser alcançáveis. O arquivo é curto de propósito — o que ele prova é que o ramo
alcança, tanto quanto o que ele afirma sobre o cookie.

CONTROLE NEGATIVO
=================
Voltando `secure=em_producao()` para uma constante de módulo, o primeiro caso
fica vermelho — e vermelho pela razão certa: o cookie sai sem `Secure` num
ambiente que diz ser produção.
"""

from __future__ import annotations

import pytest


def _entrar(client, test_engine, email="cookie@mekora.local"):
    """Faz o caminho de verdade: pede o link, lê a chave do banco, abre o link.

    Pelo fluxo, e não escrevendo a sessão à mão: o cookie é escrito por
    `usar_link`, e é ele o assunto aqui.
    """
    from app.models.pessoa import Chave, Pessoa
    from sqlalchemy.orm import sessionmaker

    from app.services import acesso_service

    tokens: list[str] = []
    original = acesso_service.pedir_link

    def espiar(db, mail, base):
        r = original(db, mail, base)
        if r is not None:
            tokens.append(r[0])
        return r

    acesso_service.pedir_link = espiar
    try:
        client.post("/entrar/pedir", json={"email": email})
    finally:
        acesso_service.pedir_link = original

    assert tokens, "nenhuma chave foi criada"
    return client.get(f"/entrar/{tokens[0]}", follow_redirects=False)


@pytest.fixture(autouse=True)
def sem_smtp_e_janela_limpa(monkeypatch):
    from app.api import vazao
    from app.services import acesso_service

    monkeypatch.setattr(acesso_service, "enviar_link", lambda *a, **k: None)
    vazao._links.clear()
    yield
    vazao._links.clear()


def test_com_dominio_o_cookie_sai_com_secure(client_cru, test_engine, monkeypatch) -> None:
    """O ramo que nunca havia rodado em teste nenhum."""
    monkeypatch.setenv("MEKORA_DOMINIO", "mekora.com.br")

    r = _entrar(client_cru, test_engine)

    bruto = r.headers["set-cookie"]
    assert "mekora_sessao=" in bruto
    assert "Secure" in bruto, (
        "o cookie de sessão saiu sem `Secure` num ambiente com domínio — "
        "`em_producao()` voltou a ser lido no import?"
    )
    assert "HttpOnly" in bruto
    assert "SameSite=lax" in bruto


def test_sem_dominio_o_cookie_sai_sem_secure(client_cru, test_engine, monkeypatch) -> None:
    """E o outro lado, que é o que faz o desenvolvimento local funcionar.

    Com `Secure` num servidor http, o navegador simplesmente não guarda o
    cookie — e a sessão parece quebrada quando o que está errado é a
    configuração.
    """
    monkeypatch.delenv("MEKORA_DOMINIO", raising=False)

    r = _entrar(client_cru, test_engine, email="local@mekora.local")

    bruto = r.headers["set-cookie"]
    assert "mekora_sessao=" in bruto
    assert "Secure" not in bruto
    # O resto não muda com o ambiente, e é o que segura a sessão de qualquer jeito.
    assert "HttpOnly" in bruto
    assert "SameSite=lax" in bruto


def test_localhost_nao_conta_como_producao(client_cru, test_engine, monkeypatch) -> None:
    """`MEKORA_DOMINIO=localhost` é a prova local da pilha, e não produção.

    O valor está tratado em quatro lugares (`acesso.py`, `acesso_service.py`,
    `vazao.py`, `docker-compose.yml`), e sempre com o mesmo sentido. Um deles
    discordando seria um cookie que não chega, ou um teto que não conta.
    """
    monkeypatch.setenv("MEKORA_DOMINIO", "localhost")

    r = _entrar(client_cru, test_engine, email="localhost@mekora.local")

    assert "Secure" not in r.headers["set-cookie"]
