"""O Canvas: trazer, mover, ligar, tirar."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.canvas import GrupoCanvas, Ligacao, LivroCanvas, MidiaCanvas, NoCanvas
from app.models.nota import CORES, Nota
from app.models.processing_job import ProcessingJob
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
    # A largura vem OPCIONAL: arrastar manda só x e y, esticar manda os três, e
    # a rota é a mesma porque do ponto de vista de quem usa é o mesmo gesto —
    # mexer no cartão.
    largura: Optional[float] = None

    # A SEÇÃO A QUE ELE PASSA A PERTENCER, e aqui os três estados importam:
    #
    #   ausente  não mexe no vínculo — é o caso de esticar, que é layout
    #   `null`   sai da seção em que estava
    #   número   entra nesta
    #
    # `null` e "ausente" precisam ser distinguíveis, e em Pydantic os dois viram
    # `None`. Quem separa é `model_fields_set`, abaixo — sem isso, todo arrasto
    # que não mencionasse a seção soltaria o objeto dela.
    grupo_id: Optional[int] = None


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
        return {"nos": [], "ligacoes": [], "grupos": [], "livros": []}

    nos = (
        db.query(NoCanvas, Nota)
        .join(Nota, Nota.id == NoCanvas.nota_id)
        .filter(NoCanvas.pessoa_id == pessoa.id)
        .all()
    )

    midias = {
        m.nota_id: {"token": m.token, "largura": m.largura, "altura": m.altura}
        for m in db.query(MidiaCanvas).filter(MidiaCanvas.pessoa_id == pessoa.id).all()
    }

    return {
        "nos": [
            {
                "id": n.id, "nota_id": nota.id, "x": n.x, "y": n.y, "largura": n.largura,
                "grupo_id": n.grupo_id,
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
                # A IMAGEM VAI JUNTO, com o tamanho. Sem o tamanho a tela não tem
                # como reservar o espaço do cartão antes de a imagem chegar, e o
                # Canvas dá um pulo a cada uma que carrega — num plano onde a
                # pessoa está arrastando, o pulo move o alvo debaixo do dedo.
                "midia": midias.get(nota.id),
            }
            for n, nota in nos
        ],
        "ligacoes": [
            {"id": l.id, "de_id": l.de_id, "para_id": l.para_id, "como": l.como}
            for l in db.query(Ligacao).filter(Ligacao.pessoa_id == pessoa.id).all()
        ],
        # OS LIVROS VÊM NO MESMO PEDIDO, pela mesma razão dos grupos. E vêm
        # como REFERÊNCIA resolvida: o cartão precisa de capa, título e autor
        # para se parecer com um livro, e buscá-los depois faria a superfície
        # aparecer com retângulos vazios que viram livros um instante depois.
        "livros": [
            {
                "id": lc.id, "job_id": j.id,
                "x": lc.x, "y": lc.y, "largura": lc.largura,
                "grupo_id": lc.grupo_id,
                "titulo": j.final_title or j.detected_title or j.original_filename,
                "autor": j.final_author or j.detected_author or "",
                "paginas": j.page_count,
                # A CAPA VEM POR TOKEN, e não por id — a mesma regra do resto do
                # storage. Sem `token_publico` não há endereço, e o cartão cai no
                # título, como o Preparo já faz.
                "capa": f"/storage/temp/{j.token_publico}/page_0.png" if j.token_publico else None,
            }
            for lc, j in (
                db.query(LivroCanvas, ProcessingJob)
                .join(ProcessingJob, ProcessingJob.id == LivroCanvas.job_id)
                .filter(LivroCanvas.pessoa_id == pessoa.id)
                .all()
            )
        ],
        # Os grupos vêm no MESMO pedido que os nós: eles são o chão em que os
        # nós estão, e chegar depois faria as notas aparecerem soltas e o
        # retângulo pousar em cima delas um instante depois.
        "grupos": [
            {"id": g.id, "nome": g.nome, "x": g.x, "y": g.y,
             "largura": g.largura, "altura": g.altura}
            for g in db.query(GrupoCanvas)
            .filter(GrupoCanvas.pessoa_id == pessoa.id, GrupoCanvas.apagado_em.is_(None))
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
    if "grupo_id" in onde.model_fields_set:
        no.grupo_id = _secao_valida(db, pessoa, onde.grupo_id)
    if onde.largura is not None:
        # TETO E PISO NO SERVIDOR, e não só na tela. A largura vem de um arrasto,
        # e um arrasto que escapa — ou um pedido escrito à mão — poria um cartão
        # de um pixel, ou de cem mil, que ninguém consegue mais pegar de volta.
        no.largura = max(200.0, min(1200.0, onde.largura))
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
        .filter(
            GrupoCanvas.id == grupo_id,
            GrupoCanvas.pessoa_id == pessoa.id,
            # Uma seção que saiu da superfície não pode ser movida nem renomeada
            # — só voltar. Sem isto ela seria editável fora da tela.
            GrupoCanvas.apagado_em.is_(None),
        )
        .first()
    )
    if g is None:
        raise HTTPException(status_code=404, detail="Esse grupo não existe.")
    return g


def _secao_valida(db: Session, pessoa: Pessoa, grupo_id):
    """A seção existe, é desta pessoa, e não saiu da superfície — ou é `None`.

    Sem esta conferência, um pedido escrito à mão poria uma nota dentro da seção
    de outra pessoa, e a tela dela mostraria um cartão que não é dela.
    """
    if grupo_id is None:
        return None
    g = (
        db.query(GrupoCanvas)
        .filter(
            GrupoCanvas.id == grupo_id,
            GrupoCanvas.pessoa_id == pessoa.id,
            GrupoCanvas.apagado_em.is_(None),
        )
        .first()
    )
    if g is None:
        raise HTTPException(status_code=404, detail="Essa seção não existe.")
    return g.id


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

    APAGAR É EM DUAS ETAPAS. A linha ganha uma marca de quando saiu, e não
    desaparece: desfazer limpa a marca e a seção volta sendo A MESMA — mesmo id,
    mesmo nome, mesma geometria. Recriar com id novo daria um objeto que só se
    parece com o anterior, e qualquer coisa que aponte para a seção ficaria
    apontando para o vazio.
    """
    from app.models.pessoa import agora as _agora

    pessoa = _quem(db, mekora_sessao)
    g = _meu_grupo(db, pessoa, grupo_id)
    g.apagado_em = _agora()
    db.commit()


