"""
Estabilização v1 — P3: Modo Recomendado (quick pipeline) para quadrinhos.

Orquestra no backend as etapas indispensáveis do pipeline visual, com defaults
seguros, reaproveitando os MESMOS serviços e manifests do fluxo manual —
trocar para o modo Avançado nunca perde trabalho.

Sequência (cada etapa é PULADA se o artefato já existe — retomável):
  1. Tradução por página (comic_translation.json)
  2. Revisão auto-aprovada (comic_review.json)         [consentida via preflight/UI]
  3. Overlay com defaults (comic_overlay.json + pages/)
  4. Render das páginas traduzidas (rendered_pages/)
  5. Curadoria: selected_variant='render_overlay' + export (final_pages/)

O quick pipeline NÃO exporta o EPUB final: o usuário confirma na tela
Exportar (prévia + metadados) — garantia de que o original nunca sai por engano.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any, Callable, Optional

# Defaults centralizados do preset base (documentados)
QUICK_DEFAULTS = {
    "selected_variant": "render_overlay",
    "selection_source": "auto",
    "auto_approve_review": True,
    "skip_steps": ["inpaint", "finish", "consistency"],
    "min_free_disk_mb": 200,
}


class QuickPipelineError(Exception):
    """Falha em uma etapa do quick pipeline (mensagem humana)."""


# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

def run_preflight(job: dict, output_dir: Path, cfg: dict) -> dict:
    """
    Valida os pré-requisitos do quick pipeline SEM efeitos colaterais.

    job: dict com input_path, input_format, source_language, target_language,
         translator_engine, comic_translation_enabled, comic_translation_status,
         active_operation.
    """
    checks: list[dict] = []

    def check(cid: str, ok: bool, detail: str, critical: bool = True) -> None:
        checks.append({"id": cid, "ok": ok, "detail": detail, "critical": critical})

    translation_enabled = bool(job.get("comic_translation_enabled"))
    src = job.get("source_language") or "por"
    tgt = job.get("target_language") or "eng"
    engine_name = job.get("translator_engine") or cfg.get(
        "translator_engine_default", "argos"
    ) or "argos"

    # 1. Arquivo de entrada
    input_path = job.get("input_path") or ""
    input_ok = bool(input_path) and Path(input_path).exists()
    check("input_file", input_ok,
          "Arquivo original presente." if input_ok
          else "Arquivo original não encontrado — reenvie o upload.")

    # 2. Páginas extraíveis (contagem real)
    page_count = 0
    if input_ok:
        try:
            from app.services.comic_translation_service import extract_comic_pages
            page_count = len(extract_comic_pages(input_path, job.get("input_format") or ""))
        except Exception as exc:
            check("pages", False, f"Não foi possível extrair páginas: {exc}")
        else:
            check("pages", page_count > 0,
                  f"{page_count} página(s) detectada(s)." if page_count
                  else "Nenhuma página encontrada no arquivo.")

    # 3. Tradução: engine + par + OCR
    if translation_enabled:
        already_translated = (output_dir / "comic_translation.json").exists() or (
            job.get("comic_translation_status") == "done"
        )
        if already_translated:
            check("engine", True, "Tradução já concluída — etapa será reaproveitada.")
            check("ocr", True, "OCR já executado nesta tradução.")
        else:
            engine_ok, engine_detail = _check_engine(engine_name, src, tgt, cfg)
            check("engine", engine_ok, engine_detail)
            ocr_ok = shutil.which("tesseract") is not None
            check("ocr", ocr_ok,
                  "Tesseract disponível para OCR das páginas." if ocr_ok
                  else "Tesseract não encontrado — necessário para ler o texto das páginas.")
    else:
        check("engine", True, "Tradução não solicitada — quick pipeline não se aplica; "
                              "use a conversão rápida via KCC.", critical=False)

    # 4. KCC (para o export final posterior)
    try:
        from app.services.kcc_service import get_kcc_status
        kcc_ok = bool(get_kcc_status().get("available"))
    except Exception:
        kcc_ok = False
    check("kcc", kcc_ok,
          "KCC disponível para gerar o EPUB final." if kcc_ok
          else "KCC (kcc-c2e) indisponível — o export final em EPUB ficará bloqueado.",
          critical=False)

    # 5. Espaço em disco
    try:
        free_mb = shutil.disk_usage(output_dir.parent if output_dir.parent.exists() else Path.cwd()).free // (1024 * 1024)
        disk_ok = free_mb >= QUICK_DEFAULTS["min_free_disk_mb"]
        check("disk", disk_ok, f"{free_mb} MB livres em disco.")
    except Exception:
        check("disk", True, "Espaço em disco não verificado.", critical=False)

    # 6. Operação ativa
    from app.services.progress_service import check_active_operation
    busy = check_active_operation(job.get("active_operation"), output_dir) == "busy"
    check("no_active_operation", not busy,
          "Nenhuma operação em andamento." if not busy
          else "Já existe uma operação em andamento — aguarde ou cancele.")

    # 7. Artefatos anteriores → plano de reaproveitamento
    steps_skip: list[str] = []
    if (output_dir / "comic_translation.json").exists():
        steps_skip.append("translation")
    if (output_dir / "comic_review.json").exists():
        steps_skip.append("review")
    if (output_dir / "comic_overlay.json").exists():
        steps_skip.append("overlay")
    if (output_dir / "comic_render.json").exists():
        steps_skip.append("render")

    all_steps = ["translation", "review", "overlay", "render", "finalize"]
    plan = {
        "translation_enabled": translation_enabled,
        "source_language": src,
        "target_language": tgt,
        "engine": engine_name,
        "steps_to_run": [s for s in all_steps if s not in steps_skip],
        "steps_reused": steps_skip,
        "steps_skipped_by_design": QUICK_DEFAULTS["skip_steps"],
        "auto_approve_review": QUICK_DEFAULTS["auto_approve_review"],
        "final_artifact": "final_pages/ (páginas com tradução visual) — "
                          "export EPUB confirmado por você na etapa Exportar",
        "page_count": page_count,
    }

    critical_ok = all(c["ok"] for c in checks if c["critical"])
    return {"ok": critical_ok, "checks": checks, "plan": plan}


def _check_engine(engine_name: str, src: str, tgt: str, cfg: dict) -> tuple[bool, str]:
    try:
        if engine_name == "nllb":
            from app.services.nllb_engine import NllbTranslatorEngine
            engine: Any = NllbTranslatorEngine(
                model_name=cfg.get("nllb_model_name", "facebook/nllb-200-distilled-600M"),
                device=cfg.get("nllb_device_preference") or None,
            )
        else:
            from app.services.translation_engine import ArgosTranslatorEngine
            engine = ArgosTranslatorEngine()
        if engine.is_pair_available(src, tgt):
            return True, f"Engine '{engine_name}' pronta para {src}→{tgt}."
        return False, (f"Par de idiomas {src}→{tgt} indisponível na engine "
                       f"'{engine_name}'. Instale o pacote/modelo correspondente.")
    except Exception as exc:
        return False, f"Engine '{engine_name}' indisponível: {exc}"


# ---------------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------------

def run_quick_pipeline(
    *,
    job_id: int,
    input_path: str,
    input_format: str,
    source_lang: str,
    target_lang: str,
    engine: Any,
    output_dir: Path,
    progress_callback: Optional[Callable[[str, int, Optional[int], Optional[str]], None]] = None,
) -> dict:
    """
    Executa as etapas indispensáveis. Cada etapa é pulada se o artefato já
    existe (retomável após cancelamento/interrupção). Retorna sumário.
    """
    def _report(stage: str, current: int, total: Optional[int], msg: str) -> None:
        if progress_callback:
            progress_callback(stage, current, total, msg)

    executed: list[str] = []
    reused: list[str] = []
    output_dir.mkdir(parents=True, exist_ok=True)

    # ── 1. Tradução ────────────────────────────────────────────────
    translation_path = output_dir / "comic_translation.json"
    if translation_path.exists():
        reused.append("translation")
    else:
        from app.services.comic_translation_service import run_comic_translation_pipeline
        _report("quick_pipeline", 0, 5, "Etapa 1/5 — Traduzindo páginas")
        run_comic_translation_pipeline(
            job_id=job_id,
            input_path=input_path,
            input_format=input_format,
            source_lang=source_lang,
            target_lang=target_lang,
            engine=engine,
            output_dir=output_dir,
            progress_callback=progress_callback,
        )
        executed.append("translation")

    # ── 2. Revisão auto-aprovada (consentida na UI) ────────────────
    review_path = output_dir / "comic_review.json"
    if review_path.exists():
        reused.append("review")
    else:
        from app.services.comic_review_service import initialize_review, save_review
        _report("quick_pipeline", 1, 5, "Etapa 2/5 — Aprovando blocos de tradução")
        review = initialize_review(translation_path)
        for page in review.get("pages", []):
            for block in page.get("blocks", []):
                if block.get("review_status") == "pending":
                    block["review_status"] = "approved"
        save_review(review_path, review)
        executed.append("review")

    # ── 3. Overlay com defaults ────────────────────────────────────
    overlay_path = output_dir / "comic_overlay.json"
    if overlay_path.exists():
        reused.append("overlay")
    else:
        from app.services.comic_overlay_service import initialize_overlay, save_overlay
        _report("quick_pipeline", 2, 5, "Etapa 3/5 — Posicionando overlays")
        overlay = initialize_overlay(
            review_path=review_path,
            input_path=input_path,
            input_format=input_format,
            output_dir=output_dir,
            job_id=job_id,
        )
        save_overlay(overlay_path, overlay)
        executed.append("overlay")

    # ── 4. Render ──────────────────────────────────────────────────
    from app.services.comic_overlay_service import load_overlay
    from app.services.comic_render_service import (
        export_rendered_cbz,
        export_rendered_zip,
        render_overlay_pages,
        save_render_manifest,
    )

    overlay_data = load_overlay(overlay_path)
    render_manifest_path = output_dir / "comic_render.json"
    if render_manifest_path.exists():
        reused.append("render")
    else:
        _report("quick_pipeline", 3, 5, "Etapa 4/5 — Renderizando páginas traduzidas")
        manifest = render_overlay_pages(
            overlay_data=overlay_data,
            pages_dir=output_dir / "pages",
            output_dir=output_dir,
            job_id=job_id,
        )
        if manifest.get("rendered_pages", 0) > 0:
            manifest["zip_path"] = export_rendered_zip(manifest, output_dir, job_id)
            manifest["cbz_path"] = export_rendered_cbz(manifest, output_dir, job_id)
        save_render_manifest(render_manifest_path, manifest)
        executed.append("render")

    # ── 5. Curadoria automática + export das páginas finais ────────
    from app.services.comic_finalize_service import (
        export_final_pages,
        initialize_final_manifest,
        save_final_manifest,
    )

    _report("quick_pipeline", 4, 5, "Etapa 5/5 — Exportando páginas finais")
    final_path = output_dir / "comic_final_manifest.json"
    rendered_dir = output_dir / "rendered_pages"
    final_manifest = initialize_final_manifest(
        overlay_data=overlay_data,
        pages_dir=output_dir / "pages",
        rendered_dir=rendered_dir,
        inpaint_dir=output_dir / "inpaint_pages",
        job_id=job_id,
    )
    selected = 0
    for page in final_manifest.get("pages", []):
        page_num = int(page.get("page_number", 0))
        if (rendered_dir / f"page_{page_num:03d}.png").exists():
            page["selected_variant"] = QUICK_DEFAULTS["selected_variant"]
            page["selection_source"] = QUICK_DEFAULTS["selection_source"]
            selected += 1
    if selected == 0:
        raise QuickPipelineError(
            "Nenhuma página renderizada com tradução ficou disponível para a "
            "curadoria. Verifique a etapa de render antes de exportar."
        )
    final_manifest = export_final_pages(
        manifest=final_manifest,
        pages_dir=output_dir / "pages",
        rendered_dir=rendered_dir,
        inpaint_dir=output_dir / "inpaint_pages",
        output_dir=output_dir,
        job_id=job_id,
    )
    save_final_manifest(final_path, final_manifest)
    executed.append("finalize")

    exported = int(final_manifest.get("exported_pages", 0))
    if exported == 0:
        raise QuickPipelineError(
            "A curadoria automática não exportou nenhuma página. "
            "Abra a Curadoria Final para inspecionar o problema."
        )

    _report("quick_pipeline", 5, 5, "Pipeline recomendado concluído")
    return {
        "executed": executed,
        "reused": reused,
        "pages_selected": selected,
        "pages_exported": exported,
        "next_step": "export",
    }
