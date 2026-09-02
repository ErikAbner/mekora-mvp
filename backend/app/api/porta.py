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

import secrets
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

    if x_mekora_chave and trabalho.token_publico and secrets.compare_digest(
        x_mekora_chave, trabalho.token_publico
    ):
        # `compare_digest` e nao `==`: a comparacao normal para no primeiro byte
        # diferente, e o tempo que ela leva conta quantos bateram. E defesa
        # barata contra um ataque que, pela rede, e dificil — mas custa uma
        # linha, e a versao insegura nao tem nenhuma vantagem.
        return

    if trabalho.dono_id is not None:
        from app.services import acesso_service

        pessoa = acesso_service.quem_e(db, mekora_sessao)
        if pessoa is not None and pessoa.id == trabalho.dono_id:
            return

    raise HTTPException(status_code=404, detail="Não encontrado.")


def exigir_conta(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    """A segunda porta: exige uma conta, sem falar de trabalho nenhum.

    `exigir_acesso` cobre tudo que tem `job_id` no caminho — e por isso mesmo
    não cobre o que NÃO tem. Uma revisão do conjunto em 31/08 encontrou o que
    ficou de fora, e a lista é do tipo que só aparece olhando o todo:

    `/config` devolvia o `kindle_email` e o `smtp_user` REAIS a qualquer
    visitante — dado pessoal, e o endereço para onde os documentos de alguém
    vão.

    `/app-config` PATCH deixava qualquer um mudar a configuração da instalação,
    e `/app-config/cleanup` deixava qualquer um disparar limpeza de arquivos.

    `/config/test-email` deixava qualquer um fazer o servidor abrir conexão SMTP
    autenticada, quantas vezes quisesse.

    `/metrics/*` contava quantos trabalhos existem e em que formatos — de todo
    mundo, somados.

    `/presets` era CRUD aberto.

    Nenhuma dessas rotas era um descuido isolado: TODAS são corretas num produto
    de uma pessoa só rodando na própria máquina, que é como o Mekora nasceu. O
    que mudou foi ele passar a ter contas, e o que era "o dono do computador"
    virou "qualquer um na internet".

    Responde 401, e não 404 como a outra porta: aqui não há nada cuja existência
    precise ser escondida — a rota existe, é pública que ela não é.
    """
    from app.services import acesso_service

    pessoa = acesso_service.quem_e(db, mekora_sessao)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para continuar.")
    # DEVOLVE A PESSOA, e não `None`. Como dependência o retorno é ignorado, e
    # era só isso que ela fazia; chamada direta, quem precisa de quem está
    # logado tinha de perguntar de novo ao `acesso_service` logo abaixo. Duas
    # buscas para uma pergunta, e duas chances de uma delas mudar sozinha.
    return pessoa
