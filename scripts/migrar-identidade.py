#!/usr/bin/env python3
"""Migra o grafo legado para uma identidade estável — item `C10`.

    python3 scripts/migrar-identidade.py --inventario
    python3 scripts/migrar-identidade.py --destino <uuid|email>            # ensaio
    python3 scripts/migrar-identidade.py --destino <uuid|email> --executar

═══════════════════════════════════════════════════════════════════════════════
O PRINCÍPIO, E ELE É UM SÓ
═══════════════════════════════════════════════════════════════════════════════

    Nunca inferir silenciosamente o proprietário de dados quando houver
    ambiguidade.

Duas colunas de propriedade do Mekora aceitam nulo — `processing_jobs.dono_id` e
`recados.pessoa_id` —, e as outras quinze são obrigatórias. Nulo ali não é
defeito: converter não exige conta (`DEC-0018`), e um recado pode ser deixado por
quem nunca entrou. O legado deste repositório tem **37 trabalhos sem dono**.

O QUE ESTE SCRIPT NÃO FAZ, e é a parte que importa: ele não adivinha. O Erik
proibiu nome, e-mail parecido, título de livro, timestamp e proximidade de
registros — e a proibição é boa, porque cada uma dessas pistas acerta na maioria
dos casos e erra em silêncio no resto.

O único sinal aceito é ESTRUTURAL: uma FK apontando para o trabalho. Se as notas
de um trabalho órfão são todas da pessoa 4, a pessoa 4 já é dona do que está
pendurado nele — isso não é palpite, é o grafo. E se apontam para DUAS pessoas, o
script para: aí existe ambiguidade de verdade, e ninguém deveria resolvê-la de
memória às duas da manhã.

═══════════════════════════════════════════════════════════════════════════════
O QUE MIGRA, E O QUE NÃO
═══════════════════════════════════════════════════════════════════════════════

MIGRA o trabalho órfão e, com ele, tudo que está pendurado no trabalho —
progresso, marcadores, notas e livros do Canvas já carregam `pessoa_id`
obrigatório, então o que a migração faz por eles é CONFERIR que não ficaram
apontando para outra pessoa.

NÃO MIGRA o recado anônimo. Ele nasce sem dono por desenho — a caixa de recado
não pede conta —, e dar dono a um recado anônimo é inventar propriedade, que é
exatamente o que o princípio proíbe. Um recado sem pessoa e sem e-mail não tem
dono a descobrir: ele não tem dono.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
STORAGE = Path(os.getenv("MEKORA_STORAGE", RAIZ / "storage")).resolve()
BANCO = STORAGE / "kindle_tool.db"

VERDE, VERMELHO, AMARELO, FIM = "\033[32m", "\033[31m", "\033[33m", "\033[0m"
if os.getenv("NO_COLOR"):
    VERDE = VERMELHO = AMARELO = FIM = ""


class Falhou(Exception):
    """Para tudo. Migração pela metade é o estado que ninguém projetou."""


# As tabelas que apontam para um trabalho, e a coluna de pessoa de cada uma.
# São elas que dão o dono plausível — e são elas que a validação confere depois.
PENDURADAS = [
    ("notas", "job_id", "pessoa_id"),
    ("progressos", "job_id", "pessoa_id"),
    ("marcadores", "job_id", "pessoa_id"),
    ("canvas_livros", "job_id", "pessoa_id"),
]


def abrir(somente_leitura: bool = True) -> sqlite3.Connection:
    if not BANCO.is_file():
        raise Falhou(f"banco não encontrado: {BANCO}")
    if somente_leitura:
        c = sqlite3.connect(f"file:{BANCO}?mode=ro", uri=True)
    else:
        c = sqlite3.connect(BANCO)
    c.row_factory = sqlite3.Row
    return c


def tem_coluna(c: sqlite3.Connection, tabela: str, coluna: str) -> bool:
    return any(r["name"] == coluna for r in c.execute(f"PRAGMA table_info({tabela})"))


# ═════════════════════════════════════════════════════════════════════════════
# 4 · INVENTÁRIO   ·   5 · CONTAGENS ANTES
# ═════════════════════════════════════════════════════════════════════════════
def inventariar(c: sqlite3.Connection) -> dict:
    """O que existe, quem são os candidatos, e o que o grafo já diz."""
    orfaos = [r["id"] for r in c.execute("SELECT id FROM processing_jobs WHERE dono_id IS NULL")]

    # O DONO PLAUSÍVEL VEM DA FK, e de nada mais.
    donos_por_job: dict[int, set[int]] = {}
    for tabela, col_job, col_pessoa in PENDURADAS:
        for r in c.execute(
            f"SELECT DISTINCT {col_job} AS job, {col_pessoa} AS pessoa FROM {tabela} "
            f"WHERE {col_job} IS NOT NULL AND {col_pessoa} IS NOT NULL"
        ):
            if r["job"] in orfaos:
                donos_por_job.setdefault(r["job"], set()).add(r["pessoa"])

    com_sinal = {j: p for j, p in donos_por_job.items() if len(p) == 1}
    ambiguos = {j: p for j, p in donos_por_job.items() if len(p) > 1}
    sem_sinal = [j for j in orfaos if j not in donos_por_job]

    return {
        "pessoas": c.execute("SELECT count(*) FROM pessoas").fetchone()[0],
        "jobs_total": c.execute("SELECT count(*) FROM processing_jobs").fetchone()[0],
        "jobs_orfaos": orfaos,
        "com_sinal": com_sinal,
        "ambiguos": ambiguos,
        "sem_sinal": sem_sinal,
        "recados_anonimos": c.execute(
            "SELECT count(*) FROM recados WHERE pessoa_id IS NULL"
        ).fetchone()[0],
        "contagens": {
            t: c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
            for t in ("pessoas", "processing_jobs", "notas", "progressos", "marcadores", "canvas_livros")
        },
    }


def achar_destino(c: sqlite3.Connection, pedido: str) -> sqlite3.Row:
    """3 · A IDENTIDADE DESTINO É INFORMADA, e nunca escolhida pelo script.

    Aceita uuid ou e-mail. Não aceita `id`: o id sequencial é justamente a
    identidade instável que este trabalho existe para substituir, e deixar
    migrar por ele seria oferecer a arma ao lado do curativo.
    """
    if not tem_coluna(c, "pessoas", "uuid"):
        raise Falhou(
            "a coluna `pessoas.uuid` não existe — rode as migrações antes:\n"
            "  .venv/bin/python -m alembic -c backend/alembic.ini upgrade head"
        )
    pedido = pedido.strip()
    linha = c.execute("SELECT id, uuid, email FROM pessoas WHERE uuid = ?", (pedido,)).fetchone()
    if linha is None:
        linha = c.execute(
            "SELECT id, uuid, email FROM pessoas WHERE lower(email) = lower(?)", (pedido,)
        ).fetchone()
    if linha is None:
        raise Falhou(f"não achei pessoa com uuid nem e-mail {pedido!r}")
    return linha


# ═════════════════════════════════════════════════════════════════════════════
# 8 · DETECÇÃO DE ÓRFÃOS E DE AMBIGUIDADE
# ═════════════════════════════════════════════════════════════════════════════
def conferir_ambiguidade(inv: dict, destino: sqlite3.Row) -> list[str]:
    """Devolve os motivos para PARAR. Lista vazia é o único sinal verde."""
    problemas = []

    if inv["ambiguos"]:
        exemplos = list(inv["ambiguos"].items())[:3]
        detalhe = "; ".join(f"trabalho {j}: pessoas {sorted(p)}" for j, p in exemplos)
        problemas.append(
            f"{len(inv['ambiguos'])} trabalho(s) com MAIS DE UM proprietário plausível — {detalhe}. "
            "Isso exige mapeamento explícito, e não uma escolha automática"
        )

    # O sinal do grafo apontando para OUTRA pessoa que não a informada é o caso
    # mais perigoso de todos: a migração pareceria bem-sucedida e teria movido o
    # acervo de alguém para outro alguém.
    discordam = {j: p for j, p in inv["com_sinal"].items() if next(iter(p)) != destino["id"]}
    if discordam:
        exemplos = list(discordam.items())[:3]
        detalhe = "; ".join(f"trabalho {j}: pessoa {next(iter(p))}" for j, p in exemplos)
        problemas.append(
            f"{len(discordam)} trabalho(s) já têm notas ou progresso de OUTRA pessoa que não a "
            f"informada ({destino['email']}) — {detalhe}. Migrar moveria o acervo de alguém"
        )

    return problemas


# ═════════════════════════════════════════════════════════════════════════════
# 1 · BACKUP ANTES
# ═════════════════════════════════════════════════════════════════════════════
def fazer_backup() -> Path:
    pasta = STORAGE / "backups"
    pasta.mkdir(parents=True, exist_ok=True)
    alvo = pasta / f"antes-da-migracao-de-identidade_{datetime.now():%Y%m%d_%H%M%S}.db"
    # `sqlite3.backup` e não `cp`: com o servidor no ar, copiar o arquivo pega o
    # banco no meio de uma transação e produz uma cópia que abre e mente.
    origem = sqlite3.connect(f"file:{BANCO}?mode=ro", uri=True)
    destino = sqlite3.connect(alvo)
    try:
        origem.backup(destino)
    finally:
        destino.close()
        origem.close()
    return alvo


# ═════════════════════════════════════════════════════════════════════════════
# 6 · TRANSACIONAL   ·   9 · VALIDAÇÃO DEPOIS   ·   10 · IDEMPOTENTE
# ═════════════════════════════════════════════════════════════════════════════
def migrar(destino: sqlite3.Row, inv: dict) -> dict:
    c = abrir(somente_leitura=False)
    try:
        # 7 · AS CONSTRAINTS VALEM DURANTE A MIGRAÇÃO. O SQLite as deixa
        # DESLIGADAS por omissão, e uma migração que roda com elas desligadas
        # pode gravar `dono_id` apontando para pessoa que não existe.
        c.execute("PRAGMA foreign_keys = ON")

        alvos = list(inv["jobs_orfaos"])
        if not alvos:
            # 10 · IDEMPOTÊNCIA: rodar de novo não é erro, é um nada.
            return {"migrados": 0, "ja_estava": True}

        c.execute("BEGIN")
        marcas = ",".join("?" * len(alvos))
        cursor = c.execute(
            f"UPDATE processing_jobs SET dono_id = ? WHERE id IN ({marcas}) AND dono_id IS NULL",
            [destino["id"], *alvos],
        )
        migrados = cursor.rowcount

        # 9 · A VALIDAÇÃO RODA DENTRO DA TRANSAÇÃO, e é isso que a torna útil:
        # reprovar aqui desfaz tudo. Validar depois do commit é escrever um
        # relatório sobre um estrago já gravado.
        problemas = validar(c, destino, inv, migrados)
        if problemas:
            c.execute("ROLLBACK")
            raise Falhou("a validação reprovou, e nada foi gravado:\n  - " + "\n  - ".join(problemas))
        c.execute("COMMIT")
        return {"migrados": migrados, "ja_estava": False}
    finally:
        c.close()


def validar(c: sqlite3.Connection, destino: sqlite3.Row, inv: dict, migrados: int) -> list[str]:
    problemas = []

    if migrados != len(inv["jobs_orfaos"]):
        problemas.append(
            f"esperava mover {len(inv['jobs_orfaos'])} trabalho(s) e movi {migrados}"
        )

    sobraram = c.execute("SELECT count(*) FROM processing_jobs WHERE dono_id IS NULL").fetchone()[0]
    if sobraram:
        problemas.append(f"{sobraram} trabalho(s) continuam sem dono")

    # 5/9 · AS CONTAGENS ANTES E DEPOIS. Uma migração de propriedade não cria nem
    # apaga linha nenhuma: qualquer diferença aqui é dano.
    for tabela, antes in inv["contagens"].items():
        agora = c.execute(f"SELECT count(*) FROM {tabela}").fetchone()[0]
        if agora != antes:
            problemas.append(f"{tabela}: eram {antes} linhas e agora são {agora}")

    # 7 · As chaves estrangeiras continuam íntegras.
    quebradas = c.execute("PRAGMA foreign_key_check").fetchall()
    if quebradas:
        problemas.append(f"{len(quebradas)} chave(s) estrangeira(s) quebrada(s)")

    # E o que estava pendurado não ficou de outra pessoa.
    for tabela, col_job, col_pessoa in PENDURADAS:
        divergentes = c.execute(
            f"SELECT count(*) FROM {tabela} t JOIN processing_jobs j ON j.id = t.{col_job} "
            f"WHERE j.dono_id = ? AND t.{col_pessoa} != ?",
            (destino["id"], destino["id"]),
        ).fetchone()[0]
        if divergentes:
            problemas.append(
                f"{tabela}: {divergentes} linha(s) de outra pessoa num trabalho que agora é de "
                f"{destino['email']}"
            )

    return problemas


# ═════════════════════════════════════════════════════════════════════════════
# 11 · O RELATÓRIO
# ═════════════════════════════════════════════════════════════════════════════
def contar(inv: dict) -> None:
    print(f"\n  banco: {BANCO}")
    print(f"  pessoas: {inv['pessoas']}   ·   trabalhos: {inv['jobs_total']}")
    print(f"\n  {AMARELO}sem dono:{FIM} {len(inv['jobs_orfaos'])} trabalho(s)")
    print(f"    com sinal do grafo (uma pessoa) ...... {len(inv['com_sinal'])}")
    print(f"    {VERMELHO}ambíguos (mais de uma pessoa){FIM} ......... {len(inv['ambiguos'])}")
    print(f"    sem sinal nenhum ..................... {len(inv['sem_sinal'])}")
    print(f"\n  recados anônimos: {inv['recados_anonimos']}  (NÃO migram — ver o cabeçalho)")
    print("\n  contagens antes:")
    for t, n in inv["contagens"].items():
        print(f"    {t:18} {n}")


def main() -> int:
    p = argparse.ArgumentParser(description="Migra o grafo legado para uma identidade estável.")
    p.add_argument("--inventario", action="store_true", help="só mostra o que existe, e sai")
    p.add_argument("--destino", help="uuid ou e-mail da identidade que recebe o grafo")
    p.add_argument(
        "--executar",
        action="store_true",
        help="grava. SEM ISTO É ENSAIO: o padrão é não escrever, e o padrão é de propósito",
    )
    a = p.parse_args()

    try:
        c = abrir()
        try:
            inv = inventariar(c)
        finally:
            c.close()

        if a.inventario or not a.destino:
            print(f"\n{AMARELO}Inventário{FIM}")
            contar(inv)
            if not a.destino:
                print(
                    "\n  Para migrar, informe a identidade destino:\n"
                    "    python3 scripts/migrar-identidade.py --destino <uuid|email>\n"
                )
            return 0

        c = abrir()
        try:
            destino = achar_destino(c, a.destino)
            inv_ = inventariar(c)
        finally:
            c.close()

        print(f"\n{AMARELO}{'MIGRAÇÃO' if a.executar else 'ENSAIO — nada será gravado'}{FIM}")
        contar(inv_)
        print(f"\n  destino: {destino['email']}  ({destino['uuid']})")

        problemas = conferir_ambiguidade(inv_, destino)
        if problemas:
            print(f"\n  {VERMELHO}PARADO — ambiguidade real:{FIM}")
            for x in problemas:
                print(f"    - {x}")
            print()
            return 2

        if not inv_["jobs_orfaos"]:
            print(f"\n  {VERDE}Nada a migrar: nenhum trabalho está sem dono.{FIM}\n")
            return 0

        if not a.executar:
            print(
                f"\n  {VERDE}O ensaio passa.{FIM} {len(inv_['jobs_orfaos'])} trabalho(s) iriam para "
                f"{destino['email']}.\n  Repita com --executar para gravar.\n"
            )
            return 0

        copia = fazer_backup()
        print(f"\n  backup: {copia}")
        r = migrar(destino, inv_)
        print(f"\n  {VERDE}MIGRADO{FIM} — {r['migrados']} trabalho(s) agora são de {destino['email']}.")
        print(f"  Rollback: pare o servidor e copie {copia} por cima de {BANCO}\n")
        return 0

    except Falhou as e:
        print(f"\n  {VERMELHO}FALHOU{FIM}  {e}\n", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
