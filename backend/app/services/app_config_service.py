"""
Serviço de configuração da aplicação — Fase 7.

Lê e grava storage/config.json com preferências editáveis pelo usuário:
  - ocr_languages: idiomas Tesseract usados no OCR
  - retention_days: dias antes de limpar o arquivo original de um trabalho SEM DONO.
    Com conta, o arquivo fica enquanto o serviço existir (decisão do Erik, 03/09).
  - polling_interval_ms: intervalo de polling no frontend (ms)
"""

from __future__ import annotations

import json

from app.core.config import PROJECT_ROOT, STORAGE_RAIZ

CONFIG_PATH = STORAGE_RAIZ / "config.json"

# Valores padrão usados quando config.json não existe ou campo está ausente
DEFAULTS: dict = {
    "ocr_languages": ["por", "eng", "spa"],
    # 90 DIAS, E NÃO 30. O Erik decidiu em 03/09: quem tem conta guarda os
    # arquivos enquanto o serviço funcionar — é o que a conta passa a valer —, e
    # quem não entrou tem 90 a 120 dias. Ficou o número de baixo da faixa, e a
    # razão é assimétrica: subir de 90 para 120 depois não custa nada, e descer
    # de 120 para 90 apaga arquivo de gente que contava com ele.
    "retention_days": 90,
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
