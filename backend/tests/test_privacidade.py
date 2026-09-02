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
    for _, _, modelo, _ in O_QUE_GUARDAMOS:
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


def test_os_nomes_da_tela_nao_sao_chaves_de_codigo():
    """A tela mostrava `preferencias`, `no_canvas` e `grupos_do_canvas`.

    Eram os identificadores internos servidos crus para quem lê. O underline é a
    assinatura do defeito: nenhuma palavra escrita para uma pessoa tem `_` no
    meio. A falta de acento é a outra metade.
    """
    for _, nome, _, _ in O_QUE_GUARDAMOS:
        assert "_" not in nome, f"'{nome}' é chave de código, não nome de tela"
    nomes = {n for _, n, _, _ in O_QUE_GUARDAMOS}
    assert "preferências" in nomes and "ligações" in nomes and "sessões" in nomes


# ---------------------------------------------------------------------------
# O nome do arquivo não entra em evento de uso
# ---------------------------------------------------------------------------

def test_metrica_nao_guarda_caminho_nem_nome_de_arquivo():
    """A tela de privacidade promete que o nome dos arquivos nunca é medido.

    A promessa era falsa por um caminho banal: `error_message` recebe
    `str(exc)[:500]` de exceções arbitrárias, e as exceções desta pipeline citam
    caminho — o ocrmypdf, o Calibre e o `Path` do Python põem o arquivo na
    mensagem. O nome do documento de alguém entrava na tabela de métricas toda
    vez que uma conversão falhava.
    """
    from app.services.metrics_service import sem_caminhos

    casos = [
        "OCR falhou: /Users/alguem/storage/input/12_Diário Pessoal.pdf não abriu",
        r"C:\Users\erik\Documentos\Tese Final.docx não existe",
        "não consegui abrir Cartas ao Meu Pai.epub",
        "~/Downloads/relatório 2026.pdf está corrompido",
    ]
    for bruto in casos:
        limpo = sem_caminhos(bruto)
        assert "‹arquivo›" in limpo, bruto
        for pedaco in ("Diário", "Tese", "Cartas", "relatório", "Users", "Downloads"):
            assert pedaco not in limpo, (bruto, limpo)

    # O QUE NÃO É CAMINHO CONTINUA INTEIRO: uma métrica sem a razão da falha não
    # serve para nada, e apagar demais é tão ruim quanto apagar de menos.
    assert sem_caminhos("ebook-convert falhou (código 1)") == "ebook-convert falhou (código 1)"
    assert sem_caminhos("timeout depois de 300s") == "timeout depois de 300s"
    assert sem_caminhos(None) is None
    assert sem_caminhos("") == ""


def test_privacidade_conta_o_ciclo_dos_arquivos_e_o_que_e_medido(client):
    """As duas seções do nó 895:10909 — e o prazo sai da configuração, não da mão."""
    r = client.get("/privacidade")
    assert r.status_code == 200
    corpo = r.json()

    titulos = [a["titulo"] for a in corpo["arquivos"]]
    assert titulos == ["O original", "O resultado", "Conteúdo"]
    # QUEM TEM CONTA NÃO OUVE PRAZO NENHUM, e é a decisão do Erik de 03/09: a
    # conta passa a valer que o arquivo fica enquanto o serviço existir. O
    # `client` está logado, então é essa a frase que ele recebe.
    assert "Enquanto o Mekora existir" in corpo["arquivos"][0]["prazo"]
    assert "dias" not in corpo["arquivos"][0]["prazo"]

    medido = {u["titulo"]: u for u in corpo["uso"]}
    assert set(medido) == {"O que é medido", "O que nunca é medido"}
    assert medido["O que nunca é medido"]["marca"] == "Regra fixa"

    # A FRASE QUE ERA FALSA. Ela dizia "não há rastreamento, análise de uso nem
    # publicidade", e `stage_metrics` mede o preparo etapa por etapa.
    junto = " ".join(corpo["para_onde_vai"])
    assert "análise de uso" not in junto
    assert "medição fica neste servidor" in junto


# ---------------------------------------------------------------------------
# Nome e retrato — a decisão de 02/09/2026
# ---------------------------------------------------------------------------

def test_nome_entra_e_sai(client):
    """Vazio APAGA. "Sem nome" e "nome em branco" são o mesmo estado para quem
    lê a tela, e dois jeitos de escrever o mesmo estado é como um deles deixa de
    ser tratado."""
    assert client.get("/eu").json()["nome"] is None

    assert client.patch("/eu", json={"nome": "  Erik Abner  "}).status_code == 200
    assert client.get("/eu").json()["nome"] == "Erik Abner"

    assert client.patch("/eu", json={"nome": "   "}).status_code == 200
    assert client.get("/eu").json()["nome"] is None


def test_nome_tem_teto(client):
    r = client.patch("/eu", json={"nome": "a" * 81})
    assert r.status_code == 422
    assert "80" in r.json()["detail"]


def test_o_email_nao_se_muda_por_aqui(client):
    """Trocar o e-mail é trocar de identidade: links, sessões e o dono de tudo
    apontam para ele. O corpo com `email` é ignorado, não obedecido."""
    antes = client.get("/eu").json()["email"]
    client.patch("/eu", json={"nome": "Erik", "email": "outro@exemplo.com"})
    assert client.get("/eu").json()["email"] == antes


def _png(cor=(200, 30, 30), tamanho=(900, 400)):
    from io import BytesIO

    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", tamanho, cor).save(buf, format="PNG")
    return buf.getvalue()


