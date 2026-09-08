"""A evidência de acesso privilegiado existe, tem os sete campos, e não copia o
que foi visto — `DEC-0041`.

O que estes testes protegem não é o arquivo: é a frase "temos auditoria". Ela é
fácil de dizer e cara de verificar, e um registro sem um dos sete campos parece
auditoria de longe. Foi por isso que o Erik escreveu a lista inteira em vez de
"registre os acessos".
"""

import json
from urllib.parse import quote
from datetime import datetime, timedelta, timezone

import pytest

# A FIXTURE VEM JUNTO COM O AJUDANTE. `correio` é definida em
# `test_acesso.py` e não no `conftest`, então importar só o `entrar`
# deixava oito testes com "fixture 'correio' not found".
from tests.test_acesso import correio, entrar  # noqa: F401


def eventos(tmp_storage):
    """Tudo que foi escrito, na ordem em que foi escrito."""
    pasta = tmp_storage / "auditoria"
    if not pasta.is_dir():
        return []
    linhas = []
    for arquivo in sorted(pasta.glob("acesso-*.jsonl")):
        linhas += [json.loads(l) for l in arquivo.read_text(encoding="utf-8").splitlines() if l.strip()]
    return linhas


def test_o_dono_entrando_deixa_evidencia_com_os_sete_campos(client_cru, correio, tmp_storage, monkeypatch):
    from app.auditoria import CAMPOS
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")

    r = client_cru.get("/config")
    assert r.status_code == 200

    registrados = eventos(tmp_storage)
    assert registrados, "o dono entrou em /config e nada foi registrado"
    e = registrados[-1]
    for campo in CAMPOS:
        assert campo in e and e[campo], f"o registro não tem `{campo}` — sete campos, e nenhum opcional"
    assert e["quem"] == "dona@exemplo.com"
    assert e["escopo"] == "/config"
    assert e["acao"] == "GET"
    assert e["resultado"] == "HTTP 200"


def test_a_tentativa_negada_tambem_e_registrada(client_cru, correio, tmp_storage, monkeypatch):
    """É a evidência mais interessante das duas.

    Quem bateu na porta do dono sem ser dono é exatamente o que uma revisão de
    acesso procura, e é o único sinal de que alguém tentou.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="estranha@exemplo.com")

    r = client_cru.get("/config")
    assert r.status_code == 403

    registrados = eventos(tmp_storage)
    assert registrados, "uma tentativa negada não deixou rastro nenhum"
    e = registrados[-1]
    assert e["quem"] == "estranha@exemplo.com"
    assert e["resultado"] == "HTTP 403"


def test_o_motivo_declarado_e_guardado_como_veio(client_cru, correio, tmp_storage, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")

    # PERCENT-ENCODED, e o teste é o lugar onde isso fica registrado: cabeçalho
    # HTTP é ISO-8859-1, e o `httpx` recusa enviar "saída" cru. Um motivo em
    # português quase sempre tem acento, então este é o caminho normal e não a
    # exceção.
    motivo = "incidente 12: e-mail de saída parou"
    client_cru.get("/config", headers={"X-Mekora-Motivo": quote(motivo)})

    e = eventos(tmp_storage)[-1]
    assert e["motivo"] == motivo


def test_motivo_em_ascii_puro_nao_precisa_ser_codificado(client_cru, correio, tmp_storage, monkeypatch):
    """`unquote` é inócuo para texto sem acento — quem escreve em ASCII não
    precisa saber que a codificação existe."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")

    client_cru.get("/config", headers={"X-Mekora-Motivo": "incidente 12"})
    assert eventos(tmp_storage)[-1]["motivo"] == "incidente 12"


def test_sem_motivo_declarado_o_registro_diz_isso_em_vez_de_inventar(
    client_cru, correio, tmp_storage, monkeypatch
):
    """Um motivo fabricado pelo próprio sistema que se audita não é informação.

    "Não declarado" é. A diferença aparece na revisão: uma coluna inteira de
    justificativas plausíveis não distingue rotina de exceção.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")

    client_cru.get("/config")

    e = eventos(tmp_storage)[-1]
    assert "não declarado" in e["motivo"]


def test_a_evidencia_nao_copia_o_que_foi_lido(client_cru, correio, tmp_storage, monkeypatch):
    """A `DEC-0040` aplicada ao próprio instrumento.

    `GET /recados` devolve o texto que as pessoas escreveram. Um registro de
    auditoria que copiasse esse texto para provar que alguém o leu duplicaria o
    vazamento que ele existe para vigiar.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")
    segredo = "isto aqui e o texto do recado de alguem"
    client_cru.post("/recados", json={"texto": segredo, "humor": "duvida"})

    r = client_cru.get("/recados")
    assert r.status_code == 200
    assert segredo in r.text, "a bancada não produziu o caso: o recado não voltou na resposta"

    bruto = "\n".join(json.dumps(e, ensure_ascii=False) for e in eventos(tmp_storage))
    assert segredo not in bruto, "o registro de auditoria copiou o conteúdo que foi lido"


