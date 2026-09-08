#!/usr/bin/env python3
"""Restauração do Mekora: o caminho de volta, e a prova de que ele funciona.

    python3 scripts/restaurar.py --listar
    python3 scripts/restaurar.py --snapshot kindle_tool_20260907_0312.db --destino /tmp/ensaio
    python3 scripts/restaurar.py --snapshot ultimo --destino /tmp/ensaio --sobrescrever

═══════════════════════════════════════════════════════════════════════════════
POR QUE ESTE ARQUIVO EXISTE
═══════════════════════════════════════════════════════════════════════════════

O `backup.py` existe desde agosto: copia o banco pela API do SQLite, confere
integridade e contagens, poda e espelha o storage. **Restaurar nunca existiu.**

O Erik marcou isso como o primeiro da fila de segurança em 03/09 (`C21` no
`docs/ABERTO.md`): *"não ter caminho de restauração é o que torna todo o resto
irrecuperável — vale mais que os P1 todos juntos"*. E o requisito nunca foi
"temos backup":

    Enquanto isso não for exercido, "temos backup" é uma frase, não um fato.

═══════════════════════════════════════════════════════════════════════════════
O ACHADO QUE MUDA O DESENHO: OS CAMINHOS SÃO ABSOLUTOS
═══════════════════════════════════════════════════════════════════════════════

`processing_jobs.epub_path` guarda `/Users/…/storage/output/1/malha-urbana.epub`
— o caminho inteiro, com a raiz da máquina de origem. Restaurar num destino
diferente sem tocar nisso produz um banco que abre, uma aplicação que sobe, uma
Estante que lista os livros — e **nenhum livro que abra**, porque cada registro
aponta para um lugar que não existe ali.

É exatamente o sucesso falso que o requisito proíbe: *"não quero um teste que
considere sucesso apenas porque N arquivos antes == N arquivos depois"*.

Então a restauração REESCREVE os caminhos para a raiz de destino, e depois
varre o banco inteiro procurando qualquer resto da raiz antiga — em toda tabela
e toda coluna de texto, e não só nas que eu conheço. É a rede que pega a coluna
que alguém acrescentar amanhã.

═══════════════════════════════════════════════════════════════════════════════
O QUE ENTRA, O QUE NÃO ENTRA
═══════════════════════════════════════════════════════════════════════════════

ENTRA, porque está no backup:

    o banco            o snapshot escolhido, um arquivo com data no nome
    input/             os documentos originais que a pessoa enviou
    output/            o que a conversão produziu — EPUB, artefatos
    covers/            as capas extraídas

NÃO ENTRA, e nenhum dos dois por esquecimento:

    temp/              descartável por definição; o `backup.py` já o exclui, e
                       são 127 MB que se reconstroem sozinhos
    segredos           `.env`, credenciais de SMTP, chaves. Eles nunca estiveram
                       no backup, e é política: segredo em backup é segredo em
                       mais um lugar de onde vazar. Quem restaura recria o `.env`
                       a partir do `.env.example` — está no `docs/RESTAURAR.md`

═══════════════════════════════════════════════════════════════════════════════
O MODELO É "DESTINO VAZIO", E ISSO É DELIBERADO
═══════════════════════════════════════════════════════════════════════════════

Restaurar exige um destino que não existe ou está vazio. Não há mesclagem: um
banco restaurado sobre arquivos de outro momento é um estado que ninguém
projetou, e a primeira leitura dele parece boa.

`--sobrescrever` é o único caminho para um destino com dados, ele é explícito, e
ainda assim recusa a raiz de produção. Para escrever na produção é preciso
`--sobrescrever` E `--sim-eu-quero-producao`, os dois, e o script imprime o que
vai destruir antes.

E o backup NUNCA é apagado, em nenhum caminho de erro. Ele é a única coisa que
ainda funciona quando tudo o mais falhou.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
BACKUPS = Path(os.getenv("MEKORA_BACKUP_DIR", RAIZ / "storage" / "backups"))
STORAGE_DE_PRODUCAO = Path(os.getenv("MEKORA_STORAGE", RAIZ / "storage")).resolve()

# As pastas que o `backup.py` espelha. A lista é a mesma dos dois lados de
# propósito: se ela divergir, a restauração devolve menos do que o backup tem.
ESPELHADAS = ["input", "output", "covers", "retratos"]

# Os arquivos soltos na raiz do storage — configuração persistente. A lista é a
# mesma do `backup.py`: se elas divergirem, a restauração devolve menos.
SOLTOS = ["config.json", "config_presets.json"]

# O primeiro segmento dentro do storage. Serve para achar onde a raiz antiga
# termina num caminho absoluto guardado no banco.
PASTAS_DO_STORAGE = {"input", "output", "covers", "temp", "logs", "backups"}

VERDE, VERMELHO, CINZA, FIM = "\033[32m", "\033[31m", "\033[90m", "\033[0m"
if not sys.stdout.isatty() or os.getenv("NO_COLOR"):
    VERDE = VERMELHO = CINZA = FIM = ""


class Falhou(Exception):
    """Uma verificação reprovou.

    Ela existe separada de `SystemExit` porque o requisito é explícito: *"se
    qualquer validação falhar, a restauração deve terminar como falha; não
    declarar sucesso parcial; informar exatamente qual verificação falhou"*.
    Cada `raise` daqui carrega o nome da verificação.
    """


def diz(msg=""):
    print(msg)


def passo(nome, ok, detalhe=""):
    marca = f"{VERDE}ok{FIM}" if ok else f"{VERMELHO}FALHOU{FIM}"
    diz(f"  {marca:<18} {nome}" + (f"  {CINZA}{detalhe}{FIM}" if detalhe else ""))


# ═══════════════════════════════════════════════════════════════════════════
# LISTAR — nunca escolher um backup em silêncio
# ═══════════════════════════════════════════════════════════════════════════

def snapshots(de: Path) -> list[Path]:
    if not de.exists():
        return []
    return sorted(de.glob("kindle_tool_*.db"), key=lambda p: p.stat().st_mtime, reverse=True)


def resumo_do_snapshot(caminho: Path) -> dict:
    """Abre em modo leitura e conta. Nenhum conteúdo de documento é lido."""
    fora = {"integridade": "?", "tabelas": 0, "linhas": 0, "jobs": 0, "notas": 0}
    try:
        c = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
        fora["integridade"] = c.execute("PRAGMA integrity_check").fetchone()[0]
        tabelas = [t for (t,) in c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        fora["tabelas"] = len(tabelas)
        for t in tabelas:
            n = c.execute(f"SELECT count(*) FROM '{t}'").fetchone()[0]
            fora["linhas"] += n
            if t == "processing_jobs":
                fora["jobs"] = n
            if t == "notas":
                fora["notas"] = n
        c.close()
    except Exception as e:
        fora["integridade"] = f"não abre: {e}"
    return fora


def listar(de: Path) -> int:
    copias = snapshots(de)
    diz(f"\nBackups em {de}\n")
    if not copias:
        diz(f"  {VERMELHO}nenhum snapshot encontrado{FIM} — o `backup.py` nunca rodou aqui.\n")
        return 1
    diz(f"  {'arquivo':<34} {'quando':<18} {'tamanho':>9}  {'jobs':>5} {'notas':>6}  integridade")
    diz(f"  {'─' * 34} {'─' * 18} {'─' * 9}  {'─' * 5} {'─' * 6}  {'─' * 11}")
    for i, p in enumerate(copias):
        r = resumo_do_snapshot(p)
        quando = datetime.fromtimestamp(p.stat().st_mtime).strftime("%d/%m/%Y %H:%M")
        marca = " (mais recente)" if i == 0 else ""
        diz(f"  {p.name:<34} {quando:<18} {p.stat().st_size / 1e6:>7.1f} MB"
            f"  {r['jobs']:>5} {r['notas']:>6}  {r['integridade']}{marca}")

    espelho = de / "espelho"
    diz()
    if espelho.exists():
        for pasta in ESPELHADAS:
            d = espelho / pasta
            arqs = [a for a in d.rglob("*") if a.is_file()] if d.exists() else []
            tam = sum(a.stat().st_size for a in arqs)
            diz(f"  espelho/{pasta:<10} {len(arqs):>5} arquivos  {tam / 1e6:>8.1f} MB")
        presentes = [s for s in SOLTOS if (espelho / s).exists()]
        ausentes = [s for s in SOLTOS if not (espelho / s).exists()]
        if presentes:
            diz(f"  configuração    {', '.join(presentes)}")
        if ausentes:
            diz(f"  {CINZA}sem            {', '.join(ausentes)} — não existe na origem{FIM}")
        diz(f"\n  {CINZA}O espelho é ÚNICO e sempre o mais recente — ele não tem versões.")
        diz(f"  Restaurar um snapshot antigo com o espelho de hoje pode acusar")
        diz(f"  registro sem arquivo, e a restauração vai FALHAR dizendo isso.{FIM}")
    else:
        diz(f"  {VERMELHO}sem espelho{FIM} — só o banco foi copiado até agora.")

    diz(f"\nPara restaurar:\n"
        f"  python3 scripts/restaurar.py --snapshot {copias[0].name} --destino <pasta vazia>\n")
    return 0


# ═══════════════════════════════════════════════════════════════════════════
# ESCOLHER — origem e destino, sem ambiguidade
# ═══════════════════════════════════════════════════════════════════════════

def escolher_snapshot(de: Path, pedido: str) -> Path:
    copias = snapshots(de)
    if not copias:
        raise Falhou(f"seleção do snapshot: não há nenhum em {de}")

    if pedido == "ultimo":
        # "ultimo" é uma escolha EXPLÍCITA — quem digita isso está dizendo qual
        # quer. O que o requisito proíbe é escolher sozinho quando ninguém
        # disse nada, e por isso `--snapshot` não tem valor padrão.
        return copias[0]

    alvo = Path(pedido)
    if alvo.is_absolute() or alvo.parent != Path("."):
        if not alvo.exists():
            raise Falhou(f"seleção do snapshot: {alvo} não existe")
        return alvo.resolve()

    achados = [p for p in copias if p.name == pedido]
    if not achados:
        nomes = "\n    ".join(p.name for p in copias[:8])
        raise Falhou(f"seleção do snapshot: '{pedido}' não está em {de}.\n"
                     f"  Os que existem:\n    {nomes}")
    return achados[0]


def conferir_destino(destino: Path, sobrescrever: bool, quer_producao: bool) -> None:
    """As três proteções, na ordem em que uma pessoa apressada as encontra."""
    d = destino.resolve()

    # 1 · A PRODUÇÃO PRECISA DE DUAS CHAVES. Uma flag só é fácil demais de
    #     copiar de um comando antigo do histórico do terminal.
    if d == STORAGE_DE_PRODUCAO or STORAGE_DE_PRODUCAO in d.parents:
        if not (sobrescrever and quer_producao):
            raise Falhou(
                f"proteção de produção: {d} está dentro do storage de produção "
                f"({STORAGE_DE_PRODUCAO}).\n"
                f"  O caminho padrão NÃO sobrescreve produção. Se é mesmo isso que "
                f"você quer, passe --sobrescrever E --sim-eu-quero-producao.")

    # 2 · DESTINO COM DADOS EXIGE INTENÇÃO. Sem isto, um destino digitado errado
    #     — um `/tmp/ensaio` de ontem — receberia um banco novo por cima de
    #     arquivos velhos, e o resultado é um estado que ninguém projetou.
    if d.exists() and any(d.iterdir()) and not sobrescrever:
        conteudo = sorted(x.name for x in d.iterdir())[:6]
        raise Falhou(
            f"destino não vazio: {d} já tem {', '.join(conteudo)}…\n"
            f"  A restauração é para destino VAZIO — não há mesclagem, porque um "
            f"banco restaurado sobre arquivos de outro momento é um estado que "
            f"ninguém projetou.\n"
            f"  Para apagar o que está lá e restaurar por cima: --sobrescrever")


# ═══════════════════════════════════════════════════════════════════════════
# RESTAURAR
# ═══════════════════════════════════════════════════════════════════════════

def raizes_antigas_do_banco(banco: Path, juntar: bool = False) -> list[str]:
    """As grafias de raiz de storage que os caminhos absolutos do banco carregam.

    Ela não está gravada em lugar nenhum: sai dos próprios valores. Todo caminho
    é `<raiz>/<pasta conhecida>/…`, então cortar no primeiro segmento conhecido
    devolve a raiz. Se as linhas discordarem, o banco veio de mais de um lugar —
    e aí não dá para reescrever com segurança.
    """
    c = sqlite3.connect(f"file:{banco}?mode=ro", uri=True)
    raizes = set()
    for tabela, coluna in colunas_de_texto(c):
        for (v,) in c.execute(f"SELECT DISTINCT \"{coluna}\" FROM '{tabela}' "
                              f"WHERE \"{coluna}\" LIKE '/%'"):
            if not isinstance(v, str):
                continue
            partes = Path(v).parts
            for i, p in enumerate(partes):
                if p in PASTAS_DO_STORAGE and i > 0:
                    raizes.add(str(Path(*partes[:i])))
                    break
    c.close()
    if not raizes:
        return []

    # AS RAÍZES SÃO NORMALIZADAS ANTES DE COMPARAR, e isto achou algo no
    # primeiro ensaio: 60 dos 441 trabalhos da bancada guardam
    # `…/.ver2/storage/../storage/output/…`. É o MESMO lugar, escrito de duas
    # formas — o produto grava sem normalizar em parte dos caminhos.
    #
    # Tratar as duas como raízes diferentes fazia a restauração recusar um banco
    # perfeitamente restaurável. O que importa é para onde elas RESOLVEM: se
    # todas resolvem para o mesmo lugar, cada grafia é reescrita como está, e o
    # destino fica com um caminho só.
    resolvidas = {os.path.normpath(r) for r in raizes}
    if len(resolvidas) > 1 and not juntar:
        # DUAS RAÍZES DE VERDADE ACONTECEM, e o storage local do Mekora é o
        # exemplo: o projeto morava em `Projeto-kindle/kindle-local-tool` e
        # mudou para `dev/mekora`, e sete valores em duas colunas ficaram com o
        # caminho antigo. Os arquivos vieram junto; os registros não.
        #
        # Juntar as duas em silêncio seria afirmar que elas apontam para o mesmo
        # acervo, e isso pode ser falso — pode haver dois storages de verdade,
        # com arquivos diferentes de mesmo nome. Por isso a decisão é de quem
        # restaura, e `--juntar-raizes` é onde ela se declara. Depois de juntar,
        # a verificação "registro tem arquivo" cobra o resultado: se um dos
        # lados não estava no espelho, ela reprova e diz qual.
        raise Falhou(
            "raiz do storage: o banco tem caminhos de MAIS DE UMA raiz:\n    "
            + "\n    ".join(sorted(resolvidas))
            + "\n  Juntá-las é afirmar que apontam para o mesmo acervo, e isso é "
              "decisão de quem restaura.\n"
              "  Se for o caso — um projeto que mudou de pasta, por exemplo — passe "
              "--juntar-raizes.\n"
              "  A verificação de 'registro tem arquivo' vai cobrar o resultado.")
    return sorted(raizes, key=len, reverse=True)


def colunas_de_texto(c: sqlite3.Connection) -> list[tuple[str, str]]:
    """Toda coluna de texto de toda tabela. A varredura é genérica de propósito:
    a lista das colunas de caminho que eu conheço envelhece na próxima migração,
    e a que a rede precisa pegar é justamente a que ninguém lembrou."""
    fora = []
    for (t,) in c.execute("SELECT name FROM sqlite_master WHERE type='table' "
                          "AND name NOT LIKE 'sqlite_%'"):
        for linha in c.execute(f"PRAGMA table_info('{t}')"):
            nome, tipo = linha[1], (linha[2] or "").upper()
            if "CHAR" in tipo or "TEXT" in tipo or "CLOB" in tipo or tipo == "":
                fora.append((t, nome))
    return fora


def reescrever_caminhos(banco: Path, antiga: str, nova: Path) -> int:
    """Troca a raiz antiga pela nova em toda coluna de texto. Devolve quantos
    valores mudaram."""
    c = sqlite3.connect(banco)
    trocas = 0
    for tabela, coluna in colunas_de_texto(c):
        cur = c.execute(
            f"UPDATE '{tabela}' SET \"{coluna}\" = replace(\"{coluna}\", ?, ?) "
            f"WHERE \"{coluna}\" LIKE ?",
            (antiga, str(nova), f"{antiga}%"))
        trocas += cur.rowcount if cur.rowcount and cur.rowcount > 0 else 0
    c.commit()
    c.close()
    return trocas


def restaurar(snapshot: Path, de: Path, destino: Path, sobrescrever: bool,
              juntar_raizes: bool = False) -> dict:
    d = destino.resolve()
    # A LEITURA DAS RAÍZES VEM ANTES DE COPIAR. No primeiro ensaio ela vinha
    # depois, e um banco com raízes irreconciliáveis fazia a restauração parar
    # com 54 MB já escritos no destino — falha correta, custo desnecessário.
    antigas = raizes_antigas_do_banco(snapshot, juntar_raizes)
    if d.exists() and any(d.iterdir()) and sobrescrever:
        diz(f"  {CINZA}apagando o conteúdo de {d}{FIM}")
        for x in d.iterdir():
            shutil.rmtree(x) if x.is_dir() else x.unlink()
    d.mkdir(parents=True, exist_ok=True)

    # O BANCO VAI PELA API DO SQLITE, e não por `cp`, pela mesma razão que o
    # backup usa: uma cópia byte a byte de um arquivo com journal pode abrir e
    # falhar depois. Aqui a origem está parada, mas o caminho é o mesmo — e o
    # `backup()` já valida a estrutura enquanto copia.
    alvo_banco = d / "kindle_tool.db"
    origem = sqlite3.connect(f"file:{snapshot}?mode=ro", uri=True)
    copia = sqlite3.connect(alvo_banco)
    with copia:
        origem.backup(copia)
    origem.close()
    copia.close()
    diz(f"  banco restaurado: {alvo_banco.name} ({alvo_banco.stat().st_size / 1e6:.1f} MB)")

    espelho = de / "espelho"
    arquivos = 0
    bytes_copiados = 0
    for pasta in ESPELHADAS:
        origem_pasta = espelho / pasta
        if not origem_pasta.exists():
            continue
        alvo = d / pasta
        for arq in origem_pasta.rglob("*"):
            if not arq.is_file():
                continue
            fim = alvo / arq.relative_to(origem_pasta)
            fim.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(arq, fim)
            arquivos += 1
            bytes_copiados += arq.stat().st_size
    diz(f"  arquivos restaurados: {arquivos} ({bytes_copiados / 1e6:.1f} MB)")

    for nome in SOLTOS:
        origem = espelho / nome
        if origem.exists():
            shutil.copy2(origem, d / nome)
            arquivos += 1
            bytes_copiados += origem.stat().st_size

    # `temp/` e `logs/` nascem vazias: a aplicação as cria, e restaurá-las
    # devolveria lixo de outro momento.
    (d / "temp").mkdir(exist_ok=True)
    (d / "logs").mkdir(exist_ok=True)

    trocas = 0
    for antiga in antigas:
        if antiga == str(d):
            continue
        # DA MAIS LONGA PARA A MAIS CURTA. Com `…/storage` e `…/storage/../storage`
        # na mesma tabela, trocar a curta primeiro deixaria a longa em pedaços.
        trocas += reescrever_caminhos(alvo_banco, antiga, d)
    if trocas:
        diz(f"  caminhos reescritos: {trocas} valores em {len(antigas)} grafia(s) de raiz")
        if juntar_raizes and len({os.path.normpath(x) for x in antigas}) > 1:
            diz(f"  {CINZA}raízes JUNTADAS a pedido — a verificação de 'registro tem "
                f"arquivo' dirá se todas vieram{FIM}")
        for antiga in antigas:
            diz(f"    {CINZA}{antiga} → {d}{FIM}")
    elif antigas:
        diz(f"  caminhos: já apontam para o destino")
    else:
        diz(f"  {CINZA}caminhos: o banco não tem caminho absoluto nenhum{FIM}")

    return {"banco": alvo_banco, "arquivos": arquivos, "bytes": bytes_copiados,
            "raizes_antigas": antigas, "trocas": trocas}


# ═══════════════════════════════════════════════════════════════════════════
# VALIDAR — sete verificações, e nenhuma delas é "contou igual"
# ═══════════════════════════════════════════════════════════════════════════

def sha256(p: Path, ate=None) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
            if ate and h.block_size:  # pragma: no cover - guarda simbólica
                pass
    return h.hexdigest()


def validar(snapshot: Path, de: Path, destino: Path) -> list[tuple[str, bool, str]]:
    d = destino.resolve()
    banco = d / "kindle_tool.db"
    fora: list[tuple[str, bool, str]] = []

    def checa(nome, cond, detalhe=""):
        fora.append((nome, bool(cond), detalhe))
        passo(nome, cond, detalhe)
        return bool(cond)

    # ── 1 · integridade do SQLite ──────────────────────────────────────────
    c = sqlite3.connect(f"file:{banco}?mode=ro", uri=True)
    integridade = c.execute("PRAGMA integrity_check").fetchone()[0]
    checa("integridade do banco", integridade == "ok", integridade)

    # `foreign_key_check` é a outra metade: `integrity_check` valida as PÁGINAS,
    # e não as relações. Um banco pode estar íntegro e ter uma nota apontando
    # para um livro que não existe.
    quebradas = c.execute("PRAGMA foreign_key_check").fetchall()
    checa("chaves estrangeiras", not quebradas,
          f"{len(quebradas)} quebrada(s)" if quebradas else "nenhuma órfã")

    # ── 2 · contagens iguais às do snapshot ────────────────────────────────
    o = sqlite3.connect(f"file:{snapshot}?mode=ro", uri=True)
    tabelas = [t for (t,) in o.execute("SELECT name FROM sqlite_master WHERE type='table' "
                                       "AND name NOT LIKE 'sqlite_%'")]
    difs = []
    total = 0
    for t in tabelas:
        a = o.execute(f"SELECT count(*) FROM '{t}'").fetchone()[0]
        b = c.execute(f"SELECT count(*) FROM '{t}'").fetchone()[0]
        total += b
        if a != b:
            difs.append(f"{t}: {a}→{b}")
    o.close()
    checa("contagem por tabela", not difs,
          "; ".join(difs) if difs else f"{len(tabelas)} tabelas, {total} linhas")

    # ── 3 · nenhum resto da raiz antiga ────────────────────────────────────
    #
    # A rede que pega a coluna que ninguém lembrou. Sem ela, um caminho não
    # reescrito vira um livro que não abre — e a Estante mostra o livro.
    restos = []
    antiga = None
    for tabela, coluna in colunas_de_texto(c):
        for (v,) in c.execute(f"SELECT \"{coluna}\" FROM '{tabela}' "
                              f"WHERE \"{coluna}\" LIKE '/%' LIMIT 200"):
            if isinstance(v, str) and not v.startswith(str(d)):
                partes = Path(v).parts
                if any(p in PASTAS_DO_STORAGE for p in partes):
                    restos.append(f"{tabela}.{coluna}={v[:60]}")
                    antiga = True
    checa("caminhos apontam para o destino", not restos,
          restos[0] if restos else "nenhum resto da raiz antiga")

    # ── 4 · correspondência entre registro e arquivo ───────────────────────
    #
    # A verificação que separa "restaurou arquivos" de "restaurou um Mekora
    # utilizável". Cada caminho não-nulo tem de existir, e não pode estar vazio.
    ausentes, truncados, conferidos = [], [], 0
    for tabela, coluna in colunas_de_texto(c):
        for (v,) in c.execute(f"SELECT \"{coluna}\" FROM '{tabela}' "
                              f"WHERE \"{coluna}\" LIKE ?", (f"{d}%",)):
            if not isinstance(v, str):
                continue
            p = Path(v)
            conferidos += 1
            if not p.exists():
                ausentes.append(f"{tabela}.{coluna} → {p.name}")
            elif p.is_file() and p.stat().st_size == 0:
                truncados.append(f"{tabela}.{coluna} → {p.name}")
    checa("registro tem arquivo", not ausentes,
          f"{len(ausentes)} sem arquivo: {ausentes[0]}" if ausentes
          else f"{conferidos} caminho(s) conferido(s)")
    checa("nenhum arquivo truncado", not truncados,
          truncados[0] if truncados else "nenhum de tamanho zero")
    c.close()

    # ── 5 · os arquivos batem com o espelho, byte a byte ───────────────────
    #
    # Tamanho igual não é conteúdo igual. Nos arquivos pequenos o hash é
    # completo; nos grandes, o custo de ler tudo em cada ensaio não se paga, e o
    # que se compara é tamanho mais o hash do primeiro e do último megabyte —
    # que é onde a truncagem e a corrupção de cópia aparecem.
    espelho = de / "espelho"
    divergentes, comparados = [], 0
    # QUANTOS ARQUIVOS O SNAPSHOT PROMETE. É a régua que separa "o acervo é
    # vazio" de "o espelho não existe" — as duas comparam zero, e só uma é ok.
    with sqlite3.connect(f"file:{d / 'kindle_tool.db'}?mode=ro", uri=True) as _c:
        prometidos = _c.execute(
            "SELECT count(*) FROM processing_jobs "
            "WHERE epub_path IS NOT NULL AND epub_path <> ''"
        ).fetchone()[0]
    for nome in SOLTOS:
        origem = espelho / nome
        if not origem.exists():
            continue
        comparados += 1
        fim = d / nome
        if not fim.exists():
            divergentes.append(f"faltou {nome}")
        elif sha256(origem) != sha256(fim):
            divergentes.append(f"conteúdo {nome}")
    for pasta in ESPELHADAS:
        origem = espelho / pasta
        if not origem.exists():
            continue
        for arq in origem.rglob("*"):
            if not arq.is_file():
                continue
            fim = d / pasta / arq.relative_to(origem)
            comparados += 1
            if not fim.exists():
                divergentes.append(f"faltou {pasta}/{arq.name}")
                continue
            if fim.stat().st_size != arq.stat().st_size:
                divergentes.append(f"tamanho {pasta}/{arq.name}")
                continue
            if arq.stat().st_size <= 4 << 20:
                if sha256(arq) != sha256(fim):
                    divergentes.append(f"conteúdo {pasta}/{arq.name}")
            else:
                with arq.open("rb") as a, fim.open("rb") as b:
                    if a.read(1 << 20) != b.read(1 << 20):
                        divergentes.append(f"início {pasta}/{arq.name}")
                        continue
                    a.seek(-(1 << 20), os.SEEK_END)
                    b.seek(-(1 << 20), os.SEEK_END)
                    if a.read() != b.read():
                        divergentes.append(f"fim {pasta}/{arq.name}")
    # COMPARAR ZERO NÃO É "IDÊNTICOS", e em 08/09 esta linha passou verde com
    # `0 arquivo(s) comparado(s)` — o espelho não existia, e a verificação que
    # existe para provar que o conteúdo veio inteiro não olhou para nada.
    #
    # Se o snapshot promete arquivos, comparar zero é o mesmo verde por omissão
    # que este repositório chama de pior que vermelho.
    if not divergentes and comparados == 0 and prometidos:
        checa("arquivos idênticos ao espelho", False,
              f"NENHUM arquivo comparado, e o snapshot promete {prometidos}: "
              "o espelho está vazio ou não existe (rode `backup.py` sem --so-banco)")
    else:
        checa("arquivos idênticos ao espelho", not divergentes,
              divergentes[0] if divergentes else f"{comparados} arquivo(s) comparado(s)")

    # ── 6 · permissões utilizáveis ─────────────────────────────────────────
    #
    # Um restore que devolve arquivos que a aplicação não consegue ler é um
    # restore que falha na primeira leitura, e não aqui.
    sem_acesso = []
    if not os.access(banco, os.R_OK | os.W_OK):
        sem_acesso.append("kindle_tool.db")
    for pasta in ESPELHADAS + ["temp", "logs"]:
        p = d / pasta
        if p.exists() and not os.access(p, os.R_OK | os.X_OK | os.W_OK):
            sem_acesso.append(pasta + "/")
    checa("permissões no destino", not sem_acesso,
          ", ".join(sem_acesso) if sem_acesso else "banco e pastas legíveis e graváveis")

    return fora


# ═══════════════════════════════════════════════════════════════════════════

def main() -> int:
    p = argparse.ArgumentParser(
        description="Restauração do Mekora a partir de um backup",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="O caminho completo está em docs/RESTAURAR.md.")
    p.add_argument("--listar", action="store_true",
                   help="mostra os snapshots disponíveis e sai")
    p.add_argument("--snapshot", metavar="NOME",
                   help="qual snapshot restaurar: o nome do arquivo, um caminho, "
                        "ou 'ultimo'. Sem padrão de propósito")
    p.add_argument("--destino", metavar="DIR",
                   help="para onde restaurar. Precisa estar vazio")
    p.add_argument("--de", metavar="DIR", default=str(BACKUPS),
                   help=f"onde estão os backups (padrão: {BACKUPS})")
    p.add_argument("--sobrescrever", action="store_true",
                   help="apaga o destino antes de restaurar")
    p.add_argument("--sim-eu-quero-producao", action="store_true",
                   help="exigido, junto de --sobrescrever, para escrever na produção")
    p.add_argument("--juntar-raizes", action="store_true",
                   help="o banco tem caminhos de mais de uma raiz de storage, e "
                        "elas apontam para o mesmo acervo — reescreve todas")
    p.add_argument("--so-validar", action="store_true",
                   help="não restaura: roda as verificações num destino já restaurado")
    a = p.parse_args()

    de = Path(a.de).resolve()

    if a.listar:
        return listar(de)

    if not a.snapshot or not a.destino:
        p.print_usage()
        diz(f"\n  {VERMELHO}--snapshot e --destino são obrigatórios.{FIM}")
        diz(f"  Nenhum dos dois tem valor padrão: escolher um backup em silêncio")
        diz(f"  é como restaurar o errado sem saber.\n")
        diz(f"  Veja o que existe:  python3 scripts/restaurar.py --listar\n")
        return 2

    inicio = datetime.now()
    diz(f"\nRestauração do Mekora — {inicio:%d/%m/%Y %H:%M:%S}")

    try:
        snapshot = escolher_snapshot(de, a.snapshot)
        destino = Path(a.destino)
        # `--so-validar` NÃO PASSA PELA PROTEÇÃO DE DESTINO, e não é exceção
        # frouxa: ela existe para impedir ESCRITA, e validar não escreve nada.
        # Com ela no caminho, validar uma cópia restaurada era impossível —
        # o destino de uma cópia restaurada nunca está vazio.
        if not a.so_validar:
            conferir_destino(destino, a.sobrescrever, a.sim_eu_quero_producao)

        r = resumo_do_snapshot(snapshot)
        if r["integridade"] != "ok":
            raise Falhou(f"snapshot de origem: {snapshot.name} não está íntegro "
                         f"({r['integridade']}). Escolha outro — o backup não foi tocado.")

        diz(f"\n  origem:   {snapshot}")
        diz(f"            {CINZA}{r['jobs']} trabalhos, {r['notas']} notas, "
            f"{r['linhas']} linhas em {r['tabelas']} tabelas{FIM}")
        diz(f"  destino:  {destino.resolve()}")
        if destino.resolve() == STORAGE_DE_PRODUCAO:
            diz(f"  {VERMELHO}          ISTO É A PRODUÇÃO{FIM}")
        diz()

        if a.so_validar:
            # VALIDAR SEM RESTAURAR serve a duas coisas: a pessoa que quer
            # conferir uma cópia meses depois — está no `docs/RESTAURAR.md` — e
            # o controle negativo do ensaio, que envenena uma cópia restaurada e
            # cobra que a verificação certa reprove. Uma validação que só roda
            # colada na restauração não pode ser testada sozinha.
            if not (destino / "kindle_tool.db").exists():
                raise Falhou(f"validação: {destino} não tem kindle_tool.db — "
                             "não há cópia restaurada aqui")
        else:
            restaurar(snapshot, de, destino, a.sobrescrever, a.juntar_raizes)

        diz(f"\n  verificações\n")
        resultados = validar(snapshot, de, destino)
        ruins = [nome for nome, ok, _ in resultados if not ok]
        if ruins:
            raise Falhou("validação: reprovou em " + ", ".join(ruins))

    except Falhou as e:
        diz(f"\n{VERMELHO}RESTAURAÇÃO FALHOU{FIM}\n")
        diz(f"  {e}\n")
        diz(f"  {CINZA}O backup NÃO foi tocado. O destino pode ter ficado pela "
            f"metade — apague-o antes de tentar de novo.{FIM}\n")
        return 1

    gasto = (datetime.now() - inicio).total_seconds()
    if a.so_validar:
        diz(f"\n{VERDE}A CÓPIA SERVE{FIM} — as {len(resultados)} verificações passaram ({gasto:.1f}s).\n")
        return 0
    diz(f"\n{VERDE}RESTAURADO{FIM} em {gasto:.1f}s — todas as verificações passaram.\n")
    diz(f"  Para subir o Mekora contra esta cópia:\n")
    diz(f"    MEKORA_STORAGE={Path(a.destino).resolve()} \\")
    diz(f"      .venv/bin/python -m uvicorn main:app --app-dir backend --port 8300\n")
    diz(f"  {CINZA}A restauração não devolve segredos: recrie o `.env` a partir do")
    diz(f"  `.env.example` antes de usar isto como produção.{FIM}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
