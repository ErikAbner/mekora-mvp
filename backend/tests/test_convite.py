"""O lançamento é por convite — e o convite não aparece na resposta.

O ACHADO QUE ISTO FECHA
=======================
O achado 2 da auditoria de 03/09 ficou meio consertado. O teto por origem
limitou o estrago — vinte pedidos por hora —, e não o tornou impossível: vinte
por hora ainda são vinte estranhos por hora recebendo e-mail do domínio do
Mekora, e vinte linhas novas em `pessoas` por hora, criadas ao PEDIR, sem prova
de que alguém quisesse. Reputação de remetente não volta com correção.

Com a lista de convidados, o caminho deixa de existir: sem convite nada é
escrito e nada é enviado.

A ARMADILHA, QUE É A PARTE QUE IMPORTA
======================================
Uma rota que responde diferente para endereço de fora da lista é um ORÁCULO DE
QUEM FOI CONVIDADO. Quem quer saber se uma pessoa usa o Mekora pergunta pelo
endereço dela e lê a resposta — e a lista de convidados de um produto de leitura
é informação sobre pessoas, não sobre o sistema.

Diferente em DUAS moedas, e as duas são medidas aqui:

  corpo   — status, cabeçalhos e bytes de resposta
  tempo   — quanto o servidor demora para responder

O tempo é o que se esquece. O caso convidado escreve em `pessoas` e em `chaves`
e dá commit; o não convidado não faz nada. São milissegundos, e milissegundos
medidos muitas vezes respondem a pergunta sem que uma única mensagem saia.

OS CONTROLES NEGATIVOS
======================
Cada prova tem o seu, escrito no caso.
"""

from __future__ import annotations

import statistics
import time

import pytest
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.pessoa import Chave, Pessoa


@pytest.fixture(autouse=True)
def janela_limpa():
    """O teto por origem é de vinte por hora, e estes casos pedem mais que isso."""
    from app.api import vazao

    vazao._links.clear()
    yield
    vazao._links.clear()


@pytest.fixture(autouse=True)
def sem_smtp(monkeypatch):
    from app.services import acesso_service

    monkeypatch.setattr(acesso_service, "enviar_link", lambda *a, **k: None)


@pytest.fixture
def lista(monkeypatch):
    """A lista vem da CONFIGURAÇÃO, e é por isso que o teste a escreve assim.

    Se ela morasse no código, este `setattr` seria um `import` remendado e a
    instalação de verdade precisaria de um deploy para convidar alguém.
    """
    def escrever(convidados: str = "", dono: str = "") -> None:
        monkeypatch.setattr(settings, "convidados", convidados)
        monkeypatch.setattr(settings, "dono_email", dono)

    return escrever


def _pedir(client, email):
    return client.post("/entrar/pedir", json={"email": email})


def _contar(engine, email):
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        pessoa = db.query(Pessoa).filter(Pessoa.email == email).first()
        chaves = db.query(Chave).filter(Chave.pessoa_id == pessoa.id).count() if pessoa else 0
        return (1 if pessoa else 0), chaves
    finally:
        db.close()


# ── o efeito ───────────────────────────────────────────────────────────────

def test_sem_convite_nada_e_escrito(client_cru, test_engine, lista) -> None:
    """O achado, direto: a tabela `pessoas` para de crescer sem prova.

    Controle negativo: tirando o `if not foi_convidado` do `pedir_link`, este
    caso fica vermelho com uma linha de pessoa e uma chave para um endereço que
    ninguém convidou.
    """
    lista(convidados="erik@exemplo.com")

    assert _pedir(client_cru, "estranho@exemplo.com").status_code == 204
    assert _contar(test_engine, "estranho@exemplo.com") == (0, 0)


