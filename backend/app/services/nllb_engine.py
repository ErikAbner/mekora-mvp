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
# ---------------------------------------------------------------------------

_MODEL_CACHE: dict[tuple[str, str | None], object] = {}


class NllbTranslatorEngine:
    """
    Motor de tradução usando NLLB-200 via Hugging Face Transformers.

    O modelo é carregado lazily na primeira chamada a translate() e mantido
    em cache de módulo. Dispositivo é detectado automaticamente (MPS → CUDA → CPU)
    mas pode ser forçado via parâmetro.
    """

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
                return "mps"
            if torch.cuda.is_available():
                return "cuda"
        except Exception:
            pass
        return "cpu"

    def _cache_key(self) -> tuple[str, str | None]:
        return (self.model_dir or self.model_name, self.model_dir)

    def _load(self) -> object:
        """Carrega o pipeline de tradução e faz cache; retorna o pipeline."""
        key = self._cache_key()
        if key not in _MODEL_CACHE:
            try:
                from transformers import pipeline  # type: ignore[import-untyped]
            except ImportError:
                raise EngineNotInstalledError(
                    "transformers não está instalado. "
                    "Execute: pip install torch transformers  "
                    "ou: pip install -r requirements-nllb.txt"
                )
            model_src = self.model_dir or self.model_name
            device = self._resolve_device()
            # pipeline de tradução genérico — NLLB é um modelo seq2seq
            pipe = pipeline(
                "translation",
                model=model_src,
                device=device,
            )
            _MODEL_CACHE[key] = pipe
        return _MODEL_CACHE[key]

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
        Retorna True se ambos os códigos estão no NLLB_LANG_MAP.

        Nota: não verifica se o modelo está em disco — isso é responsabilidade
        do translation_model_service. Aqui validamos apenas a cobertura de idiomas.
        """
        if source not in NLLB_LANG_MAP or target not in NLLB_LANG_MAP:
            raise LanguagePairNotAvailableError(
                f"Par '{source}'→'{target}' não suportado pelo NLLB. "
                f"Códigos disponíveis: {', '.join(NLLB_LANG_MAP)}"
            )
        return True

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
