import sys
from contextlib import asynccontextmanager
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

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import PROJECT_ROOT
from app.db.database import init_db
from app.api.acesso import router as acesso_router
from app.api.porta import exigir_acesso, exigir_conta, exigir_dono
from app.api.recados import do_dono as recados_do_dono
from app.api.recados import router as recados_router
from app.api.health import router as health_router
from app.api.aparelhos import router as aparelhos_router
from app.api.notas import router as notas_router
from app.api.marcadores import router as marcadores_router
from app.api.preferencias import router as preferencias_router
from app.api.canvas import router as canvas_router
from app.api.estudos import router as estudos_router
from app.api.busca import router as busca_router
from app.api.privacidade import router as privacidade_router
from app.api.progresso import router as progresso_router
from app.api.config import publico as config_publico, router as config_router
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


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Executa a manutenção uma vez por processo, sem a API obsoleta `on_event`."""
    run_startup_cleanup()
    yield

app = FastAPI(
    title="Kindle Local Tool",
    version="0.1.0",
    description="Ferramenta local para converter PDFs em EPUB e enviar ao Kindle.",
    lifespan=lifespan,
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_cors_origins = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

# `*` COM CREDENCIAIS É A COMBINAÇÃO QUE ENTREGA A CONTA.
#
# O middleware manda `allow-credentials: true`, o que significa que o navegador
# ANEXA O COOKIE DE SESSÃO em pedidos de outra origem. Com uma lista fechada
# isso é o que se quer — é o próprio produto chamando a própria API. Com `*`,
# passaria a ser qualquer site do mundo lendo a estante de quem estivesse
# logado.
#
# O Starlette recusa essa combinação por conta própria, e mesmo assim a
# verificação fica: ela transforma uma recusa silenciosa lá dentro num erro que
# diz o que está errado, na hora de subir, e não numa tela que não carrega.
#
# Em produção a lista fica VAZIA de propósito: interface e API ficam no mesmo
# domínio, atrás do mesmo Caddy, e mesma origem não usa CORS nenhum.
if "*" in _cors_origins:
    raise RuntimeError(
        "ALLOWED_ORIGINS=* com credenciais entregaria a sessão a qualquer site. "
        "Liste as origens, ou deixe vazio se a interface e a API ficam no mesmo domínio."
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# A EVIDÊNCIA DE ACESSO PRIVILEGIADO — `DEC-0041`.
#
# O `exigir_dono` deixa em `request.state.privilegiado` o que ele sabe: quem,
# por quê, escopo e ação. Só aqui existe a última peça, o RESULTADO — que é o
# status da resposta, e a resposta não existe enquanto a dependência corre.
#
# Middleware e não decorador de rota: a porta do dono está em quatro routers, e
# vai estar em mais. Registrar dentro de cada rota seria N lugares para acertar
# hoje e um para esquecer depois — o mesmo argumento que fez `exigir_dono` ser
# dependência de router, escrito em `app/api/porta.py`.
@app.middleware("http")
async def registrar_acesso_privilegiado(request: Request, call_next):
    from app import auditoria

    try:
        resposta = await call_next(request)
    except Exception:
        # ERRO TAMBÉM É UM ACESSO, e é o que mais interessa numa revisão: a
        # requisição chegou, a porta a deixou passar, e algo estourou depois.
        marca = getattr(request.state, "privilegiado", None)
        if marca:
            auditoria.registrar(
                quem=marca.get("quem"),
                motivo=marca["motivo"],
                escopo=marca["escopo"],
                alvo=marca.get("alvo", "—"),
                acao=marca["acao"],
                resultado="erro na aplicação",
            )
        raise

    marca = getattr(request.state, "privilegiado", None)
    if marca:
        auditoria.registrar(
            quem=marca.get("quem"),
            motivo=marca["motivo"],
            escopo=marca["escopo"],
            alvo=marca.get("alvo", "—"),
            acao=marca["acao"],
            resultado=f"HTTP {resposta.status_code}",
        )
    return resposta


# v1.2.1 — SEM mount amplo de /storage (expunha banco, config, inputs,
# backups e manifests internos). Artefatos são servidos por rotas
# controladas com allowlist em app/api/files.py.
from app.api.files import router as files_router  # noqa: E402

app.include_router(files_router)
app.include_router(acesso_router)
app.include_router(health_router)
# Atrás da mesma porta: as rotas falam de um trabalho específico.
app.include_router(progresso_router, dependencies=[Depends(exigir_acesso)])
app.include_router(notas_router, dependencies=[Depends(exigir_acesso), Depends(exigir_conta)])
# Os marcadores ficam atrás das mesmas duas portas das notas, e pela mesma
# razão: são de uma PESSOA dentro de um TRABALHO. A chave do trabalho sozinha
# prova acesso ao livro, e não a quem são as dobras dele.
app.include_router(marcadores_router, dependencies=[Depends(exigir_acesso), Depends(exigir_conta)])
# Sem porta de trabalho: as rotas de aparelho falam da CONTA, e a sessão é a
# única credencial possível — não há chave de trabalho que dê acesso a elas.
app.include_router(aparelhos_router)
app.include_router(preferencias_router)
app.include_router(privacidade_router)
app.include_router(canvas_router)
app.include_router(estudos_router)
# A busca só olha o que é da pessoa, e por isso exige conta em vez da chave de
# trabalho: a chave prova UM trabalho, e a busca fala de todos.
app.include_router(busca_router, dependencies=[Depends(exigir_conta)])

# `config` e `app-config` falam da INSTALAÇÃO, não de um trabalho — então a
# porta de trabalho não os cobria, e eles ficaram abertos. `/config` devolvia o
# `kindle_email` e o `smtp_user` reais a qualquer visitante.
#
# Em 31/08 eles passaram a exigir CONTA, e isso resolveu metade: a entrada é por
# link no e-mail, então "tem conta" é qualquer pessoa da internet trinta
# segundos depois de querer. Em 03/09 passaram a exigir DONO — `exigir_dono`,
# em `app/api/porta.py`, tem a lista do que estava do outro lado.
#
# `/config/formatos` é a exceção declarada: a tela de entrada precisa saber o
# que o Mekora aceita ANTES de alguém ter conta, porque converter sem conta é
# garantido pela DEC-0018. Ela não conta nada sobre ninguém — é uma lista de
# extensões.
app.include_router(config_publico)
app.include_router(config_router, dependencies=[Depends(exigir_dono)])

# OS RECADOS. Escrever é público de propósito: quem converteu sem conta
# (DEC-0018) é justamente quem tem a primeira impressão, e exigir cadastro para
# reclamar garante que só quem já gostou reclame. Ler é do dono — recado tem
# texto livre e às vezes um e-mail para responder.
app.include_router(recados_router)
app.include_router(recados_do_dono, dependencies=[Depends(exigir_dono)])
app.include_router(jobs_router, dependencies=[Depends(exigir_acesso)])
app.include_router(app_config_router, dependencies=[Depends(exigir_dono)])
app.include_router(translation_router, dependencies=[Depends(exigir_acesso), Depends(exigir_conta)])
app.include_router(comic_review_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_overlay_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_render_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_inpaint_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_finalize_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_suggestions_router, dependencies=[Depends(exigir_acesso)])
app.include_router(presets_router, dependencies=[Depends(exigir_conta)])
app.include_router(batch_router, dependencies=[Depends(exigir_acesso), Depends(exigir_conta)])
# As DUAS portas: `exigir_acesso` cobre `/metrics/jobs/{job_id}`, e
# `exigir_conta` cobre `/metrics/summary` e `/metrics/usage`, que não têm
# `job_id` e por isso passavam direto — contando quantos trabalhos existem e em
# que formatos, de todo mundo somados.
app.include_router(metrics_router, dependencies=[Depends(exigir_acesso), Depends(exigir_conta)])
app.include_router(comic_finish_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_consistency_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_preset_recommendation_router, dependencies=[Depends(exigir_acesso)])
app.include_router(job_health_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_export_router, dependencies=[Depends(exigir_acesso)])
app.include_router(comic_quick_router, dependencies=[Depends(exigir_acesso)])


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

    # Recovery: qualquer operação em andamento morreu junto com o processo.
    # Recuperar só a tradução deixava ``conversion_status=in_progress`` e
    # ``active_operation=convert:...`` vivos para sempre; a fila sequencial
    # inteira ficava atrás desse registro impossível.
    _db = _SessionLocal()
    try:
        # Links usados ou vencidos deixam de ser credenciais e não têm motivo
        # para permanecer no banco. Esta limpeza existia, mas nunca era chamada.
        from app.services.acesso_service import limpar_vencidas
        limpar_vencidas(_db)
        from app.core.config import STORAGE_OUTPUT as _OUTPUT
        from app.services.progress_service import recover_orphan_operation

        _stuck = _db.query(_ProcessingJob).filter(
            (_ProcessingJob.active_operation.isnot(None))
            | (_ProcessingJob.translation_status == "in_progress")
            | (_ProcessingJob.conversion_status == "in_progress")
            | (_ProcessingJob.comic_translation_status == "in_progress")
        ).all()
        _now = _dt.utcnow()
        for _j in _stuck:
            recover_orphan_operation(_j, _OUTPUT / str(_j.id))
            if _j.translation_status == "in_progress":
                _j.translation_status = "failed"
                _j.translation_error = (
                    "Tradução interrompida inesperadamente (servidor reiniciou). Tente novamente."
                )
            if _j.comic_translation_status == "in_progress":
                _j.comic_translation_status = "failed"
                _j.comic_translation_error = (
                    "Tradução interrompida inesperadamente (servidor reiniciou). Tente novamente."
                )
            if _j.conversion_status == "in_progress":
                _j.status = "error"
                _j.conversion_status = "failed"
                _j.error_message = (
                    "Conversão interrompida pela reinicialização do aplicativo. Tente novamente."
                )
            _j.updated_at = _now
        if _stuck:
            _db.commit()
    except Exception:
        pass
    finally:
        _db.close()

    cfg = load_app_config()
    cleanup_old_jobs(cfg["retention_days"])
    # As medições de uso saem junto, e pelo mesmo gesto: a limpeza do servidor é
    # um lugar só. Deixá-las crescendo para sempre era o prazo que ninguém
    # escolhe e todo mundo acaba tendo.
    from app.services.cleanup_service import limpar_eventos_antigos
    limpar_eventos_antigos()
    # A EVIDÊNCIA DE ACESSO SAI PELO MESMO GESTO — `DEC-0041`, 90 dias, o mesmo
    # prazo dos eventos de uso. Dois prazos para lembrar viram um lembrado e
    # outro esquecido; e um registro de auditoria sem retenção declarada é uma
    # coleção que só cresce, que é o oposto de minimização.
    from app import auditoria
    auditoria.limpar()
    ensure_system_presets()

    # A fila também precisa sobreviver ao processo. ``BackgroundTasks`` é só
    # memória; os itens ``pending`` ficam no banco e são retomados em uma única
    # thread sequencial, na mesma ordem em que entraram.
    import threading as _threading
    from app.api.batch import resume_pending_preparations
    _threading.Thread(
        target=resume_pending_preparations,
        name="mekora-retomar-fila",
        daemon=True,
    ).start()


# ---------------------------------------------------------------------------
# Servir SPA do frontend (apenas se o build existir)
# Registrado por último para que as rotas de API tenham prioridade.
# ---------------------------------------------------------------------------

# A porta 8000 e os links de entrada nunca podem devolver o produto legado.
# Em desenvolvimento a interface roda em :5180; este build e a salvaguarda para
# quem abrir a API diretamente e para o modo local de um processo so.
_FRONTEND_DIST = PROJECT_ROOT / "web" / "dist"

if _FRONTEND_DIST.exists():
    # O Vite copia `publico/` para a raiz do build. Montar apenas `/assets`
    # entregava React e CSS, mas deixava ícones, capas e fontes virarem o próprio
    # index.html pelo fallback abaixo: a tela certa abria com desenhos quebrados.
    for _pasta_publica in ("assets", "fontes", "capas", "icones"):
        app.mount(
            f"/{_pasta_publica}",
            StaticFiles(directory=str(_FRONTEND_DIST / _pasta_publica)),
            name=f"frontend-{_pasta_publica}",
        )

    # Arquivos PWA ficam na raiz para que o service worker controle todas as
    # rotas. Sem rotas explícitas o fallback SPA devolvia ``index.html`` com
    # status 200 para ``/manifest.webmanifest`` e ``/service-worker.js`` — o
    # navegador recebia HTML onde esperava JSON/JavaScript e a instalação nunca
    # ficava disponível.
    @app.get("/manifest.webmanifest", include_in_schema=False)
    async def serve_manifest() -> FileResponse:
        return FileResponse(
            str(_FRONTEND_DIST / "manifest.webmanifest"),
            media_type="application/manifest+json",
        )

    @app.get("/service-worker.js", include_in_schema=False)
    async def serve_service_worker() -> FileResponse:
        return FileResponse(
            str(_FRONTEND_DIST / "service-worker.js"),
            media_type="application/javascript",
            headers={"Cache-Control": "no-cache"},
        )

    @app.get("/app-icon-{size}.png", include_in_schema=False)
    async def serve_app_icon(size: int) -> FileResponse:
        if size not in (192, 512):
            from fastapi import HTTPException
            raise HTTPException(status_code=404)
        return FileResponse(str(_FRONTEND_DIST / f"app-icon-{size}.png"), media_type="image/png")

    @app.get("/app-icon.svg", include_in_schema=False)
    async def serve_app_icon_svg() -> FileResponse:
        return FileResponse(str(_FRONTEND_DIST / "app-icon.svg"), media_type="image/svg+xml")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        # O HTML aponta para bundles com hash. Guardá-lo enquanto um build novo
        # já removeu os bundles antigos produz uma janela inteiramente branca no
        # app instalado. Assets continuam imutáveis/cacheáveis; só a entrada da
        # aplicação precisa sempre ser revalidada.
        return FileResponse(
            str(_FRONTEND_DIST / "index.html"),
            headers={"Cache-Control": "no-store, max-age=0"},
        )


def run() -> None:
    """Entry point para o comando `kindle-tool` (pyproject.toml)."""
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
