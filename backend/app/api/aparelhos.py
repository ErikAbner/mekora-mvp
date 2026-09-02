"""Os Kindles de uma pessoa."""

from __future__ import annotations

import re
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.aparelho import Aparelho
from app.models.pessoa import Pessoa, agora
from app.services import acesso_service

router = APIRouter()

# A Amazon entrega em `@kindle.com`. Conferir aqui evita o pior caso: o envio
# sair, ninguém receber, e não haver erro nenhum para investigar — porque do
# ponto de vista do SMTP a mensagem partiu bem.
FORMA = re.compile(r"^[^@\s]+@kindle\.com$", re.I)


def _modelo_conhecido(v):
    """`None` e `""` passam: "não sei" é resposta válida, e é a que a lista de
    modelos precisa aceitar para não impedir ninguém de usar o produto quando
    ela envelhecer.

    E O VAZIO VOLTA COMO VAZIO, não como `None`. Os dois querem dizer coisas
    diferentes na edição: `None` é "não mexi neste campo" e `""` é "apague o que
    está lá". Normalizar aqui apagava a distinção, e o resultado era um "não
    sei" que nunca limpava o modelo — escrevi assim na primeira versão, e o teste
    pegou."""
    from app.services.kindles import existe

    if v in (None, ""):
        return v
    if not existe(v):
        raise ValueError(f"modelo de Kindle desconhecido: {v}")
    return v


class AparelhoNovo(BaseModel):
    endereco: str
    nome: str = ""
    modelo: Optional[str] = None

    _modelo = field_validator("modelo")(_modelo_conhecido)

    @field_validator("endereco")
    @classmethod
    def forma_certa(cls, v: str) -> str:
        v = v.strip().lower()
        if not FORMA.match(v):
            raise ValueError(
                "O endereço precisa terminar em @kindle.com. "
                "Ele aparece em Configurações › Sua conta, no próprio aparelho."
            )
        return v


