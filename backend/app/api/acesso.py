"""As rotas de entrar e sair.

O que decide se isto é seguro ou teatro está em `acesso_service.py`. Aqui ficam
as decisões de porta: o que a resposta conta, e como o cookie é escrito.
"""

import os
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.pessoa import VALIDADE_DA_SESSAO
from app.api.porta import exigir_conta
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


# O caminho é /entrar/pedir e não /entrar porque /entrar é uma TELA — a caixa
# de e-mail que a pessoa vê. Os dois no mesmo caminho só se distinguiriam pelo
# método HTTP, e uma borda que roteia por método é uma sutileza a mais para
# alguém quebrar sem perceber. Abaixo de /entrar, a divisão é por caminho.
@router.post("/entrar/pedir", status_code=204)
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
    return {
        "entrou": True,
        "email": pessoa.email,
        # NOME E RETRATO, decididos pelo Erik em 02/09/2026.
        #
        # `nome` nulo é estado normal: entrar não pede nome, e quem não escreveu
        # é chamado pelo e-mail. O que NÃO se faz mais é derivar um nome do
        # e-mail — `erik@x.com` virava "erik" na trilha da conta, e a tela de
        # privacidade dizia ao lado que não havia nome nenhum.
        "nome": pessoa.nome,
        # O ENDEREÇO DO RETRATO, e não o retrato. `true` aqui vira um `<img>`
        # apontando para `/eu/retrato`, que exige o biscoito — sem URL
        # adivinhável e sem token público. Capa de livro precisa ser alcançável
        # sem conta porque trabalho sem dono existe; retrato nunca precisa.
        "tem_retrato": bool(pessoa.retrato),
        "desde": pessoa.criada_em,
    }


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


