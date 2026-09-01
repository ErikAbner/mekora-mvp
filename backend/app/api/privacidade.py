"""O que o Mekora guarda sobre uma pessoa, e como levar embora.

POR QUE ESTA TELA É DERIVADA, E NÃO ESCRITA
===========================================
Uma política de privacidade escrita à mão envelhece na primeira coluna nova: o
produto passa a guardar mais uma coisa, e o texto continua listando as antigas.
Ela vira uma promessa que ninguém checa contra o banco.

Aqui a lista é CONTADA no banco, na hora. Se amanhã existir uma tabela nova
ligada à pessoa e ela não aparecer aqui, é porque alguém esqueceu de acrescentar
uma linha neste arquivo — e o teste que confere isso está em
`test_privacidade.py`, comparando com as tabelas que de fato apontam para
`pessoas`.

APAGAR APAGA
============
Não marca como apagado, não esconde da listagem. As chaves estrangeiras têm
`ondelete="CASCADE"`, então apagar a pessoa leva junto sessões, chaves, notas,
progresso, aparelhos e preferências.

Os ARQUIVOS são o caso que o banco não resolve sozinho, e por isso ele é feito à
mão aqui: o trabalho tem `dono_id` com `SET NULL`, o que preservaria o registro
de conversão e deixaria o EPUB no disco sem dono. Para quem pediu para apagar a
conta, "os arquivos continuam lá, sem seu nome" não é o que foi pedido.
"""

from __future__ import annotations

import shutil
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.aparelho import Aparelho
from app.models.canvas import GrupoCanvas, Ligacao, NoCanvas
from app.models.estudo import Estudo, EstudoNota
from app.models.nota import Nota
from app.models.pessoa import Chave, Pessoa, Sessao
from app.models.preferencia import Preferencia
from app.models.processing_job import ProcessingJob
from app.models.progresso import Progresso
from app.services import acesso_service

router = APIRouter()


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para ver seus dados.")
    return pessoa


# O que existe, e o que cada coisa é em português. A explicação fica ao lado da
# contagem porque um número sozinho não diz o que se está guardando — "7
# progressos" não significa nada para quem não escreveu o código.
O_QUE_GUARDAMOS = [
    ("conta", Pessoa, "Seu e-mail. É a única coisa que identifica você — não há nome, telefone nem foto."),
    ("livros", ProcessingJob, "Os arquivos que você enviou e o que foi convertido a partir deles."),
    ("notas", Nota, "O que você marcou lendo, e o que trouxe do Kindle."),
    ("leituras", Progresso, "Onde você parou em cada livro."),
    ("aparelhos", Aparelho, "Os endereços de Kindle que você ligou à conta."),
    ("preferencias", Preferencia, "As escolhas que você fez em Preferências."),
    ("estudos", Estudo, "Os estudos que você montou, com a pergunta de cada um."),
    ("no_canvas", NoCanvas, "As notas que você pôs no Canvas, e onde cada uma está."),
    ("grupos_do_canvas", GrupoCanvas, "As áreas que você nomeou no Canvas, e o tamanho de cada uma."),
    ("ligacoes", Ligacao, "As ligações que você fez entre notas."),
    ("sessoes", Sessao, "Os navegadores em que você entrou."),
    ("links", Chave, "Links de entrada pedidos e ainda não vencidos. Guardados como resumo, nunca em texto."),
]


class Confirmacao(BaseModel):
    email: str


@router.get("/privacidade")
def o_que_existe(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)

    itens = []
    for nome, modelo, explicacao in O_QUE_GUARDAMOS:
        if modelo is Pessoa:
            quantos = 1
        elif modelo is ProcessingJob:
            quantos = db.query(modelo).filter(modelo.dono_id == pessoa.id).count()
        else:
            quantos = db.query(modelo).filter(modelo.pessoa_id == pessoa.id).count()
        itens.append({"nome": nome, "quantos": quantos, "explicacao": explicacao})

    return {
        "email": pessoa.email,
        "desde": pessoa.criada_em,
        "itens": itens,
        # Ditos aqui, e não num texto à parte, porque são fatos do código:
        # `email_service` manda o EPUB por SMTP, e nada mais sai daqui.
        "para_onde_vai": [
            "Os arquivos que você manda ao Kindle vão pelo servidor de e-mail configurado, "
            "e daí para a Amazon. É o único lugar fora do Mekora para onde algo seu é enviado.",
            "Os livros são lidos no seu próprio navegador — o texto não passa por servidor nenhum "
            "depois de convertido.",
            "Quando você põe um link no Canvas, o Mekora busca o título e a "
            "imagem da página para montar a prévia — e essa busca sai daqui para "
            "o endereço que você colou. O site visitado vê o pedido, como veria "
            "se você abrisse o link. Nada além do endereço é enviado, e a prévia "
            "só acontece quando você cola um link.",
            "Não há rastreamento, análise de uso nem publicidade. Os únicos "
            "lugares fora do Mekora para onde algo seu vai são os dois acima: a "
            "Amazon, quando você manda ao Kindle, e o site do link que você "
            "colou.",
        ],
    }


