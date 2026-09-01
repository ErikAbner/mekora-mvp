"""A busca do cabeçalho e o "Remover da estante" — nós 941:23107 e 941:23118.

O que estes testes protegem não é a feliz: é a linha que separa o que é meu do
que é de outra pessoa. Uma busca é, por construção, uma rota que devolve uma
lista de coisas a partir de um texto — e uma lista que não filtra por dono é
como se descobre o acervo dos outros uma palavra por vez.
"""

from __future__ import annotations

import pytest

from sqlalchemy.orm import Session

from app.models.nota import Nota
from app.models.pessoa import Pessoa
from app.models.processing_job import ProcessingJob
from app.services import acesso_service


@pytest.fixture
def db(test_engine):
    """Uma sessão contra o mesmo banco do cliente, para montar o cenário.

    Os trabalhos aqui não passam pela conversão: o que está sob teste é quem
    acha e quem apaga, não como o EPUB nasce. Montar pelo banco é o que permite
    ter dois donos em três linhas.
    """
    with Session(test_engine) as s:
        yield s


@pytest.fixture
def correio(monkeypatch):
    caixa = []
    monkeypatch.setattr(
        acesso_service, "enviar_link",
        lambda email, token, base_url: caixa.append({"email": email, "token": token}),
    )
    return caixa


def entrar(client_cru, db, correio, email):
    """Entra, e devolve o id da pessoa.

    `/eu` não devolve o id de propósito — ele não serve para nada na tela e é
    mais uma coisa que sai pela rede. Aqui ele vem do banco, porque montar um
    trabalho de alguém exige dizer de quem.
    """
    assert client_cru.post("/entrar/pedir", json={"email": email}).status_code == 204
    token = correio[-1]["token"]
    assert client_cru.get(f"/entrar/{token}", follow_redirects=False).status_code == 303
    return db.query(Pessoa).filter(Pessoa.email == email).one().id


def livro(db, dono_id, titulo, autor="", nome="a.pdf"):
    j = ProcessingJob(
        dono_id=dono_id, original_filename=nome, final_title=titulo,
        final_author=autor, input_format="pdf", status="done",
    )
    db.add(j); db.commit(); db.refresh(j)
    return j


# ── a busca ─────────────────────────────────────────────────────────────────

def test_busca_sem_conta_pede_conta(client_cru):
    assert client_cru.get("/buscar?q=viabilidade").status_code == 401


def test_busca_acha_por_titulo_autor_e_nome_do_arquivo(client_cru, db, correio):
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    livro(db, eu, "Estudo da viabilidade", "Ana Duarte", "viab.pdf")

    for termo in ("viabilidade", "Ana Duarte", "viab.pdf"):
        achados = client_cru.get(f"/buscar?q={termo}").json()["livros"]
        assert len(achados) == 1, termo
        assert achados[0]["titulo"] == "Estudo da viabilidade"
        assert achados[0]["autor"] == "Ana Duarte"
        assert achados[0]["formato"] == "PDF"


def test_busca_nao_atravessa_para_o_acervo_de_outra_pessoa(client_cru, db, correio):
    outra = entrar(client_cru, db, correio, "outra@exemplo.com")
    livro(db, outra, "Diário de campo")
    client_cru.post("/sair")

    entrar(client_cru, db, correio, "erik@exemplo.com")
    assert client_cru.get("/buscar?q=Diário").json()["livros"] == []


def test_busca_curta_nao_e_erro(client_cru, db, correio):
    entrar(client_cru, db, correio, "erik@exemplo.com")
    r = client_cru.get("/buscar?q=a")
    assert r.status_code == 200
    assert r.json()["curto"] is True


def test_por_cento_nao_e_curinga(client_cru, db, correio):
    """`%` no `LIKE` casa com qualquer coisa. Escrito por uma pessoa, é um por
    cento — e sem escapar, procurar "100%" devolveria a estante inteira."""
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    livro(db, eu, "Cem por cento de cobertura")
    livro(db, eu, "Outro livro qualquer")
    assert client_cru.get("/buscar?q=100%").json()["livros"] == []


