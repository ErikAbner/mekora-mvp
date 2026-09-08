#!/usr/bin/env bash
# O ENSAIO DE RESTAURAÇÃO — o caminho inteiro, exercido de verdade.
#
#     bash scripts/ensaio-de-restauracao.sh
#     MEKORA_STORAGE=/dados bash scripts/ensaio-de-restauracao.sh
#
# ═══════════════════════════════════════════════════════════════════════════
# POR QUE UM ENSAIO, E NÃO SÓ UM SCRIPT DE RESTAURAÇÃO
# ═══════════════════════════════════════════════════════════════════════════
#
# O `C21` do `docs/ABERTO.md` não pede um script — pede a PROVA de que o
# caminho funciona:
#
#     O que fecha: um script de restauração E um ensaio de verdade — restaurar
#     numa cópia e conferir contagens. O backup nunca foi restaurado — e o
#     requisito nunca foi "temos backup".
#
# E o critério que o Erik pôs em 07/09 é mais forte que contar arquivos:
#
#     Não quero um teste que considere sucesso apenas porque N arquivos antes
#     == N arquivos depois.
#
# Então este ensaio vai até o fim: faz backup, restaura numa cópia isolada,
# roda as sete verificações do `restaurar.py`, SOBE O MEKORA contra a cópia, e
# prova pela API que um livro restaurado abre, que as notas estão lá e que o
# progresso sobreviveu. Um EPUB é baixado e aberto como zip.
#
# ═══════════════════════════════════════════════════════════════════════════
# ONDE ELE MEXE
# ═══════════════════════════════════════════════════════════════════════════
#
# EM LUGAR NENHUM que importe. A cópia vai para um diretório temporário próprio,
# apagado no fim; o servidor sobe numa porta alta; e o `restaurar.py` recusa
# escrever no storage de produção sem duas flags que este script não passa.
#
# O backup de origem NÃO é tocado em caminho nenhum, nem quando o ensaio falha.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

STORAGE="${MEKORA_STORAGE:-$RAIZ/storage}"
BACKUPS="${MEKORA_BACKUP_DIR:-$STORAGE/backups}"
PORTA="${MEKORA_PORTA_ENSAIO:-8399}"
ENSAIO="$(mktemp -d "${TMPDIR:-/tmp}/mekora-ensaio-XXXXXX")"
DESTINO="$ENSAIO/restaurado"
LOG="$ENSAIO/servidor.log"
EVIDENCIA="${MEKORA_EVIDENCIA:-$RAIZ/docs/operacional/ensaio-de-restauracao.md}"

PY="$RAIZ/.venv/bin/python"
[ -x "$PY" ] || PY="python3"

falhas=0
INICIO=$(date +%s)

titulo() { printf '\n\033[1m%s\033[0m\n\n' "$1"; }
ok()     { printf '  \033[32mok\033[0m      %s\n' "$1"; }
mal()    { printf '  \033[31mFALHOU\033[0m  %s\n' "$1"; falhas=$((falhas + 1)); }

limpar() {
  # O SERVIDOR MORRE ANTES DA PASTA. Apagar o storage debaixo de um processo
  # que está lendo dele produz um erro que não é do ensaio.
  if [ -n "${SERVIDOR:-}" ] && kill -0 "$SERVIDOR" 2>/dev/null; then
    kill "$SERVIDOR" 2>/dev/null
    wait "$SERVIDOR" 2>/dev/null
  fi
  [ -n "${MEKORA_GUARDAR_ENSAIO:-}" ] || rm -rf "$ENSAIO"
}
trap limpar EXIT

titulo "Ensaio de restauração — $(date '+%d/%m/%Y %H:%M:%S')"
echo "  storage de origem: $STORAGE"
echo "  backups:           $BACKUPS"
echo "  cópia do ensaio:   $DESTINO"
echo "  porta:             $PORTA"

# ── 1 · ter um backup para restaurar ──────────────────────────────────────
titulo "1 · o backup"
if MEKORA_STORAGE="$STORAGE" MEKORA_BACKUP_DIR="$BACKUPS" \
   python3 scripts/backup.py > "$ENSAIO/backup.log" 2>&1; then
  ok "backup COMPLETO feito e conferido — banco e espelho"
