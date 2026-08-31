"""Os Estudos."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.estudo import Estudo, EstudoNota
from app.models.nota import Nota
from app.models.pessoa import Pessoa
from app.services import acesso_service

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


def _fora(db: Session, e: Estudo) -> dict:
    notas = (
        db.query(Nota)
        .join(EstudoNota, EstudoNota.nota_id == Nota.id)
        .filter(EstudoNota.estudo_id == e.id)
        .order_by(EstudoNota.reunida_em)
        .all()
    )
    return {
        "id": e.id, "nome": e.nome, "sobre": e.sobre, "fechado": e.fechado,
        "criado_em": e.criado_em,
        "notas": [
            {
                "id": n.id, "trecho": n.trecho, "comentario": n.comentario, "cor": n.cor,
                "origem": n.origem, "fonte": n.fonte, "job_id": n.job_id,
            }
            for n in notas
        ],
        # OS LIVROS SAEM DAS NOTAS, e não são campo. Um campo de livros exigiria
        # alguém mantê-lo, e seria a primeira coisa a ficar desatualizada — o
        # `CLAUDE.md` chama isso de "campo de status para alguém manter".
        "livros": sorted({n.origem for n in notas if n.origem}),
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