def test_rota_comum_nao_gera_evidencia(client_cru, correio, tmp_storage, monkeypatch):
    """O registro é de acesso PRIVILEGIADO.

    Se toda requisição entrasse, o arquivo viraria um log de acesso — e um log
    de acesso onde tudo está registrado é um lugar onde nada é encontrado.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")

    antes = len(eventos(tmp_storage))
    client_cru.get("/history")
    assert len(eventos(tmp_storage)) == antes


def test_escrever_nunca_derruba_a_requisicao(client_cru, correio, monkeypatch):
    """Auditoria que derruba a requisição é auditoria que alguém desliga."""
    from app import auditoria
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")

    def explode(*a, **k):
        raise OSError("disco cheio")

    monkeypatch.setattr(auditoria, "_pasta", explode)
    r = client_cru.get("/config")
    assert r.status_code == 200


def test_a_limpeza_apaga_mes_vencido_e_poupa_o_corrente(tmp_storage, monkeypatch):
    from app import auditoria

    monkeypatch.setattr(auditoria, "_pasta", lambda: tmp_storage / "auditoria")
    pasta = tmp_storage / "auditoria"
    pasta.mkdir(parents=True, exist_ok=True)

    agora = datetime.now(timezone.utc)
    velho = agora - timedelta(days=400)
    (pasta / f"acesso-{velho:%Y-%m}.jsonl").write_text('{"quando":"x"}\n', encoding="utf-8")
    (pasta / f"acesso-{agora:%Y-%m}.jsonl").write_text('{"quando":"y"}\n', encoding="utf-8")

    assert auditoria.limpar(dias=90) == 1
    assert (pasta / f"acesso-{agora:%Y-%m}.jsonl").exists()
    assert not (pasta / f"acesso-{velho:%Y-%m}.jsonl").exists()


def test_a_limpeza_nao_apaga_mes_que_ainda_tem_dia_dentro_da_janela(tmp_storage, monkeypatch):
    """Por ARQUIVO, e o arquivo só vence quando o mês inteiro venceu.

    Apagar por linha exigiria reescrever o arquivo — e quem pode reescrever para
    limpar pode reescrever para sumir com um evento.
    """
    from app import auditoria

    monkeypatch.setattr(auditoria, "_pasta", lambda: tmp_storage / "auditoria")
    pasta = tmp_storage / "auditoria"
    pasta.mkdir(parents=True, exist_ok=True)

    agora = datetime.now(timezone.utc)
    quase = agora - timedelta(days=80)
    (pasta / f"acesso-{quase:%Y-%m}.jsonl").write_text('{"quando":"x"}\n', encoding="utf-8")

    auditoria.limpar(dias=90)
    assert (pasta / f"acesso-{quase:%Y-%m}.jsonl").exists()


def test_uma_linha_quebrada_nao_apaga_as_outras(tmp_storage, monkeypatch):
    """Escrita interrompida por queda deixa meia linha."""
    from app import auditoria

    monkeypatch.setattr(auditoria, "_pasta", lambda: tmp_storage / "auditoria")
    pasta = tmp_storage / "auditoria"
    pasta.mkdir(parents=True, exist_ok=True)
    agora = datetime.now(timezone.utc)
    (pasta / f"acesso-{agora:%Y-%m}.jsonl").write_text(
        '{"quando":"1","quem":"a"}\n{"quando":"2","que\n{"quando":"3","quem":"c"}\n',
        encoding="utf-8",
    )

    lidos = auditoria.ler()
    assert [e["quem"] for e in lidos] == ["c", "a"], "a linha quebrada levou as inteiras junto"


def test_ler_devolve_do_mais_novo_para_o_mais_velho(tmp_storage, monkeypatch):
    """Sem uma forma de LER, o registro é um arquivo que ninguém abre."""
    from app import auditoria

    monkeypatch.setattr(auditoria, "_pasta", lambda: tmp_storage / "auditoria")
    for i in range(3):
        auditoria.registrar(
            quem=f"pessoa{i}@exemplo.com",
            motivo="teste",
            escopo="/config",
            alvo="—",
            acao="GET",
            resultado="HTTP 200",
        )
    lidos = auditoria.ler()
    assert [e["quem"] for e in lidos] == [
        "pessoa2@exemplo.com",
        "pessoa1@exemplo.com",
        "pessoa0@exemplo.com",
    ]


def test_o_registro_nao_mora_no_banco(client_cru, correio, tmp_storage, monkeypatch):
    """Um `DELETE FROM` no banco principal não alcança um arquivo que não está nele.

    Não é um cofre — quem tem o disco tem os dois. É a diferença entre apagar
    dado e apagar dado *sem deixar sinal*.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "dono_email", "dona@exemplo.com")
    entrar(client_cru, correio, email="dona@exemplo.com")
    client_cru.get("/config")

    assert eventos(tmp_storage), "nada foi registrado"
    assert (tmp_storage / "auditoria").is_dir()
    assert not any((tmp_storage / "auditoria").glob("*.db"))
