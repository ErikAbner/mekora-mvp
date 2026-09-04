"""O teto de pedir link conta QUEM PEDE, e não o que foi pedido.

O ACHADO
========
`acesso_service.pedir_link` conta chaves recentes da PESSOA: cinco em dez
minutos por e-mail. Está certo para o que ele cobre — insistir no mesmo
endereço. Só que o número de endereços distintos não tem teto, e ninguém contava
por origem. O limite real de quem chamava `/entrar/pedir` era, portanto, cinco
mensagens *por endereço que ele escolhesse*, sem conta e sem nada:

    for endereco in lista_de_terceiros:
        POST /entrar/pedir {"email": endereco}   → 204, e-mail sai

Duas consequências. A tabela `pessoas` cresce sem prova de nada — `_pessoa` cria
a linha ao PEDIR. E a pior, que não se desfaz: a conta SMTP do Mekora vira
máquina de mandar mensagem para quem nunca pediu, com o domínio do Mekora no
remetente. Reputação de envio não volta com correção.

O `docs/SUBIR.md` descrevia esta rota como tendo "limite de 5 por 10 minutos"
numa tabela de rotas públicas, o que fazia o número parecer um teto de quem
chama. Era a parte mais perigosa do achado: um limite que se acredita ter é pior
que um que se sabe não ter.

POR QUE DEPOIS DO CABEÇALHO
===========================
Um teto por origem só vale se a origem não for escolhida por quem está sendo
contado. Enquanto `_de_onde` lia o primeiro elemento do `X-Forwarded-For`, era.
Por isso este conserto veio depois do daquele, e o último caso deste arquivo é o
que amarra os dois.

O CONTROLE NEGATIVO
===================
Tirando `dependencies=[Depends(limitar_links)]` da rota, o primeiro caso fica
vermelho com `assert 204 == 429` — e o segundo, o do sigilo, continua verde. É
esse par que mostra que o teto novo não pagou o silêncio da rota como preço.
"""

from __future__ import annotations

import pytest

from app.api.vazao import LINKS_POR_ORIGEM


@pytest.fixture(autouse=True)
def janela_limpa():
    from app.api import vazao

    vazao._links.clear()
    yield
    vazao._links.clear()


@pytest.fixture(autouse=True)
def sem_smtp(monkeypatch):
    """Nenhum e-mail sai daqui.

    Sem isto o teste depende de `enviar_link` não achar SMTP e cair no `print`
    — que funciona, e é frágil pela razão errada: um `.env` presente na máquina
    de quem roda a suíte mandaria e-mail de verdade, vinte vezes.
    """
    from app.services import acesso_service

    monkeypatch.setattr(acesso_service, "enviar_link", lambda *a, **k: None)


def _pedir(client, email, cabecalhos=None):
    return client.post("/entrar/pedir", json={"email": email}, headers=cabecalhos or {})


def test_enderecos_diferentes_nao_zeram_a_contagem(client_cru) -> None:
    """O achado, direto: cada pedido com um endereço novo.

    Antes, todos os 21 respondiam 204 e 21 mensagens saíam. O teto por origem é
    o que faz o 21º parar.
    """
    codigos = [
        _pedir(client_cru, f"alvo{i}@exemplo.com").status_code
        for i in range(1, LINKS_POR_ORIGEM + 2)
    ]

    assert codigos[:LINKS_POR_ORIGEM] == [204] * LINKS_POR_ORIGEM
    assert codigos[LINKS_POR_ORIGEM] == 429, (
        "trocar o endereço a cada pedido voltou a zerar a contagem"
    )


def test_o_teto_nao_conta_quem_ainda_cabe(client_cru) -> None:
    """Uso normal não bate na porta: pedir, errar o endereço, pedir de novo."""
    assert _pedir(client_cru, "erik@exemplo.com").status_code == 204
    assert _pedir(client_cru, "erik@exemlpo.com").status_code == 204
    assert _pedir(client_cru, "erik@exemplo.com").status_code == 204


def test_a_rota_continua_calada_sobre_quem_tem_conta(client_cru, test_engine) -> None:
    """O 429 novo NÃO pode virar um jeito de descobrir quem usa o Mekora.

    Duas perguntas dentro do teto — uma sobre um endereço que já tem conta,
    outra sobre um que nunca existiu — têm de dar a MESMA resposta. Se
    divergissem, o teto teria comprado volume ao preço do sigilo, que é a coisa
    que esta rota protege desde que existe.
    """
    from sqlalchemy.orm import sessionmaker

    from app.models.pessoa import Pessoa

    Session = sessionmaker(bind=test_engine)
    db = Session()
    db.add(Pessoa(email="jaexiste@exemplo.com"))
    db.commit()
    db.close()

    com_conta = _pedir(client_cru, "jaexiste@exemplo.com")
    sem_conta = _pedir(client_cru, "nuncaexistiu@exemplo.com")

    assert com_conta.status_code == sem_conta.status_code == 204
    assert com_conta.content == sem_conta.content


def test_o_teto_e_por_origem_e_a_origem_vem_da_borda(client_cru, monkeypatch) -> None:
    """E é aqui que este conserto se apoia no do cabeçalho.

    Com `MEKORA_DOMINIO` definido, a contagem usa o `X-Forwarded-For` — o ÚLTIMO
    elemento, escrito pela borda. Girando o primeiro elemento, que é o que um
    visitante consegue forjar, o teto tem de continuar de pé.

    Com `_de_onde` lendo o primeiro elemento, como fazia até 03/09, este caso
    fica vermelho e o teto inteiro vira enfeite.
    """
    monkeypatch.setenv("MEKORA_DOMINIO", "prova.mekora.local")

    codigos = [
        _pedir(
            client_cru,
            f"alvo{i}@exemplo.com",
            {"X-Forwarded-For": f"198.51.100.{i}, 203.0.113.9"},
        ).status_code
        for i in range(1, LINKS_POR_ORIGEM + 2)
    ]

    assert codigos[LINKS_POR_ORIGEM] == 429
