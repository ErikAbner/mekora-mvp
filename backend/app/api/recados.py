"""Receber o que a pessoa quis dizer.

A rota de ESCREVER é pública, e tem de ser: quem converteu sem conta
(DEC-0018) é justamente quem tem a primeira impressão, e exigir cadastro para
reclamar é garantir que só quem já gostou reclame.

A rota de LER é do dono. Recado tem texto livre e às vezes e-mail — é dado
pessoal, e a terceira porta existe para isto.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.vazao import _de_onde
from app.db.database import get_db
from app.models.recado import HUMORES, LIMITE_DO_TEXTO, Recado

# DOIS ROUTERS, e não um com conferência por dentro. A porta é aplicada ao
# router inteiro em `main.py`, então escrever e ler precisam ser dois objetos —
# um público e um de dono. Um router só obrigaria a conferir dentro da função, e
# rota nova aqui nasceria desprotegida sem ninguém perceber.
router = APIRouter(prefix="/recados", tags=["recados"])
do_dono = APIRouter(prefix="/recados", tags=["recados"])

# A JANELA É PRÓPRIA, e não a de `/upload`. Recado é barato de escrever e barato
# de guardar, então o teto não existe contra volume de disco: existe contra o
# campo aberto virar caixa de spam. Seis por hora cobre quem tem muito a dizer.
JANELA = 3600
TETO = 6
_mandados: dict = defaultdict(list)


class RecadoQueChega(BaseModel):
    texto: str = Field(min_length=1, max_length=LIMITE_DO_TEXTO)
    humor: Optional[str] = None
    onde: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = Field(default=None, max_length=200)


@router.post("", status_code=201)
def deixar_recado(
    corpo: RecadoQueChega,
    request: Request,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    from app.services import acesso_service

    pessoa = acesso_service.quem_e(db, mekora_sessao)
    chave = f"pessoa:{pessoa.id}" if pessoa else f"rede:{_de_onde(request)}"

    agora = time.monotonic()
    recentes = [t for t in _mandados[chave] if agora - t < JANELA]
    if len(recentes) >= TETO:
        _mandados[chave] = recentes
        raise HTTPException(
            status_code=429,
            detail="Você já mandou vários recados agora. Tente daqui a pouco.",
        )
    _mandados[chave] = recentes + [agora]

    texto = corpo.texto.strip()
    if not texto:
        raise HTTPException(status_code=422, detail="O recado está vazio.")

    # Humor desconhecido vira NADA, e não erro. Se um dia a escala mudar no
    # navegador antes de mudar aqui, o recado continua chegando — perder o texto
    # de alguém por causa de uma palavra é a troca errada.
    humor = corpo.humor if corpo.humor in HUMORES else None

    db.add(
        Recado(
            pessoa_id=pessoa.id if pessoa else None,
            humor=humor,
            texto=texto[:LIMITE_DO_TEXTO],
            onde=(corpo.onde or None),
            # O e-mail de quem está logado NÃO é copiado para cá: já está no
            # `pessoa_id`, e guardar duas vezes é criar duas coisas para apagar.
            email=(corpo.email or "").strip() or None if pessoa is None else None,
        )
    )
    db.commit()
    return {"recebido": True}


@do_dono.get("")
def ler_recados(db: Session = Depends(get_db), limite: int = 100) -> dict:
    """A caixa de entrada de quem cuida da instalação."""
    linhas = (
        db.query(Recado).order_by(Recado.criado_em.desc()).limit(min(limite, 500)).all()
    )
    return {
        "total": db.query(Recado).count(),
        "recados": [
            {
                "id": r.id,
                "humor": r.humor,
                "texto": r.texto,
                "onde": r.onde,
                "email": r.email,
                "tem_conta": r.pessoa_id is not None,
                "criado_em": r.criado_em.isoformat() if r.criado_em else None,
            }
            for r in linhas
        ],
    }
