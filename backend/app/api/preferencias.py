"""As preferências de uma pessoa."""

from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.pessoa import Pessoa, agora
from app.models.preferencia import Preferencia
from app.services import acesso_service

router = APIRouter()

# Um teto por chave e por valor. Não é sobre validar a escolha — é para que uma
# chamada malformada não vire uma linha de banco de tamanho arbitrário.
LIMITE = 200


class Escolhas(BaseModel):
    escolhas: Dict[str, str] = Field(default_factory=dict)


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para guardar suas preferências.")
    return pessoa


@router.get("/preferencias")
def ler(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Sem conta devolve vazio, e a tela usa os padrões.

    Não é erro: a tela de preferências existe e funciona sem entrar, só não
    guarda. Responder 401 obrigaria a tela a tratar dois caminhos para a mesma
    coisa — mostrar os padrões.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return {"escolhas": {}, "guardado": False}

    linhas = db.query(Preferencia).filter(Preferencia.pessoa_id == pessoa.id).all()
    return {"escolhas": {p.chave: p.valor for p in linhas}, "guardado": True}


@router.put("/preferencias", status_code=204)
def gravar(
    corpo: Escolhas,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Grava só o que veio, e não substitui o conjunto.

    Um PUT que apagasse as chaves ausentes faria a tela precisar mandar TODAS as
    preferências a cada troca de uma — e uma versão antiga da tela, que não
    conhece uma opção nova, apagaria a escolha da pessoa sem ninguém pedir.
    """
    pessoa = _quem(db, mekora_sessao)

    for chave, valor in corpo.escolhas.items():
        chave, valor = chave[:LIMITE], (valor or "")[:LIMITE]
        p = (
            db.query(Preferencia)
            .filter(Preferencia.pessoa_id == pessoa.id, Preferencia.chave == chave)
            .first()
        )
        if p is None:
            p = Preferencia(pessoa_id=pessoa.id, chave=chave)
            db.add(p)
        p.valor = valor
        p.atualizada_em = agora()

    db.commit()
    return None
