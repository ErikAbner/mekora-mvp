"""
Motor de tradução local — Fase B.

Interface base TranslatorEngine (Protocol) e implementação ArgosTranslatorEngine.
O Argos Translate usa modelos locais sem internet; códigos BCP-47 de 2 letras.

`NllbTranslatorEngine` mora em `nllb_engine.py` e implementa a mesma interface.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


class EngineNotInstalledError(Exception):
    """Argos Translate (ou outra biblioteca) não está instalada."""


class LanguagePairNotAvailableError(Exception):
    """Par de idiomas solicitado não tem pacote instalado no Argos."""


# Quanto texto vai numa chamada quando o motor não declara um teto próprio.
# É o valor que `chunk_blocks` sempre usou.
MAX_CHARS_PADRAO = 2000


@runtime_checkable
class TranslatorEngine(Protocol):
    """Interface que todos os motores de tradução devem implementar."""

    def translate(self, text: str, source: str, target: str) -> str:
        """Traduz *text* de *source* para *target* (códigos 3 letras, ex: 'por', 'eng')."""
        ...

    def is_pair_available(self, source: str, target: str) -> bool:
        """True quando dá para traduzir este par AGORA.

        Idiomas cobertos E modelo utilizável. As duas implementações
        respondiam coisas diferentes até 08/09 — ver o docstring do
        `NllbTranslatorEngine.is_pair_available`.
        """
        ...


def teto_de_entrada(engine: object) -> int:
    """Quantos caracteres cabem numa chamada a este motor.

    O MOTOR DECLARA, e quem orquestra respeita. É a menor mudança que resolve um
    truncamento silencioso e não inventa camada nenhuma: um atributo opcional na
    interface que já existe, com o valor de sempre para quem não o declara.

    O defeito que ela fecha, medido em 08/09: o NLLB roda com
    `max_length=512, truncation=True`, e o pipeline entregava blocos de até
    2000 caracteres. Um parágrafo de 5.840 caracteres virava um chunk único de
    1.400 tokens e **chegava traduzido com 37% do texto** — sem erro, sem aviso,
    sem nada no log. Um capítulo sem quebra perdia 93%.
    """
    teto = getattr(engine, "max_input_chars", None)
    # SÓ UM INTEIRO DE VERDADE CONTA, e a razão apareceu no primeiro teste: um
    # `MagicMock` responde a qualquer atributo, e `int()` nele devolve 1 — o
    # teto virou UM CARACTERE e a tradução foi partida letra a letra. Um teto
    # absurdo é um defeito pior que teto nenhum, então qualquer coisa que não
    # seja um inteiro positivo cai no padrão.
    if isinstance(teto, bool) or not isinstance(teto, int):
        return MAX_CHARS_PADRAO
    return teto if teto >= 64 else MAX_CHARS_PADRAO


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


# ---------------------------------------------------------------------------
# A FÁBRICA — o único lugar onde se decide qual motor atende
# ---------------------------------------------------------------------------

def criar_motor(engine_name: str, cfg: dict) -> "TranslatorEngine":
    """Devolve o motor de tradução configurado.

    ELA MORAVA EM `app/api/jobs.py`, e isso era o acoplamento mais caro que a
    auditoria de 08/09 encontrou. Duas consequências, as duas medidas:

      · `app/api/comic_quick.py` fazia `from app.api.jobs import _build_engine`
        — um módulo de API importando o PRIVADO de outro módulo de API para
        poder chamar um serviço.
      · `comic_quick_pipeline_service._check_engine` REESCREVIA a mesma decisão
        em vez de chamá-la. Quem acrescentasse um motor teria dois lugares para
        lembrar e um para esquecer, e o esquecido é o que verifica se o motor
        está pronto — a tela diria "pronto" para um motor que a fábrica nem
        sabe construir.

    Aqui é o lugar certo porque é onde a interface vive: quem conhece
    `TranslatorEngine` é quem sabe quais existem.

    O MOTOR DE TESTE ENTRA POR AQUI, e por variável de ambiente e não por
    configuração: a configuração é do produto e aparece na tela, e um motor de
    mentira que possa ser escolhido na tela é um motor de mentira que alguém vai
    escolher sem querer. Ver `stub_engine.py`.
    """
    import os

    roteiro = os.getenv("MEKORA_MOTOR_DE_TESTE")
    if roteiro:
        from app.services.stub_engine import MotorDeTeste

        return MotorDeTeste(roteiro)

    if engine_name == "nllb":
        from app.services.nllb_engine import NllbTranslatorEngine

        return NllbTranslatorEngine(
            model_name=cfg.get("nllb_model_name", "facebook/nllb-200-distilled-600M"),
            device=cfg.get("nllb_device_preference") or None,
        )
    return ArgosTranslatorEngine()
