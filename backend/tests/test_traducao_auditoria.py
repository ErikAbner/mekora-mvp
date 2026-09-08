"""Os defeitos que a auditoria de 08/09 encontrou, cada um com o seu teste.

A auditoria é a `A4` + `A5` do `ABERTO.md`. Cada teste aqui reproduz um defeito
que existia no código e mede a correção — não a intenção dela. Onde a prova
coube num comando, ela está no docstring com o número que saiu.

O que estes testes NÃO fazem: baixar modelo, carregar `transformers` ou medir
qualidade de tradução. Todos usam motores de mentira determinísticos, que é
exatamente a `seam` que a `A2` documenta.
"""

import io
import json
import sys
import threading
import zipfile
from pathlib import Path

import pytest

from app.services.document_extractor_service import TextBlock


def _bloco(texto: str, ordem: int = 0) -> TextBlock:
    return TextBlock(id=str(ordem), type="paragraph", order=ordem, text=texto, metadata={})


class MotorDeMentira:
    """Determinístico e com teto declarado. Devolve o que recebeu, marcado."""

    def __init__(self, max_input_chars: int | None = None):
        if max_input_chars is not None:
            self.max_input_chars = max_input_chars
        self.recebidos: list[str] = []

    def translate(self, text: str, source: str, target: str) -> str:
        self.recebidos.append(text)
        return text

    def is_pair_available(self, source: str, target: str) -> bool:
        return True


# ═══════════════════════════════════════════════════════════════════════════
# A4 · o truncamento silencioso
# ═══════════════════════════════════════════════════════════════════════════

def test_bloco_maior_que_o_teto_e_partido_e_nao_truncado():
    """O defeito: o NLLB roda com `max_length=512, truncation=True`, e recebia
    blocos de até 2000 caracteres.

    Medido em 08/09 com o `sentencepiece.bpe.model` do repositório: um parágrafo
    de 5.840 caracteres vira 1.400 tokens e voltava com **37% do texto**. Um
    capítulo sem quebra perdia 93%. Sem erro, sem aviso, sem log.
    """
    from app.services.translation_service import translate_blocks

    motor = MotorDeMentira(max_input_chars=200)
    texto = "Uma frase inteira de teste. " * 40  # ~1.080 caracteres
    saida = translate_blocks([_bloco(texto)], motor, "eng", "por")

    assert all(len(t) <= 200 for t in motor.recebidos), (
        f"o motor recebeu {max(len(t) for t in motor.recebidos)} caracteres "
        "com teto de 200 — voltaria truncado"
    )
    assert len(saida) == 1, "partir o bloco mudou a estrutura da saída"
    # NADA SE PERDE: as palavras todas voltam, na ordem.
    assert saida[0].text.split() == texto.split()


def test_o_corte_respeita_a_fronteira_de_frase():
    """Cortar no meio da palavra dá ao modelo um fragmento sem sentido."""
    from app.services.translation_service import partir_texto

    texto = "Primeira frase completa. Segunda frase completa. Terceira aqui."
    partes = partir_texto(texto, 30)
    assert all(len(p) <= 30 for p in partes)
    assert "".join(partes) == texto, "o corte perdeu ou duplicou caracteres"
    assert partes[0].endswith(". "), f"cortou no meio: {partes[0]!r}"


def test_palavra_unica_maior_que_o_teto_ainda_cabe():
    """Sem fronteira nenhuma a respeitar, corta no limite — mas não perde."""
    from app.services.translation_service import partir_texto

    texto = "x" * 500
    partes = partir_texto(texto, 100)
    assert "".join(partes) == texto
    assert all(len(p) <= 100 for p in partes)


