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

TABELA VAZIA NÃO PROVA NADA
===========================
Em 31/08 este script aprovou uma migração que quebrava. A coluna era NOT NULL
sem `server_default`, e o SQLite só RECUSA isso quando a tabela tem linhas —
com ela vazia, a migração passa. A tabela em questão estava vazia no banco de
origem, então a prova rodou contra o caso fácil e não disse nada.

O padrão é traiçoeiro porque é o inverso do esperado: a migração funciona em
banco novo e falha em banco usado, então quem testa em ambiente limpo nunca a
vê quebrar.

Agora o script SEMEIA uma linha em cada tabela vazia antes de aplicar. Não é
para testar os dados: é para que a migração encontre o caso que ela precisa
saber tratar.
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


def conferir_escrita(pasta: Path) -> list:
    """Lê as migrações e acusa `NOT NULL` sem `server_default` antes de rodar.

    Rodar já pega — foi assim que o defeito apareceu três vezes. Mas ler pega
    ANTES, e diz qual arquivo e qual linha, em vez de um traceback do SQLite
    sobre uma tabela temporária que não existe no código de ninguém.

    A confusão que produz o erro é sempre a mesma: `default=0` no modelo parece
    resolver, e não resolve — ele é aplicado pelo ORM, ao criar o objeto em
    Python. O banco nunca o vê. Só `server_default` vira DEFAULT na tabela.
    """
    import re

    problemas = []
    for arquivo in sorted(pasta.glob("*.py")):
        texto = arquivo.read_text(encoding="utf-8")
        for numero, linha in enumerate(texto.splitlines(), start=1):
            if "add_column" not in linha or "nullable=False" not in linha:
                continue
            if "server_default" in linha:
                continue
            coluna = re.search(r"sa\.Column\(\s*['\"]([^'\"]+)", linha)
            problemas.append(
                f"{arquivo.name}:{numero} — coluna '{coluna.group(1) if coluna else '?'}' "
                "é NOT NULL e não tem server_default"
            )
    return problemas


def semear_vazias(caminho: Path) -> list:
    """Põe uma linha em cada tabela vazia, para a migração ter o que quebrar.

    Os valores são o mínimo que satisfaz as restrições: zero para número, texto
    vazio para texto, agora para data. Eles não precisam fazer sentido — o que
    importa é EXISTIR uma linha, porque é a existência dela que faz o SQLite
    recusar uma coluna NOT NULL sem default.
    """
    c = sqlite3.connect(caminho)
    c.execute("PRAGMA foreign_keys = OFF")
    semeadas = []

    tabelas = [
        t for (t,) in c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version'"
        )
    ]
    for t in tabelas:
        if c.execute(f"SELECT count(*) FROM '{t}'").fetchone()[0]:
            continue
        colunas = list(c.execute(f"PRAGMA table_info('{t}')"))
        nomes, valores = [], []
        for _, nome, tipo, nao_nulo, padrao, pk in colunas:
            if pk:
                continue  # deixa o SQLite atribuir
            if not nao_nulo or padrao is not None:
                continue  # aceita nulo ou já tem valor
            tipo = (tipo or "").upper()
            nomes.append(f'"{nome}"')
            if "INT" in tipo or "REAL" in tipo or "NUM" in tipo or "BOOL" in tipo:
                valores.append(0)
            elif "DATE" in tipo or "TIME" in tipo:
                valores.append("2000-01-01 00:00:00")
            else:
                valores.append("")
        try:
            if nomes:
                c.execute(
                    f"INSERT INTO '{t}' ({', '.join(nomes)}) VALUES ({', '.join('?' * len(valores))})",
                    valores,
                )
            else:
                c.execute(f"INSERT INTO '{t}' DEFAULT VALUES")
            semeadas.append(t)
        except Exception:
            # Tabela que não aceita linha mínima fica de fora: semear não é o
            # objetivo, é o meio.
            pass

    c.commit()
    c.close()
    return semeadas


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

    # A leitura vem antes: ela diz qual linha está errada, contra um traceback
    # do SQLite sobre uma tabela temporária.
    mal_escritas = conferir_escrita(RAIZ / "backend" / "alembic" / "versions")
    if mal_escritas:
        print("\nMIGRAÇÃO MAL ESCRITA — o `default` do modelo não chega ao banco:")
        for m in mal_escritas:
            print("  " + m)
        print("\nUse `server_default` na coluna. Sem ele, a migração passa em tabela")
        print("vazia e falha em tabela com linhas — funciona em banco novo e quebra")
        print("em banco usado.\n")
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

        # SEMEAR AS TABELAS VAZIAS. Ver a explicação no topo: uma coluna NOT
        # NULL sem default só quebra quando há linhas, então provar contra
        # tabela vazia é provar o caso que sempre passa.
        semeadas = semear_vazias(copia)
        if semeadas:
            print(f"\nsemeadas para valer a prova: {', '.join(semeadas)}")

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
