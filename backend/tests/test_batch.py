"""
Fase K — Testes para endpoints de batch.

Garante:
- GET /batch/jobs com filtros
- POST /batch/apply-preset aplica preset a jobs
- POST /batch/export exporta comic jobs
- POST /batch/apply-suggestions aplica sugestões
- POST /batch/retry-send reenvia pendentes
- Falha em um item não invalida os demais (resultado parcial)
- Jobs inexistentes retornam item_result com status="error"
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path


_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
    b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
    b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _upload_job(client, tmp_path: Path, filename: str = "doc.pdf") -> int:
    """Sobe um job PDF simples e retorna upload_id."""
    try:
        import fitz
        doc = fitz.open()
        doc.new_page(width=595, height=842).insert_text((72, 72), "Hello")
        p = tmp_path / filename
        doc.save(str(p))
        doc.close()
        with open(p, "rb") as f:
            resp = client.post("/upload", files={"file": (filename, f, "application/pdf")})
    except Exception:
        # fallback: CBZ mínimo
        cbz = tmp_path / filename.replace(".pdf", ".cbz")
        with zipfile.ZipFile(cbz, "w") as zf:
            zf.writestr("p1.jpg", _PNG_1X1)
        with open(cbz, "rb") as f:
            resp = client.post("/upload", files={"file": (cbz.name, f, "application/zip")})
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def _upload_comic_job(client, tmp_path: Path) -> int:
    cbz = tmp_path / "manga.cbz"
    with zipfile.ZipFile(cbz, "w") as zf:
        zf.writestr("p1.jpg", _PNG_1X1)
    with open(cbz, "rb") as f:
        resp = client.post("/upload", files={"file": ("manga.cbz", f, "application/zip")})
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def _make_jpg(path: Path) -> Path:
    try:
        from PIL import Image
        img = Image.new("RGB", (4, 4), color=(180, 180, 180))
        img.save(str(path), "JPEG")
    except Exception:
        path.write_bytes(_PNG_1X1)
    return path


# ---------------------------------------------------------------------------
# GET /batch/jobs
# ---------------------------------------------------------------------------


def test_batch_jobs_returns_all(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET /batch/jobs sem filtros retorna todos os jobs."""
    _upload_job(client, tmp_path, "a.pdf")
    _upload_job(client, tmp_path, "b.pdf")

    resp = client.get("/batch/jobs")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["jobs"]) == data["total"]


def test_batch_jobs_tolerates_null_str_fields(client, test_engine, tmp_storage: Path) -> None:
    """GET /batch/jobs deve retornar 200 mesmo com input_format/processing_mode NULL no banco.

    Reproduz o bug: _to_history() em batch.py não coercia None→"" para campos str,
    causando ResponseValidationError e travando toda a página de Lote.
    """
    from sqlalchemy.orm import sessionmaker
    from app.models.pessoa import Pessoa
    from app.models.processing_job import ProcessingJob

    Session = sessionmaker(bind=test_engine)
    db = Session()
    try:
        # COM DONO, e a conta é a do `client`. Desde 03/09 `GET /batch/jobs`
        # lista só o que é de quem pede — antes listava a instalação inteira, e
        # um registro sem dono aparecia para qualquer visitante com conta.
        # Este teste fala da coerção de NULL, e não da porta.
        dono = db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").first()
        job = ProcessingJob(
            original_filename="legacy.pdf",
            status="uploaded",
            input_format=None,
            processing_mode=None,
            dono_id=dono.id if dono else None,
        )
        db.add(job)
        db.commit()
    finally:
        db.close()

    resp = client.get("/batch/jobs")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    # Campos coercidos para string vazia
    legado = next(j for j in data["jobs"] if j["original_filename"] == "legacy.pdf")
    assert legado["input_format"] == ""
    assert legado["processing_mode"] == ""


