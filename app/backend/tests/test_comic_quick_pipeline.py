"""
Estabilização v1 — P3: testes do quick pipeline (modo Recomendado).
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from app.services.comic_quick_pipeline_service import (
    QuickPipelineError,
    run_preflight,
    run_quick_pipeline,
)


def _make_cbz(path: Path, count: int = 2) -> Path:
    from PIL import Image
    import io
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w") as zf:
        for n in range(1, count + 1):
            buf = io.BytesIO()
            Image.new("RGB", (200, 300), (240, 240, 240)).save(buf, "PNG")
            zf.writestr(f"page_{n:03d}.png", buf.getvalue())
    return path


def _seed_translation(output_dir: Path, count: int = 2) -> None:
    pages = [
        {
            "page": n,
            "blocks": [
                {
                    "block_id": f"p{n}b1",
                    "original_text": "HELLO",
                    "translated_text": "OLÁ MUNDO",
                    "confidence": 90.0,
                    "bbox": [0.1, 0.1, 0.5, 0.2],
                }
            ],
        }
        for n in range(1, count + 1)
    ]
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "comic_translation.json").write_text(
        json.dumps({
            "job_id": 42,
            "source_language": "eng",
            "target_language": "por",
            "pages": pages,
        }),
        encoding="utf-8",
    )


class _FakeEngine:
    def translate(self, text, source, target):
        return f"[T]{text}"

    def is_pair_available(self, source, target):
        return True


# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

def _job(tmp_path, **over):
    base = {
        "input_path": str(tmp_path / "manga.cbz"),
        "input_format": "cbz",
        "source_language": "eng",
        "target_language": "por",
        "translator_engine": "argos",
        "comic_translation_enabled": True,
        "comic_translation_status": "not_started",
        "active_operation": None,
    }
    base.update(over)
    return base


def test_preflight_missing_input_fails(tmp_path: Path) -> None:
    out = tmp_path / "42"
    out.mkdir()
    result = run_preflight(_job(tmp_path), out, {})
    assert result["ok"] is False
    ids = {c["id"]: c for c in result["checks"]}
    assert ids["input_file"]["ok"] is False


def test_preflight_reports_reuse_plan(tmp_path: Path, monkeypatch) -> None:
    _make_cbz(tmp_path / "manga.cbz")
    out = tmp_path / "42"
    _seed_translation(out)
    (out / "comic_review.json").write_text("{}")
    result = run_preflight(_job(tmp_path), out, {})
    assert "translation" in result["plan"]["steps_reused"]
    assert "review" in result["plan"]["steps_reused"]
    assert "finalize" in result["plan"]["steps_to_run"]
    assert result["plan"]["page_count"] == 2


def test_preflight_active_operation_blocks(tmp_path: Path) -> None:
    from types import SimpleNamespace
    from app.services.progress_service import begin_operation

    _make_cbz(tmp_path / "manga.cbz")
    out = tmp_path / "42"
    out.mkdir()
    holder = SimpleNamespace(active_operation=None)
    begin_operation(holder, out, "comic_translate")
    result = run_preflight(
        _job(tmp_path, active_operation=holder.active_operation), out, {}
    )
    ids = {c["id"]: c for c in result["checks"]}
    assert ids["no_active_operation"]["ok"] is False
    assert result["ok"] is False


def test_preflight_translation_disabled_not_critical(tmp_path: Path) -> None:
    _make_cbz(tmp_path / "manga.cbz")
    out = tmp_path / "42"
    out.mkdir()
    result = run_preflight(
        _job(tmp_path, comic_translation_enabled=False), out, {}
    )
    ids = {c["id"]: c for c in result["checks"]}
    assert ids["engine"]["critical"] is False


# ---------------------------------------------------------------------------
# Execução (integração de serviços, tradução pré-existente)
# ---------------------------------------------------------------------------

def test_quick_pipeline_end_to_end_with_seeded_translation(tmp_path: Path) -> None:
    cbz = _make_cbz(tmp_path / "manga.cbz")
    out = tmp_path / "42"
    _seed_translation(out)

    progress_calls: list = []
    summary = run_quick_pipeline(
        job_id=42,
        input_path=str(cbz),
        input_format="cbz",
        source_lang="eng",
        target_lang="por",
        engine=_FakeEngine(),
        output_dir=out,
        progress_callback=lambda s, c, t, m: progress_calls.append((s, c, t, m)),
    )

    # Tradução reaproveitada; demais etapas executadas
    assert "translation" in summary["reused"]
    assert {"review", "overlay", "render", "finalize"} <= set(summary["executed"])

    # Revisão auto-aprovada
    review = json.loads((out / "comic_review.json").read_text())
    statuses = [
        b["review_status"] for p in review["pages"] for b in p["blocks"]
    ]
    assert statuses and all(s == "approved" for s in statuses)

    # Render + curadoria com variante traduzida
    assert (out / "comic_render.json").exists()
    final = json.loads((out / "comic_final_manifest.json").read_text())
    assert final["exported_pages"] == 2
    assert all(p["selected_variant"] == "render_overlay" for p in final["pages"])
    assert all(p.get("selection_source") == "auto" for p in final["pages"])
    assert len(list((out / "final_pages").glob("page_*.png"))) == 2

    # Integração com P1: a fonte de export resolve para final_pages
    from app.services.comic_export_service import resolve_export_source
    res = resolve_export_source(out)
    assert res["source"] == "final_pages"
    assert summary["next_step"] == "export"
    assert progress_calls, "progress_callback deve ser chamado"


def test_quick_pipeline_is_resumable(tmp_path: Path) -> None:
    """Segunda execução reaproveita tudo sem quebrar (idempotente)."""
    cbz = _make_cbz(tmp_path / "manga.cbz")
    out = tmp_path / "42"
    _seed_translation(out)

    kw = dict(
        job_id=42, input_path=str(cbz), input_format="cbz",
        source_lang="eng", target_lang="por", engine=_FakeEngine(), output_dir=out,
    )
    run_quick_pipeline(**kw)
    summary2 = run_quick_pipeline(**kw)
    assert {"translation", "review", "overlay", "render"} <= set(summary2["reused"])
    assert summary2["pages_exported"] == 2


def test_quick_pipeline_fails_without_rendered_pages(tmp_path: Path, monkeypatch) -> None:
    """Sem páginas renderizadas → erro claro, nunca original silencioso."""
    cbz = _make_cbz(tmp_path / "manga.cbz")
    out = tmp_path / "42"
    _seed_translation(out)

    import app.services.comic_render_service as render_svc
    real = render_svc.render_overlay_pages

    def no_render(**kwargs):
        m = real(**kwargs)
        # simula render sem saída
        import shutil as _sh
        _sh.rmtree(out / "rendered_pages", ignore_errors=True)
        m["rendered_pages"] = 0
        return m

    monkeypatch.setattr(render_svc, "render_overlay_pages", no_render)

    with pytest.raises(QuickPipelineError):
        run_quick_pipeline(
            job_id=42, input_path=str(cbz), input_format="cbz",
            source_lang="eng", target_lang="por", engine=_FakeEngine(), output_dir=out,
        )
