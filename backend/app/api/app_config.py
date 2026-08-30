from fastapi import APIRouter

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


@router.patch("")
def patch_app_config(body: dict) -> dict:
    """
    Atualiza campos de configuração.
    Chaves permitidas: ocr_languages, retention_days, polling_interval_ms.
    """
    filtered = {k: v for k, v in body.items() if k in _ALLOWED_KEYS}
    if filtered:
        save_app_config(filtered)
    return load_app_config()


@router.post("/cleanup")
def trigger_cleanup() -> dict:
    """Executa limpeza de arquivos manualmente com a retenção atual configurada."""
    cfg = load_app_config()
    return cleanup_old_jobs(cfg["retention_days"])
