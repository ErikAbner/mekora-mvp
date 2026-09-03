"""Os marcadores de um livro: dobrar a página, ver a lista, desdobrar.

Três rotas, e nenhuma delas edita: um marcador não tem o que editar. Ele é um
lugar, e lugar não muda de ideia — o que se faz com um marcador errado é tirá-lo
e pôr outro.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.marcador import Marcador
from app.services import acesso_service

router = APIRouter()

# O trecho é o que a lista mostra. Duzentos caracteres cabem em duas linhas na
# gaveta e já dizem qual lugar é aquele; guardar o parágrafo inteiro engordaria
# a linha sem a tornar mais legível.
TAMANHO_DO_TRECHO = 200


class MarcadorNovo(BaseModel):
    capitulo: int = Field(ge=0)
    deslocamento: int = Field(ge=0)
    trecho: str = ""


def _quem(db: Session, sessao: Optional[str]):
    pessoa = acesso_service.quem_e(db, sessao)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para guardar marcadores.")
    return pessoa


def _fora(m: Marcador) -> dict:
    return {
        "id": m.id,
        "capitulo": m.capitulo,
        "deslocamento": m.deslocamento,
        "trecho": m.trecho,
        "criado_em": m.criado_em.isoformat() if m.criado_em else None,
    }


@router.get("/jobs/{job_id}/marcadores")
def listar(
    job_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> List[dict]:
    """Sem conta devolve lista vazia, e não 401.

    A mesma decisão das notas: abrir um livro sem entrar é previsto, e nesse caso
    não há marcador — o que é diferente de um erro.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return []
    marcadores = (
        db.query(Marcador)
        .filter(Marcador.pessoa_id == pessoa.id, Marcador.job_id == job_id)
        .order_by(Marcador.capitulo, Marcador.deslocamento)
        .all()
    )
    return [_fora(m) for m in marcadores]


@router.post("/jobs/{job_id}/marcadores", status_code=201)
def criar(
    job_id: int,
    novo: MarcadorNovo,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Dobrar a mesma página duas vezes é uma dobra só.

    A rota é IDEMPOTENTE: o segundo pedido para o mesmo lugar devolve o marcador
    que já existe, com `ja_estava`, em vez de 409. Quem chama é um botão numa
    gaveta, e um erro ali seria vermelho na tela para dizer que o que a pessoa
    queria já está feito.

    A conferência acontece antes do `INSERT` E a restrição existe no banco: aqui
    ela dá a resposta boa, lá ela é a garantia — duas abas passam pela primeira
    ao mesmo tempo.
    """
    pessoa = _quem(db, mekora_sessao)

    ja = (
        db.query(Marcador)
        .filter(
            Marcador.pessoa_id == pessoa.id,
            Marcador.job_id == job_id,
            Marcador.capitulo == novo.capitulo,
            Marcador.deslocamento == novo.deslocamento,
        )
        .first()
    )
    if ja is not None:
        return {**_fora(ja), "ja_estava": True}

    m = Marcador(
        pessoa_id=pessoa.id,
        job_id=job_id,
        capitulo=novo.capitulo,
        deslocamento=novo.deslocamento,
        trecho=novo.trecho[:TAMANHO_DO_TRECHO],
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {**_fora(m), "ja_estava": False}


@router.delete("/jobs/{job_id}/marcadores/{marcador_id}", status_code=204)
def apagar(
    job_id: int,
    marcador_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    pessoa = _quem(db, mekora_sessao)
    # O `pessoa_id` está no FILTRO, e não numa conferência depois: assim o
    # marcador de outra pessoa não existe, em vez de existir e ser negado — o
    # que já confirmaria que ele existe.
    m = (
        db.query(Marcador)
        .filter(
            Marcador.id == marcador_id,
            Marcador.pessoa_id == pessoa.id,
            Marcador.job_id == job_id,
        )
        .first()
    )
    if m is None:
        raise HTTPException(status_code=404, detail="Marcador não encontrado.")
    db.delete(m)
    db.commit()
    return None
