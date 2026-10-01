"""
Testes do motor de tradução Argos Translate — Fase B.

Todas as chamadas ao argostranslate são mockadas; nenhuma tradução real é executada.
"""

from __future__ import annotations

import sys
import types

import pytest

from app.services.translation_engine import (
    ArgosTranslatorEngine,
    EngineNotInstalledError,
    LanguagePairNotAvailableError,
)


# ---------------------------------------------------------------------------
# Helpers para simular pacotes instalados do Argos
# ---------------------------------------------------------------------------

def _make_fake_package(from_code: str, to_code: str) -> object:
    """Cria um objeto falso com from_code e to_code."""

    class _Pkg:
        pass

    pkg = _Pkg()
    pkg.from_code = from_code  # type: ignore[attr-defined]
    pkg.to_code = to_code  # type: ignore[attr-defined]
    return pkg


def _install_argos_mock(
    monkeypatch: pytest.MonkeyPatch,
    installed_packages: list,
    translate_fn=None,
) -> None:
    """Instala módulos stub argostranslate.package e argostranslate.translate."""

    pkg_mod = types.ModuleType("argostranslate.package")
    pkg_mod.get_installed_packages = lambda: installed_packages  # type: ignore[attr-defined]

    translate_mod = types.ModuleType("argostranslate.translate")
    if translate_fn is not None:
        translate_mod.translate = translate_fn  # type: ignore[attr-defined]

    argos_mod = types.ModuleType("argostranslate")
    argos_mod.package = pkg_mod  # type: ignore[attr-defined]
    argos_mod.translate = translate_mod  # type: ignore[attr-defined]

    monkeypatch.setitem(sys.modules, "argostranslate", argos_mod)
    monkeypatch.setitem(sys.modules, "argostranslate.package", pkg_mod)
    monkeypatch.setitem(sys.modules, "argostranslate.translate", translate_mod)


# ---------------------------------------------------------------------------
# Testes de is_pair_available
# ---------------------------------------------------------------------------

def test_is_pair_available_true(monkeypatch: pytest.MonkeyPatch) -> None:
    packages = [_make_fake_package("pt", "en")]
    _install_argos_mock(monkeypatch, packages)
    engine = ArgosTranslatorEngine()
    assert engine.is_pair_available("por", "eng") is True


def test_is_pair_available_false_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_argos_mock(monkeypatch, [])
    engine = ArgosTranslatorEngine()
    assert engine.is_pair_available("por", "eng") is False


def test_is_pair_available_false_wrong_direction(monkeypatch: pytest.MonkeyPatch) -> None:
    packages = [_make_fake_package("en", "pt")]  # par invertido
    _install_argos_mock(monkeypatch, packages)
    engine = ArgosTranslatorEngine()
    assert engine.is_pair_available("por", "eng") is False


def test_is_pair_available_unknown_code(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_argos_mock(monkeypatch, [])
    engine = ArgosTranslatorEngine()
    with pytest.raises(LanguagePairNotAvailableError):
        engine.is_pair_available("xxx", "eng")


# ---------------------------------------------------------------------------
# Testes de translate
# ---------------------------------------------------------------------------

def test_translate_calls_argos(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_translate(text: str, from_code: str, to_code: str) -> str:
        return f"[{from_code}→{to_code}] {text}"

    _install_argos_mock(monkeypatch, [], translate_fn=fake_translate)
    engine = ArgosTranslatorEngine()
    result = engine.translate("Olá mundo", "por", "eng")
    assert "pt→en" in result
    assert "Olá mundo" in result


def test_translate_returns_string(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_argos_mock(monkeypatch, [], translate_fn=lambda t, f, _: t.upper())
    engine = ArgosTranslatorEngine()
    result = engine.translate("hello", "eng", "por")
    assert isinstance(result, str)
    assert result == "HELLO"


def test_translate_unsupported_code_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_argos_mock(monkeypatch, [], translate_fn=lambda t, f, _: t)
    engine = ArgosTranslatorEngine()
    with pytest.raises(LanguagePairNotAvailableError):
        engine.translate("text", "xyz", "eng")


# ---------------------------------------------------------------------------
# Testes de EngineNotInstalledError
# ---------------------------------------------------------------------------

def test_engine_not_installed_is_pair(monkeypatch: pytest.MonkeyPatch) -> None:
    """Simula argostranslate não instalado: ImportError ao tentar importar."""
    monkeypatch.setitem(sys.modules, "argostranslate.package", None)  # type: ignore[misc]
    # Remove chave para forçar ImportError ao reimportar
    monkeypatch.delitem(sys.modules, "argostranslate.package", raising=False)

    original_import = __builtins__.__import__ if hasattr(__builtins__, "__import__") else __import__  # type: ignore[union-attr]

    def block_argos(name, *args, **kwargs):
        if name == "argostranslate.package":
            raise ImportError("No module named 'argostranslate'")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", block_argos)
    engine = ArgosTranslatorEngine()
    with pytest.raises(EngineNotInstalledError):
        engine.is_pair_available("por", "eng")


def test_engine_not_installed_translate(monkeypatch: pytest.MonkeyPatch) -> None:
    original_import = __builtins__.__import__ if hasattr(__builtins__, "__import__") else __import__  # type: ignore[union-attr]

    def block_argos(name, *args, **kwargs):
        if name == "argostranslate.translate":
            raise ImportError("No module named 'argostranslate'")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", block_argos)
    engine = ArgosTranslatorEngine()
    with pytest.raises(EngineNotInstalledError):
        engine.translate("texto", "por", "eng")


# ---------------------------------------------------------------------------
# Testes de mapeamento de idiomas
# ---------------------------------------------------------------------------

def test_argos_lang_map_coverage() -> None:
    engine = ArgosTranslatorEngine()
    for code in ("por", "eng", "spa", "fra", "deu"):
        assert code in engine.ARGOS_LANG_MAP


def test_to_argos_invalid_code() -> None:
    engine = ArgosTranslatorEngine()
    with pytest.raises(LanguagePairNotAvailableError):
        engine._to_argos("zzz")


def test_nllb_factory_uses_the_same_local_model_checked_by_status() -> None:
    """Disponibilidade e execução não podem olhar diretórios diferentes."""
    from app.services.translation_engine import criar_motor
    from app.services.translation_model_service import NLLB_DEFAULT_MODEL_DIR

    engine = criar_motor("nllb", {"nllb_device_preference": "cpu"})
    assert engine.model_dir == str(NLLB_DEFAULT_MODEL_DIR)
