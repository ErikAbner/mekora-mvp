"""
Fase K — Testes para preset_service e endpoints de presets.

Garante:
- Presets do sistema são criados ao inicializar
- CRUD completo de presets de usuário
- Presets do sistema não podem ser editados nem excluídos
- Duplicação funciona para sistema e usuário
- Endpoints retornam códigos corretos
"""
from __future__ import annotations

import json
from pathlib import Path


# ---------------------------------------------------------------------------
# Serviço — testes unitários
# ---------------------------------------------------------------------------


def test_ensure_system_presets_creates_presets(tmp_path: Path, monkeypatch) -> None:
    """ensure_system_presets cria os presets padrão na primeira chamada."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    svc.ensure_system_presets()

    raw = json.loads((tmp_path / "config_presets.json").read_text())
    system_ids = {p["id"] for p in raw if p.get("is_system")}
    assert "system-doc-pt-en-argos" in system_ids
    assert "system-manga-pb-rtl" in system_ids


def test_ensure_system_presets_is_idempotent(tmp_path: Path, monkeypatch) -> None:
    """Chamar ensure_system_presets duas vezes não duplica presets."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    svc.ensure_system_presets()
    svc.ensure_system_presets()

    raw = json.loads((tmp_path / "config_presets.json").read_text())
    ids = [p["id"] for p in raw]
    assert len(ids) == len(set(ids)), "IDs duplicados detectados"


def test_list_presets_returns_system_first(tmp_path: Path, monkeypatch) -> None:
    """list_presets retorna presets do sistema antes dos de usuário."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    svc.ensure_system_presets()
    svc.create_preset({"name": "Meu preset"})

    presets = svc.list_presets()
    system = [p for p in presets if p["is_system"]]
    user = [p for p in presets if not p["is_system"]]

    assert len(system) > 0
    assert len(user) == 1
    # Sistema deve vir antes do usuário na lista
    system_end = max(i for i, p in enumerate(presets) if p["is_system"])
    user_start = min(i for i, p in enumerate(presets) if not p["is_system"])
    assert system_end < user_start


def test_create_preset_assigns_uuid_id(tmp_path: Path, monkeypatch) -> None:
    """create_preset atribui um UUID como ID."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    p = svc.create_preset({"name": "Teste"})
    assert len(p["id"]) == 36  # UUID4 format
    assert p["is_system"] is False


def test_create_preset_ignores_is_system(tmp_path: Path, monkeypatch) -> None:
    """create_preset sempre cria preset de usuário mesmo com is_system=True."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    p = svc.create_preset({"name": "Tentativa sistema", "is_system": True})
    assert p["is_system"] is False


def test_get_preset_returns_correct(tmp_path: Path, monkeypatch) -> None:
    """get_preset retorna o preset correto pelo ID."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    created = svc.create_preset({"name": "Meu preset", "source_language": "por"})
    found = svc.get_preset(created["id"])

    assert found is not None
    assert found["name"] == "Meu preset"
    assert found["source_language"] == "por"


def test_get_preset_returns_none_for_unknown(tmp_path: Path, monkeypatch) -> None:
    """get_preset retorna None para ID inexistente."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    assert svc.get_preset("id-que-nao-existe") is None


def test_update_preset_user(tmp_path: Path, monkeypatch) -> None:
    """update_preset atualiza campos de um preset de usuário."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    created = svc.create_preset({"name": "Original"})
    updated = svc.update_preset(created["id"], {"name": "Atualizado", "source_language": "eng"})

    assert updated is not None
    assert updated["name"] == "Atualizado"
    assert updated["source_language"] == "eng"


def test_update_preset_system_returns_none(tmp_path: Path, monkeypatch) -> None:
    """update_preset retorna None ao tentar editar preset do sistema."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    svc.ensure_system_presets()
    result = svc.update_preset("system-doc-pt-en-argos", {"name": "Hackeado"})
    assert result is None


def test_delete_preset_user(tmp_path: Path, monkeypatch) -> None:
    """delete_preset remove um preset de usuário."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    created = svc.create_preset({"name": "Para deletar"})
    assert svc.delete_preset(created["id"]) is True
    assert svc.get_preset(created["id"]) is None


def test_delete_preset_system_returns_false(tmp_path: Path, monkeypatch) -> None:
    """delete_preset retorna False ao tentar excluir preset do sistema."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    svc.ensure_system_presets()
    assert svc.delete_preset("system-manga-pb-rtl") is False


def test_duplicate_user_preset(tmp_path: Path, monkeypatch) -> None:
    """duplicate_preset cria cópia de usuário com novo ID."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    original = svc.create_preset({"name": "Original", "source_language": "por"})
    copy = svc.duplicate_preset(original["id"])

    assert copy is not None
    assert copy["id"] != original["id"]
    assert copy["is_system"] is False
    assert copy["source_language"] == "por"
    assert "cópia" in copy["name"]