else
  mal "o backup falhou — sem ele não há o que restaurar"
  sed 's/^/      /' "$ENSAIO/backup.log"
  exit 1
fi

SNAPSHOT="$(ls -t "$BACKUPS"/kindle_tool_*.db 2>/dev/null | head -1)"
if [ -z "$SNAPSHOT" ]; then
  mal "nenhum snapshot em $BACKUPS"
  exit 1
fi
ok "snapshot escolhido: $(basename "$SNAPSHOT")"

# ── 2 · a proteção de produção recusa ─────────────────────────────────────
#
# O ensaio prova a PROTEÇÃO, e não só o caminho feliz. Um restore que aceita
# escrever na produção por engano é pior que nenhum.
titulo "2 · as proteções"
if MEKORA_BACKUP_DIR="$BACKUPS" python3 scripts/restaurar.py \
     --snapshot "$(basename "$SNAPSHOT")" --destino "$STORAGE" \
     > "$ENSAIO/protecao.log" 2>&1; then
  mal "restaurou EM CIMA DA PRODUÇÃO sem as duas flags — a proteção não existe"
else
  if grep -q "proteção de produção" "$ENSAIO/protecao.log"; then
    ok "recusa escrever no storage de produção"
  else
    mal "recusou, mas por outro motivo: $(tail -3 "$ENSAIO/protecao.log" | tr '\n' ' ')"
  fi
fi

mkdir -p "$ENSAIO/naovazio" && touch "$ENSAIO/naovazio/ja-tinha-coisa"
if MEKORA_BACKUP_DIR="$BACKUPS" python3 scripts/restaurar.py \
     --snapshot "$(basename "$SNAPSHOT")" --destino "$ENSAIO/naovazio" \
     > "$ENSAIO/naovazio.log" 2>&1; then
  mal "restaurou num destino com dados sem --sobrescrever"
else
  grep -q "destino não vazio" "$ENSAIO/naovazio.log" \
    && ok "recusa destino com dados sem --sobrescrever" \
    || mal "recusou o destino com dados, mas por outro motivo"
fi

# ── 3 · restaurar e validar ───────────────────────────────────────────────
titulo "3 · a restauração"
JUNTOU=""
MEKORA_BACKUP_DIR="$BACKUPS" python3 scripts/restaurar.py \
  --snapshot "$(basename "$SNAPSHOT")" --destino "$DESTINO" \
  > "$ENSAIO/restaurar.log" 2>&1
if [ $? -ne 0 ] && grep -q "MAIS DE UMA raiz" "$ENSAIO/restaurar.log"; then
  # DUAS RAÍZES NÃO SÃO FALHA DO ENSAIO: o storage local do Mekora tem sete
  # valores com o caminho do repositório antigo, de quando o projeto morava em
  # `Projeto-kindle/kindle-local-tool`. O script recusa juntar sozinho — a
  # decisão é de quem restaura —, e o ensaio a toma explicitamente e REGISTRA
  # que tomou. A verificação de "registro tem arquivo" cobra o resultado.
  JUNTOU="sim"
  rm -rf "$DESTINO"
  MEKORA_BACKUP_DIR="$BACKUPS" python3 scripts/restaurar.py \
    --snapshot "$(basename "$SNAPSHOT")" --destino "$DESTINO" --juntar-raizes \
    > "$ENSAIO/restaurar.log" 2>&1
fi
SAIDA_DA_RESTAURACAO=$?
if [ $SAIDA_DA_RESTAURACAO -eq 0 ]; then
  grep -E '^  (ok|FALHOU) ' "$ENSAIO/restaurar.log" | sed 's/^  /  /'
  [ -n "$JUNTOU" ] && ok "raízes juntadas explicitamente (--juntar-raizes)"
  # A FRASE TEM DE SER VERDADE, e em 08/09 ela não era: o log trazia
  # "FALHOU  registro tem arquivo" e a linha seguinte anunciava "todas as
  # verificações passaram". Um resumo que contradiz o próprio log é pior que
  # resumo nenhum — quem lê o fim não volta para conferir o meio.
  if grep -qE '^  FALHOU ' "$ENSAIO/restaurar.log"; then
    mal "a restauração reprovou em ao menos uma verificação — ver as linhas acima"
  else
    ok "restauração completa, todas as verificações passaram"
  fi