@router.post("/canvas/grupos/{grupo_id}/voltar", status_code=204)
def voltar_grupo(
    grupo_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Devolve à superfície a seção que tinha saído — a mesma, com o mesmo id."""
    pessoa = _quem(db, mekora_sessao)
    g = (
        db.query(GrupoCanvas)
        .filter(GrupoCanvas.id == grupo_id, GrupoCanvas.pessoa_id == pessoa.id)
        .first()
    )
    if g is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")
    g.apagado_em = None
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


# A IMAGEM QUE A PESSOA PÕE NA SUPERFÍCIE
# =======================================
# A primeira ferramenta do dock é "adicionar mídia", e mídia é endereço OU foto.
# O endereço já tinha caminho — vira uma nota com link, e a prévia acima monta o
# cartão. A foto não tinha nenhum: não havia onde guardá-la.
#
# O QUE ENTRA NÃO É O QUE FICA, e isto é a mesma regra do retrato da conta. A
# imagem é aberta, decodificada e gravada de novo: o EXIF vai embora com ela —
# marca da câmera, data, e em foto de celular a COORDENADA DE GPS. Guardar os
# bytes que chegaram seria guardar tudo isso e servir de volta.
#
# E ela sai menor do que entrou. WebP a 82, lado máximo de 1600: uma foto de
# celular chega com 4 MB e fica com algumas centenas de KB. O Erik pediu cuidado
# com peso — "fontes, imagens e svgs são as maiores causas de peso em website" —
# e o lugar de cortar peso é na entrada, uma vez, e não em toda visita.
MIDIA_TIPOS = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MIDIA_BYTES = 12 * 1024 * 1024
MIDIA_LADO = 1600


@router.post("/canvas/midia", status_code=201)
async def por_midia(
    arquivo: UploadFile = File(...),
    x: float = Form(0),
    y: float = Form(0),
    legenda: str = Form(""),
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    import secrets
    from io import BytesIO

    from PIL import Image, ImageOps, UnidentifiedImageError

    from app.core.config import STORAGE_RAIZ

    pessoa = _quem(db, mekora_sessao)

    if arquivo.content_type not in MIDIA_TIPOS:
        raise HTTPException(
            status_code=400, detail="Formato não aceito. Mande JPEG, PNG, WebP ou GIF."
        )

    # LIDO COM TETO, e não `read()` sem limite: o `content-length` é dito pelo
    # cliente, e acreditar nele é deixar a memória do servidor na mão de quem
    # envia.
    bruto = await arquivo.read(MIDIA_BYTES + 1)
    if len(bruto) > MIDIA_BYTES:
        raise HTTPException(
            status_code=413, detail=f"A imagem passa de {MIDIA_BYTES // (1024 * 1024)} MB."
        )
    if not bruto:
        raise HTTPException(status_code=400, detail="O arquivo chegou vazio.")

    try:
        imagem = Image.open(BytesIO(bruto))
        imagem.load()
    except (UnidentifiedImageError, OSError) as exc:
        # O TIPO DECLARADO NÃO É PROVA. `content_type` vem do cliente; quem diz
        # se aquilo é imagem é o decodificador.
        raise HTTPException(status_code=400, detail="Não consegui abrir essa imagem.") from exc

    # `exif_transpose` ANTES de descartar o EXIF: a orientação mora lá, e jogar
    # os dados fora sem aplicá-la deixa a foto de celular deitada.
    imagem = ImageOps.exif_transpose(imagem)
    imagem = imagem.convert("RGB")
    imagem.thumbnail((MIDIA_LADO, MIDIA_LADO), Image.LANCZOS)

    pasta = STORAGE_RAIZ / "midia"
    pasta.mkdir(parents=True, exist_ok=True)
    token = secrets.token_urlsafe(24)
    imagem.save(pasta / f"{token}.webp", format="WEBP", quality=82, method=6)

    # A NOTA EXISTE MESMO ASSIM, e a imagem se pendura nela. Criar uma entidade
    # só para foto abriria a ontologia paralela que a DEC-0030 proíbe: no Canvas
    # tudo é nota, e uma foto é uma nota cujo corpo é uma imagem.
    nota = Nota(
        pessoa_id=pessoa.id, job_id=None, origem="", fonte="midia",
        capitulo=0, de=0, ate=0, cor="amarelo",
        trecho=(legenda or "").strip()[:2000], comentario="",
    )
    db.add(nota)
    db.flush()

    db.add(
        MidiaCanvas(
            pessoa_id=pessoa.id, nota_id=nota.id, token=token,
            largura=imagem.width, altura=imagem.height,
        )
    )
    no = NoCanvas(pessoa_id=pessoa.id, nota_id=nota.id, x=x, y=y)
    db.add(no)
    db.commit()
    db.refresh(no)
    return {
        "id": no.id, "nota_id": nota.id, "x": no.x, "y": no.y,
        "midia": {"token": token, "largura": imagem.width, "altura": imagem.height},
    }


@router.get("/canvas/midia/{token}")
def ver_midia(
    token: str,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    """A imagem, e só para quem é dono dela.

    O token aleatório no endereço é a SEGUNDA tranca. A primeira é esta consulta:
    `pessoa_id` está no FILTRO, e não numa conferência depois — a diferença é que
    um filtro não tem como ser esquecido num `if` que alguém edite amanhã.
    """
    from fastapi.responses import FileResponse

    from app.core.config import STORAGE_RAIZ

    pessoa = _quem(db, mekora_sessao)
    midia = (
        db.query(MidiaCanvas)
        .filter(MidiaCanvas.token == token, MidiaCanvas.pessoa_id == pessoa.id)
        .first()
    )
    if midia is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")

    caminho = STORAGE_RAIZ / "midia" / f"{token}.webp"
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Não encontrado.")
    # `immutable`: o arquivo nunca muda depois de escrito — o token é novo a cada
    # imagem. Sem isto o navegador reconfere a cada visita uma coisa que não tem
    # como ter mudado.
    return FileResponse(
        caminho, media_type="image/webp",
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )


# O LIVRO NA SUPERFÍCIE
# =====================
# `job_id` e não uma cópia: o livro continua sendo da estante, e o que existe
# aqui é a POSIÇÃO dele. É a mesma regra que a nota já segue.
class LivroNovo(BaseModel):
    job_id: int
    x: float = 0
    y: float = 0


@router.post("/canvas/livros", status_code=201)
def por_livro(
    novo: LivroNovo,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)

    # O `dono_id` está no FILTRO. Sem ele, qualquer id de livro entraria na
    # superfície de qualquer pessoa, e o cartão traria título e autor junto.
    job = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.id == novo.job_id, ProcessingJob.dono_id == pessoa.id)
        .first()
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")

    ja = (
        db.query(LivroCanvas)
        .filter(LivroCanvas.pessoa_id == pessoa.id, LivroCanvas.job_id == job.id)
        .first()
    )
    if ja is not None:
        # Não é erro: pedir para trazer o que já está aqui tem como resposta certa
        # mostrar onde está — não recusar.
        return {"id": ja.id, "job_id": job.id, "x": ja.x, "y": ja.y, "ja_estava": True}

    lc = LivroCanvas(pessoa_id=pessoa.id, job_id=job.id, x=novo.x, y=novo.y)
    db.add(lc)
    db.commit()
    db.refresh(lc)
    return {"id": lc.id, "job_id": job.id, "x": lc.x, "y": lc.y, "ja_estava": False}


@router.patch("/canvas/livros/{livro_id}", status_code=204)
def mover_livro(
    livro_id: int,
    onde: Movimento,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    pessoa = _quem(db, mekora_sessao)
    lc = (
        db.query(LivroCanvas)
        .filter(LivroCanvas.id == livro_id, LivroCanvas.pessoa_id == pessoa.id)
        .first()
    )
    if lc is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")
    lc.x, lc.y = onde.x, onde.y
    if "grupo_id" in onde.model_fields_set:
        lc.grupo_id = _secao_valida(db, pessoa, onde.grupo_id)
    if onde.largura is not None:
        lc.largura = max(160.0, min(600.0, onde.largura))
    db.commit()
    return None


@router.delete("/canvas/livros/{livro_id}", status_code=204)
def tirar_livro(
    livro_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Tira da superfície. NÃO apaga o livro.

    A rota apaga uma linha de `canvas_livros` e nada mais: o arquivo, as notas, os
    destaques e o lugar na estante continuam exatamente onde estavam. Apagar o
    livro de verdade é outra rota, em outra tela, e com outra pergunta.
    """
    pessoa = _quem(db, mekora_sessao)
    lc = (
        db.query(LivroCanvas)
        .filter(LivroCanvas.id == livro_id, LivroCanvas.pessoa_id == pessoa.id)
        .first()
    )
    if lc is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")
    db.delete(lc)
    db.commit()
    return None