def test_com_convite_o_link_nasce(client_cru, test_engine, lista) -> None:
    """E o convidado continua entrando — senão o conserto seria uma porta fechada."""
    lista(convidados="erik@exemplo.com, outra@exemplo.com")

    assert _pedir(client_cru, "erik@exemplo.com").status_code == 204
    assert _contar(test_engine, "erik@exemplo.com") == (1, 1)


def test_o_dono_entra_mesmo_fora_da_lista(client_cru, test_engine, lista) -> None:
    """Uma lista mal escrita não pode trancar o dono do lado de fora.

    Não há como consertar de dentro: quem conserta o `.env` é quem entra na
    máquina, e quem entra na máquina é o dono.
    """
    lista(convidados="outra@exemplo.com", dono="erik@exemplo.com")

    assert _pedir(client_cru, "erik@exemplo.com").status_code == 204
    assert _contar(test_engine, "erik@exemplo.com") == (1, 1)


def test_a_lista_nao_repara_em_caixa_nem_em_espaco(client_cru, test_engine, lista) -> None:
    """`Erik@Exemplo.com ` é o mesmo endereço, e um convite que não sabe disso
    manda a pessoa achar que digitou errado."""
    lista(convidados=" Erik@Exemplo.COM ")

    assert _pedir(client_cru, "erik@exemplo.com").status_code == 204
    assert _contar(test_engine, "erik@exemplo.com") == (1, 1)


# ── a falta de lista, nos dois ambientes ───────────────────────────────────

def test_sem_lista_em_producao_ninguem_pede(client_cru, test_engine, lista, monkeypatch) -> None:
    """Fecha por falta, e não por descuido.

    É a mesma regra do `DONO_EMAIL`: o contrário seria "esqueci de configurar,
    então está aberto", que é como a maioria das instalações fica aberta.
    """
    lista()
    monkeypatch.setenv("MEKORA_DOMINIO", "mekora.com.br")

    assert _pedir(client_cru, "qualquer@exemplo.com").status_code == 204
    assert _contar(test_engine, "qualquer@exemplo.com") == (0, 0)


def test_sem_lista_fora_de_producao_a_entrada_funciona(client_cru, test_engine, lista, monkeypatch) -> None:
    """O outro lado do mesmo ramo, e ele existe para ser executado.

    O achado 10 é sobre comportamento que só existe em produção e que a bancada
    nunca roda. Um `foi_convidado` que só se prova num ambiente é o mesmo
    defeito com outro nome.
    """
    lista()
    monkeypatch.setenv("MEKORA_DOMINIO", "localhost")

    assert _pedir(client_cru, "qualquer@exemplo.com").status_code == 204
    assert _contar(test_engine, "qualquer@exemplo.com") == (1, 1)


# ── a armadilha: a resposta não conta quem foi convidado ───────────────────

def test_o_corpo_e_igual(client_cru, lista) -> None:
    """Primeira moeda: o que volta.

    Controle negativo: um `raise HTTPException(403)` no lugar do `return None`
    do `pedir_link` deixa este caso vermelho na primeira asserção — e é
    exatamente o formato que um conserto apressado tem.
    """
    lista(convidados="erik@exemplo.com")

    dentro = _pedir(client_cru, "erik@exemplo.com")
    fora = _pedir(client_cru, "estranho@exemplo.com")

    assert dentro.status_code == fora.status_code == 204
    assert dentro.content == fora.content == b""
    # `date` muda entre dois relógios e não diz nada sobre a lista.
    limpar = lambda r: {k.lower(): v for k, v in r.headers.items() if k.lower() != "date"}
    assert limpar(dentro) == limpar(fora)