def test_teto_absurdo_cai_no_padrao():
    """Um `MagicMock` responde a qualquer atributo, e `int()` nele devolve 1.

    Foi o que aconteceu na primeira versão: o teto virou UM CARACTERE e a
    tradução foi partida letra a letra. Teto absurdo é pior que teto nenhum.
    """
    from unittest.mock import MagicMock

    from app.services.translation_engine import MAX_CHARS_PADRAO, teto_de_entrada

    assert teto_de_entrada(MagicMock()) == MAX_CHARS_PADRAO
    assert teto_de_entrada(MotorDeMentira(max_input_chars=3)) == MAX_CHARS_PADRAO
    assert teto_de_entrada(MotorDeMentira()) == MAX_CHARS_PADRAO
    assert teto_de_entrada(MotorDeMentira(max_input_chars=900)) == 900


# ═══════════════════════════════════════════════════════════════════════════
# A4 · o cache do modelo
# ═══════════════════════════════════════════════════════════════════════════

def test_o_dispositivo_entra_na_chave_do_cache():
    """O defeito: `device="cpu"` e `device="mps"` produziam a MESMA chave.

    Medido em 08/09: as duas saíam `('facebook/nllb-200-distilled-600M', None)`.
    O segundo engine reusava o pipeline carregado no dispositivo do primeiro — o
    parâmetro aparecia na assinatura e não tinha efeito nenhum.
    """
    from app.services.nllb_engine import NllbTranslatorEngine

    assert (
        NllbTranslatorEngine(device="cpu")._cache_key()
        != NllbTranslatorEngine(device="mps")._cache_key()
    )


def test_carregamento_concorrente_carrega_o_modelo_uma_vez_so(monkeypatch):
    """O defeito: sem trava, duas traduções que começam juntas encontram o cache
    vazio e carregam o modelo DUAS VEZES — ~2,4 GB cada, pico dobrado, e o
    resultado sai certo, então ninguém vê.
    """
    from app.services import nllb_engine as ne

    ne.esquecer_modelos()
    carregamentos = []
    portao = threading.Event()

    def pipeline_lento(*a, **k):
        carregamentos.append(1)
        portao.wait(timeout=5)  # segura o primeiro dentro da seção crítica
        return object()

    modulo = type(sys)("transformers")
    modulo.pipeline = pipeline_lento
    monkeypatch.setitem(sys.modules, "transformers", modulo)

    motores = [ne.NllbTranslatorEngine(device="cpu") for _ in range(4)]
    fios = [threading.Thread(target=m._load) for m in motores]
    for f in fios:
        f.start()
    threading.Event().wait(0.3)
    portao.set()
    for f in fios:
        f.join(timeout=5)

    assert len(carregamentos) == 1, (
        f"o modelo foi carregado {len(carregamentos)} vezes por 4 pedidos simultâneos"
    )
    ne.esquecer_modelos()


def test_o_cache_nao_cresce_sem_teto(monkeypatch):
    """Um cache que só cresce é um vazamento com outro nome: trocar o modelo
    configurado deixava o anterior residente para sempre."""
    from app.services import nllb_engine as ne

    ne.esquecer_modelos()
    modulo = type(sys)("transformers")
    modulo.pipeline = lambda *a, **k: object()
    monkeypatch.setitem(sys.modules, "transformers", modulo)

    for nome in ("modelo-a", "modelo-b", "modelo-c"):
        ne.NllbTranslatorEngine(model_name=nome, device="cpu")._load()

    assert len(ne._MODEL_CACHE) <= ne.MODELOS_RESIDENTES
    ne.esquecer_modelos()


def test_esquecer_modelos_devolve_a_memoria(monkeypatch):
    """Sem isto, a única forma de devolver 2,4 GB ao sistema era matar o servidor."""
    from app.services import nllb_engine as ne

    ne.esquecer_modelos()
    modulo = type(sys)("transformers")
    modulo.pipeline = lambda *a, **k: object()
    monkeypatch.setitem(sys.modules, "transformers", modulo)

    ne.NllbTranslatorEngine(device="cpu")._load()
    assert len(ne._MODEL_CACHE) == 1
    assert ne.esquecer_modelos() == 1
    assert len(ne._MODEL_CACHE) == 0


