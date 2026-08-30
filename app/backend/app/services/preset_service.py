"""
Fase K — Presets de processamento persistidos.

Armazena presets em storage/config_presets.json.
Cada preset define um conjunto de configurações de processamento
(modo, idioma, tradução, etc.) reutilizável em múltiplos jobs.

Operações: listar, criar, obter, atualizar, excluir, duplicar.
Presets do sistema (is_system=True) não podem ser excluídos,
mas podem ser duplicados e editados como cópias do usuário.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import PROJECT_ROOT

PRESET_PATH = PROJECT_ROOT / "storage" / "config_presets.json"

# ---------------------------------------------------------------------------
# Presets padrão do sistema
# ---------------------------------------------------------------------------

_SYSTEM_PRESETS: list[dict] = [
    {
        "id": "system-doc-pt-en-argos",
        "name": "Documento PT→EN Argos",
        "description": "Tradução de documentos Português → Inglês com Argos (offline)",
        "is_system": True,
        "processing_mode": "document",
        "comic_mode": False,
        "manga_rtl": False,
        "translation_enabled": True,
        "source_language": "por",
        "target_language": "eng",
        "translator_engine": "argos",
        "nllb_model_name": "",
        "nllb_device_preference": "",
    },
    {
        "id": "system-doc-en-pt-argos",
        "name": "Documento EN→PT Argos",
        "description": "Tradução de documentos Inglês → Português com Argos (offline)",
        "is_system": True,
        "processing_mode": "document",
        "comic_mode": False,
        "manga_rtl": False,
        "translation_enabled": True,
        "source_language": "eng",
        "target_language": "por",
        "translator_engine": "argos",
        "nllb_model_name": "",
        "nllb_device_preference": "",
    },
    {
        "id": "system-doc-pt-en-nllb",
        "name": "Documento PT→EN NLLB",
        "description": "Tradução de documentos Português → Inglês com NLLB-200 (maior qualidade)",
        "is_system": True,
        "processing_mode": "document",
        "comic_mode": False,
        "manga_rtl": False,
        "translation_enabled": True,
        "source_language": "por",
        "target_language": "eng",
        "translator_engine": "nllb",
        "nllb_model_name": "facebook/nllb-200-distilled-600M",
        "nllb_device_preference": "auto",
    },
    {
        "id": "system-manga-pb-rtl",
        "name": "Mangá PB RTL",
        "description": "Processamento de mangá preto e branco com leitura da direita para esquerda",
        "is_system": True,
        "processing_mode": "comic",
        "comic_mode": True,
        "manga_rtl": True,
        "translation_enabled": False,
        "source_language": "jpn",
        "target_language": "por",
        "translator_engine": "",
        "nllb_model_name": "",
        "nllb_device_preference": "",
    },
    {
        "id": "system-hq-colorida",
        "name": "HQ Colorida Overlay",
        "description": "Processamento de quadrinhos coloridos com pipeline de overlay",
        "is_system": True,
        "processing_mode": "comic",
        "comic_mode": True,
        "manga_rtl": False,
        "translation_enabled": False,
        "source_language": "",
        "target_language": "por",
        "translator_engine": "",
        "nllb_model_name": "",
        "nllb_device_preference": "",
    },
    {
        "id": "system-doc-no-translation",
        "name": "Documento sem tradução",
        "description": "Processamento de documento sem tradução — apenas OCR e conversão",
        "is_system": True,
        "processing_mode": "document",
        "comic_mode": False,
        "manga_rtl": False,
        "translation_enabled": False,
        "source_language": "",
        "target_language": "",
        "translator_engine": "",
        "nllb_model_name": "",
        "nllb_device_preference": "",
    },
]


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _utcnow() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _load_raw() -> list[dict]:
    """Lê o arquivo de presets. Retorna lista vazia se não existir."""
    if not PRESET_PATH.exists():
        return []
    try:
        return json.loads(PRESET_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save_raw(presets: list[dict]) -> None:
    PRESET_PATH.parent.mkdir(parents=True, exist_ok=True)
    PRESET_PATH.write_text(json.dumps(presets, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize(p: dict) -> dict:
    """Garante que todos os campos obrigatórios existam com valores padrão."""
    defaults = {
        "description": "",
        "is_system": False,
        "processing_mode": "document",
        "comic_mode": False,
        "manga_rtl": False,
        "translation_enabled": False,
        "source_language": "",
        "target_language": "",
        "translator_engine": "",
        "nllb_model_name": "",
        "nllb_device_preference": "",
    }
    return {**defaults, **p}


# ---------------------------------------------------------------------------
# Inicialização — garante presets do sistema no arquivo
# ---------------------------------------------------------------------------

def ensure_system_presets() -> None:
    """
    Garante que os presets do sistema existam no arquivo de presets.
    Idempotente — não sobrescreve presets existentes.
    Chamado no startup da aplicação.
    """
    raw = _load_raw()
    existing_ids = {p["id"] for p in raw}
    now = _utcnow()
    added = False

    for sp in _SYSTEM_PRESETS:
        if sp["id"] not in existing_ids:
            entry = {**sp, "created_at": now, "updated_at": now}
            raw.append(entry)
            added = True

    if added:
        _save_raw(raw)


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_presets() -> list[dict]:
    """Retorna todos os presets, sistema primeiro, depois usuário por nome."""
    raw = _load_raw()
    system = [_normalize(p) for p in raw if p.get("is_system")]
    user = sorted(
        [_normalize(p) for p in raw if not p.get("is_system")],
        key=lambda p: p.get("name", "").lower(),
    )
    return system + user


def get_preset(preset_id: str) -> dict | None:
    """Retorna preset por ID ou None se não encontrado."""
    for p in _load_raw():
        if p.get("id") == preset_id:
            return _normalize(p)
    return None


def create_preset(data: dict) -> dict:
    """
    Cria um novo preset de usuário.
    Campos obrigatórios: name.
    O campo is_system é ignorado — presets criados via API são sempre is_system=False.
    """
    now = _utcnow()
    raw = _load_raw()
    entry = {
        **_normalize(data),
        "id": str(uuid.uuid4()),
        "is_system": False,
        "created_at": now,
        "updated_at": now,
    }
    raw.append(entry)
    _save_raw(raw)
    return entry


def update_preset(preset_id: str, data: dict) -> dict | None:
    """
    Atualiza campos de um preset existente.
    Presets do sistema não podem ser editados diretamente — use duplicate primeiro.
    Retorna None se não encontrado.
    """
    raw = _load_raw()
    for i, p in enumerate(raw):
        if p.get("id") == preset_id:
            if p.get("is_system"):
                return None  # sistema: use duplicate
            updated = {**_normalize(p), **{k: v for k, v in data.items() if k not in ("id", "is_system", "created_at")}}
            updated["updated_at"] = _utcnow()
            raw[i] = updated
            _save_raw(raw)
            return updated
    return None


def delete_preset(preset_id: str) -> bool:
    """
    Remove um preset de usuário.
    Retorna False se não encontrado ou se for preset do sistema.
    """
    raw = _load_raw()
    for p in raw:
        if p.get("id") == preset_id:
            if p.get("is_system"):
                return False
            raw = [x for x in raw if x.get("id") != preset_id]
            _save_raw(raw)
            return True
    return False


def duplicate_preset(preset_id: str, new_name: str | None = None) -> dict | None:
    """
    Duplica um preset (sistema ou usuário) criando uma cópia de usuário.
    Retorna None se o original não for encontrado.
    """
    original = get_preset(preset_id)
    if original is None:
        return None

    now = _utcnow()
    copy = {
        **original,
        "id": str(uuid.uuid4()),
        "name": new_name or f"{original['name']} (cópia)",
        "is_system": False,
        "created_at": now,
        "updated_at": now,
    }
    raw = _load_raw()
    raw.append(copy)
    _save_raw(raw)
    return copy


# ---------------------------------------------------------------------------
# Aplicação de preset a campos de job
# ---------------------------------------------------------------------------

_PRESET_JOB_FIELDS = {
    "processing_mode",
    "comic_mode",
    "manga_rtl",
    "translation_enabled",
    "source_language",
    "target_language",
    "translator_engine",
}


def extract_job_updates(preset: dict) -> dict:
    """
    Extrai do preset apenas os campos aplicáveis a um job.
    Usado pelo endpoint de batch apply-preset.
    """
    return {k: preset[k] for k in _PRESET_JOB_FIELDS if k in preset}
