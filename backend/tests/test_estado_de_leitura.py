"""Estado de leitura, separado do progresso.

Decisão do Erik em 07/09, e ela é uma separação de conceitos:

    "Estado de leitura e progresso de leitura são conceitos diferentes. O
    drag-and-drop altera o estado. A leitura efetiva altera o progresso."

O que estes testes cobram, item por item da recusa dele:

  · mover para "A ler" NÃO zera progresso
  · mover para "Lendo" NÃO fabrica capítulo 1/N
  · mover para "Lido" NÃO altera a posição real de leitura
  · e nada disso cria uma segunda fonte de verdade — a precedência é uma só,
    e mora no contrato (`estadoDeLeitura`), medida pelo lado do navegador.
"""

from __future__ import annotations

import pytest


def _quem(client):
    """A pessoa da sessão que o `client` do conftest já abriu.

    O cliente de teste entra numa conta sozinho — ver o `conftest`. Abrir outra
    sessão aqui daria duas pessoas no banco e o `/history` de uma delas viria
    vazio, que é o tipo de vermelho que parece defeito do produto.
    """
    from app.db.database import SessionLocal
    from app.models.pessoa import Pessoa

    db = SessionLocal()
    p = db.query(Pessoa).first()
    pid = p.id
    db.close()
    return pid


def _job(pid, nome="malha-urbana.pdf"):
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob

    db = SessionLocal()
    j = ProcessingJob(original_filename=nome, input_format="pdf",
                      status="converted", conversion_status="done", dono_id=pid)
    db.add(j); db.commit(); db.refresh(j)
    jid = j.id
    db.close()
    return jid


def _progresso(pid, jid):
    from app.db.database import SessionLocal
    from app.models.progresso import Progresso

    db = SessionLocal()
    p = (db.query(Progresso)
         .filter(Progresso.pessoa_id == pid, Progresso.job_id == jid).first())
    fora = None if p is None else {
        "capitulo": p.capitulo, "deslocamento": p.deslocamento,
        "capitulos": p.capitulos, "fracao": p.fracao,
        "estado_leitura": p.estado_leitura,
    }
    db.close()
    return fora


# ── o que a recusa do Erik cobra, um item por teste ─────────────────────────

def test_marcar_lido_nao_mexe_na_posicao(client):
    """O item mais caro da recusa: "não silenciosamente alterar a posição"."""
    pid = _quem(client)
    jid = _job(pid)
    client.put(f"/jobs/{jid}/progresso",
               json={"capitulo": 7, "deslocamento": 2140, "capitulos": 20, "fracao": 0.35})

    r = client.put(f"/jobs/{jid}/estado-leitura", json={"estado": "read"})
    assert r.status_code == 204

    p = _progresso(pid, jid)
    assert p["estado_leitura"] == "read"
    # A MARCA CONTINUA ONDE ESTAVA, inteira.
    assert p["capitulo"] == 7
    assert p["deslocamento"] == 2140
    assert p["capitulos"] == 20
    assert p["fracao"] == pytest.approx(0.35)


def test_marcar_a_ler_nao_zera_progresso(client):
    pid = _quem(client)
    jid = _job(pid)
    client.put(f"/jobs/{jid}/progresso",
               json={"capitulo": 3, "deslocamento": 500, "capitulos": 12, "fracao": 0.9})

    client.put(f"/jobs/{jid}/estado-leitura", json={"estado": "to_read"})

    p = _progresso(pid, jid)
    assert p["estado_leitura"] == "to_read"
    assert p["capitulo"] == 3
    assert p["deslocamento"] == 500
    assert p["fracao"] == pytest.approx(0.9)