# ═══════════════════════════════════════════════════════════════════════════
# A4 · o modelo que se dizia pronto
# ═══════════════════════════════════════════════════════════════════════════

def test_modelo_sem_pesos_nao_esta_pronto(tmp_path):
    """O defeito, medido no storage deste repositório em 08/09:

        storage/models/nllb/   config.json ✓  tokenizer ✓  pesos: NENHUM
        is_nllb_model_ready(...)  →  True

    São 22 MB de metadados onde deveriam estar 2,4 GB. Com `transformers`
    instalado, o produto anunciaria o NLLB disponível e o carregamento
    estouraria NO MEIO DE UM JOB — e não na tela de configuração.
    """
    from app.services.translation_model_service import modelo_utilizavel

    d = tmp_path / "nllb"
    d.mkdir()
    assert modelo_utilizavel(d) is False, "diretório vazio passou por pronto"

    (d / "config.json").write_text("{}", encoding="utf-8")
    (d / "tokenizer.json").write_text("{}", encoding="utf-8")
    assert modelo_utilizavel(d) is False, "config + tokenizer sem pesos passou por pronto"

    (d / "model.safetensors").write_bytes(b"pesos")
    assert modelo_utilizavel(d) is True


def test_is_pair_available_do_nllb_segue_o_disco(tmp_path):
    """O defeito: as duas implementações da MESMA interface respondiam coisas
    diferentes. Medido em 08/09 com `deu→fra`, um par nos dois mapas:

        argos: False    "o par está instalado e funciona"
        nllb:  True     "o par está no meu mapa de idiomas"
    """
    from app.services.nllb_engine import NllbTranslatorEngine

    vazio = tmp_path / "vazio"
    vazio.mkdir()
    assert NllbTranslatorEngine(model_dir=vazio).is_pair_available("deu", "fra") is False

    (vazio / "config.json").write_text("{}", encoding="utf-8")
    (vazio / "model.safetensors").write_bytes(b"pesos")
    assert NllbTranslatorEngine(model_dir=vazio).is_pair_available("deu", "fra") is True


def test_idioma_fora_do_mapa_levanta_nos_dois_motores():
    """Aqui os dois SEMPRE concordaram, e o teste existe para que continuem."""
    from app.services.nllb_engine import NllbTranslatorEngine
    from app.services.translation_engine import (
        ArgosTranslatorEngine,
        LanguagePairNotAvailableError,
    )

    for motor in (ArgosTranslatorEngine(), NllbTranslatorEngine()):
        with pytest.raises(LanguagePairNotAvailableError):
            motor.is_pair_available("por", "jpn")


# ═══════════════════════════════════════════════════════════════════════════
# A5 · o quadrinho
# ═══════════════════════════════════════════════════════════════════════════

def _cbz(caminho: Path, paginas: int, bytes_por_pagina: int = 64) -> Path:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for i in range(paginas):
            zf.writestr(f"p{i:05}.png", b"\x89PNG" + b"0" * bytes_por_pagina)
    caminho.write_bytes(buf.getvalue())
    return caminho


def test_as_paginas_sao_contadas_antes_de_serem_lidas(tmp_path):
    """O defeito: a proteção de `max_pages` rodava DEPOIS da extração inteira.

    Medido em 08/09 com um CBZ de 4.000 páginas — acima do limite de 3.000 e
    abaixo do limite de 5.000 entradas do `archive_safety`, que é a faixa onde
    nenhuma outra proteção alcança: **49 MB já estavam na memória** quando o
    erro foi levantado. Com páginas de tamanho real, seriam gigabytes.
    """
    from app.services.comic_translation_service import contar_paginas

    arq = _cbz(tmp_path / "a.cbz", 12)
    assert contar_paginas(str(arq), "cbz") == 12


