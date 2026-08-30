"""
Testes para comic_scoring_service e endpoints de sugestões semi-automáticas — Fase I.C.

Garante que:
- Scores são gerados corretamente por variante
- suggested_variant é coerente com os scores
- review_required é ativado nos casos corretos
- apply_suggestions respeita only_undecided e min_confidence
- Decisões manuais (selection_source=='manual') NÃO são sobrescritas sem ação explícita
- Endpoints retornam 404 antes de recompute e 200 após
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Helpers de fixture (reutilizados de test_comic_finalize.py)
# ---------------------------------------------------------------------------

_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
    b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
    b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _make_overlay_page(
    page_number: int = 1,
    blocks: list | None = None,
    job_id: int = 1,
) -> dict:
    if blocks is None:
        blocks = []
    return {
        "page_number": page_number,
        "image_path": f"/storage/output/{job_id}/pages/page_{page_number:03d}.jpg",
        "blocks": blocks,
        "error": None,
    }


def _make_overlay_data(job_id: int = 1, pages: list | None = None) -> dict:
    if pages is None:
        pages = [_make_overlay_page(1, job_id=job_id)]
    return {
        "job_id": job_id,
        "source_language": "jpn",
        "target_language": "por",
        "pages": pages,
    }


def _make_render_page(page_number: int = 1, error: str | None = None, warnings: list | None = None) -> dict:
    return {
        "page_number": page_number,
        "rendered_path": f"/tmp/p{page_number}.png",
        "serve_path": f"/storage/output/1/rendered_pages/page_{page_number:03d}.png",
        "warnings": warnings or [],
        "error": error,
    }


def _make_inpaint_page(
    page_number: int = 1,
    masked_blocks: int = 2,
    error: str | None = None,
    warnings: list | None = None,
) -> dict:
    return {
        "page_number": page_number,
        "inpainted_path": f"/tmp/inp{page_number}.png",
        "serve_path": f"/storage/output/1/inpaint_pages/page_{page_number:03d}.png",
        "masked_blocks": masked_blocks,
        "algorithm_used": "blur",
        "warnings": warnings or [],
        "error": error,
    }


def _make_final_page(
    page_number: int = 1,
    available: list | None = None,
    selected: str = "original",
    source: str = "default",
) -> dict:
    if available is None:
        available = ["original"]
    return {
        "page_number": page_number,
        "selected_variant": selected,
        "available_variants": available,
        "notes": None,
        "updated_at": None,
        "serve_paths": {},
        "final_serve_path": None,
        "export_error": None,
        "selection_source": source,
    }


def _make_final_manifest(pages: list, job_id: int = 1) -> dict:
    return {
        "job_id": job_id,
        "total_pages": len(pages),
        "pages": pages,
        "summary": {"original": len(pages), "render_overlay": 0, "inpaint": 0},
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
    }


# ---------------------------------------------------------------------------
# Serviço — _score_page / compute_suggestion_manifest
# ---------------------------------------------------------------------------


def test_score_original_only_variant() -> None:
    """Quando apenas 'original' está disponível, sugestão=original e confiança=1.0."""
    import app.services.comic_scoring_service as svc

    overlay = _make_overlay_data()
    final = _make_final_manifest([_make_final_page(available=["original"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=None,
        inpaint_manifest=None,
        final_manifest=final,
        job_id=1,
    )

    assert manifest["total_pages"] == 1
    page = manifest["pages"][0]
    assert page["suggested_variant"] == "original"
    assert page["confidence_score"] == 1.0
    assert page["review_required"] is False


def test_score_render_no_error_beats_original() -> None:
    """render_overlay sem erro deve ter score > original (base 0.5)."""
    import app.services.comic_scoring_service as svc

    overlay = _make_overlay_data()
    render_manifest = {"pages": [_make_render_page(1)]}
    final = _make_final_manifest([_make_final_page(available=["original", "render_overlay"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=render_manifest,
        inpaint_manifest=None,
        final_manifest=final,
        job_id=1,
    )

    page = manifest["pages"][0]
    assert page["scores"]["render_overlay"] > page["scores"]["original"]
    assert page["suggested_variant"] == "render_overlay"


def test_score_render_with_error_lower() -> None:
    """render_overlay com erro deve ter score reduzido."""
    import app.services.comic_scoring_service as svc

    overlay = _make_overlay_data()
    render_manifest = {"pages": [_make_render_page(1, error="Falha ao abrir imagem")]}
    final = _make_final_manifest([_make_final_page(available=["original", "render_overlay"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=render_manifest,
        inpaint_manifest=None,
        final_manifest=final,
        job_id=1,
    )

    page = manifest["pages"][0]
    assert page["scores"]["render_overlay"] < page["scores"]["original"]
    assert page["review_required"] is True


def test_score_render_with_reviewed_blocks_higher() -> None:
    """Blocos aprovados no overlay aumentam o score de render_overlay."""
    import app.services.comic_scoring_service as svc

    blocks_approved = [
        {"block_id": "p1_b0", "review_status": "approved", "overlay_visibility": True},
        {"block_id": "p1_b1", "review_status": "approved", "overlay_visibility": True},
        {"block_id": "p1_b2", "review_status": "pending", "overlay_visibility": True},
        {"block_id": "p1_b3", "review_status": "pending", "overlay_visibility": True},
    ]
    overlay = _make_overlay_data(pages=[_make_overlay_page(1, blocks=blocks_approved)])

    render_manifest_no_reviews = {"pages": [_make_render_page(1)]}

    # Overlay sem reviews para comparação
    overlay_no_reviews = _make_overlay_data()
    final = _make_final_manifest([_make_final_page(available=["original", "render_overlay"])])

    manifest_with = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=render_manifest_no_reviews,
        inpaint_manifest=None,
        final_manifest=final,
        job_id=1,
    )
    manifest_without = svc.compute_suggestion_manifest(
        overlay_data=overlay_no_reviews,
        render_manifest=render_manifest_no_reviews,
        inpaint_manifest=None,
        final_manifest=final,
        job_id=1,
    )

    score_with = manifest_with["pages"][0]["scores"]["render_overlay"]
    score_without = manifest_without["pages"][0]["scores"]["render_overlay"]
    assert score_with > score_without


def test_score_inpaint_no_error_above_threshold() -> None:
    """inpaint sem erro deve ter score > 0.5 quando há blocos mascarados."""
    import app.services.comic_scoring_service as svc

    overlay = _make_overlay_data(pages=[
        _make_overlay_page(1, blocks=[
            {"block_id": "b0", "overlay_visibility": True, "review_status": "pending"}
        ])
    ])
    inpaint_manifest = {"pages": [_make_inpaint_page(1, masked_blocks=1)]}
    final = _make_final_manifest([_make_final_page(available=["original", "inpaint"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=None,
        inpaint_manifest=inpaint_manifest,
        final_manifest=final,
        job_id=1,
    )

    page = manifest["pages"][0]
    assert page["scores"]["inpaint"] > 0.5


def test_score_inpaint_with_error_reduced() -> None:
    """inpaint com erro deve ter score baixo."""
    import app.services.comic_scoring_service as svc

    overlay = _make_overlay_data()
    inpaint_manifest = {"pages": [_make_inpaint_page(1, masked_blocks=0, error="Falha")]}
    final = _make_final_manifest([_make_final_page(available=["original", "inpaint"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=None,
        inpaint_manifest=inpaint_manifest,
        final_manifest=final,
        job_id=1,
    )

    page = manifest["pages"][0]
    assert page["scores"]["inpaint"] < page["scores"]["original"]
    assert page["review_required"] is True


def test_reasons_non_empty_for_all_variants() -> None:
    """reasons deve ser uma lista não vazia para a variante sugerida."""
    import app.services.comic_scoring_service as svc

    overlay = _make_overlay_data()
    render_manifest = {"pages": [_make_render_page(1)]}
    inpaint_manifest = {"pages": [_make_inpaint_page(1, masked_blocks=2)]}
    final = _make_final_manifest([
        _make_final_page(available=["original", "render_overlay", "inpaint"])
    ])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=render_manifest,
        inpaint_manifest=inpaint_manifest,
        final_manifest=final,
        job_id=1,
    )

    page = manifest["pages"][0]
    assert isinstance(page["reasons"], list)
    assert len(page["reasons"]) > 0


def test_review_required_when_scores_close() -> None:
    """Quando os 2 melhores scores têm gap < 0.10, review_required=True."""
    import app.services.comic_scoring_service as svc

    # render com aviso reduz score até ficar próximo do original
    overlay = _make_overlay_data()
    render_manifest = {"pages": [_make_render_page(1, warnings=["aviso1", "aviso2"])]}
    final = _make_final_manifest([_make_final_page(available=["original", "render_overlay"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=render_manifest,
        inpaint_manifest=None,
        final_manifest=final,
        job_id=1,
    )

    page = manifest["pages"][0]
    gap = abs(page["scores"]["render_overlay"] - page["scores"]["original"])
    if gap < 0.10:
        assert page["review_required"] is True


def test_review_required_when_best_score_low() -> None:
    """Quando best_score < 0.55, review_required=True."""
    import app.services.comic_scoring_service as svc

    # inpaint com erro e sem blocos → score muito baixo
    overlay = _make_overlay_data()
    inpaint_manifest = {"pages": [_make_inpaint_page(1, masked_blocks=0, error="Falha crítica")]}
    final = _make_final_manifest([_make_final_page(available=["inpaint"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=None,
        inpaint_manifest=inpaint_manifest,
        final_manifest=final,
        job_id=1,
    )

    page = manifest["pages"][0]
    if page["confidence_score"] < 0.55:
        assert page["review_required"] is True


# ---------------------------------------------------------------------------
# Serviço — apply_suggestions_to_manifest
# ---------------------------------------------------------------------------


def test_apply_suggestions_only_undecided() -> None:
    """only_undecided=True não toca páginas com selection_source != 'default'."""
    import app.services.comic_scoring_service as svc

    final = _make_final_manifest([
        _make_final_page(1, available=["original", "render_overlay"], source="manual"),
        _make_final_page(2, available=["original", "render_overlay"], source="default"),
    ])
    suggestion_manifest = {
        "job_id": 1,
        "total_pages": 2,
        "computed_at": "2026-03-28T00:00:00+00:00",
        "pages": [
            {
                "page_number": 1,
                "available_variants": ["original", "render_overlay"],
                "scores": {"original": 0.5, "render_overlay": 0.8},
                "suggested_variant": "render_overlay",
                "confidence_score": 0.8,
                "reasons": ["render sem erros"],
                "review_required": False,
            },
            {
                "page_number": 2,
                "available_variants": ["original", "render_overlay"],
                "scores": {"original": 0.5, "render_overlay": 0.8},
                "suggested_variant": "render_overlay",
                "confidence_score": 0.8,
                "reasons": ["render sem erros"],
                "review_required": False,
            },
        ],
    }

    updated, count = svc.apply_suggestions_to_manifest(
        suggestion_manifest=suggestion_manifest,
        final_manifest=final,
        only_undecided=True,
    )

    assert count == 1
    assert updated["pages"][0]["selected_variant"] == "original"   # manual — não tocado
    assert updated["pages"][0]["selection_source"] == "manual"
    assert updated["pages"][1]["selected_variant"] == "render_overlay"
    assert updated["pages"][1]["selection_source"] == "auto"


def test_apply_suggestions_force_overwrites_manual() -> None:
    """only_undecided=False sobrescreve páginas com selection_source=='manual'."""
    import app.services.comic_scoring_service as svc

    final = _make_final_manifest([
        _make_final_page(1, available=["original", "render_overlay"], source="manual"),
    ])
    suggestion_manifest = {
        "job_id": 1,
        "total_pages": 1,
        "computed_at": "2026-03-28T00:00:00+00:00",
        "pages": [
            {
                "page_number": 1,
                "available_variants": ["original", "render_overlay"],
                "scores": {"original": 0.5, "render_overlay": 0.8},
                "suggested_variant": "render_overlay",
                "confidence_score": 0.8,
                "reasons": ["render sem erros"],
                "review_required": False,
            },
        ],
    }

    updated, count = svc.apply_suggestions_to_manifest(
        suggestion_manifest=suggestion_manifest,
        final_manifest=final,
        only_undecided=False,
    )

    assert count == 1
    assert updated["pages"][0]["selected_variant"] == "render_overlay"
    assert updated["pages"][0]["selection_source"] == "auto"


def test_apply_suggestions_respects_min_confidence() -> None:
    """Sugestão com confidence_score abaixo de min_confidence é ignorada."""
    import app.services.comic_scoring_service as svc

    final = _make_final_manifest([
        _make_final_page(1, available=["original", "render_overlay"], source="default"),
    ])
    suggestion_manifest = {
        "job_id": 1,
        "total_pages": 1,
        "computed_at": "2026-03-28T00:00:00+00:00",
        "pages": [
            {
                "page_number": 1,
                "available_variants": ["original", "render_overlay"],
                "scores": {"original": 0.5, "render_overlay": 0.6},
                "suggested_variant": "render_overlay",
                "confidence_score": 0.6,
                "reasons": [],
                "review_required": False,
            },
        ],
    }

    updated, count = svc.apply_suggestions_to_manifest(
        suggestion_manifest=suggestion_manifest,
        final_manifest=final,
        only_undecided=True,
        min_confidence=0.75,  # threshold acima de 0.6
    )

    assert count == 0
    assert updated["pages"][0]["selected_variant"] == "original"
    assert updated["pages"][0]["selection_source"] == "default"


def test_manifest_structure_correct() -> None:
    """Manifesto de sugestões tem estrutura esperada."""
    import app.services.comic_scoring_service as svc

    overlay = _make_overlay_data()
    final = _make_final_manifest([_make_final_page(available=["original"])])

    manifest = svc.compute_suggestion_manifest(
        overlay_data=overlay,
        render_manifest=None,
        inpaint_manifest=None,
        final_manifest=final,
        job_id=42,
    )

    assert manifest["job_id"] == 42
    assert manifest["total_pages"] == 1
    assert "computed_at" in manifest
    page = manifest["pages"][0]
    for key in ("page_number", "available_variants", "scores", "suggested_variant",
                "confidence_score", "reasons", "review_required"):
        assert key in page, f"Campo '{key}' ausente na página de sugestão"


# ---------------------------------------------------------------------------
# Serviço — selection_source em apply_final_patches (Fase I.B + I.C)
# ---------------------------------------------------------------------------


def test_apply_patches_sets_selection_source_manual(tmp_path: Path) -> None:
    """apply_final_patches define selection_source='manual' nas páginas alteradas."""
    import app.services.comic_finalize_service as svc

    pages_dir = tmp_path / "pages"
    rendered_dir = tmp_path / "rendered_pages"
    inpaint_dir = tmp_path / "inpaint_pages"
    for d in (pages_dir, rendered_dir, inpaint_dir):
        d.mkdir()
    (pages_dir / "page_001.jpg").write_bytes(_PNG_1X1)

    overlay = {
        "job_id": 1, "source_language": "jpn", "target_language": "por",
        "pages": [{"page_number": 1, "image_path": "/storage/output/1/pages/page_001.jpg",
                   "blocks": [], "error": None}],
    }
    manifest = svc.initialize_final_manifest(overlay, pages_dir, rendered_dir, inpaint_dir, 1)
    assert manifest["pages"][0]["selection_source"] == "default"

    updated = svc.apply_final_patches(
        manifest, [{"page_number": 1, "selected_variant": "original"}]
    )
    assert updated["pages"][0]["selection_source"] == "manual"


# ---------------------------------------------------------------------------
# Endpoints via TestClient
# ---------------------------------------------------------------------------


def _upload_comic_job(client, tmp_path: Path) -> int:
    cbz = tmp_path / "manga.cbz"
    with zipfile.ZipFile(cbz, "w") as zf:
        zf.writestr("p1.jpg", _PNG_1X1)
    with open(cbz, "rb") as f:
        resp = client.post("/upload", files={"file": ("manga.cbz", f, "application/zip")})
    assert resp.status_code == 201
    return resp.json()["upload_id"]


def _set_comic_done(job_id: int) -> None:
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob

    db = SessionLocal()
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if job:
            job.comic_translation_status = "done"
            job.processing_mode = "comic"
            db.commit()
    finally:
        db.close()


def _inject_overlay(tmp_storage: Path, job_id: int) -> None:
    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    overlay = {
        "job_id": job_id,
        "source_language": "jpn",
        "target_language": "por",
        "pages": [
            {
                "page_number": 1,
                "image_path": f"/storage/output/{job_id}/pages/page_001.jpg",
                "blocks": [],
                "error": None,
            }
        ],
    }
    (out / "comic_overlay.json").write_text(json.dumps(overlay), encoding="utf-8")
    pages_dir = out / "pages"
    pages_dir.mkdir(exist_ok=True)
    (pages_dir / "page_001.jpg").write_bytes(_PNG_1X1)


def _inject_suggestion_manifest(tmp_storage: Path, job_id: int) -> None:
    out = tmp_storage / "output" / str(job_id)
    out.mkdir(parents=True, exist_ok=True)
    suggestion = {
        "job_id": job_id,
        "total_pages": 1,
        "computed_at": "2026-03-28T00:00:00+00:00",
        "pages": [
            {
                "page_number": 1,
                "available_variants": ["original"],
                "scores": {"original": 1.0},
                "suggested_variant": "original",
                "confidence_score": 1.0,
                "reasons": ["Única variante disponível"],
                "review_required": False,
            }
        ],
    }
    (out / "comic_suggestion_manifest.json").write_text(
        json.dumps(suggestion), encoding="utf-8"
    )


def test_get_suggestions_404_before_recompute(client, tmp_path: Path) -> None:
    """GET /comic-suggestions retorna 404 antes de recompute."""
    job_id = _upload_comic_job(client, tmp_path)
    resp = client.get(f"/jobs/{job_id}/comic-suggestions")
    assert resp.status_code == 404


def test_post_recompute_404_no_overlay(client, tmp_path: Path) -> None:
    """POST /comic-suggestions/recompute retorna 404 sem overlay."""
    job_id = _upload_comic_job(client, tmp_path)
    resp = client.post(f"/jobs/{job_id}/comic-suggestions/recompute")
    assert resp.status_code == 404


def test_post_recompute_creates_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """POST /recompute cria manifesto de sugestões e retorna estrutura correta."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)
    client.post(f"/jobs/{job_id}/comic-finalize")

    resp = client.post(f"/jobs/{job_id}/comic-suggestions/recompute")
    assert resp.status_code == 200
    data = resp.json()
    assert "manifest" in data
    assert data["manifest"]["total_pages"] == 1
    assert data["manifest"]["pages"][0]["suggested_variant"] == "original"

    manifest_file = tmp_storage / "output" / str(job_id) / "comic_suggestion_manifest.json"
    assert manifest_file.exists()


