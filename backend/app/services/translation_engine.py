"""
Motor de tradução local — Fase B.

Interface base TranslatorEngine (Protocol) e implementação ArgosTranslatorEngine.
O Argos Translate usa modelos locais sem internet; códigos BCP-47 de 2 letras.

Fase C adicionará NllbTranslatorEngine.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


class EngineNotInstalledError(Exception):
    """Argos Translate (ou outra biblioteca) não está instalada."""


class LanguagePairNotAvailableError(Exception):
    """Par de idiomas solicitado não tem pacote instalado no Argos."""


@runtime_checkable
class TranslatorEngine(Protocol):
    """Interface que todos os motores de tradução devem implementar."""

    def translate(self, text: str, source: str, target: str) -> str:
        """Traduz *text* de *source* para *target* (códigos 3 letras, ex: 'por', 'eng')."""
        ...

    def is_pair_available(self, source: str, target: str) -> bool:
        """Retorna True se o par source→target estiver instalado."""
        ...


class ArgosTranslatorEngine:
    """
    Motor de tradução usando Argos Translate (local, offline).

    Códigos internos do projeto (3 letras ISO 639-2) são mapeados para os códigos
    BCP-47 de 2 letras que o Argos usa. Esse mapeamento é o único ponto de conversão.
    """

    ARGOS_LANG_MAP: dict[str, str] = {
        "por": "pt",
        "eng": "en",
        "spa": "es",
        "fra": "fr",
        "deu": "de",
    }

    def _to_argos(self, code: str) -> str:
        """Converte código 3-letras → BCP-47 2-letras do Argos."""
        if code not in self.ARGOS_LANG_MAP:
            raise LanguagePairNotAvailableError(
                f"Código de idioma '{code}' não suportado pelo Argos. "
                f"Codes suportados: {', '.join(self.ARGOS_LANG_MAP)}"
            )
        return self.ARGOS_LANG_MAP[code]

    def is_pair_available(self, source: str, target: str) -> bool:
        """Verifica se o pacote de idioma source→target está instalado localmente."""
        try:
            import argostranslate.package  # type: ignore[import-untyped]
        except ImportError:
            raise EngineNotInstalledError(
                "argostranslate não está instalado. "
                "Execute: pip install argostranslate"
            )
        src2 = self._to_argos(source)
        tgt2 = self._to_argos(target)
        pkgs = argostranslate.package.get_installed_packages()
        return any(
            getattr(p, "from_code", None) == src2 and getattr(p, "to_code", None) == tgt2
            for p in pkgs
        )

    def get_installed_pairs(self) -> list[dict[str, str]]:
        """Retorna lista de pares instalados no Argos como [{src, tgt}] em códigos 3 letras."""
        try:
            import argostranslate.package  # type: ignore[import-untyped]
        except ImportError:
            return []
        inv_map = {v: k for k, v in self.ARGOS_LANG_MAP.items()}
        pkgs = argostranslate.package.get_installed_packages()
        result = []
        for pkg in pkgs:
            from_code = getattr(pkg, "from_code", None)
            to_code = getattr(pkg, "to_code", None)
            if from_code in inv_map and to_code in inv_map:
                result.append({"src": inv_map[from_code], "tgt": inv_map[to_code]})
        return result

    def translate(self, text: str, source: str, target: str) -> str:
        """Traduz *text* usando Argos Translate."""
        try:
            import argostranslate.translate  # type: ignore[import-untyped]
        except ImportError:
            raise EngineNotInstalledError(
                "argostranslate não está instalado. "
                "Execute: pip install argostranslate"
            )
        src2 = self._to_argos(source)
        tgt2 = self._to_argos(target)
        return argostranslate.translate.translate(text, src2, tgt2)
