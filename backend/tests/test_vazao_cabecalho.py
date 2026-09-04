"""Quem escolhe a chave de contagem não pode ser quem está sendo contado.

O ACHADO
========
`_de_onde` lia o PRIMEIRO elemento de `X-Forwarded-For`. O raciocínio original
estava certo — atrás do Caddy, `request.client.host` é o Caddy, e o cabeçalho é
o que traz o visitante. O que faltava é que o cabeçalho é uma lista que CRESCE
PELA DIREITA: cada proxy acrescenta quem falou com ele. O primeiro elemento é o
mais antigo, e num pedido vindo da internet o mais antigo é o que o visitante
escreveu antes de sair de casa.

O `reverse_proxy` do Caddy, sem configuração, ACRESCENTA em vez de substituir.
Então quem mandava `X-Forwarded-For: 1.2.3.4` fazia o backend receber
`1.2.3.4, <ip real>` — e a contagem ia para `1.2.3.4`, escolhido pelo visitante.
Girando esse valor, o teto de dez envios por hora sem conta deixava de existir.
Ele é a única coisa entre a internet e o disco cheio.

A ORIGEM DESTES TRÊS CASOS
==========================
Eles não nasceram como teste: nasceram como uma medição contra um servidor de
prova isolado, em 03/09, na porta 8299. As três rodadas estão no anexo de
`docs/SECURITY_AUDITORIA_2026-09-03.md`, e são estas — mesmos cabeçalhos, mesma
contagem, mesma conclusão. Aqui elas rodam sem servidor, o que é a diferença
entre uma medição que alguém precisa lembrar de refazer e uma que a suíte refaz
sozinha.

A rodada B é o achado: com o defeito, ela dava doze 201 seguidos. Hoje ela tem
de dar 429 no 11º, como as outras duas.

O CONTROLE NEGATIVO
===================
Trocando `partes[-1]` por `partes[0]` no `vazao.py`, a rodada B fica vermelha —
`assert 201 == 429` no 11º — e A e C continuam verdes. É esse desenho que faz o
arquivo valer: um teste que só olhasse o teto passaria com o defeito no lugar.
"""

from __future__ import annotations

import pytest

PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"

# `vazao.SEM_CONTA` é dez. O 11º é o primeiro que deve bater na porta.
ENVIOS = 12
PRIMEIRO_RECUSADO = 11


@pytest.fixture(autouse=True)
def janela_limpa():
    """A janela é um dicionário de módulo, e ele sobrevive entre testes.

    Sem limpar, o segundo caso deste arquivo começa com a contagem do primeiro e
    recusa no primeiro envio — verde pela razão errada, que é o pior tipo de
    verde.
    """
    from app.api import vazao

    vazao._envios.clear()
    yield
    vazao._envios.clear()


def _subir(client, n, cabecalhos=None):
    """Devolve a lista de códigos de `n` envios seguidos."""
    codigos = []
    for i in range(1, n + 1):
        r = client.post(
            "/upload",
            files={"file": (f"livro{i}.pdf", PDF, "application/pdf")},
            headers=cabecalhos or {},
        )
        codigos.append(r.status_code)
    return codigos


# ---------------------------------------------------------------------------
# A — o controle positivo: o teto existe
# ---------------------------------------------------------------------------

def test_a_cabecalho_fixo_bate_no_teto(client_cru, monkeypatch) -> None:
    monkeypatch.setenv("MEKORA_DOMINIO", "prova.mekora.local")

    codigos = _subir(client_cru, ENVIOS, {"X-Forwarded-For": "203.0.113.9"})

    assert codigos[: PRIMEIRO_RECUSADO - 1] == [201] * (PRIMEIRO_RECUSADO - 1)
    assert codigos[PRIMEIRO_RECUSADO - 1 :] == [429] * (ENVIOS - PRIMEIRO_RECUSADO + 1)


