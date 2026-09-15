"""O que decide se entrar no Mekora é seguro ou é teatro.

Cada teste aqui corresponde a uma decisão da DEC-0039, e a um jeito específico
de essa decisão ser desfeita sem ninguém notar.

O envio de e-mail é substituído: o teste guarda o link em vez de mandá-lo. Não é
para evitar rede — é porque o link em claro só existe naquele instante, e
capturá-lo aqui é a única forma de exercer o caminho que a pessoa percorre.
"""

from __future__ import annotations

import pytest

from app.models.pessoa import VALIDADE_DA_CHAVE, Chave, Pessoa, Sessao, agora
from app.services import acesso_service


@pytest.fixture
def correio(monkeypatch):
    """Intercepta o envio e guarda o link."""
    caixa = []

    def guardar(email, token, base_url):
        caixa.append({"email": email, "token": token, "base_url": base_url})

    monkeypatch.setattr(acesso_service, "enviar_link", guardar)
    return caixa


def entrar(client, correio, email="erik@exemplo.com"):
    r = client.post("/entrar/pedir", json={"email": email})
    assert r.status_code == 204
    token = correio[-1]["token"]
    r = client.get(f"/entrar/{token}", follow_redirects=False)
    assert r.status_code == 303
    return token


# ── o caminho que funciona ──────────────────────────────────────────────────

def test_entrar_cria_sessao_e_reconhece_a_pessoa(client, correio):
    entrar(client, correio)
    r = client.get("/eu")
    assert r.status_code == 200
    assert r.json()["entrou"] is True
    assert r.json()["email"] == "erik@exemplo.com"


# ESTES QUATRO USAM `client_cru`, e a razão é o assunto deles.
#
# O `client` comum entra numa conta sozinho — foi assim que 116 testes voltaram
# a passar quando as rotas de instalação foram fechadas. Mas um teste que
# verifica o comportamento SEM sessão não pode usar um cliente que sempre tem
# uma: ele passaria a provar o contrário do que o nome dele diz.
def test_sem_sessao_a_resposta_e_normal_e_nao_erro(client_cru):
    """Não estar logado é estado previsto, não falha: a DEC-0018 garante que
    converter acontece sem conta. Um 401 aqui faria toda abertura de página
    registrar um erro que não é erro."""
    r = client_cru.get("/eu")
    assert r.status_code == 200
    assert r.json() == {"entrou": False}


# ── o que a resposta NÃO pode contar ────────────────────────────────────────

def test_a_resposta_e_igual_para_email_conhecido_e_desconhecido(client, correio):
    """Se ela variasse, qualquer um descobriria quem usa o Mekora perguntando um
    endereço de cada vez."""
    primeira = client.post("/entrar/pedir", json={"email": "novo@exemplo.com"})
    segunda = client.post("/entrar/pedir", json={"email": "novo@exemplo.com"})
    assert primeira.status_code == segunda.status_code == 204
    assert primeira.content == segunda.content == b""


def test_limite_de_pedidos_responde_igual(client, correio):
    """Passar do limite não pode ser distinguível de não passar — senão o limite
    vira o próprio detector de conta existente."""
    for _ in range(acesso_service.PEDIDOS_POR_JANELA + 3):
        r = client.post("/entrar/pedir", json={"email": "insistente@exemplo.com"})
        assert r.status_code == 204
    assert len(correio) == acesso_service.PEDIDOS_POR_JANELA


# ── o que o banco não pode guardar ──────────────────────────────────────────

def test_o_banco_guarda_o_resumo_e_nunca_o_link(client, correio, test_engine):
    from sqlalchemy.orm import Session

    client.post("/entrar/pedir", json={"email": "erik@exemplo.com"})
    token = correio[-1]["token"]

    with Session(test_engine) as db:
        chaves = db.query(Chave).all()
        assert len(chaves) == 1
        assert chaves[0].resumo != token
        assert chaves[0].resumo == acesso_service.resumir(token)
        assert len(chaves[0].resumo) == 64  # sha256 em hexadecimal


def test_a_sessao_tambem_e_guardada_por_resumo(client_cru, correio, test_engine):
    from sqlalchemy.orm import Session

    entrar(client_cru, correio)
    cookie = client_cru.cookies.get("mekora_sessao")

    with Session(test_engine) as db:
        sessoes = db.query(Sessao).all()
        assert len(sessoes) == 1
        assert sessoes[0].resumo != cookie
        assert sessoes[0].resumo == acesso_service.resumir(cookie)