def test_marcar_lendo_nao_fabrica_capitulo(client):
    """Livro que ninguém abriu: a linha nasce com o progresso VAZIO."""
    pid = _quem(client)
    jid = _job(pid)
    assert _progresso(pid, jid) is None

    client.put(f"/jobs/{jid}/estado-leitura", json={"estado": "reading"})

    p = _progresso(pid, jid)
    assert p["estado_leitura"] == "reading"
    assert p["capitulo"] == 0
    assert p["deslocamento"] == 0
    # `capitulos` em zero é o que a estante já lê como "ninguém abriu ainda".
    assert p["capitulos"] == 0
    # E a fração continua NULA — nula não é zero, e zero afirmaria que a leitura
    # está no começo. Declarar não inventa leitura.
    assert p["fracao"] is None


def test_declarar_e_desfazer(client):
    """`null` devolve o estado a derivado, e não declara "to_read"."""
    pid = _quem(client)
    jid = _job(pid)
    client.put(f"/jobs/{jid}/estado-leitura", json={"estado": "read"})
    assert _progresso(pid, jid)["estado_leitura"] == "read"

    client.put(f"/jobs/{jid}/estado-leitura", json={"estado": None})
    assert _progresso(pid, jid)["estado_leitura"] is None


def test_estado_desconhecido_e_400(client):
    """Um valor que o produto não conhece viraria uma quarta coluna."""
    pid = _quem(client)
    jid = _job(pid)
    r = client.put(f"/jobs/{jid}/estado-leitura", json={"estado": "quase-lido"})
    assert r.status_code == 400
    assert "quase-lido" in r.json()["detail"]
    assert _progresso(pid, jid) is None


def test_progresso_nao_apaga_a_declaracao(client):
    """O outro lado da separação: ler não desfaz o que a pessoa declarou.

    Sem isto, rolar uma página depois de marcar "Lido" devolveria o livro para
    "Lendo" — e o quadro voltaria a ser governado pela rolagem.
    """
    pid = _quem(client)
    jid = _job(pid)
    client.put(f"/jobs/{jid}/estado-leitura", json={"estado": "read"})
    client.put(f"/jobs/{jid}/progresso",
               json={"capitulo": 2, "deslocamento": 10, "capitulos": 9, "fracao": 0.21})

    p = _progresso(pid, jid)
    assert p["estado_leitura"] == "read"
    assert p["fracao"] == pytest.approx(0.21)


def test_estado_chega_no_historico_e_na_leitura(client):
    """As duas telas que perguntam leem do mesmo lugar."""
    pid = _quem(client)
    jid = _job(pid)
    client.put(f"/jobs/{jid}/estado-leitura", json={"estado": "read"})

    h = client.get("/history").json()
    linha = next(e for e in h if e["upload_id"] == jid)
    assert linha["estado_leitura"] == "read"

    lido = client.get(f"/jobs/{jid}/progresso").json()
    assert lido["estado_leitura"] == "read"


def test_sem_conta_o_silencio_e_o_mesmo(client):
    """Sem sessão não há onde guardar, e isso é o previsto — não um erro."""
    client.cookies.delete("mekora_sessao")
    r = client.put("/jobs/999999/estado-leitura", json={"estado": "read"})
    assert r.status_code == 204


def test_ordem_do_quadro_persiste_sem_criar_progresso(client):
    """Organizar cartões não pode fingir que algum livro foi aberto."""
    pid = _quem(client)
    primeiro = _job(pid, "primeiro.pdf")
    segundo = _job(pid, "segundo.pdf")

    r = client.put("/quadro-de-leitura/ordem", json={"livros": [segundo, primeiro]})
    assert r.status_code == 204
    assert _progresso(pid, primeiro) is None
    assert _progresso(pid, segundo) is None

    por_id = {linha["upload_id"]: linha for linha in client.get("/history").json()}
    assert por_id[segundo]["ordem_leitura"] == 0
    assert por_id[primeiro]["ordem_leitura"] == 1


def test_ordem_do_quadro_nao_aceita_livro_repetido(client):
    pid = _quem(client)
    livro = _job(pid)
    r = client.put("/quadro-de-leitura/ordem", json={"livros": [livro, livro]})
    assert r.status_code == 400
