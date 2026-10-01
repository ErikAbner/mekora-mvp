"""Os Estudos."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, exists, false, func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.estudo import Estudo, EstudoNota
from app.models.nota import Nota
from app.models.pessoa import Pessoa
from app.services import acesso_service, capa_service

router = APIRouter()


class EstudoNovo(BaseModel):
    nome: str
    sobre: str = ""


class EstudoEditado(BaseModel):
    nome: Optional[str] = None
    sobre: Optional[str] = None
    fechado: Optional[bool] = None


class NotaNoEstudo(BaseModel):
    nota_id: int


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para montar estudos.")
    return pessoa


def _meu(db: Session, pessoa: Pessoa, estudo_id: int) -> Estudo:
    e = db.query(Estudo).filter(Estudo.id == estudo_id, Estudo.pessoa_id == pessoa.id).first()
    if e is None:
        raise HTTPException(status_code=404, detail="Estudo não encontrado.")
    return e


def _capas(db: Session, notas) -> dict:
    """O endereço da capa de cada livro de onde as notas vieram.

    O nó `966:31095` põe a CAPA ao lado de cada nota reunida: numa lista de
    trinta trechos de quatro livros, a capa é o que separa um do outro de
    relance — o nome do livro em texto cinza obriga a ler.

    Um pedido só para todos os `job_id` do estudo, e não um por nota: um estudo
    com trinta notas de quatro livros faria trinta consultas para quatro
    respostas.

    O ENDEREÇO USA O TOKEN, e não o número — a mesma regra do `/history`: pelo
    número a capa só abriria para quem provasse ser dono, e o `files.py` traduz
    o token em id do lado de dentro.
    """
    from app.models.processing_job import ProcessingJob

    ids = {n.job_id for n in notas if n.job_id}
    if not ids:
        return {}

    fora = {}
    for j in db.query(ProcessingJob).filter(ProcessingJob.id.in_(ids)).all():
        pagina = j.selected_cover_page
        if pagina is None and (j.page_count or 0) > 0:
            pagina = 0
        if pagina is not None and j.token_publico:
            fora[j.id] = capa_service.url(j)
    return fora


def _livros_das_notas(db: Session, notas) -> list:
    """Os livros de onde as notas vieram, com capa e endereço.

    Nota escrita solta não tem livro, e some daqui — ela continua no estudo, e
    é o `origem` dela que fica vazio.
    """
    from app.models.processing_job import ProcessingJob

    ids = {n.job_id for n in notas if n.job_id}
    capas = _capas(db, notas)

    fora = []
    if ids:
        for j in db.query(ProcessingJob).filter(ProcessingJob.id.in_(ids)).all():
            fora.append({
                "id": j.id,
                "titulo": j.final_title or j.detected_title or j.original_filename,
                "autor": j.final_author or j.detected_author or "",
                "capa": capas.get(j.id),
            })

    # E OS LIVROS QUE SÓ EXISTEM COMO NOME. Uma nota trazida do Kindle guarda o
    # título em `origem` e nunca teve trabalho no Mekora: o livro existe para
    # quem leu, e sumir com ele porque não há arquivo seria o produto negar o
    # que a própria nota diz.
    conhecidos = {l["titulo"] for l in fora}
    for nome in sorted({n.origem for n in notas if n.origem and n.origem not in conhecidos}):
        fora.append({"id": None, "titulo": nome, "autor": "", "capa": None})

    return sorted(fora, key=lambda l: l["titulo"])


def _fora(db: Session, e: Estudo) -> dict:
    notas = (
        db.query(Nota)
        .join(EstudoNota, EstudoNota.nota_id == Nota.id)
        .filter(EstudoNota.estudo_id == e.id)
        .order_by(EstudoNota.reunida_em)
        .all()
    )
    capas = _capas(db, notas)
    return {
        "id": e.id, "nome": e.nome, "sobre": e.sobre, "fechado": e.fechado,
        "criado_em": e.criado_em,
        "notas": [
            {
                "id": n.id, "trecho": n.trecho, "comentario": n.comentario, "cor": n.cor,
                "origem": n.origem, "fonte": n.fonte, "job_id": n.job_id,
                "capa": capas.get(n.job_id),
            }
            for n in notas
        ],
        # OS LIVROS SAEM DAS NOTAS, e não são campo. Um campo de livros exigiria
        # alguém mantê-lo, e seria a primeira coisa a ficar desatualizada — o
        # `CLAUDE.md` chama isso de "campo de status para alguém manter".
        #
        # AGORA COM CAPA E ENDEREÇO. O nó `966:29743` põe uma faixa de CAPAS no
        # topo do estudo, com "Ver na estante": é de onde o estudo veio, e de
        # relance. Só o nome em texto não diz de que livro se trata para quem
        # tem quarenta na estante.
        #
        # Um livro entra uma vez, mesmo com dez notas dele — a chave é o
        # `job_id`, e a ordem é a do nome, para a faixa não trocar de ordem a
        # cada visita.
        "livros": _livros_das_notas(db, notas),
    }


def _cursor_do_estudo(e: Estudo) -> str:
    return f"{1 if e.fechado else 0}|{e.mexido_em.isoformat()}|{e.id}"


def _ler_cursor_do_estudo(cursor: Optional[str]) -> tuple[bool, datetime, int] | None:
    if not cursor:
        return None
    try:
        fechado, quando, estudo_id = cursor.split("|", 2)
        return fechado == "1", datetime.fromisoformat(quando), int(estudo_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="O ponto de continuação dos estudos é inválido.")


@router.get("/estudos/pagina")
def pagina(
    limite: int = Query(default=24, ge=1, le=60),
    cursor: Optional[str] = None,
    q: str = Query(default="", max_length=200),
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Resumos paginados; notas completas só via detalhe do estudo."""
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return {"itens": [], "proximo": None, "total": 0}

    consulta = db.query(Estudo).filter(Estudo.pessoa_id == pessoa.id)
    termo = q.strip().lower()
    if termo:
        escapado = termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        como = f"%{escapado}%"
        nota_combina = exists().where(
            EstudoNota.estudo_id == Estudo.id,
            EstudoNota.nota_id == Nota.id,
            or_(
                func.lower(Nota.trecho).like(como, escape="\\"),
                func.lower(Nota.comentario).like(como, escape="\\"),
                func.lower(Nota.origem).like(como, escape="\\"),
            ),
        )
        consulta = consulta.filter(or_(
            func.lower(Estudo.nome).like(como, escape="\\"),
            func.lower(Estudo.sobre).like(como, escape="\\"),
            nota_combina,
        ))
    total = consulta.order_by(None).count()
    ponto = _ler_cursor_do_estudo(cursor)
    if ponto:
        fechado, quando, estudo_id = ponto
        consulta = consulta.filter(or_(
            Estudo.fechado.is_(True) if not fechado else false(),
            and_(
                Estudo.fechado == fechado,
                or_(Estudo.mexido_em < quando, and_(Estudo.mexido_em == quando, Estudo.id < estudo_id)),
            ),
        ))
    estudos = consulta.order_by(Estudo.fechado, Estudo.mexido_em.desc(), Estudo.id.desc()).limit(limite + 1).all()
    tem_mais = len(estudos) > limite
    estudos = estudos[:limite]

    por_estudo = {e.id: [] for e in estudos}
    if por_estudo:
        for estudo_id, nota in (
            db.query(EstudoNota.estudo_id, Nota)
            .join(Nota, Nota.id == EstudoNota.nota_id)
            .filter(EstudoNota.estudo_id.in_(por_estudo))
            .order_by(EstudoNota.reunida_em)
            .all()
        ):
            por_estudo[estudo_id].append(nota)

    # Uma consulta de livros para a página inteira. Chamar `_livros_das_notas`
    # estudo por estudo transformaria 24 resumos em quase cinquenta consultas.
    from app.models.processing_job import ProcessingJob
    ids_de_jobs = {n.job_id for notas in por_estudo.values() for n in notas if n.job_id}
    jobs = {j.id: j for j in db.query(ProcessingJob).filter(ProcessingJob.id.in_(ids_de_jobs)).all()} if ids_de_jobs else {}

    def livros_resumidos(notas: list[Nota]) -> list[dict]:
        fora = []
        for job_id in sorted({n.job_id for n in notas if n.job_id}):
            j = jobs.get(job_id)
            if not j:
                continue
            pagina = j.selected_cover_page
            if pagina is None and (j.page_count or 0) > 0:
                pagina = 0
            fora.append({
                "id": j.id,
                "titulo": j.final_title or j.detected_title or j.original_filename,
                "autor": j.final_author or j.detected_author or "",
                "capa": capa_service.url(j) if pagina is not None and j.token_publico else None,
            })
        conhecidos = {l["titulo"] for l in fora}
        for nome in sorted({n.origem for n in notas if n.origem and n.origem not in conhecidos}):
            fora.append({"id": None, "titulo": nome, "autor": "", "capa": None})
        return sorted(fora, key=lambda l: l["titulo"])[:5]

    itens = []
    for e in estudos:
        notas = por_estudo[e.id]
        previa = notas[:3]
        itens.append({
            "id": e.id, "nome": e.nome, "sobre": e.sobre, "fechado": e.fechado,
            "criado_em": e.criado_em,
            "total_notas": len(notas),
            # IDs bastam para calcular “fora de estudo”; três trechos bastam
            # para a prévia “Por pergunta”. O detalhe continua sendo o único
            # lugar que transfere o estudo inteiro.
            "nota_ids": [n.id for n in notas],
            "notas": [{
                "id": n.id,
                "trecho": n.trecho,
                "comentario": n.comentario,
                "cor": n.cor,
                "origem": n.origem,
                "fonte": n.fonte,
                "job_id": n.job_id,
                "capa": capa_service.url(jobs[n.job_id]) if (
                    n.job_id in jobs
                    and (jobs[n.job_id].selected_cover_page is not None or (jobs[n.job_id].page_count or 0) > 0)
                    and jobs[n.job_id].token_publico
                ) else None,
            } for n in previa],
            "livros": livros_resumidos(notas),
        })
    return {
        "itens": itens,
        "proximo": _cursor_do_estudo(estudos[-1]) if tem_mais and estudos else None,
        "total": total,
        # Conjunto leve para “Fora de estudo”. Sem ele, notas que pertencem a
        # uma página ainda não aberta pareceriam soltas.
        "nota_ids_reunidas": [linha[0] for linha in (
            db.query(EstudoNota.nota_id)
            .join(Estudo, Estudo.id == EstudoNota.estudo_id)
            .filter(Estudo.pessoa_id == pessoa.id)
            .distinct()
            .all()
        )],
    }


