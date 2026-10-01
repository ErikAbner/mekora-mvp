"""
Motor de tradução NLLB-200 — Fase C.

NllbTranslatorEngine usa facebook/nllb-200-distilled-600M (ou variante configurada)
via Hugging Face Transformers. O modelo é carregado na primeira chamada (lazy loading)
e mantido em cache de módulo para evitar recarregamento entre jobs no mesmo processo.

Dependências opcionais (não em requirements.txt principal):
    pip install torch transformers huggingface_hub
    # ou: pip install -r requirements-nllb.txt

Fase D pode substituir o backend interno por CTranslate2 sem alterar esta interface.
"""

from __future__ import annotations

import gc
import threading
from pathlib import Path

from app.services.translation_engine import (
    EngineNotInstalledError,
    LanguagePairNotAvailableError,
)

# ---------------------------------------------------------------------------
# Mapeamento: código 3-letras interno → FLORES-200 usado pelo NLLB
# ---------------------------------------------------------------------------

NLLB_LANG_MAP: dict[str, str] = {
    "por": "por_Latn",
    "eng": "eng_Latn",
    "spa": "spa_Latn",
    "fra": "fra_Latn",
    "deu": "deu_Latn",
}

# ---------------------------------------------------------------------------
# Cache de módulo — evita recarregar o modelo entre jobs no mesmo processo
#
# COM TRAVA, e a falta dela custava o dobro da memória.
#
# O carregamento leva dezenas de segundos e ocupa ~2,4 GB para o
# distilled-600M. Sem trava, duas traduções que começam juntas encontram o
# cache vazio, carregam o modelo DUAS VEZES em paralelo, e a segunda sobrescreve
# a primeira no dicionário — que fica viva enquanto o outro pedido a estiver
# usando. O pico é o dobro, e ninguém vê: o resultado sai certo.
#
# COM TETO, porque um cache que só cresce é um vazamento com outro nome. Trocar
# o modelo configurado deixava o anterior residente para sempre.
# ---------------------------------------------------------------------------

_MODEL_CACHE: dict[tuple[str, str | None, str], object] = {}
_CACHE_LOCK = threading.Lock()

# Quantos modelos ficam residentes. Um é o caso real — o produto usa um modelo
# por vez —, e dois seria pagar 2,4 GB para adiar um carregamento que só
# acontece quando alguém troca a configuração.
MODELOS_RESIDENTES = 1


def esquecer_modelos() -> int:
    """Solta os modelos carregados. Devolve quantos foram.

    Existe para o desligamento e para quem precisa recuperar memória sem
    reiniciar o processo. Sem isto, a única forma de devolver 2,4 GB ao sistema
    era matar o servidor.
    """
    with _CACHE_LOCK:
        quantos = len(_MODEL_CACHE)
        _MODEL_CACHE.clear()
    if quantos:
        gc.collect()
        try:
            import torch  # type: ignore[import-untyped]

            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            elif torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:  # noqa: BLE001 — soltar memória nunca derruba nada
            pass
    return quantos