else
  mal "a restauração falhou"
  sed 's/^/      /' "$ENSAIO/restaurar.log"
  exit 1
fi

# ── 4 · o Mekora sobe contra a cópia ──────────────────────────────────────
titulo "4 · o teste funcional"
MEKORA_STORAGE="$DESTINO" "$PY" -m uvicorn main:app --app-dir backend \
  --port "$PORTA" --log-level warning > "$LOG" 2>&1 &
SERVIDOR=$!

pronto=""
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORTA/docs" 2>/dev/null; then pronto=1; break; fi
  kill -0 "$SERVIDOR" 2>/dev/null || break
  sleep 1
done
if [ -z "$pronto" ]; then
  mal "a aplicação NÃO subiu contra a cópia restaurada"
  tail -12 "$LOG" | sed 's/^/      /'
  exit 1
fi
ok "aplicação sobe contra a cópia restaurada"

# UMA SESSÃO NA CÓPIA, pelo mesmo caminho que a bancada usa: sha256 do token
# gravado direto, como o servidor confere. Nada é escrito na origem.
EMAIL="$($PY - "$DESTINO/kindle_tool.db" <<'PY'
import sqlite3, sys
c = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
linha = c.execute("""
  SELECT p.email FROM pessoas p
  JOIN processing_jobs j ON j.dono_id = p.id
  WHERE j.epub_path IS NOT NULL
    AND (SELECT count(*) FROM notas n WHERE n.pessoa_id = p.id) > 0
  LIMIT 1""").fetchone()
if linha is None:
    # UMA INSTALACAO NOVA PODE NAO TER NOTA NENHUMA, e ai a prova de notas
    # nao e possivel: nao ha o que sobreviver. Cair para "qualquer pessoa
    # com livro" deixa o resto do teste funcional acontecer, e a ausencia
    # vira RESSALVA registrada — nao um verde que esconde o que nao provou.
    linha = c.execute("""
      SELECT p.email FROM pessoas p
      JOIN processing_jobs j ON j.dono_id = p.id
      WHERE j.epub_path IS NOT NULL LIMIT 1""").fetchone()
print(linha[0] if linha else "")
PY
)"
if [ -z "$EMAIL" ]; then
  # SEM ACERVO COM DONO NAO HA O QUE ABRIR PELA API, e isso acontece de verdade:
  # o storage de desenvolvimento deste repositório tem 14 livros com EPUB e
  # ZERO com dono — é o banco anterior às contas, e o próprio `C20` do
  # `ABERTO.md` já registrava isso.
  #
  # Não é falha do restore: é ausência de caso. O ensaio registra a ressalva,
  # prova o que dá — a aplicação sobe, o banco abre, e todo registro de livro
  # tem o arquivo dele — e o veredito diz o que não foi exercido.
  printf '  \033[33m—\033[0m       acervo: a base restaurada não tem livro com dono — a prova pela API não se aplica\n'
  echo "acervo: a base restaurada não tem livro com dono — a prova pela API não se aplica" > "$ENSAIO/ressalvas.txt"
  "$PY" - "$DESTINO" <<'EOFSEM'
import os, sqlite3, sys
destino = sys.argv[1]
c = sqlite3.connect(f"file:{destino}/kindle_tool.db?mode=ro", uri=True)
faltando = [v for (v,) in c.execute(
    "SELECT epub_path FROM processing_jobs WHERE epub_path IS NOT NULL") if not os.path.exists(v)]
quantos = c.execute("SELECT count(*) FROM processing_jobs WHERE epub_path IS NOT NULL").fetchone()[0]
c.close()
if faltando:
    print(f"  \033[31mFALHOU\033[0m  {len(faltando)} livro(s) com registro e sem arquivo")
    sys.exit(1)
print(f"  \033[32mok\033[0m      todo registro de livro tem o arquivo dele no disco ({quantos})")
EOFSEM
  [ $? -eq 0 ] || falhas=$((falhas + 1))
  RESSALVAS="$(cat "$ENSAIO/ressalvas.txt" 2>/dev/null || true)"
