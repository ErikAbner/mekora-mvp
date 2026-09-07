#!/usr/bin/env python3
"""Backup do Mekora: o banco e o que está no disco.

    python3 scripts/backup.py                 # banco + espelho do storage
    python3 scripts/backup.py --so-banco      # só o banco, rápido
    python3 scripts/backup.py --conferir      # abre o último e confere

POR QUE NÃO É UM `cp`
=====================
Copiar um arquivo SQLite enquanto a aplicação escreve pode capturar um estado
pela metade: o arquivo principal atualizado e o journal não, ou o inverso. O
resultado abre normalmente e falha depois, no meio de uma consulta — que é a
pior hora de descobrir que o backup não presta.

A API `Connection.backup()` do próprio SQLite copia página a página segurando a
consistência, com a aplicação rodando. É por isso que este script existe em vez
de uma linha de `cp`.

O QUE É TRATADO COMO GRANDE, E POR QUÊ
======================================
O banco tem alguns megabytes e muda a toda hora — é o que dói perder, porque é
onde vive o registro de todo trabalho já feito. Ele é versionado: várias cópias,
com data no nome.

O `storage/` tem mais de um gigabyte, e é feito de arquivos que **não mudam
depois de escritos**: o PDF que entrou, o EPUB que saiu. Versionar isso todo dia
multiplicaria gigabytes para guardar o mesmo byte. Ele é espelhado — cópia
única, atualizada, só do que faltar.

BACKUP QUE NINGUÉM ABRE NÃO É BACKUP
====================================
Todo backup do banco é verificado logo depois de escrito: abre, roda
`integrity_check`, conta as linhas das tabelas que importam. Um backup corrompido
que ninguém conferiu é pior que backup nenhum, porque ele produz confiança.
"""

import argparse
import os
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

# A RAIZ DO STORAGE VEM DE `MEKORA_STORAGE`, como no resto do produto.
#
# Ela era derivada só da posição deste arquivo, e isso é o defeito que o
# `config.py` já tinha consertado em 30/08 com a mesma variável: em container o
# storage é um volume, e um backup que copia `<repo>/storage` num ambiente onde
# os documentos moram em `/dados` copia uma pasta vazia — e confere, e poda, e
# diz "feito".
#
# Achado em 07/09 ao escrever o `restaurar.py`: apontei o backup para o storage
# da bancada e ele copiou o de produção sem reclamar.
STORAGE = Path(os.getenv("MEKORA_STORAGE", RAIZ / "storage"))
BANCO = STORAGE / "kindle_tool.db"
DESTINO = Path(os.getenv("MEKORA_BACKUP_DIR", STORAGE / "backups"))

# Quantas cópias do banco ficam. Sete cobre uma semana: tempo de perceber que
# algo se perdeu antes que a última cópia boa saia da janela.
QUANTAS_GUARDAR = 7

# O QUE É ESPELHADO, e a lista cresceu em 07/09 ao escrever o `restaurar.py`.
#
# `retratos/` FALTAVA, e é dado da pessoa: `acesso.py` grava ali o `{id}.png` do
# retrato da conta e guarda o caminho absoluto em `pessoas.retrato`. Sem ele no
# backup, restaurar devolve um banco com um retrato que aponta para o nada — e
# a verificação de "registro tem arquivo" reprova, com razão.
ESPELHADAS = ["input", "output", "covers", "retratos"]

# CONFIGURAÇÃO PERSISTENTE — dois arquivos soltos na raiz do storage, e nenhum
# dos dois é reconstruível: `config.json` é o que o `app_config_service` guarda
# (motor de tradução, endereço de Kindle, limites), e `config_presets.json` são
# os presets de conversão. Perder os dois não perde livro nenhum, e perde toda
# a configuração de quem instalou.
SOLTOS = ["config.json", "config_presets.json"]

# O QUE FICA DE FORA, e por quê — a lista importa tanto quanto a de cima:
#
#   temp/      descartável por definição; 127 MB que se reconstroem sozinhos
#   logs/      histórico operacional, não é dado de ninguém, e só cresce
#   models/    modelos de tradução baixados: gigabytes, e se rebaixam
#   ui-audit/  saída de instrumento, regenerável rodando o instrumento
#   backups/   o próprio backup — copiá-lo dentro de si é recursão
#   segredos   `.env`, SMTP, chaves. Nunca estiveram aqui, e é política: segredo
#              em backup é segredo em mais um lugar de onde vazar