def test_batch_jobs_filter_by_processing_mode(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET /batch/jobs?processing_mode=comic filtra corretamente."""
    _upload_comic_job(client, tmp_path)

    resp = client.get("/batch/jobs?processing_mode=comic")
    assert resp.status_code == 200
    data = resp.json()
    assert all(j["processing_mode"] == "comic" for j in data["jobs"])


def test_batch_jobs_filter_by_status(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET /batch/jobs?status=uploaded retorna apenas jobs com status uploaded."""
    _upload_job(client, tmp_path, "status_test.pdf")

    resp = client.get("/batch/jobs?status=uploaded")
    assert resp.status_code == 200
    data = resp.json()
    assert all(j["status"] == "uploaded" for j in data["jobs"])


def test_batch_jobs_filter_by_send_pending(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET /batch/jobs?send_pending=true retorna apenas jobs com send_status=pending."""
    resp = client.get("/batch/jobs?send_pending=true")
    assert resp.status_code == 200
    data = resp.json()
    assert all(j["send_status"] == "pending" for j in data["jobs"])


# ---------------------------------------------------------------------------
# POST /batch/apply-preset
# ---------------------------------------------------------------------------


def test_batch_apply_preset_updates_jobs(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/apply-preset atualiza campos de jobs com o preset."""
    job_id = _upload_job(client, tmp_path, "preset_test.pdf")

    # Pega ID de um preset do sistema
    presets_resp = client.get("/presets")
    pt_en_preset = next(
        p for p in presets_resp.json()["presets"]
        if p["id"] == "system-doc-pt-en-argos"
    )

    resp = client.post("/batch/apply-preset", json={
        "job_ids": [job_id],
        "preset_id": pt_en_preset["id"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["succeeded"] == 1
    assert data["failed"] == 0
    assert data["item_results"][0]["status"] == "success"


def test_batch_apply_preset_invalid_preset(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/apply-preset com preset inexistente retorna todos como erro."""
    job_id = _upload_job(client, tmp_path, "inv_preset.pdf")

    resp = client.post("/batch/apply-preset", json={
        "job_ids": [job_id],
        "preset_id": "id-que-nao-existe",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["failed"] == 1
    assert data["succeeded"] == 0


def test_batch_apply_preset_unknown_job(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/apply-preset com job inexistente marca item como erro."""
    presets_resp = client.get("/presets")
    preset_id = presets_resp.json()["presets"][0]["id"]

    resp = client.post("/batch/apply-preset", json={
        "job_ids": [99999],
        "preset_id": preset_id,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["item_results"][0]["status"] == "error"
    assert data["failed"] == 1


def test_batch_apply_preset_partial_failure(client, tmp_path: Path, tmp_storage: Path) -> None:
    """Falha em um job não invalida os demais."""
    job_id = _upload_job(client, tmp_path, "partial.pdf")
    presets_resp = client.get("/presets")
    preset_id = presets_resp.json()["presets"][0]["id"]

    resp = client.post("/batch/apply-preset", json={
        "job_ids": [job_id, 99999],  # um válido, um inválido
        "preset_id": preset_id,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["succeeded"] == 1
    assert data["failed"] == 1


# ---------------------------------------------------------------------------
# POST /batch/export
# ---------------------------------------------------------------------------


def test_batch_export_skips_without_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/export pula jobs sem comic_final_manifest.json."""
    job_id = _upload_comic_job(client, tmp_path)

    resp = client.post("/batch/export", json={"job_ids": [job_id]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["skipped"] == 1
    assert data["succeeded"] == 0


def test_batch_export_with_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/export exporta job com manifesto válido."""
    job_id = _upload_comic_job(client, tmp_path)

    # Injeta manifesto e imagem
    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    pages_dir = out / "pages"
    pages_dir.mkdir(exist_ok=True)
    _make_jpg(pages_dir / "page_001.jpg")

    manifest = {
        "job_id": job_id,
        "total_pages": 1,
        "pages": [{
            "page_number": 1,
            "selected_variant": "original",
            "available_variants": ["original"],
            "notes": None,
            "updated_at": "2026-03-28T11:00:00+00:00",
            "serve_paths": {"original": f"/storage/output/{job_id}/pages/page_001.jpg"},
            "final_serve_path": None,
            "export_error": None,
            "selection_source": "default",
        }],
        "summary": {"original": 1, "render_overlay": 0, "inpaint": 0},
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }
    (out / "comic_final_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    resp = client.post("/batch/export", json={"job_ids": [job_id]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["succeeded"] == 1
    assert "página(s)" in data["item_results"][0]["message"]


def test_batch_export_unknown_job(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/export com job inexistente retorna erro."""
    resp = client.post("/batch/export", json={"job_ids": [99999]})
    assert resp.status_code == 200
    assert resp.json()["item_results"][0]["status"] == "error"


# ---------------------------------------------------------------------------
# POST /batch/apply-suggestions
# ---------------------------------------------------------------------------


def test_batch_apply_suggestions_skips_without_manifests(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /batch/apply-suggestions pula jobs sem manifesto de curadoria."""
    job_id = _upload_comic_job(client, tmp_path)

    resp = client.post("/batch/apply-suggestions", json={"job_ids": [job_id]})
    assert resp.status_code == 200
    assert resp.json()["skipped"] == 1


# ---------------------------------------------------------------------------
# POST /batch/retry-send
# ---------------------------------------------------------------------------


def test_batch_retry_send_skips_non_pending(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/retry-send pula jobs que não estão com send_status=pending."""
    job_id = _upload_job(client, tmp_path, "retry_test.pdf")

    resp = client.post("/batch/retry-send", json={"job_ids": [job_id]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["skipped"] == 1


def test_batch_retry_send_unknown_job(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/retry-send com job inexistente retorna erro."""
    resp = client.post("/batch/retry-send", json={"job_ids": [99999]})
    assert resp.status_code == 200
    assert resp.json()["item_results"][0]["status"] == "error"


# ---------------------------------------------------------------------------
# POST /batch/set-final-variant
# ---------------------------------------------------------------------------


def test_batch_set_final_variant_skips_without_manifest(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /batch/set-final-variant pula jobs sem comic_final_manifest.json."""
    job_id = _upload_comic_job(client, tmp_path)

    resp = client.post(
        "/batch/set-final-variant",
        json={"job_ids": [job_id], "variant": "original"},
    )
    assert resp.status_code == 200
    assert resp.json()["skipped"] == 1


def test_batch_set_final_variant_unknown_job(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /batch/set-final-variant com job inexistente retorna erro."""
    resp = client.post(
        "/batch/set-final-variant",
        json={"job_ids": [99999], "variant": "original"},
    )
    assert resp.status_code == 200
    assert resp.json()["item_results"][0]["status"] == "error"


def test_batch_set_final_variant_with_manifest(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /batch/set-final-variant atualiza variant de todas as páginas."""
    job_id = _upload_comic_job(client, tmp_path)

    # Injeta manifesto com duas páginas, ambas com "original" disponível
    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    manifest = {
        "job_id": job_id,
        "total_pages": 2,
        "pages": [
            {
                "page_number": 1,
                "selected_variant": "render_overlay",
                "available_variants": ["original", "render_overlay"],
                "notes": None,
                "updated_at": None,
                "serve_paths": {},
                "final_serve_path": None,
                "export_error": None,
                "selection_source": "default",
            },
            {
                "page_number": 2,
                "selected_variant": "render_overlay",
                "available_variants": ["original", "render_overlay"],
                "notes": None,
                "updated_at": None,
                "serve_paths": {},
                "final_serve_path": None,
                "export_error": None,
                "selection_source": "default",
            },
        ],
        "summary": {"original": 0, "render_overlay": 2, "inpaint": 0},
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }
    (out / "comic_final_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    resp = client.post(
        "/batch/set-final-variant",
        json={"job_ids": [job_id], "variant": "original"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["succeeded"] == 1
    assert "2 página(s)" in data["item_results"][0]["message"]
    assert data["item_results"][0]["action"] == "set-final-variant"

    # Verifica que o manifesto foi realmente atualizado
    saved = json.loads((out / "comic_final_manifest.json").read_text())
    assert all(p["selected_variant"] == "original" for p in saved["pages"])
    assert all(p["selection_source"] == "manual" for p in saved["pages"])


def test_batch_set_final_variant_warns_unavailable_variant(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /batch/set-final-variant registra warning para variante indisponível."""
    job_id = _upload_comic_job(client, tmp_path)

    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    manifest = {
        "job_id": job_id,
        "total_pages": 1,
        "pages": [
            {
                "page_number": 1,
                "selected_variant": "original",
                "available_variants": ["original"],  # inpaint não disponível
                "notes": None,
                "updated_at": None,
                "serve_paths": {},
                "final_serve_path": None,
                "export_error": None,
                "selection_source": "default",
            },
        ],
        "summary": {"original": 1},
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }
    (out / "comic_final_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    resp = client.post(
        "/batch/set-final-variant",
        json={"job_ids": [job_id], "variant": "inpaint"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["succeeded"] == 1
    item = data["item_results"][0]
    assert item["warnings"] is not None
    assert len(item["warnings"]) == 1


# ---------------------------------------------------------------------------
# POST /jobs/{id}/apply-preset — individual
# ---------------------------------------------------------------------------


def test_apply_preset_to_job(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /jobs/{id}/apply-preset atualiza metadados do job com o preset."""
    job_id = _upload_job(client, tmp_path, "preset_job.pdf")

    presets_resp = client.get("/presets")
    preset_id = next(
        p["id"] for p in presets_resp.json()["presets"]
        if p["id"] == "system-doc-pt-en-argos"
    )

    resp = client.post(f"/jobs/{job_id}/apply-preset", json={"preset_id": preset_id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["translation_enabled"] is True
    assert data["source_language"] == "por"
    assert data["target_language"] == "eng"


def test_apply_preset_to_job_unknown_preset(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /jobs/{id}/apply-preset retorna 404 para preset inexistente."""
    job_id = _upload_job(client, tmp_path, "p404.pdf")
    resp = client.post(f"/jobs/{job_id}/apply-preset", json={"preset_id": "nao-existe"})
    assert resp.status_code == 404


def test_apply_preset_to_job_unknown_job(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /jobs/{id}/apply-preset retorna 404 para job inexistente."""
    presets_resp = client.get("/presets")
    preset_id = presets_resp.json()["presets"][0]["id"]
    resp = client.post("/jobs/99999/apply-preset", json={"preset_id": preset_id})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# BatchItemResult — campos action e warnings
# ---------------------------------------------------------------------------


def test_batch_item_result_has_action_and_warnings_fields(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """BatchItemResult retorna action e warnings quando presentes."""
    job_id = _upload_comic_job(client, tmp_path)

    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    manifest = {
        "job_id": job_id,
        "total_pages": 1,
        "pages": [{
            "page_number": 1,
            "selected_variant": "original",
            "available_variants": ["original"],
            "notes": None,
            "updated_at": None,
            "serve_paths": {},
            "final_serve_path": None,
            "export_error": None,
            "selection_source": "default",
        }],
        "summary": {"original": 1},
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }
    (out / "comic_final_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    resp = client.post(
        "/batch/set-final-variant",
        json={"job_ids": [job_id], "variant": "original"},
    )
    assert resp.status_code == 200
    item = resp.json()["item_results"][0]
    assert "action" in item
    assert item["action"] == "set-final-variant"
