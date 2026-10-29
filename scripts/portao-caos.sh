#!/usr/bin/env bash
# Prepara um acervo extremo isolado e executa o portão de caos inteiro.
set -euo pipefail
cd "$(dirname "$0")/.."

PROVA_CAOS="${MEKORA_PROVA_CAOS:-$(mktemp -d "${TMPDIR:-/tmp}/mekora-caos.XXXXXX")}"
PORTA_API="${MEKORA_PORTA_API_CAOS:-$((22000 + $$ % 1000))}"
PORTA_WEB="${MEKORA_PORTA_WEB_CAOS:-$((23000 + $$ % 1000))}"
EMAIL_CAOS="caos-$$@teste.local"
PY_="$PWD/.venv/bin/python"
[ -x "$PY_" ] || PY_="$(command -v python3)"

parar() {
  MEKORA_PROVA="$PROVA_CAOS" MEKORA_PORTA_API="$PORTA_API" MEKORA_PORTA_WEB="$PORTA_WEB" \
    scripts/prova.sh parar >/dev/null 2>&1 || true
}
trap parar EXIT INT TERM

echo "── preparando bancada isolada em $PROVA_CAOS"
MEKORA_PROVA="$PROVA_CAOS" MEKORA_PORTA_API="$PORTA_API" MEKORA_PORTA_WEB="$PORTA_WEB" \
  MEKORA_EMAIL="$EMAIL_CAOS" scripts/prova.sh

SESSAO_SAIDA="$(MEKORA_PROVA="$PROVA_CAOS" MEKORA_EMAIL="$EMAIL_CAOS" scripts/sessao-de-prova.sh)"
SESSAO="$(printf '%s\n' "$SESSAO_SAIDA" | sed -n '1p')"
LIVRO_LEITURA="$(printf '%s\n' "$SESSAO_SAIDA" | sed -n '2p')"
[ -n "$SESSAO" ] || { echo "não foi possível criar a sessão de caos" >&2; exit 1; }
[ -n "$LIVRO_LEITURA" ] || { echo "não foi possível criar o livro real da prova de leitura" >&2; exit 1; }

"$PY_" scripts/bancada/semear-pior-caso.py \
  "$PROVA_CAOS/storage/kindle_tool.db" --email "$EMAIL_CAOS"

read -r LIVRO_EXTREMO ESTUDO_EXTREMO < <(
  "$PY_" - "$PROVA_CAOS/storage/kindle_tool.db" "$EMAIL_CAOS" <<'PY'
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
pessoa = db.execute("SELECT id FROM pessoas WHERE email = ?", (sys.argv[2],)).fetchone()[0]
livro = db.execute("SELECT id FROM processing_jobs WHERE dono_id = ? AND token_publico LIKE 'pior-caso-%-livro-0000'", (pessoa,)).fetchone()[0]
estudo = db.execute("SELECT id FROM estudos WHERE pessoa_id = ? AND nome LIKE '000 —%' ORDER BY id LIMIT 1", (pessoa,)).fetchone()[0]
print(livro, estudo)
PY
)

MEKORA_WEB="http://localhost:$PORTA_WEB" \
MEKORA_SESSAO="$SESSAO" \
MEKORA_LIVRO_EXTREMO="$LIVRO_EXTREMO" \
MEKORA_ESTUDO_EXTREMO="$ESTUDO_EXTREMO" \
  node scripts/portao-caos.mjs

node scripts/medir.mjs "http://localhost:$PORTA_WEB/mesa" 1440 1000 \
  scripts/medidas/atividade-global.js --sessao="$SESSAO" --espera=500 \
  | node scripts/portao-atividade.mjs

node scripts/medir.mjs "http://localhost:$PORTA_WEB/leitura/$LIVRO_LEITURA" 1440 1000 \
  scripts/medidas/leitura-controles.js --sessao="$SESSAO" --espera=1800 \
  | node scripts/portao-leitura.mjs

echo "Bancada preservada em $PROVA_CAOS para inspeção."
