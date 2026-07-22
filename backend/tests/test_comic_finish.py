"""
Testes para comic_finish_service e endpoints de acabamento visual — Fase N.A.

Garante que:
- finished_pages/ é gerado corretamente a partir do comic_final_manifest
- Arte original, render_overlay, inpaint e final_pages NÃO são modificados
- Presets visuais têm os valores corretos
- Override por página funciona e é resetável
- Export gera ZIP com páginas
- Páginas sem fonte geram warning mas não abordam o export
"""
from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

import pytest

import app.services.comic_finish_service as svc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
    b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
    b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _make_png(path: Path, color: tuple[int, int, int] = (128, 128, 128)) -> Path:
    """Cria PNG de teste (10x10) com Pillow ou fallback para bytes estáticos."""
    try:
        from PIL import Image
        img = Image.new("RGB", (10, 10), color=color)
        img.save(str(path), "PNG")
    except Exception:
        path.write_bytes(_PNG_1X1)
    return path


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _make_final_manifest(job_id: int, pages_dir: Path, has_render: bool = True) -> dict:
    """Cria um comic_final_manifest.json mínimo para usar na inicialização."""
    pages = []
    for i in range(1, 3):
        serve_paths: dict = {
            "original": f"/storage/output/{job_id}/pages/page_{i:03d}.jpg"
        }
        if has_render:
            serve_paths["render_overlay"] = (
                f"/storage/output/{job_id}/rendered_pages/page_{i:03d}.png"
            )
        pages.append(
            {
                "page_number": i,
                "selected_variant": "original",
                "available_variants": list(serve_paths.keys()),
                "notes": None,
                "updated_at": None,
                "serve_paths": serve_paths,
                "final_serve_path": None,
                "export_error": None,
                "selection_source": "default",
            }
        )
    return {
        "job_id": job_id,
        "total_pages": len(pages),
        "pages": pages,
        "summary": {"original": len(pages), "render_overlay": 0, "inpaint": 0},
        "exported_pages": 0,
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }


# ---------------------------------------------------------------------------
# 1. Inicialização cria manifesto
# ---------------------------------------------------------------------------

def test_init_creates_manifest(tmp_path: Path) -> None:
    job_id = 1
    final_manifest = _make_final_manifest(job_id, tmp_path)
    output_dir = tmp_path / "output"

    m = svc.initialize_finish_manifest(job_id, final_manifest, output_dir)

    assert m["job_id"] == job_id
    assert m["global_preset"] == "none"
    assert len(m["pages"]) == 2
    assert (output_dir / "comic_finish_manifest.json").exists()


# ---------------------------------------------------------------------------
# 2. Inicialização copia source_variant e source_path do final_manifest
# ---------------------------------------------------------------------------

def test_init_copies_source_variants_from_final(tmp_path: Path) -> None:
    job_id = 2
    final_manifest = _make_final_manifest(job_id, tmp_path)
    # Mudar variante da segunda página para render_overlay
    final_manifest["pages"][1]["selected_variant"] = "render_overlay"

    m = svc.initialize_finish_manifest(job_id, final_manifest, tmp_path)

    assert m["pages"][0]["source_variant"] == "original"
    assert m["pages"][1]["source_variant"] == "render_overlay"
    # source_path deve conter o serve_path da variante selecionada
    assert "pages/page_001" in (m["pages"][0]["source_path"] or "")
    assert "rendered_pages/page_002" in (m["pages"][1]["source_path"] or "")


# ---------------------------------------------------------------------------
# 3. Valores dos presets estão corretos
# ---------------------------------------------------------------------------

def test_preset_values_correct() -> None:
    presets = {p["name"]: p["adjustments"] for p in svc.get_preset_list()}

    assert presets["none"]["contrast"] == 1.0
    assert presets["none"]["saturation"] == 1.0

    assert presets["clean_manga_bw"]["contrast"] == 1.4
    assert presets["clean_manga_bw"]["saturation"] == 0.0
    assert presets["clean_manga_bw"]["sharpness"] == 1.6

    assert presets["high_contrast_overlay"]["contrast"] == 1.6
    assert presets["high_contrast_overlay"]["saturation"] == 0.7


# ---------------------------------------------------------------------------
# 4. PATCH — preset global reflete nos ajustes
# ---------------------------------------------------------------------------

def test_apply_global_preset(tmp_path: Path) -> None:
    job_id = 3
    final_manifest = _make_final_manifest(job_id, tmp_path)
    m = svc.initialize_finish_manifest(job_id, final_manifest, tmp_path)

    updated = svc.apply_finish_patches(
        m, {"global_preset": "clean_manga_bw", "global_adjustments": None, "page_patches": []}
    )

    assert updated["global_preset"] == "clean_manga_bw"
    assert updated["global_adjustments"]["contrast"] == 1.4
    assert updated["global_adjustments"]["saturation"] == 0.0


