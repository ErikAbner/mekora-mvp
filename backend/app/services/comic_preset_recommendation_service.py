"""
Fase P.B — Recomendação de preset assistida por heurística explicável.

Lê o ConsistencyManifest (Fase O + P.A) e o FinishManifest (Fase N.A) e
sugere o melhor preset de ajuste visual (contrast/brightness/sharpness/saturation)
para o job, com motivos e alternativas.

Sem IA. Sem modificação de originais. Completamente reversível.

Saída: comic_preset_recommendation_manifest.json por job.
"""
from __future__ import annotations

import copy
import json
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_MANIFEST_FILE = "comic_preset_recommendation_manifest.json"
_PREVIEWS_DIR = "preset_previews"

# Todos os presets disponíveis (espelho de comic_finish_service._VISUAL_PRESETS)
# Duplicado aqui para evitar import circular
_PRESET_ADJ: dict[str, dict[str, float]] = {
    "none":                   {"contrast": 1.0,  "brightness": 1.0,  "sharpness": 1.0,  "saturation": 1.0},
    "clean_manga_bw":         {"contrast": 1.4,  "brightness": 1.05, "sharpness": 1.6,  "saturation": 0.0},
    "manga_bw_high_contrast": {"contrast": 1.7,  "brightness": 1.0,  "sharpness": 1.8,  "saturation": 0.0},
    "comic_caption_box":      {"contrast": 1.2,  "brightness": 1.0,  "sharpness": 1.3,  "saturation": 0.9},
    "soft_subtitle_box":      {"contrast": 1.1,  "brightness": 1.05, "sharpness": 1.0,  "saturation": 1.0},
    "high_contrast_overlay":  {"contrast": 1.6,  "brightness": 0.95, "sharpness": 1.8,  "saturation": 0.7},
    "subtitle_minimal":       {"contrast": 1.05, "brightness": 1.02, "sharpness": 1.1,  "saturation": 1.0},
    "dense_text_compact":     {"contrast": 1.3,  "brightness": 1.0,  "sharpness": 1.5,  "saturation": 0.85},
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# I/O
# ---------------------------------------------------------------------------

def load_recommendation(output_dir: Path) -> dict | None:
    p = output_dir / _MANIFEST_FILE
    if not p.exists():
        return None
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def save_recommendation(output_dir: Path, rec: dict) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    p = output_dir / _MANIFEST_FILE
    with p.open("w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Heurística explicável (função pura — testável isoladamente)
# ---------------------------------------------------------------------------

def _score_preset(
    consistency_manifest: dict,
) -> tuple[str, list[str], float, list[str]]:
    """
    Retorna (recommended_preset, reasons, confidence_score, alternatives).

    Regras em ordem decrescente de prioridade:
    1. saturation_mean < 0.15              → clean_manga_bw       (0.85)
    2. saturation_mean < 0.3
       AND rms_contrast_mean < 30          → manga_bw_high_contrast (0.75)
    3. consistency_score_combined < 0.6
       AND contrast_std > 0.15             → high_contrast_overlay (0.70)
    4. light_fraction_mean > 0.6
       AND rms_contrast_mean < 25          → comic_caption_box     (0.65)
    5. dark_fraction_mean > 0.4            → dense_text_compact    (0.60)
    6. fallback                            → soft_subtitle_box     (0.45)
    """
    dist = consistency_manifest.get("stat_distributions", {})
    pages = consistency_manifest.get("pages", [])
    score_combined = consistency_manifest.get("consistency_score_combined")
    score_param = consistency_manifest.get("consistency_score", 0.0)

    # Métricas paramétricas
    sat_mean: float | None = dist.get("saturation", {}).get("mean")
    contrast_std: float | None = dist.get("contrast", {}).get("std")

    # Métricas visuais (Fase P.A) — agregadas manualmente se disponíveis
    visual_metrics = [p["image_metrics"] for p in pages if p.get("image_metrics")]
    rms_contrast_mean: float | None = None
    light_fraction_mean: float | None = None
    dark_fraction_mean: float | None = None
    if visual_metrics:
        rms_contrast_mean = statistics.mean(m["rms_contrast"] for m in visual_metrics)
        light_fraction_mean = statistics.mean(m["light_fraction"] for m in visual_metrics)
        dark_fraction_mean = statistics.mean(m["dark_fraction"] for m in visual_metrics)

    reasons: list[str] = []
    alternatives: list[str] = []

    # Regra 1 — manga/PB por saturação muito baixa
    if sat_mean is not None and sat_mean < 0.15:
        reasons.append(f"saturação média={sat_mean:.2f} < 0.15 (provável manga ou HQ em preto-e-branco)")
        alternatives = ["manga_bw_high_contrast", "subtitle_minimal"]
        return "clean_manga_bw", reasons, 0.85, alternatives

    # Regra 2 — manga/PB com contraste visual baixo → versão mais agressiva
    if sat_mean is not None and sat_mean < 0.3:
        if rms_contrast_mean is not None and rms_contrast_mean < 30:
            reasons.append(f"saturação média={sat_mean:.2f} < 0.30 (tonalidade neutra)")
            reasons.append(f"contraste RMS médio={rms_contrast_mean:.1f} < 30 (páginas opacas)")
            alternatives = ["clean_manga_bw", "high_contrast_overlay"]
            return "manga_bw_high_contrast", reasons, 0.75, alternatives
        elif sat_mean < 0.3:
            # Sem métricas visuais, mas saturação ainda baixa → clean_manga_bw de menor confiança
            reasons.append(f"saturação média={sat_mean:.2f} < 0.30 (provável conteúdo PB)")
            alternatives = ["manga_bw_high_contrast", "subtitle_minimal"]
            return "clean_manga_bw", reasons, 0.65, alternatives

    # Regra 3 — consistência combinada baixa E contraste paramétrico variável
    combined = score_combined if score_combined is not None else score_param
    if combined < 0.6 and contrast_std is not None and contrast_std > 0.15:
        reasons.append(f"score de consistência={combined:.2f} < 0.60 (páginas pouco uniformes)")
        reasons.append(f"desvio de contraste={contrast_std:.2f} > 0.15 (variação alta entre páginas)")
        alternatives = ["dense_text_compact", "comic_caption_box"]
        return "high_contrast_overlay", reasons, 0.70, alternatives

    # Regra 4 — páginas claras e baixo contraste → estilo de legenda leve
    if light_fraction_mean is not None and light_fraction_mean > 0.6:
        if rms_contrast_mean is not None and rms_contrast_mean < 25:
            reasons.append(f"fração clara média={light_fraction_mean:.2f} > 0.60 (páginas predominantemente claras)")
            reasons.append(f"contraste RMS médio={rms_contrast_mean:.1f} < 25 (baixo contraste visual)")
            alternatives = ["soft_subtitle_box", "subtitle_minimal"]
            return "comic_caption_box", reasons, 0.65, alternatives

    # Regra 5 — páginas escuras
    if dark_fraction_mean is not None and dark_fraction_mean > 0.4:
        reasons.append(f"fração escura média={dark_fraction_mean:.2f} > 0.40 (páginas predominantemente escuras)")
        alternatives = ["high_contrast_overlay", "manga_bw_high_contrast"]
        return "dense_text_compact", reasons, 0.60, alternatives

    # Fallback
    reasons.append("perfil visual equilibrado — preset suave aplicado como padrão")
    if sat_mean is not None:
        reasons.append(f"saturação média={sat_mean:.2f} (cores presentes, sem predominância extrema)")
    alternatives = ["comic_caption_box", "subtitle_minimal"]
    return "soft_subtitle_box", reasons, 0.45, alternatives


# ---------------------------------------------------------------------------
# Recomendação
# ---------------------------------------------------------------------------

def recommend_preset(
    job_id: int,
    consistency_manifest: dict,
    finish_manifest: dict,
    output_dir: Path,
    existing_rec: dict | None = None,
) -> dict:
    """
    Gera ou atualiza o manifesto de recomendação de preset.
    Preserva applied_preset de uma recomendação anterior.
    """
    recommended, reasons, confidence, alternatives = _score_preset(consistency_manifest)

    # Identificar páginas com override manual (exceções)
    exceptions: list[dict] = []
    manual_present = False
    for page in consistency_manifest.get("pages", []):
        if page.get("is_manual_override"):
            manual_present = True
            exceptions.append({
                "page_number": page["page_number"],
                "reason": "is_manual_override=true — não será afetada pela aplicação global",
            })

    rec: dict[str, Any] = {
        "job_id": job_id,
        "recommended_preset": recommended,
        "alternatives": alternatives,
        "reasons": reasons,
        "confidence_score": confidence,
        "page_level_exceptions": exceptions,
        "manual_overrides_present": manual_present,
        "recommended_at": _now_iso(),
        # Preservar estado de aplicação anterior
        "applied_preset": existing_rec.get("applied_preset") if existing_rec else None,
        "applied_at": existing_rec.get("applied_at") if existing_rec else None,
        "preview_entries": existing_rec.get("preview_entries", []) if existing_rec else [],
    }
    save_recommendation(output_dir, rec)
    return rec


# ---------------------------------------------------------------------------
# Aplicação do preset
# ---------------------------------------------------------------------------

def apply_preset_recommendation(
    job_id: int,
    recommendation: dict,
    finish_manifest: dict,
    consistency_manifest: dict,
    output_dir: Path,
    preset: str,
    mode: str,
    target_pages: list[int] | None = None,
) -> tuple[dict, dict]:
    """
    Retorna (updated_recommendation, updated_finish_manifest).

    Modos:
    - apply_to_all_eligible  → seta global_preset no FinishManifest
      (páginas com adjustments_override já têm prioridade pela hierarquia)
    - apply_to_filtered      → seta preset_override apenas em target_pages
      (páginas com adjustments_override são ignoradas)
    - reset_to_previous      → reverte global_preset para "none",
      limpa preset_override nas páginas sem adjustments_override
    """
    fm = copy.deepcopy(finish_manifest)
    rec = copy.deepcopy(recommendation)

    # Páginas com is_manual_override no ConsistencyManifest (apenas informativo)
    manual_pages = {
        p["page_number"]
        for p in consistency_manifest.get("pages", [])
        if p.get("is_manual_override")
    }

    if mode == "reset_to_previous":
        fm["global_preset"] = "none"
        # Limpa preset_override nas páginas que não têm adjustments_override
        for page in fm.get("pages", []):
            if page.get("adjustments_override") is None:
                page["preset_override"] = None
        rec["applied_preset"] = None
        rec["applied_at"] = None

    elif mode == "apply_to_all_eligible":
        fm["global_preset"] = preset
        # Registra exceções informativas (manual overrides — hierarquia já os protege
        # via adjustments_override; este passo é apenas para rastreabilidade)
        rec["page_level_exceptions"] = [
            {"page_number": pn, "reason": "is_manual_override=true — preservada pela hierarquia"}
            for pn in sorted(manual_pages)
        ]
        rec["applied_preset"] = preset
        rec["applied_at"] = _now_iso()

    elif mode == "apply_to_filtered":
        targets = set(target_pages or [])
        for page in fm.get("pages", []):
            if page["page_number"] in targets and page.get("adjustments_override") is None:
                page["preset_override"] = preset
        rec["applied_preset"] = preset
        rec["applied_at"] = _now_iso()

    else:
        raise ValueError(f"mode inválido: {mode!r}")

    save_recommendation(output_dir, rec)
    return rec, fm


# ---------------------------------------------------------------------------
# Preview de preset
# ---------------------------------------------------------------------------

def _serve_to_local(serve_path: str, project_root: Path) -> Path:
    return project_root / serve_path.lstrip("/")


def _apply_adjustments_to_image(img: Any, adj: dict[str, float]) -> Any:
    """Aplica ajustes PIL ImageEnhance (sem modificar o original)."""
    try:
        from PIL import ImageEnhance
    except ImportError:  # pragma: no cover
        return img
    img = ImageEnhance.Contrast(img).enhance(adj.get("contrast", 1.0))
    img = ImageEnhance.Brightness(img).enhance(adj.get("brightness", 1.0))
    img = ImageEnhance.Sharpness(img).enhance(adj.get("sharpness", 1.0))
    img = ImageEnhance.Color(img).enhance(adj.get("saturation", 1.0))
    return img


def generate_preset_previews(
    job_id: int,
    finish_manifest: dict,
    preset_name: str,
    output_dir: Path,
    project_root: Path,
    sample_size: int = 3,
) -> list[dict]:
    """
    Gera thumbnails side-by-side (antes|depois) para páginas representativas.
    Retorna lista de {page_number, preview_path}.
    Tolerante a falhas: pula páginas sem source_path ou com erros de I/O.
    """
    try:
        from PIL import Image
    except ImportError:  # pragma: no cover
        return []

    from app.services import comic_image_metrics_service as img_svc

    adj = _PRESET_ADJ.get(preset_name, _PRESET_ADJ["none"])
    pages = finish_manifest.get("pages", [])
    if not pages:
        return []

    # Selecionar páginas representativas: início, meio, fim
    indices = _sample_indices(len(pages), sample_size)
    samples = [pages[i] for i in indices]

    previews_dir = output_dir / _PREVIEWS_DIR / preset_name
    previews_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict] = []
    for page in samples:
        page_num = page["page_number"]
        src_serve = page.get("source_path") or page.get("finished_path")
        if not src_serve:
            continue

        src_local = _serve_to_local(src_serve, project_root)
        if not src_local.exists():
            continue

        try:
            before_img = Image.open(src_local).convert("RGB")
            after_img = _apply_adjustments_to_image(before_img.copy(), adj)

            # Salvar imagem "after" temporária
            after_tmp = previews_dir / f"page_{page_num:03d}_after_tmp.jpg"
            after_img.save(str(after_tmp), "JPEG", quality=80)

            # Gerar side-by-side
            dest = previews_dir / f"page_{page_num:03d}_preview.jpg"
            ok = img_svc.generate_preview(src_local, after_tmp, dest)

            # Limpar temporário
            try:
                after_tmp.unlink()
            except OSError:
                pass

            if ok:
                serve_path = f"/storage/output/{job_id}/preset_previews/{preset_name}/page_{page_num:03d}_preview.jpg"
                results.append({"page_number": page_num, "preview_path": serve_path})
        except Exception:
            pass  # Tolerante — continua demais páginas

    return results


def _sample_indices(total: int, sample_size: int) -> list[int]:
    """Seleciona índices representativos: início, meio(s), fim."""
    if total == 0:
        return []
    if total <= sample_size:
        return list(range(total))
    if sample_size == 1:
        return [0]
    if sample_size == 2:
        return [0, total - 1]
    # início, meio(s), fim
    result = [0]
    step = (total - 1) / (sample_size - 1)
    for i in range(1, sample_size - 1):
        result.append(round(i * step))
    result.append(total - 1)
    # Deduplicar mantendo ordem
    seen: set[int] = set()
    out: list[int] = []
    for idx in result:
        if idx not in seen:
            seen.add(idx)
            out.append(idx)
    return out
