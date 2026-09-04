"""A trava do andador: se ele cegar de novo, isto fica vermelho.

O `app/core/arvore_de_rotas.py` existe porque o filtro antigo — percorrer
`app.routes` e ficar com quem é `APIRoute` — passou a ver UMA rota de cento e
vinte e quatro no FastAPI 0.141, sem erro nenhum. Quatro varreduras dependiam
dele, e três eram de segurança.

Um andador que cega não estoura: ele devolve pouco, e quem o usa conclui que
não há nada. Por isso a trava aqui não pergunta "funciona?" — pergunta
"encontra MUITO mais do que o filtro ingênuo encontraria?", que é a pergunta
cuja resposta muda quando ele cega.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from app.core.arvore_de_rotas import caminhos_do_app, rotas_do_app


def _app():
    from main import app

    return app


def test_a_arvore_acha_muito_mais_que_o_filtro_ingenuo() -> None:
    """O número exato varia com o produto; a ORDEM DE GRANDEZA é a trava."""
    app = _app()
    ingenuo = len([r for r in app.routes if isinstance(r, APIRoute)])
    arvore = len(caminhos_do_app(app))
    assert arvore >= 100, f"a arvore achou {arvore} rotas — cegou?"
    assert arvore > ingenuo * 10, (
        f"a arvore achou {arvore} e o filtro ingenuo {ingenuo}: perto demais. "
        "Ou o FastAPI voltou a achatar as rotas, ou o andador parou de descer."
    )


def test_as_rotas_de_lote_aparecem() -> None:
    """As seis de `/batch` são a razão de o portão de dono existir.

    Elas foram as primeiras a sumir da varredura quando `app.routes` mudou, e a
    trava do IDOR ficou verde sem olhar para nenhuma delas.
    """
    caminhos = caminhos_do_app(_app())
    lote = [c for c in caminhos if c.startswith("/batch")]
    assert len(lote) >= 6, f"so achei {lote}"


def test_a_guarda_do_include_router_chega_na_rota() -> None:
    """`main.py` protege por ROUTER, e as rotas cruas não sabem disso.

    `original_router.routes` são as rotas de antes da inclusão. Ler só elas faz
    cinquenta rotas de `/jobs` parecerem sem porta — e uma varredura de
    segurança denunciando cegueira própria como buraco é pior que varredura
    nenhuma, porque manda consertar o que não está quebrado.
    """
    alvo = [r for r in rotas_do_app(_app()) if r.path == "/jobs/{job_id}/send"]
    assert alvo, "a rota de envio sumiu da arvore"
    nomes = {getattr(d.call, "__name__", "") for d in alvo[0].dependant.dependencies}
    assert "exigir_acesso" in nomes, f"guardas vistas: {nomes}"


def test_ler_a_arvore_nao_muda_o_app() -> None:
    """O andador reescreve `path` para relatar o caminho completo.

    Se ele mutasse a rota de verdade em vez de copiar, uma função de LEITURA
    mudaria o roteamento — e o efeito só apareceria em produção.
    """
    app = _app()
    antes = [getattr(r, "path", None) for r in app.routes]
    list(rotas_do_app(app))
    assert [getattr(r, "path", None) for r in app.routes] == antes
