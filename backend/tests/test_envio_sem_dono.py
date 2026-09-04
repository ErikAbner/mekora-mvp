"""Trabalho sem dono não tem destino.

O ACHADO, e por que ele era o primeiro da fila
==============================================
Até 03/09, `_destino_de` devolvia `None` para trabalho sem dono, e o envio caía
no `KINDLE_EMAIL` do `.env` — o Kindle de quem cuida da instalação. A intenção
estava escrita e era correta: a instalação de uma pessoa só não deveria precisar
cadastrar aparelho para funcionar como sempre funcionou.

O que mudou é o que já mudou três vezes neste repositório: o que era "o dono do
computador" virou "qualquer um na internet". E a cadeia não pedia conta em passo
nenhum:

    POST /upload                       público pela DEC-0018
      → resposta traz `endereco`, que É o token_publico
      → o token passa em `exigir_acesso` por `X-Mekora-Chave`
      → POST /jobs/{id}/send           entrega no Kindle do Erik,
                                       pela conta SMTP do Erik

Dois estragos, e o segundo é o pior: conteúdo de estranho no aparelho de leitura
de alguém, e a reputação de remetente do domínio gasta por terceiro. Reputação
não volta com correção.

O QUE ESTES TESTES SEGURAM
==========================
As duas portas — `/jobs/{id}/send` e `/pending-send/{id}/retry` —, o estado do
trabalho depois da recusa, e as DUAS travessias que continuam valendo: dono com
aparelho vai para o aparelho; dono sem aparelho continua caindo no `.env`, que é
o caso que a instalação de uma pessoa só sempre usou.

Foram aceitos reproduzindo o defeito: com o `raise` de `_exigir_destino`
comentado, os dois primeiros ficam vermelhos com `assert 200 == 403` e o espião
registra o envio. Verde sem essa prova não conta.
"""

from __future__ import annotations

import pytest
from sqlalchemy.orm import sessionmaker


def _trabalho(test_engine, tmp_storage, *, dono_id=None):
    """Um trabalho pronto para enviar. `dono_id=None` é o trabalho anônimo."""
    from app.models.processing_job import ProcessingJob

    epub = tmp_storage / "output" / "livro.epub"
    epub.parent.mkdir(parents=True, exist_ok=True)
    epub.write_bytes(b"epub")

    Session = sessionmaker(bind=test_engine)
    db = Session()
    try:
        job = ProcessingJob(
            original_filename="livro.pdf",
            status="converted",
            conversion_status="done",
            epub_path=str(epub),
            dono_id=dono_id,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job.id, job.token_publico
    finally:
        db.close()


def _pessoa_de_teste(test_engine):
    from app.models.pessoa import Pessoa

    Session = sessionmaker(bind=test_engine)
    db = Session()
    try:
        return db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").first().id
    finally:
        db.close()


@pytest.fixture
def espiao(monkeypatch):
    """Registra o que foi enviado, e não envia nada.

    O espião importa tanto quanto o código de resposta: um 403 que já mandou o
    e-mail antes de responder seria verde neste teste e um desastre no ar.
    """
    import app.api.jobs as jobs_mod

    enviados: list[dict] = []
    monkeypatch.setattr(jobs_mod, "is_smtp_reachable", lambda: True)
    monkeypatch.setattr(
        jobs_mod,
        "send_epub_to_kindle",
        lambda path, title, destino=None: enviados.append(
            {"path": str(path), "destino": destino}
        ),
    )
    return enviados


# ---------------------------------------------------------------------------
# A porta
# ---------------------------------------------------------------------------

def test_trabalho_sem_dono_nao_envia(client, test_engine, tmp_storage, espiao) -> None:
    job_id, chave = _trabalho(test_engine, tmp_storage)

    r = client.post(f"/jobs/{job_id}/send", headers={"X-Mekora-Chave": chave})

    assert r.status_code == 403
    # 403 e não 404: a chave provou o que tinha de provar. O que falta é destino.
    assert espiao == [], "recusou depois de enviar — o e-mail já tinha saído"


def test_trabalho_sem_dono_nao_reenvia(client, test_engine, tmp_storage, espiao) -> None:
    """A segunda porta. Reenviar é enviar.

    `/pending-send/{id}/retry` tem o mesmo `send_epub_to_kindle` no fim, e um
    trabalho anônimo chega a `pending` sozinho — basta o SMTP estar fora do ar
    na primeira tentativa.
    """
    from app.models.processing_job import ProcessingJob

    job_id, chave = _trabalho(test_engine, tmp_storage)
    Session = sessionmaker(bind=test_engine)
    db = Session()
    db.query(ProcessingJob).filter(ProcessingJob.id == job_id).update(
        {"send_status": "pending"}
    )
    db.commit()
    db.close()

    r = client.post(f"/pending-send/{job_id}/retry", headers={"X-Mekora-Chave": chave})

    assert r.status_code == 403
    assert espiao == []


def test_a_recusa_nao_deixa_o_trabalho_preso(client, test_engine, tmp_storage, espiao) -> None:
    """Depois do 403, o trabalho continua enviável — não fica em "enviando".

    A recusa acontece ANTES de `send_status = "in_progress"` de propósito.
    Recusar depois deixaria a tela dizendo "enviando" para sempre, e ninguém
    desfaz esse estado: o trabalho não tem dono para reclamar dele.
    """
    from app.models.processing_job import ProcessingJob

    job_id, chave = _trabalho(test_engine, tmp_storage)
    client.post(f"/jobs/{job_id}/send", headers={"X-Mekora-Chave": chave})

    Session = sessionmaker(bind=test_engine)
    db = Session()
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        assert job.send_status != "in_progress"
        assert job.status != "sending"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# O que continua passando — a correção não pode ter fechado o produto junto
# ---------------------------------------------------------------------------

def test_dono_com_aparelho_vai_para_o_aparelho(client, test_engine, tmp_storage, espiao) -> None:
    from app.models.aparelho import Aparelho

    dono_id = _pessoa_de_teste(test_engine)
    Session = sessionmaker(bind=test_engine)
    db = Session()
    db.add(Aparelho(pessoa_id=dono_id, endereco="dela@kindle.com", principal=True))
    db.commit()
    db.close()

    job_id, chave = _trabalho(test_engine, tmp_storage, dono_id=dono_id)
    r = client.post(f"/jobs/{job_id}/send", headers={"X-Mekora-Chave": chave})

    assert r.status_code == 200
    assert espiao[0]["destino"] == "dela@kindle.com"


def test_dono_sem_aparelho_continua_caindo_no_env(client, test_engine, tmp_storage, espiao) -> None:
    """O caso da instalação de uma pessoa só, e ele NÃO foi fechado.

    Aqui há uma pessoa identificada, e o trabalho é dela. `destino=None` faz o
    `email_service` usar o `KINDLE_EMAIL` do `.env` — que é como o Mekora
    funcionou desde sempre para quem nunca cadastrou aparelho.

    A distinção inteira do conserto está entre este teste e o primeiro: "ninguém"
    não é sinônimo de "o dono da máquina".
    """
    dono_id = _pessoa_de_teste(test_engine)
    job_id, chave = _trabalho(test_engine, tmp_storage, dono_id=dono_id)

    r = client.post(f"/jobs/{job_id}/send", headers={"X-Mekora-Chave": chave})

    assert r.status_code == 200
    assert espiao[0]["destino"] is None
