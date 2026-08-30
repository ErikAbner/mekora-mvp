"""
Fase O — Consistência Visual Global entre páginas.

Analisa a distribuição de ajustes visuais (contrast, brightness, sharpness, saturation)
entre todas as páginas do comic_finish_manifest e gera sugestões de harmonização.

Sem IA. Sem modificação da arte original.

Algoritmo:
- Calcula ajuste efetivo de cada página (respeitando hierarquia override > preset > global)
- Detecção de outliers por cercas de Tukey (IQR) — explicável e robusto
- Estilo sugerido = mediana das páginas não-outlier por parâmetro
- Consistency score ∈ [0, 1] baseado no coeficiente de variação médio
- Harmonização: aplica suggested_global_style como adjustments_override
  (preserva páginas manual_override ou excluded_from_harmonization)
"""
from __future__ import annotations

import json
import statistics
from datetime import datetime, timezone
from pathlib import Path

_MANIFEST_NAME = "comic_consistency_manifest.json"
_ADJ_KEYS = ("contrast", "brightness", "sharpness", "saturation")

# Duplicado do finish_service para evitar import circular
_VISUAL_PRESETS: dict[str, dict[str, float]] = {
    "none":                  {"contrast": 1.0, "brightness": 1.0, "sharpness": 1.0, "saturation": 1.0},
    "clean_manga_bw":        {"contrast": 1.4, "brightness": 1.05, "sharpness": 1.6, "saturation": 0.0},
    "comic_caption_box":     {"contrast": 1.2, "brightness": 1.0,  "sharpness": 1.3, "saturation": 0.9},
    "soft_subtitle_box":     {"contrast": 1.1, "brightness": 1.05, "sharpness": 1.0, "saturation": 1.0},
    "high_contrast_overlay": {"contrast": 1.6, "brightness": 0.95, "sharpness": 1.8, "saturation": 0.7},
}


# ---------------------------------------------------------------------------
# I/O
# ---------------------------------------------------------------------------

