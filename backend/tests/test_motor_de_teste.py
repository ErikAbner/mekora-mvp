"""A seam do `A2`, exercitada: o stub entra pela fábrica e o sistema reage.

Estes testes não medem tradução. Eles medem o que o Mekora FAZ quando o motor se
comporta de cada jeito — que é a pergunta que nenhum modelo de verdade responde
de forma repetível.
"""

import io
import zipfile
from pathlib import Path

import pytest


def _cbz(caminho: Path, paginas: int = 2) -> Path:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for i in range(paginas):
            zf.writestr(f"p{i:05}.png", b"\x89PNG" + b"0" * 64)
    caminho.write_bytes(buf.getvalue())
    return caminho


# ═══════════════════════════════════════════════════════════════════════════
# A fábrica é o ponto de entrada, e é o único
# ═══════════════════════════════════════════════════════════════════════════

def test_a_fabrica_devolve_o_motor_de_teste_quando_a_variavel_esta_posta(monkeypatch):
    from app.services.stub_engine import MotorDeTeste
    from app.services.translation_engine import criar_motor

    monkeypatch.setenv("MEKORA_MOTOR_DE_TESTE", "ok")
    assert isinstance(criar_motor("nllb", {}), MotorDeTeste)
    assert isinstance(criar_motor("argos", {}), MotorDeTeste)


def test_sem_a_variavel_a_fabrica_devolve_o_motor_de_verdade(monkeypatch):
    """O stub não pode aparecer por omissão. Um motor de mentira que entra
    sozinho produz um livro "traduzido" que ninguém consegue explicar."""
    from app.services.nllb_engine import NllbTranslatorEngine
    from app.services.translation_engine import ArgosTranslatorEngine, criar_motor

    monkeypatch.delenv("MEKORA_MOTOR_DE_TESTE", raising=False)
    assert isinstance(criar_motor("argos", {}), ArgosTranslatorEngine)
    assert isinstance(criar_motor("nllb", {}), NllbTranslatorEngine)


def test_a_fabrica_e_a_mesma_para_o_job_e_para_a_conferencia(monkeypatch):
    """`comic_quick_pipeline_service` REESCREVIA a decisão do `_build_engine`.

    Duas fábricas divergem: quem acrescenta um motor lembra de uma e esquece a
    outra, e a esquecida é a que confere se o motor está pronto.
    """
    from app.api.jobs import _build_engine
    from app.services.stub_engine import MotorDeTeste

    monkeypatch.setenv("MEKORA_MOTOR_DE_TESTE", "ok")
    assert isinstance(_build_engine("nllb", {}), MotorDeTeste)

    from app.services.comic_quick_pipeline_service import _check_engine

    ok, mensagem = _check_engine("nllb", "eng", "por", {})
    assert ok is True, mensagem


# ═══════════════════════════════════════════════════════════════════════════
# Os cinco comportamentos, determinísticos
# ═══════════════════════════════════════════════════════════════════════════

def test_sucesso_e_deterministico():
    from app.services.stub_engine import MotorDeTeste

    a = MotorDeTeste("ok").translate("uma frase", "eng", "por")
    b = MotorDeTeste("ok").translate("uma frase", "eng", "por")
    assert a == b == "[eng→por] uma frase"


def test_erro_levanta_a_excecao_que_o_produto_ja_trata():
    from app.services.stub_engine import MotorDeTeste
    from app.services.translation_engine import (
        EngineNotInstalledError,
        LanguagePairNotAvailableError,
    )

    with pytest.raises(EngineNotInstalledError):
        MotorDeTeste("erro").translate("x", "eng", "por")
    with pytest.raises(LanguagePairNotAvailableError):
        MotorDeTeste("indisponivel").translate("x", "eng", "por")
    # E na conferência de disponibilidade também — os dois caminhos.
    with pytest.raises(EngineNotInstalledError):
        MotorDeTeste("erro").is_pair_available("eng", "por")