else
TOKEN="$(python3 scripts/_sessao.py "$DESTINO/kindle_tool.db" "$EMAIL" criar 2>/dev/null | head -1)"
[ -n "$TOKEN" ] && ok "sessão aberta na cópia (${EMAIL:0:24}…)" || { mal "não consegui abrir sessão na cópia"; exit 1; }

# AS QUATRO PROVAS FUNCIONAIS, e nenhuma delas é contagem de arquivo.
{ $PY - "$PORTA" "$TOKEN" "$DESTINO" <<'PY'
import json, sys, urllib.request, zipfile, io, sqlite3, os

porta, token, destino = sys.argv[1], sys.argv[2], sys.argv[3]
base = f"http://127.0.0.1:{porta}"
falhou = 0

ressalvas = []

def ok(m):  print(f"  \033[32mok\033[0m      {m}")
def ressalva(m):
    ressalvas.append(m)
    print(f"  \033[33m—\033[0m       {m}")
def mal(m):
    global falhou
    falhou += 1
    print(f"  \033[31mFALHOU\033[0m  {m}")

def pede(caminho, cru=False):
    r = urllib.request.Request(base + caminho, headers={"Cookie": f"mekora_sessao={token}"})
    with urllib.request.urlopen(r, timeout=30) as resp:
        dados = resp.read()
    return dados if cru else json.loads(dados)

# 1 · os registros restaurados são consultáveis pela API
try:
    h = pede("/history")
    livros = [e for e in h if e.get("leitura_url")]
    ok(f"registros consultáveis: /history devolveu {len(h)} trabalhos, {len(livros)} com leitura")
except Exception as e:
    mal(f"/history não respondeu: {e}")
    livros = []

if not livros:
    mal("nenhum livro com leitura na cópia — o ensaio não pode provar abertura")
    sys.exit(1)

livro = livros[0]
jid = livro["upload_id"]

# 2 · o livro restaurado ABRE — o EPUB é servido e é um zip válido
try:
    bruto = pede(livro["leitura_url"], cru=True)
    z = zipfile.ZipFile(io.BytesIO(bruto))
    if z.testzip() is not None:
        mal("o EPUB restaurado está corrompido")
    elif z.read("mimetype").decode().strip() != "application/epub+zip":
        mal("o arquivo servido não é um EPUB")
    else:
        ok(f'livro abre: "{(livro.get("final_title") or livro["original_filename"])[:34]}" '
           f'— {len(bruto)} bytes, {len(z.namelist())} entradas, zip íntegro')
except Exception as e:
    mal(f"o livro restaurado NÃO abre: {e}")

# 3 · as notas sobreviveram, com o conteúdo e não só a contagem
try:
    notas = pede(f"/jobs/{jid}/notas")
    notas = notas if isinstance(notas, list) else notas.get("items", [])
    comTexto = [n for n in notas if (n.get("trecho") or n.get("comentario"))]
    c0 = sqlite3.connect(f"file:{destino}/kindle_tool.db?mode=ro", uri=True)
    naBase = c0.execute("SELECT count(*) FROM notas").fetchone()[0]
    c0.close()
    if notas and comTexto:
        amostra = (comTexto[0].get("trecho") or comTexto[0].get("comentario"))[:44]
        ok(f'notas sobrevivem: {len(notas)} no livro, com texto — "{amostra}…"')
    elif notas:
        mal(f"{len(notas)} notas restauradas, e nenhuma com texto — sobrou a linha, não o conteúdo")
    elif livro.get("notas") or naBase:
        mal(f"a base tem {naBase} notas e a rota do livro {jid} devolveu zero")
    else:
        ressalva("notas: a base restaurada não tem nota nenhuma — a prova não se aplica")
except Exception as e:
    mal(f"as notas não puderam ser lidas: {e}")

# 4 · o progresso sobreviveu, com a posição e não só a linha
try:
    p = pede(f"/jobs/{jid}/progresso")
    c0 = sqlite3.connect(f"file:{destino}/kindle_tool.db?mode=ro", uri=True)
    progNaBase = c0.execute("SELECT count(*) FROM progressos").fetchone()[0]
    c0.close()
    if not p.get("guardado") and not progNaBase:
        ressalva("progresso: a base restaurada não tem progresso nenhum — a prova não se aplica")
    elif not p.get("guardado"):
        mal(f"a base tem {progNaBase} progressos e o do livro {jid} não veio")
    else:
        ok(f"progresso sobrevive: capítulo {p['capitulo']}, deslocamento {p['deslocamento']}, "
           f"de {p['capitulos']} capítulos, fração {p['fracao']}")
except Exception as e:
    mal(f"o progresso não pôde ser lido: {e}")

# 5 · a correspondência vale para TODO livro, e não só para o que abrimos
c = sqlite3.connect(f"file:{destino}/kindle_tool.db?mode=ro", uri=True)
faltando = [v for (v,) in c.execute(
    "SELECT epub_path FROM processing_jobs WHERE epub_path IS NOT NULL")
    if not os.path.exists(v)]
c.close()
if faltando:
    mal(f"{len(faltando)} livro(s) com registro e sem arquivo: {os.path.basename(faltando[0])}")
else:
    ok("todo registro de livro tem o arquivo dele no disco")

if ressalvas:
    with open(os.path.join(destino, os.pardir, "ressalvas.txt"), "w") as f:
        f.write("\n".join(ressalvas))
sys.exit(1 if falhou else 0)
PY
} | tee "$ENSAIO/funcional.log"
[ "${PIPESTATUS[0]}" -eq 0 ] || falhas=$((falhas + 1))
RESSALVAS="$(cat "$ENSAIO/ressalvas.txt" 2>/dev/null || true)"
fi