@router.get("/privacidade/levar")
def levar(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Tudo o que é seu, em JSON.

    Inclui as NOTAS por inteiro — trecho e comentário —, que é o que a pessoa
    escreveu e a única coisa aqui que ela não conseguiria refazer. Os arquivos
    não vão junto: eles já são baixáveis um a um, e um JSON com EPUBs dentro
    seria grande demais para o navegador montar.
    """
    pessoa = _quem(db, mekora_sessao)

    return {
        "conta": {"email": pessoa.email, "desde": pessoa.criada_em},
        "notas": [
            {
                "livro": n.origem or (n.job_id and f"trabalho {n.job_id}") or "",
                "fonte": n.fonte, "cor": n.cor,
                "trecho": n.trecho, "comentario": n.comentario,
                "capitulo": n.capitulo, "de": n.de, "ate": n.ate,
                "criada_em": n.criada_em,
            }
            for n in db.query(Nota).filter(Nota.pessoa_id == pessoa.id).order_by(Nota.criada_em).all()
        ],
        "livros": [
            {
                "titulo": j.final_title or j.original_filename,
                "autor": j.final_author or "",
                "enviado_ao_kindle": bool(j.kindle_sent),
                "criado_em": j.created_at,
            }
            for j in db.query(ProcessingJob).filter(ProcessingJob.dono_id == pessoa.id).all()
        ],
        "aparelhos": [
            {"nome": a.nome, "endereco": a.endereco, "principal": a.principal}
            for a in db.query(Aparelho).filter(Aparelho.pessoa_id == pessoa.id).all()
        ],
        "estudos": [
            {
                "nome": e.nome, "sobre": e.sobre, "fechado": e.fechado,
                "notas": [
                    en.nota_id
                    for en in db.query(EstudoNota).filter(EstudoNota.estudo_id == e.id).all()
                ],
            }
            for e in db.query(Estudo).filter(Estudo.pessoa_id == pessoa.id).all()
        ],
        "canvas": [
            {"nota": n.nota_id, "x": n.x, "y": n.y}
            for n in db.query(NoCanvas).filter(NoCanvas.pessoa_id == pessoa.id).all()
        ],
        "ligacoes": [
            {"de": l.de_id, "para": l.para_id, "como": l.como}
            for l in db.query(Ligacao).filter(Ligacao.pessoa_id == pessoa.id).all()
        ],
        # O NOME DO GRUPO É COISA ESCRITA PELA PESSOA, como o comentário da
        # nota — e leva junto o retângulo, porque sem ele o nome não diz sobre o
        # que era. Levar o nome sem a geometria seria levar metade.
        "grupos_do_canvas": [
            {"nome": g.nome, "x": g.x, "y": g.y, "largura": g.largura, "altura": g.altura}
            for g in db.query(GrupoCanvas).filter(GrupoCanvas.pessoa_id == pessoa.id).all()
        ],
        "preferencias": {
            p.chave: p.valor
            for p in db.query(Preferencia).filter(Preferencia.pessoa_id == pessoa.id).all()
        },
    }


@router.post("/privacidade/apagar", status_code=204)
def apagar(
    confirmacao: Confirmacao,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Apaga a conta e tudo que é dela. Não há volta.

    EXIGE O E-MAIL DIGITADO. Não é burocracia: é a diferença entre um clique
    errado e uma decisão. Um botão que apaga tudo sozinho vai ser clicado por
    engano por alguém, um dia, e não há como desfazer.
    """
    pessoa = _quem(db, mekora_sessao)

    if confirmacao.email.strip().lower() != pessoa.email:
        raise HTTPException(
            status_code=400,
            detail="O e-mail digitado não é o da sua conta. Nada foi apagado.",
        )

    # OS ARQUIVOS PRIMEIRO, enquanto ainda dá para saber quais são dela.
    # `dono_id` tem `SET NULL`: apagar a pessoa antes deixaria os trabalhos sem
    # dono e os EPUBs no disco, sem ninguém para reclamá-los.
    from app.core.config import STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP

    trabalhos = db.query(ProcessingJob).filter(ProcessingJob.dono_id == pessoa.id).all()
    for j in trabalhos:
        for pasta in (STORAGE_OUTPUT / str(j.id), STORAGE_TEMP / str(j.id)):
            shutil.rmtree(pasta, ignore_errors=True)
        for entrada in STORAGE_INPUT.glob(f"{j.id}_*"):
            entrada.unlink(missing_ok=True)
        db.delete(j)

    # E a pessoa por último: o CASCADE leva sessões, chaves, notas, progresso,
    # aparelhos e preferências.
    db.delete(pessoa)
    db.commit()
    return None
