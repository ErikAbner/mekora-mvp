"""A porta única para tudo que fala de um trabalho específico.

O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA RESOLVER
================================================
Proteger `/storage` fechou a porta do arquivo e deixou a dos metadados aberta:
`/analyze/1` respondia a qualquer um com o nome do documento — e, pior, com o
`endereco` dele, que é justamente o que abre o arquivo. O buraco não tinha
fechado; tinha mudado de porta.

São 41 rotas com o número do trabalho no caminho, e vão ser mais. Conferir
acesso dentro de cada uma seria 41 lugares para acertar hoje e um para esquecer
depois — e o esquecimento não faz barulho: a rota nova simplesmente responde
para quem pedir.

Então a conferência é uma DEPENDÊNCIA aplicada aos routers inteiros. Rota nova
com `job_id` no caminho nasce protegida sem que ninguém precise lembrar.

AS DUAS PROVAS ACEITAS
======================
**A sessão**, quando o trabalho tem dono: é dele, e pronto.

**A chave do trabalho** — o `token_publico` —, apresentada no cabeçalho
`X-Mekora-Chave`. É o que sustenta o trabalho feito SEM conta, que a DEC-0018
garante existir: sem dono não há o que conferir, então a prova é conhecer um
endereço que ninguém adivinha.

Por que cabeçalho aqui e caminho no `/storage`: uma tag `<img>` ou um link não
mandam cabeçalho, e por isso o arquivo carrega o token no próprio endereço. Uma
chamada de código manda — e no cabeçalho o token não fica no histórico do
navegador nem nos registros de acesso do servidor.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Cookie, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.processing_job import ProcessingJob

# Nomes que, no caminho de uma rota, significam "um trabalho". Se aparecer um
# terceiro nome, ele entra aqui — e a lista curta é de propósito: ela é a
# definição, não uma configuração.
NOMES = ("job_id", "upload_id")


def exigir_acesso(
    request: Request,
    mekora_sessao: Optional[str] = Cookie(default=None),
    x_mekora_chave: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Deixa passar, ou responde 404.

    O 404 é o mesmo para "não existe", "não é seu" e "não provou nada". Um 403
    em trabalho existente e 404 em inexistente contaria quais números existem,
    que é metade do que se está protegendo.
    """
    bruto = next((request.path_params[n] for n in NOMES if n in request.path_params), None)
    if bruto is None:
        return

    try:
        job_id = int(bruto)
    except (TypeError, ValueError):
        return  # não é um trabalho; a própria rota decide o que fazer

    trabalho = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if trabalho is None:
        # Deixa a rota responder o próprio 404. Antecipá-lo aqui faria a porta
        # decidir sobre coisas que não são dela.
        return

    if x_mekora_chave and trabalho.token_publico and x_mekora_chave == trabalho.token_publico:
        return

    if trabalho.dono_id is not None:
        from app.services import acesso_service

        pessoa = acesso_service.quem_e(db, mekora_sessao)
        if pessoa is not None and pessoa.id == trabalho.dono_id:
            return

    raise HTTPException(status_code=404, detail="Não encontrado.")
