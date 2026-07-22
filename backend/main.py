import sys
from pathlib import Path

# Adiciona backend/ ao sys.path para que 'from app.xxx import ...' funcione
# tanto com 'uvicorn backend.main:app' (raiz do projeto) quanto com
# 'uvicorn main:app' (dentro de backend/).
_backend_dir = Path(__file__).parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

import os

# Configura ARGOS_PACKAGES_DIR para usar o diretório local do projeto.
# Deve ser definido antes de qualquer import do argostranslate (que lê o env var
# ao nível de módulo). ARGOS_PACKAGES_DIR do ambiente/shell tem prioridade.
_project_root = _backend_dir.parent
_local_argos_dir = _project_root / "storage" / "models" / "argos-packages"
if "ARGOS_PACKAGES_DIR" not in os.environ:
    os.environ["ARGOS_PACKAGES_DIR"] = str(_local_argos_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import PROJECT_ROOT
from app.db.database import init_db
from app.api.health import router as health_router
from app.api.config import router as config_router
from app.api.jobs import router as jobs_router
from app.api.app_config import router as app_config_router
from app.api.translation import router as translation_router
from app.api.comic_review import router as comic_review_router
from app.api.comic_overlay import router as comic_overlay_router
from app.api.comic_render import router as comic_render_router
from app.api.comic_inpaint import router as comic_inpaint_router
from app.api.comic_finalize import router as comic_finalize_router
from app.api.comic_suggestions import router as comic_suggestions_router
from app.api.presets import router as presets_router
from app.api.batch import router as batch_router
from app.api.metrics import router as metrics_router
from app.api.comic_finish import router as comic_finish_router
from app.api.comic_consistency import router as comic_consistency_router
from app.api.comic_preset_recommendation import router as comic_preset_recommendation_router
from app.api.job_health import router as job_health_router
from app.api.comic_export import router as comic_export_router
from app.api.comic_quick import router as comic_quick_router

# Inicializa storage dirs e cria tabelas
init_db()

app = FastAPI(
    title="Kindle Local Tool",
    version="0.1.0",
    description="Ferramenta local para converter PDFs em EPUB e enviar ao Kindle.",
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_cors_origins = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# v1.2.1 — SEM mount amplo de /storage (expunha banco, config, inputs,
# backups e manifests internos). Artefatos são servidos por rotas
# controladas com allowlist em app/api/files.py.
from app.api.files import router as files_router  # noqa: E402

app.include_router(files_router)
app.include_router(health_router)
app.include_router(config_router)
app.include_router(jobs_router)
app.include_router(app_config_router)
app.include_router(translation_router)
app.include_router(comic_review_router)
app.include_router(comic_overlay_router)
app.include_router(comic_render_router)
app.include_router(comic_inpaint_router)
app.include_router(comic_finalize_router)
app.include_router(comic_suggestions_router)
app.include_router(presets_router)
app.include_router(batch_router)
app.include_router(metrics_router)
app.include_router(comic_finish_router)
app.include_router(comic_consistency_router)
app.include_router(comic_preset_recommendation_router)
app.include_router(job_health_router)
app.include_router(comic_export_router)
app.include_router(comic_quick_router)


@app.on_event("startup")
def run_startup_cleanup() -> None:
    """Remove arquivos de jobs antigos, inicializa presets e recupera jobs presos."""
    from datetime import datetime as _dt
    from app.core.limits import validate_limits
    from app.db.database import SessionLocal as _SessionLocal
    from app.models.processing_job import ProcessingJob as _ProcessingJob
    from app.services.app_config_service import load_app_config
    from app.services.cleanup_service import cleanup_old_jobs
    from app.services.preset_service import ensure_system_presets

    # v1.2.2 — valida limites de processamento (zeros/negativos/incoerentes
    # abortam o startup com mensagem explícita)
    validate_limits()

    # Recovery: qualquer job que ficou em in_progress quando o servidor reiniciou
    # nunca vai completar — o background task foi morto. Marcar como failed agora
    # para que o frontend saia do estado "Traduzindo..." e o usuário possa tentar de novo.
    _db = _SessionLocal()
    try:
        _stuck_trans = _db.query(_ProcessingJob).filter(
            _ProcessingJob.translation_status == "in_progress"
        ).all()
        _stuck_comic = _db.query(_ProcessingJob).filter(
            _ProcessingJob.comic_translation_status == "in_progress"
        ).all()
        _now = _dt.utcnow()
        for _j in _stuck_trans:
            _j.translation_status = "failed"
            _j.translation_error = (
                "Tradução interrompida inesperadamente (servidor reiniciou). Tente novamente."
            )
            _j.updated_at = _now
        for _j in _stuck_comic:
            _j.comic_translation_status = "failed"
            _j.comic_translation_error = (
                "Tradução interrompida inesperadamente (servidor reiniciou). Tente novamente."
            )
            _j.updated_at = _now
        if _stuck_trans or _stuck_comic:
            _db.commit()
    except Exception:
        pass
    finally:
        _db.close()

    cfg = load_app_config()
    cleanup_old_jobs(cfg["retention_days"])
    ensure_system_presets()


# ---------------------------------------------------------------------------
# Servir SPA do frontend (apenas se o build existir)
# Registrado por último para que as rotas de API tenham prioridade.
# ---------------------------------------------------------------------------

_FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

if _FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(_FRONTEND_DIST / "assets")),
        name="frontend-assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        return FileResponse(str(_FRONTEND_DIST / "index.html"))


def run() -> None:
    """Entry point para o comando `kindle-tool` (pyproject.toml)."""
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
