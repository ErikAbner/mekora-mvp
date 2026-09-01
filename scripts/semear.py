#!/usr/bin/env python3
"""Enche a conta do Erik com um acervo, para as telas terem o que mostrar.

POR QUE: uma conta recem-criada abre todas as telas VAZIAS, e uma estante vazia
nao mostra a grade, a ficha, o alternador de vista nem a lombada — que e
justamente o que ha para ver. Olhar o produto vazio nao diz se ele funciona.

O que ele semeia e MENTIRA CONFESSA: livros que nunca foram convertidos, com
capa de exemplo e contagem de paginas escrita aqui. Serve para ver a interface, e
nao para testar a conversao — que tem os proprios testes, com arquivo de verdade.

    uso:  MEKORA_PROVA=.ver MEKORA_EMAIL=erik@mekora.local python3 scripts/semear.py
"""
import os
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

RAIZ = Path(os.environ.get("MEKORA_PROVA", ".ver"))
EMAIL = os.environ.get("MEKORA_EMAIL", "erik@mekora.local")
BANCO = RAIZ / "storage" / "kindle_tool.db"

if not BANCO.exists():
    print(f"  banco não encontrado em {BANCO}", file=sys.stderr)
    raise SystemExit(1)

LIVROS = [
    # titulo, autor, paginas, capa, notas, fracao lida
    ("Malha Urbana", "Ana Duarte", 248, "/capas/exemplo-1.png", 24, 0.80),
    ("Apresentação Institucional", "Ana Duarte", 96, "/capas/exemplo-2.png", 8, 0.35),
    ("Sequência Noturna", "Ana Duarte", 412, "/capas/exemplo-3.png", 12, 0.12),
    ("Estudo de Viabilidade", "Ana Duarte", 640, "/capas/exemplo-4.png", 5, None),
    ("Relatório de pesquisa", "Marina Alves", 88, None, 0, None),
    ("Cadernos de campo", "Marina Alves", 1020, None, 3, 0.97),
]

NOTAS = [
    ("O que separa uma estante de uma pasta é a memória do que você pensou lendo.", "verde",
     "Vale para o Canvas também."),
    ("Uma foto é observação, não diagnóstico.", "amarelo", None),
    ("O problema não é converter uma vez. É que o acervo cresce e nada o segura.", "rosa",
     "Isto é a tese do produto."),
    ("Barra só onde existe o que contar.", "azul", None),
]

c = sqlite3.connect(BANCO)
c.execute("PRAGMA foreign_keys = ON")


def inserir(tabela: str, valores: dict) -> int:
    """Insere só o que a tabela tem, e RECLAMA do que ela exige e não veio.

    A primeira versão montava cada INSERT à mão e descobria as colunas
    obrigatórias uma por vez, a cada execução que falhava: `atualizada_em`,
    depois `comentario`, depois `endereco`. Três rodadas para três colunas, e
    ainda faltavam duas tabelas.

    Aqui o esquema é lido: o que não existe é descartado, e o que é NOT NULL sem
    default e não foi passado aparece de uma vez, com nome — em vez de uma
    exceção por vez.
    """
    info = list(c.execute(f"PRAGMA table_info({tabela})"))
    existe = {r[1] for r in info}
    exigidas = {r[1] for r in info if r[3] and r[4] is None and r[1] != "id"}

    campos = {k: v for k, v in valores.items() if k in existe}
    faltam = exigidas - set(campos)
    if faltam:
        raise SystemExit(f"  {tabela}: faltam colunas obrigatórias {sorted(faltam)}")

    cols = ", ".join(campos)
    marcas = ", ".join("?" * len(campos))
    return c.execute(f"INSERT INTO {tabela} ({cols}) VALUES ({marcas})", list(campos.values())).lastrowid

linha = c.execute("SELECT id FROM pessoas WHERE email = ?", (EMAIL,)).fetchone()
if not linha:
    print(f"  a conta {EMAIL} ainda não existe — peça o link primeiro", file=sys.stderr)
    raise SystemExit(1)