def test_o_cookie_nao_e_legivel_por_javascript(client, correio):
    """`httpOnly` é o que impede uma falha de XSS em qualquer canto do produto
    de virar conta roubada — e é por isso que a sessão não mora em localStorage."""
    client.post("/entrar/pedir", json={"email": "erik@exemplo.com"})
    r = client.get(f"/entrar/{correio[-1]['token']}", follow_redirects=False)
    bruto = r.headers.get("set-cookie", "").lower()
    assert "httponly" in bruto
    assert "samesite=lax" in bruto


# ── o link, e as duas formas de ele valer demais ────────────────────────────

def test_o_link_serve_uma_vez_so(client, correio):
    """Um link que continua valendo depois de usado é uma senha permanente
    escrita em texto puro dentro de um e-mail."""
    client.post("/entrar/pedir", json={"email": "erik@exemplo.com"})
    token = correio[-1]["token"]

    primeira = client.get(f"/entrar/{token}", follow_redirects=False)
    assert primeira.status_code == 303
    assert primeira.headers["location"] == "http://testserver/estante"

    client.cookies.clear()
    segunda = client.get(f"/entrar/{token}", follow_redirects=False)
    assert segunda.status_code == 303
    assert "erro=link" in segunda.headers["location"]
    assert "set-cookie" not in {k.lower() for k in segunda.headers}


def test_em_desenvolvimento_o_email_e_os_redirecionamentos_voltam_a_interface_atual(
    client, correio, monkeypatch
):
    """A porta 8000 é a API; a pessoa deve terminar no Mekora da porta 5180."""
    monkeypatch.setenv("MEKORA_FRONTEND_URL", "http://127.0.0.1:5180/")

    client.post("/entrar/pedir", json={"email": "erik@exemplo.com"})
    assert correio[-1]["base_url"] == "http://127.0.0.1:5180"

    token = correio[-1]["token"]
    entrada = client.get(f"/entrar/{token}", follow_redirects=False)
    assert entrada.headers["location"] == "http://127.0.0.1:5180/estante"

    repetido = client.get(f"/entrar/{token}", follow_redirects=False)
    assert repetido.headers["location"] == "http://127.0.0.1:5180/entrar?erro=link"


def test_a_porta_da_api_nunca_serve_o_painel_legado(client):
    resposta = client.get("/")
    assert resposta.status_code == 200
    assert "<title>Mekora</title>" in resposta.text
    assert "<title>Kindle Local Tool</title>" not in resposta.text

    desenho = client.get("/icones/ilustracao-soltar-arquivo.svg")
    assert desenho.status_code == 200
    assert desenho.headers["content-type"].startswith("image/svg+xml")
    assert desenho.text.lstrip().startswith("<svg")


def test_o_link_vence(client, correio, test_engine):
    from sqlalchemy.orm import Session

    client.post("/entrar/pedir", json={"email": "erik@exemplo.com"})
    token = correio[-1]["token"]

    with Session(test_engine) as db:
        chave = db.query(Chave).one()
        chave.expira_em = agora() - VALIDADE_DA_CHAVE
        db.commit()

    r = client.get(f"/entrar/{token}", follow_redirects=False)
    assert "erro=link" in r.headers["location"]


def test_link_inventado_nao_entra(client):
    r = client.get("/entrar/isto-nao-e-um-token", follow_redirects=False)
    assert "erro=link" in r.headers["location"]


# ── sair ────────────────────────────────────────────────────────────────────

def test_sair_encerra_no_servidor_e_nao_so_no_navegador(client_cru, correio, test_engine):
    """Apagar só o cookie deixaria a sessão válida para quem já tivesse o valor
    — sair sem sair."""
    from sqlalchemy.orm import Session

    entrar(client_cru, correio)
    cookie = client_cru.cookies.get("mekora_sessao")
    assert client_cru.get("/eu").json()["entrou"] is True

    client_cru.post("/sair")
    assert client_cru.get("/eu").json()["entrou"] is False

    # E o valor antigo não serve mais, mesmo apresentado de novo.
    client_cru.cookies.set("mekora_sessao", cookie)
    assert client_cru.get("/eu").json()["entrou"] is False

    with Session(test_engine) as db:
        assert db.query(Sessao).one().encerrada is True


# ── e-mail ──────────────────────────────────────────────────────────────────

def test_email_e_guardado_em_minusculas(client_cru, correio, test_engine):
    """Sem isto, `Erik@x.com` e `erik@x.com` viram duas contas com duas estantes,
    e a pessoa perde a dela por causa da tecla shift."""
    from sqlalchemy.orm import Session

    client_cru.post("/entrar/pedir", json={"email": "  ERIK@Exemplo.COM  "})
    with Session(test_engine) as db:
        assert db.query(Pessoa).one().email == "erik@exemplo.com"


