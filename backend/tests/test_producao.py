"""Os ramos que só existem em produção — os dois lados de cada um.

O ACHADO 10, E O QUE SOBRAVA DELE
=================================
A auditoria de 03/09 listou os caminhos de código que dependem de variável de
ambiente de produção e que a bancada nunca executava. Dois foram fechados na
mesma semana: `acesso.py:em_producao` (o cookie `Secure`) e `vazao.py:_de_onde`
(o `X-Forwarded-For`). Os outros ficaram na tabela, com o mesmo defeito: **não é
que produção não dê para testar, é que ninguém tinha listado o que precisava
ser.**

Este arquivo executa os que faltavam. Cada caso roda OS DOIS LADOS, porque um
lado só não prova ramo nenhum: prova que a função responde.

O QUE ELES QUEBRAM QUANDO QUEBRAM
=================================
`_base_publica`   o endereço que vai DENTRO do e-mail. Errado, ninguém entra —
                  e a suíte não vê, porque o link é gerado e não é aberto.
`enviar_link`     sem SMTP, produção precisa GRITAR: é configuração faltando, e
                  não caso de uso. Fora de produção o link vai para o terminal,
                  senão desenvolver exigiria um servidor de e-mail.
`ALLOWED_ORIGINS` `*` com credenciais entrega a sessão a qualquer site do mundo.
`KINDLE_EMAIL`    o destino padrão do envio. Vazio na bancada, "foi para o .env"
                  e "não foi para lugar nenhum" tinham a mesma cara — foi metade
                  do achado 1.
"""

from __future__ import annotations

import importlib
from urllib.parse import urlsplit

import pytest


class RequisicaoFalsa:
    """O que `_base_publica` lê, e nada mais."""

    def __init__(self, base: str) -> None:
        self.base_url = base
        self.url = urlsplit(base)


# ── o endereço que vai dentro do e-mail ────────────────────────────────────

def test_com_dominio_o_link_usa_o_dominio(monkeypatch) -> None:
    """Atrás do proxy, `request.base_url` é `http://backend:8000` — um endereço
    que não abre em lugar nenhum. Com domínio configurado, ele é a verdade."""
    from app.api import acesso

    monkeypatch.setenv("MEKORA_DOMINIO", "mekora.com.br")
    assert acesso._base_publica(RequisicaoFalsa("http://backend:8000/")) == "https://mekora.com.br"


def test_sem_dominio_o_link_usa_o_que_o_servidor_ve(monkeypatch) -> None:
    """E em desenvolvimento é o contrário: forçar `https://localhost` daria um
    link que o navegador recusa."""
    from app.api import acesso

    monkeypatch.delenv("MEKORA_DOMINIO", raising=False)
    assert acesso._base_publica(RequisicaoFalsa("http://localhost:8000/")) == "http://localhost:5180"

    monkeypatch.setenv("MEKORA_DOMINIO", "localhost")
    assert acesso._base_publica(RequisicaoFalsa("http://localhost:8000/")) == "http://localhost:5180"


# ── sem SMTP: gritar em produção, imprimir fora dela ───────────────────────

def test_sem_smtp_em_producao_o_envio_estoura(monkeypatch) -> None:
    """Barulhento de propósito. Silêncio aqui é uma instalação onde ninguém
    entra e nada no log diz por quê."""
    from app.core.config import settings
    from app.services import acesso_service

    for campo in ("smtp_host", "smtp_user", "smtp_pass"):
        monkeypatch.setattr(settings, campo, "")
    monkeypatch.setenv("MEKORA_DOMINIO", "mekora.com.br")

    with pytest.raises(RuntimeError) as erro:
        acesso_service.enviar_link("erik@exemplo.com", "tok", "https://mekora.com.br")

    assert "SMTP" in str(erro.value)
    assert "SMTP_HOST" in str(erro.value), "a mensagem precisa dizer QUAL variável falta"


def test_sem_smtp_fora_de_producao_o_link_vai_para_o_terminal(monkeypatch, capsys) -> None:
    """O outro lado, e ele é o que faz o produto ser desenvolvível sem um
    servidor de e-mail configurado só para isso."""
    from app.core.config import settings
    from app.services import acesso_service

    for campo in ("smtp_host", "smtp_user", "smtp_pass"):
        monkeypatch.setattr(settings, campo, "")
    monkeypatch.delenv("MEKORA_DOMINIO", raising=False)

    acesso_service.enviar_link("erik@exemplo.com", "tok-de-prova", "http://localhost:8000")

    saida = capsys.readouterr().out
    assert "tok-de-prova" in saida, "o link precisa aparecer inteiro, senão não serve para entrar"


# ── o portão contra `*` no CORS ────────────────────────────────────────────

def test_estrela_no_cors_derruba_a_subida(monkeypatch) -> None:
    """`*` com `allow_credentials` faz o navegador ANEXAR O COOKIE de sessão em
    pedido de outra origem: qualquer site do mundo lendo a estante de quem
    estiver logado.

    O Starlette recusa a combinação por conta própria, em silêncio. Esta guarda
    transforma a recusa silenciosa num erro que diz o que está errado, NA HORA
    DE SUBIR — e é isso que este caso executa, reimportando o módulo com a
    variável posta.
    """
    import main

    monkeypatch.setenv("ALLOWED_ORIGINS", "https://mekora.com.br,*")
    with pytest.raises(RuntimeError) as erro:
        importlib.reload(main)

    assert "ALLOWED_ORIGINS" in str(erro.value)

    # E O OUTRO LADO, no mesmo caso e de propósito: sem devolver o módulo ao
    # estado bom, TODO teste que importe `main` depois deste roda contra um
    # aplicativo meio construído — o `reload` que estourou deixou o módulo pela
    # metade. Um teste que suja o processo é pior que um teste que falta.
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://mekora.com.br")
    importlib.reload(main)
    assert main.app is not None


def test_lista_vazia_e_a_de_desenvolvimento(monkeypatch) -> None:
    """Vazio não é `*`: é a lista fechada do Vite local. Em produção também é
    vazio, porque interface e API ficam no mesmo domínio e mesma origem não usa
    CORS nenhum."""
    import main

    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    importlib.reload(main)

    origens = [
        m.kwargs.get("allow_origins")
        for m in main.app.user_middleware
        if "CORS" in str(m)
    ]
    assert origens and "*" not in (origens[0] or [])
    assert "http://localhost:5173" in origens[0]


# ── o destino padrão do envio ao Kindle ────────────────────────────────────

def test_sem_aparelho_e_sem_kindle_email_o_envio_recusa(monkeypatch, tmp_path) -> None:
    """"Foi para o `.env`" e "não foi para lugar nenhum" tinham a mesma cara na
    bancada, e essa confusão foi metade do achado 1."""
    from app.core.config import settings
    from app.services import email_service

    monkeypatch.setattr(settings, "kindle_email", "")
    monkeypatch.setattr(settings, "smtp_host", "smtp.exemplo.com")
    monkeypatch.setattr(settings, "smtp_user", "eu@exemplo.com")
    monkeypatch.setattr(settings, "smtp_pass", "segredo")

    arquivo = tmp_path / "livro.epub"
    arquivo.write_bytes(b"nao chega a ser lido")

    with pytest.raises(email_service.SendFailedError) as erro:
        email_service.send_epub_to_kindle(str(arquivo), "Livro")

    assert "KINDLE_EMAIL" in str(erro.value)
