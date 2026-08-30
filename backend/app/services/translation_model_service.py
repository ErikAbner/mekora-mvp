"""
Serviço de detecção de disponibilidade das engines de tradução — Fase C.

Funções usadas pelos endpoints GET /translation/engines e /translation/models/status.
Não realiza I/O pesado: apenas verifica imports e existência de arquivos locais.
"""

from __future__ import annotations

from pathlib import Path

from app.core.config import PROJECT_ROOT

# Diretório padrão onde setup_nllb.py baixa o modelo
NLLB_DEFAULT_MODEL_DIR: Path = PROJECT_ROOT / "storage" / "models" / "nllb"


# ---------------------------------------------------------------------------
# Detecção de dependências
# ---------------------------------------------------------------------------


def is_argos_installed() -> bool:
    """True se argostranslate está importável."""
    try:
        import argostranslate  # type: ignore[import-untyped]  # noqa: F401
        return True
    except ImportError:
        return False


def is_nllb_installed() -> bool:
    """True se torch e transformers estão ambos importáveis."""
    try:
        import torch  # type: ignore[import-untyped]  # noqa: F401
        import transformers  # type: ignore[import-untyped]  # noqa: F401
        return True
    except ImportError:
        return False


def is_nllb_model_ready(model_name: str, model_dir: Path | None = None) -> bool:
    """
    True se o modelo NLLB está disponível localmente.

    Verifica se model_dir existe e contém ao menos um arquivo 'config.json',
    que é obrigatório em todos os modelos Hugging Face.
    """
    check_dir = model_dir if model_dir else NLLB_DEFAULT_MODEL_DIR
    if not check_dir.exists():
        return False
    return (check_dir / "config.json").exists()


# ---------------------------------------------------------------------------
# Status consolidado para os endpoints
# ---------------------------------------------------------------------------


def get_engines_status(cfg: dict) -> dict:
    """
    Retorna lista de engines com disponibilidade para GET /translation/engines.

    Argos é considerado disponível se a biblioteca está instalada.
    NLLB é considerado disponível se biblioteca + modelo estão presentes.
    """
    default_engine = cfg.get("translator_engine_default", "argos")
    model_name = cfg.get("nllb_model_name", "facebook/nllb-200-distilled-600M")
    nllb_enabled = cfg.get("nllb_enabled", False)

    argos_ok = is_argos_installed()
    nllb_libs_ok = is_nllb_installed()
    nllb_model_ok = is_nllb_model_ready(model_name) if nllb_libs_ok else False
    nllb_ok = nllb_libs_ok and nllb_model_ok

    argos_note = None if argos_ok else (
        "argostranslate não instalado. Execute: pip install argostranslate"
    )

    if not nllb_libs_ok:
        nllb_note = "torch/transformers não instalados. Execute: pip install -r requirements-nllb.txt"
    elif not nllb_model_ok:
        nllb_note = "Modelo não encontrado. Execute: python scripts/setup_nllb.py"
    else:
        nllb_note = None

    engines = [
        {
            "id": "argos",
            "name": "Argos Translate",
            "available": argos_ok,
            "note": argos_note,
        },
    ]

    # NLLB aparece na lista somente se habilitado nas configurações
    if nllb_enabled:
        engines.append({
            "id": "nllb",
            "name": "NLLB-200 (Premium Local)",
            "available": nllb_ok,
            "note": nllb_note,
        })

    return {
        "engines": engines,
        "default": default_engine,
    }


def get_nllb_detail(cfg: dict) -> dict:
    """
    Retorna detalhes de disponibilidade do NLLB para GET /translation/models/status.
    """
    model_name = cfg.get("nllb_model_name", "facebook/nllb-200-distilled-600M")
    model_dir = NLLB_DEFAULT_MODEL_DIR

    try:
        import torch  # type: ignore[import-untyped]  # noqa: F401
        torch_ok = True
    except ImportError:
        torch_ok = False

    try:
        import transformers  # type: ignore[import-untyped]  # noqa: F401
        transformers_ok = True
    except ImportError:
        transformers_ok = False

    model_ok = is_nllb_model_ready(model_name, model_dir)

    return {
        "nllb": {
            "torch_installed": torch_ok,
            "transformers_installed": transformers_ok,
            "model_available": model_ok,
            "model_name": model_name,
            "model_path": str(model_dir),
            "setup_command": "python scripts/setup_nllb.py",
        }
    }