def test_busca_acha_nota_e_estudo(client_cru, db, correio):
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    db.add(Nota(pessoa_id=eu, trecho="a expedição partiu ao amanhecer", fonte="solta"))
    db.commit()
    assert client_cru.post("/estudos/novo", json={"nome": "Expedições", "sobre": ""}).status_code == 201

    r = client_cru.get("/buscar?q=expedi").json()
    assert len(r["notas"]) == 1
    assert len(r["estudos"]) == 1


# ── remover da estante ──────────────────────────────────────────────────────

def test_remover_apaga_o_trabalho_e_os_arquivos(client_cru, db, correio, tmp_storage):
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    j = livro(db, eu, "Some daqui")

    entrada = tmp_storage / "input" / "some.pdf"
    entrada.write_bytes(b"%PDF-1.4")
    j.input_path = str(entrada)
    db.commit()

    saida = tmp_storage / "output" / str(j.id)
    saida.mkdir(parents=True)
    (saida / "some.epub").write_bytes(b"PK")

    assert client_cru.delete(f"/jobs/{j.id}").status_code == 204
    assert not entrada.exists()
    assert not saida.exists()
    assert db.query(ProcessingJob).filter(ProcessingJob.id == j.id).first() is None


def test_remover_leva_as_notas_do_livro_junto(client_cru, db, correio):
    """A cascata é do banco. Se o PRAGMA de chave estrangeira se perder, ela
    deixa de acontecer em silêncio — e a nota fica apontando um livro que não
    existe mais."""
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    j = livro(db, eu, "Some daqui")
    db.add(Nota(pessoa_id=eu, job_id=j.id, trecho="uma linha", fonte="leitura"))
    db.commit()

    assert client_cru.delete(f"/jobs/{j.id}").status_code == 204
    assert db.query(Nota).filter(Nota.job_id == j.id).count() == 0


def test_remover_o_livro_de_outra_pessoa_responde_404(client_cru, db, correio):
    outra = entrar(client_cru, db, correio, "outra@exemplo.com")
    j = livro(db, outra, "Não é seu")
    client_cru.post("/sair")

    entrar(client_cru, db, correio, "erik@exemplo.com")
    assert client_cru.delete(f"/jobs/{j.id}").status_code == 404
    assert db.query(ProcessingJob).filter(ProcessingJob.id == j.id).first() is not None


# ── o buraco que derrubava o /status ────────────────────────────────────────

def test_status_sobrevive_a_coluna_nula(client_cru, db, correio):
    """Um NULL numa coluna que o esquema declara não-nula derrubava a resposta
    inteira com 500 — e a tela de preparo dizia "O Mekora não está respondendo
    agora" para um trabalho que o `/analyze` devolvia sem reclamar.

    O NULL chega por um caminho banal: um registro criado antes de a coluna
    existir. `_sem_buracos` já cobria o `/analyze`; faltava aqui.
    """
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    j = livro(db, eu, "Com buraco")
    for coluna in ("ocr_status", "conversion_status", "send_status",
                   "translation_status", "comic_translation_status"):
        setattr(j, coluna, None)
    db.commit()

    r = client_cru.get(f"/jobs/{j.id}/status")
    assert r.status_code == 200, r.text
    assert r.json()["conversion_status"] == ""


# ── os grupos do Canvas — nó 895:6938 ───────────────────────────────────────

def test_grupo_nasce_com_o_tamanho_pedido_e_aparece_na_superficie(client_cru, db, correio):
    entrar(client_cru, db, correio, "erik@exemplo.com")
    r = client_cru.post("/canvas/grupos", json={"nome": "Design & Tecnologia", "x": 40, "y": 60})
    assert r.status_code == 201
    g = r.json()
    assert g["nome"] == "Design & Tecnologia"
    assert (g["largura"], g["altura"]) == (480, 320)

    superficie = client_cru.get("/canvas/superficie").json()
    assert [x["id"] for x in superficie["grupos"]] == [g["id"]]