# `/estudos/meus` e nao `/estudos`, porque `/estudos` e uma TELA. O Canvas e o
# `/entrar` ja passaram por isto; aqui a licao foi aplicada antes de doer.
@router.get("/estudos/meus")
def listar(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> List[dict]:
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return []
    estudos = (
        db.query(Estudo)
        .filter(Estudo.pessoa_id == pessoa.id)
        # Abertos primeiro: fechar diz que a pergunta foi respondida, e o que
        # ainda pergunta merece estar à frente do que já respondeu.
        .order_by(Estudo.fechado, Estudo.mexido_em.desc())
        .all()
    )
    return [_fora(db, e) for e in estudos]


@router.get("/estudos/{estudo_id}")
def ver(
    estudo_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    return _fora(db, _meu(db, pessoa, estudo_id))


@router.post("/estudos/novo", status_code=201)
def criar(
    novo: EstudoNovo,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    nome = novo.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Dê um nome ao estudo.")
    e = Estudo(pessoa_id=pessoa.id, nome=nome, sobre=novo.sobre.strip())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _fora(db, e)


@router.patch("/estudos/{estudo_id}")
def mudar(
    estudo_id: int,
    troca: EstudoEditado,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    e = _meu(db, pessoa, estudo_id)
    if troca.nome is not None:
        e.nome = troca.nome.strip() or e.nome
    if troca.sobre is not None:
        e.sobre = troca.sobre.strip()
    if troca.fechado is not None:
        e.fechado = troca.fechado
    db.commit()
    db.refresh(e)
    return _fora(db, e)


@router.delete("/estudos/{estudo_id}", status_code=204)
def apagar(
    estudo_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Apaga o estudo. As NOTAS ficam.

    O estudo é a reunião, não o conteúdo: desfazer a reunião não desfaz o que
    foi lido e marcado. Mesma regra do Canvas.
    """
    pessoa = _quem(db, mekora_sessao)
    db.delete(_meu(db, pessoa, estudo_id))
    db.commit()
    return None


@router.post("/estudos/{estudo_id}/notas", status_code=201)
def reunir(
    estudo_id: int,
    qual: NotaNoEstudo,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    e = _meu(db, pessoa, estudo_id)

    nota = db.query(Nota).filter(Nota.id == qual.nota_id, Nota.pessoa_id == pessoa.id).first()
    if nota is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    # RASCUNHO NÃO ENTRA EM ESTUDO, e é isto que faz o estado valer alguma coisa.
    #
    # O Erik definiu em 02/09/2026: rascunho é a nota "começada e não terminada,
    # abandonada, logo não sendo possível ir para os estudos". A regra mora aqui,
    # e não só na tela: a tela pode esconder o botão, mas quem garante é o
    # servidor — senão a mesma nota entra por outro caminho.
    if nota.estado == "rascunho":
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta nota está marcada como rascunho. Tire a marca para poder "
                "levá-la para um estudo."
            ),
        )

    ja = (
        db.query(EstudoNota)
        .filter(EstudoNota.estudo_id == e.id, EstudoNota.nota_id == nota.id)
        .first()
    )
    if ja is None:
        db.add(EstudoNota(estudo_id=e.id, nota_id=nota.id))
        db.commit()
    db.refresh(e)
    return _fora(db, e)


@router.delete("/estudos/{estudo_id}/notas/{nota_id}", status_code=204)
def tirar(
    estudo_id: int,
    nota_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    pessoa = _quem(db, mekora_sessao)
    e = _meu(db, pessoa, estudo_id)
    ligacao = (
        db.query(EstudoNota)
        .filter(EstudoNota.estudo_id == e.id, EstudoNota.nota_id == nota_id)
        .first()
    )
    if ligacao is None:
        raise HTTPException(status_code=404, detail="Essa nota não está neste estudo.")
    db.delete(ligacao)
    db.commit()
    return None