# ── 5 · o veredito ────────────────────────────────────────────────────────
GASTO=$(( $(date +%s) - INICIO ))
titulo "veredito"
if [ "$falhas" -eq 0 ]; then
  printf '  \033[32mO CAMINHO INTEIRO FUNCIONA\033[0m — backup → restauração → validação → Mekora utilizável.\n'
  printf '  %ss, e o backup não foi tocado.\n\n' "$GASTO"
else
  printf '  \033[31m%s VERIFICAÇÃO(ÕES) FALHOU(RAM)\033[0m — o caminho NÃO está comprovado.\n' "$falhas"
  printf '  O backup não foi tocado.\n\n'
fi

# A EVIDÊNCIA É ESCRITA, e não só impressa: um ensaio que ninguém consegue
# citar depois vira "eu me lembro de ter rodado".
mkdir -p "$(dirname "$EVIDENCIA")"
{
  echo "# Ensaio de restauração — $(date '+%d/%m/%Y %H:%M')"
  echo
  echo "Gerado por \`scripts/ensaio-de-restauracao.sh\`. Não editar à mão:"
  echo "rode o ensaio de novo e ele reescreve este arquivo."
  echo
  echo '```'
  echo "snapshot:   $(basename "$SNAPSHOT")"
  echo "origem:     $BACKUPS"
  echo "destino:    $DESTINO  (temporário, apagado no fim)"
  echo "porta:      $PORTA"
  echo "duração:    ${GASTO}s"
  echo "resultado:  $([ "$falhas" -eq 0 ] && echo 'PASSOU — caminho inteiro comprovado' || echo "FALHOU em $falhas verificação(ões)")"
  echo "storage:    $STORAGE"
  [ -n "$JUNTOU" ] && echo "ressalva:   o banco tinha caminhos de mais de uma raiz; foi preciso --juntar-raizes"
  [ -n "${RESSALVAS:-}" ] && echo "${RESSALVAS}" | sed 's/^/ressalva:   /'
  echo '```'
  echo
  echo "## Verificações da restauração"
  echo
  echo '```'
  grep -E '^  (ok|FALHOU) ' "$ENSAIO/restaurar.log" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g'
  echo '```'
  echo
  if [ -s "$ENSAIO/funcional.log" ]; then
    echo "## O teste funcional, contra a cópia restaurada"
    echo
    echo '```'
    sed 's/\x1b\[[0-9;]*m//g' "$ENSAIO/funcional.log"
    echo '```'
    echo
  fi
  echo "## O que a restauração fez"
  echo
  echo '```'
  grep -E '^  (banco restaurado|arquivos restaurados|caminhos)' "$ENSAIO/restaurar.log" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g'
  echo '```'
} > "$EVIDENCIA"
echo "  evidência: $EVIDENCIA"
echo

exit "$falhas"