def test_grupo_nao_encolhe_abaixo_do_minimo(client_cru, db, correio):
    """Um retângulo de um pixel some da tela sem deixar como pegá-lo de volta."""
    entrar(client_cru, db, correio, "erik@exemplo.com")
    g = client_cru.post("/canvas/grupos", json={}).json()
    r = client_cru.patch(f"/canvas/grupos/{g['id']}", json={"largura": 2, "altura": 2})
    assert r.status_code == 200
    assert (r.json()["largura"], r.json()["altura"]) == (120, 120)


def test_desfazer_o_grupo_nao_leva_as_notas_junto(client_cru, db, correio):
    """O grupo é um pedaço de chão com nome, e não um recipiente."""
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    db.add(Nota(pessoa_id=eu, trecho="uma linha", fonte="solta"))
    db.commit()
    nota = db.query(Nota).filter(Nota.pessoa_id == eu).one()
    assert client_cru.post("/canvas/nos", json={"nota_id": nota.id, "x": 10, "y": 10}).status_code == 201

    g = client_cru.post("/canvas/grupos", json={"nome": "Método"}).json()
    assert client_cru.delete(f"/canvas/grupos/{g['id']}").status_code == 204

    superficie = client_cru.get("/canvas/superficie").json()
    assert superficie["grupos"] == []
    assert len(superficie["nos"]) == 1


def test_grupo_de_outra_pessoa_responde_404(client_cru, db, correio):
    entrar(client_cru, db, correio, "outra@exemplo.com")
    g = client_cru.post("/canvas/grupos", json={"nome": "Não é seu"}).json()
    client_cru.post("/sair")

    entrar(client_cru, db, correio, "erik@exemplo.com")
    assert client_cru.patch(f"/canvas/grupos/{g['id']}", json={"nome": "meu agora"}).status_code == 404
    assert client_cru.delete(f"/canvas/grupos/{g['id']}").status_code == 404


# ── editar um aparelho — nó 966:25554 ───────────────────────────────────────

def test_editar_o_endereco_do_aparelho(client_cru, db, correio):
    """A rota aceitava nome, principal e autorizado — e NÃO o endereço.

    Dava para renomear e para eleger o principal; não dava para corrigir um
    endereço digitado errado. A única saída era apagar e ligar de novo, perdendo
    o nome. O botão "Editar" do desenho pede as duas coisas.
    """
    entrar(client_cru, db, correio, "erik@exemplo.com")
    novo = client_cru.post("/aparelhos", json={"endereco": "erik@kindle.com", "nome": "Sala"})
    assert novo.status_code == 201
    ap = novo.json()

    r = client_cru.patch(f"/aparelhos/{ap['id']}", json={"endereco": "escritorio@kindle.com"})
    assert r.status_code == 200
    assert r.json()["endereco"] == "escritorio@kindle.com"


def test_endereco_editado_passa_pela_mesma_forma(client_cru, db, correio):
    """Um endereço que não termina em @kindle.com faz o envio sair, ninguém
    receber, e não haver erro nenhum para investigar."""
    entrar(client_cru, db, correio, "erik@exemplo.com")
    ap = client_cru.post("/aparelhos", json={"endereco": "erik@kindle.com"}).json()

    r = client_cru.patch(f"/aparelhos/{ap['id']}", json={"endereco": "erik@gmail.com"})
    assert r.status_code == 422


def test_editar_para_um_endereco_que_ja_existe_e_recusado(client_cru, db, correio):
    """Dois cartões mandando para o mesmo lugar, e "tornar principal" num deles
    sem mudar nada."""
    entrar(client_cru, db, correio, "erik@exemplo.com")
    a = client_cru.post("/aparelhos", json={"endereco": "um@kindle.com"}).json()
    client_cru.post("/aparelhos", json={"endereco": "dois@kindle.com"})

    r = client_cru.patch(f"/aparelhos/{a['id']}", json={"endereco": "dois@kindle.com"})
    assert r.status_code == 409


