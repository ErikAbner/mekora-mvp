"""O portão de dono: identificador no CORPO também precisa de guarda.

A FAMÍLIA, e não o caso
=======================
`exigir_acesso` protege tudo que tem o número de um trabalho no CAMINHO — 41
rotas —, e faz isso lendo `request.path_params`. É a decisão certa e está
escrita no `porta.py`: rota nova com `job_id` no caminho nasce protegida sem que
ninguém precise lembrar.

O reverso disso é que ela é CEGA para o corpo, por desenho. Uma rota que recebe
`job_ids` num JSON passa pela dependência sem que nada seja conferido — a
guarda procura um nome no caminho, não acha, e devolve na primeira linha.

O `/batch` inteiro caiu nessa forma: seis rotas, nenhuma filtrando por dono, e
`exigir_conta` — que é o que sobrava — significa apenas "tem conta". A entrada é
por link no e-mail, então isso é qualquer pessoa da internet.

Consertar as seis não resolve a família: a próxima rota com id no corpo nasce
com o mesmo buraco, e o buraco não faz barulho — ela simplesmente responde para
quem pedir.

O QUE ESTE ARQUIVO FAZ
======================
Varre o app montado atrás de rota cujo CORPO declara identificador de trabalho.
Cada uma precisa estar na lista abaixo, com o motivo. Rota nova aparece aqui
como falha, e a falha diz o que fazer.

É o mesmo formato do `scripts/rotas.py` e do `scripts/classes.mjs`: um portão
que reprova o esquecimento, e não uma revisão que alguém precisa lembrar de
refazer.
"""

from __future__ import annotations

import pytest
from fastapi.routing import APIRoute
from sqlalchemy.orm import sessionmaker

# Nomes que, num corpo de requisição, significam "um trabalho". Se aparecer um
# terceiro, ele entra aqui — a lista curta é a definição, e não configuração.
# É a irmã da `NOMES` do `porta.py`, do lado do corpo.
NOMES_NO_CORPO = ("job_id", "job_ids", "upload_id", "upload_ids")

# AS ROTAS QUE RECEBEM IDENTIFICADOR NO CORPO, e como cada uma prova o dono.
#
# Estar nesta lista não é permissão: é declaração. O que segura de verdade são
# os testes de comportamento no fim do arquivo, e a leitura do código citado.
FILTRAM_POR_DONO = {
    "POST /batch/apply-preset": "_meu(db, pessoa, job_id) — batch.py",
    "POST /batch/apply-suggestions": "_meu(db, pessoa, job_id) — batch.py",
    "POST /batch/export": "_meu(db, pessoa, job_id) — batch.py",
    "POST /batch/retry-send": "_meu(db, pessoa, job_id) — batch.py",
    "POST /batch/set-final-variant": "_meu(db, pessoa, job_id) — batch.py",
    "POST /canvas/livros": "ProcessingJob.dono_id no filtro — canvas.py:749",
}


def _rotas_com_id_no_corpo():
    from main import app  # noqa: backend/ está em sys.path

    achadas = {}
    for r in app.routes:
        if not isinstance(r, APIRoute):
            continue
        corpo = getattr(r, "body_field", None)
        if corpo is None:
            continue
        modelo = getattr(getattr(corpo, "field_info", None), "annotation", None)
        campos = getattr(modelo, "model_fields", None) or {}
        marcados = [c for c in campos if c in NOMES_NO_CORPO]
        if not marcados:
            continue
        metodo = ",".join(sorted(r.methods - {"HEAD", "OPTIONS"}))
        achadas[f"{metodo} {r.path}"] = marcados
    return achadas


def test_toda_rota_com_id_no_corpo_esta_declarada() -> None:
    """O portão. Falha quando aparece rota nova com id no corpo."""
    achadas = _rotas_com_id_no_corpo()

    novas = sorted(set(achadas) - set(FILTRAM_POR_DONO))
    assert not novas, (
        "Rota com identificador de trabalho no CORPO e sem declaração de dono:\n  "
        + "\n  ".join(f"{r}  ({', '.join(achadas[r])})" for r in novas)
        + "\n\n`exigir_acesso` NÃO cobre estas rotas: ela lê o caminho, e o "
        "número está no corpo. Ponha o `dono_id` no FILTRO da consulta e "
        "declare a rota em FILTRAM_POR_DONO, com onde isso é feito."
    )


def test_a_lista_nao_guarda_rota_que_deixou_de_existir() -> None:
    """O outro lado do portão.

    Uma linha sobrando na lista é pior que uma faltando: ela afirma que uma
    proteção existe, e a rota que ela cita já não está lá para contradizê-la.
    """
    achadas = _rotas_com_id_no_corpo()

    sumidas = sorted(set(FILTRAM_POR_DONO) - set(achadas))
    assert not sumidas, (
        "FILTRAM_POR_DONO cita rota que não existe mais: " + ", ".join(sumidas)
    )