def load_consistency_manifest(output_dir: Path) -> dict | None:
    """Carrega comic_consistency_manifest.json ou retorna None."""
    p = output_dir / _MANIFEST_NAME
    if not p.exists():
        return None
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def save_consistency_manifest(manifest: dict, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    p = output_dir / _MANIFEST_NAME
    with p.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Resolução de ajuste efetivo (espelha finish_service sem import circular)
# ---------------------------------------------------------------------------

def _effective_adj(finish_manifest: dict, page: dict) -> dict[str, float]:
    """Resolve o ajuste efetivo de uma página respeitando a hierarquia."""
    if page.get("adjustments_override") is not None:
        ao = page["adjustments_override"]
        return {k: float(ao.get(k, 1.0)) for k in _ADJ_KEYS}
    if page.get("preset_override") is not None:
        preset = _VISUAL_PRESETS.get(page["preset_override"], _VISUAL_PRESETS["none"])
        return dict(preset)
    ga = finish_manifest.get("global_adjustments", {})
    return {k: float(ga.get(k, 1.0)) for k in _ADJ_KEYS}


# ---------------------------------------------------------------------------
# Estatísticas
# ---------------------------------------------------------------------------

def _compute_distributions(adj_list: list[dict[str, float]]) -> dict[str, dict]:
    """
    Calcula mean/std/min/max por parâmetro de ajuste.
    Usa desvio padrão populacional (pstdev).
    """
    result: dict[str, dict] = {}
    for key in _ADJ_KEYS:
        values = [a[key] for a in adj_list]
        if not values:
            result[key] = {"mean": 1.0, "std": 0.0, "min": 1.0, "max": 1.0}
            continue
        mean = statistics.mean(values)
        std = statistics.pstdev(values) if len(values) > 1 else 0.0
        result[key] = {
            "mean": round(mean, 4),
            "std": round(std, 4),
            "min": round(min(values), 4),
            "max": round(max(values), 4),
        }
    return result


def _tukey_bounds(values: list[float]) -> tuple[float, float]:
    """
    Cercas de Tukey: Q1 - 1.5*IQR e Q3 + 1.5*IQR.
    Fallback para média ± 2σ quando N < 4 (IQR não é robusto).
    """
    n = len(values)
    if n < 2:
        return (-float("inf"), float("inf"))
    sv = sorted(values)
    if n < 4:
        std = statistics.pstdev(values)
        if std < 1e-9:
            return (-float("inf"), float("inf"))
        median = sv[n // 2]
        return (median - 2 * std, median + 2 * std)
    q1 = sv[n // 4]
    q3 = sv[(3 * n) // 4]
    iqr = q3 - q1
    if iqr < 1e-9:
        # IQR=0: valores concentrados no centro — usa mediana ± 2σ como fallback
        std = statistics.pstdev(values)
        if std < 1e-9:
            return (-float("inf"), float("inf"))  # idênticos → sem outliers
        median = sv[n // 2]
        return (median - 2 * std, median + 2 * std)
    return (q1 - 1.5 * iqr, q3 + 1.5 * iqr)


def _detect_outliers(
    adj_list: list[dict[str, float]],
    distributions: dict[str, dict],
) -> list[list[str]]:
    """
    Para cada página em adj_list, retorna lista de motivos de outlier.
    Resultado: reasons_per_page[i] para adj_list[i].
    """
    bounds: dict[str, tuple[float, float]] = {}
    for key in _ADJ_KEYS:
        values = [a[key] for a in adj_list]
        bounds[key] = _tukey_bounds(values)

    reasons_per_page: list[list[str]] = []
    for adj in adj_list:
        reasons: list[str] = []
        for key in _ADJ_KEYS:
            v = adj[key]
            lo, hi = bounds[key]
            dist = distributions[key]
            if v < lo or v > hi:
                reasons.append(
                    f"{key}={v:.2f} fora do intervalo esperado "
                    f"[{lo:.2f}, {hi:.2f}] (média={dist['mean']:.2f})"
                )
        reasons_per_page.append(reasons)
    return reasons_per_page


def _median_of(values: list[float]) -> float:
    if not values:
        return 1.0
    sv = sorted(values)
    n = len(sv)
    return sv[n // 2] if n % 2 == 1 else (sv[n // 2 - 1] + sv[n // 2]) / 2


def _suggested_style(
    adj_list: list[dict[str, float]],
    reasons_per_page: list[list[str]],
) -> dict[str, float]:
    """
    Mediana dos parâmetros das páginas NÃO-outlier.
    Fallback: mediana de todas as páginas se todas forem outlier.
    """
    non_outlier = [adj for adj, r in zip(adj_list, reasons_per_page) if not r]
    source = non_outlier if non_outlier else adj_list
    return {
        key: round(_median_of([a[key] for a in source]), 3)
        for key in _ADJ_KEYS
    }


def _consistency_score(distributions: dict[str, dict]) -> float:
    """
    Score 0.0 (inconsistente) a 1.0 (consistente).
    Baseado no coeficiente de variação (std/mean) médio dos 4 parâmetros.
    CV=0 → score=1.0, CV≥0.5 → score=0.0.
    """
    cvs: list[float] = []
    for key in _ADJ_KEYS:
        d = distributions[key]
        mean = d["mean"]
        std = d["std"]
        cv = (std / mean) if mean > 0.01 else std
        cvs.append(cv)
    if not cvs:
        return 1.0
    avg_cv = sum(cvs) / len(cvs)
    return round(max(0.0, min(1.0, 1.0 - avg_cv * 2)), 3)


def _build_recommendations(
    distributions: dict[str, dict],
    reasons_per_page: list[list[str]],
    score: float,
    finish_manifest: dict,
) -> list[str]:
    recs: list[str] = []

    for key in _ADJ_KEYS:
        d = distributions[key]
        mean = d["mean"]
        std = d["std"]
        cv = (std / mean) if mean > 0.01 else std
        if cv > 0.2:
            recs.append(
                f"{key.capitalize()} com alta variação "
                f"(DP={std:.2f}, intervalo [{d['min']:.2f}–{d['max']:.2f}]): "
                "considere normalizar."
            )

    n_outliers = sum(1 for r in reasons_per_page if r)
    if n_outliers:
        recs.append(f"{n_outliers} página(s) com valores atípicos detectadas.")

    if score >= 0.9:
        recs.append("Consistência visual excelente — nenhuma ação necessária.")
    elif score >= 0.7:
        recs.append("Consistência visual boa — harmonização opcional.")
    else:
        recs.append("Consistência visual baixa — recomenda-se harmonização global.")

    presets = [
        p.get("preset_override") or finish_manifest.get("global_preset", "none")
        for p in finish_manifest.get("pages", [])
    ]
    unique_presets = set(presets)
    if len(unique_presets) > 2:
        recs.append(
            f"Múltiplos presets em uso ({len(unique_presets)}): "
            "considere padronizar para maior coesão visual."
        )

    return recs


def _preset_frequency(finish_manifest: dict) -> dict[str, int]:
    freq: dict[str, int] = {}
    global_preset = finish_manifest.get("global_preset", "none")
    for page in finish_manifest.get("pages", []):
        preset = page.get("preset_override") or global_preset
        freq[preset] = freq.get(preset, 0) + 1
    return freq


# ---------------------------------------------------------------------------
# Análise principal
# ---------------------------------------------------------------------------

def analyze_consistency(
    job_id: int,
    finish_manifest: dict,
    output_dir: Path,
    existing_manifest: dict | None = None,
) -> dict:
    """
    Analisa a consistência visual entre páginas do finish_manifest.

    - Preserva flags manuais (is_manual_override, excluded_from_harmonization,
      harmonization_applied) de existing_manifest se fornecido.
    - Salva e retorna comic_consistency_manifest.json.
    """
    pages = finish_manifest.get("pages", [])
    n = len(pages)

    if n == 0:
        empty: dict = {
            "job_id": job_id,
            "analyzed_at": _now_iso(),
            "consistency_score": 1.0,
            "page_count": 0,
            "stat_distributions": {},
            "preset_frequency": {},
            "suggested_global_style": None,
            "global_recommendations": ["Nenhuma página disponível para análise."],
            "pages": [],
            "warnings": [],
            "harmonization_applied_at": None,
        }
        save_consistency_manifest(empty, output_dir)
        return empty

    adj_list = [_effective_adj(finish_manifest, p) for p in pages]
    distributions = _compute_distributions(adj_list)
    reasons_per_page = _detect_outliers(adj_list, distributions)
    suggested = _suggested_style(adj_list, reasons_per_page)
    score = _consistency_score(distributions)
    recs = _build_recommendations(distributions, reasons_per_page, score, finish_manifest)
    freq = _preset_frequency(finish_manifest)

    # Preservar flags manuais do manifesto existente
    existing_pages: dict[int, dict] = {}
    if existing_manifest:
        for ep in existing_manifest.get("pages", []):
            existing_pages[ep["page_number"]] = ep

    page_entries: list[dict] = []
    for page, adj, reasons in zip(pages, adj_list, reasons_per_page):
        pn = page["page_number"]
        existing = existing_pages.get(pn, {})
        page_entries.append({
            "page_number": pn,
            "effective_adjustments": {k: round(adj[k], 3) for k in _ADJ_KEYS},
            "is_outlier": bool(reasons),
            "outlier_reasons": reasons,
            "is_manual_override": existing.get("is_manual_override", False),
            "excluded_from_harmonization": existing.get("excluded_from_harmonization", False),
            "harmonization_applied": existing.get("harmonization_applied", False),
        })

    manifest: dict = {
        "job_id": job_id,
        "analyzed_at": _now_iso(),
        "consistency_score": score,
        "page_count": n,
        "stat_distributions": distributions,
        "preset_frequency": freq,
        "suggested_global_style": suggested,
        "global_recommendations": recs,
        "pages": page_entries,
        "warnings": [],
        "harmonization_applied_at": (
            existing_manifest.get("harmonization_applied_at")
            if existing_manifest
            else None
        ),
    }
    save_consistency_manifest(manifest, output_dir)
    return manifest


# ---------------------------------------------------------------------------
# Harmonização
# ---------------------------------------------------------------------------

def apply_harmonization(
    job_id: int,
    consistency_manifest: dict,
    finish_manifest: dict,
    output_dir: Path,
    mode: str = "apply",
) -> tuple[dict, dict]:
    """
    Aplica (mode='apply') ou desfaz (mode='reset') harmonização visual.

    apply:
      Para cada página não marcada como manual_override nem excluded_from_harmonization,
      define adjustments_override = suggested_global_style no finish_manifest.
      Marca harmonization_applied=True no consistency_manifest.

    reset:
      Para cada página onde harmonization_applied=True,
      remove adjustments_override (None) do finish_manifest.
      Marca harmonization_applied=False.

    Salva ambos os manifestos. Retorna (cm_atualizado, fm_atualizado).
    """
    import copy

    cm = copy.deepcopy(consistency_manifest)
    fm = copy.deepcopy(finish_manifest)

    suggested = cm.get("suggested_global_style")
    if not suggested and mode == "apply":
        cm.setdefault("warnings", []).append(
            "suggested_global_style ausente — execute /analyze primeiro."
        )
        return cm, fm

    cm_by_pn: dict[int, dict] = {p["page_number"]: p for p in cm.get("pages", [])}
    fm_by_pn: dict[int, dict] = {p["page_number"]: p for p in fm.get("pages", [])}

    for pn, fp in fm_by_pn.items():
        cp = cm_by_pn.get(pn, {})
        if mode == "apply":
            if not cp.get("is_manual_override") and not cp.get("excluded_from_harmonization"):
                fp["adjustments_override"] = dict(suggested)
                if pn in cm_by_pn:
                    cm_by_pn[pn]["harmonization_applied"] = True
        elif mode == "reset":
            if cp.get("harmonization_applied"):
                fp["adjustments_override"] = None
                if pn in cm_by_pn:
                    cm_by_pn[pn]["harmonization_applied"] = False

    cm["pages"] = list(cm_by_pn.values())
    fm["pages"] = list(fm_by_pn.values())

    if mode == "apply":
        cm["harmonization_applied_at"] = _now_iso()
    elif mode == "reset":
        cm["harmonization_applied_at"] = None

    save_consistency_manifest(cm, output_dir)
    # Importação tardia para evitar circular (consistency importa finish)
    from app.services.comic_finish_service import save_finish_manifest
    save_finish_manifest(fm, output_dir)

    return cm, fm


# ---------------------------------------------------------------------------
# Patch por página
# ---------------------------------------------------------------------------

def patch_consistency_page(
    job_id: int,
    consistency_manifest: dict,
    page_number: int,
    patch: dict,
    output_dir: Path,
) -> dict:
    """
    Atualiza flags de uma página específica:
      is_manual_override, excluded_from_harmonization.
    """
    import copy

    cm = copy.deepcopy(consistency_manifest)
    found = False
    for page in cm.get("pages", []):
        if page["page_number"] == page_number:
            if "is_manual_override" in patch and patch["is_manual_override"] is not None:
                page["is_manual_override"] = bool(patch["is_manual_override"])
            if "excluded_from_harmonization" in patch and patch["excluded_from_harmonization"] is not None:
                page["excluded_from_harmonization"] = bool(patch["excluded_from_harmonization"])
            found = True
            break
    if not found:
        cm.setdefault("warnings", []).append(
            f"Página {page_number} não encontrada na análise de consistência."
        )
    save_consistency_manifest(cm, output_dir)
    return cm


# ---------------------------------------------------------------------------
# Fase P.A — Análise visual baseada em imagem real
# ---------------------------------------------------------------------------

def analyze_visual_consistency(
    job_id: int,
    consistency_manifest: dict,
    finish_manifest: dict,
    output_dir: Path,
    project_root: Path,
) -> dict:
    """
    Enriquece o manifesto de consistência com métricas extraídas das imagens reais.

    Para cada página:
    - Prioriza finished_path (página exportada); fallback para source_path.
    - Extrai métricas de luminância/contraste/entropia via Pillow.
    - Detecta outliers visuais (mesma abordagem Tukey do score paramétrico).
    - Gera preview JPEG lado a lado (antes|depois) em consistency_previews/.

    Campos adicionados ao manifesto:
    - Por página: image_metrics, is_visual_outlier, visual_outlier_reasons, preview_path
    - Global: consistency_score_visual, consistency_score_combined,
              visual_analyzed_at, preview_generated_at

    Não modifica arte original, render_overlay, inpaint, final_pages.
    Tolera imagens ausentes (warning por página, sem abortar).
    """
    import copy
    from app.services import comic_image_metrics_service as img_svc

    cm = copy.deepcopy(consistency_manifest)
    fm_pages = {p["page_number"]: p for p in finish_manifest.get("pages", [])}

    previews_dir = output_dir / "consistency_previews"
    previews_dir.mkdir(parents=True, exist_ok=True)

    # Coletar métricas por página
    page_pn_metrics: list[tuple[int, dict]] = []

    for page in cm.get("pages", []):
        pn = page["page_number"]
        fp = fm_pages.get(pn, {})

        # Inicializar campos P.A
        page["image_metrics"] = None
        page["is_visual_outlier"] = False
        page["visual_outlier_reasons"] = []
        page["preview_path"] = None

        # Resolver imagem para análise: finished_path preferred, source_path fallback
        analyze_serve = fp.get("finished_path") or fp.get("source_path")
        analyze_local = _serve_to_local(analyze_serve, project_root) if analyze_serve else None

        if analyze_local and analyze_local.exists():
            metrics = img_svc.extract_image_metrics(analyze_local)
            if metrics:
                page["image_metrics"] = metrics
                page_pn_metrics.append((pn, metrics))
        elif analyze_serve:
            cm.setdefault("warnings", []).append(
                f"Imagem para análise visual da página {pn} não encontrada: {analyze_serve}"
            )

        # Preview antes|depois (só gera quando ambos os paths existem)
        source_serve = fp.get("source_path")
        finished_serve = fp.get("finished_path")
        if source_serve and finished_serve:
            source_local = _serve_to_local(source_serve, project_root)
            finished_local = _serve_to_local(finished_serve, project_root)
            preview_name = f"page_{pn:03d}_preview.jpg"
            preview_dest = previews_dir / preview_name
            if img_svc.generate_preview(source_local, finished_local, preview_dest):
                page["preview_path"] = (
                    f"/storage/output/{job_id}/consistency_previews/{preview_name}"
                )

    # Detecção de outliers visuais
    if len(page_pn_metrics) >= 2:
        all_metrics = [m for _, m in page_pn_metrics]
        reasons_list = img_svc.detect_visual_outliers(all_metrics)
        pn_set = {pn: reasons for (pn, _), reasons in zip(page_pn_metrics, reasons_list)}
        for page in cm["pages"]:
            reasons = pn_set.get(page["page_number"], [])
            page["is_visual_outlier"] = bool(reasons)
            page["visual_outlier_reasons"] = reasons

    # Scores visuais e combinado
    if page_pn_metrics:
        all_metrics = [m for _, m in page_pn_metrics]
        score_v = img_svc.visual_consistency_score(all_metrics)
        cm["consistency_score_visual"] = score_v
        score_p = cm.get("consistency_score", 0.0)
        cm["consistency_score_combined"] = round(0.5 * score_p + 0.5 * score_v, 3)
    else:
        cm["consistency_score_visual"] = None
        cm["consistency_score_combined"] = cm.get("consistency_score")

    cm["visual_analyzed_at"] = _now_iso()
    has_previews = any(p.get("preview_path") for p in cm.get("pages", []))
    cm["preview_generated_at"] = _now_iso() if has_previews else None

    save_consistency_manifest(cm, output_dir)
    return cm


def _serve_to_local(serve_path: str, project_root: Path) -> Path:
    """Converte '/storage/output/...' em path local absoluto."""
    return project_root / serve_path.lstrip("/")


# ---------------------------------------------------------------------------
# Utilitário
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()
