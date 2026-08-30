"""As rotas de entrar e sair.

O que decide se isto é seguro ou teatro está em `acesso_service.py`. Aqui ficam
as decisões de porta: o que a resposta conta, e como o cookie é escrito.
"""

import os
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.pessoa import VALIDADE_DA_SESSAO
from app.services import acesso_service

router = APIRouter()

COOKIE = "mekora_sessao"

# Fora de desenvolvimento o cookie é `Secure`: o navegador não o manda por
# conexão sem TLS. Em desenvolvimento isso o tornaria inútil, porque o servidor
# local é http — e um cookie que não chega faz a sessão parecer quebrada quando
# o que está errado é a configuração.
EM_PRODUCAO = os.getenv("MEKORA_DOMINIO", "").strip() not in ("", "localhost")


class PedidoDeEntrada(BaseModel):
    email: str


def _gravar_cookie(resposta: Response, token: str) -> None:
    resposta.set_cookie(
        COOKIE,
        token,
        max_age=int(VALIDADE_DA_SESSAO.total_seconds()),
        # `httponly` é o que impede o JavaScript da página de ler a sessão. Sem
        # ele, uma única falha de XSS em qualquer canto do produto entrega a
        # conta — e é por isso que sessão não mora em localStorage (DEC-0039 §4).
        httponly=True,
        secure=EM_PRODUCAO,
        # `lax` deixa o cookie ir quando a pessoa CLICA num link vindo de fora,
        # que é exatamente como o link do e-mail funciona, e não deixa ir em
        # pedido que outro site dispare sozinho.
        samesite="lax",
        path="/",
    )


@router.post("/entrar", status_code=204)
def entrar(pedido: PedidoDeEntrada, request: Request, db: Session = Depends(get_db)) -> Response:
    """Pede um link.

    RESPONDE A MESMA COISA SEMPRE, e isso é deliberado. Se a resposta mudasse
    conforme o e-mail já tem conta, qualquer um poderia descobrir quem usa o
    Mekora só perguntando um endereço de cada vez. Limite atingido também
    responde igual, pelo mesmo motivo.

    O custo é real: quem digita o endereço errado espera um e-mail que não vem.
    A tela compensa dizendo o que fazer quando não chegar, em vez de o servidor
    revelar quem existe.
    """
    if not acesso_service.email_parece_valido(pedido.email):
        raise HTTPException(status_code=400, detail="Esse endereço não parece um e-mail.")

    resultado = acesso_service.pedir_link(db, pedido.email, str(request.base_url))
    if resultado is not None:
        token, email = resultado
        try:
            acesso_service.enviar_link(email, token, _base_publica(request))
        except Exception:
            # A falha de envio NÃO vira resposta diferente: contá-la aqui
            # entregaria o mesmo que a resposta variável já entregava. Ela é
            # registrada, e a tela já diz o que fazer se não chegar.
            pass

    return Response(status_code=204)


def _base_publica(request: Request) -> str:
    """O endereço que vai dentro do e-mail.

    Atrás de um proxy, `request.base_url` é o que o backend vê — `http://backend:8000`
    —, e um link com esse endereço não abre em lugar nenhum. Com domínio
    configurado, ele é a verdade.
    """
    dominio = os.getenv("MEKORA_DOMINIO", "").strip()
    if dominio and dominio != "localhost":
        return f"https://{dominio}"
    return str(request.base_url).rstrip("/")


@router.get("/entrar/{token}")
def usar_link(token: str, db: Session = Depends(get_db)) -> RedirectResponse:
    """Abre o link do e-mail e devolve a pessoa ao produto.

    Redireciona em vez de responder JSON porque quem chega aqui é uma PESSOA
    clicando num e-mail, e não código chamando uma API. Uma resposta JSON no
    navegador seria uma tela branca com chaves.
    """
    sessao = acesso_service.usar_link(db, token)
    if sessao is None:
        return RedirectResponse("/entrar?erro=link", status_code=303)

    resposta = RedirectResponse("/estante", status_code=303)
    _gravar_cookie(resposta, sessao)
    return resposta


@router.get("/eu")
def eu(mekora_sessao: Optional[str] = Cookie(default=None), db: Session = Depends(get_db)) -> dict:
    """Quem está logado. Devolve `entrou: false` em vez de 401.

    Não estar logado é um estado normal do produto — converter sem conta é
    previsto pela DEC-0018 —, e não um erro. Responder 401 faria toda abertura de
    página registrar um erro que não é erro.
    """
    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        return {"entrou": False}
    return {"entrou": True, "email": pessoa.email, "desde": pessoa.criada_em}


@router.post("/sair", status_code=204)
def sair(
    resposta: Response,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Response:
    """Encerra a sessão NO SERVIDOR, e não só apaga o cookie.

    Apagar só o cookie deixaria a sessão válida para quem já tivesse o valor —
    sair sem sair.
    """
    acesso_service.sair(db, mekora_sessao)
    r = Response(status_code=204)
    r.delete_cookie(COOKIE, path="/")
    return r