def test_duplicate_system_preset(tmp_path: Path, monkeypatch) -> None:
    """duplicate_preset cria cópia de usuário a partir de preset do sistema."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    svc.ensure_system_presets()
    copy = svc.duplicate_preset("system-manga-pb-rtl", new_name="Meu Mangá")

    assert copy is not None
    assert copy["is_system"] is False
    assert copy["name"] == "Meu Mangá"
    assert copy["manga_rtl"] is True


def test_duplicate_returns_none_for_missing(tmp_path: Path, monkeypatch) -> None:
    """duplicate_preset retorna None para ID inexistente."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    assert svc.duplicate_preset("id-inexistente") is None


def test_extract_job_updates_returns_correct_fields(tmp_path: Path, monkeypatch) -> None:
    """extract_job_updates extrai apenas campos aplicáveis ao job."""
    import app.services.preset_service as svc
    monkeypatch.setattr(svc, "PRESET_PATH", tmp_path / "config_presets.json")

    svc.ensure_system_presets()
    preset = svc.get_preset("system-doc-pt-en-argos")
    updates = svc.extract_job_updates(preset)

    assert "processing_mode" in updates
    assert "translation_enabled" in updates
    assert "source_language" in updates
    assert "target_language" in updates
    assert "translator_engine" in updates
    # Campos não aplicáveis a jobs não devem estar presentes
    assert "nllb_model_name" not in updates
    assert "id" not in updates
    assert "is_system" not in updates


# ---------------------------------------------------------------------------
# Endpoints via TestClient
# ---------------------------------------------------------------------------


def test_api_get_presets_returns_list(client, tmp_storage: Path) -> None:
    """GET /presets retorna lista com presets do sistema."""
    resp = client.get("/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert "presets" in data
    assert isinstance(data["presets"], list)
    assert any(p["is_system"] for p in data["presets"])


def test_api_create_preset(client, tmp_storage: Path) -> None:
    """POST /presets cria preset de usuário."""
    resp = client.post("/presets", json={"name": "Meu preset", "source_language": "eng"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Meu preset"
    assert data["is_system"] is False
    assert data["source_language"] == "eng"


def test_api_create_preset_empty_name(client, tmp_storage: Path) -> None:
    """POST /presets com nome vazio retorna 422."""
    resp = client.post("/presets", json={"name": ""})
    assert resp.status_code == 422


def test_api_get_preset_by_id(client, tmp_storage: Path) -> None:
    """GET /presets/{id} retorna preset correto."""
    created = client.post("/presets", json={"name": "Buscar"}).json()
    resp = client.get(f"/presets/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Buscar"


def test_api_get_preset_404(client, tmp_storage: Path) -> None:
    """GET /presets/{id} retorna 404 para ID inexistente."""
    resp = client.get("/presets/id-que-nao-existe")
    assert resp.status_code == 404


def test_api_update_preset_user(client, tmp_storage: Path) -> None:
    """PUT /presets/{id} atualiza preset de usuário."""
    created = client.post("/presets", json={"name": "Antes"}).json()
    resp = client.put(f"/presets/{created['id']}", json={"name": "Depois"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Depois"


def test_api_update_system_preset_forbidden(client, tmp_storage: Path) -> None:
    """PUT /presets/{id} retorna 403 para preset do sistema."""
    resp = client.put("/presets/system-doc-pt-en-argos", json={"name": "Hack"})
    assert resp.status_code == 403


def test_api_delete_preset_user(client, tmp_storage: Path) -> None:
    """DELETE /presets/{id} remove preset de usuário."""
    created = client.post("/presets", json={"name": "Deletar"}).json()
    resp = client.delete(f"/presets/{created['id']}")
    assert resp.status_code == 204
    assert client.get(f"/presets/{created['id']}").status_code == 404


def test_api_delete_system_preset_forbidden(client, tmp_storage: Path) -> None:
    """DELETE /presets/{id} retorna 403 para preset do sistema."""
    resp = client.delete("/presets/system-manga-pb-rtl")
    assert resp.status_code == 403


def test_api_duplicate_system_preset(client, tmp_storage: Path) -> None:
    """POST /presets/{id}/duplicate duplica preset do sistema como usuário."""
    resp = client.post(
        "/presets/system-manga-pb-rtl/duplicate",
        json={"new_name": "Meu Mangá RTL"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["is_system"] is False
    assert data["name"] == "Meu Mangá RTL"
    assert data["manga_rtl"] is True