# ── o tamanho do arquivo — o selo do nó 966:31504 ───────────────────────────

def test_o_tamanho_do_arquivo_e_gravado_no_envio(client, tmp_storage, sample_pdf):
    """Ele existia só no disco, e o disco esquece.

    `cleanup_old_jobs` apaga o input e deixa o EPUB: a partir daí não há mais a
    quem perguntar o tamanho. Por isso ele é lido no único momento em que o
    arquivo existe com certeza — quando chega.
    """
    with open(sample_pdf, "rb") as f:
        r = client.post("/upload", files={"file": ("prova.pdf", f, "application/pdf")})
    assert r.status_code == 201

    ficha = client.get(f"/analyze/{r.json()['upload_id']}").json()
    assert ficha["input_bytes"] == sample_pdf.stat().st_size
    assert ficha["input_bytes"] > 0


def test_trabalho_antigo_nao_mente_o_tamanho(client_cru, db, correio):
    """Nulo é "não sei", e a tela cala. Zero seria o produto afirmando que o
    arquivo é vazio — falso para todos os trabalhos anteriores à coluna."""
    eu = entrar(client_cru, db, correio, "erik@exemplo.com")
    j = livro(db, eu, "Antigo")
    assert j.input_bytes is None

    ficha = client_cru.get(f"/analyze/{j.id}").json()
    assert ficha["input_bytes"] is None


# ── escrever sobre o livro — nó 895:7839 ────────────────────────────────────

def test_nota_sobre_o_livro_nao_precisa_cobrir_caractere(client, tmp_storage, sample_pdf):
    """O conjunto não tem começo nem fim no texto.

    A conferência exigia `ate > de` de TODA nota, e com razão para um destaque:
    marcar zero caracteres é marcar nada. Uma nota sobre o livro não marca —
    ela fala do todo. `de` e `ate` em zero dizem exatamente isso.

    Sem esta distinção o campo respondia 422 a cada tentativa, e a tela mostrava
    um erro que fala de `ate` e de `de` para quem só escreveu uma frase.
    """
    with open(sample_pdf, "rb") as f:
        job = client.post("/upload", files={"file": ("p.pdf", f, "application/pdf")}).json()["upload_id"]

    r = client.post(f"/jobs/{job}/notas", json={
        "capitulo": 0, "de": 0, "ate": 0, "cor": "amarelo",
        "trecho": "", "comentario": "O conjunto vale mais que a frase.", "fonte": "livro",
    })
    assert r.status_code == 201, r.text
    assert r.json()["fonte"] == "livro"
    assert r.json()["trecho"] == ""


def test_destaque_continua_precisando_cobrir_caractere(client, tmp_storage, sample_pdf):
    """A regra não se afrouxou para todo mundo: marcar zero caracteres na
    leitura continua sendo marcar nada."""
    with open(sample_pdf, "rb") as f:
        job = client.post("/upload", files={"file": ("p.pdf", f, "application/pdf")}).json()["upload_id"]

    r = client.post(f"/jobs/{job}/notas", json={
        "capitulo": 0, "de": 10, "ate": 10, "cor": "amarelo", "trecho": "x",
    })
    assert r.status_code == 422


def test_fonte_desconhecida_e_recusada(client, tmp_storage, sample_pdf):
    with open(sample_pdf, "rb") as f:
        job = client.post("/upload", files={"file": ("p.pdf", f, "application/pdf")}).json()["upload_id"]

    r = client.post(f"/jobs/{job}/notas", json={
        "capitulo": 0, "de": 0, "ate": 5, "cor": "amarelo", "trecho": "x", "fonte": "inventada",
    })
    assert r.status_code == 422