def test_endereco_sem_forma_de_email_e_recusado(client):
    r = client.post("/entrar/pedir", json={"email": "isto nao e email"})
    assert r.status_code == 400


# ── o buraco que a DEC-0039 §5 fecha ────────────────────────────────────────
#
# Antes de 30/08 o endereço de um arquivo era o NÚMERO do trabalho, e o número é
# sequencial. `/storage/output/7/livro.epub` respondia para quem contasse até
# sete. Num endereço público isso entrega os documentos de todos.


@pytest.fixture
def trabalho_com_arquivo(client, test_engine, tmp_storage):
    """Cria um trabalho e escreve um EPUB de verdade onde ele o serve."""
    from sqlalchemy.orm import Session

    from app.models.processing_job import ProcessingJob

    with Session(test_engine) as db:
        job = ProcessingJob(original_filename="livro.pdf", status="completed")
        db.add(job)
        db.commit()
        db.refresh(job)
        dados = {"id": job.id, "endereco": job.token_publico}

    pasta = tmp_storage / "output" / str(dados["id"])
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / "livro.epub").write_bytes(b"PK\x03\x04conteudo do livro")
    return dados


def test_o_endereco_publico_nasce_sozinho(trabalho_com_arquivo):
    """O valor vem do modelo, e não de quem cria o trabalho: há mais de um lugar
    que cria `ProcessingJob`, e um deles esquecendo daria um arquivo que não
    abre — sem barulho nenhum até alguém clicar."""
    assert trabalho_com_arquivo["endereco"]
    assert len(trabalho_com_arquivo["endereco"]) > 16
    assert not trabalho_com_arquivo["endereco"].isdigit()


def test_pelo_numero_sem_sessao_nao_abre(client, trabalho_com_arquivo):
    """Este é o defeito, escrito como teste."""
    r = client.get(f"/storage/output/{trabalho_com_arquivo['id']}/livro.epub")
    assert r.status_code == 404


def test_pelo_endereco_publico_abre_sem_conta(client, trabalho_com_arquivo):
    """Converter sem conta é garantido pela DEC-0018, e um trabalho sem dono
    precisa continuar alcançável por quem o criou."""
    r = client.get(f"/storage/output/{trabalho_com_arquivo['endereco']}/livro.epub")
    assert r.status_code == 200
    assert r.content == b"PK\x03\x04conteudo do livro"


def test_o_dono_abre_pelo_numero_e_um_estranho_nao(client, correio, test_engine, trabalho_com_arquivo):
    from sqlalchemy.orm import Session

    from app.models.pessoa import Pessoa
    from app.models.processing_job import ProcessingJob

    entrar(client, correio, "dono@exemplo.com")
    with Session(test_engine) as db:
        dono = db.query(Pessoa).filter(Pessoa.email == "dono@exemplo.com").one()
        db.query(ProcessingJob).filter(ProcessingJob.id == trabalho_com_arquivo["id"]).update(
            {"dono_id": dono.id}
        )
        db.commit()

    assert client.get(f"/storage/output/{trabalho_com_arquivo['id']}/livro.epub").status_code == 200

    client.post("/sair")
    client.cookies.clear()
    entrar(client, correio, "estranho@exemplo.com")
    assert client.get(f"/storage/output/{trabalho_com_arquivo['id']}/livro.epub").status_code == 404


def test_a_recusa_nao_conta_quais_numeros_existem(client, trabalho_com_arquivo):
    """404 igual nos dois casos. Um 403 em trabalho existente e 404 em
    inexistente entregaria a lista de números válidos — metade do que se está
    protegendo."""
    existe = client.get(f"/storage/output/{trabalho_com_arquivo['id']}/livro.epub")
    nao_existe = client.get("/storage/output/999999/livro.epub")
    assert existe.status_code == nao_existe.status_code == 404


def test_a_miniatura_passa_pela_mesma_porta(client, test_engine, tmp_storage, trabalho_com_arquivo):
    """A miniatura é a primeira página do documento, que costuma trazer título,
    autor e às vezes o nome de quem recebeu. Proteger o EPUB e deixar a capa
    aberta protegeria o livro e entregaria a capa."""
    pasta = tmp_storage / "temp" / str(trabalho_com_arquivo["id"])
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / "page_0.png").write_bytes(b"\x89PNG\r\n\x1a\n")

    assert client.get(f"/storage/temp/{trabalho_com_arquivo['id']}/page_0.png").status_code == 404
    assert client.get(f"/storage/temp/{trabalho_com_arquivo['endereco']}/page_0.png").status_code == 200