def test_o_tempo_e_igual(client_cru, lista, monkeypatch) -> None:
    """Segunda moeda, e é a que se esquece.

    A MEDIDA É RAZÃO, E NÃO DIFERENÇA. Uma diferença absoluta em milissegundos
    passa em máquina lenta e reprova em máquina rápida, e o que importa aqui não
    é o número: é se um caso custa mais que o outro. Com o piso, os dois custam
    o piso e a razão é ~1,0. Sem ele, o caso convidado custa a escrita no banco
    e o outro não custa quase nada — e a razão dispara.

    Controle negativo, medido nesta máquina: com `PISO_DA_RESPOSTA = 0` o caso
    convidado custou 1,1 ms e o outro 0,7 ms — razão 1,52, e vermelho. Com o
    piso, 56,7 ms contra 56,7 ms, razão 1,00.

    A diferença crua é de menos de meio milissegundo, e é justamente por isso
    que ela precisa de piso e não de bom senso: meio milissegundo não se vê numa
    medição, e se vê na mediana de mil.

    O piso real é 0,15 s; aqui ele é encurtado para a suíte não gastar meio
    minuto medindo. A última asserção guarda o valor de verdade.
    """
    from app.api import acesso
    from app.api import vazao

    lista(convidados="erik@exemplo.com")
    monkeypatch.setattr(acesso, "PISO_DA_RESPOSTA", 0.05)

    def medir(email: str) -> float:
        vazao._links.clear()   # o teto por origem é de vinte, e aqui há mais que isso
        t = time.monotonic()
        _pedir(client_cru, email)
        return time.monotonic() - t

    # Uma volta antes de contar: a primeira passagem paga import tardio e
    # criação de tabela, e ela cairia inteira no caso que medisse primeiro.
    medir("erik@exemplo.com")
    medir("estranho@exemplo.com")

    dentro, fora = [], []
    for i in range(15):
        dentro.append(medir("erik@exemplo.com"))
        fora.append(medir(f"estranho{i}@exemplo.com"))

    md, mf = statistics.median(dentro), statistics.median(fora)
    razao = max(md, mf) / min(md, mf)
    assert razao < 1.25, (
        f"o relógio conta quem foi convidado: dentro {md * 1000:.1f} ms, "
        f"fora {mf * 1000:.1f} ms, razão {razao:.2f}"
    )
    assert acesso.PISO_DA_RESPOSTA_REAL >= 0.1, "o piso de produção não pode encolher em silêncio"


def test_o_envio_nao_esta_no_caminho_da_resposta(test_engine, lista, monkeypatch) -> None:
    """O piso só funciona porque o SMTP saiu da frente.

    Nenhum piso razoável esconde os segundos de uma conexão SMTP, e só o caso
    convidado os pagaria. Esta prova é ESTRUTURAL e não cronometrada: chama a
    rota direto, com um `BackgroundTasks` de mentira, e mostra que `enviar_link`
    não foi chamado durante a resposta e que ficou agendado para depois dela.

    Controle negativo: voltando a chamar `enviar_link` inline, a primeira
    asserção fica vermelha.
    """
    from fastapi import BackgroundTasks

    from app.api import acesso
    from app.services import acesso_service

    lista(convidados="erik@exemplo.com")

    chamadas = []
    monkeypatch.setattr(acesso_service, "enviar_link", lambda *a, **k: chamadas.append(a))
    monkeypatch.setattr(acesso, "PISO_DA_RESPOSTA", 0.0)

    Session = sessionmaker(bind=test_engine)
    db = Session()
    tarefas = BackgroundTasks()

    class PedidoFalso:
        email = "erik@exemplo.com"

    class RequisicaoFalsa:
        base_url = "http://prova.local/"
        headers: dict = {}
        url = None

    monkeypatch.setattr(acesso, "_base_publica", lambda r: "http://prova.local")

    try:
        acesso.entrar(PedidoFalso(), RequisicaoFalsa(), tarefas, db)
    finally:
        db.close()

    assert chamadas == [], "o envio rodou DENTRO da resposta — o relógio volta a contar a lista"
    assert len(tarefas.tasks) == 1, "o envio não foi agendado: ninguém receberia o link"

    tarefas.tasks[0].func(*tarefas.tasks[0].args)
    assert len(chamadas) == 1