def test_timeout_gasta_o_tempo_pedido_e_levanta():
    """Um timeout que não gasta tempo não exercita o que se quer medir, que é o
    sistema esperando."""
    import time

    from app.services.stub_engine import MotorDeTeste

    t0 = time.monotonic()
    with pytest.raises(TimeoutError):
        MotorDeTeste("timeout:0.2").translate("x", "eng", "por")
    assert time.monotonic() - t0 >= 0.2


def test_resposta_invalida_nao_e_texto():
    """O formato do defeito real: uma versão de biblioteca que muda a saída.

    Não levanta ao ser criada — chega ao pipeline parecendo resultado.
    """
    from app.services.stub_engine import MotorDeTeste, RespostaInvalida

    r = MotorDeTeste("invalido").translate("x", "eng", "por")
    assert isinstance(r, RespostaInvalida)
    assert not isinstance(r, str)


def test_cancelamento_acontece_com_trabalho_ja_feito():
    """Cancelar antes de começar não prova nada."""
    from app.services.stub_engine import MotorDeTeste

    m = MotorDeTeste("cancelamento")
    assert m.translate("a", "eng", "por")
    assert m.translate("b", "eng", "por")
    with pytest.raises(KeyboardInterrupt):
        m.translate("c", "eng", "por")


def test_falha_e_depois_passa_para_exercitar_nova_tentativa():
    """Um `retry` que "funciona" porque nunca falhou não foi testado."""
    from app.services.stub_engine import MotorDeTeste
    from app.services.translation_engine import EngineNotInstalledError

    m = MotorDeTeste("ok:2")
    for _ in range(2):
        with pytest.raises(EngineNotInstalledError):
            m.translate("x", "eng", "por")
    assert m.translate("x", "eng", "por") == "[eng→por] x"


# ═══════════════════════════════════════════════════════════════════════════
# E o sistema de verdade, dirigido pelo stub
# ═══════════════════════════════════════════════════════════════════════════

def test_o_pipeline_de_texto_roda_inteiro_com_o_stub(tmp_path, monkeypatch):
    """A prova de que a seam serve: o pipeline completo, sem modelo nenhum."""
    from app.services import translation_service as ts
    from app.services.document_extractor_service import TextBlock
    from app.services.stub_engine import MotorDeTeste

    monkeypatch.setattr(
        ts, "extract_blocks",
        lambda p, f: [TextBlock(id="1", type="paragraph", order=0,
                                text="Uma frase de teste.", metadata={})],
    )
    saida = tmp_path / "saida.html"
    ts.run_translation_pipeline(
        Path("entrada.epub"), "epub", "eng", "por", MotorDeTeste("ok"), saida
    )
    assert "[eng→por] Uma frase de teste." in saida.read_text(encoding="utf-8")


def test_erro_de_motor_com_o_stub_aborta_o_quadrinho(tmp_path, monkeypatch):
    from app.services import comic_translation_service as cts
    from app.services.stub_engine import MotorDeTeste
    from app.services.translation_engine import EngineNotInstalledError

    monkeypatch.setattr(cts, "ocr_page", lambda *a, **k: ["balão"])
    with pytest.raises(EngineNotInstalledError):
        cts.run_comic_translation_pipeline(
            1, str(_cbz(tmp_path / "a.cbz")), "cbz", "eng", "por",
            MotorDeTeste("erro"), tmp_path,
        )
    # E NÃO DEIXA ARTEFATO PELA METADE.
    assert not (tmp_path / "comic_translation.json").exists()
    assert list(tmp_path.glob("*.parcial")) == []


def test_o_teto_do_stub_e_o_mesmo_do_nllb():
    """Para que o particionamento de blocos seja exercido como será de verdade.

    Um stub sem teto testaria um caminho que o motor real nunca percorre.
    """
    from app.services.nllb_engine import NllbTranslatorEngine
    from app.services.stub_engine import MotorDeTeste
    from app.services.translation_engine import teto_de_entrada

    assert teto_de_entrada(MotorDeTeste("ok")) == teto_de_entrada(NllbTranslatorEngine())
