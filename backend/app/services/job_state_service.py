"""
Fase Q — Validação centralizada de estado do job e reparação leve.

Funções puras: não acessam banco de dados, apenas o sistema de arquivos
e o dict de estado do job. Seguras para testar isoladamente.
"""
from __future__ import annotations

import json
from pathlib import Path

# ---------------------------------------------------------------------------
# Manifestos conhecidos — mapeados pelo "tipo" do pipeline
# ---------------------------------------------------------------------------

_MANIFEST_FILES: dict[str, str] = {
    "comic_overlay":    "comic_overlay.json",
    "comic_render":     "comic_render.json",
    "comic_inpaint":    "comic_inpaint.json",
    "comic_finalize":   "comic_final_manifest.json",
    "comic_suggestion": "comic_suggestion_manifest.json",
    "comic_finish":     "comic_finish_manifest.json",
    "comic_consistency":"comic_consistency_manifest.json",
    "comic_preset_rec": "comic_preset_recommendation_manifest.json",
}

_DOCUMENT_MANIFESTS: set[str] = set()  # nenhum manifesto JSON no pipeline de documento

# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------


def _is_valid_json(path: Path) -> bool:
    """Retorna True se o arquivo existe e é JSON válido."""
    if not path.exists():
        return False
    try:
        json.loads(path.read_text(encoding="utf-8"))
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# get_job_health
# ---------------------------------------------------------------------------


def get_job_health(job: dict, output_dir: Path) -> dict:
    """
    Analisa a saúde de um job.

    Parâmetros
    ----------
    job : dict
        Estado do job (pode ser job.__dict__ de um ORM, ou dict puro para testes).
    output_dir : Path
        Diretório de saída do job (storage/output/{job_id}).

    Retorna
    -------
    dict com:
      - is_healthy: bool
      - checks: list[dict]   cada item: {name, ok, detail}
      - manifests_present: list[str]
      - manifests_missing: list[str]
      - recommended_next_action: str
    """
    checks: list[dict] = []
    manifests_present: list[str] = []
    manifests_missing: list[str] = []

    # ------------------------------------------------------------------
    # 1. Status do job
    # ------------------------------------------------------------------
    status = job.get("status", "")
    if status == "error":
        checks.append({
            "name": "Status do job",
            "ok": False,
            "detail": f"Job com status de erro.",
        })
    else:
        checks.append({
            "name": "Status do job",
            "ok": True,
            "detail": f"Status: {status}",
        })

    # ------------------------------------------------------------------
    # 2. Arquivo original presente
    # ------------------------------------------------------------------
    input_path_str = job.get("input_path") or ""
    if input_path_str:
        input_path = Path(input_path_str)
        if input_path.exists():
            checks.append({"name": "Arquivo original presente", "ok": True, "detail": input_path.name})
        else:
            checks.append({
                "name": "Arquivo original presente",
                "ok": False,
                "detail": f"Não encontrado: {input_path_str}",
            })
    else:
        checks.append({"name": "Arquivo original presente", "ok": False, "detail": "input_path não definido"})

    # ------------------------------------------------------------------
    # 3. Manifestos (apenas para jobs comic)
    # ------------------------------------------------------------------
    processing_mode = job.get("processing_mode", "document")

    if processing_mode == "comic" and output_dir.exists():
        for key, filename in _MANIFEST_FILES.items():
            manifest_path = output_dir / filename
            if manifest_path.exists():
                manifests_present.append(filename)
                if _is_valid_json(manifest_path):
                    checks.append({"name": f"Manifesto {filename}", "ok": True, "detail": "válido"})
                else:
                    checks.append({
                        "name": f"Manifesto {filename}",
                        "ok": False,
                        "detail": "arquivo existe mas JSON inválido",
                    })
                    manifests_missing.append(filename)  # JSON inválido = efetivamente ausente
            # Se não existe, é simplesmente irrelevante (pipeline não chegou lá ainda)

    # ------------------------------------------------------------------
    # 4. Recomendação de próximo passo
    # ------------------------------------------------------------------
    recommended_next_action = _recommend_next_action(job, output_dir, manifests_present)

    is_healthy = all(c["ok"] for c in checks)

    return {
        "is_healthy": is_healthy,
        "checks": checks,
        "manifests_present": manifests_present,
        "manifests_missing": manifests_missing,
        "recommended_next_action": recommended_next_action,
    }