def test_get_suggestions_returns_manifest(client, tmp_path: Path, tmp_storage: Path) -> None:
    """GET /comic-suggestions retorna manifesto após recompute."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)
    client.post(f"/jobs/{job_id}/comic-finalize")
    client.post(f"/jobs/{job_id}/comic-suggestions/recompute")

    resp = client.get(f"/jobs/{job_id}/comic-suggestions")
    assert resp.status_code == 200
    assert resp.json()["manifest"]["job_id"] == job_id


def test_apply_suggestions_404_no_final_manifest(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /apply-suggestions retorna 404 sem manifesto final."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)
    _inject_suggestion_manifest(tmp_storage, job_id)

    resp = client.post(
        f"/jobs/{job_id}/comic-finalize/apply-suggestions",
        json={"only_undecided": True, "min_confidence": 0.0},
    )
    assert resp.status_code == 404


def test_apply_suggestions_404_no_suggestion_manifest(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /apply-suggestions retorna 404 sem manifesto de sugestões."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)
    client.post(f"/jobs/{job_id}/comic-finalize")

    resp = client.post(
        f"/jobs/{job_id}/comic-finalize/apply-suggestions",
        json={"only_undecided": True, "min_confidence": 0.0},
    )
    assert resp.status_code == 404


def test_apply_suggestions_updates_final_manifest(
    client, tmp_path: Path, tmp_storage: Path
) -> None:
    """POST /apply-suggestions atualiza o manifesto final e retorna applied_count."""
    job_id = _upload_comic_job(client, tmp_path)
    _inject_overlay(tmp_storage, job_id)
    _set_comic_done(job_id)
    client.post(f"/jobs/{job_id}/comic-finalize")
    client.post(f"/jobs/{job_id}/comic-suggestions/recompute")

    resp = client.post(
        f"/jobs/{job_id}/comic-finalize/apply-suggestions",
        json={"only_undecided": True, "min_confidence": 0.0},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "manifest" in data
    assert "applied_count" in data
    assert isinstance(data["applied_count"], int)
