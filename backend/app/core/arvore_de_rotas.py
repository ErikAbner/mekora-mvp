"""Todas as rotas do app — porque `app.routes` deixou de listá-las.

    from app.core.arvore_de_rotas import rotas_do_app
    for rota in rotas_do_app(app):   # APIRoute, com o path já com prefixo
        ...

O QUE ACONTECEU
===============
Até o FastAPI 0.140, `app.include_router(r)` copiava cada rota de `r` para
dentro de `app.routes`, e quem quisesse a lista escrevia:

    [r for r in app.routes if isinstance(r, APIRoute)]

O 0.141 trocou isso: cada `include_router` passa a pôr UM objeto
`fastapi.routing._IncludedRouter` em `app.routes`, e as rotas de verdade ficam
dentro dele. Medido em 04/09, neste app:

    app.routes                     40 entradas
      _IncludedRouter              34
      starlette.routing.Route       4
      Mount                         1
      APIRoute                      1   ← só o catch-all definido no próprio app

    rotas alcançáveis de verdade  124

O filtro antigo, portanto, passou a inspecionar UMA rota de cento e vinte e
quatro, e a devolver uma lista quase vazia sem erro nenhum. Nada estourou. As
travas que dependiam dele passaram a passar por não encontrar nada:

  test_portao_de_dono   a trava do IDOR de `/batch` — as seis rotas de lote
                        sumiram da varredura, e a trava que existe por causa
                        delas ficou verde olhando para o vazio
  test_acesso           duas varreduras de porta
  scripts/rotas.py      o GERADOR do `contrato/rotas.js` E DO `Caddyfile`

O último é o caro. `scripts/rotas.py --conferir` já dizia FORA DE DATA para os
dois arquivos; rodar `scripts/rotas.py` para "consertar" teria regravado o
Caddyfile a partir de uma lista vazia, e em produção o proxy pararia de mandar
`/jobs`, `/canvas`, `/notas` para o backend — todos cairiam no SPA. A
remediação que parece certa era a destrutiva.

`_IncludedRouter` não tem `.path` nem `.routes`: tem `original_router` (o
`APIRouter` de verdade) e `include_context.prefix`. É por aí que se desce, e é
recursivo porque router inclui router.

POR QUE UM ARQUIVO, E NÃO O CONSERTO EM CADA LUGAR
==================================================
Eram quatro cópias do mesmo `for` com o mesmo filtro, e as quatro cegaram no
mesmo dia pela mesma razão. Consertar quatro vezes deixa a quinta — que alguém
escreve amanhã — cega de novo. Aqui é um lugar só, e ele tem teste próprio.
"""

from __future__ import annotations

import copy
from typing import Iterator

from fastapi.dependencies.models import Dependant
from fastapi.routing import APIRoute


def rotas_do_app(app) -> Iterator[APIRoute]:
    """Percorre a árvore inteira e devolve cada `APIRoute`, com prefixo aplicado.

    O `path` de cada rota devolvida é o caminho COMPLETO — o que o navegador
    chama —, e não o caminho relativo ao router que a declarou. Quem pergunta
    "esta rota filtra por dono?" precisa do caminho completo, senão a resposta
    fala de uma rota que não existe.
    """
    yield from _andar(getattr(app, "routes", []), "", ())


def caminhos_do_app(app) -> list[str]:
    """Os caminhos completos, ordenados e sem repetição. Conveniência."""
    return sorted({r.path for r in rotas_do_app(app)})


def _andar(rotas, prefixo: str, guardas: tuple) -> Iterator[APIRoute]:
    for rota in rotas:
        incluido = getattr(rota, "original_router", None)
        if incluido is not None:
            contexto = getattr(rota, "include_context", None)
            # AS DEPENDÊNCIAS DO `include_router` VÊM DAQUI, E ISSO É METADE DO
            # PONTO. `main.py` protege por router, não por rota:
            #
            #     app.include_router(notas_router,
            #                        dependencies=[Depends(exigir_acesso), ...])
            #
            # `original_router.routes` são as rotas CRUAS, de antes da inclusão:
            # elas não conhecem essa guarda. Uma varredura que lesse só elas
            # concluiria que cinquenta rotas de `/jobs` estão sem porta — e
            # denunciaria como buraco de segurança o que é cegueira do
            # instrumento. Aconteceu comigo em 04/09, antes desta linha existir.
            deps = tuple(getattr(contexto, "dependencies", ()) or ()) if contexto else ()
            yield from _andar(
                getattr(incluido, "routes", []),
                prefixo + (getattr(contexto, "prefix", "") or ""),
                guardas + deps,
            )
            continue
        if isinstance(rota, APIRoute):
            caminho = rota.path
            if prefixo and not caminho.startswith(prefixo):
                # A rota já vem com o prefixo aplicado em algumas versões; só
                # somar produziria `/api/api/jobs`. Conferir é mais barato que
                # descobrir isso num Caddyfile.
                caminho = prefixo + caminho
            yield _vista(rota, caminho, guardas)


def _vista(rota: APIRoute, caminho: str, guardas: tuple) -> APIRoute:
    """A rota como quem a chama a vê: caminho completo e guardas de inclusão.

    Cópia rasa. Mutar a rota do app para relatar o caminho certo mudaria o
    roteamento de verdade a partir de uma função de LEITURA — e uma função de
    leitura que muda o alvo é a pior espécie de instrumento.
    """
    if caminho == rota.path and not guardas:
        return rota
    vista = copy.copy(rota)
    vista.path = caminho
    dependant = getattr(rota, "dependant", None)
    if guardas and dependant is not None:
        vista.dependant = copy.copy(dependant)
        vista.dependant.dependencies = [
            Dependant(call=g.dependency, path=caminho) for g in guardas
        ] + list(dependant.dependencies)
    return vista
