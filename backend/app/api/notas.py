"""As notas de um livro."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.nota import CORES, Nota
from app.models.processing_job import ProcessingJob
from app.services import clippings_service
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
        "id": n.id, "job_id": n.job_id, "capitulo": n.capitulo, "de": n.de, "ate": n.ate,
        "cor": n.cor, "trecho": n.trecho, "comentario": n.comentario,
        # De onde a nota veio. A tela precisa disto para dizer "do Kindle" em
        # vez de oferecer "abrir no livro" numa nota que não tem livro aqui.
        "origem": n.origem, "fonte": n.fonte,
        "criada_em": n.criada_em,
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
    return [_fora(n) for n in notas]


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
