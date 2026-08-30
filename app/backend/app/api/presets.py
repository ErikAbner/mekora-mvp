"""
Fase K — Endpoints de gerenciamento de presets de processamento.

Presets são configurações reutilizáveis (modo, idioma, tradução, etc.)
que podem ser aplicadas a múltiplos jobs via batch ou individualmente.

Presets do sistema (is_system=True) são somente-leitura:
  - não podem ser editados nem excluídos
  - podem ser duplicados como cópias de usuário
"""
from fastapi import APIRouter, HTTPException

from app.schemas.jobs import (
    BatchItemResult,
    Preset,
    PresetCreate,
    PresetDuplicateRequest,
    PresetListResponse,
    PresetUpdate,
)

router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("", response_model=PresetListResponse)
def list_presets() -> dict:
    """Lista todos os presets (sistema + usuário)."""
    from app.services.preset_service import list_presets as svc_list
    return {"presets": svc_list()}


@router.post("", response_model=Preset, status_code=201)
def create_preset(body: PresetCreate) -> dict:
    """Cria um novo preset de usuário."""
    from app.services.preset_service import create_preset as svc_create
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="O nome do preset não pode ser vazio.")
    return svc_create(body.model_dump())


@router.get("/{preset_id}", response_model=Preset)
def get_preset(preset_id: str) -> dict:
    """Retorna um preset pelo ID."""
    from app.services.preset_service import get_preset as svc_get
    preset = svc_get(preset_id)
    if preset is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")
    return preset


@router.put("/{preset_id}", response_model=Preset)
def update_preset(preset_id: str, body: PresetUpdate) -> dict:
    """
    Atualiza campos de um preset de usuário.
    Presets do sistema não podem ser editados — use POST /{id}/duplicate.
    """
    from app.services.preset_service import get_preset as svc_get
    from app.services.preset_service import update_preset as svc_update

    existing = svc_get(preset_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")
    if existing.get("is_system"):
        raise HTTPException(
            status_code=403,
            detail="Presets do sistema não podem ser editados. Use POST /{id}/duplicate para criar uma cópia.",
        )

    updated = svc_update(preset_id, body.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")
    return updated


@router.delete("/{preset_id}", status_code=204)
def delete_preset(preset_id: str) -> None:
    """
    Remove um preset de usuário.
    Presets do sistema não podem ser excluídos.
    """
    from app.services.preset_service import delete_preset as svc_delete
    from app.services.preset_service import get_preset as svc_get

    existing = svc_get(preset_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")
    if existing.get("is_system"):
        raise HTTPException(status_code=403, detail="Presets do sistema não podem ser excluídos.")

    svc_delete(preset_id)


@router.post("/{preset_id}/duplicate", response_model=Preset, status_code=201)
def duplicate_preset(preset_id: str, body: PresetDuplicateRequest) -> dict:
    """Duplica um preset (sistema ou usuário) criando uma cópia de usuário."""
    from app.services.preset_service import duplicate_preset as svc_dup
    result = svc_dup(preset_id, new_name=body.new_name)
    if result is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")
    return result