def registrar(msg):
    print(f"  {msg}")


def copiar_banco(destino: Path) -> Path:
    if not BANCO.exists():
        raise SystemExit(f"banco não encontrado em {BANCO}")

    destino.mkdir(parents=True, exist_ok=True)
    saida = destino / f"kindle_tool_{datetime.now():%Y%m%d_%H%M%S}.db"

    origem = sqlite3.connect(f"file:{BANCO}?mode=ro", uri=True)
    copia = sqlite3.connect(saida)
    with copia:
        origem.backup(copia)
    origem.close()
    copia.close()

    registrar(f"banco copiado: {saida.name} ({saida.stat().st_size / 1e6:.1f} MB)")
    return saida


def conferir(caminho: Path) -> bool:
    """Abre a cópia e prova que ela serve. Só o esquema e as contagens são
    lidos — nenhum conteúdo de documento é aberto."""
    try:
        c = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
        resultado = c.execute("PRAGMA integrity_check").fetchone()[0]
        if resultado != "ok":
            registrar(f"CORROMPIDO: {resultado}")
            return False
        tabelas = [
            t for (t,) in c.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
        ]
        contagens = {t: c.execute(f"SELECT count(*) FROM '{t}'").fetchone()[0] for t in tabelas}
        c.close()
        registrar("conferido: integridade ok, " + ", ".join(f"{t}={n}" for t, n in sorted(contagens.items())))
        return True
    except Exception as e:
        registrar(f"NÃO ABRE: {e}")
        return False


def podar(destino: Path):
    copias = sorted(destino.glob("kindle_tool_*.db"), key=lambda p: p.stat().st_mtime, reverse=True)
    for velha in copias[QUANTAS_GUARDAR:]:
        velha.unlink()
        registrar(f"removida cópia antiga: {velha.name}")


def espelhar(destino: Path):
    """Copia só o que falta ou mudou. `shutil` em vez de rsync porque rsync não
    existe em toda imagem de container, e uma dependência que falta no servidor
    é um backup que não roda."""
    novos = bytes_copiados = 0
    for pasta in ESPELHADAS:
        origem = STORAGE / pasta
        if not origem.exists():
            continue
        alvo = destino / "espelho" / pasta
        for arq in origem.rglob("*"):
            if not arq.is_file():
                continue
            fim = alvo / arq.relative_to(origem)
            if fim.exists() and fim.stat().st_size == arq.stat().st_size and fim.stat().st_mtime >= arq.stat().st_mtime:
                continue
            fim.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(arq, fim)
            novos += 1
            bytes_copiados += arq.stat().st_size
    for nome in SOLTOS:
        origem = STORAGE / nome
        if not origem.exists():
            continue
        alvo = destino / "espelho" / nome
        alvo.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origem, alvo)
        novos += 1
        bytes_copiados += origem.stat().st_size
    registrar(f"espelho: {novos} arquivos novos ou mudados ({bytes_copiados / 1e6:.1f} MB)")


def main():
    p = argparse.ArgumentParser(description="Backup do Mekora")
    p.add_argument("--so-banco", action="store_true", help="pula o espelho do storage")
    p.add_argument("--conferir", action="store_true", help="confere a última cópia e sai")
    a = p.parse_args()

    print(f"\nBackup do Mekora — {datetime.now():%d/%m/%Y %H:%M}")
    print(f"destino: {DESTINO}\n")

    if a.conferir:
        copias = sorted(DESTINO.glob("kindle_tool_*.db"), key=lambda x: x.stat().st_mtime, reverse=True)
        if not copias:
            raise SystemExit("nenhuma cópia encontrada — nunca rodou")
        registrar(f"última: {copias[0].name}")
        raise SystemExit(0 if conferir(copias[0]) else 1)

    copia = copiar_banco(DESTINO)
    if not conferir(copia):
        # A cópia ruim não é apagada: ela é a prova do que deu errado.
        raise SystemExit("backup do banco NÃO confere — não confie nele")
    podar(DESTINO)

    if not a.so_banco:
        espelhar(DESTINO)

    print("\nfeito.\n")


if __name__ == "__main__":
    sys.exit(main())
