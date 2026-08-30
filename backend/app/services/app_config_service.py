"""
Serviço de configuração da aplicação — Fase 7.

Lê e grava storage/config.json com preferências editáveis pelo usuário:
  - ocr_languages: idiomas Tesseract usados no OCR
  - retention_days: dias antes de limpar arquivos de jobs finalizados
  - polling_interval_ms: intervalo de polling no frontend (ms)
"""

from __future__ import annotations

import json

from app.core.config import PROJECT_ROOT, STORAGE_RAIZ

CONFIG_PATH = STORAGE_RAIZ / "config.json"

# Valores padrão usados quando config.json não existe ou campo está ausente
DEFAULTS: dict = {
    "ocr_languages": ["por", "eng", "spa"],
    "retention_days": 30,
    "polling_interval_ms": 3000,
    "ui_language": "pt",
    "ui_theme": "light",
    "kcc_profile": "KPW5",  # Fase A — perfil padrão do Kindle Comic Converter
    # Fase B — tradução textual
    "translation_enabled_by_default": False,
    "preferred_source_language": "por",
    "preferred_target_language": "eng",
    "translator_engine_default": "argos",
    # Fase C — NLLB (motor premium)
    "nllb_enabled": False,
    "nllb_model_name": "facebook/nllb-200-distilled-600M",
    "nllb_device_preference": "auto",
}


def load_app_config() -> dict:
    """Retorna a configuração atual mesclada com os defaults."""
    if not CONFIG_PATH.exists():
        return DEFAULTS.copy()
    try:
        with open(CONFIG_PATH) as f:
            data = json.load(f)
        return {**DEFAULTS, **data}
    except (json.JSONDecodeError, OSError):
        return DEFAULTS.copy()


def save_app_config(updates: dict) -> None:
    """Mescla *updates* na configuração atual e salva em config.json."""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    current = load_app_config()
    current.update(updates)
    with open(CONFIG_PATH, "w") as f:
        json.dump(current, f, indent=2)
