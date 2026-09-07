"""Onde a pessoa parou, e o que ela declarou sobre o livro.

TRÊS ROTAS, e a terceira existe porque as duas primeiras não davam conta.

Progresso é FATO MEDIDO pelo leitor: capítulo, deslocamento, fração. Estado de
leitura é DECLARAÇÃO da pessoa: "ainda vou ler", "estou lendo", "terminei". Até
07/09 só havia o primeiro, e o quadro de Estudos escrevia posição de leitura
para representar declaração — apagando em silêncio onde ela tinha parado.
"""

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


# Os três valores do estado, nomeados pelo Erik em 07/09. O conjunto mora aqui e
# não espalhado em `if`, pela mesma razão que `ESTADOS_DA_NOTA` existe.
ESTADOS_DE_LEITURA = {"to_read", "reading", "read"}


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
        return {"capitulo": 0, "deslocamento": 0, "capitulos": 0, "fracao": None,
                "estado_leitura": None, "guardado": False}

    p = (
        db.query(Progresso)
        .filter(Progresso.pessoa_id == pessoa.id, Progresso.job_id == job_id)
        .first()
    )
    if p is None:
        return {"capitulo": 0, "deslocamento": 0, "capitulos": 0, "fracao": None,
                "estado_leitura": None, "guardado": False}
    return {
        "capitulo": p.capitulo, "deslocamento": p.deslocamento,
        "capitulos": p.capitulos, "fracao": p.fracao, "guardado": True,
        "estado_leitura": p.estado_leitura,
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


class EstadoDeLeitura(BaseModel):
    """`None` DEVOLVE A DECLARAÇÃO, e não é o mesmo que "ainda vou ler".

    Sem declaração, o estado volta a ser derivado da fração — que é como ele
    sempre funcionou e continua funcionando para todo livro que ninguém tocou.
    Mandar `null` é desfazer o que se declarou, e não declarar "to_read".
    """

    estado: Optional[str] = None


@router.put("/jobs/{job_id}/estado-leitura", status_code=204)
def declarar_estado(
    job_id: int,
    corpo: EstadoDeLeitura,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Declara o estado de leitura, SEM TOCAR NO PROGRESSO.

    É a rota do arrasto do quadro de Estudos. Ela escreve uma coluna e nenhuma
    outra: `capitulo`, `deslocamento`, `capitulos` e `fracao` ficam exatamente
    como estavam — inclusive quando a linha de progresso é criada agora, para um
    livro que ninguém abriu. Nesse caso ela nasce com o progresso zerado e
    `capitulos` em zero, que é o valor que a estante já lê como "ninguém abriu
    ainda". Declarar não inventa leitura.

    O 400 de valor desconhecido é deliberado: um estado que o produto não
    conhece, gravado em silêncio, viraria uma quarta coluna no quadro no dia em
    que alguém lesse a tabela.
    """
    from fastapi import HTTPException

    if corpo.estado is not None and corpo.estado not in ESTADOS_DE_LEITURA:
        raise HTTPException(
            status_code=400,
            detail=f"estado de leitura desconhecido: {corpo.estado}. Use um de {', '.join(sorted(ESTADOS_DE_LEITURA))}, ou null para desfazer.",
        )

    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        # O MESMO SILÊNCIO DA GRAVAÇÃO DE PROGRESSO, e pela mesma razão: sem
        # conta não há onde guardar, e isso é o previsto e não um erro.
        return None

    p = (
        db.query(Progresso)
        .filter(Progresso.pessoa_id == pessoa.id, Progresso.job_id == job_id)
        .first()
    )
    if p is None:
        p = Progresso(pessoa_id=pessoa.id, job_id=job_id)
        db.add(p)

    p.estado_leitura = corpo.estado
    p.atualizado_em = agora()
    db.commit()
    return None
