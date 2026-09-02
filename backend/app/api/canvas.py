"""O Canvas: trazer, mover, ligar, tirar."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.canvas import GrupoCanvas, Ligacao, NoCanvas
from app.models.nota import CORES, Nota
from app.models.pessoa import Pessoa
from app.services import acesso_service

router = APIRouter()


class NoNovo(BaseModel):
    """Traz uma nota que já existe, ou cria uma solta.

    Os dois num pedido só porque são o mesmo gesto do ponto de vista de quem
    usa: pôr alguma coisa na superfície. Separar em duas rotas faria a tela
    escolher entre elas antes de saber o que a pessoa quer.
    """

    nota_id: Optional[int] = None
    texto: Optional[str] = None
    cor: str = "amarelo"
    x: float = 0
    y: float = 0


class Movimento(BaseModel):
    x: float
    y: float


class LigacaoNova(BaseModel):
    de_id: int
    para_id: int


class GrupoNovo(BaseModel):
    """Uma área nomeada na superfície — nó 895:6938."""

    nome: str = ""
    x: float = 0
    y: float = 0
    largura: float = 480
    altura: float = 320


class GrupoMudado(BaseModel):
    nome: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    largura: Optional[float] = None
    altura: Optional[float] = None


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para usar o Canvas.")
    return pessoa


def _normalizar(a: int, b: int) -> tuple:
    """Sempre o menor primeiro.

    A ligação é MÚTUA: ligar A a B é o mesmo que ligar B a A. Sem normalizar, a
    restrição de unicidade não impede as duas linhas, e a superfície mostraria
    dois traços sobrepostos entre as mesmas notas — e apagar um deixaria o
    outro.
    """
    return (a, b) if a < b else (b, a)


# `/canvas/superficie` e nao `/canvas`, porque `/canvas` e uma TELA — a mesma
# colisao que `/entrar` teve. O gerador de rotas a recusou por nome, e a saida e
# a mesma: abaixo de `/canvas` fica o backend, e `/canvas` sozinho e a tela.
#
# A colisao so apareceu quando a tela passou a existir; antes disso o gerador
# rodou e nao viu nada. Vale o registro: gerar antes de criar a tela nao prova
# ausencia de conflito.
@router.get("/canvas/superficie")
def superficie(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Tudo que está na superfície, com o conteúdo das notas junto.

    Em um pedido só, e não um por nota: a tela precisa desenhar tudo de uma vez,
    e trinta chamadas fariam os retângulos aparecerem um a um.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return {"nos": [], "ligacoes": [], "grupos": []}

    nos = (
        db.query(NoCanvas, Nota)
        .join(Nota, Nota.id == NoCanvas.nota_id)
        .filter(NoCanvas.pessoa_id == pessoa.id)
        .all()
    )

    return {
        "nos": [
            {
                "id": n.id, "nota_id": nota.id, "x": n.x, "y": n.y,
                "texto": nota.trecho, "comentario": nota.comentario, "cor": nota.cor,
                # A ORIGEM VAI JUNTO. O item 6 do contrato pede "manter a origem
                # da nota, e abri-la" — sem isto, uma nota no Canvas vira texto
                # sem procedência, e voltar ao livro exigiria procurá-la.
                "fonte": nota.fonte, "origem": nota.origem, "job_id": nota.job_id,
                "capitulo": nota.capitulo, "de": nota.de,
                # QUANDO A NOTA FOI ESCRITA. O rodapé do cartão no nó 895:6938 é
                # "Erik · 05/08/26" — origem e data —, e a data não saía daqui.
                # Num canvas que cresce por meses, ela é o que separa o que se
                # pensou ontem do que se pensou em março.
                "criada_em": nota.criada_em,
            }
            for n, nota in nos
        ],
        "ligacoes": [
            {"id": l.id, "de_id": l.de_id, "para_id": l.para_id, "como": l.como}
            for l in db.query(Ligacao).filter(Ligacao.pessoa_id == pessoa.id).all()
        ],
        # Os grupos vêm no MESMO pedido que os nós: eles são o chão em que os
        # nós estão, e chegar depois faria as notas aparecerem soltas e o
        # retângulo pousar em cima delas um instante depois.
        "grupos": [
            {"id": g.id, "nome": g.nome, "x": g.x, "y": g.y,
             "largura": g.largura, "altura": g.altura}
            for g in db.query(GrupoCanvas)
            .filter(GrupoCanvas.pessoa_id == pessoa.id)
            .order_by(GrupoCanvas.criado_em)
            .all()
        ],
    }


@router.post("/canvas/nos", status_code=201)
def por_na_superficie(
    novo: NoNovo,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)

    if novo.nota_id is not None:
        nota = (
            db.query(Nota)
            .filter(Nota.id == novo.nota_id, Nota.pessoa_id == pessoa.id)
            .first()
        )
        if nota is None:
            raise HTTPException(status_code=404, detail="Nota não encontrada.")
        ja = (
            db.query(NoCanvas)
            .filter(NoCanvas.pessoa_id == pessoa.id, NoCanvas.nota_id == nota.id)
            .first()
        )
        if ja is not None:
            # Não é erro: a pessoa pediu para trazer algo que já está aqui, e a
            # resposta certa é mostrar onde está — não recusar.
            return {"id": ja.id, "nota_id": nota.id, "x": ja.x, "y": ja.y, "ja_estava": True}
    else:
        texto = (novo.texto or "").strip()
        if not texto:
            raise HTTPException(status_code=400, detail="Escreva alguma coisa na nota.")
        if novo.cor not in CORES:
            raise HTTPException(status_code=400, detail=f"cor fora do sistema: {novo.cor}")
        # NOTA SOLTA: sem livro, porque nasceu aqui. `fonte="solta"` a distingue
        # de uma nota do Kindle, que também tem `job_id` nulo e é outra coisa.
        nota = Nota(
            pessoa_id=pessoa.id, job_id=None, origem="", fonte="solta",
            capitulo=0, de=0, ate=0, cor=novo.cor, trecho=texto, comentario="",
        )
        db.add(nota)
        db.flush()

    no = NoCanvas(pessoa_id=pessoa.id, nota_id=nota.id, x=novo.x, y=novo.y)
    db.add(no)
    db.commit()
    db.refresh(no)
    return {"id": no.id, "nota_id": nota.id, "x": no.x, "y": no.y, "ja_estava": False}


@router.patch("/canvas/nos/{no_id}", status_code=204)
def mover(
    no_id: int,
    onde: Movimento,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    pessoa = _quem(db, mekora_sessao)
    no = db.query(NoCanvas).filter(NoCanvas.id == no_id, NoCanvas.pessoa_id == pessoa.id).first()
    if no is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")
    no.x, no.y = onde.x, onde.y
    db.commit()
    return None


@router.delete("/canvas/nos/{no_id}", status_code=204)
def tirar_da_superficie(
    no_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Tira do Canvas SEM APAGAR A NOTA — o item 5 do contrato.

    A nota continua na estante, no livro e no caderno. Se ela nasceu solta aqui,
    também continua: apagá-la junto faria "tirar da superfície" destruir algo
    que só existe aqui, e as duas ações precisam ser distinguíveis.
    """
    pessoa = _quem(db, mekora_sessao)
    no = db.query(NoCanvas).filter(NoCanvas.id == no_id, NoCanvas.pessoa_id == pessoa.id).first()
    if no is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")
    db.delete(no)
    db.commit()
    return None