class AparelhoEditado(BaseModel):
    nome: Optional[str] = None
    # O ENDEREÇO PODE MUDAR, e não podia.
    #
    # A rota aceitava nome, principal e autorizado — dava para renomear e para
    # eleger o principal, e NÃO dava para corrigir um endereço digitado errado:
    # só apagar o aparelho e ligar de novo, perdendo o nome e o histórico de
    # envio. O botão "Editar" do nó 966:25554 pede as duas coisas.
    #
    # A mesma validação de forma do cadastro, e pelo mesmo motivo: um endereço
    # que não termina em @kindle.com faz o envio sair, ninguém receber, e não
    # haver erro nenhum para investigar.
    endereco: Optional[str] = None
    principal: Optional[bool] = None
    autorizado: Optional[bool] = None
    # Qual Kindle é. `""` apaga — "não sei" é uma resposta, e não a ausência de
    # uma; `None` não mexe.
    modelo: Optional[str] = None

    _modelo = field_validator("modelo")(_modelo_conhecido)

    @field_validator("endereco")
    @classmethod
    def forma_certa(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip().lower()
        if not FORMA.match(v):
            raise ValueError(
                "O endereço precisa terminar em @kindle.com. "
                "Ele aparece em Configurações › Sua conta, no próprio aparelho."
            )
        return v


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para configurar seus aparelhos.")
    return pessoa


def _fora(a: Aparelho) -> dict:
    from app.services.kindles import descricao

    return {
        "id": a.id, "nome": a.nome or a.endereco.split("@")[0],
        "endereco": a.endereco, "principal": a.principal,
        "autorizado": a.autorizado_em is not None,
        "ultimo_envio": a.ultimo_envio,
        # O modelo, e a frase já montada — "Paperwhite (11ª geração) · 1236 ×
        # 1648". A tela não deve derivar isso: a resolução é do modelo, e
        # duplicar a tabela no navegador é como as duas passam a discordar.
        "modelo": a.modelo,
        "modelo_diz": descricao(a.modelo),
    }


@router.get("/aparelhos/modelos")
def modelos() -> dict:
    """Os Kindles que o produto conhece, com a tela de cada um.

    A lista sai do servidor, e não do navegador: é ela que decide o perfil do
    conversor de quadrinhos, e uma segunda cópia na tela é como as duas passam a
    discordar sobre a resolução de um aparelho.

    Declarada ANTES de `/aparelhos/{id}` — senão o FastAPI tenta ler "modelos"
    como um número. Terceira vez que isto aparece no projeto.
    """
    from app.services.kindles import como_lista

    return {"modelos": como_lista()}


@router.get("/aparelhos")
def listar(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> List[dict]:
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return []
    aparelhos = (
        db.query(Aparelho)
        .filter(Aparelho.pessoa_id == pessoa.id)
        .order_by(Aparelho.principal.desc(), Aparelho.criado_em)
        .all()
    )
    return [_fora(a) for a in aparelhos]


@router.post("/aparelhos", status_code=201)
def ligar(
    novo: AparelhoNovo,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)

    if db.query(Aparelho).filter(
        Aparelho.pessoa_id == pessoa.id, Aparelho.endereco == novo.endereco
    ).first():
        raise HTTPException(status_code=409, detail="Esse aparelho já está ligado à sua conta.")

    # O primeiro vira principal sozinho: pedir que a pessoa escolha entre um
    # item só é uma pergunta sem resposta possível.
    primeiro = db.query(Aparelho).filter(Aparelho.pessoa_id == pessoa.id).count() == 0

    a = Aparelho(
        pessoa_id=pessoa.id, endereco=novo.endereco,
        modelo=novo.modelo or None,
        nome=novo.nome.strip() or novo.endereco.split("@")[0],
        principal=primeiro,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _fora(a)


@router.patch("/aparelhos/{aparelho_id}")
def mudar(
    aparelho_id: int,
    troca: AparelhoEditado,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)
    a = db.query(Aparelho).filter(
        Aparelho.id == aparelho_id, Aparelho.pessoa_id == pessoa.id
    ).first()
    if a is None:
        raise HTTPException(status_code=404, detail="Aparelho não encontrado.")

    if troca.nome is not None:
        a.nome = troca.nome.strip()
    if troca.endereco is not None:
        # DOIS APARELHOS COM O MESMO ENDEREÇO seriam dois cartões que mandam
        # para o mesmo lugar, e "tornar principal" num deles não mudaria nada.
        ja = (
            db.query(Aparelho)
            .filter(
                Aparelho.pessoa_id == pessoa.id,
                Aparelho.endereco == troca.endereco,
                Aparelho.id != a.id,
            )
            .first()
        )
        if ja is not None:
            raise HTTPException(status_code=409, detail="Você já tem um aparelho com esse endereço.")
        a.endereco = troca.endereco
        if hasattr(a, "email"):
            a.email = troca.endereco
    if troca.modelo is not None:
        # `""` apaga: "não sei" é uma resposta, e guardar string vazia faria
        # dois jeitos de escrever o mesmo estado.
        a.modelo = troca.modelo or None
    if troca.autorizado is not None:
        a.autorizado_em = agora() if troca.autorizado else None
    if troca.principal:
        # Tirar de todos ANTES de pôr neste. Sem isso, dois principais coexistem
        # e o envio escolhe um por ordem de linha — que muda sozinha.
        db.query(Aparelho).filter(Aparelho.pessoa_id == pessoa.id).update({"principal": False})
        a.principal = True

    db.commit()
    db.refresh(a)
    return _fora(a)


@router.delete("/aparelhos/{aparelho_id}", status_code=204)
def desligar(
    aparelho_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    pessoa = _quem(db, mekora_sessao)
    a = db.query(Aparelho).filter(
        Aparelho.id == aparelho_id, Aparelho.pessoa_id == pessoa.id
    ).first()
    if a is None:
        raise HTTPException(status_code=404, detail="Aparelho não encontrado.")

    era_principal = a.principal
    db.delete(a)
    db.flush()

    # Apagar o principal não pode deixar a conta sem destino: o próximo assume.
    # Sem isto, o envio seguinte falharia com "nenhum aparelho", e a pessoa não
    # ligaria uma coisa à outra.
    if era_principal:
        proximo = (
            db.query(Aparelho)
            .filter(Aparelho.pessoa_id == pessoa.id)
            .order_by(Aparelho.criado_em)
            .first()
        )
        if proximo is not None:
            proximo.principal = True

    db.commit()
    return None