pessoa = linha[0]

# Idempotente: rodar duas vezes não duplica o acervo.
ja = c.execute("SELECT COUNT(*) FROM processing_jobs WHERE dono_id = ?", (pessoa,)).fetchone()[0]
if ja >= len(LIVROS):
    print(f"  a conta já tem {ja} livros — nada a semear")
    raise SystemExit(0)

agora = datetime.utcnow()
colunas = {r[1] for r in c.execute("PRAGMA table_info(processing_jobs)")}

for i, (titulo, autor, paginas, capa, quantas_notas, fracao) in enumerate(LIVROS):
    campos = {
        "dono_id": pessoa,
        "original_filename": f"{titulo.lower().replace(' ', '-')}.pdf",
        "final_title": titulo,
        "final_author": autor,
        "detected_title": titulo,
        "detected_author": autor,
        "page_count": paginas,
        "input_format": "pdf",
        "status": "converted",
        "conversion_status": "done",
        "is_scanned": i % 2 == 0,
        "created_at": agora - timedelta(days=len(LIVROS) - i),
        "updated_at": agora - timedelta(days=len(LIVROS) - i),
        "token_publico": f"semeado-{i}-{int(agora.timestamp())}",
        "kindle_sent": i == 0,
    }
    job = inserir("processing_jobs", campos)

    if fracao is not None:
        inserir("progressos", {"pessoa_id": pessoa, "job_id": job, "capitulo": 1,
                               "deslocamento": 120, "capitulos": 8, "fracao": fracao,
                               "atualizado_em": agora})

    for n in range(min(quantas_notas, len(NOTAS))):
        trecho, cor, comentario = NOTAS[n]
        inserir("notas", {
            "pessoa_id": pessoa, "job_id": job, "trecho": trecho, "cor": cor,
            # "" e nao None: a coluna e NOT NULL, e nota sem comentario e o caso
            # comum — o produto guarda string vazia.
            "comentario": comentario or "",
            "capitulo": n % 3, "de": 40 * n, "ate": 40 * n + len(trecho),
            "origem": titulo, "fonte": "leitura",
            "criada_em": agora - timedelta(hours=n),
            "atualizada_em": agora - timedelta(hours=n),
        })

# Um aparelho Kindle, para a tela de dispositivos ter o que mostrar.
if not c.execute("SELECT 1 FROM aparelhos WHERE pessoa_id = ?", (pessoa,)).fetchone():
    inserir("aparelhos", {"pessoa_id": pessoa, "nome": "Kindle do Erik",
                          "endereco": "erik_mekora@kindle.com", "email": "erik_mekora@kindle.com",
                          "principal": True, "criado_em": agora, "mexido_em": agora})

# Um estudo, com notas reunidas.
if not c.execute("SELECT 1 FROM estudos WHERE pessoa_id = ?", (pessoa,)).fetchone():
    estudo = inserir("estudos", {
        "pessoa_id": pessoa, "nome": "Por que uma estante e não uma pasta",
        "sobre": "O que a memória de onde se marcou muda na releitura, seis meses depois.",
        "fechado": False, "criado_em": agora, "mexido_em": agora,
    })
    for (nota_id,) in c.execute("SELECT id FROM notas WHERE pessoa_id = ? LIMIT 3", (pessoa,)).fetchall():
        inserir("estudo_notas", {"estudo_id": estudo, "nota_id": nota_id, "reunida_em": agora})

c.commit()
n = c.execute("SELECT COUNT(*) FROM processing_jobs WHERE dono_id = ?", (pessoa,)).fetchone()[0]
m = c.execute("SELECT COUNT(*) FROM notas WHERE pessoa_id = ?", (pessoa,)).fetchone()[0]
print(f"  semeado: {n} livros, {m} notas, 1 aparelho, 1 estudo")