def test_a_estante_e_de_quem_pede(client, correio, test_engine, trabalho_com_arquivo):
    """Antes isto listava TODOS os processamentos — correto num produto de uma
    pessoa só na própria máquina, e a estante de todo mundo no ar."""
    from sqlalchemy.orm import Session

    from app.models.pessoa import Pessoa
    from app.models.processing_job import ProcessingJob

    assert client.get("/history").json() == []  # sem sessão, vazia

    entrar(client, correio, "dono@exemplo.com")
    assert client.get("/history").json() == []  # o trabalho ainda não é de ninguém

    with Session(test_engine) as db:
        dono = db.query(Pessoa).filter(Pessoa.email == "dono@exemplo.com").one()
        db.query(ProcessingJob).filter(ProcessingJob.id == trabalho_com_arquivo["id"]).update(
            {"dono_id": dono.id}
        )
        db.commit()

    minha = client.get("/history").json()
    assert len(minha) == 1
    assert minha[0]["upload_id"] == trabalho_com_arquivo["id"]
    assert minha[0]["endereco"] == trabalho_com_arquivo["endereco"]

    client.post("/sair")
    client.cookies.clear()
    entrar(client, correio, "estranho@exemplo.com")
    assert client.get("/history").json() == []


def test_trabalho_sem_dono_nao_aparece_para_quem_chegou_primeiro(client, correio, trabalho_com_arquivo):
    """Trabalho sem dono pertence a quem tem o endereço dele, e não a quem
    logou primeiro."""
    entrar(client, correio, "oportunista@exemplo.com")
    assert client.get("/history").json() == []


# ── a porta das rotas de trabalho ───────────────────────────────────────────
#
# Fechar o `/storage` sozinho não fechou o buraco: mudou de porta. `/analyze/1`
# respondia a qualquer um com o nome do documento E com o `endereco` dele — que
# é justamente o que abre o arquivo. Medido em 30/08, contra o servidor rodando.
#
# Estes testes usam `client_cru`. O `client` comum apresenta a chave sozinho, e
# com ele um teste de autorização passaria mesmo sem autorização nenhuma.


def test_estranho_nao_le_metadados_pelo_numero(client_cru, trabalho_com_arquivo):
    """O nome do arquivo já identifica o documento. Vazá-lo é vazar parte do
    que o produto existe para guardar."""
    for rota in (
        f"/analyze/{trabalho_com_arquivo['id']}",
        f"/jobs/{trabalho_com_arquivo['id']}/status",
    ):
        r = client_cru.get(rota)
        assert r.status_code == 404, f"{rota} respondeu {r.status_code}"


def test_o_endereco_publico_nao_vaza_pela_porta_dos_fundos(client_cru, trabalho_com_arquivo):
    """Este é o pior caso do vazamento: com o `endereco` em mãos, o estranho
    abre o arquivo — e aí proteger o `/storage` não teria servido para nada."""
    corpo = client_cru.get(f"/analyze/{trabalho_com_arquivo['id']}").text
    assert trabalho_com_arquivo["endereco"] not in corpo


def test_quem_tem_a_chave_do_trabalho_passa(client_cru, trabalho_com_arquivo):
    """É o que sustenta o trabalho feito SEM conta, garantido pela DEC-0018:
    sem dono não há o que conferir, então a prova é conhecer o endereço."""
    r = client_cru.get(
        f"/jobs/{trabalho_com_arquivo['id']}/status",
        headers={"X-Mekora-Chave": trabalho_com_arquivo["endereco"]},
    )
    assert r.status_code == 200


def test_chave_de_outro_trabalho_nao_serve(client_cru, test_engine, trabalho_com_arquivo):
    from sqlalchemy.orm import Session

    from app.models.processing_job import ProcessingJob

    with Session(test_engine) as db:
        outro = ProcessingJob(original_filename="outro.pdf", status="uploaded")
        db.add(outro)
        db.commit()
        chave_do_outro = outro.token_publico

    r = client_cru.get(
        f"/jobs/{trabalho_com_arquivo['id']}/status",
        headers={"X-Mekora-Chave": chave_do_outro},
    )
    assert r.status_code == 404