@router.get("/sessoes")
def sessoes(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Os navegadores em que esta pessoa entrou.

    Sem conta a resposta é uma lista vazia, e não 401: a mesma razão do `/eu` —
    não estar logado é estado previsto, e não erro.
    """
    return {"sessoes": acesso_service.sessoes_de(db, mekora_sessao)}


@router.post("/sessoes/{sessao_id}/encerrar", status_code=204)
def encerrar_uma(
    sessao_id: int,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Response:
    """Derruba UM navegador.

    404 quando não encerrou, e não 403: dizer "existe, mas não é sua" confirma
    a existência de sessão alheia para quem estiver testando ids em sequência.
    """
    if not acesso_service.encerrar_sessao(db, mekora_sessao, sessao_id):
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    return Response(status_code=204)


@router.post("/sessoes/encerrar-outras")
def encerrar_outras(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Sai de todos os outros navegadores, e mantém este.

    Devolve quantos caíram, porque "pronto" sem número não deixa a pessoa saber
    se havia alguma coisa lá.
    """
    exigir_conta(mekora_sessao, db)
    return {"encerradas": acesso_service.encerrar_as_outras(db, mekora_sessao)}


# ---------------------------------------------------------------------------
# O perfil: como a pessoa quer ser chamada, e a cara dela
# ---------------------------------------------------------------------------

# Um nome não é um campo livre de tamanho infinito: 80 é folgado para qualquer
# nome de pessoa e curto o bastante para não virar um parágrafo no lugar de um
# rótulo.
NOME_MAXIMO = 80

# O LADO DO RETRATO, em pixels. Ele é sempre reescrito como PNG quadrado deste
# tamanho, e por dois motivos: a tela o mostra em círculo pequeno, e guardar o
# arquivo que chegou seria guardar EXIF — câmera, data e, em foto de celular,
# coordenada de GPS.
RETRATO_LADO = 512

# O que o servidor aceita RECEBER. O limite é do arquivo que chega, antes de
# qualquer processamento: sem ele, uma imagem de 200 MB é lida inteira na
# memória antes de alguém poder recusá-la.
RETRATO_BYTES = 5 * 1024 * 1024

# Os formatos que o Pillow abre e que uma pessoa realmente manda. HEIC fica de
# fora porque o Pillow não o lê sem plugin, e uma lista que promete o que não
# abre é pior que uma lista curta.
RETRATO_TIPOS = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class PerfilEditado(BaseModel):
    nome: Optional[str] = None


@router.patch("/eu")
def mudar_perfil(
    troca: PerfilEditado,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Muda o nome. O e-mail não se muda por aqui — ele É a conta.

    Trocar o e-mail é trocar de identidade: os links de entrada, as sessões e o
    dono de tudo apontam para ele. Isso é outra operação, com confirmação nos
    dois endereços, e não um campo de texto ao lado do nome.
    """
    pessoa = exigir_conta(mekora_sessao, db)

    if troca.nome is not None:
        nome = troca.nome.strip()
        if len(nome) > NOME_MAXIMO:
            raise HTTPException(
                status_code=422,
                detail=f"O nome tem no máximo {NOME_MAXIMO} caracteres.",
            )
        # Vazio APAGA, e não guarda string vazia: "sem nome" e "nome em branco"
        # são o mesmo estado para quem lê a tela, e dois jeitos de escrever o
        # mesmo estado é como um deles deixa de ser tratado.
        pessoa.nome = nome or None

    db.commit()
    db.refresh(pessoa)
    return {"nome": pessoa.nome, "tem_retrato": bool(pessoa.retrato)}


@router.put("/eu/retrato")
async def por_retrato(
    arquivo: UploadFile = File(...),
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Recebe uma imagem e guarda um PNG quadrado feito pelo servidor.

    O QUE ENTRA NÃO É O QUE FICA. A imagem é aberta, o EXIF é descartado com ela
    — câmera, data, e em foto de celular a coordenada de GPS —, o recorte é
    central e a saída é sempre PNG de lado fixo. Guardar os bytes que chegaram
    seria guardar tudo isso, e servir de volta para qualquer um que veja o
    retrato.
    """
    from io import BytesIO

    from PIL import Image, UnidentifiedImageError

    from app.core.config import STORAGE_RAIZ

    pessoa = exigir_conta(mekora_sessao, db)

    if arquivo.content_type not in RETRATO_TIPOS:
        raise HTTPException(
            status_code=400,
            detail="Formato não aceito. Mande JPEG, PNG, WebP ou GIF.",
        )

    # LIDO COM TETO, e não `await arquivo.read()` sem limite: o `content-length`
    # é dito pelo cliente, e acreditar nele é deixar a memória do servidor na
    # mão de quem envia.
    bruto = await arquivo.read(RETRATO_BYTES + 1)
    if len(bruto) > RETRATO_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"A imagem passa de {RETRATO_BYTES // (1024 * 1024)} MB.",
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

    imagem = imagem.convert("RGB")
    lado = min(imagem.size)
    esquerda = (imagem.width - lado) // 2
    topo = (imagem.height - lado) // 2
    imagem = imagem.crop((esquerda, topo, esquerda + lado, topo + lado))
    imagem = imagem.resize((RETRATO_LADO, RETRATO_LADO), Image.LANCZOS)

    pasta = STORAGE_RAIZ / "retratos"
    pasta.mkdir(parents=True, exist_ok=True)
    destino = pasta / f"{pessoa.id}.png"
    imagem.save(destino, format="PNG", optimize=True)

    pessoa.retrato = str(destino)
    db.commit()
    return {"tem_retrato": True}


@router.get("/eu/retrato")
def ver_retrato(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    """O retrato de quem está pedindo, e só dele.

    Não há id no caminho de propósito: com `/retrato/{id}` haveria como varrer
    números e recolher a cara de todo mundo. Aqui a rota não tem parâmetro
    nenhum — ela responde a quem o biscoito diz que é.
    """
    from fastapi.responses import FileResponse
    from pathlib import Path as _Path

    pessoa = exigir_conta(mekora_sessao, db)
    if not pessoa.retrato:
        raise HTTPException(status_code=404, detail="Sem retrato.")
    caminho = _Path(pessoa.retrato)
    if not caminho.is_file():
        # A COLUNA PODE SOBREVIVER AO ARQUIVO — limpeza de disco, restauração de
        # banco sem storage. 404 aqui é a verdade; 500 seria a tela dizendo que
        # o Mekora quebrou por causa de um retrato que sumiu.
        raise HTTPException(status_code=404, detail="Sem retrato.")
    # `no-store`: o retrato muda quando a pessoa troca, e o endereço é sempre o
    # mesmo — com cache o rosto antigo fica na tela até alguém recarregar à mão.
    return FileResponse(caminho, media_type="image/png", headers={"Cache-Control": "no-store"})


@router.delete("/eu/retrato", status_code=204)
def tirar_retrato(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Response:
    """Tira o retrato, e apaga o arquivo junto.

    Deixar o PNG no disco com a coluna limpa seria "removido da tela" em vez de
    removido — a mesma distinção que a tela de privacidade faz sobre apagar a
    conta.
    """
    from pathlib import Path as _Path

    pessoa = exigir_conta(mekora_sessao, db)
    if pessoa.retrato:
        try:
            _Path(pessoa.retrato).unlink(missing_ok=True)
        except OSError:
            pass
        pessoa.retrato = None
        db.commit()
    return Response(status_code=204)