def test_a_contagem_barata_que_nao_alcanca_devolve_menos_um(tmp_path):
    """NÃO SABER NÃO É ZERO.

    `cb7` e `cbc` precisam extrair para contar. Devolver 0 faria a proteção
    passar por omissão, que é o defeito clássico deste repositório.
    """
    from app.services.comic_translation_service import contar_paginas

    arq = _cbz(tmp_path / "a.cbz", 3)
    assert contar_paginas(str(arq), "cb7") == -1
    assert contar_paginas(str(arq), "formato-que-nao-existe") == -1


def test_o_limite_de_paginas_dispara_sem_ler_o_arquivo(tmp_path, monkeypatch):
    from app.core import limits as _limits
    from app.services import comic_translation_service as cts

    # `Limits` é um dataclass FROZEN — troca-se o objeto, não o campo.
    monkeypatch.setattr(cts, "limits", _limits.Limits(
        upload_max_mb=100, upload_chunk_bytes=4096,
        archive_max_entries=100, archive_max_total_mb=100, archive_max_entry_mb=50,
        max_pages=5, image_max_pixels=1_000_000, calibre_timeout_seconds=60,
        kcc_timeout_seconds=60, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=60,
    ))
    arq = _cbz(tmp_path / "a.cbz", 20)

    leu = []
    original = cts.extract_comic_pages
    monkeypatch.setattr(
        cts, "extract_comic_pages", lambda *a, **k: (leu.append(1), original(*a, **k))[1]
    )
    with pytest.raises(cts.PageLimitExceededError):
        cts.run_comic_translation_pipeline(
            1, str(arq), "cbz", "eng", "por", MotorDeMentira(), tmp_path
        )
    assert not leu, "o arquivo foi lido antes de a proteção de páginas disparar"


def test_erro_de_motor_aborta_o_job_inteiro(tmp_path, monkeypatch):
    """O defeito: a comparação era por NOME DE CLASSE em string, justificada por
    um "import circular" que não existe — conferido em 08/09, o
    `translation_engine` não tem uma linha `from app.`.

    O custo do disfarce: renomear a classe transformaria um erro de configuração
    que deve abortar num "erro daquela página", e o job terminaria com sucesso,
    todas as páginas vazias e o mesmo erro repetido dentro do JSON.
    """
    from app.services import comic_translation_service as cts
    from app.services.translation_engine import EngineNotInstalledError

    class Quebrado(EngineNotInstalledError):
        """Uma SUBCLASSE — o nome não casa, a classe sim."""

    arq = _cbz(tmp_path / "a.cbz", 3)
    monkeypatch.setattr(cts, "ocr_page", lambda *a, **k: ["balão"])

    class MotorQuebrado:
        def translate(self, *a, **k):
            raise Quebrado("sem biblioteca")

    with pytest.raises(EngineNotInstalledError):
        cts.run_comic_translation_pipeline(
            1, str(arq), "cbz", "eng", "por", MotorQuebrado(), tmp_path
        )


def test_erro_de_uma_pagina_nao_aborta_as_outras(tmp_path, monkeypatch):
    """A outra metade da mesma regra: OCR que falha numa página é dado, não job
    perdido."""
    from app.services import comic_translation_service as cts

    arq = _cbz(tmp_path / "a.cbz", 3)
    chamadas = {"n": 0}

    def ocr(*a, **k):
        chamadas["n"] += 1
        if chamadas["n"] == 2:
            raise ValueError("página ilegível")
        return ["balão"]

    monkeypatch.setattr(cts, "ocr_page", ocr)
    json_path, _ = cts.run_comic_translation_pipeline(
        1, str(arq), "cbz", "eng", "por", MotorDeMentira(), tmp_path
    )
    paginas = json.loads(json_path.read_text(encoding="utf-8"))["pages"]
    assert len(paginas) == 3
    assert paginas[1]["error"] == "página ilegível"
    assert paginas[0]["blocks"] and paginas[2]["blocks"]


