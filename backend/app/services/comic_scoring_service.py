"""
Fase I.C — Heurística de curadoria semi-automática para quadrinhos/mangá.

Gera sugestões de variante final com base em dados disponíveis nos
manifestos existentes (overlay, review, render, inpaint).

NÃO toma decisões finais. NÃO modifica arquivos originais.
Todas as sugestões são explicáveis e rastreáveis via campo `reasons`.

Heurísticas usadas (intencionalmente não "caixa preta"):
  - Existência da variante e seus erros/avisos
  - Cobertura de blocos revisados/aprovados (render_overlay)
  - Quantidade de regiões mascaradas vs. total de blocos (inpaint)
  - Gap de score entre top-2 variantes (determina review_required)
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Pesos da heurística (ajustáveis — documentados intencionalmente)
# ---------------------------------------------------------------------------

_BASE_ORIGINAL = 0.50
_BASE_RENDER   = 0.50
_BASE_INPAINT  = 0.45

_W_RENDER_NO_ERROR   = 0.20
_W_RENDER_NO_WARN    = 0.10
_W_REVIEW_COVERAGE   = 0.20   # proporcional a blocos revisados/aprovados

_W_INPAINT_NO_ERROR  = 0.20
_W_INPAINT_NO_WARN   = 0.10
_W_INPAINT_COVERAGE  = 0.15   # proporcional a masked_blocks / total_blocks

_REVIEW_REQUIRED_GAP       = 0.10   # gap < este → review_required
_REVIEW_REQUIRED_MIN_SCORE = 0.55   # best_score < este → review_required


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def compute_suggestion_manifest(
    overlay_data: dict,
    render_manifest: Optional[dict],
    inpaint_manifest: Optional[dict],
    final_manifest: Optional[dict],
    job_id: int,
) -> dict:
    """
    Computa um manifesto de sugestões para todas as páginas.

    Parâmetros:
        overlay_data    — conteúdo de comic_overlay.json
        render_manifest — conteúdo de comic_render.json (None se não computado)
        inpaint_manifest— conteúdo de comic_inpaint.json (None se não computado)
        final_manifest  — conteúdo de comic_final_manifest.json (None se não inicializado)
        job_id          — identificador do job

    Retorna:
        dict no formato SuggestionManifest
    """
    overlay_pages = {p["page_number"]: p for p in overlay_data.get("pages", [])}

    render_pages: dict = {}
    if render_manifest:
        for p in render_manifest.get("pages", []):
            render_pages[p["page_number"]] = p

    inpaint_pages: dict = {}
    if inpaint_manifest:
        for p in inpaint_manifest.get("pages", []):
            inpaint_pages[p["page_number"]] = p

    # Variantes disponíveis por página vêm do manifesto final (inicializado na I.B)
    final_pages: dict = {}
    if final_manifest:
        for p in final_manifest.get("pages", []):
            final_pages[p["page_number"]] = p

    suggestions = []
    for pn in sorted(overlay_pages.keys()):
        overlay_page  = overlay_pages.get(pn)
        render_page   = render_pages.get(pn)
        inpaint_page  = inpaint_pages.get(pn)
        final_page    = final_pages.get(pn)

        available = (
            final_page.get("available_variants", ["original"])
            if final_page
            else ["original"]
        )
        entry = _score_page(pn, overlay_page, render_page, inpaint_page, available)
        suggestions.append(entry)

    return {
        "job_id": job_id,
        "total_pages": len(suggestions),
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "pages": suggestions,
    }


def apply_suggestions_to_manifest(
    suggestion_manifest: dict,
    final_manifest: dict,
    only_undecided: bool = True,
    min_confidence: float = 0.0,
) -> tuple[dict, int]:
    """
    Aplica sugestões ao manifesto final.

    Parâmetros:
        suggestion_manifest — manifesto de sugestões computado
        final_manifest      — manifesto final atual (comic_final_manifest.json)
        only_undecided      — se True, apenas atualiza páginas com selection_source=="default"
        min_confidence      — pula sugestões abaixo deste threshold (0.0 = sem filtro)

    Retorna:
        (manifesto atualizado, quantidade de páginas alteradas)
    """
    updated = copy.deepcopy(final_manifest)
    suggestion_map = {p["page_number"]: p for p in suggestion_manifest.get("pages", [])}
    count = 0

    for page in updated.get("pages", []):
        pn = page["page_number"]
        suggestion = suggestion_map.get(pn)
        if not suggestion:
            continue

        if only_undecided and page.get("selection_source", "default") != "default":
            continue

        confidence = suggestion.get("confidence_score", 0.0)
        if confidence < min_confidence:
            continue

        suggested = suggestion.get("suggested_variant")
        available = page.get("available_variants", [])
        if suggested and suggested in available:
            page["selected_variant"] = suggested
            page["selection_source"] = "auto"
            page["updated_at"] = datetime.now(timezone.utc).isoformat()
            page["final_serve_path"] = None
            page["export_error"] = None
            count += 1

    updated["summary"] = _compute_summary(updated["pages"])
    return updated, count


def load_suggestion_manifest(path: Path) -> Optional[dict]:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_suggestion_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Heurísticas internas
# ---------------------------------------------------------------------------

def _score_page(
    page_number: int,
    overlay_page: Optional[dict],
    render_page: Optional[dict],
    inpaint_page: Optional[dict],
    available_variants: list[str],
) -> dict:
    scores: dict[str, float] = {}
    reasons_map: dict[str, list[str]] = {}

    for variant in available_variants:
        if variant == "original":
            s, r = _score_original(available_variants)
        elif variant == "render_overlay":
            s, r = _score_render(overlay_page, render_page)
        elif variant == "inpaint":
            total_blocks = _count_visible_blocks(overlay_page)
            s, r = _score_inpaint(inpaint_page, total_blocks)
        else:
            s, r = 0.0, [f"Variante desconhecida: {variant}"]
        scores[variant] = round(s, 3)
        reasons_map[variant] = r

    if not scores:
        return {
            "page_number": page_number,
            "available_variants": [],
            "scores": {},
            "suggested_variant": "original",
            "confidence_score": 0.0,
            "reasons": ["Nenhuma variante disponível"],
            "review_required": True,
        }

    suggested = max(scores, key=scores.__getitem__)
    confidence = scores[suggested]
    reasons = reasons_map[suggested]
    review_required = _needs_review(scores, render_page, inpaint_page, confidence)

    return {
        "page_number": page_number,
        "available_variants": available_variants,
        "scores": scores,
        "suggested_variant": suggested,
        "confidence_score": confidence,
        "reasons": reasons,
        "review_required": review_required,
    }


def _score_original(available_variants: list[str]) -> tuple[float, list[str]]:
    if len(available_variants) == 1:
        return 1.0, ["Única variante disponível"]
    return _BASE_ORIGINAL, ["Linha de base — arte original sem modificações"]


def _score_render(
    overlay_page: Optional[dict],
    render_page: Optional[dict],
) -> tuple[float, list[str]]:
    if render_page is None:
        return 0.0, ["Renderização não computada"]

    score = _BASE_RENDER
    reasons: list[str] = []

    if render_page.get("error"):
        score -= 0.25
        reasons.append(f"Erro de renderização: {render_page['error']}")
    else:
        score += _W_RENDER_NO_ERROR
        reasons.append("Renderização sem erros")

    warnings = render_page.get("warnings", [])
    if warnings:
        score -= 0.05 * min(len(warnings), 2)
        reasons.append(f"{len(warnings)} aviso(s) durante renderização")
    else:
        score += _W_RENDER_NO_WARN
        reasons.append("Renderização sem avisos")

    if overlay_page:
        blocks = overlay_page.get("blocks", [])
        visible = [b for b in blocks if b.get("overlay_visibility", True)]
        total = len(visible)
        if total > 0:
            reviewed = sum(
                1 for b in visible
                if b.get("review_status") in ("approved", "edited")
            )
            coverage = reviewed / total
            contribution = round(_W_REVIEW_COVERAGE * coverage, 3)
            score += contribution
            reasons.append(f"{reviewed}/{total} blocos revisados/aprovados")
        else:
            reasons.append("Nenhum bloco visível no overlay")

    return min(1.0, max(0.0, score)), reasons


def _score_inpaint(
    inpaint_page: Optional[dict],
    total_blocks: int,
) -> tuple[float, list[str]]:
    if inpaint_page is None:
        return 0.0, ["Inpainting não computado"]

    score = _BASE_INPAINT
    reasons: list[str] = []

    if inpaint_page.get("error"):
        score -= 0.30
        reasons.append(f"Erro de inpainting: {inpaint_page['error']}")
    else:
        score += _W_INPAINT_NO_ERROR
        reasons.append("Inpainting sem erros")

    warnings = inpaint_page.get("warnings", [])
    if warnings:
        score -= 0.05 * min(len(warnings), 2)
        reasons.append(f"{len(warnings)} aviso(s) durante inpainting")
    else:
        score += _W_INPAINT_NO_WARN
        reasons.append("Inpainting sem avisos")

    masked = inpaint_page.get("masked_blocks", 0)
    if total_blocks > 0:
        coverage = masked / total_blocks
        score += round(_W_INPAINT_COVERAGE * coverage, 3)
        reasons.append(f"{masked}/{total_blocks} blocos mascarados")
    elif masked > 0:
        score += _W_INPAINT_COVERAGE * 0.5
        reasons.append(f"{masked} blocos mascarados")
    else:
        reasons.append("Nenhum bloco mascarado")

    return min(1.0, max(0.0, score)), reasons


def _count_visible_blocks(overlay_page: Optional[dict]) -> int:
    if not overlay_page:
        return 0
    blocks = overlay_page.get("blocks", [])
    return sum(1 for b in blocks if b.get("overlay_visibility", True))


def _needs_review(
    scores: dict[str, float],
    render_page: Optional[dict],
    inpaint_page: Optional[dict],
    best_score: float,
) -> bool:
    if best_score < _REVIEW_REQUIRED_MIN_SCORE:
        return True

    sorted_vals = sorted(scores.values(), reverse=True)
    if len(sorted_vals) >= 2:
        if sorted_vals[0] - sorted_vals[1] < _REVIEW_REQUIRED_GAP:
            return True

    if render_page and render_page.get("error"):
        return True
    if inpaint_page and inpaint_page.get("error"):
        return True

    return False


def _compute_summary(pages: list[dict]) -> dict:
    summary: dict[str, int] = {"original": 0, "render_overlay": 0, "inpaint": 0}
    for p in pages:
        v = p.get("selected_variant", "original")
        if v in summary:
            summary[v] += 1
    return summary
