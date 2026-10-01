"""As notas de um livro."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, exists, func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.nota import CORES, Nota
from app.models.processing_job import ProcessingJob
from app.services import clippings_service
from app.models.pessoa import Pessoa, agora
from app.services import acesso_service, capa_service

router = APIRouter()

# Quantos caracteres de cada lado da citação entram na âncora. Cento e vinte é
# perto de duas linhas de leitura: o bastante para distinguir uma ocorrência das
# outras três iguais num capítulo, e pouco o bastante para não virar cópia do
# parágrafo dentro do banco.
CONTEXTO = 120


class NotaNova(BaseModel):
    # A FONTE VEM PRIMEIRO, e a ordem não é estilo: o Pydantic valida na ordem
    # de declaração, e o validador de `ate` precisa saber de onde a nota vem
    # para decidir se ela tem de cobrir algum caractere. Declarada depois, ela
    # não estaria em `info.data` na hora da conferência — e o campo "Escrever
    # sobre o livro" continuaria respondendo 422.
    #
    # O nó `895:7839` traz "Escrever sobre o livro": uma nota do LIVRO INTEIRO,
    # sem trecho — o que se pensa depois de ler, e que não cabe em nenhuma frase
    # marcada. `leitura` continua o padrão, e `kindle` nunca chega por aqui (ela
    # vem da importação).
    fonte: str = "leitura"

    capitulo: int = Field(ge=0)
    de: int = Field(ge=0)
    ate: int = Field(ge=0)
    cor: str = "amarelo"
    trecho: str = ""
    comentario: str = ""
    # O TEXTO EM VOLTA — a outra metade da âncora, pela `DEC-0016`. Vem da tela,
    # que é quem tem o texto do capítulo em mãos: o servidor nunca abriu o EPUB.
    # Opcionais, porque a nota do livro inteiro não tem trecho e portanto não tem
    # volta, e porque um cliente antigo continua podendo gravar sem eles.
    antes: str = ""
    depois: str = ""

    @field_validator("fonte")
    @classmethod
    def fonte_conhecida(cls, v: str) -> str:
        if v not in ("leitura", "livro"):
            raise ValueError("A nota vem da leitura ou do livro.")
        return v

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
        """Uma nota de LEITURA precisa cobrir pelo menos um caractere.

        Uma nota SOBRE O LIVRO não cobre nada, e é isso que ela é: o nó
        `895:7839` pede o que ficou do conjunto, e o conjunto não tem começo nem
        fim no texto. `de` e `ate` em zero dizem exatamente isso — ela não aponta
        para lugar nenhum.

        A conferência ficou onde estava, e passou a perguntar de onde a nota vem.
        Sem isso, o campo "Escrever sobre o livro" respondia 422 a cada tentativa
        — e a tela mostrava o erro do Pydantic, que fala de `ate` e de `de` para
        quem só escreveu uma frase.
        """
        if info.data.get("fonte") == "livro":
            return v
        de = info.data.get("de")
        if de is not None and v <= de:
            raise ValueError("a nota precisa cobrir pelo menos um caractere")
        return v


# Os estados que uma nota pode ter. Hoje um só, e nulo — a lista existe para o
# segundo entrar por aqui, e não como `if estado == "rascunho"` espalhado.
ESTADOS_DA_NOTA = {"rascunho"}


class NotaEditada(BaseModel):
    cor: Optional[str] = None
    comentario: Optional[str] = None
    # "" APAGA O ESTADO, e `None` não mexe nele. São coisas diferentes: quem
    # muda só a cor manda `estado` ausente; quem tira o rascunho manda vazio.
    estado: Optional[str] = None
    # O TEXTO DA NOTA ESCRITA NO CANVAS, com a mesma guarda da outra rota.
    #
    # ELE FALTAVA AQUI, e a falta era uma regressão de 06/09: o R-43 acrescentou
    # o tratamento de `trecho` nas DUAS rotas de edição e o campo em UM dos dois
    # schemas. Toda chamada a esta rota passou a estourar
    # `AttributeError: 'NotaEditada' object has no attribute 'trecho'`.
    #
    # Passou porque naquele dia rodei só os testes de nota. A suíte inteira
    # pegou na primeira vez que rodou: dois testes de sugestão, vermelhos por um
    # motivo que não tinha nada a ver com sugestão.
    trecho: Optional[str] = None

    @field_validator("estado")
    @classmethod
    def estado_conhecido(cls, v: Optional[str]) -> Optional[str]:
        if v not in (None, "") and v not in ESTADOS_DA_NOTA:
            raise ValueError(f"estado de nota desconhecido: {v}")
        return v

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
        "id": n.id, "job_id": n.job_id, "capitulo": n.capitulo, "de": n.de, "ate": n.ate,
        "cor": n.cor, "trecho": n.trecho, "comentario": n.comentario,
        # A ÂNCORA VAI INTEIRA PARA A TELA. É ela quem resolve os cinco degraus
        # da `DEC-0016`, porque é ela quem tem o texto do livro — o servidor
        # guarda e devolve, não procura.
        "antes": n.antes, "depois": n.depois,
        # De onde a nota veio. A tela precisa disto para dizer "do Kindle" em
        # vez de oferecer "abrir no livro" numa nota que não tem livro aqui.
        "origem": n.origem, "fonte": n.fonte,
        # QUANDO A ORIGEM SAIU. A tela precisa dizer "o livro foi removido" em
        # vez de "escrita no Canvas, sem livro" — são coisas diferentes, e sem
        # este campo elas ficam idênticas.
        "origem_removida_em": n.origem_removida_em,
        # A MARCA, e o que a derruba. A tela não recebe "está para revisar": ela
        # recebe as duas datas e compara, porque o critério é do produto e
        # esconder o critério é esconder de que a saída é derivada.
        "revisar_desde": n.revisar_desde,
        "atualizada_em": n.atualizada_em,
        # O estado da nota — hoje `"rascunho"` ou nulo. A tela precisa dele para
        # o recorte do nó 895:7631 e para explicar por que a nota não entra num
        # estudo.
        "estado": n.estado,
        "criada_em": n.criada_em,
    }


def _cursor_da_nota(n: Nota) -> str:
    return f"{n.criada_em.isoformat()}|{n.id}"


def _ler_cursor_da_nota(cursor: Optional[str]) -> tuple[datetime, int] | None:
    if not cursor:
        return None
    try:
        quando, nota_id = cursor.rsplit("|", 1)
        return datetime.fromisoformat(quando), int(nota_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="O ponto de continuação das notas é inválido.")


def _consulta_filtrada(db: Session, pessoa_id: int, recorte: str, busca: str):
    """Uma única definição dos recortes para contagem e página.

    A página anterior baixava todas as notas e filtrava no navegador. Aqui o
    recorte faz parte da consulta: `Mostrar mais` passa a significar pedir a
    próxima fatia, e não revelar HTML que já estava escondido.
    """
    from app.models.canvas import Ligacao

    q = db.query(Nota).filter(Nota.pessoa_id == pessoa_id)
    if recorte == "livros":
        q = q.filter(or_(Nota.fonte == "leitura", Nota.job_id.is_not(None)))
    elif recorte == "kindle":
        q = q.filter(Nota.fonte == "kindle")
    elif recorte == "escritas-aqui":
        q = q.filter(Nota.fonte == "solta")
    elif recorte == "sem-ligacao":
        ligada_de = exists().where(
            Ligacao.pessoa_id == pessoa_id,
            Ligacao.de_tipo == "nota",
            Ligacao.de_id == Nota.id,
        )
        ligada_para = exists().where(
            Ligacao.pessoa_id == pessoa_id,
            Ligacao.para_tipo == "nota",
            Ligacao.para_id == Nota.id,
        )
        q = q.filter(~ligada_de, ~ligada_para)
    elif recorte == "revisar":
        q = q.filter(
            Nota.revisar_desde.is_not(None),
            or_(Nota.atualizada_em.is_(None), Nota.atualizada_em <= Nota.revisar_desde),
        )
    elif recorte == "escritas":
        q = q.filter(func.length(func.trim(Nota.comentario)) > 0)
    elif recorte != "todas":
        raise HTTPException(status_code=400, detail="Recorte de notas desconhecido.")

    termo = busca.strip().lower()
    if termo:
        # `%` e `_` escritos pela pessoa são caracteres, não curingas SQL.
        escapado = termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        como = f"%{escapado}%"
        q = q.filter(or_(
            func.lower(Nota.trecho).like(como, escape="\\"),
            func.lower(Nota.comentario).like(como, escape="\\"),
            func.lower(Nota.origem).like(como, escape="\\"),
        ))
    return q


@router.get("/notas/pagina")
def pagina(
    limite: int = Query(default=60, ge=1, le=100),
    cursor: Optional[str] = None,
    recorte: str = "todas",
    q: str = Query(default="", max_length=200),
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Uma página estável de notas, ordenada da mais recente para a mais antiga."""
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return {"itens": [], "proximo": None, "total": 0, "contagens": {}}

    base = _consulta_filtrada(db, pessoa.id, recorte, q)
    total = base.order_by(None).count()
    ponto = _ler_cursor_da_nota(cursor)
    consulta = base
    if ponto:
        quando, nota_id = ponto
        consulta = consulta.filter(or_(
            Nota.criada_em < quando,
            and_(Nota.criada_em == quando, Nota.id < nota_id),
        ))
    notas = consulta.order_by(Nota.criada_em.desc(), Nota.id.desc()).limit(limite + 1).all()
    tem_mais = len(notas) > limite
    notas = notas[:limite]

    from app.models.canvas import Ligacao
    ids = {n.id for n in notas}
    quantas = {}
    if ids:
        for a, b in db.query(Ligacao.de_id, Ligacao.para_id).filter(
            Ligacao.pessoa_id == pessoa.id,
            or_(
                and_(Ligacao.de_tipo == "nota", Ligacao.de_id.in_(ids)),
                and_(Ligacao.para_tipo == "nota", Ligacao.para_id.in_(ids)),
            ),
        ):
            if a in ids: quantas[a] = quantas.get(a, 0) + 1
            if b in ids: quantas[b] = quantas.get(b, 0) + 1

    jobs = {
        j.id: j for j in db.query(ProcessingJob).filter(
            ProcessingJob.id.in_({n.job_id for n in notas if n.job_id}),
            ProcessingJob.dono_id == pessoa.id,
        ).all()
    }
    itens = [{
        **_fora(n),
        "ligadas": quantas.get(n.id, 0),
        "cover_url": capa_service.url(jobs[n.job_id]) if n.job_id in jobs else None,
        "livro_titulo": (jobs[n.job_id].final_title or jobs[n.job_id].detected_title or jobs[n.job_id].original_filename) if n.job_id in jobs else None,
        "livro_autor": (jobs[n.job_id].final_author or jobs[n.job_id].detected_author) if n.job_id in jobs else None,
    } for n in notas]

    recortes = ("todas", "livros", "kindle", "escritas-aqui", "sem-ligacao", "revisar", "escritas")
    contagens = {nome: _consulta_filtrada(db, pessoa.id, nome, q).order_by(None).count() for nome in recortes}
    return {
        "itens": itens,
        "proximo": _cursor_da_nota(notas[-1]) if tem_mais and notas else None,
        "total": total,
        "contagens": contagens,
    }