# ---------------------------------------------------------------------------
# 5. PATCH — override por página sobrescreve global
# ---------------------------------------------------------------------------

def test_apply_page_override(tmp_path: Path) -> None:
    job_id = 4
    final_manifest = _make_final_manifest(job_id, tmp_path)
    m = svc.initialize_finish_manifest(job_id, final_manifest, tmp_path)

    # Preset global: high_contrast_overlay (contrast=1.6)
    m = svc.apply_finish_patches(
        m, {"global_preset": "high_contrast_overlay", "page_patches": []}
    )

    # Override da página 1: none (contrast=1.0)
    updated = svc.apply_finish_patches(
        m,
        {
            "page_patches": [
                {
                    "page_number": 1,
                    "preset_override": "none",
                    "adjustments_override": None,
                }
            ]
        },
    )

    page1 = next(p for p in updated["pages"] if p["page_number"] == 1)
    page2 = next(p for p in updated["pages"] if p["page_number"] == 2)

    eff1 = svc._effective_adjustments(updated, page1)
    eff2 = svc._effective_adjustments(updated, page2)

    assert eff1["contrast"] == 1.0   # preset_override="none"
    assert eff2["contrast"] == 1.6   # global high_contrast_overlay


# ---------------------------------------------------------------------------
# 6. Export gera finished_pages/page_NNN.png
# ---------------------------------------------------------------------------

def test_export_generates_finished_pages(tmp_path: Path) -> None:
    job_id = 5
    project_root = tmp_path

    # Criar estrutura de storage simulada
    pages_dir = tmp_path / "storage" / "output" / str(job_id) / "pages"
    pages_dir.mkdir(parents=True)
    _make_png(pages_dir / "page_001.jpg")
    _make_png(pages_dir / "page_002.jpg")

    output_dir = tmp_path / "storage" / "output" / str(job_id)
    final_manifest = _make_final_manifest(job_id, tmp_path, has_render=False)
    m = svc.initialize_finish_manifest(job_id, final_manifest, output_dir)

    result = svc.export_finished_pages(job_id, m, output_dir, project_root=tmp_path)

    finished_dir = output_dir / "finished_pages"
    assert (finished_dir / "page_001.png").exists()
    assert (finished_dir / "page_002.png").exists()
    assert result["pages"][0]["finished_path"] is not None


# ---------------------------------------------------------------------------
# 7. Export ZIP contém as páginas
# ---------------------------------------------------------------------------

def test_export_zip_contains_pages(tmp_path: Path) -> None:
    job_id = 6
    pages_dir = tmp_path / "storage" / "output" / str(job_id) / "pages"
    pages_dir.mkdir(parents=True)
    _make_png(pages_dir / "page_001.jpg")

    output_dir = tmp_path / "storage" / "output" / str(job_id)
    final_manifest = _make_final_manifest(job_id, tmp_path, has_render=False)
    # Apenas 1 página
    final_manifest["pages"] = [final_manifest["pages"][0]]

    m = svc.initialize_finish_manifest(job_id, final_manifest, output_dir)
    result = svc.export_finished_pages(job_id, m, output_dir, project_root=tmp_path)

    assert result["zip_path"] is not None
    zip_local = output_dir / "finished_pages.zip"
    assert zip_local.exists()
    with zipfile.ZipFile(zip_local) as zf:
        names = zf.namelist()
    assert "page_001.png" in names


# ---------------------------------------------------------------------------
# 8. Export não modifica a fonte original
# ---------------------------------------------------------------------------

def test_export_does_not_modify_source(tmp_path: Path) -> None:
    job_id = 7
    pages_dir = tmp_path / "storage" / "output" / str(job_id) / "pages"
    pages_dir.mkdir(parents=True)
    src = _make_png(pages_dir / "page_001.jpg")
    original_hash = _sha256(src)

    output_dir = tmp_path / "storage" / "output" / str(job_id)
    final_manifest = _make_final_manifest(job_id, tmp_path, has_render=False)
    final_manifest["pages"] = [final_manifest["pages"][0]]

    m = svc.initialize_finish_manifest(job_id, final_manifest, output_dir)
    # Usar preset que altera a imagem
    m = svc.apply_finish_patches(m, {"global_preset": "clean_manga_bw", "page_patches": []})
    svc.export_finished_pages(job_id, m, output_dir, project_root=tmp_path)

    assert _sha256(src) == original_hash, "Arquivo fonte foi modificado!"


# ---------------------------------------------------------------------------
# 9. Reset de override por página
# ---------------------------------------------------------------------------

