from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Cookie, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP
from app.api.vazao import limitar_envios
from app.db.database import get_db
from app.models.processing_job import ProcessingJob
from app.schemas.jobs import (
    ApplyPresetRequest,
    ComicTranslateRequest,
    CoverUpdate,
    DuplicateJobRequest,
    HistoryEntry,
    JobResponse,
    JobStatusResponse,
    MetadataUpdate,
    UploadResponse,
)
from app.services.cleanup_service import apagar_arquivos_do_trabalho
from app.services.convert_service import ConversionCancelled, ConversionFailedError, convert_to_epub
from app.services.epub_web_service import gerar_epub_web

logger = logging.getLogger(__name__)
from app.services.email_service import (
    SendConnectivityError,
    SendFailedError,
    is_smtp_reachable,
    send_epub_to_kindle,
)
from app.services.input_router_service import (
    detect_input_format,
    detect_processing_mode,
    is_accepted,
)
from app.services import capa_service
from app.services.pdf_service import analyze_pdf, get_thumbnail_urls

router = APIRouter(tags=["jobs"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_job(record: ProcessingJob) -> dict:
    """Converte um registro ORM em dict compatível com JobResponse."""
    data = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    data["upload_id"] = data.pop("id")
    data["endereco"] = record.token_publico
    data["leitura_url"] = _leitura_url(record)
    data["epub_url"] = _epub_url(record)
    data["thumbnails"] = get_thumbnail_urls(record.token_publico or "", data.get("page_count") or 0, record.id)
    _sem_buracos(data)
    return data


_HISTORY_STR_FIELDS = frozenset({
    "input_format", "processing_mode", "conversion_status", "send_status",
    "final_title", "final_author", "final_language",
    "translation_status", "comic_translation_status",
    "ocr_status",
})

# `is_scanned` fica FORA de propósito: ele é `Optional` no esquema, e "não sei
# se é digitalizado" é resposta legítima — diferente de "não é".
_CAMPOS_BOOLEANOS = frozenset({
    "ocr_used", "kindle_sent", "translation_enabled", "comic_mode",
    "manga_rtl", "comic_translation_enabled",
})


def _sem_buracos(data: dict) -> dict:
    """Troca NULL por vazio nos campos que o esquema declara não-nulos.

    UM registro com um NULL derruba a resposta INTEIRA com 500: a estante não
    abre por causa de um item, e o livro não abre por causa de um campo. E o
    NULL chega por um caminho banal — um registro criado antes de a coluna
    existir, que é o normal num banco que já tem história.

    Esta função existe num lugar só porque a mesma defesa já foi escrita duas
    vezes: primeiro para textos no histórico, depois para booleanos no mesmo
    lugar. Na terceira, o `/analyze` não tinha nenhuma das duas e quebrava
    sozinho — que é exatamente como uma defesa copiada diverge.
    """
    for campo in _HISTORY_STR_FIELDS:
        if campo in data and data[campo] is None:
            data[campo] = ""
    for campo in _CAMPOS_BOOLEANOS:
        if campo in data and data[campo] is None:
            data[campo] = False
    return data


def _leitura_de(db: Session, job: ProcessingJob) -> dict:
    """O que a estante precisa saber sobre a LEITURA de um livro.

    Isto existe porque a ficha da estante vinha completando o que não sabia com
    valores escritos à mão: "80% lido", "24 notas", uma citação inventada e a
    etiqueta "#Design" — os mesmos, em todo livro, misturados por
    `{ ...EXEMPLO_FICHA, ...livroReal }`. O livro real sobrescrevia título e
    autor, e o resto do exemplo sobrevivia porque não havia campo real para
    substituí-lo.

    O `CLAUDE.md` deste repositório já dizia: "número na interface sai do
    modelo, não da mão. Dois números escritos à mão ao lado de um derivado fazem
    da tela uma coisa meio honesta, que é pior."

    A PORCENTAGEM PASSOU A EXISTIR, e o comentário anterior aqui dizia que ela
    não podia: *"o servidor não conhece o tamanho do texto — o EPUB é lido no
    navegador"*. A primeira metade continua verdadeira, e a conclusão não: o
    cliente conhece, e agora ele grava. O servidor guarda e devolve, sem derivar.

    Vem nula para leitura registrada antes disso, e a ficha então cai no
    "capítulo N de M". Nulo não é zero.
    """
    from app.models.nota import Nota
    from app.models.progresso import Progresso

    fora = {
        "notas": 0, "capitulo": None, "capitulos": None, "fracao": None,
        # O QUE A PESSOA DECLAROU sobre este livro — "to_read", "reading",
        # "read" —, ou nulo quando ela não declarou nada. Nulo NÃO é "to_read":
        # é "ninguém disse", e aí o estado sai da fração. A precedência mora num
        # lugar só, o `estadoDeLeitura` do contrato.
        "estado_leitura": None,
        "ultima_nota": None,
        # QUANDO A LEITURA FOI MEXIDA PELA ÚLTIMA VEZ.
        #
        # A Mesa do nó 895:9981 abre com um cartão "Continue" — um livro só, o
        # que a pessoa estava lendo. Sem esta data não há como escolher qual: a
        # estante devolve os livros por data de CRIAÇÃO, que é quando o arquivo
        # chegou, e não quando alguém o leu.
        "lido_em": None,
    }
    if not job.dono_id:
        return fora

    fora["notas"] = (
        db.query(Nota)
        .filter(Nota.pessoa_id == job.dono_id, Nota.job_id == job.id)
        .count()
    )

    # A amostra é a ÚLTIMA nota de verdade, e não um texto de enfeite. Quando
    # não há nenhuma, o campo vem nulo e a tela cala — em vez de mostrar uma
    # citação que ninguém escreveu.
    ultima = (
        db.query(Nota)
        .filter(Nota.pessoa_id == job.dono_id, Nota.job_id == job.id)
        .order_by(Nota.criada_em.desc())
        .first()
    )
    if ultima is not None:
        fora["ultima_nota"] = {"trecho": ultima.trecho, "cor": ultima.cor, "comentario": ultima.comentario}

    p = (
        db.query(Progresso)
        .filter(Progresso.pessoa_id == job.dono_id, Progresso.job_id == job.id)
        .first()
    )
    if p is not None and p.capitulos:
        fora["capitulo"] = p.capitulo
        fora["capitulos"] = p.capitulos
    # A fração sai mesmo sem `capitulos`: ela é o número mais preciso dos dois, e
    # amarrá-la à condição do outro esconderia o melhor dado por causa do pior.
    if p is not None:
        fora["fracao"] = p.fracao
        fora["estado_leitura"] = p.estado_leitura
        fora["lido_em"] = p.atualizado_em

    return fora


def _exigir_destino(db: Session, job: ProcessingJob) -> str | None:
    """Para qual Kindle este trabalho vai — ou 403, quando não vai para nenhum.

    TRABALHO SEM DONO NÃO TEM DESTINO, e esta é a linha inteira do conserto de
    03/09.

    Antes, sem dono a função devolvia `None` e o envio caía no `KINDLE_EMAIL` do
    `.env` — o Kindle de quem cuida da instalação. A intenção estava certa e
    escrita: manter a instalação de uma pessoa só funcionando sem cadastrar
    aparelho. O que mudou foi o de sempre, e já mudou três vezes neste
    repositório: o que era "o dono do computador" virou "qualquer um na
    internet".

    A cadeia não pedia conta em passo nenhum. `/upload` é público por garantia
    da DEC-0018; a resposta devolve o `token_publico`; o token passa em
    `exigir_acesso` pelo cabeçalho `X-Mekora-Chave`; e `/jobs/{id}/send`
    entregava o arquivo de um estranho no aparelho de leitura do Erik, **enviado
    pela conta SMTP dele**. O segundo estrago é o pior dos dois: reputação de
    remetente não volta com correção.

    O padrão do `.env` continua servindo a quem TEM dono e não cadastrou
    aparelho — ali há uma pessoa identificada, e é dela o trabalho. Sem dono não
    há ninguém, e "ninguém" não é sinônimo de "o dono da máquina".

    Também marca o último envio no aparelho: é o que permite a tela dizer
    "último envio ontem" sem que alguém mantenha esse campo à mão — e campo de
    estado mantido à mão é a primeira coisa que fica desatualizada.
    """
    from app.models.aparelho import Aparelho

    if not job.dono_id:
        # 403 e não 404: a chave do trabalho é válida e provou o que tinha de
        # provar — quem a tem alcança o arquivo. O que falta não é acesso, é
        # para onde mandar, e esconder isso deixaria quem converteu sem conta
        # sem entender por que o botão não funciona.
        raise HTTPException(
            status_code=403,
            detail=(
                "Enviar ao Kindle pede conta: é ela que diz para qual aparelho. "
                "Entre e ligue um Kindle em Conta › Aparelhos."
            ),
        )
    a = (
        db.query(Aparelho)
        .filter(Aparelho.pessoa_id == job.dono_id, Aparelho.principal.is_(True))
        .first()
    )
    if a is None:
        return None
    from app.models.pessoa import agora as _agora

    a.ultimo_envio = _agora()
    return a.endereco


def _leitura_url(record: ProcessingJob) -> str | None:
    """O endereço para ABRIR o livro, montado aqui e não na tela.

    O arquivo se chama `{slug}.epub`, com o slug derivado do título — a tela não
    tem como adivinhar isso, e passar a saber seria a tela conhecer o layout do
    storage do servidor. É o mesmo princípio que `cover_url` já seguia.

    Devolve `None` enquanto a conversão não terminou, e a distinção importa: uma
    URL que existe mas ainda não responde faz a tela abrir um leitor vazio, em
    vez de dizer que o livro ainda está sendo preparado.
    """
    from pathlib import Path

    if not record.epub_path or not record.token_publico:
        return None

    # A VERSAO WEB QUANDO ELA EXISTE. Ela tem as mesmas paginas com as imagens em
    # WebP — 59% menores nas medidas feitas com imagens reais — e o navegador
    # baixa o EPUB INTEIRO antes de mostrar a primeira linha, entao o peso das
    # imagens e espera na abertura, e nao so trafego.
    #
    # O `epub_path` continua sendo o que vai para o Kindle: a escolha e por
    # DESTINO, e nao por preferencia. O Kindle nao le WebP de forma confiavel.
    arquivo = record.epub_web_path or record.epub_path
    return _url_de_saida(record, arquivo)


def _url_de_saida(record: ProcessingJob, arquivo: str) -> str | None:
    """A URL de um arquivo em `output/{id}` — e `None` quando ele não está lá.

    A METADE QUE FALTAVA DA CLASSE DA CAPA. Em 04/09 os cinco emissores de capa
    passaram a conferir o disco (`services/capa_service.py`); estes dois não, e
    ficaram certos por acidente: a migração de caminhos arrumou o que estava
    quebrado, então hoje os catorze `leitura_url` apontam para arquivos que
    existem. Amanhã não é garantido — a limpeza por idade e um disco cheio
    fazem sumir sem avisar ninguém.

    O `_leitura_url` já tinha a lição escrita no próprio docstring: "uma URL que
    existe mas ainda não responde faz a tela abrir um leitor vazio, em vez de
    dizer que o livro ainda está sendo preparado". Ele guardava contra o
    `epub_path` estar VAZIO, que é o campo do banco, e não contra o arquivo
    estar AUSENTE, que é o disco. São perguntas diferentes.

    O caminho é montado pelo NOME do arquivo e pelo token, e não pelo caminho
    guardado: o token é o que a rota `/storage/output/{ref}/…` sabe resolver.
    Conferir, porém, é em `output/{id}` — é lá que o arquivo mora.
    """
    from app.core.config import STORAGE_OUTPUT

    nome = Path(arquivo).name
    if not (STORAGE_OUTPUT / str(record.id) / nome).exists():
        return None
    return f"/storage/output/{record.token_publico}/{nome}"


def _bytes_de(caminho) -> int | None:
    """O tamanho de um arquivo, ou `None` se ele não estiver lá.

    `None` e não zero: zero seria o produto afirmando que o EPUB é vazio, e a
    tela mostraria "0 B" ao lado do nome de um arquivo que existe.
    """
    try:
        return Path(caminho).stat().st_size
    except OSError:
        return None


def _epub_url(record: ProcessingJob) -> str | None:
    """O endereço para BAIXAR o EPUB — e é outro arquivo que o de ler.

    `_leitura_url` devolve a versão web quando ela existe, com as imagens em
    WebP: ela é 59% menor e abre mais rápido no navegador, e o Kindle não lê
    WebP de forma confiável. Quem baixa está levando o arquivo para um aparelho,
    então baixa o `epub_path` — o mesmo que vai por e-mail.

    Ter uma função só, e a tela escolhendo, faria a escolha por DESTINO virar
    escolha da tela — e a tela não sabe para onde o arquivo vai.
    """
    from pathlib import Path

    if not record.epub_path or not record.token_publico:
        return None
    return _url_de_saida(record, record.epub_path)


def _to_history(record: ProcessingJob) -> dict:
    data = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    data["upload_id"] = data.pop("id")
    # Coerce None → "" para campos str que podem ser NULL em registros antigos.
    # O @field_validator do HistoryEntry cobre o mesmo conjunto, mas coerção na
    # origem evita ResponseValidationError independente da versão Pydantic/FastAPI.
    _sem_buracos(data)

    # A capa vira URL aqui, e não no cliente. O caminho em disco é detalhe do
    # servidor; a estante só precisa de algo que possa pôr num <img>.
    #
    # Sem capa escolhida, a primeira página serve — um livro sem capa nenhuma na
    # estante parece defeito, e a primeira página é o que o leitor reconhece.
    # A CAPA SAI DE UM LUGAR SÓ, E ELE CONFERE O ARQUIVO.
    #
    # Aqui a URL era montada de `page_count` + token sem olhar o disco, e o
    # mesmo era feito em `busca.py`, `estudos.py` e `canvas.py` — cinco
    # emissores, nenhum conferindo. Medido em 04/09: 32 de 37 trabalhos com
    # `cover_url` não-nulo e dois diretórios em `storage/temp`.
    #
    # `capa_service.url` devolve `None` sem arquivo, e aí a tela usa o
    # `.capa-vazia` — que existe no CSS desde sempre e nunca tinha sido
    # alcançado, porque `cover_url` nunca era nulo.
    data["cover_url"] = capa_service.url(record)
    data["endereco"] = record.token_publico
    data["leitura_url"] = _leitura_url(record)
    return data


def _get_or_404(db: Session, job_id: int) -> ProcessingJob:
    record = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return record


# ---------------------------------------------------------------------------
# Engine factory — seleciona a engine de tradução correta
# ---------------------------------------------------------------------------

def _build_engine(engine_name: str, cfg: dict):
    """
    Instancia a engine de tradução a partir do nome e configuração.

    Parâmetros
    ----------
    engine_name : str
        "argos" ou "nllb"
    cfg : dict
        Configuração da aplicação (load_app_config()).

    A DECISÃO MORA NO SERVIÇO desde 08/09 — `translation_engine.criar_motor`.
    Esta função fica como o nome que os cinco chamadores daqui já usam, e como o
    que o `comic_quick.py` importava; o que ela não é mais é o lugar onde a
    escolha acontece.
    """
    from app.services.translation_engine import criar_motor

    return criar_motor(engine_name, cfg)


# ---------------------------------------------------------------------------
# Background tasks — rodam fora da request com sessão de banco própria
# ---------------------------------------------------------------------------

def _perfil_do_aparelho(db: Session, job: ProcessingJob) -> str | None:
    """O perfil de tela do Kindle PARA ONDE ESTE ARQUIVO VAI.

    Até 02/09/2026 o quadrinho saía no `kcc_profile` da INSTALAÇÃO — um valor só,
    para todo mundo —, e quem tem um Oasis recebia páginas montadas para um
    Paperwhite. O Erik decidiu que o produto pergunta qual Kindle é, e é esta
    função que transforma a resposta em consequência.

    Usa o aparelho PRINCIPAL: é para ele que o envio vai quando ninguém escolhe
    outro. Sem dono, sem aparelho, ou sem modelo declarado, devolve `None` — e
    quem chama fica com o padrão da instalação, exatamente como era.
    """
    if not job.dono_id:
        return None
    from app.models.aparelho import Aparelho
    from app.services.kindles import perfil_do_kcc

    a = (
        db.query(Aparelho)
        .filter(Aparelho.pessoa_id == job.dono_id, Aparelho.principal.is_(True))
        .first()
    )
    return perfil_do_kcc(a.modelo) if a else None


def _bg_analyze(job_id: int, operation_id: str | None = None) -> None:
    """Executa análise + OCR em segundo plano.

    Quadrinhos (processing_mode='comic') são marcados como analisados imediatamente
    sem análise de texto — o pipeline KCC não precisa de extração textual.

    AS ETAPAS SÃO RELATADAS. Não há contagem de página: o `analyze_pdf` lê o
    arquivo inteiro numa passada e o `ocrmypdf` é uma chamada externa só. O que
    dá para dizer com verdade é QUAL etapa está acontecendo — e é o que a tela
    precisa para parar de mostrar uma linha imóvel por minutos.
    """
    import time
    from app.db.database import SessionLocal
    from app.services.app_config_service import load_app_config
    from app.services.progress_service import cancel_requested, end_operation, report_progress

    db = SessionLocal()
    t0 = time.monotonic()
    op_dir = STORAGE_OUTPUT / str(job_id)
    op_status = "completed"

    def passo(nome: str, recado: str) -> None:
        """Diz em que etapa está. `total=None` é indeterminado honesto: nem o
        `analyze_pdf` nem o `ocrmypdf` contam páginas para fora."""
        if operation_id:
            report_progress(op_dir, operation_id, nome, 0, None, recado)

    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        # Quadrinhos não requerem análise textual
        if job.processing_mode == 'comic':
            job.status = 'analyzed'
            job.updated_at = datetime.utcnow()
            db.commit()
            from app.services.metrics_service import record_stage
            record_stage(job_id, "analyze", "completed",
                         duration_ms=(time.monotonic() - t0) * 1000,
                         processing_mode=job.processing_mode, input_format=job.input_format)
            return

        thumbnails_dir = STORAGE_TEMP / str(job_id)
        passo("analyze", "Lendo o arquivo e contando as páginas")
        result = analyze_pdf(job.input_path, thumbnails_dir)

        # A CAPA SAI DE `temp` ASSIM QUE EXISTE.
        #
        # `analyze_pdf` acabou de escrever `page_0..4.png` em `temp/{id}`, que é
        # a pasta que `cleanup_old_jobs` apaga por idade. A estante que mostra a
        # capa é permanente. Promover aqui é o que põe as duas do mesmo lado.
        #
        # Antes de `page_count` ser gravado no registro: `_origem` cai na
        # página 0 quando não há escolha, e não precisa da contagem para isso.
        capa_service.promover(job)

        # O ARQUIVO QUE ESPERA VOCÊ — "Precisa de você", do nó 895:9348.
        #
        # A análise para aqui e o trabalho fica marcado como bloqueado, em vez
        # de seguir e falhar mais adiante com uma mensagem que não ajuda em
        # nada. Sem título, sem contagem de páginas, sem miniatura: nada disso
        # dá para ler sem a senha, e inventar qualquer um deles seria pior que
        # deixar em branco.
        if result.get("needs_password"):
            # A operação fecha no `finally`; aqui só o estado do trabalho.
            job.bloqueio = "senha"
            job.status = "analyzed"
            job.updated_at = datetime.utcnow()
            db.commit()
            from app.services.metrics_service import record_stage
            record_stage(job_id, "analyze", "completed",
                         duration_ms=(time.monotonic() - t0) * 1000,
                         processing_mode=job.processing_mode, input_format=job.input_format)
            return

        detected_title = result["title"] or (
            Path(job.original_filename).stem
            .replace("_", " ")
            .replace("-", " ")
            .title()
        )

        job.detected_title = detected_title
        job.detected_author = result["author"]
        job.detected_language = result["language"]
        job.final_title = detected_title
        job.final_author = result["author"]
        job.final_language = result["language"] or "por"
        job.final_filename = Path(job.original_filename).stem
        job.page_count = result["page_count"]
        job.is_scanned = result["is_scanned"]
        job.avg_chars_per_page = result["avg_chars_per_page"]
        job.paginas_ilegiveis = result.get("paginas_ilegiveis")
        job.paginas_sem_texto = result.get("paginas_sem_texto")
        job.capitulos_declarados = result.get("capitulos_declarados")
        job.ocr_status = "needed" if result["is_scanned"] else "not_needed"
        job.status = "analyzed"

        if result["is_scanned"]:
            from app.services.ocr_service import OCRFailedError, apply_ocr

            # A ETAPA MAIS LONGA DO PRODUTO, e a que passava calada. O
            # reconhecimento é uma chamada externa só, sem retorno por página —
            # o que dá para dizer é que ela começou, e que não há estimativa.
            passo("ocr", "Reconhecendo o texto das páginas (sem estimativa)")

            cfg = load_app_config()
            ocr_out = STORAGE_TEMP / str(job_id) / f"{Path(job.input_path).stem}_ocr.pdf"
            try:
                apply_ocr(Path(job.input_path), ocr_out, languages=cfg["ocr_languages"])
                job.processed_pdf_path = str(ocr_out)
                job.ocr_used = True
                job.ocr_status = "done"
            except OCRFailedError as exc:
                job.ocr_used = False
                job.ocr_status = "failed"
                job.error_message = f"OCR falhou: {exc}"

        job.updated_at = datetime.utcnow()
        db.commit()
        from app.services.metrics_service import record_stage
        record_stage(job_id, "analyze", "completed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     processing_mode=job.processing_mode, input_format=job.input_format)

    except Exception as exc:
        try:
            job.status = "error"
            job.error_message = f"Erro na análise do PDF: {exc}"
            job.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            pass
        from app.services.metrics_service import record_stage
        record_stage(job_id, "analyze", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])
        op_status = "failed"
    finally:
        # A OPERAÇÃO PRECISA FECHAR SEMPRE. Se ela ficar aberta, o job continua
        # ocupado e a próxima chamada responde 409 para sempre — é o mesmo
        # cuidado que a conversão já tinha.
        try:
            if operation_id:
                job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
                if job:
                    end_operation(job, op_dir, operation_id, op_status)
                    db.commit()
        except Exception:
            pass
        db.close()


def _bg_convert(job_id: int, operation_id: str | None = None) -> None:
    """Executa conversão para EPUB em segundo plano."""
    import time
    from app.db.database import SessionLocal
    from app.services.progress_service import cancel_requested, end_operation, report_progress

    db = SessionLocal()
    t0 = time.monotonic()
    op_dir = STORAGE_OUTPUT / str(job_id)
    op_status = "completed"
    job = None
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        # CANCELAR A CONVERSÃO precisa de alguém perguntando, e até 07/09 não
        # havia ninguém. As outras três operações longas — tradução, tradução de
        # quadrinho e exportação — chamam `raise_if_cancelled` dentro do laço de
        # progresso delas. A conversão não tem laço: é uma chamada só ao
        # Calibre, que pode levar minutos. A marca de cancelamento era escrita
        # no disco e ninguém a lia.
        #
        # Então o gancho desce até o `run_external`, que já sabia matar o grupo
        # de processos — só não sabia POR QUE fazer isso antes do timeout.
        def _pediram_parada() -> bool:
            return bool(operation_id) and cancel_requested(op_dir, operation_id)

        # Fallback chain: HTML traduzido → PDF com OCR → arquivo original
        input_pdf = Path(job.translated_artifact_path or job.processed_pdf_path or job.input_path)  # type: ignore[arg-type]
        slug = job.final_filename or Path(job.original_filename).stem
        output_epub = STORAGE_OUTPUT / str(job_id) / f"{slug}.epub"
        cover = Path(job.cover_path) if job.cover_path else None

        if operation_id:
            # ebook-convert é processo externo: indeterminado honesto
            report_progress(op_dir, operation_id, "convert", 0, None,
                            "Convertendo via Calibre (sem estimativa)")

        try:
            convert_to_epub(
                input_path=input_pdf,
                output_epub=output_epub,
                title=job.final_title or job.detected_title or "Sem título",
                author=job.final_author or job.detected_author or "Desconhecido",
                language=job.final_language or "por",
                cover=cover,
                deve_parar=_pediram_parada,
            )
            job.epub_path = str(output_epub)
            job.epub_bytes = _bytes_de(output_epub)
            job.epub_web_path = _versao_web(output_epub)
            job.status = "converted"
            job.conversion_status = "done"

        except ConversionCancelled:
            # CANCELAR NÃO É FALHAR — decisão do Erik em 07/09, item por item:
            #
            #   artefato parcial      o EPUB truncado já foi apagado pelo
            #                         `convert_service`, que é quem sabe o nome
            #                         dele
            #   arquivo original      não se toca em `input_path`
            #   análise e escolhas    `final_title`, `final_author`,
            #                         `processed_pdf_path`, o artefato traduzido
            #                         e a capa ficam todos onde estavam — o que
            #                         a pessoa decidiu antes de mandar converter
            #                         continua decidido
            #   estado                volta a "analyzed", que é exatamente o
            #                         ponto em que `POST /convert` aceita de
            #                         novo. Preparar outra vez não repete a
            #                         análise
            #   fica na Mesa          "analyzed" não é "pronto", e a Estante só
            #                         lista pronto desde 07/09. O arquivo volta
            #                         a aparecer onde estava
            #   não vira erro         `error_message` é limpo, e não escrito
            op_status = "cancelled"
            job.status = "analyzed"
            job.conversion_status = "not_started"
            job.error_message = None
            job.epub_path = None
            job.epub_bytes = None
            job.epub_web_path = None
            from app.services.metrics_service import record_stage
            record_stage(job_id, "convert", "cancelled",
                         duration_ms=(time.monotonic() - t0) * 1000,
                         processing_mode=job.processing_mode, input_format=job.input_format)

        except ConversionFailedError as exc:
            op_status = "failed"
            job.status = "error"
            job.conversion_status = "failed"
            job.error_message = f"Conversão falhou: {exc}"
            from app.services.metrics_service import record_stage
            record_stage(job_id, "convert", "failed",
                         duration_ms=(time.monotonic() - t0) * 1000,
                         processing_mode=job.processing_mode, input_format=job.input_format,
                         error_type=type(exc).__name__, error_message=str(exc)[:500])

        else:
            from app.services.metrics_service import record_stage
            record_stage(job_id, "convert", "completed",
                         duration_ms=(time.monotonic() - t0) * 1000,
                         processing_mode=job.processing_mode, input_format=job.input_format)

        job.updated_at = datetime.utcnow()
        db.commit()

    except Exception as exc:
        op_status = "failed"
        try:
            job.status = "error"
            job.conversion_status = "failed"
            job.error_message = f"Erro inesperado na conversão: {exc}"
            job.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            pass
        from app.services.metrics_service import record_stage
        record_stage(job_id, "convert", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])
    finally:
        try:
            if job and operation_id:
                end_operation(job, op_dir, operation_id, op_status)
                db.commit()
        except Exception:
            pass
        db.close()


def _bg_translate(job_id: int, operation_id: str | None = None) -> None:
    """Executa o pipeline de tradução textual em segundo plano."""
    import time
    from app.db.database import SessionLocal
    from app.services.app_config_service import load_app_config
    from app.services.progress_service import (
        OperationCancelled,
        end_operation,
        raise_if_cancelled,
        report_progress,
    )
    from app.services.translation_engine import (
        EngineNotInstalledError,
        LanguagePairNotAvailableError,
    )
    from app.services.translation_service import run_translation_pipeline

    db = SessionLocal()
    job = None
    t0 = time.monotonic()
    op_status = "completed"
    op_dir = STORAGE_OUTPUT / str(job_id)
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        cfg = load_app_config()
        engine_name = job.translator_engine or cfg.get("translator_engine_default", "argos") or "argos"
        engine = _build_engine(engine_name, cfg)
        input_path = Path(job.processed_pdf_path or job.input_path)  # type: ignore[arg-type]
        stem = Path(job.input_path).stem if job.input_path else f"job_{job_id}"
        output_html = STORAGE_TEMP / str(job_id) / f"{stem}_translated.html"

        def _cb(stage: str, current: int, total: int | None = None, message: str | None = None) -> None:
            if operation_id:
                raise_if_cancelled(op_dir, operation_id)
                report_progress(op_dir, operation_id, stage, current, total, message)

        run_translation_pipeline(
            input_path=input_path,
            input_format=job.input_format or "txt",
            source_language=job.source_language or "por",
            target_language=job.target_language or "eng",
            engine=engine,
            output_html_path=output_html,
            progress_callback=_cb if operation_id else None,
        )
        job.translated_artifact_path = str(output_html)
        job.translated_artifact_format = "html"
        job.translation_status = "done"
        from app.services.metrics_service import record_stage
        record_stage(job_id, "translate", "completed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     processing_mode=job.processing_mode, input_format=job.input_format,
                     translator_engine=engine_name)

    except OperationCancelled:
        op_status = "cancelled"
        if job:
            job.translation_status = "not_started"
            job.translation_error = None

    except (EngineNotInstalledError, LanguagePairNotAvailableError) as exc:
        op_status = "failed"
        if job:
            job.translation_status = "failed"
            job.translation_error = str(exc)
        from app.services.metrics_service import record_stage
        record_stage(job_id, "translate", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    except Exception as exc:
        op_status = "failed"
        if job:
            try:
                job.translation_status = "failed"
                job.translation_error = f"Erro inesperado na tradução: {exc}"
            except Exception:
                pass
        from app.services.metrics_service import record_stage
        record_stage(job_id, "translate", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    finally:
        try:
            if job and operation_id:
                end_operation(job, op_dir, operation_id, op_status)
            if job:
                job.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            pass
        db.close()


def _bg_comic_convert(job_id: int, operation_id: str | None = None) -> None:
    """Converte quadrinho/mangá via KCC em segundo plano."""
    import time
    from app.db.database import SessionLocal
    from app.services.app_config_service import load_app_config
    from app.services.kcc_service import KccConversionFailedError, KccNotInstalledError, convert_comic
    from app.services.progress_service import end_operation, report_progress

    db = SessionLocal()
    t0 = time.monotonic()
    op_status = "completed"
    job = None
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        config = load_app_config()
        profile = _perfil_do_aparelho(db, job) or config.get('kcc_profile', 'KPW5')
        output_dir = STORAGE_OUTPUT / str(job_id)

        if operation_id:
            # KCC é processo externo: indeterminado honesto
            report_progress(output_dir, operation_id, "comic_convert", 0, None,
                            "Convertendo o original via KCC (sem estimativa)")

        epub_out = convert_comic(
            Path(job.input_path),
            output_dir,
            profile=profile,
            manga_mode=bool(job.comic_mode),
            rtl=bool(job.manga_rtl),
        )

        job.epub_path = str(epub_out)
        job.epub_bytes = _bytes_de(epub_out)
        # QUADRINHO NAO GANHA VERSAO WEB. Ele ja e imagem de ponta a ponta, e o
        # KCC escolheu formato e tamanho para o aparelho: reconverter aqui
        # desfaria a decisao dele, e o ganho viria as custas da propria coisa
        # que o leitor de quadrinho olha.
        job.final_filename = epub_out.stem
        job.status = "converted"
        job.conversion_status = "done"
        from app.services.metrics_service import record_stage
        record_stage(job_id, "comic_convert", "completed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     processing_mode=job.processing_mode, input_format=job.input_format)

    except (KccConversionFailedError, KccNotInstalledError) as exc:
        op_status = "failed"
        job.status = "error"
        job.conversion_status = "failed"
        job.error_message = str(exc)
        from app.services.metrics_service import record_stage
        record_stage(job_id, "comic_convert", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    except Exception as exc:
        op_status = "failed"
        try:
            job.status = "error"
            job.conversion_status = "failed"
            job.error_message = f"Erro inesperado na conversão de quadrinhos: {exc}"
        except Exception:
            pass
        from app.services.metrics_service import record_stage
        record_stage(job_id, "comic_convert", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    finally:
        try:
            if job and operation_id:
                end_operation(job, STORAGE_OUTPUT / str(job_id), operation_id, op_status)
            if job:
                job.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            pass
        db.close()


# ---------------------------------------------------------------------------
# Background task — tradução experimental de quadrinhos (Fase D)
# ---------------------------------------------------------------------------

def _bg_comic_translate(job_id: int, operation_id: str | None = None) -> None:
    """Executa o pipeline de OCR + tradução por página em segundo plano (Fase D)."""
    import time
    from app.db.database import SessionLocal
    from app.services.app_config_service import load_app_config
    from app.services.comic_translation_service import run_comic_translation_pipeline
    from app.services.progress_service import (
        OperationCancelled,
        end_operation,
        raise_if_cancelled,
        report_progress,
    )
    from app.services.translation_engine import (
        EngineNotInstalledError,
        LanguagePairNotAvailableError,
    )

    db = SessionLocal()
    job = None
    t0 = time.monotonic()
    op_status = "completed"
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        cfg = load_app_config()
        engine_name = job.translator_engine or cfg.get("translator_engine_default", "argos") or "argos"
        engine = _build_engine(engine_name, cfg)

        output_dir = STORAGE_OUTPUT / str(job_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        # P4 — progresso por página + cancelamento cooperativo
        def _cb(stage: str, current: int, total: int | None = None, message: str | None = None) -> None:
            if operation_id:
                raise_if_cancelled(output_dir, operation_id)
                report_progress(output_dir, operation_id, stage, current, total, message)

        json_path, _ = run_comic_translation_pipeline(
            job_id=job_id,
            input_path=job.input_path or "",
            input_format=job.input_format or "",
            source_lang=job.source_language or "por",
            target_lang=job.target_language or "eng",
            engine=engine,
            output_dir=output_dir,
            progress_callback=_cb if operation_id else None,
        )

        job.comic_translation_status = "done"
        job.comic_translation_artifact_path = str(json_path)
        job.comic_translation_artifact_format = "json"
        from app.services.metrics_service import record_stage
        record_stage(job_id, "comic_translate", "completed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     processing_mode=job.processing_mode, input_format=job.input_format,
                     translator_engine=engine_name)

    except OperationCancelled:
        op_status = "cancelled"
        if job:
            # Cancelado: artefatos parciais preservados, job liberado para retry
            job.comic_translation_status = "not_started"
            job.comic_translation_error = None

    except (EngineNotInstalledError, LanguagePairNotAvailableError, RuntimeError) as exc:
        op_status = "failed"
        if job:
            job.comic_translation_status = "failed"
            job.comic_translation_error = str(exc)
        from app.services.metrics_service import record_stage
        record_stage(job_id, "comic_translate", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    except Exception as exc:
        op_status = "failed"
        if job:
            try:
                job.comic_translation_status = "failed"
                job.comic_translation_error = f"Erro inesperado: {exc}"
            except Exception:
                pass
        from app.services.metrics_service import record_stage
        record_stage(job_id, "comic_translate", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    finally:
        try:
            if job and operation_id:
                end_operation(job, STORAGE_OUTPUT / str(job_id), operation_id, op_status)
            if job:
                job.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            pass
        db.close()


# ---------------------------------------------------------------------------
# POST /upload — recebe o arquivo e cria o registro inicial
# ---------------------------------------------------------------------------


def _versao_web(epub: Path) -> Optional[str]:
    """Gera o EPUB de imagens em WebP, e NUNCA derruba a conversão por isso.

    A versão web é um ganho de rede, não um requisito: se ela falhar, o livro
    continua pronto, enviável e legível. Deixar essa etapa propagar exceção
    transformaria uma otimização em causa de falha de conversão — que é trocar o
    fim pelo meio.
    """
    try:
        r = gerar_epub_web(epub)
    except Exception:
        logger.warning("versão web do EPUB não gerada", exc_info=True)
        return None
    if r.caminho is None:
        return None
    logger.info(
        "EPUB web: %d imagens, %d convertidas, %.0f%% menor nas imagens",
        r.imagens, r.convertidas, r.economia * 100,
    )
    return str(r.caminho)


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=201,
    # Converter sem conta é garantido pela DEC-0018, e por isso esta rota fica
    # aberta. Aberta e sem teto de QUANTIDADE, ela era o caminho para encher o
    # disco da máquina — 600 MB por vez, quantas vezes quisessem.
    dependencies=[Depends(limitar_envios)],
)
async def upload_file(
    file: UploadFile = File(...),
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """
    Salva o arquivo em storage/input/ e cria o registro no banco.
    Aceita PDF, DOCX, ODT, RTF, TXT, HTML, EPUB, CBZ, CBR, CB7 e CBC.
    Retorna o upload_id para uso nos endpoints seguintes.
    """
    from app.services.upload_safety import (
        UploadRejectedError,
        sanitize_original_filename,
        server_controlled_path,
        stream_to_disk,
    )

    # 1. Sanitização do filename (rejeita vazio/oculto/traversal/controle)
    try:
        safe_name = sanitize_original_filename(file.filename)
    except UploadRejectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # 2. Allowlist de extensão
    if not is_accepted(safe_name):
        ext = Path(safe_name).suffix.lower()
        raise HTTPException(
            status_code=400,
            detail=f"Formato '{ext or 'desconhecido'}' não suportado. "
                   "Formatos aceitos: PDF, DOCX, ODT, RTF, TXT, HTML, EPUB, CBZ, CBR, CB7, CBC.",
        )

    fmt = detect_input_format(safe_name)
    mode = detect_processing_mode(safe_name)

    # Se houver alguém logado, o trabalho nasce dela. Se não houver, nasce sem
    # dono — e isso NÃO é um caso degradado: a DEC-0018 fixou que converter não
    # exige conta, e a DEC-0039 §2 manteve. O que protege o trabalho sem dono é
    # o endereço público, não a conta.
    from app.services import acesso_service

    pessoa = acesso_service.quem_e(db, mekora_sessao)

    # 3. Cria o job (original_filename = nome exibível; nome no disco é derivado)
    job = ProcessingJob(
        dono_id=pessoa.id if pessoa else None,
        original_filename=safe_name,
        status="uploaded",
        input_format=fmt,
        processing_mode=mode,
        # Jobs comic NOVOS nascem no modo Recomendado (P3);
        # jobs existentes preservam 'advanced' (default da coluna)
        flow_mode="recommended" if mode == "comic" else "advanced",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Lazy access — testes fazem monkeypatch em app.core.config.STORAGE_INPUT,
    # e importar aqui garante que o valor corrente é usado a cada request
    from app.core.config import STORAGE_INPUT as _STORAGE_INPUT
    _STORAGE_INPUT.mkdir(parents=True, exist_ok=True)
    dest = server_controlled_path(_STORAGE_INPUT, job.id, safe_name)

    # 4. Streaming write com limite + magic bytes + cleanup em falha
    try:
        await stream_to_disk(file, dest, fmt)
    except UploadRejectedError as exc:
        # Não deixar registro fantasma no banco
        db.delete(job)
        db.commit()
        code_to_http = {
            "UPLOAD_TOO_LARGE": 413,
            "FORMAT_MISMATCH": 400,
            "UPLOAD_EMPTY": 400,
            "UPLOAD_DEST_EXISTS": 409,
        }
        raise HTTPException(
            status_code=code_to_http.get(exc.code, 400),
            detail=str(exc),
        )

    job.input_path = str(dest)
    # O TAMANHO É LIDO AGORA, que é o único momento em que o arquivo existe com
    # certeza: a limpeza por idade apaga o input e deixa o EPUB, e a partir daí
    # o disco não sabe mais responder.
    try:
        job.input_bytes = dest.stat().st_size
    except OSError:
        job.input_bytes = None
    job.updated_at = datetime.utcnow()
    db.commit()

    from app.services.metrics_service import record_stage
    record_stage(job.id, "upload", "completed",
                 processing_mode=job.processing_mode, input_format=job.input_format)

    return {
        "upload_id": job.id,
        "filename": file.filename,
        "status": job.status,
        "endereco": job.token_publico,
    }


# ---------------------------------------------------------------------------
# GET /analyze/{upload_id} — executa ou retorna análise em cache
# ---------------------------------------------------------------------------

@router.get("/analyze/{upload_id}", response_model=JobResponse)
async def analyze_upload(
    upload_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Dispara análise em segundo plano (BackgroundTask) e retorna imediatamente.
    Se já foi processado, retorna o estado atual em cache (idempotente).
    O frontend deve fazer polling em GET /jobs/{id}/status até o status sair de "analyzing".

    Quadrinhos (processing_mode='comic') são marcados como analisados imediatamente
    sem análise textual — o pipeline KCC não precisa disso.
    """
    job = _get_or_404(db, upload_id)

    if job.status != "uploaded":
        return _to_job(job)

    if not job.input_path or not Path(job.input_path).exists():
        raise HTTPException(status_code=422, detail="Arquivo não encontrado no servidor.")

    # A ANÁLISE VIRA UMA OPERAÇÃO, como a conversão já era.
    #
    # Ela é a espera MAIS LONGA do produto e era a que menos dizia: o
    # reconhecimento de texto roda aqui dentro, não na conversão, e um PDF
    # digitalizado de trezentas páginas ficava minutos numa tela que dizia
    # "Analisando o arquivo…" e mais nada. Sem etapa, sem relógio, sem cancelar.
    #
    # Com `operation_id` ela ganha as três coisas de graça: o mesmo `progresso`
    # que a tela de preparo já sabe desenhar, e o mesmo botão de cancelar.
    op_id = _begin_job_operation(job, "analyze")
    job.status = "analyzing"
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_bg_analyze, upload_id, op_id)
    return _to_job(job)


# ---------------------------------------------------------------------------
# GET /history — lista todos os jobs em ordem cronológica inversa
# ---------------------------------------------------------------------------

@router.get("/history", response_model=list[HistoryEntry])
def get_history(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> list[dict]:
    """A estante de quem está pedindo — e só dela.

    Antes de 30/08 isto listava TODOS os processamentos registrados, o que era
    correto num produto de uma pessoa só rodando na própria máquina. No ar, com
    conta, listar tudo entregaria a estante de todo mundo a qualquer visitante —
    e diferente do endereço dos arquivos, aqui nem seria preciso adivinhar nada.

    Sem sessão a lista vem vazia, e não com os trabalhos sem dono. Trabalho sem
    dono pertence a quem tem o endereço dele, não a quem chegou primeiro.
    """
    from app.services import acesso_service

    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return []

    records = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.dono_id == pessoa.id)
        .order_by(ProcessingJob.created_at.desc())
        .all()
    )
    return [{**_to_history(r), **_leitura_de(db, r)} for r in records]


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/metadata — persiste metadados editados pelo usuário
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/metadata", response_model=JobResponse)
def update_metadata(
    job_id: int,
    body: MetadataUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """
    Atualiza título, autor, idioma e nome final do arquivo.
    Aceita campos parciais — campos omitidos não são alterados.
    """
    job = _get_or_404(db, job_id)

    if body.final_title is not None:
        job.final_title = body.final_title
    if body.final_author is not None:
        job.final_author = body.final_author
    if body.final_language is not None:
        job.final_language = body.final_language
    if body.final_filename is not None:
        job.final_filename = body.final_filename

    # Modo de fluxo (P3) — trocar NUNCA apaga artefatos
    if body.flow_mode is not None:
        if body.flow_mode not in ("recommended", "advanced"):
            raise HTTPException(
                status_code=400,
                detail="flow_mode deve ser 'recommended' ou 'advanced'.",
            )
        job.flow_mode = body.flow_mode

    # Campos de quadrinhos / override de modo (Fase A)
    if body.comic_mode is not None:
        job.comic_mode = body.comic_mode
    if body.manga_rtl is not None:
        job.manga_rtl = body.manga_rtl
    if body.processing_mode is not None:
        if body.processing_mode not in ('document', 'comic'):
            raise HTTPException(
                status_code=400,
                detail="processing_mode deve ser 'document' ou 'comic'.",
            )
        job.processing_mode = body.processing_mode
        # Ao trocar para modo quadrinhos, o pipeline OCR/documento não se aplica.
        # Limpar erros de OCR para não poluir a UI do pipeline comic.
        if body.processing_mode == 'comic':
            if job.error_message and 'OCR' in job.error_message:
                job.error_message = None
            if job.ocr_status in ('failed', 'needed'):
                job.ocr_status = 'not_needed'

    # Campos de tradução (Fase B / C)
    if body.translation_enabled is not None:
        job.translation_enabled = body.translation_enabled
    if body.source_language is not None:
        job.source_language = body.source_language
    if body.target_language is not None:
        job.target_language = body.target_language
    if body.translator_engine is not None:
        job.translator_engine = body.translator_engine

    # Tradução de quadrinhos (Fase D) — campo existia no schema mas nunca era
    # persistido pelo endpoint (bugfix Estabilização v1)
    if body.comic_translation_enabled is not None:
        job.comic_translation_enabled = body.comic_translation_enabled

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return _to_job(job)


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/cover — persiste a miniatura escolhida como capa
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/cover", response_model=JobResponse)
def update_cover(
    job_id: int,
    body: CoverUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """
    Seleciona qual miniatura (índice 0–4) será usada como capa do EPUB.
    Salva o caminho local da imagem em cover_path.
    """
    job = _get_or_404(db, job_id)

    if body.selected_cover_page is not None:
        if not (0 <= body.selected_cover_page <= 4):
            raise HTTPException(
                status_code=400,
                detail="O índice de página deve estar entre 0 e 4.",
            )
        job.selected_cover_page = body.selected_cover_page
        # `cover_path` PASSA A APONTAR PARA O PERMANENTE.
        #
        # Ele era o caminho dentro de `temp/{id}`, e é o que a conversão manda
        # para o Calibre (`cover = Path(job.cover_path)`, mais acima). Depois da
        # limpeza por idade esse caminho some, e uma reconversão perdia a capa
        # em silêncio. Promovido, ele aponta para onde o arquivo fica.
        promovida = capa_service.promover(job)
        if promovida is not None:
            job.cover_path = str(promovida)

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return _to_job(job)


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/status — resposta leve para polling de progresso
# ---------------------------------------------------------------------------

def _begin_job_operation(job: ProcessingJob, operation_type: str) -> str:
    """
    Registra operação exclusiva no job (P4). Recupera órfãs; 409 se ocupada.
    O caller comita a sessão em seguida.
    """
    from app.core.config import STORAGE_OUTPUT as _out  # lazy p/ testes
    from app.services.progress_service import (
        OperationInProgressError,
        begin_operation,
    )
    try:
        return begin_operation(job, _out / str(job.id), operation_type)
    except OperationInProgressError as exc:
        raise HTTPException(status_code=409, detail=exc.payload)


@router.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
def get_job_status(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Retorna apenas os campos de status do job — endpoint leve para polling frequente.
    Inclui `phase` canônica e `progress` da operação ativa (P4).
    """
    from app.core.config import STORAGE_OUTPUT as _out  # lazy p/ testes
    from app.services.job_state_service import derive_phase
    from app.services.progress_service import get_status_progress, recover_orphan_operation

    job = _get_or_404(db, job_id)

    # Recuperação de operação órfã (restart/crash) — nunca 409 eterno
    if recover_orphan_operation(job, _out / str(job_id)):
        job.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(job)

    data = {c.name: getattr(job, c.name) for c in job.__table__.columns}
    data["upload_id"] = data.pop("id")
    # A TERCEIRA VEZ QUE ESTA DEFESA FALTA NUM LUGAR.
    #
    # `_sem_buracos` existe porque um NULL numa coluna que o esquema declara
    # não-nula derruba a resposta INTEIRA com 500 — e o NULL chega por um
    # caminho banal, um registro criado antes de a coluna existir. O `/analyze`
    # já a chamava; o `/status` não, e por isso a tela de preparo respondia "O
    # Mekora não está respondendo agora" para um trabalho que o `/analyze`
    # devolvia sem reclamar.
    _sem_buracos(data)
    data["phase"] = derive_phase(data)
    data["progress"] = get_status_progress(job.active_operation, _out / str(job_id))
    return data


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/operations/{operation_id}/cancel — cancelamento (P4)
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/operations/{operation_id}/cancel")
def cancel_operation(job_id: int, operation_id: str, db: Session = Depends(get_db)) -> dict:
    """
    Solicita cancelamento cooperativo da operação ativa.
    Só a operação registrada em job.active_operation pode ser cancelada.
    Processos externos (KCC/Calibre/OCR) não são interrompidos — limitação documentada.
    """
    from app.core.config import STORAGE_OUTPUT as _out
    from app.services.progress_service import parse_active_operation, request_cancel

    job = _get_or_404(db, job_id)
    parsed = parse_active_operation(job.active_operation)
    if parsed is None or parsed[1] != operation_id:
        raise HTTPException(
            status_code=409,
            detail="Esta operação não está mais ativa para o job.",
        )
    request_cancel(_out / str(job_id), operation_id)
    return {"job_id": job_id, "operation_id": operation_id, "cancel_requested": True}


# ---------------------------------------------------------------------------
# GET /jobs/{job_id} — retorna estado atual do job (sem re-analisar)
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)) -> dict:
    """Retorna todos os dados de um job sem re-executar a análise."""
    return _to_job(_get_or_404(db, job_id))


# ---------------------------------------------------------------------------
# DELETE /jobs/{job_id} — "Remover da estante" (nó 941:23118)
# ---------------------------------------------------------------------------

@router.delete("/jobs/{job_id}", status_code=204)
def remover_da_estante(job_id: int, db: Session = Depends(get_db)) -> None:
    """Apaga o trabalho e os arquivos dele. Não dá para desfazer.

    O desenho diz "O arquivo preparado e o original saem", e é literalmente o
    que acontece: a pasta de saída, a de temporários e o arquivo enviado. A
    linha do banco sai junto, porque um trabalho sem arquivo nenhum na estante é
    uma ficha que abre e não mostra nada.

    AS NOTAS FICAM. A `DEC-0021 §15` manda que a nota sobreviva à exclusão do
    item, com a origem marcada como removida, e a razão é normativa: é trabalho
    intelectual de quem escreveu, e não derivado do arquivo.

    Este docstring dizia o contrário até 03/09 — "AS NOTAS SAEM JUNTO, por
    cascata" —, e documentava o defeito como se fosse regra. O aviso na tela
    também: ele contava quantas notas iam sumir. Os dois foram corrigidos junto
    com o esquema.

    O TÍTULO É COPIADO ANTES DE O LIVRO SUMIR. Depois não há de onde tirá-lo, e
    uma nota que diz "vim de um livro" sem saber de qual é pior que uma que diz
    de onde veio e que aquilo não existe mais. É o molde do `dissolver` do
    Canvas: o contêiner some, o conteúdo fica, e o que sustenta o conteúdo é
    guardado antes.
    """
    job = _get_or_404(db, job_id)

    from app.models.nota import Nota
    from app.models.pessoa import agora

    titulo = job.final_title or job.original_filename or ""
    for n in db.query(Nota).filter(Nota.job_id == job.id).all():
        # O `origem` só é escrito se estiver vazio: a nota do Kindle já traz o
        # título que o Kindle escreveu, e sobrescrevê-lo trocaria o que a pessoa
        # viu por um nome de arquivo.
        if not n.origem:
            n.origem = titulo
        n.origem_removida_em = agora()

    apagar_arquivos_do_trabalho(job)
    db.delete(job)
    db.commit()


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/convert — converte PDF para EPUB via ebook-convert
# ---------------------------------------------------------------------------

class SenhaDoArquivo(BaseModel):
    senha: str


@router.post("/jobs/{job_id}/senha", response_model=JobResponse)
def destravar_com_senha(
    job_id: int,
    corpo: SenhaDoArquivo,
    tarefas: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """A senha do PDF, usada uma vez para tirar a proteção.

    Quem guarda a porta é o `exigir_acesso` do roteador inteiro, em `main.py`:
    toda rota com `job_id` no caminho já passa por ele, e repeti-lo aqui seria
    uma segunda verificação que pode divergir da primeira.

    A SENHA NÃO É GUARDADA. Ela abre o arquivo, o arquivo é regravado sem
    proteção, e a variável morre com a requisição — não vai para o banco, não vai
    para o log, não vai para a métrica. Guardá-la seria criar um cofre de senhas
    de terceiros para resolver um problema que se resolve uma vez.

    E ela não é comparada com nada: quem diz se está certa é o PyMuPDF, ao
    tentar autenticar. Não há como responder "senha errada" sem tentar.
    """
    import fitz

    job = _get_or_404(db, job_id)
    if job.bloqueio != "senha":
        raise HTTPException(status_code=409, detail="Este arquivo não está esperando senha.")
    if not job.input_path or not Path(job.input_path).is_file():
        raise HTTPException(status_code=410, detail="O arquivo original não está mais aqui.")

    doc = fitz.open(job.input_path)
    try:
        if not doc.authenticate(corpo.senha):
            # 403, e não 400: a requisição está bem formada e o servidor a
            # entendeu — o que faltou foi a credencial. E a mensagem não diz
            # nada além disso, porque não há mais nada a dizer.
            raise HTTPException(status_code=403, detail="Essa senha não abre o arquivo.")

        # REGRAVADO SEM PROTEÇÃO, e por cima do original. O caminho continua o
        # mesmo porque tudo aponta para ele — o `_bg_convert`, a limpeza por
        # idade, o apagar da conta. Um segundo arquivo ao lado seria uma cópia
        # protegida sobrando no disco depois de a pessoa ter pedido para
        # destravar.
        aberto = Path(job.input_path).with_suffix(".aberto.pdf")
        doc.save(str(aberto), encryption=fitz.PDF_ENCRYPT_NONE)
    finally:
        doc.close()

    aberto.replace(Path(job.input_path))
    job.input_bytes = _bytes_de(Path(job.input_path))
    job.bloqueio = None
    job.status = "uploaded"
    job.updated_at = datetime.utcnow()
    db.commit()

    # E a análise recomeça do zero: agora há título, páginas e miniaturas para
    # ler, e nada disso foi lido antes.
    tarefas.add_task(_bg_analyze, job_id)
    return _to_job(_get_or_404(db, job_id))


@router.post("/jobs/{job_id}/convert", response_model=JobResponse)
def convert_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Dispara conversão para EPUB em segundo plano e retorna imediatamente.
    O frontend deve fazer polling em GET /jobs/{id}/status até conversion_status sair de "in_progress".
    Permite retry: aceita status "analyzed", "converted" ou "error".
    """
    job = _get_or_404(db, job_id)

    if job.status not in ("analyzed", "converted", "error"):
        raise HTTPException(
            status_code=400,
            detail=f"Job deve estar analisado antes de converter (status atual: {job.status}).",
        )

    if job.is_scanned and job.ocr_status == "failed" and not job.ocr_used:
        raise HTTPException(
            status_code=422,
            detail="OCR falhou neste PDF escaneado. A conversão produziria um EPUB sem texto. Verifique se o Tesseract está instalado.",
        )

    op_id = _begin_job_operation(job, "convert")
    job.status = "converting"
    job.conversion_status = "in_progress"
    job.error_message = None
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_bg_convert, job_id, op_id)
    return _to_job(job)


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/translate — traduz documento textual via Argos Translate
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/translate", response_model=JobResponse)
def translate_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Dispara tradução local em segundo plano.
    A engine é lida de job.translator_engine; fallback: translator_engine_default → "argos".
    Requer processing_mode='document'. Retorna 409 se:
    - engine não instalado / modelo NLLB não encontrado
    - par de idiomas não disponível
    - job está em modo quadrinhos
    """
    from app.services.app_config_service import load_app_config
    from app.services.translation_engine import (
        EngineNotInstalledError,
        LanguagePairNotAvailableError,
    )

    job = _get_or_404(db, job_id)

    if job.processing_mode == "comic":
        raise HTTPException(
            status_code=409,
            detail="Tradução não está disponível para quadrinhos/mangá nesta fase.",
        )

    cfg = load_app_config()
    engine_name = job.translator_engine or cfg.get("translator_engine_default", "argos") or "argos"
    src = job.source_language or "por"
    tgt = job.target_language or "eng"

    # Validação extra para NLLB: verificar se modelo está em disco antes de enfileirar
    if engine_name == "nllb":
        from app.services.translation_model_service import is_nllb_installed, is_nllb_model_ready
        if not is_nllb_installed():
            raise HTTPException(
                status_code=409,
                detail=(
                    "torch/transformers não estão instalados. "
                    "Execute: pip install -r requirements-nllb.txt"
                ),
            )
        model_name = cfg.get("nllb_model_name", "facebook/nllb-200-distilled-600M")
        if not is_nllb_model_ready(model_name):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Modelo NLLB '{model_name}' não encontrado localmente. "
                    "Execute: python scripts/setup_nllb.py"
                ),
            )

    engine = _build_engine(engine_name, cfg)

    try:
        if not engine.is_pair_available(src, tgt):
            raise LanguagePairNotAvailableError(
                f"Par de idiomas {src}→{tgt} não disponível para a engine '{engine_name}'."
            )
    except (EngineNotInstalledError, LanguagePairNotAvailableError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    op_id = _begin_job_operation(job, "translate")
    job.translation_status = "in_progress"
    job.translator_engine = engine_name
    job.translation_error = None
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_bg_translate, job_id, op_id)
    return _to_job(job)


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/comic-convert — converte quadrinhos/mangá via KCC
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/comic-convert", response_model=JobResponse)
def comic_convert_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Converte um arquivo de quadrinhos/mangá via KCC (kcc-c2e) em segundo plano.
    Requer processing_mode='comic'. Retorna 409 se KCC não estiver instalado.
    """
    from app.services.kcc_service import KccNotInstalledError, _check_kcc

    job = _get_or_404(db, job_id)

    if job.processing_mode != 'comic':
        raise HTTPException(
            status_code=409,
            detail="Job não está em modo quadrinhos. "
                   "Use o toggle na página de análise para alternar o modo.",
        )

    try:
        _check_kcc()
    except KccNotInstalledError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    # Verifica se o arquivo de entrada existe em disco
    from pathlib import Path as _Path
    if not job.input_path or not _Path(job.input_path).exists():
        raise HTTPException(
            status_code=422,
            detail="Arquivo de entrada não encontrado. Reenvie o arquivo original.",
        )

    op_id = _begin_job_operation(job, "comic_convert")
    job.status = "converting"
    job.conversion_status = "in_progress"
    job.error_message = None
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_bg_comic_convert, job_id, op_id)
    return _to_job(job)


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/comic-translate — tradução experimental de quadrinhos
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/comic-translate", response_model=JobResponse)
def comic_translate_job(
    job_id: int,
    body: ComicTranslateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Dispara o pipeline experimental de OCR + tradução por página em segundo plano.
    Gera um sidecar JSON/HTML em storage/output/{job_id}/comic_translation.{json,html}.
    NÃO altera imagens nem o pipeline KCC.
    Requer processing_mode='comic'. Retorna 409 se engine não instalada.
    """
    from app.services.app_config_service import load_app_config
    from app.services.translation_engine import (
        EngineNotInstalledError,
        LanguagePairNotAvailableError,
    )

    job = _get_or_404(db, job_id)

    if job.processing_mode != "comic":
        raise HTTPException(
            status_code=409,
            detail="Tradução de quadrinhos requer processing_mode='comic'.",
        )

    cfg = load_app_config()
    engine_name = body.translator_engine or job.translator_engine or cfg.get("translator_engine_default", "argos") or "argos"
    src = body.source_language or job.source_language or "por"
    tgt = body.target_language or job.target_language or "eng"

    # Validação extra para NLLB: verificar se modelo está em disco antes de enfileirar
    if engine_name == "nllb":
        from app.services.translation_model_service import is_nllb_installed, is_nllb_model_ready
        if not is_nllb_installed():
            raise HTTPException(
                status_code=409,
                detail=(
                    "torch/transformers não estão instalados. "
                    "Execute: pip install -r requirements-nllb.txt"
                ),
            )
        model_name = cfg.get("nllb_model_name", "facebook/nllb-200-distilled-600M")
        if not is_nllb_model_ready(model_name):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Modelo NLLB '{model_name}' não encontrado localmente. "
                    "Execute: python scripts/setup_nllb.py"
                ),
            )

    engine = _build_engine(engine_name, cfg)
    try:
        if not engine.is_pair_available(src, tgt):
            raise LanguagePairNotAvailableError(
                f"Par de idiomas {src}→{tgt} não disponível para a engine '{engine_name}'."
            )
    except (EngineNotInstalledError, LanguagePairNotAvailableError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    # Persiste parâmetros escolhidos antes de enfileirar
    op_id = _begin_job_operation(job, "comic_translate")
    job.translator_engine = engine_name
    job.source_language = src
    job.target_language = tgt
    job.comic_translation_status = "in_progress"
    job.comic_translation_error = None
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_bg_comic_translate, job_id, op_id)
    return _to_job(job)


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/send — envia o EPUB ao endereço Kindle do usuário
# ---------------------------------------------------------------------------

def _comic_visual_pipeline_started(job: ProcessingJob) -> bool:
    """True se o job comic tem tradução concluída OU pipeline visual iniciado."""
    if job.comic_translation_status == "done":
        return True
    from app.core.config import STORAGE_OUTPUT as _out  # lazy p/ patch em testes
    output_dir = _out / str(job.id)
    return (
        (output_dir / "comic_final_manifest.json").exists()
        or (output_dir / "comic_finish_manifest.json").exists()
    )


def _resolve_send_path(job: ProcessingJob) -> Path:
    """
    Política de envio (Estabilização v1) — sem fallback silencioso ao original:

    A. Documento → epub_path (comportamento clássico).
    B. Comic SEM tradução e SEM pipeline visual (caminho rápido consciente)
       → epub_path gerado pelo KCC sobre o original.
    C. Comic com tradução concluída OU pipeline visual iniciado
       → exige export final (comic_export_status='done' + EPUB validado).
       Sem export → 409 estruturado. NUNCA envia epub_path.
    D. Comic avançado sem tradução mas com curadoria/acabamento → regra C.
    """
    if job.processing_mode == "comic" and _comic_visual_pipeline_started(job):
        from app.services.comic_export_service import validate_export_artifact

        export_required = HTTPException(
            status_code=409,
            detail={
                "code": "COMIC_EXPORT_REQUIRED",
                "message": (
                    "Este quadrinho tem tradução/pipeline visual. Conclua a "
                    "etapa Exportar (EPUB final) antes de enviar ao Kindle — "
                    "o arquivo original não será enviado."
                ),
                "next_step": "export",
            },
        )
        if job.comic_export_status != "done" or not job.comic_export_path:
            raise export_required
        from app.core.config import STORAGE_OUTPUT as _out  # lazy p/ patch em testes
        output_dir = _out / str(job.id)
        resolved = validate_export_artifact(output_dir, job.comic_export_path)
        if resolved is None or resolved.suffix.lower() != ".epub":
            # Path inválido/fora do diretório permitido ou export sem EPUB
            raise export_required
        return resolved

    # A/B — documento ou comic sem pipeline visual (KCC do original, consciente)
    if job.conversion_status != "done" or not job.epub_path:
        raise HTTPException(status_code=400, detail="Gere o EPUB antes de enviar ao Kindle.")
    path = Path(job.epub_path)
    if not path.exists():
        raise HTTPException(status_code=422, detail="Arquivo EPUB não encontrado no servidor.")
    return path


@router.post("/jobs/{job_id}/send", response_model=JobResponse)
def send_job(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Envia o EPUB ao Kindle de quem é dono do trabalho.

    O destino sai de `_exigir_destino`: o aparelho principal do dono, e o
    `KINDLE_EMAIL` do `.env` só quando há dono e ele não cadastrou aparelho.
    Trabalho SEM dono não tem destino e recebe 403 — ver a docstring de lá.

    Política de seleção do arquivo: ver _resolve_send_path (comic traduzido
    NUNCA envia o EPUB do original; exige o export final).
    """
    job = _get_or_404(db, job_id)

    path_to_send = _resolve_send_path(job)

    # O DESTINO É RESOLVIDO ANTES DE QUALQUER ESCRITA. `_exigir_destino` recusa
    # o trabalho sem dono, e recusar depois de `send_status = "in_progress"`
    # deixaria o trabalho preso num estado que ninguém desfaz — a tela diria
    # "enviando" para sempre.
    destino = _exigir_destino(db, job)

    if job.send_status == "sent":
        raise HTTPException(status_code=400, detail="EPUB já foi enviado ao Kindle.")

    # --- Checar conectividade antes de tentar enviar ---
    if not is_smtp_reachable():
        pending_msg = (
            "Sem conexão com o servidor SMTP. "
            "O arquivo foi salvo em envios pendentes."
        )
        job.send_status = "pending"
        job.send_error = pending_msg
        job.status = "converted"
        job.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(job)
        raise HTTPException(status_code=503, detail=pending_msg)

    job.status = "sending"
    job.send_status = "in_progress"
    job.send_error = None
    job.updated_at = datetime.utcnow()
    db.commit()

    import time
    t0 = time.monotonic()
    send_failed_detail: str | None = None
    send_pending_detail: str | None = None

    try:
        send_epub_to_kindle(path_to_send, job.final_title or "", destino=destino)
        job.send_status = "sent"
        job.kindle_sent = True
        job.status = "done"
        from app.services.metrics_service import record_stage
        record_stage(job_id, "send", "completed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     processing_mode=job.processing_mode, input_format=job.input_format)

    except SendConnectivityError as exc:
        # Falha de conectividade durante o envio — marcar como pendente para retry
        job.send_status = "pending"
        job.send_error = str(exc)
        job.status = "converted"
        send_pending_detail = str(exc)
        from app.services.metrics_service import record_stage
        record_stage(job_id, "send", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    except SendFailedError as exc:
        # Falha definitiva (ex.: credenciais) — não permite retry automático
        job.send_status = "failed"
        job.send_error = str(exc)
        job.status = "converted"
        send_failed_detail = str(exc)
        from app.services.metrics_service import record_stage
        record_stage(job_id, "send", "failed",
                     duration_ms=(time.monotonic() - t0) * 1000,
                     error_type=type(exc).__name__, error_message=str(exc)[:500])

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    if send_pending_detail:
        raise HTTPException(status_code=503, detail=send_pending_detail)

    if send_failed_detail:
        raise HTTPException(status_code=500, detail=send_failed_detail)

    return _to_job(job)


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/duplicate — duplica job com metadados (Fase M)
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/duplicate", response_model=JobResponse, status_code=201)
def duplicate_job(
    job_id: int,
    body: DuplicateJobRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Cria um novo job com os metadados e input_path do job original.

    Todos os status de pipeline são resetados para valores iniciais.
    Não copia artefatos, sidecars, EPUBs, coberturas nem erros.
    Permite re-processar o mesmo arquivo com configurações diferentes.

    Único modo disponível na Fase M: 'metadata_only'.
    """
    original = _get_or_404(db, job_id)

    new_job = ProcessingJob(
        # O dono é herdado. Sem isto, duplicar um trabalho produzia uma cópia
        # sem dono — que some da estante de quem a pediu, e passa a pertencer a
        # quem tiver o endereço dela.
        dono_id=original.dono_id,
        original_filename=original.original_filename,
        input_path=original.input_path,
        input_format=original.input_format,
        processing_mode=original.processing_mode,
        comic_mode=original.comic_mode,
        manga_rtl=original.manga_rtl,
        final_title=original.final_title,
        final_author=original.final_author,
        final_language=original.final_language,
        final_filename=original.final_filename,
        translation_enabled=original.translation_enabled,
        source_language=original.source_language,
        target_language=original.target_language,
        translator_engine=original.translator_engine,
        status="uploaded",
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return _to_job(new_job)


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/apply-preset — aplica preset a um job individual (Fase K)
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/apply-preset", response_model=JobResponse)
def apply_preset_to_job(
    job_id: int,
    body: ApplyPresetRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Aplica as configurações de um preset a um job individual.

    Atualiza: processing_mode, comic_mode, manga_rtl, translation_enabled,
    source_language, target_language, translator_engine.

    Não dispara reprocessamento — apenas atualiza metadados do job.
    Retorna 404 se o preset ou o job não existir.
    """
    from app.services.preset_service import extract_job_updates, get_preset

    preset = get_preset(body.preset_id)
    if preset is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")

    job = _get_or_404(db, job_id)

    updates = extract_job_updates(preset)
    for field, value in updates.items():
        if hasattr(job, field):
            setattr(job, field, value)

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return _to_job(job)


# ---------------------------------------------------------------------------
# POST /pending-send/{job_id}/retry — reenvia um EPUB com envio pendente
# ---------------------------------------------------------------------------

@router.post("/pending-send/{job_id}/retry", response_model=JobResponse)
def retry_pending_send(job_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Tenta reenviar um EPUB cujo envio anterior falhou por falta de conectividade.
    Requer send_status="pending". Retorna 503 se ainda sem conexão.
    """
    job = _get_or_404(db, job_id)

    if job.send_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Job não está pendente (send_status atual: {job.send_status}).",
        )

    # Mesma política de seleção do envio normal (sem fallback ao original)
    path_to_send = _resolve_send_path(job)

    # E A MESMA PORTA DO ENVIO NORMAL. Reenviar é enviar: sem esta linha, um
    # trabalho sem dono que ficou pendente por falta de rede sairia por aqui,
    # e a correção teria fechado uma porta de duas.
    destino = _exigir_destino(db, job)

    if not is_smtp_reachable():
        pending_msg = (
            "Sem conexão com o servidor SMTP. "
            "O arquivo continua em envios pendentes."
        )
        job.send_error = pending_msg
        job.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(job)
        raise HTTPException(status_code=503, detail=pending_msg)

    job.status = "sending"
    job.send_status = "in_progress"
    job.send_error = None
    job.updated_at = datetime.utcnow()
    db.commit()

    send_failed_detail: str | None = None
    send_pending_detail: str | None = None

    try:
        send_epub_to_kindle(path_to_send, job.final_title or "", destino=destino)
        job.send_status = "sent"
        job.kindle_sent = True
        job.status = "done"

    except SendConnectivityError as exc:
        # Falha de conectividade durante o retry — manter como pendente
        job.send_status = "pending"
        job.send_error = str(exc)
        job.status = "converted"
        send_pending_detail = str(exc)

    except SendFailedError as exc:
        job.send_status = "failed"
        job.send_error = str(exc)
        job.status = "converted"
        send_failed_detail = str(exc)

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    if send_pending_detail:
        raise HTTPException(status_code=503, detail=send_pending_detail)

    if send_failed_detail:
        raise HTTPException(status_code=500, detail=send_failed_detail)

    return _to_job(job)
