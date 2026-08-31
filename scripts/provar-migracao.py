#!/usr/bin/env python3
"""Prova uma migração numa CÓPIA do banco, antes de ela tocar no de verdade.

    python3 scripts/provar-migracao.py

Faz três coisas com uma cópia: aplica, desfaz, aplica de novo. Depois confere
que nada se perdeu e que o arquivo continua íntegro.

POR QUE ISTO É UM INSTRUMENTO E NÃO UM COMANDO
==============================================
Eu vinha fazendo isso à mão, com uma linha de `sqlite3` para copiar e três de
`alembic`. Em 30/08 errei essa linha — fechei a conexão dentro do `with`, a
cópia saiu vazia, os três passos rodaram contra nada e reportaram sucesso. E eu
apliquei no banco real acreditando num teste que não tinha acontecido.

Deu certo por sorte. A defesa contra isso não é lembrar melhor: é um comando só,
que falha alto quando a cópia não presta.

DESFAZER IMPORTA MAIS DO QUE PARECE
===================================
Uma migração que aplica e não desfaz prende o produto na versão nova. Descobrir
isso durante um problema em produção — quando voltar é justamente o que se quer
— é a pior hora possível.
"""

import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
BANCO = RAIZ / "storage" / "kindle_tool.db"
ALEMBIC = RAIZ / ".venv" / "bin" / "alembic"


def contar(caminho: Path) -> dict:
    c = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
    tabelas = [t for (t,) in c.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )]
    fora = {t: c.execute(f"SELECT count(*) FROM '{t}'").fetchone()[0] for t in tabelas}
    fora["_integridade"] = c.execute("PRAGMA integrity_check").fetchone()[0]
    c.close()
    return fora


def alembic(passo: list, banco: Path) -> tuple:
    r = subprocess.run(
        [str(ALEMBIC)] + passo,
        cwd=str(RAIZ / "backend"),
        env={**os.environ, "DATABASE_URL": f"sqlite:///{banco}"},
        capture_output=True, text=True,
    )
    return r.returncode, (r.stdout + r.stderr)


def main() -> int:
    if not BANCO.exists():
        print(f"banco não encontrado em {BANCO}")
        return 1

    with tempfile.TemporaryDirectory() as pasta:
        copia = Path(pasta) / "copia.db"

        # A cópia é feita pela API do SQLite, como o backup: `cp` de um banco
        # com a aplicação escrevendo pode capturar um estado pela metade.
        origem = sqlite3.connect(f"file:{BANCO}?mode=ro", uri=True)
        destino = sqlite3.connect(copia)
        with destino:
            origem.backup(destino)
        origem.close()
        destino.close()

        antes = contar(copia)
        # A cópia vazia foi exatamente o defeito de 30/08. Se ela não tem os
        # dados, o teste inteiro é teatro.
        if antes.get("processing_jobs", 0) == 0 and contar(BANCO).get("processing_jobs", 0) > 0:
            print("A CÓPIA SAIU VAZIA e o original não está. Nada foi provado.")
            return 1

        print(f"\ncópia com {antes.get('processing_jobs', 0)} trabalhos e "
              f"{antes.get('stage_metrics', 0)} métricas\n")

        for rotulo, passo in [("aplica", ["upgrade", "head"]),
                              ("desfaz", ["downgrade", "-1"]),
                              ("aplica de novo", ["upgrade", "head"])]:
            codigo, saida = alembic(passo, copia)
            if codigo != 0:
                print(f"  {rotulo}: FALHOU")
                print("\n".join("    " + l for l in saida.strip().splitlines()[-12:]))
                return 1
            print(f"  {rotulo}: ok")

        depois = contar(copia)

        print()
        if depois["_integridade"] != "ok":
            print(f"  INTEGRIDADE QUEBRADA: {depois['_integridade']}")
            return 1

        # As tabelas novas não existiam antes; o que importa é que nenhuma linha
        # das antigas tenha sumido no caminho.
        perdas = [
            f"{t}: {antes[t]} → {depois.get(t, 0)}"
            for t in antes
            if not t.startswith("_") and depois.get(t, 0) < antes[t]
        ]
        if perdas:
            print("  DADOS PERDIDOS: " + "; ".join(perdas))
            return 1

        novas = sorted(set(depois) - set(antes) - {"_integridade"})
        print(f"  nada se perdeu, integridade ok" + (f", tabelas novas: {', '.join(novas)}" if novas else ""))
        print("\npode aplicar no banco de verdade.\n")
        return 0


if __name__ == "__main__":
    sys.exit(main())
