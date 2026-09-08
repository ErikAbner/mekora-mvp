"""
Serviço de detecção de disponibilidade das engines de tradução — Fase C.

Funções usadas pelos endpoints GET /translation/engines e /translation/models/status.
Não realiza I/O pesado: apenas verifica imports e existência de arquivos locais.
"""

from __future__ import annotations

from pathlib import Path

from app.core.config import STORAGE_RAIZ

# Diretório padrão onde setup_nllb.py baixa o modelo
NLLB_DEFAULT_MODEL_DIR: Path = STORAGE_RAIZ / "models" / "nllb"


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


# Os nomes que a Hugging Face usa para os PESOS. `config.json` e o tokenizer não
# bastam: eles somam ~22 MB, e o modelo pesa ~2,4 GB.
PESOS = ("*.safetensors", "*.bin", "*.msgpack", "*.h5", "*.pt")


def modelo_utilizavel(model_dir: str | Path | None = None) -> bool:
    """True quando o diretório tem um modelo que dá para CARREGAR.

    A VERSÃO ANTIGA CONFERIA SÓ O `config.json`, e por isso dizia "pronto" para
    um download interrompido. Medido em 08/09 no storage deste repositório:

        storage/models/nllb/  →  config.json ✓  tokenizer ✓  pesos: NENHUM
        is_nllb_model_ready(...)  →  True

    São 22 MB de metadados onde deveriam estar 2,4 GB. Com `transformers`
    instalado, o produto anunciaria o NLLB disponível, a pessoa o escolheria, e
    o carregamento estouraria NO MEIO DE UM JOB — e não na tela de configuração,
    que é onde um "falta baixar o modelo" custa trinta segundos.
    """
    d = Path(model_dir) if model_dir else NLLB_DEFAULT_MODEL_DIR
    if not d.is_dir() or not (d / "config.json").exists():
        return False
    return any(next(d.glob(padrao), None) is not None for padrao in PESOS)


def is_nllb_model_ready(model_name: str | None = None, model_dir: Path | None = None) -> bool:
    """True se o modelo NLLB está disponível localmente, com os pesos.

    `model_name` É ACEITO E NÃO É USADO, e agora isso está dito em vez de
    escondido: o que existe em disco é UM diretório, e o nome do modelo que a
    configuração pede não é conferido contra o que foi baixado. Medido:
    `is_nllb_model_ready('modelo-que-nao-existe-nenhum')` devolvia `True`.

    Conferir de verdade exigiria comparar com o `_name_or_path` do `config.json`
    — que no download deste repositório vem `None`. Enquanto isso não for
    resolvido, o parâmetro fica na assinatura pelos chamadores existentes, e o
    limite fica escrito aqui em vez de parecer uma verificação que não é.
    """
    return modelo_utilizavel(model_dir)


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
