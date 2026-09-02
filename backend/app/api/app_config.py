from fastapi import APIRouter, HTTPException

from app.services.app_config_service import load_app_config, save_app_config
from app.services.cleanup_service import cleanup_old_jobs

router = APIRouter(prefix="/app-config", tags=["app-config"])

_ALLOWED_KEYS = {
    "ocr_languages", "retention_days", "polling_interval_ms",
    "ui_language", "ui_theme", "kcc_profile",
    # Fase B — tradução
    "translation_enabled_by_default", "preferred_source_language",
    "preferred_target_language", "translator_engine_default",
    # Fase C — NLLB
    "nllb_enabled", "nllb_model_name", "nllb_device_preference",
}


@router.get("")
def get_app_config() -> dict:
    """Retorna a configuração atual da aplicação (storage/config.json)."""
    return load_app_config()


# O QUE CADA CHAVE PRECISA SER.
#
# A rota filtrava por NOME e aceitava qualquer VALOR. `ocr_languages` é uma
# lista, e mandá-la como texto — `"por"` em vez de `["por"]` — grava um texto no
# `config.json`. Aí o `ocrmypdf` itera os caracteres e todo OCR do servidor
# morre com:
#
#     OCR engine does not have language data for the following requested
#     languages: o / r / p
#
# Que não diz nada sobre configuração e não aponta para esta rota. Não é
# hipótese: foi assim que eu quebrei o OCR ao provar que ele funcionava.
#
# `retention_days` é pior: ele decide QUANDO ARQUIVO DE GENTE É APAGADO. Zero ou
# negativo apaga na próxima varredura.
_FORMATO = {
    "ocr_languages": lambda v: isinstance(v, list) and v and all(isinstance(x, str) and x for x in v),
    "retention_days": lambda v: isinstance(v, int) and not isinstance(v, bool) and v >= 1,
    "polling_interval_ms": lambda v: isinstance(v, int) and not isinstance(v, bool) and v >= 250,
}


@router.patch("")
def patch_app_config(body: dict) -> dict:
    """
    Atualiza campos de configuração.
    Chaves permitidas: ocr_languages, retention_days, polling_interval_ms.
    """
    filtered = {k: v for k, v in body.items() if k in _ALLOWED_KEYS}

    ruins = [k for k, v in filtered.items() if k in _FORMATO and not _FORMATO[k](v)]
    if ruins:
        # RECUSA A ESCRITA INTEIRA, e não só o campo ruim. Gravar metade de um
        # pedido deixa a instalação num estado que ninguém pediu, e quem mandou
        # não fica sabendo qual metade valeu.
        raise HTTPException(
            status_code=422,
            detail=(
                f"Valor fora do formato em: {', '.join(sorted(ruins))}. "
                "`ocr_languages` é uma lista de códigos (`[\"por\", \"eng\"]`), "
                "`retention_days` é um inteiro de 1 para cima, "
                "`polling_interval_ms` é um inteiro de 250 para cima."
            ),
        )

    if filtered:
        save_app_config(filtered)
    return load_app_config()


@router.post("/cleanup")
def trigger_cleanup() -> dict:
    """Executa limpeza de arquivos manualmente com a retenção atual configurada."""
    cfg = load_app_config()
    return cleanup_old_jobs(cfg["retention_days"])