def test_nenhuma_rota_de_lote_ficou_de_fora() -> None:
    """O `/batch` foi o caso que abriu a família, e ele é conferido inteiro.

    A `GET /batch/jobs` não entra na varredura — ela não tem corpo, filtra por
    query. Ela é conferida por comportamento, mais abaixo.
    """
    achadas = _rotas_com_id_no_corpo()
    de_lote = {r for r in achadas if r.split(" ", 1)[1].startswith("/batch/")}

    assert de_lote == {
        "POST /batch/apply-preset",
        "POST /batch/apply-suggestions",
        "POST /batch/export",
        "POST /batch/retry-send",
        "POST /batch/set-final-variant",
    }


# ---------------------------------------------------------------------------
# O comportamento, que é o que a declaração acima promete
# ---------------------------------------------------------------------------

@pytest.fixture
def trabalho_alheio(test_engine):
    """Um trabalho de OUTRA pessoa, pendente de envio.

    `send_status="pending"` porque é o estado que o `retry-send` exige — sem
    ele a rota responderia `skipped` por outro motivo, e o teste passaria sem
    provar nada sobre dono.
    """
    from app.models.pessoa import Pessoa
    from app.models.processing_job import ProcessingJob

    Session = sessionmaker(bind=test_engine)
    db = Session()
    try:
        outra = Pessoa(email="outra@mekora.local")
        db.add(outra)
        db.flush()
        job = ProcessingJob(
            original_filename="diario-dela.pdf",
            final_title="O diário dela",
            status="converted",
            send_status="pending",
            epub_path="/nao/importa.epub",
            dono_id=outra.id,
        )
        db.add(job)
        db.commit()
        return job.id
    finally:
        db.close()


@pytest.mark.parametrize(
    "caminho,corpo",
    [
        # Preset REAL: a rota confere o preset antes do dono, e com um id
        # inventado ela erraria por outro motivo — verde sem provar nada.
        ("/batch/apply-preset", {"preset_id": "system-doc-no-translation"}),
        ("/batch/export", {}),
        ("/batch/apply-suggestions", {}),
        ("/batch/retry-send", {}),
        ("/batch/set-final-variant", {"variant": "original"}),
    ],
)
def test_o_lote_nao_alcanca_o_trabalho_de_outra_pessoa(
    client, trabalho_alheio, caminho, corpo
) -> None:
    """Com conta, e com o número na mão, o lote responde "não encontrado".

    A mesma resposta que daria para um número que não existe, de propósito:
    distinguir contaria quais números existem para quem varresse uma sequência.
    """
    r = client.post(caminho, json={**corpo, "job_ids": [trabalho_alheio]})

    assert r.status_code == 200
    resultado = r.json()
    assert resultado["succeeded"] == 0
    assert resultado["item_results"][0]["status"] == "error"
    assert resultado["item_results"][0]["message"] == "Job não encontrado."


def test_o_lote_nao_envia_o_livro_de_outra_pessoa(client, trabalho_alheio, monkeypatch) -> None:
    """O caso que fecha a terceira porta do envio anônimo.

    `POST /batch/retry-send` chamava `send_epub_to_kindle(epub, cfg)` — com
    `cfg` na posição do título e o destino em `None`, o que faz o
    `email_service` cair no `KINDLE_EMAIL` do `.env`. Qualquer trabalho pendente
    da instalação saía para o Kindle de quem cuida dela.
    """
    import app.services.email_service as email_mod

    enviados: list = []
    monkeypatch.setattr(
        email_mod, "send_epub_to_kindle",
        lambda path, title, destino=None: enviados.append((str(path), destino)),
    )

    client.post("/batch/retry-send", json={"job_ids": [trabalho_alheio]})

    assert enviados == [], "o lote enviou o livro de outra pessoa"


def test_a_lista_de_lote_so_mostra_o_que_e_meu(client, trabalho_alheio) -> None:
    """`GET /batch/jobs` — o `/history` de 30/08, no arquivo que ficou de fora.

    Ela não devolvia `token_publico`, então os arquivos seguiam fora de
    alcance. Devolvia nome do arquivo original, título, autor, estado e datas —
    a estante de cada um, lida por qualquer pessoa com conta.
    """
    r = client.get("/batch/jobs")

    assert r.status_code == 200
    nomes = [j["original_filename"] for j in r.json()["jobs"]]
    assert "diario-dela.pdf" not in nomes
