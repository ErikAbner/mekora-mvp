"""Cancelar a conversão — o caminho inteiro, dos três degraus.

Decisão do Erik em 07/09, e ela é uma lista de garantias, não um botão:

    cancelar a operação em andamento · limpar artefatos parciais · preservar o
    arquivo original · preservar a análise e as escolhas · voltar ao estado em
    que dá para preparar de novo · manter o item na Mesa · não transformar
    cancelamento voluntário em erro

Até aqui a conversão era a ÚNICA das quatro operações longas sem cancelamento.
As outras três — tradução, tradução de quadrinho e exportação — chamam
`raise_if_cancelled` dentro do laço de progresso delas. A conversão não tem
laço: é uma chamada só ao Calibre. A marca de cancelamento era escrita no disco
e ninguém a lia.
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import pytest


# ── degrau 1 · o processo externo para quando alguém pede ────────────────────

def test_run_external_para_quando_pedem(tmp_path):
    """Um processo longo morre em segundos, e não no timeout."""
    from app.services.subprocess_runner import ExternalToolCancelled, run_external

    parar = {"agora": False}

    def deve_parar() -> bool:
        return parar["agora"]

    # dorme muito mais do que o teste espera; quem termina é o cancelamento
    cmd = [sys.executable, "-c", "import time; time.sleep(30)"]

    import threading
    threading.Timer(0.4, lambda: parar.__setitem__("agora", True)).start()

    t0 = time.monotonic()
    with pytest.raises(ExternalToolCancelled):
        run_external(cmd, timeout_seconds=30, tool_label="dorminhoco",
                     deve_parar=deve_parar, intervalo_de_checagem=0.2)
    gasto = time.monotonic() - t0
    assert gasto < 5, f"demorou {gasto:.1f}s — devia parar em menos de um segundo"


def test_run_external_sem_gancho_segue_igual(tmp_path):
    """Sem `deve_parar` o caminho é o de sempre: uma espera só."""
    from app.services.subprocess_runner import run_external

    r = run_external([sys.executable, "-c", "print('oi')"],
                     timeout_seconds=10, tool_label="eco")
    assert r.returncode == 0
    assert "oi" in r.stdout


def test_run_external_com_gancho_que_nunca_para(tmp_path):
    """`deve_parar` que responde não não muda o resultado."""
    from app.services.subprocess_runner import run_external

    r = run_external([sys.executable, "-c", "print('oi')"],
                     timeout_seconds=10, tool_label="eco",
                     deve_parar=lambda: False, intervalo_de_checagem=0.1)
    assert r.returncode == 0


# ── degrau 2 · o serviço apaga o parcial e levanta a exceção certa ───────────

def test_convert_service_apaga_o_epub_pela_metade(tmp_path, monkeypatch):
    from app.services import convert_service as cs
    from app.services.subprocess_runner import ExternalToolCancelled

    entrada = tmp_path / "entrada.pdf"
    entrada.write_bytes(b"%PDF-1.4 fake")
    saida = tmp_path / "saida" / "livro.epub"
    saida.parent.mkdir(parents=True)
    # o Calibre escreve o destino enquanto trabalha: simulamos o meio do caminho
    saida.write_bytes(b"PK\x03\x04 pela metade")

    def _cancelado(*a, **kw):
        raise ExternalToolCancelled("ebook-convert")

    monkeypatch.setattr(cs, "run_external", _cancelado)

    with pytest.raises(cs.ConversionCancelled):
        cs.convert_to_epub(entrada, saida, title="T", author="A", language="por")

    assert not saida.exists(), "o EPUB truncado ficou no disco"
    assert entrada.exists(), "o arquivo original foi tocado"


def test_cancelado_nao_e_falha(tmp_path, monkeypatch):
    """As duas exceções são irmãs, e não a mesma."""
    from app.services import convert_service as cs

    assert not issubclass(cs.ConversionCancelled, cs.ConversionFailedError)
    assert not issubclass(cs.ConversionFailedError, cs.ConversionCancelled)


# ── degrau 3 · o job volta ao estado que o Erik descreveu ────────────────────

def test_bg_convert_cancelado_devolve_o_job_a_analyzed(client, tmp_storage, monkeypatch):
    from app.api import jobs as jobs_mod
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob
    from app.services.convert_service import ConversionCancelled

    db = SessionLocal()
    job = ProcessingJob(
        original_filename="malha-urbana.pdf",
        input_path=str(tmp_storage / "input" / "malha-urbana.pdf"),
        input_format="pdf",
        status="converting",
        conversion_status="in_progress",
        # o que a pessoa decidiu ANTES de mandar converter
        final_title="Malha Urbana",
        final_author="Ana Duarte",
        final_language="por",
        processed_pdf_path=str(tmp_storage / "output" / "ocr.pdf"),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    jid = job.id
    Path(job.input_path).parent.mkdir(parents=True, exist_ok=True)
    Path(job.input_path).write_bytes(b"%PDF-1.4 original")

    monkeypatch.setattr(jobs_mod, "convert_to_epub",
                        lambda **kw: (_ for _ in ()).throw(ConversionCancelled()))

    jobs_mod._bg_convert(jid, operation_id=None)

    db2 = SessionLocal()
    j = db2.query(ProcessingJob).filter(ProcessingJob.id == jid).first()

    # volta ao ponto em que POST /convert aceita de novo
    assert j.status == "analyzed"
    assert j.conversion_status == "not_started"
    # cancelamento voluntário não é erro
    assert j.error_message is None
    # nada de artefato pela metade apontado no banco
    assert j.epub_path is None
    assert j.epub_bytes is None
    # a análise e as escolhas continuam de pé
    assert j.final_title == "Malha Urbana"
    assert j.final_author == "Ana Duarte"
    assert j.final_language == "por"
    assert j.processed_pdf_path is not None
    # o original não foi tocado
    assert Path(j.input_path).read_bytes() == b"%PDF-1.4 original"


def test_bg_convert_com_operacao_consegue_consultar_cancelamento(client, tmp_storage, monkeypatch):
    """O callback entregue ao Calibre não pode falhar só por existir um id."""
    from app.api import jobs as jobs_mod
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob
    from app.services.convert_service import ConversionCancelled

    db = SessionLocal()
    job = ProcessingJob(
        original_filename="ingles.epub",
        input_path=str(tmp_storage / "input" / "ingles.epub"),
        input_format="epub", status="converting", conversion_status="in_progress",
    )
    db.add(job); db.commit(); db.refresh(job)
    jid = job.id
    Path(job.input_path).parent.mkdir(parents=True, exist_ok=True)
    Path(job.input_path).write_bytes(b"PK\x03\x04")

    def converter(**kw):
        assert kw["deve_parar"]() is False
        raise ConversionCancelled()

    monkeypatch.setattr(jobs_mod, "convert_to_epub", converter)
    jobs_mod._bg_convert(jid, operation_id="conversao-regressao")

    db2 = SessionLocal()
    pronto = db2.query(ProcessingJob).filter(ProcessingJob.id == jid).first()
    assert pronto.status == "analyzed"
    assert pronto.error_message is None


def test_bg_convert_bem_sucedido_limpa_erro_da_tentativa_anterior(client, tmp_storage, monkeypatch):
    """Recuperar uma conversão não pode deixar o erro velho na tela."""
    from app.api import jobs as jobs_mod
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob

    db = SessionLocal()
    job = ProcessingJob(
        original_filename="livro.pdf",
        input_path=str(tmp_storage / "input" / "livro.pdf"),
        input_format="pdf",
        status="error",
        conversion_status="failed",
        error_message="erro da tentativa anterior",
        final_title="Livro",
        final_author="Autora",
        final_language="por",
    )
    db.add(job); db.commit(); db.refresh(job)
    jid = job.id
    Path(job.input_path).parent.mkdir(parents=True, exist_ok=True)
    Path(job.input_path).write_bytes(b"%PDF-1.4")

    def converter(**kw):
        destino = Path(kw["output_epub"])
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(b"PK\x03\x04epub")

    monkeypatch.setattr(jobs_mod, "convert_to_epub", converter)
    monkeypatch.setattr(jobs_mod, "_versao_web", lambda p: str(Path(p).with_suffix(".web.epub")))

    jobs_mod._bg_convert(jid, operation_id=None)

    db2 = SessionLocal()
    pronto = db2.query(ProcessingJob).filter(ProcessingJob.id == jid).first()
    assert pronto.status == "converted"
    assert pronto.conversion_status == "done"
    assert pronto.error_message is None


def test_job_cancelado_fica_na_mesa_e_nao_na_estante(client, tmp_storage, monkeypatch):
    """`analyzed` não é "pronto" — e a Estante só lista pronto desde 07/09.

    A prova mora aqui, no contrato de estado, porque é ele que as duas telas
    consultam: a Mesa filtra `estado !== "pronto"` e a Estante `=== "pronto"`.
    """
    from app.api import jobs as jobs_mod
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob
    from app.services.convert_service import ConversionCancelled

    db = SessionLocal()
    job = ProcessingJob(
        original_filename="x.pdf", input_path=str(tmp_storage / "input" / "x.pdf"),
        input_format="pdf", status="converting", conversion_status="in_progress",
    )
    db.add(job); db.commit(); db.refresh(job)
    jid = job.id
    Path(job.input_path).parent.mkdir(parents=True, exist_ok=True)
    Path(job.input_path).write_bytes(b"%PDF-1.4")

    monkeypatch.setattr(jobs_mod, "convert_to_epub",
                        lambda **kw: (_ for _ in ()).throw(ConversionCancelled()))
    jobs_mod._bg_convert(jid, operation_id=None)

    r = client.get(f"/jobs/{jid}/status")
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["status"] == "analyzed"
    assert corpo["conversion_status"] == "not_started"
    assert not corpo.get("error_message")