def test_reset_page_override(tmp_path: Path) -> None:
    job_id = 8
    final_manifest = _make_final_manifest(job_id, tmp_path)
    m = svc.initialize_finish_manifest(job_id, final_manifest, tmp_path)

    # Aplicar override
    m = svc.apply_finish_patches(
        m,
        {
            "page_patches": [
                {"page_number": 1, "preset_override": "high_contrast_overlay"}
            ]
        },
    )
    page1 = next(p for p in m["pages"] if p["page_number"] == 1)
    assert page1["preset_override"] == "high_contrast_overlay"

    # Resetar: preset_override=None
    m = svc.apply_finish_patches(
        m,
        {"page_patches": [{"page_number": 1, "preset_override": None}]},
    )
    page1 = next(p for p in m["pages"] if p["page_number"] == 1)
    assert page1["preset_override"] is None


# ---------------------------------------------------------------------------
# 10. Página sem fonte gera warning mas não aborta o export
# ---------------------------------------------------------------------------

def test_export_missing_source_records_warning(tmp_path: Path) -> None:
    job_id = 9
    output_dir = tmp_path / "storage" / "output" / str(job_id)
    output_dir.mkdir(parents=True)

    # Página com source_path que não existe
    manifest = {
        "job_id": job_id,
        "global_preset": "none",
        "global_adjustments": {
            "contrast": 1.0, "brightness": 1.0, "sharpness": 1.0, "saturation": 1.0
        },
        "pages": [
            {
                "page_number": 1,
                "source_variant": "original",
                "preset_override": None,
                "adjustments_override": None,
                "source_path": "/storage/output/9/pages/nonexistent.jpg",
                "finished_path": None,
                "exported_at": None,
                "warnings": [],
            }
        ],
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }

    result = svc.export_finished_pages(job_id, manifest, output_dir, project_root=tmp_path)

    page = result["pages"][0]
    assert page["finished_path"] is None
    assert len(page["warnings"]) > 0
    # ZIP vazio (sem páginas exportadas)
    assert result["zip_path"] is None


# ---------------------------------------------------------------------------
# quality_score (Fase N.A — score circular)
# ---------------------------------------------------------------------------

def test_compute_quality_score_none_before_analysis():
    """quality_score é None quando analyzed_at está ausente do manifesto."""
    from app.api.comic_finish import _compute_quality_score

    manifest = {
        "pages": [
            {"page_number": 1, "layout_issues": []},
        ],
        # analyzed_at ausente
    }
    assert _compute_quality_score(manifest) is None


def test_compute_quality_score_perfect_after_analysis():
    """Score 100 quando análise foi executada e não encontrou problemas."""
    from app.api.comic_finish import _compute_quality_score

    manifest = {
        "analyzed_at": "2026-04-04T10:00:00+00:00",
        "pages": [
            {"page_number": 1, "layout_issues": []},
            {"page_number": 2, "layout_issues": []},
        ],
    }
    assert _compute_quality_score(manifest) == 100


def test_compute_quality_score_with_issues():
    """Erros (−10) e avisos (−5) reduzem o score corretamente."""
    from app.api.comic_finish import _compute_quality_score

    manifest = {
        "analyzed_at": "2026-04-04T10:00:00+00:00",
        "pages": [
            {
                "page_number": 1,
                "layout_issues": [
                    {"issue_type": "overflow", "block_id": "b1", "severity": "error", "detail": "x"},
                    {"issue_type": "low_contrast", "block_id": "b2", "severity": "warning", "detail": "x"},
                ],
            },
            {"page_number": 2, "layout_issues": []},
        ],
    }
    # 100 - 10 (error) - 5 (warning) = 85
    assert _compute_quality_score(manifest) == 85


def test_compute_quality_score_clamped_at_zero():
    """Score não vai abaixo de 0 com muitos erros."""
    from app.api.comic_finish import _compute_quality_score

    issues = [
        {"issue_type": "overflow", "block_id": f"b{i}", "severity": "error", "detail": "x"}
        for i in range(20)
    ]
    manifest = {
        "analyzed_at": "2026-04-04T10:00:00+00:00",
        "pages": [{"page_number": 1, "layout_issues": issues}],
    }
    assert _compute_quality_score(manifest) == 0


def test_analyze_finish_layout_sets_analyzed_at(tmp_path: Path):
    """analyze_finish_layout registra analyzed_at no manifesto."""
    manifest = {
        "job_id": 1,
        "global_preset": "none",
        "global_adjustments": {"contrast": 1.0, "brightness": 1.0, "sharpness": 1.0, "saturation": 1.0},
        "pages": [{"page_number": 1, "source_variant": "original", "source_path": None, "warnings": []}],
        "zip_path": None,
        "cbz_path": None,
        "pdf_path": None,
    }
    result = svc.analyze_finish_layout(job_id=1, manifest=manifest, output_dir=tmp_path, project_root=tmp_path)
    assert result.get("analyzed_at") is not None
    assert "T" in result["analyzed_at"]  # ISO 8601
