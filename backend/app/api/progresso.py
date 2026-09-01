"""Onde a pessoa parou. Duas rotas, e uma decisão em cada."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Cookie, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.pessoa import agora
from app.models.progresso import Progresso
from app.services import acesso_service

router = APIRouter()


class Marca(BaseModel):
    capitulo: int = Field(ge=0)
    deslocamento: int = Field(ge=0)
    # Opcional porque quem grava ao rolar não precisa repetir o total a cada
    # vez; quem abre o livro manda uma vez e ele fica.
    capitulos: Optional[int] = Field(default=None, ge=0)
    fracao: Optional[float] = None


@router.get("/jobs/{job_id}/progresso")
def ler(
    job_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Sem sessão, devolve o começo do livro em vez de erro.

    Ler sem entrar é possível — basta ter o endereço —, e nesse caso não há
    marca para encontrar. Responder 401 faria toda abertura de livro por quem
    não entrou registrar um erro que não é erro, e obrigaria a tela a tratar
    dois caminhos para a mesma coisa: começar do início.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return {"capitulo": 0, "deslocamento": 0, "capitulos": 0, "fracao": None, "guardado": False}

    p = (
        db.query(Progresso)
        .filter(Progresso.pessoa_id == pessoa.id, Progresso.job_id == job_id)
        .first()
    )
    if p is None:
        return {"capitulo": 0, "deslocamento": 0, "capitulos": 0, "fracao": None, "guardado": False}
    return {
        "capitulo": p.capitulo, "deslocamento": p.deslocamento,
        "capitulos": p.capitulos, "fracao": p.fracao, "guardado": True,
    }


@router.put("/jobs/{job_id}/progresso", status_code=204)
def gravar(
    job_id: int,
    marca: Marca,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Grava, ou não faz nada em silêncio se não houver conta.

    O silêncio é deliberado. A tela chama isto enquanto a pessoa rola a página, e
    um erro a cada rolagem de quem não entrou encheria o console de vermelho e
    faria parecer que o produto está quebrado — quando o que acontece é
    exatamente o previsto: sem conta não há onde guardar.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return None

    p = (
        db.query(Progresso)
        .filter(Progresso.pessoa_id == pessoa.id, Progresso.job_id == job_id)
        .first()
    )
    if p is None:
        p = Progresso(pessoa_id=pessoa.id, job_id=job_id)
        db.add(p)

    p.capitulo = marca.capitulo
    p.deslocamento = marca.deslocamento
    # Só sobrescreve quando veio: um `null` do gravador de rolagem não pode
    # apagar o total que o abridor do livro já registrou.
    if marca.capitulos:
        p.capitulos = marca.capitulos
    # A FRACAO VEM PRONTA DO CLIENTE, porque so ele conhece a extensao do livro:
    # o EPUB e aberto no navegador, e o servidor nunca ve o tamanho de cada
    # capitulo. Aqui e guardar e devolver, nao derivar.
    if marca.fracao is not None:
        p.fracao = max(0.0, min(1.0, marca.fracao))
    p.atualizado_em = agora()
    db.commit()
    return None