# ---------------------------------------------------------------------------
# B — o achado: o primeiro elemento é de quem pede, o último é do proxy
# ---------------------------------------------------------------------------

def test_b_cabecalho_forjado_nao_escapa_do_teto(client_cru, monkeypatch) -> None:
    """A forma exata do que o Caddy produzia ao acrescentar.

    `<forjado>, <ip do proxy>`: o visitante escolhe o primeiro, a borda
    acrescenta o segundo. Girando o primeiro a cada pedido, o teto tem de
    continuar valendo — porque a contagem olha o último.
    """
    monkeypatch.setenv("MEKORA_DOMINIO", "prova.mekora.local")

    codigos = []
    for i in range(1, ENVIOS + 1):
        r = client_cru.post(
            "/upload",
            files={"file": (f"livro{i}.pdf", PDF, "application/pdf")},
            headers={"X-Forwarded-For": f"198.51.100.{i}, 203.0.113.9"},
        )
        codigos.append(r.status_code)

    assert codigos[: PRIMEIRO_RECUSADO - 1] == [201] * (PRIMEIRO_RECUSADO - 1)
    assert codigos[PRIMEIRO_RECUSADO - 1 :] == [429] * (ENVIOS - PRIMEIRO_RECUSADO + 1), (
        "o primeiro elemento do X-Forwarded-For voltou a decidir a contagem — "
        "girando-o, o teto de envios some"
    )


# ---------------------------------------------------------------------------
# C — o controle negativo do PORTÃO: sem domínio, o cabeçalho não é lido
# ---------------------------------------------------------------------------

def test_c_sem_dominio_o_cabecalho_e_ignorado(client_cru, monkeypatch) -> None:
    """E é este caso que explica por que o defeito não aparecia na bancada.

    Sem `MEKORA_DOMINIO`, `_de_onde` ignora o cabeçalho por decisão explícita e
    conta tudo pelo endereço da conexão. Mesmo cabeçalho forjado da rodada B, e
    o teto vale.

    Ou seja: o buraco só abria COM o domínio configurado, que é exatamente a
    configuração de produção — e nunca a de quem está desenvolvendo. É uma
    família inteira de defeito, e ela está listada no documento da auditoria.
    """
    monkeypatch.delenv("MEKORA_DOMINIO", raising=False)

    codigos = []
    for i in range(1, ENVIOS + 1):
        r = client_cru.post(
            "/upload",
            files={"file": (f"livro{i}.pdf", PDF, "application/pdf")},
            headers={"X-Forwarded-For": f"198.51.100.{i}, 203.0.113.9"},
        )
        codigos.append(r.status_code)

    assert codigos[: PRIMEIRO_RECUSADO - 1] == [201] * (PRIMEIRO_RECUSADO - 1)
    assert codigos[PRIMEIRO_RECUSADO - 1 :] == [429] * (ENVIOS - PRIMEIRO_RECUSADO + 1)


# ---------------------------------------------------------------------------
# A borda, na parte que se pode conferir sem subir o Caddy
# ---------------------------------------------------------------------------

def test_a_borda_sobrescreve_o_cabecalho() -> None:
    """O `Caddyfile` manda `header_up X-Forwarded-For {remote_host}`.

    A metade do Caddy do achado não foi provada com o Caddy rodando — não há
    `caddy` nem `docker` na máquina onde isto foi escrito. O que dá para segurar
    aqui é que a diretiva não SUMA: ela é gerada por `scripts/rotas.py`, e uma
    regeneração que a perdesse voltaria a deixar a borda acrescentar.

    Este teste é de arquivo, e não de comportamento. Ele diz isso de si mesmo
    para não ser lido como prova do que não provou.
    """
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2]
    caddy = (raiz / "Caddyfile").read_text(encoding="utf-8")

    assert caddy.count("reverse_proxy backend:8000") == caddy.count(
        "header_up X-Forwarded-For {remote_host}"
    ), "há reverse_proxy sem header_up — a borda voltou a acrescentar em algum caminho"