def _recommend_next_action(job: dict, output_dir: Path, manifests_present: list[str]) -> str:
    status = job.get("status", "")
    mode = job.get("processing_mode", "document")

    if status == "error":
        return "Job com erro — verifique os logs e tente novamente."

    if status == "uploaded":
        return "Execute a análise do arquivo para continuar."

    if mode == "comic":
        has_consistency = "comic_consistency_manifest.json" in manifests_present
        has_finish = "comic_finish_manifest.json" in manifests_present
        has_finalize = "comic_final_manifest.json" in manifests_present

        if not has_consistency and not has_finish:
            return "Execute a análise de consistência visual para continuar."
        if has_consistency and not has_finish:
            return "Execute o acabamento visual (Fase N.A) para continuar."
        if has_finish and not has_finalize:
            return "Execute a curadoria final (Fase I.B) para continuar."
        if has_finalize:
            return "Pipeline de quadrinhos completo. Pronto para exportar."

    if mode == "document":
        conversion_status = job.get("conversion_status", "")
        if not conversion_status or conversion_status == "pending":
            return "Execute a conversão PDF→EPUB para continuar."
        if conversion_status == "done":
            return "Conversão concluída. Pronto para enviar ao Kindle."

    return "Nenhuma ação pendente identificada."


# ---------------------------------------------------------------------------
# repair_job
# ---------------------------------------------------------------------------


def repair_job(job: dict, output_dir: Path) -> dict:
    """
    Realiza reparos seguros (não-destrutivos) no diretório de output do job.

    Ações:
    - Remove arquivos de lock vazios (*.lock)
    - Renomeia manifestos JSON inválidos para *.bak para permitir re-geração

    Retorna
    -------
    dict com:
      - repaired: list[str]
      - not_repaired: list[str]
      - health: dict  (resultado de get_job_health após o reparo)
    """
    repaired: list[str] = []
    not_repaired: list[str] = []

    if not output_dir.exists():
        return {
            "repaired": repaired,
            "not_repaired": not_repaired,
            "health": get_job_health(job, output_dir),
        }

    # 1. Remover lock files vazios
    for lock_file in output_dir.glob("*.lock"):
        try:
            if lock_file.stat().st_size == 0:
                lock_file.unlink()
                repaired.append(f"Removido lock vazio: {lock_file.name}")
            else:
                not_repaired.append(f"Lock não vazio (processo ativo?): {lock_file.name}")
        except Exception as exc:
            not_repaired.append(f"Erro ao remover {lock_file.name}: {exc}")

    # 2. Renomear manifestos JSON inválidos
    for key, filename in _MANIFEST_FILES.items():
        manifest_path = output_dir / filename
        if manifest_path.exists() and not _is_valid_json(manifest_path):
            bak_path = manifest_path.with_suffix(".json.bak")
            try:
                manifest_path.rename(bak_path)
                repaired.append(f"Manifesto inválido renomeado para backup: {filename} → {filename}.bak")
            except Exception as exc:
                not_repaired.append(f"Erro ao renomear {filename}: {exc}")

    health = get_job_health(job, output_dir)

    return {
        "repaired": repaired,
        "not_repaired": not_repaired,
        "health": health,
    }


# ---------------------------------------------------------------------------
# Estabilização v1 — estado do pipeline comic (fonte única para gating da UI)
# ---------------------------------------------------------------------------

COMIC_PIPELINE_STEPS = [
    "analysis", "translation", "review", "overlay",
    "finalize", "finish", "consistency", "export",
]


