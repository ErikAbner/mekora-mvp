"""As notas de um livro."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.nota import CORES, Nota
from app.models.pessoa import Pessoa, agora
from app.services import acesso_service

router = APIRouter()


class NotaNova(BaseModel):
    capitulo: int = Field(ge=0)
    de: int = Field(ge=0)
    ate: int = Field(ge=0)
    cor: str = "amarelo"
    trecho: str = ""
    comentario: str = ""

    @field_validator("cor")
    @classmethod
    def cor_do_sistema(cls, v: str) -> str:
        """A cor é conferida no SERVIDOR, e não só na tela.

        Sem isto, `cor: "roxo"` entra no banco e volta na leitura como um
        destaque sem cor nenhuma — texto marcado que não se vê marcado.
        """
        if v not in CORES:
            raise ValueError(f"cor fora do sistema: {v}. Use uma de {', '.join(CORES)}.")
        return v

    @field_validator("ate")
    @classmethod
    def intervalo_com_conteudo(cls, v: int, info) -> int:
        de = info.data.get("de")
        if de is not None and v <= de:
            raise ValueError("a nota precisa cobrir pelo menos um caractere")
        return v


class NotaEditada(BaseModel):
    cor: Optional[str] = None
    comentario: Optional[str] = None

    @field_validator("cor")
    @classmethod
    def cor_do_sistema(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in CORES:
            raise ValueError(f"cor fora do sistema: {v}")
        return v


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        # AQUI o 401 é certo, e nas rotas de progresso não era. Ler sem conta é
        # previsto; anotar sem conta não tem onde guardar, e fingir que guardou
        # perderia o que a pessoa escreveu sem avisar.
        raise HTTPException(status_code=401, detail="Entre para guardar notas.")
    return pessoa


def _fora(n: Nota) -> dict:
    return {
        "id": n.id, "capitulo": n.capitulo, "de": n.de, "ate": n.ate,
        "cor": n.cor, "trecho": n.trecho, "comentario": n.comentario,
        "criada_em": n.criada_em,
    }


@router.get("/jobs/{job_id}/notas")
def listar(
    job_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> List[dict]:
    """Sem conta devolve lista vazia, e não 401.

    Abrir um livro sem entrar é previsto, e nesse caso não há notas — o que é
    diferente de um erro. Responder 401 faria toda leitura anônima registrar
    uma falha que não é falha.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return []
    notas = (
        db.query(Nota)
        .filter(Nota.pessoa_id == pessoa.id, Nota.job_id == job_id)
        .order_by(Nota.capitulo, Nota.de)
        .all()
    )
    return [_fora(n) for n in notas]


@router.post("/jobs/{job_id}/notas", status_code=201)
def criar(
    job_id: int,
    nova: NotaNova,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    n = Nota(
        pessoa_id=pessoa.id, job_id=job_id, capitulo=nova.capitulo,
        de=nova.de, ate=nova.ate, cor=nova.cor,
        trecho=nova.trecho[:2000], comentario=nova.comentario,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return _fora(n)


@router.patch("/jobs/{job_id}/notas/{nota_id}")
def editar(
    job_id: int,
    nota_id: int,
    troca: NotaEditada,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    n = (
        db.query(Nota)
        .filter(Nota.id == nota_id, Nota.pessoa_id == pessoa.id, Nota.job_id == job_id)
        .first()
    )
    # O `pessoa_id` está no FILTRO, e não numa conferência depois. A diferença
    # aparece no 404: assim, a nota de outra pessoa não existe — em vez de
    # existir e ser negada, o que já confirma que ela existe.
    if n is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    if troca.cor is not None:
        n.cor = troca.cor
    if troca.comentario is not None:
        n.comentario = troca.comentario
    n.atualizada_em = agora()
    db.commit()
    db.refresh(n)
    return _fora(n)


@router.delete("/jobs/{job_id}/notas/{nota_id}", status_code=204)
def apagar(
    job_id: int,
    nota_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    pessoa = _quem(db, mekora_sessao)
    n = (
        db.query(Nota)
        .filter(Nota.id == nota_id, Nota.pessoa_id == pessoa.id, Nota.job_id == job_id)
        .first()
    )
    if n is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")
    db.delete(n)
    db.commit()
    return None
