"""O que o Mekora guarda, e o que acontece quando alguém pede para sair."""

import pytest

from app.api.privacidade import O_QUE_GUARDAMOS


def test_a_lista_cobre_tudo_que_aponta_para_a_pessoa():
    """A tela é derivada, mas a LISTA é escrita à mão — e é aí que ela envelhece.

    Uma tabela nova ligada à pessoa que não entre em `O_QUE_GUARDAMOS` faria a
    tela de privacidade afirmar, com números, que o Mekora guarda menos do que
    guarda. Este teste compara com o que de fato aponta para `pessoas`.
    """
    from app.db.database import Base

    apontam = set()
    for tabela in Base.metadata.tables.values():
        for fk in tabela.foreign_keys:
            if fk.column.table.name == "pessoas":
                apontam.add(tabela.name)

    listadas = set()
    for _, modelo, _ in O_QUE_GUARDAMOS:
        listadas.add(modelo.__tablename__)

    faltando = apontam - listadas
    assert not faltando, (
        f"estas tabelas guardam dados de uma pessoa e não aparecem na tela de "
        f"privacidade: {sorted(faltando)}"
    )


def test_privacidade_conta_o_que_existe(client):
    r = client.get("/privacidade")
    assert r.status_code == 200
    d = r.json()
    assert d["email"]
    assert {i["nome"] for i in d["itens"]} >= {"conta", "notas", "aparelhos"}
    # Cada item explica o que é: um número sozinho não diz o que se guarda.
    assert all(i["explicacao"] for i in d["itens"])


def test_estranho_nao_ve_privacidade_de_ninguem(client_cru):
    assert client_cru.get("/privacidade").status_code == 401
    assert client_cru.get("/privacidade/levar").status_code == 401


def test_levar_traz_as_notas_por_inteiro(client):
    """As notas são a única coisa aqui que a pessoa não conseguiria refazer."""
    client.post("/aparelhos", json={"endereco": "meu@kindle.com"})
    r = client.get("/privacidade/levar")
    assert r.status_code == 200
    d = r.json()
    assert "notas" in d and "aparelhos" in d and "preferencias" in d
    assert d["aparelhos"][0]["endereco"] == "meu@kindle.com"


def test_apagar_exige_o_email_digitado(client):
    """A diferença entre um clique errado e uma decisão."""
    r = client.post("/privacidade/apagar", json={"email": "outro@exemplo.com"})
    assert r.status_code == 400
    assert "nada foi apagado" in r.json()["detail"].lower()
    # e a conta continua lá
    assert client.get("/eu").json()["entrou"] is True


def test_apagar_leva_tudo_junto(client, test_engine):
    """Apagar apaga. Não marca como apagado, não esconde da listagem."""
    from sqlalchemy.orm import sessionmaker

    from app.models.aparelho import Aparelho
    from app.models.nota import Nota
    from app.models.pessoa import Pessoa

    client.post("/aparelhos", json={"endereco": "vai@kindle.com"})
    email = client.get("/eu").json()["email"]

    r = client.post("/privacidade/apagar", json={"email": email})
    assert r.status_code == 204

    S = sessionmaker(bind=test_engine)
    db = S()
    try:
        pessoa = db.query(Pessoa).filter(Pessoa.email == email).first()
        assert pessoa is None, "a pessoa continua no banco"
        assert db.query(Aparelho).count() == 0, "o CASCADE não levou os aparelhos"
        assert db.query(Nota).count() == 0, "o CASCADE não levou as notas"
    finally:
        db.close()


def test_apagar_leva_os_arquivos_do_disco(client, tmp_storage, sample_pdf):
    """O banco não resolve isto sozinho: `dono_id` tem SET NULL, o que
    preservaria o trabalho e deixaria o EPUB no disco sem dono. Para quem pediu
    para apagar a conta, "os arquivos continuam lá, sem seu nome" não é o que
    foi pedido."""
    from app.core.config import STORAGE_INPUT

    with open(sample_pdf, "rb") as f:
        job = client.post("/upload", files={"file": ("doc.pdf", f, "application/pdf")}).json()["upload_id"]

    entradas = list(STORAGE_INPUT.glob(f"{job}_*"))
    assert entradas, "o upload não gravou nada — o teste não provaria nada"

    email = client.get("/eu").json()["email"]
    assert client.post("/privacidade/apagar", json={"email": email}).status_code == 204

    assert not list(STORAGE_INPUT.glob(f"{job}_*")), "o arquivo continuou no disco"