class NllbTranslatorEngine:
    """
    Motor de tradução usando NLLB-200 via Hugging Face Transformers.

    O modelo é carregado lazily na primeira chamada a translate() e mantido
    em cache de módulo. Dispositivo é detectado automaticamente (MPS → CUDA → CPU)
    mas pode ser forçado via parâmetro.
    """

    # QUANTO TEXTO CABE NUMA CHAMADA, e o número saiu de medida e não de palpite.
    #
    # `max_length=512` limita os tokens, e a razão caractere/token depende do
    # texto. Medido com o `sentencepiece.bpe.model` deste repositório:
    #
    #     português comum    4,33 caracteres por token
    #     com acentuação     3,94
    #     nomes próprios     3,00
    #     termos técnicos    2,33      ← o pior caso
    #
    # No pior caso, 512 tokens são 1.193 caracteres. Com 25% de folga para o
    # separador de blocos e para texto mais denso que a amostra: 900.
    max_input_chars = 900

    def __init__(
        self,
        model_name: str = "facebook/nllb-200-distilled-600M",
        device: str | None = None,
        model_dir: str | Path | None = None,
    ) -> None:
        """
        Parameters
        ----------
        model_name:
            Nome do modelo no Hugging Face Hub ou identificador local.
            Ignorado se model_dir for fornecido.
        device:
            Dispositivo de inferência: "cpu", "cuda", "mps", ou "auto".
            None e "auto" ativam a detecção automática.
        model_dir:
            Caminho local para um modelo já baixado (ex: storage/models/nllb/).
            Se fornecido, tem prioridade sobre model_name para o carregamento.
        """
        self.model_name = model_name
        self.model_dir = str(model_dir) if model_dir else None
        self._device_pref = device or "auto"

    # ------------------------------------------------------------------
    # Helpers privados
    # ------------------------------------------------------------------

    def _resolve_device(self) -> str | int:
        """Detecta o melhor dispositivo disponível ou respeita preferência."""
        pref = (self._device_pref or "auto").lower()
        if pref not in ("auto", ""):
            # Preferência explícita: passa direto (ex: "cpu", "cuda", "mps")
            return pref
        # Auto-detect: MPS (Apple Silicon) → CUDA → CPU
        try:
            import torch  # type: ignore[import-untyped]
            if torch.backends.mps.is_available():
                # ``is_available`` pode devolver True mesmo quando o runtime
                # desta versão do macOS não aceita uma única alocação MPS. Foi
                # o caso real desta instalação: o modelo só falhava depois de
                # carregar 2,3 GB. Uma alocação mínima transforma essa falsa
                # promessa em fallback honesto para CPU.
                try:
                    torch.empty(1, device="mps")
                    return "mps"
                except (RuntimeError, OSError):
                    pass
            if torch.cuda.is_available():
                return "cuda"
        except Exception:
            pass
        return "cpu"

    def _cache_key(self) -> tuple[str, str | None, str]:
        """O DISPOSITIVO ENTRA NA CHAVE, e a falta dele fazia a preferência ser
        ignorada em silêncio.

        A chave era `(origem, model_dir)`. Um engine criado com `device="cpu"` e
        outro com `device="mps"` produziam a MESMA chave, então o segundo reusava
        o pipeline já carregado no dispositivo do primeiro — o parâmetro
        aparecia na assinatura e não tinha efeito nenhum. Medido em 08/09: as
        duas chaves saíam `('facebook/nllb-200-distilled-600M', None)`.
        """
        return (self.model_dir or self.model_name, self.model_dir, self._resolve_device_str())

    def _resolve_device_str(self) -> str:
        return str(self._resolve_device())

    def _load(self) -> object:
        """Carrega o pipeline de tradução e faz cache; retorna o pipeline."""
        key = self._cache_key()
        # Leitura otimista fora da trava: no caso comum o modelo já está lá, e
        # não há razão para serializar todas as traduções atrás de um lock.
        pipe = _MODEL_CACHE.get(key)
        if pipe is not None:
            return pipe

        try:
            from transformers import pipeline  # type: ignore[import-untyped]
        except ImportError:
            raise EngineNotInstalledError(
                "transformers não está instalado. "
                "Execute: pip install torch transformers  "
                "ou: pip install -r requirements-nllb.txt"
            )

        with _CACHE_LOCK:
            # Confere DE NOVO com a trava na mão: outro pedido pode ter
            # carregado enquanto este esperava, e carregar por cima seria
            # exatamente o gasto duplo que a trava existe para evitar.
            pipe = _MODEL_CACHE.get(key)
            if pipe is not None:
                return pipe
            model_src = self.model_dir or self.model_name
            device = self._resolve_device()
            # pipeline de tradução genérico — NLLB é um modelo seq2seq
            novo = pipeline(
                "translation",
                model=model_src,
                device=device,
            )
            while len(_MODEL_CACHE) >= MODELOS_RESIDENTES:
                _MODEL_CACHE.pop(next(iter(_MODEL_CACHE)))
            _MODEL_CACHE[key] = novo
            return novo

    def _to_nllb(self, code: str) -> str:
        """Converte código 3-letras interno → FLORES-200."""
        if code not in NLLB_LANG_MAP:
            raise LanguagePairNotAvailableError(
                f"Código de idioma '{code}' não suportado pelo NLLB. "
                f"Códigos disponíveis: {', '.join(NLLB_LANG_MAP)}"
            )
        return NLLB_LANG_MAP[code]

    # ------------------------------------------------------------------
    # Interface TranslatorEngine
    # ------------------------------------------------------------------

    def is_pair_available(self, source: str, target: str) -> bool:
        """
        True quando dá para traduzir este par AGORA: idiomas cobertos e modelo
        utilizável no disco.

        A NOTA ANTIGA DIZIA O CONTRÁRIO, e as duas implementações da mesma
        interface passaram a responder coisas diferentes. Medido em 08/09, com
        `deu→fra` — um par que está nos dois mapas e não tem pacote instalado:

            argos: False       "o par está instalado e funciona"
            nllb:  True        "o par está no meu mapa de idiomas"

        `TranslatorEngine` promete uma coisa só — *"True se o par source→target
        estiver instalado"* —, e quem programa contra a interface não sabe qual
        motor está segurando. Um `if engine.is_pair_available(...)` decidia
        certo com um e errado com o outro.

        O `translation_model_service` continua sendo quem responde à TELA sobre
        instalação e caminho de setup; o que ele não pode é ser o único a saber,
        deixando a interface mentir para o código.
        """
        if source not in NLLB_LANG_MAP or target not in NLLB_LANG_MAP:
            raise LanguagePairNotAvailableError(
                f"Par '{source}'→'{target}' não suportado pelo NLLB. "
                f"Códigos disponíveis: {', '.join(NLLB_LANG_MAP)}"
            )
        # Import tardio: o model service lê a configuração e o disco, e o engine
        # não deve carregar isso só para existir.
        from app.services.translation_model_service import modelo_utilizavel

        return modelo_utilizavel(self.model_dir)

    def translate(self, text: str, source: str, target: str) -> str:
        """Traduz *text* de *source* para *target* usando NLLB-200."""
        src_flores = self._to_nllb(source)
        tgt_flores = self._to_nllb(target)
        pipe = self._load()
        results = pipe(  # type: ignore[operator]
            text,
            src_lang=src_flores,
            tgt_lang=tgt_flores,
            max_length=512,
            truncation=True,
        )
        return results[0]["translation_text"]

    def translate_many(self, texts: list[str], source: str, target: str) -> list[str]:
        """Traduz vários trechos em um lote real do modelo.

        Fazer 2.700 chamadas individuais mantinha uma CPU/MPS quase vazia e
        levava horas. O pipeline do Transformers já aceita uma lista; quatro
        trechos por lote cabem com folga na máquina local de 16 GB e amortizam
        tokenização e inferência sem aumentar o teto de cada entrada.
        """
        if not texts:
            return []
        src_flores = self._to_nllb(source)
        tgt_flores = self._to_nllb(target)
        pipe = self._load()
        results = pipe(  # type: ignore[operator]
            texts,
            src_lang=src_flores,
            tgt_lang=tgt_flores,
            max_length=512,
            truncation=True,
            batch_size=min(4, len(texts)),
        )
        return [result["translation_text"] for result in results]