# `/notas/todas` e nao `/notas`, porque `/notas` e uma TELA — o lugar onde as
# notas vivem. Terceira vez que isto aparece (entrar, canvas, estudos), e a
# terceira em que foi resolvido antes de doer.
@router.get("/notas/todas")
def todas(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> List[dict]:
    """Todas as notas da pessoa, de todos os livros.

    Existe porque três telas precisam delas juntas: o Canvas, os Estudos e a
    importação. `/jobs/{id}/notas` responde por livro, e montar o conjunto no
    navegador seria uma chamada por livro — dezenas para desenhar uma tela.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return []
    notas = (
        db.query(Nota)
        .filter(Nota.pessoa_id == pessoa.id)
        .order_by(Nota.criada_em.desc())
        .all()
    )

    # QUANTAS LIGAÇÕES CADA UMA TEM — para o recorte "Sem ligação".
    #
    # Contado aqui, numa consulta só, e não com um pedido por nota: a tela lista
    # o acervo inteiro, e N+1 pedidos numa lista de trezentas é o jeito de fazer
    # a página demorar por uma pergunta que o servidor responde de uma vez.
    from app.models.canvas import Ligacao

    quantas = {}
    for a, b in db.query(Ligacao.de_id, Ligacao.para_id).filter(
        Ligacao.pessoa_id == pessoa.id,
        Ligacao.de_tipo == "nota", Ligacao.para_tipo == "nota",
    ):
        quantas[a] = quantas.get(a, 0) + 1
        quantas[b] = quantas.get(b, 0) + 1

    jobs = {
        j.id: j
        for j in db.query(ProcessingJob).filter(
            ProcessingJob.id.in_({n.job_id for n in notas if n.job_id}),
            ProcessingJob.dono_id == pessoa.id,
        ).all()
    }
    return [
        {
            **_fora(n),
            "ligadas": quantas.get(n.id, 0),
            "cover_url": capa_service.url(jobs[n.job_id]) if n.job_id in jobs else None,
            "livro_titulo": (
                jobs[n.job_id].final_title
                or jobs[n.job_id].detected_title
                or jobs[n.job_id].original_filename
            ) if n.job_id in jobs else None,
            "livro_autor": (
                jobs[n.job_id].final_author or jobs[n.job_id].detected_author
            ) if n.job_id in jobs else None,
        }
        for n in notas
    ]


@router.get("/notas/agrupadas")
def agrupadas(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """"Você ligou" — os assuntos que apareceram no acervo sem ninguém organizar.

    O nó `895:8849` põe esta seção nos Estudos: "sete notas suas, em quatro
    livros diferentes, usam as mesmas palavras". É a promessa da Apresentação
    ganhando tela — *"o que você marcou em livros diferentes sobre o mesmo
    assunto se encontra, sem você organizar pasta nenhuma"*.

    NÃO É `/{id}/sugestoes` COM OUTRO NOME. Aquela responde "o que se parece com
    ESTA nota", e vive na página de uma nota. Esta responde "que fios existem no
    que eu já marquei", e é uma varredura do acervo inteiro.

    O CAMINHO É `/notas/agrupadas`, E A ORDEM DE DECLARAÇÃO IMPORTA.
    
    Ele precisa vir antes de `/notas/{nota_id}` — o FastAPI casa na ordem em que
    as rotas são declaradas, e a primeira versão deste endpoint estava depois:
    "agrupadas" caía no caminho do id e o FastAPI respondia 422 tentando lê-lo
    como número. É o mesmo cuidado que `/notas/todas` já exigia, e ele está
    declarado três linhas acima por essa razão.
    """
    from app.models.grupo_ignorado import GrupoIgnorado
    from app.services import sugestoes_service

    pessoa = _quem(db, mekora_sessao)
    minhas = (
        db.query(Nota)
        .filter(Nota.pessoa_id == pessoa.id)
        # RASCUNHO FICA DE FORA DA VARREDURA. O que esta seção oferece é juntar o
        # grupo num estudo, e rascunho não entra em estudo — um grupo com um
        # dentro traria um botão que responde 409 na metade do caminho.
        .filter((Nota.estado.is_(None)) | (Nota.estado != "rascunho"))
        .order_by(Nota.criada_em.desc())
        .limit(sugestoes_service.TETO_DE_NOTAS)
        .all()
    )

    # OS QUE A PESSOA MANDOU PARAR. A assinatura é o conjunto de notas do grupo,
    # e por isso um grupo ignorado que ganha nota nova VOLTA a aparecer — a
    # assinatura muda, e o Mekora tem coisa nova a dizer sobre aquele assunto.
    # Ignorar não é "nunca mais me fale disso"; é "com estas notas, já entendi".
    calados = {
        linha.assinatura
        for linha in db.query(GrupoIgnorado).filter(GrupoIgnorado.pessoa_id == pessoa.id)
    }
    grupos = [
        g for g in sugestoes_service.agrupar(minhas)
        if sugestoes_service.assinatura_do_grupo(g) not in calados
    ]

    return {
        "grupos": grupos,
        # Quantos estão calados agora. A tela precisa disso para poder dizer que
        # há fios escondidos, em vez de a seção sumir sem explicação.
        "calados": len(calados),
        # OS CRITÉRIOS SAEM NA RESPOSTA, como os cortes das faixas: a tela diz
        # "a partir de N palavras", e sem isso o produto afirma um agrupamento
        # que ninguém pode discordar.
        "criterios": {
            "palavras": sugestoes_service.PROXIMAS,
            "notas": sugestoes_service.MINIMO_DO_GRUPO,
            "livros": sugestoes_service.MINIMO_DE_LIVROS,
        },
        # Quantas notas entraram na varredura. Quando o acervo passa do teto, a
        # tela pode dizer que olhou as mais recentes — em vez de deixar a pessoa
        # achar que olhou tudo.
        "olhadas": len(minhas),
        "teto": sugestoes_service.TETO_DE_NOTAS,
    }


@router.get("/notas/{nota_id}")
def uma(
    nota_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Uma nota, com tudo que a rodeia.

    Junta numa resposta o que a tela precisa: a nota, os estudos em que ela
    está, as notas ligadas a ela e o livro de onde veio. São quatro consultas
    que a tela faria em quatro idas à rede, e ela desenha tudo de uma vez.
    """
    from app.models.canvas import Ligacao
    from app.models.estudo import Estudo, EstudoNota

    pessoa = _quem(db, mekora_sessao)
    n = db.query(Nota).filter(Nota.id == nota_id, Nota.pessoa_id == pessoa.id).first()
    if n is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    estudos = (
        db.query(Estudo)
        .join(EstudoNota, EstudoNota.estudo_id == Estudo.id)
        .filter(EstudoNota.nota_id == n.id)
        .all()
    )

    # A ligação é mútua: ela pode estar guardada em qualquer um dos dois lados,
    # e a nota do "outro lado" é a que não é esta.
    ligadas = []
    # AS PONTAS TÊM TIPO, e o filtro precisa dele: sem `de_tipo == "nota"`, apagar
    # a nota 7 levaria junto uma ligação que aponta para o LIVRO 7. Esta rota é o
    # que substitui a chave estrangeira que as pontas perderam ao virarem
    # polimórficas — ela precisa estar certa.
    for l in db.query(Ligacao).filter(
        Ligacao.pessoa_id == pessoa.id,
        ((Ligacao.de_tipo == "nota") & (Ligacao.de_id == n.id))
        | ((Ligacao.para_tipo == "nota") & (Ligacao.para_id == n.id)),
    ).all():
        # O "outro lado" pode ser um LIVRO agora, e aí ele não entra nesta lista:
        # ela é de notas ligadas, e um livro não é uma nota. A ligação continua
        # existindo e sendo desenhada no Canvas.
        desteLado = l.de_tipo == "nota" and l.de_id == n.id
        outro_tipo = l.para_tipo if desteLado else l.de_tipo
        outro = l.para_id if desteLado else l.de_id
        if outro_tipo != "nota":
            continue
        vizinha = db.query(Nota).filter(Nota.id == outro).first()
        if vizinha is not None:
            ligadas.append({
                "ligacao_id": l.id, "id": vizinha.id, "trecho": vizinha.trecho,
                "cor": vizinha.cor, "origem": vizinha.origem, "como": l.como,
            })

    livro = None
    if n.job_id:
        j = db.query(ProcessingJob).filter(ProcessingJob.id == n.job_id).first()
        if j is not None:
            livro = {"id": j.id, "titulo": j.final_title or j.original_filename}

    return {
        **_fora(n),
        "livro": livro,
        "estudos": [{"id": e.id, "nome": e.nome, "sobre": e.sobre} for e in estudos],
        "ligadas": ligadas,
    }


@router.post("/notas/importar")
async def importar(
    arquivo: UploadFile = File(...),
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Importa o `My Clippings.txt` do Kindle.

    REIMPORTAR NÃO DUPLICA, e isso decide se a coisa é usável. O arquivo do
    Kindle CRESCE — ele nunca é limpo sozinho —, então a segunda importação
    traz tudo da primeira mais o que é novo. Sem conferir, a estante dobraria a
    cada vez.

    A conferência é por pessoa, livro e texto. Não inclui a posição de
    propósito: o Kindle a reescreve quando o livro é atualizado, e a mesma frase
    marcada uma vez voltaria como nota nova.

    A NOTA IMPORTADA NÃO GANHA ÂNCORA. `de` e `ate` ficam em zero, porque a
    "posição 176-178" do Kindle é a unidade DELE, e não deslocamento no texto
    que o Mekora extraiu. Guardar uma na outra faria a nota apontar um trecho
    qualquer com toda a confiança de uma âncora de verdade.
    """
    pessoa = _quem(db, mekora_sessao)

    bruto = await arquivo.read()
    if len(bruto) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo é grande demais para um My Clippings.")

    # O Kindle escreve em UTF-8, e alguns aparelhos antigos em latin-1. Falhar
    # por um acento seria descartar o arquivo inteiro.
    try:
        texto = bruto.decode("utf-8")
    except UnicodeDecodeError:
        texto = bruto.decode("latin-1", errors="replace")

    registros = clippings_service.ler(texto)
    if not registros:
        raise HTTPException(
            status_code=400,
            detail="Não encontrei destaques nesse arquivo. Ele é o My Clippings.txt do seu Kindle?",
        )

    # Os títulos que já existem na estante DESTA pessoa, para ligar a nota ao
    # livro quando ele estiver aqui. Comparado em minúsculas e sem espaço nas
    # pontas: "Enviesados " e "enviesados" são o mesmo livro.
    daqui = {}
    for j in db.query(ProcessingJob).filter(ProcessingJob.dono_id == pessoa.id).all():
        for nome in (j.final_title, j.detected_title, j.original_filename):
            if nome:
                daqui.setdefault(nome.strip().lower(), j.id)

    ja_tem = {
        (n.origem.strip().lower(), n.trecho.strip())
        for n in db.query(Nota).filter(Nota.pessoa_id == pessoa.id).all()
    }

    novas = repetidas = 0
    livros = set()
    for r in registros:
        chave = (r["livro"].strip().lower(), r["texto"].strip())
        if chave in ja_tem:
            repetidas += 1
            continue
        ja_tem.add(chave)

        db.add(Nota(
            pessoa_id=pessoa.id,
            job_id=daqui.get(r["livro"].strip().lower()),
            origem=r["livro"],
            fonte="kindle",
            capitulo=0, de=0, ate=0,
            cor="amarelo",
            trecho=r["texto"][:2000],
            # A nota do Kindle vira COMENTÁRIO, e o destaque vira trecho: no
            # Mekora o trecho é o que foi marcado no livro, e a nota é o que a
            # pessoa escreveu. Trocar os dois faria o que ela escreveu parecer
            # citação do autor.
            comentario=r["texto"][:2000] if r["tipo"] == "nota" else "",
        ))
        novas += 1
        livros.add(r["livro"])

    db.commit()
    return {
        "novas": novas,
        "repetidas": repetidas,
        "livros": sorted(livros),
        "ligadas_a_livro_daqui": sum(1 for r in registros if r["livro"].strip().lower() in daqui),
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
        # O CONTEXTO TEM TETO PRÓPRIO, e ele é curto de propósito: o que
        # desambigua uma citação é a frase ao redor, não a página. Guardar mais
        # engorda cada linha sem tornar o degrau 2 mais certeiro.
        antes=nova.antes[:CONTEXTO], depois=nova.depois[:CONTEXTO],
        fonte=nova.fonte,
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
    # O TEXTO SÓ MUDA NA NOTA QUE NÃO VEIO DE LIVRO, e a distinção não é
    # burocracia: numa nota de leitura o `trecho` é a CITAÇÃO — o que o livro
    # diz —, e o que a pessoa escreveu está no `comentario`. Deixar editar a
    # citação faria o Mekora guardar, com origem e página, uma frase que o autor
    # não escreveu. Na nota nascida no Canvas o `trecho` é o texto dela: não há
    # livro atrás, e é a única coisa que a pessoa escreveu.
    #
    # O R-43 é os dois lados disto: "não dá pra escrever nem alterar o que tem
    # na nota". Não dava mesmo, em lugar nenhum — nem no Canvas, que não tinha
    # ação de editar, nem na página da nota, cujo "Editar o que escrevi" mexe no
    # `comentario`, que numa nota do Canvas está vazio.
    if troca.trecho is not None:
        if n.job_id is not None:
            raise HTTPException(
                status_code=400,
                detail="O trecho de uma nota de leitura é a citação do livro, e não se edita.",
            )
        n.trecho = troca.trecho[:2000]
    if troca.comentario is not None:
        n.comentario = troca.comentario
    if troca.estado is not None:
        # Vazio apaga: "nota comum" e "estado em branco" são o mesmo estado para
        # quem lê a tela, e dois jeitos de escrever o mesmo estado é como um
        # deles deixa de ser tratado.
        n.estado = troca.estado or None
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


class GrupoParaCalar(BaseModel):
    """Os ids das notas do grupo. É o conjunto que identifica um grupo — eles não
    existem como registro, nascem de uma varredura."""

    notas: list[int]


class NotaMudada(BaseModel):
    """O que se muda numa nota, sem falar de trabalho nenhum."""

    comentario: Optional[str] = None
    cor: Optional[str] = None
    estado: Optional[str] = None
    # `true` marca com a data de agora; `false` desmarca. `None` não mexe.
    revisar: Optional[bool] = None
    # O TEXTO DA NOTA ESCRITA NO CANVAS — e SÓ dela. Ver a guarda em `mudar_nota`.
    trecho: Optional[str] = None

    @field_validator("cor")
    @classmethod
    def cor_do_sistema(cls, v):
        if v is not None and v not in CORES:
            raise ValueError(f"cor fora do sistema: {v}. Use uma de {', '.join(CORES)}.")
        return v


def _minha_nota(db: Session, pessoa, nota_id: int) -> Nota:
    n = db.query(Nota).filter(Nota.id == nota_id, Nota.pessoa_id == pessoa.id).first()
    if n is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")
    return n


@router.patch("/notas/{nota_id}")
def mudar_nota(
    nota_id: int,
    troca: NotaMudada,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Muda uma nota — QUALQUER nota, inclusive a que não tem livro.

    POR QUE ESTA ROTA EXISTE, e é conserto e não conveniência: as outras duas
    ficam em `/jobs/{job_id}/notas/{nota_id}`, e a nota escrita no Canvas e a
    trazida do Kindle têm `job_id` NULO. A tela chamava com `job_id ?? 0`, o
    filtro `Nota.job_id == 0` não casava com NULL, e o servidor respondia 404.

    Medido em 03/09: `PATCH /jobs/0/notas/47807` → 404, `DELETE` idem. **Editar
    ou apagar uma nota do Canvas pela página dela era impossível**, e ninguém
    tinha percebido porque a página funciona para as notas de leitura, que são a
    maioria.

    A identidade da nota é o `id` dela; o trabalho nunca foi necessário para
    achá-la, só para escopar. Aqui o escopo é o dono, que é o que importa.
    """
    pessoa = _quem(db, mekora_sessao)
    n = _minha_nota(db, pessoa, nota_id)

    # O TEXTO SÓ MUDA NA NOTA QUE NÃO VEIO DE LIVRO, e a distinção não é
    # burocracia: numa nota de leitura o `trecho` é a CITAÇÃO — o que o livro
    # diz —, e o que a pessoa escreveu está no `comentario`. Deixar editar a
    # citação faria o Mekora guardar, com origem e página, uma frase que o autor
    # não escreveu. Na nota nascida no Canvas o `trecho` é o texto dela: não há
    # livro atrás, e é a única coisa que a pessoa escreveu.
    #
    # O R-43 é os dois lados disto: "não dá pra escrever nem alterar o que tem
    # na nota". Não dava mesmo, em lugar nenhum — nem no Canvas, que não tinha
    # ação de editar, nem na página da nota, cujo "Editar o que escrevi" mexe no
    # `comentario`, que numa nota do Canvas está vazio.
    if troca.trecho is not None:
        if n.job_id is not None:
            raise HTTPException(
                status_code=400,
                detail="O trecho de uma nota de leitura é a citação do livro, e não se edita.",
            )
        n.trecho = troca.trecho[:2000]
    if troca.comentario is not None:
        n.comentario = troca.comentario
    if troca.cor is not None:
        n.cor = troca.cor
    if troca.estado is not None:
        n.estado = troca.estado or None
    if troca.revisar is not None:
        if troca.revisar:
            # O MESMO INSTANTE NOS DOIS CAMPOS, e escrito à mão nos dois.
            #
            # `atualizada_em` tem `onupdate`, então qualquer escrita a move — e a
            # marca nasceria um milésimo ATRÁS dela, isto é, já vencida pelo
            # critério que a derruba. Medido: `revisar_desde` 11.998875 contra
            # `atualizada_em` 11.999906.
            #
            # Escrever `atualizada_em` explicitamente vence o `onupdate`, e os
            # dois saem iguais: a marca vale até a PRÓXIMA edição, que é o que
            # ela quer dizer.
            quando = agora()
            n.revisar_desde = quando
            n.atualizada_em = quando
        else:
            n.revisar_desde = None

    db.commit()
    db.refresh(n)
    return _fora(n)


@router.delete("/notas/{nota_id}", status_code=204)
def apagar_nota(
    nota_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Apaga uma nota, com ou sem livro. Mesma razão da rota acima."""
    pessoa = _quem(db, mekora_sessao)
    db.delete(_minha_nota(db, pessoa, nota_id))
    db.commit()
    return None


@router.post("/notas/{nota_id}/dispensar/{outra_id}", status_code=204)
def dispensar(
    nota_id: int,
    outra_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """A pessoa recusou esta sugestão, e ela não volta.

    O `SISTEMA.md` já declarava isto como forma vigente — *"uma sugestão que
    volta na próxima visita deixa de ser sugestão e vira insistência"* —, e
    existia só para grupos, nos Estudos. No nível da nota as candidatas voltavam
    para sempre, e a única saída era ligar: o oposto do que a pessoa quis dizer.

    O PAR É NORMALIZADO. Sem isso, dispensar A→B e depois receber B→A traria de
    volta exatamente o que foi recusado.

    Idempotente: dispensar de novo o mesmo par não é erro, é a mesma dispensa.
    """
    from app.models.dispensa import SugestaoDispensada, par

    pessoa = _quem(db, mekora_sessao)
    _minha_nota(db, pessoa, nota_id)
    _minha_nota(db, pessoa, outra_id)

    a, b = par(nota_id, outra_id)
    ja = db.query(SugestaoDispensada).filter(
        SugestaoDispensada.pessoa_id == pessoa.id,
        SugestaoDispensada.a_id == a, SugestaoDispensada.b_id == b,
    ).first()
    if ja is None:
        db.add(SugestaoDispensada(pessoa_id=pessoa.id, a_id=a, b_id=b))
        db.commit()
    return None


@router.delete("/notas/{nota_id}/dispensar/{outra_id}", status_code=204)
def desfazer_dispensa(
    nota_id: int,
    outra_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Devolve a sugestão dispensada.

    Sem isto, dispensar seria silencioso E permanente: um clique errado mataria a
    sugestão para sempre e a pessoa nunca saberia. A tela oferece o desfazer no
    mesmo instante, no aviso — o padrão que o Canvas já usa.
    """
    from app.models.dispensa import SugestaoDispensada, par

    pessoa = _quem(db, mekora_sessao)
    a, b = par(nota_id, outra_id)
    linha = db.query(SugestaoDispensada).filter(
        SugestaoDispensada.pessoa_id == pessoa.id,
        SugestaoDispensada.a_id == a, SugestaoDispensada.b_id == b,
    ).first()
    if linha is not None:
        db.delete(linha)
        db.commit()
    return None


@router.post("/notas/agrupadas/ignorar", status_code=204)
def ignorar_grupo(
    qual: GrupoParaCalar,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Response:
    """Para de sugerir este grupo.

    O nó 895:8849 põe um "Ignorar" ao lado de cada fio, e ele ficou de fora
    porque ignorar precisa ser LEMBRADO e não havia onde. Um botão que esquece ao
    recarregar é pior que botão nenhum: ele ensina que o produto não escuta.

    AS NOTAS SÃO CONFERIDAS. Sem isso, mandar uma lista de ids de outra pessoa
    calaria um grupo dela — e, pior, contaria que aqueles ids existem.
    """
    from app.models.grupo_ignorado import GrupoIgnorado
    from app.services.sugestoes_service import assinatura_de

    pessoa = _quem(db, mekora_sessao)
    if not qual.notas:
        raise HTTPException(status_code=422, detail="Um grupo tem notas.")

    minhas = {
        n.id for n in
        db.query(Nota.id).filter(Nota.pessoa_id == pessoa.id, Nota.id.in_(qual.notas))
    }
    if minhas != set(qual.notas):
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    assinatura = assinatura_de(qual.notas)
    ja = (
        db.query(GrupoIgnorado)
        .filter(GrupoIgnorado.pessoa_id == pessoa.id, GrupoIgnorado.assinatura == assinatura)
        .first()
    )
    if ja is None:
        db.add(GrupoIgnorado(pessoa_id=pessoa.id, assinatura=assinatura))
        db.commit()
    return Response(status_code=204)


@router.delete("/notas/agrupadas/ignorados", status_code=204)
def ouvir_de_novo(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Response:
    """Volta a mostrar todos os grupos calados.

    Sem isto, ignorar é irreversível — e ignorar não é apagar: é dizer "já
    entendi", que é o tipo de coisa de que a pessoa muda de ideia.
    """
    from app.models.grupo_ignorado import GrupoIgnorado

    pessoa = _quem(db, mekora_sessao)
    db.query(GrupoIgnorado).filter(GrupoIgnorado.pessoa_id == pessoa.id).delete()
    db.commit()
    return Response(status_code=204)


@router.get("/notas/{nota_id}/sugestoes")
def sugestoes(
    nota_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Que outras notas parecem falar do mesmo assunto que esta.

    O nó `895:8545` pede três faixas — "Parecem próximas", "Talvez" e "Talvez um
    estudo" —, e é isso que resolve o C16: um limiar único obriga a acertar onde
    a linha cai, três faixas só precisam estar em ordem.

    JÁ LIGADAS FICAM DE FORA. Sugerir o que a pessoa já conectou é pedir que ela
    faça de novo o que fez, e faz a lista parecer que não aprendeu nada.
    """
    from app.models.canvas import Ligacao
    from app.services import sugestoes_service

    pessoa = _quem(db, mekora_sessao)
    n = db.query(Nota).filter(Nota.id == nota_id, Nota.pessoa_id == pessoa.id).first()
    if n is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    # SÓ AS PONTAS QUE SÃO NOTA. A sugestão é sobre notas; um livro ligado a esta
    # não é candidato a ser sugerido, e sem o filtro de tipo o id de um livro
    # excluiria a nota de mesmo número da lista.
    ligadas = set()
    for a, b in db.query(Ligacao.de_id, Ligacao.para_id).filter(
        Ligacao.de_tipo == "nota",
        Ligacao.para_tipo == "nota",
        (Ligacao.de_id == nota_id) | (Ligacao.para_id == nota_id),
    ):
        ligadas.add(a)
        ligadas.add(b)

    # E AS DISPENSADAS SAEM JUNTO. Sugerir de novo o que a pessoa recusou é a
    # insistência que o `SISTEMA.md` proíbe com todas as letras: "uma sugestão
    # que volta na próxima visita deixa de ser sugestão e vira insistência".
    from app.models.dispensa import SugestaoDispensada

    for a, b in db.query(SugestaoDispensada.a_id, SugestaoDispensada.b_id).filter(
        SugestaoDispensada.pessoa_id == pessoa.id,
        (SugestaoDispensada.a_id == nota_id) | (SugestaoDispensada.b_id == nota_id),
    ):
        ligadas.add(a)
        ligadas.add(b)

    candidatas = [
        c for c in db.query(Nota).filter(Nota.pessoa_id == pessoa.id).all()
        if c.id not in ligadas
    ]
    achadas = sugestoes_service.sugerir(n, candidatas)

    return {
        "proximas": [s for s in achadas if s["faixa"] == "proximas"],
        "talvez": [s for s in achadas if s["faixa"] == "talvez"],
        # OS CORTES SAEM NA RESPOSTA. Limiar escondido é limiar em que ninguém
        # pode discordar — a tela mostra "a partir de N palavras em comum".
        "cortes": {
            "proximas": sugestoes_service.PROXIMAS,
            "talvez": sugestoes_service.TALVEZ,
        },
    }