def test_os_dois_artefatos_aparecem_juntos_ou_nenhum(tmp_path, monkeypatch):
    """O defeito: entre `json.write_text` e `html.write_text` cabe um disco
    cheio ou uma queda, e o que sobrava era um JSON sem o HTML que ele promete —
    um par pela metade que a próxima leitura trata como resultado completo.
    """
    from app.services import comic_translation_service as cts

    arq = _cbz(tmp_path / "a.cbz", 2)
    monkeypatch.setattr(cts, "ocr_page", lambda *a, **k: ["balão"])
    monkeypatch.setattr(
        cts, "_build_html_sidecar", lambda *a, **k: (_ for _ in ()).throw(OSError("disco cheio"))
    )

    saida = tmp_path / "saida"
    saida.mkdir()
    with pytest.raises(OSError):
        cts.run_comic_translation_pipeline(
            1, str(arq), "cbz", "eng", "por", MotorDeMentira(), saida
        )
    assert not (saida / "comic_translation.json").exists(), (
        "sobrou um JSON sem o HTML que ele promete"
    )
    assert list(saida.glob("*.parcial")) == [], "sobrou lixo `.parcial` no diretório de saída"


def test_o_par_completo_e_escrito_no_caminho_feliz(tmp_path, monkeypatch):
    """A verificação de cima precisa saber dizer sim, senão ela é só um bloqueio."""
    from app.services import comic_translation_service as cts

    arq = _cbz(tmp_path / "a.cbz", 2)
    monkeypatch.setattr(cts, "ocr_page", lambda *a, **k: ["balão"])
    saida = tmp_path / "saida"
    json_path, html_path = cts.run_comic_translation_pipeline(
        1, str(arq), "cbz", "eng", "por", MotorDeMentira(), saida
    )
    assert json_path.exists() and html_path.exists()
    assert list(saida.glob("*.parcial")) == []


def test_o_cancelamento_chega_dentro_da_pagina(tmp_path, monkeypatch):
    """O defeito: o cancelamento só era conferido ENTRE páginas, e uma página de
    quadrinho tem dezenas de balões — pedir para cancelar deixava o job rodando
    até o fim da página corrente, uma chamada ao modelo por balão.
    """
    from app.services import comic_translation_service as cts

    class Cancelado(Exception):
        pass

    arq = _cbz(tmp_path / "a.cbz", 2)
    monkeypatch.setattr(cts, "ocr_page", lambda *a, **k: [f"balão {i}" for i in range(30)])

    motor = MotorDeMentira()
    avisos = {"n": 0}

    def aviso(*a, **k):
        avisos["n"] += 1
        if avisos["n"] > 3:
            raise Cancelado()

    with pytest.raises(Cancelado):
        cts.run_comic_translation_pipeline(
            1, str(arq), "cbz", "eng", "por", motor, tmp_path, progress_callback=aviso
        )
    assert len(motor.recebidos) < 30, (
        f"cancelou e ainda traduziu {len(motor.recebidos)} balões — a página inteira"
    )


def test_a_imagem_do_ocr_e_fechada(tmp_path, monkeypatch):
    """Num álbum de 3.000 páginas eram 3.000 descritores esperando o coletor de
    lixo, e o limite de descritores do sistema chega antes dele."""
    from PIL import Image

    from app.services import comic_translation_service as cts

    if not cts._OCR_AVAILABLE:
        pytest.skip("pytesseract/Pillow ausentes")

    buf = io.BytesIO()
    Image.new("RGB", (40, 40), "white").save(buf, "PNG")
    abertas = []
    original = cts._PILImage.open

    def espiar(*a, **k):
        img = original(*a, **k)
        abertas.append(img)
        return img

    monkeypatch.setattr(cts._PILImage, "open", espiar)
    monkeypatch.setattr(cts._pytesseract, "image_to_string", lambda *a, **k: "texto")
    cts.ocr_page(buf.getvalue(), "eng")

    assert abertas, "a busca não achou nenhuma imagem aberta — o teste não mediu nada"
    assert all(getattr(i, "fp", None) is None for i in abertas), "a imagem ficou aberta"