@router.post("/canvas/ligacoes", status_code=201)
def ligar(
    nova: LigacaoNova,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)

    if nova.de_id == nova.para_id:
        raise HTTPException(status_code=400, detail="Uma nota não se liga a ela mesma.")

    de_id, para_id = _normalizar(nova.de_id, nova.para_id)

    donas = (
        db.query(Nota)
        .filter(Nota.id.in_([de_id, para_id]), Nota.pessoa_id == pessoa.id)
        .count()
    )
    if donas != 2:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    ja = (
        db.query(Ligacao)
        .filter(Ligacao.pessoa_id == pessoa.id, Ligacao.de_id == de_id, Ligacao.para_id == para_id)
        .first()
    )
    if ja is not None:
        return {"id": ja.id, "de_id": de_id, "para_id": para_id, "ja_existia": True}

    l = Ligacao(pessoa_id=pessoa.id, de_id=de_id, para_id=para_id, como="mao")
    db.add(l)
    db.commit()
    db.refresh(l)
    return {"id": l.id, "de_id": de_id, "para_id": para_id, "ja_existia": False}


@router.delete("/canvas/ligacoes/{ligacao_id}", status_code=204)
def desligar(
    ligacao_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    pessoa = _quem(db, mekora_sessao)
    l = db.query(Ligacao).filter(Ligacao.id == ligacao_id, Ligacao.pessoa_id == pessoa.id).first()
    if l is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")
    db.delete(l)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Os grupos — nó 895:6938
# ---------------------------------------------------------------------------

# Um teto para o nome, e um para o tamanho. Não é sobre validar a escolha: é
# para que um pedido malformado não vire uma linha de banco de tamanho
# arbitrário, nem um retângulo de um milhão de pixels que trava a tela ao
# desenhar.
NOME_MAXIMO = 120
LADO_MINIMO = 120
LADO_MAXIMO = 8000


def _meu_grupo(db: Session, pessoa: Pessoa, grupo_id: int) -> GrupoCanvas:
    g = (
        db.query(GrupoCanvas)
        .filter(GrupoCanvas.id == grupo_id, GrupoCanvas.pessoa_id == pessoa.id)
        .first()
    )
    if g is None:
        raise HTTPException(status_code=404, detail="Esse grupo não existe.")
    return g


def _lado(valor: float) -> float:
    return max(LADO_MINIMO, min(LADO_MAXIMO, float(valor)))


def _fora(g: GrupoCanvas) -> dict:
    return {"id": g.id, "nome": g.nome, "x": g.x, "y": g.y, "largura": g.largura, "altura": g.altura}


@router.post("/canvas/grupos", status_code=201)
def criar_grupo(
    novo: GrupoNovo,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    g = GrupoCanvas(
        pessoa_id=pessoa.id,
        nome=(novo.nome or "")[:NOME_MAXIMO],
        x=novo.x, y=novo.y,
        largura=_lado(novo.largura), altura=_lado(novo.altura),
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return _fora(g)


@router.patch("/canvas/grupos/{grupo_id}")
def mudar_grupo(
    grupo_id: int,
    troca: GrupoMudado,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Grava só o que veio.

    Mover, renomear e redimensionar são o mesmo pedido porque são o mesmo
    objeto, e três rotas fariam a tela escolher entre elas antes de saber qual
    canto do retângulo a pessoa pegou.
    """
    pessoa = _quem(db, mekora_sessao)
    g = _meu_grupo(db, pessoa, grupo_id)

    if troca.nome is not None:
        g.nome = troca.nome[:NOME_MAXIMO]
    if troca.x is not None:
        g.x = troca.x
    if troca.y is not None:
        g.y = troca.y
    if troca.largura is not None:
        g.largura = _lado(troca.largura)
    if troca.altura is not None:
        g.altura = _lado(troca.altura)

    db.commit()
    db.refresh(g)
    return _fora(g)


@router.delete("/canvas/grupos/{grupo_id}", status_code=204)
def apagar_grupo(
    grupo_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Some o retângulo; as notas que estavam em cima dele ficam.

    O grupo é um pedaço de chão com nome, e não um recipiente — apagar o nome do
    chão não leva junto o que estava sobre ele. É a mesma razão de "Tirar" não
    apagar a nota.
    """
    pessoa = _quem(db, mekora_sessao)
    db.delete(_meu_grupo(db, pessoa, grupo_id))
    db.commit()


# ---------------------------------------------------------------------------
# A prévia de um link — nó 895:6938
# ---------------------------------------------------------------------------

# Uma prévia buscada fica guardada em memória por meia hora. Não é otimização: é
# para o site do outro não receber um pedido a cada vez que a tela do Canvas
# abre. Em memória e não em banco porque é cache — perder no reinício não custa
# nada, e guardar no disco criaria uma cópia de conteúdo de terceiro que a tela
# de Privacidade teria de declarar.
_PREVIAS: dict = {}
VALIDADE_DA_PREVIA = 30 * 60
TETO_DO_CACHE = 200


@router.get("/canvas/previa")
def previa(
    url: str,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """O título, a descrição e a imagem de um endereço posto no Canvas.

    EXIGE CONTA. Sem isso a rota é um buscador de páginas aberto na internet,
    que qualquer um usa para esconder a própria origem atrás do servidor do
    Mekora.
    """
    from time import monotonic

    from app.services.previa_service import PreviaRecusada, buscar

    _quem(db, mekora_sessao)

    agora_ = monotonic()
    guardada = _PREVIAS.get(url)
    if guardada and agora_ - guardada[0] < VALIDADE_DA_PREVIA:
        return guardada[1]

    try:
        fora = buscar(url)
    except PreviaRecusada as e:
        # 200 com `recusada`, e não 4xx: não conseguir montar a prévia não é
        # erro do pedido. A nota continua válida com o link dentro, e a tela diz
        # por que não há cartão em vez de piscar um alarme.
        return {"endereco": url, "recusada": str(e)}

    if len(_PREVIAS) >= TETO_DO_CACHE:
        _PREVIAS.clear()
    _PREVIAS[url] = (agora_, fora)
    return fora
