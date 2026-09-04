"""
Fase K — Endpoints de operações em lote (batch mode).

Permite aplicar ações a múltiplos jobs simultaneamente:
  - GET  /batch/jobs                   — lista jobs com filtros
  - POST /batch/apply-preset           — aplica configurações de preset a jobs
  - POST /batch/export                 — exporta pacote final de comics
  - POST /batch/apply-suggestions      — aplica sugestões automáticas
  - POST /batch/retry-send             — reenvia jobs pendentes ao Kindle

Regras de segurança:
  - TODA rota opera apenas sobre trabalho de quem está pedindo (`_meu`)
  - Falha em um item não aborta os demais
  - Resultado por item: success | error | skipped
  - Imagens originais NUNCA são modificadas
  - Nenhuma operação é irreversível dentro desta fase

O BURACO QUE ESTE ARQUIVO TINHA, e por que ele não fazia barulho
================================================================
Até 03/09 nenhuma das seis rotas filtrava por dono. O router é montado com
`Depends(exigir_acesso)` e `Depends(exigir_conta)` — e a primeira não cobria
NADA aqui: ela procura `job_id` ou `upload_id` no CAMINHO, e o lote leva os
números no CORPO. Sem esses nomes no caminho ela devolve na primeira linha, por
desenho, e está escrito assim na docstring do `porta.py`.

Sobrava `exigir_conta`, que é "tem conta". A entrada é por link no e-mail, então
isso é qualquer pessoa da internet trinta segundos depois de querer — a mesma
frase que já derrubou `/config` em 31/08 e de novo em 03/09.

Com uma conta e uma lista de números, dava para listar os trabalhos de todo
mundo, mudar as configurações de conversão deles, disparar exportação, escrever
sugestões no conteúdo, escolher a variante final e mandar o arquivo para o
`KINDLE_EMAIL` da instalação.

A cegueira é da FORMA, e não deste arquivo: guarda que lê o caminho não vê o
corpo. Quem impede o próximo membro da família é
`tests/test_portao_de_dono.py`, que varre o app inteiro atrás de rota com
identificador no corpo e exige que ela esteja aqui declarada.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.porta import exigir_conta
from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import (
    BatchApplyPresetRequest,
    BatchApplySuggestionsRequest,
    BatchExportRequest,
    BatchItemResult,
    BatchJobsResponse,
    BatchRetrySendRequest,
    BatchResult,
    BatchSetFinalVariantRequest,
    HistoryEntry,
)

router = APIRouter(prefix="/batch", tags=["batch"])


_HISTORY_STR_FIELDS = frozenset({
    "input_format", "processing_mode", "conversion_status", "send_status",
    "final_title", "final_author", "final_language",
    "translation_status", "comic_translation_status",
})


def _to_history(record: ProcessingJob) -> dict:
    data = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    data["upload_id"] = data.pop("id")
    # Coerce None → "" para campos str que podem ser NULL em registros antigos.
    for field in _HISTORY_STR_FIELDS:
        if field in data and data[field] is None:
            data[field] = ""
    return data


def _meu(db: Session, pessoa, job_id: int) -> Optional[ProcessingJob]:
    """O trabalho, se for de quem está pedindo. `None` nos outros dois casos.

    O `dono_id` está no FILTRO, e não numa conferência depois — é a forma que o
    resto do backend usa (`notas.py`, `estudos.py`, `canvas.py`,
    `aparelhos.py`), e a diferença é que um filtro não tem como ser esquecido
    num `if` que alguém edite amanhã.

    "Não é seu" e "não existe" devolvem a mesma coisa de propósito, e quem chama
    responde `Job não encontrado.` para as duas. Distinguir contaria quais
    números existem para quem varresse uma sequência — metade do que se está
    protegendo, e a mesma razão do 404 uniforme do `porta.py`.

    Trabalho SEM dono também não passa: `dono_id` nulo nunca casa com o id de
    uma pessoa. Isso não é efeito colateral — é o que fecha
    `POST /batch/retry-send` como terceira porta do envio anônimo ao
    `KINDLE_EMAIL`, junto com `_exigir_destino` no `jobs.py`.
    """
    return (
        db.query(ProcessingJob)
        .filter(ProcessingJob.id == job_id, ProcessingJob.dono_id == pessoa.id)
        .first()
    )


def _make_result(items: list[BatchItemResult]) -> BatchResult:
    return BatchResult(
        total=len(items),
        succeeded=sum(1 for x in items if x.status == "success"),
        failed=sum(1 for x in items if x.status == "error"),
        skipped=sum(1 for x in items if x.status == "skipped"),
        item_results=items,
    )


# ---------------------------------------------------------------------------
# GET /batch/jobs — lista jobs com filtros
# ---------------------------------------------------------------------------

@router.get("/jobs", response_model=BatchJobsResponse)
def list_batch_jobs(
    status: Optional[str] = None,
    processing_mode: Optional[str] = None,
    input_format: Optional[str] = None,
    send_pending: Optional[bool] = None,
    translation_enabled: Optional[bool] = None,
    comic_translation_enabled: Optional[bool] = None,
    db: Session = Depends(get_db),
    pessoa=Depends(exigir_conta),
) -> dict:
    """
    Lista os trabalhos DE QUEM ESTÁ PEDINDO, com filtros opcionais.

    O `dono_id` é o primeiro filtro, e não um dos opcionais. Sem ele isto
    listava todos os processamentos registrados — o mesmo que o `/history`
    deixou de fazer em 30/08, e a correção foi feita num arquivo e não no outro.

    Não saía `token_publico` — o `response_model` é `HistoryEntry`, e o
    `_to_history` daqui, ao contrário do de `jobs.py`, não escreve `endereco`.
    Então os arquivos continuavam fora de alcance. O que saía era nome do
    arquivo original, título, autor, estado e datas de todo mundo, que já é a
    estante de cada um lida por qualquer pessoa com conta.

    Parâmetros:
    - status: uploaded | analyzing | analyzed | converting | done | error
    - processing_mode: document | comic
    - input_format: pdf | cbz | docx | etc.
    - send_pending: true = apenas jobs com send_status=pending
    - translation_enabled: true = apenas jobs com tradução habilitada
    - comic_translation_enabled: true = apenas com tradução de quadrinhos
    """
    query = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.dono_id == pessoa.id)
        .order_by(ProcessingJob.created_at.desc())
    )

    if status is not None:
        query = query.filter(ProcessingJob.status == status)
    if processing_mode is not None:
        query = query.filter(ProcessingJob.processing_mode == processing_mode)
    if input_format is not None:
        query = query.filter(ProcessingJob.input_format == input_format)
    if send_pending is True:
        query = query.filter(ProcessingJob.send_status == "pending")
    if translation_enabled is not None:
        query = query.filter(ProcessingJob.translation_enabled == translation_enabled)
    if comic_translation_enabled is not None:
        query = query.filter(ProcessingJob.comic_translation_enabled == comic_translation_enabled)

    records = query.all()
    jobs = [_to_history(r) for r in records]

    return {"jobs": jobs, "total": len(jobs)}


# ---------------------------------------------------------------------------
# POST /batch/apply-preset — aplica configurações do preset a jobs
# ---------------------------------------------------------------------------

@router.post("/apply-preset", response_model=BatchResult)
def batch_apply_preset(
    body: BatchApplyPresetRequest,
    db: Session = Depends(get_db),
    pessoa=Depends(exigir_conta),
) -> BatchResult:
    """
    Aplica configurações de um preset a uma lista de jobs.

    Campos atualizados: processing_mode, comic_mode, manga_rtl,
    translation_enabled, source_language, target_language, translator_engine.

    Não dispara reprocessamento — apenas atualiza metadados do job.
    """
    from app.services.preset_service import extract_job_updates, get_preset

    preset = get_preset(body.preset_id)
    if preset is None:
        # Retorna todos como erro
        items = [
            BatchItemResult(job_id=jid, status="error", message="Preset não encontrado.")
            for jid in body.job_ids
        ]
        return _make_result(items)

    updates = extract_job_updates(preset)
    items: list[BatchItemResult] = []

    for job_id in body.job_ids:
        job = _meu(db, pessoa, job_id)
        if job is None:
            items.append(BatchItemResult(job_id=job_id, status="error", message="Job não encontrado."))
            continue
        try:
            for field, value in updates.items():
                if hasattr(job, field):
                    setattr(job, field, value)
            db.commit()
            items.append(BatchItemResult(job_id=job_id, status="success"))
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            items.append(BatchItemResult(job_id=job_id, status="error", message=str(exc)))

    return _make_result(items)


# ---------------------------------------------------------------------------
# POST /batch/export — exporta pacote final para comics
# ---------------------------------------------------------------------------

@router.post("/export", response_model=BatchResult)
def batch_export(
    body: BatchExportRequest,
    db: Session = Depends(get_db),
    pessoa=Depends(exigir_conta),
) -> BatchResult:
    """
    Exporta páginas finais (ZIP + CBZ + PDF) para múltiplos jobs de quadrinhos.

    Requer que cada job tenha comic_final_manifest.json inicializado.
    Falhas em jobs individuais não abortam os demais.
    Imagens originais NUNCA são modificadas.
    """
    from app.services.comic_finalize_service import (
        export_final_pages,
        load_final_manifest,
        save_final_manifest,
    )

    items: list[BatchItemResult] = []

    for job_id in body.job_ids:
        job = _meu(db, pessoa, job_id)
        if job is None:
            items.append(BatchItemResult(job_id=job_id, status="error", message="Job não encontrado."))
            continue

        try:
            from app.core.config import STORAGE_OUTPUT
            manifest_path = STORAGE_OUTPUT / str(job_id) / "comic_final_manifest.json"

            if not manifest_path.exists():
                items.append(
                    BatchItemResult(
                        job_id=job_id,
                        status="skipped",
                        message="Manifesto de curadoria não encontrado. Execute POST /comic-finalize primeiro.",
                    )
                )
                continue

            manifest = load_final_manifest(manifest_path)
            pages_dir = STORAGE_OUTPUT / str(job_id) / "pages"
            rendered_dir = STORAGE_OUTPUT / str(job_id) / "rendered_pages"
            inpaint_dir = STORAGE_OUTPUT / str(job_id) / "inpaint_pages"
            output_dir = STORAGE_OUTPUT / str(job_id)

            updated = export_final_pages(
                manifest=manifest,
                pages_dir=pages_dir,
                rendered_dir=rendered_dir,
                inpaint_dir=inpaint_dir,
                output_dir=output_dir,
                job_id=job_id,
            )
            save_final_manifest(manifest_path, updated)

            exported = updated.get("exported_pages", 0)
            items.append(
                BatchItemResult(
                    job_id=job_id,
                    status="success",
                    message=f"{exported} página(s) exportada(s).",
                )
            )
        except Exception as exc:  # noqa: BLE001
            items.append(BatchItemResult(job_id=job_id, status="error", message=str(exc)))

    return _make_result(items)


# ---------------------------------------------------------------------------
# POST /batch/apply-suggestions — aplica sugestões automáticas em lote
# ---------------------------------------------------------------------------

@router.post("/apply-suggestions", response_model=BatchResult)
def batch_apply_suggestions(
    body: BatchApplySuggestionsRequest,
    db: Session = Depends(get_db),
    pessoa=Depends(exigir_conta),
) -> BatchResult:
    """
    Aplica sugestões automáticas de variante para múltiplos jobs de quadrinhos.

    Requer que cada job tenha comic_final_manifest.json e
    comic_suggestion_manifest.json inicializados.
    """
    from app.services.comic_finalize_service import (
        load_final_manifest,
        save_final_manifest,
    )
    from app.services.comic_scoring_service import (
        apply_suggestions_to_manifest,
        load_suggestion_manifest,
    )

    items: list[BatchItemResult] = []

    for job_id in body.job_ids:
        job = _meu(db, pessoa, job_id)
        if job is None:
            items.append(BatchItemResult(job_id=job_id, status="error", message="Job não encontrado."))
            continue

        try:
            from app.core.config import STORAGE_OUTPUT
            manifest_path = STORAGE_OUTPUT / str(job_id) / "comic_final_manifest.json"
            suggestion_path = STORAGE_OUTPUT / str(job_id) / "comic_suggestion_manifest.json"

            if not manifest_path.exists():
                items.append(
                    BatchItemResult(
                        job_id=job_id,
                        status="skipped",
                        message="Manifesto de curadoria não encontrado.",
                    )
                )
                continue

            suggestion_manifest = load_suggestion_manifest(suggestion_path)
            if suggestion_manifest is None:
                items.append(
                    BatchItemResult(
                        job_id=job_id,
                        status="skipped",
                        message="Sugestões não computadas. Execute POST /comic-suggestions/recompute primeiro.",
                    )
                )
                continue

            final_manifest = load_final_manifest(manifest_path)
            updated, count = apply_suggestions_to_manifest(
                suggestion_manifest=suggestion_manifest,
                final_manifest=final_manifest,
                only_undecided=body.only_undecided,
                min_confidence=body.min_confidence,
            )
            save_final_manifest(manifest_path, updated)

            items.append(
                BatchItemResult(
                    job_id=job_id,
                    status="success",
                    message=f"{count} página(s) atualizada(s).",
                )
            )
        except Exception as exc:  # noqa: BLE001
            items.append(BatchItemResult(job_id=job_id, status="error", message=str(exc)))

    return _make_result(items)


# ---------------------------------------------------------------------------
# POST /batch/retry-send — reenvia jobs pendentes ao Kindle
# ---------------------------------------------------------------------------

@router.post("/retry-send", response_model=BatchResult)
def batch_retry_send(
    body: BatchRetrySendRequest,
    db: Session = Depends(get_db),
    pessoa=Depends(exigir_conta),
) -> BatchResult:
    """
    Reenvia ao Kindle jobs com send_status=pending — os DE QUEM ESTÁ PEDINDO.

    Jobs com send_status diferente de pending são marcados como skipped.

    ESTA ERA A TERCEIRA PORTA DO ENVIO ANÔNIMO, e ela ficou aberta um commit
    depois das outras duas. A chamada era
    `send_epub_to_kindle(epub, cfg)` — repare que `cfg`, um dicionário de
    configuração, estava na posição do `title`, e o `destino` ficava em `None`.
    Com destino nulo o `email_service` cai no `KINDLE_EMAIL` do `.env`, então
    qualquer trabalho pendente da instalação, de qualquer pessoa e inclusive sem
    dono, saía para o Kindle de quem cuida dela.

    Agora o destino é o aparelho principal do dono, que é a mesma regra do
    `/jobs/{id}/send`. E `_meu` já garante que só há dono para consultar.
    """
    from app.models.aparelho import Aparelho
    from app.services.email_service import SendConnectivityError, SendFailedError, send_epub_to_kindle

    aparelho = (
        db.query(Aparelho)
        .filter(Aparelho.pessoa_id == pessoa.id, Aparelho.principal.is_(True))
        .first()
    )
    # Sem aparelho cadastrado, `None` faz o `email_service` usar o
    # `KINDLE_EMAIL` do `.env` — o caso da instalação de uma pessoa só, e o
    # mesmo que `_exigir_destino` mantém no envio avulso. Aqui há dono, e o
    # trabalho é dele.
    destino = aparelho.endereco if aparelho else None

    items: list[BatchItemResult] = []

    for job_id in body.job_ids:
        job = _meu(db, pessoa, job_id)
        if job is None:
            items.append(BatchItemResult(job_id=job_id, status="error", message="Job não encontrado."))
            continue

        if job.send_status != "pending":
            items.append(
                BatchItemResult(
                    job_id=job_id,
                    status="skipped",
                    message=f"send_status={job.send_status!r} (esperado 'pending').",
                )
            )
            continue

        epub = job.epub_path
        if not epub:
            items.append(BatchItemResult(job_id=job_id, status="error", message="EPUB não encontrado."))
            continue

        try:
            send_epub_to_kindle(epub, job.final_title or "", destino=destino)
            job.send_status = "sent"
            job.kindle_sent = True
            job.send_error = None
            db.commit()
            items.append(BatchItemResult(job_id=job_id, status="success", message="Enviado ao Kindle."))
        except (SendFailedError, SendConnectivityError) as exc:
            job.send_status = "failed"
            job.send_error = str(exc)
            db.commit()
            items.append(BatchItemResult(job_id=job_id, status="error", message=str(exc)))
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            items.append(BatchItemResult(job_id=job_id, status="error", message=str(exc)))

    return _make_result(items)


# ---------------------------------------------------------------------------
# POST /batch/set-final-variant — define variante para todas as páginas em lote
# ---------------------------------------------------------------------------

@router.post("/set-final-variant", response_model=BatchResult)
def batch_set_final_variant(
    body: BatchSetFinalVariantRequest,
    db: Session = Depends(get_db),
    pessoa=Depends(exigir_conta),
) -> BatchResult:
    """
    Define o campo selected_variant de todas as páginas de múltiplos jobs.

    Útil para definir em lote: "todos → original", "todos → render_overlay", etc.
    Requer que cada job tenha comic_final_manifest.json inicializado.
    Páginas para as quais a variante não está disponível são registradas em warnings.
    Imagens originais NUNCA são modificadas.
    """
    from app.services.comic_finalize_service import load_final_manifest, save_final_manifest

    items: list[BatchItemResult] = []

    for job_id in body.job_ids:
        job = _meu(db, pessoa, job_id)
        if job is None:
            items.append(BatchItemResult(job_id=job_id, status="error", message="Job não encontrado."))
            continue

        try:
            from app.core.config import STORAGE_OUTPUT
            manifest_path = STORAGE_OUTPUT / str(job_id) / "comic_final_manifest.json"

            if not manifest_path.exists():
                items.append(
                    BatchItemResult(
                        job_id=job_id,
                        status="skipped",
                        message="Manifesto de curadoria não encontrado. Execute POST /comic-finalize primeiro.",
                    )
                )
                continue

            manifest = load_final_manifest(manifest_path)
            pages = manifest.get("pages", [])
            applied = 0
            warn: list[str] = []

            for page in pages:
                available = page.get("available_variants", [])
                if body.variant in available:
                    page["selected_variant"] = body.variant
                    page["selection_source"] = "manual"
                    applied += 1
                else:
                    warn.append(
                        f"Página {page.get('page_number')}: variante '{body.variant}' não disponível."
                    )

            save_final_manifest(manifest_path, manifest)
            items.append(
                BatchItemResult(
                    job_id=job_id,
                    status="success",
                    message=f"{applied} página(s) atualizada(s) para '{body.variant}'.",
                    action="set-final-variant",
                    warnings=warn if warn else None,
                )
            )
        except Exception as exc:  # noqa: BLE001
            items.append(BatchItemResult(job_id=job_id, status="error", message=str(exc)))

    return _make_result(items)