def get_comic_pipeline_state(job: dict, output_dir: Path) -> dict:
    """
    Deriva o estado de cada etapa do pipeline comic a partir do job + manifests.

    Cada etapa: {id, status: 'done'|'available'|'blocked',
                 blocked_reason, prerequisite_step}.
    Regras:
    - Consistência nunca bloqueia o Export.
    - Export exige Curadoria Final exportada (ou Acabamento completo).
    Função pura (job dict + filesystem) — testável isoladamente.
    """
    def _manifest(name: str) -> dict | None:
        p = output_dir / name
        if not p.exists():
            return None
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None

    status = job.get("status", "")
    analysis_done = status in ("analyzed", "converting", "converted", "sending", "done")

    translation_done = (
        job.get("comic_translation_status") == "done"
        or _manifest("comic_translation.json") is not None
    )

    review_done = _manifest("comic_review.json") is not None
    overlay_done = _manifest("comic_overlay.json") is not None
    render_done = _manifest("comic_render.json") is not None

    final_m = _manifest("comic_final_manifest.json")
    finalize_done = bool(final_m and final_m.get("exported_pages", 0) > 0)

    finish_m = _manifest("comic_finish_manifest.json")
    finish_done = bool(
        finish_m
        and any(p.get("finished_path") for p in finish_m.get("pages", []))
    )

    consistency_done = _manifest("comic_consistency_manifest.json") is not None

    export_m = _manifest("comic_export/comic_export_manifest.json")
    export_done = export_m is not None and job.get("comic_export_status") == "done"

    def step(step_id: str, done: bool, prereq_ok: bool,
             prereq_step: str | None, reason: str) -> dict:
        if done:
            return {"id": step_id, "status": "done",
                    "blocked_reason": None, "prerequisite_step": None}
        if prereq_ok:
            return {"id": step_id, "status": "available",
                    "blocked_reason": None, "prerequisite_step": None}
        return {"id": step_id, "status": "blocked",
                "blocked_reason": reason, "prerequisite_step": prereq_step}

    steps = [
        step("analysis", analysis_done, True, None, ""),
        step("translation", translation_done, analysis_done, "analysis",
             "Conclua a análise do arquivo antes de traduzir."),
        step("review", review_done, translation_done, "translation",
             "A revisão exige a tradução do quadrinho concluída."),
        step("overlay", overlay_done, translation_done, "translation",
             "O overlay visual exige a tradução do quadrinho concluída."),
        step("finalize", finalize_done, overlay_done, "overlay",
             "A curadoria final exige o overlay inicializado."),
        step("finish", finish_done, finalize_done, "finalize",
             "O acabamento exige a curadoria final exportada."),
        step("consistency", consistency_done, finish_done, "finish",
             "A consistência exige o acabamento concluído."),
        # Export: exige curadoria exportada (finish é opcional; consistência nunca bloqueia)
        step("export", export_done, finalize_done or finish_done, "finalize",
             "O export final exige a curadoria final exportada."),
    ]

    current_step = next(
        (s["id"] for s in steps if s["status"] != "done"), "export"
    )

    return {
        "processing_mode": job.get("processing_mode", "document"),
        "render_done": render_done,
        "steps": steps,
        "current_step": current_step,
    }


# ---------------------------------------------------------------------------
# Estabilização v1 — fase canônica derivada (P4)
# ---------------------------------------------------------------------------

_RUNNING_JOB_STATUSES = {"analyzing", "converting", "sending"}


def derive_phase(job: dict) -> str:
    """
    Mapeia os estados legados do job para o vocabulário canônico:
    pending | running | completed | failed | blocked.

    NÃO renomeia strings no banco — apenas traduz na leitura.
    """
    if job.get("status") == "error":
        return "failed"

    in_progress_fields = (
        "conversion_status", "translation_status",
        "comic_translation_status", "comic_export_status",
    )
    if job.get("status") in _RUNNING_JOB_STATUSES or any(
        job.get(f) == "in_progress" for f in in_progress_fields
    ) or job.get("send_status") == "in_progress":
        return "running"

    if job.get("status") == "done":
        return "completed"

    # OCR falhou em PDF escaneado sem OCR aplicado → conversão bloqueada
    if (
        job.get("is_scanned")
        and job.get("ocr_status") == "failed"
        and not job.get("ocr_used")
    ):
        return "blocked"

    return "pending"