def test_retrato_vira_png_quadrado_do_servidor(client, tmp_storage):
    """O QUE ENTRA NÃO É O QUE FICA: entra uma imagem 900x400, fica um PNG
    quadrado de lado fixo. Guardar os bytes que chegaram seria guardar o EXIF —
    câmera, data e, em foto de celular, coordenada de GPS."""
    from io import BytesIO

    from PIL import Image

    from app.api.acesso import RETRATO_LADO

    assert client.get("/eu").json()["tem_retrato"] is False
    assert client.get("/eu/retrato").status_code == 404

    r = client.put("/eu/retrato", files={"arquivo": ("eu.png", _png(), "image/png")})
    assert r.status_code == 200, r.text
    assert client.get("/eu").json()["tem_retrato"] is True

    saida = client.get("/eu/retrato")
    assert saida.status_code == 200
    assert saida.headers["content-type"] == "image/png"
    imagem = Image.open(BytesIO(saida.content))
    assert imagem.size == (RETRATO_LADO, RETRATO_LADO)


def test_retrato_recusa_o_que_nao_e_imagem(client, tmp_storage):
    """O TIPO DECLARADO NÃO É PROVA: `content_type` vem do cliente, e quem diz
    se aquilo é imagem é o decodificador."""
    r = client.put("/eu/retrato", files={"arquivo": ("x.png", b"nao sou imagem", "image/png")})
    assert r.status_code == 400
    assert client.get("/eu").json()["tem_retrato"] is False

    r = client.put("/eu/retrato", files={"arquivo": ("x.pdf", _png(), "application/pdf")})
    assert r.status_code == 400


def test_tirar_o_retrato_apaga_o_arquivo(client, tmp_storage):
    """Deixar o PNG no disco com a coluna limpa seria "removido da tela" em vez
    de removido."""
    from pathlib import Path

    from app.models.pessoa import Pessoa
    from app.db.database import SessionLocal

    client.put("/eu/retrato", files={"arquivo": ("eu.png", _png(), "image/png")})

    db = SessionLocal()
    caminho = Path(db.query(Pessoa).first().retrato)
    db.close()
    assert caminho.is_file()

    assert client.delete("/eu/retrato").status_code == 204
    assert not caminho.exists()
    assert client.get("/eu").json()["tem_retrato"] is False


def test_estranho_nao_ve_retrato_de_ninguem(client_cru):
    """A rota não tem parâmetro nenhum de propósito: com `/retrato/{id}` haveria
    como varrer números e recolher a cara de todo mundo."""
    assert client_cru.get("/eu/retrato").status_code == 401
    assert client_cru.patch("/eu", json={"nome": "invasor"}).status_code == 401


def test_apagar_a_conta_leva_o_retrato_do_disco(client, tmp_storage):
    """O CASCADE do banco não alcança o disco."""
    from pathlib import Path

    from app.models.pessoa import Pessoa
    from app.db.database import SessionLocal

    client.put("/eu/retrato", files={"arquivo": ("eu.png", _png(), "image/png")})
    db = SessionLocal()
    pessoa = db.query(Pessoa).first()
    caminho, email = Path(pessoa.retrato), pessoa.email
    db.close()
    assert caminho.is_file()

    assert client.post("/privacidade/apagar", json={"email": email}).status_code == 204
    assert not caminho.exists()


# ---------------------------------------------------------------------------
# Qual Kindle é este (nó 895:10599)
# ---------------------------------------------------------------------------

def test_modelo_do_kindle_entra_e_descreve(client):
    """A resolução é do MODELO, e a frase vem montada do servidor: duplicar a
    tabela no navegador é como as duas passam a discordar."""
    r = client.get("/aparelhos/modelos")
    assert r.status_code == 200
    chaves = {m["chave"] for m in r.json()["modelos"]}
    assert "pw5" in chaves and "oasis3" in chaves

    novo = client.post("/aparelhos", json={
        "endereco": "erik_x@kindle.com", "nome": "O meu", "modelo": "pw5",
    })
    assert novo.status_code == 201, novo.text
    assert novo.json()["modelo"] == "pw5"
    assert "1236 × 1648" in novo.json()["modelo_diz"]


def test_nao_saber_o_modelo_e_resposta_valida(client):
    """A lista envelhece, e por isso tem saída: sem modelo o produto segue com o
    padrão da instalação, exatamente como fazia antes."""
    novo = client.post("/aparelhos", json={"endereco": "erik_y@kindle.com", "nome": "Sem modelo"})
    assert novo.status_code == 201
    assert novo.json()["modelo"] is None
    assert novo.json()["modelo_diz"] is None

    # E dá para tirar depois: `""` apaga, `None` não mexe.
    posto = client.patch(f"/aparelhos/{novo.json()['id']}", json={"modelo": "oasis3"})
    assert posto.json()["modelo"] == "oasis3"
    tirado = client.patch(f"/aparelhos/{novo.json()['id']}", json={"modelo": ""})
    assert tirado.json()["modelo"] is None


def test_modelo_inventado_e_recusado(client):
    novo = client.post("/aparelhos", json={"endereco": "erik_z@kindle.com", "modelo": "kindle-do-futuro"})
    assert novo.status_code == 422


def test_o_modelo_escolhe_o_perfil_do_quadrinho():
    """É a consequência que faz a pergunta valer. Sem ela, saber o modelo seria
    uma etiqueta bonita no cartão do aparelho."""
    from app.services.kindles import perfil_do_kcc

    assert perfil_do_kcc("oasis3") == "KO"
    assert perfil_do_kcc("pw5") == "KPW5"
    # Não saber devolve None, e quem chama fica com o padrão da instalação.
    assert perfil_do_kcc(None) is None
    assert perfil_do_kcc("modelo-que-nao-existe") is None