def test_a_porta_vale_para_rota_que_ainda_nao_existe(client_cru):
    """A conferência é uma dependência aplicada aos routers inteiros, e não
    código dentro de cada rota. São 41 rotas com número de trabalho no caminho
    hoje; conferir em cada uma seria 41 lugares para acertar e um para esquecer
    — e a rota esquecida responde para quem pedir, sem fazer barulho.

    Este teste guarda a ESTRUTURA: se alguém trocar a dependência por
    verificação caso a caso, ele continua passando por acaso — mas o de baixo,
    que conta os routers protegidos, não.
    """
    from main import app

    from app.core.arvore_de_rotas import rotas_do_app
    from app.api.porta import exigir_acesso

    protegidas = set()
    desprotegidas = set()
    # A ÁRVORE, E NÃO `app.routes`. O FastAPI 0.141 troca cada
    # `include_router` por um `_IncludedRouter`, e o filtro por `APIRoute`
    # passou a ver 1 rota de 124 — sem erro nenhum. Ver
    # `app/core/arvore_de_rotas.py`.
    for rota in rotas_do_app(app):
        caminho = getattr(rota, "path", "")
        if not any(f"{{{n}}}" in caminho for n in ("job_id", "upload_id")):
            continue
        deps = [
            d.call
            for d in getattr(getattr(rota, "dependant", None), "dependencies", [])
            if getattr(d, "call", None)
        ]
        (protegidas if exigir_acesso in deps else desprotegidas).add(caminho)

    assert not desprotegidas, f"rotas de trabalho sem porta: {sorted(desprotegidas)}"
    assert len(protegidas) >= 40


# ── a terceira porta: ter conta não é ser dono ──────────────────────────────
#
# `exigir_conta` fechou `/config`, `/app-config` e `/presets` em 31/08 e o
# `SUBIR.md` anotou o que sobrava: "não há papel de administrador; quem tem
# conta alcança" as três. Como a entrada é por link no e-mail, "quem tem conta"
# é qualquer pessoa da internet trinta segundos depois de querer — e do outro
# lado estava o `smtp_user` real, o `retention_days` de todo mundo, e o gatilho
# da limpeza.
#
# Os testes usam `client_cru` porque o `client` comum é nomeado DONO no
# conftest, e um cliente que se autoriza sozinho não prova porta nenhuma.

INSTALACAO = ["/config", "/app-config", "/presets"]


@pytest.mark.parametrize("rota", INSTALACAO)
def test_quem_tem_conta_e_nao_e_dono_nao_entra_na_instalacao(client_cru, correio, rota, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="estranha@exemplo.com")

    r = client_cru.get(rota)
    assert r.status_code == 403, f"{rota} respondeu {r.status_code} a quem não é dono"


@pytest.mark.parametrize("rota", INSTALACAO)
def test_sem_dono_configurado_ninguem_entra(client_cru, correio, rota, monkeypatch):
    """Fecha por FALTA.

    O contrário seria "esqueci de configurar, então está aberto" — que é como a
    maioria das instalações do mundo fica aberta.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "")
    entrar(client_cru, correio, email="qualquer@exemplo.com")

    r = client_cru.get(rota)
    assert r.status_code == 403, f"{rota} respondeu {r.status_code} sem dono nomeado"


@pytest.mark.parametrize("rota", INSTALACAO)
def test_o_dono_entra(client_cru, correio, rota, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "  Dona@Exemplo.com , outra@exemplo.com ")
    entrar(client_cru, correio, email="dona@exemplo.com")

    r = client_cru.get(rota)
    assert r.status_code == 200, f"{rota} recusou o próprio dono: {r.status_code}"


def test_a_porta_de_dono_cobre_as_tres_familias():
    """A lista não é escrita à mão duas vezes: é lida do app.

    Uma rota nova em `/config`, `/app-config` ou `/presets` nasce coberta porque
    a dependência está no router — e este teste falha se alguém a tirar.
    """
    from main import app

    from app.core.arvore_de_rotas import rotas_do_app
    from app.api.porta import exigir_dono

    faltando = []
    # A ÁRVORE, E NÃO `app.routes`. O FastAPI 0.141 troca cada
    # `include_router` por um `_IncludedRouter`, e o filtro por `APIRoute`
    # passou a ver 1 rota de 124 — sem erro nenhum. Ver
    # `app/core/arvore_de_rotas.py`.
    for rota in rotas_do_app(app):
        caminho = getattr(rota, "path", "")
        if not caminho.startswith(("/config", "/app-config", "/presets")):
            continue
        if caminho == "/config/formatos":
            continue  # a exceção declarada: público antes de ter conta
        deps = [
            d.call
            for d in getattr(getattr(rota, "dependant", None), "dependencies", [])
            if getattr(d, "call", None)
        ]
        if exigir_dono not in deps:
            faltando.append(caminho)

    assert not faltando, f"rotas de instalação sem a porta de dono: {sorted(faltando)}"
