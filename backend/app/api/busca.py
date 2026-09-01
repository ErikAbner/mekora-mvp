"""A busca do cabeçalho — nó 941:23107 ("Estudo · seletor").

O botão existia desde o começo e estava DESLIGADO, com o motivo escrito na
tela: "não há rota de busca no backend, e uma busca que só olha o que a tela já
carregou encontraria menos do que a pessoa tem". Este arquivo é essa rota.

O QUE ELA PROCURA
=================
"Buscar em Mekora" promete o Mekora inteiro, e o Mekora tem três coisas com
nome: livros, notas e estudos. Uma busca que só achasse livros seria mentira do
tamanho do rótulo. Então são três consultas, devolvidas em grupos nomeados — e
não uma lista misturada, porque um livro e uma nota não se comparam por
relevância; quem compara é quem procurou.

O QUE ELA NÃO FAZ
=================
Não indexa o CONTEÚDO dos livros. O texto está dentro do EPUB, não no banco, e
prometer "busca no texto" sem isso é a mesma falha de sempre — a tela diz que
procurou tudo e o resultado é menor que a verdade. O que se procura aqui é o
que o banco sabe: título, autor, nome do arquivo, o trecho da nota, o comentário
dela, o nome e o assunto do estudo.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.estudo import Estudo
from app.models.nota import Nota
from app.models.pessoa import Pessoa
from app.models.processing_job import ProcessingJob
from app.services import acesso_service

router = APIRouter()

# Quantos de cada grupo. O desenho mostra quatro linhas e a lista rola; o teto
# existe para a consulta não devolver a estante inteira quando alguém procura
# por "a".
TETO = 8

# Abaixo disto não se procura. Uma letra devolve quase tudo, e "quase tudo" na
# tela é indistinguível de "não filtrou".
MINIMO = 2


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para buscar no que é seu.")
    return pessoa


def _como(campo, alvo: str):
    """`LIKE` com o texto escapado.

    `%` e `_` são curingas no `LIKE`. Sem escapar, procurar por "100%" viraria
    "qualquer coisa que comece com 100" — e a pessoa não escreveu um curinga,
    escreveu um por cento.
    """
    limpo = alvo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return campo.ilike(f"%{limpo}%", escape="\\")


def _titulo(j: ProcessingJob) -> str:
    return j.final_title or j.detected_title or j.original_filename


@router.get("/buscar")
def buscar(
    q: str = Query(default="", max_length=200),
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    termo = q.strip()

    if len(termo) < MINIMO:
        # Não é erro: é a tela ainda sendo digitada. Devolver 400 faria o campo
        # piscar vermelho a cada primeira letra.
        return {"termo": termo, "curto": True, "livros": [], "notas": [], "estudos": []}

    livros: List[ProcessingJob] = (
        db.query(ProcessingJob)
        .filter(
            ProcessingJob.dono_id == pessoa.id,
            or_(
                _como(ProcessingJob.final_title, termo),
                _como(ProcessingJob.detected_title, termo),
                _como(ProcessingJob.final_author, termo),
                _como(ProcessingJob.detected_author, termo),
                _como(ProcessingJob.original_filename, termo),
            ),
        )
        .order_by(ProcessingJob.updated_at.desc())
        .limit(TETO)
        .all()
    )

    notas: List[Nota] = (
        db.query(Nota)
        .filter(
            Nota.pessoa_id == pessoa.id,
            or_(_como(Nota.trecho, termo), _como(Nota.comentario, termo)),
        )
        .order_by(Nota.criada_em.desc())
        .limit(TETO)
        .all()
    )

    estudos: List[Estudo] = (
        db.query(Estudo)
        .filter(
            Estudo.pessoa_id == pessoa.id,
            or_(_como(Estudo.nome, termo), _como(Estudo.sobre, termo)),
        )
        .order_by(Estudo.criado_em.desc())
        .limit(TETO)
        .all()
    )

    return {
        "termo": termo,
        "curto": False,
        "livros": [
            {
                "id": j.id,
                "titulo": _titulo(j),
                "autor": j.final_author or j.detected_author or "",
                "formato": (j.input_format or "").upper(),
                "capa": f"/storage/temp/{j.token_publico}/page_0.png" if j.token_publico else None,
            }
            for j in livros
        ],
        "notas": [
            {
                "id": n.id,
                "trecho": n.trecho,
                "comentario": n.comentario or "",
                "job_id": n.job_id,
                "cor": n.cor,
            }
            for n in notas
        ],
        "estudos": [{"id": e.id, "nome": e.nome, "sobre": e.sobre or ""} for e in estudos],
    }
