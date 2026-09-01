#!/usr/bin/env bash
# Mede uma tela que exige sessão.
#
#     scripts/portao-logado.sh /estante [--escuro]
#
# O portão mede a PÁGINA SERVIDA, num Chrome sem sessão nenhuma. Numa tela
# protegida ele era redirecionado para /entrar e media essa — devolvendo verde
# para uma tela que nem tinha aberto. Verde por omissão, que este repositório já
# pagou três vezes.
#
# A saída é entrar pelo próprio caminho da pessoa: pedir um link, e navegar até
# ele. O backend valida e redireciona para dentro, e o Chrome chega na tela
# certa com a sessão certa.
#
# UM LINK POR MEDIDA, e não é desperdício: o link serve uma vez só, então medir
# claro e escuro com o mesmo faz a segunda cair em /entrar. Descoberto assim.
set -euo pipefail

TELA="${1:-/estante}"
TEMA="${2:-}"
BASE="${MEKORA_WEB:-http://localhost:5180}"
LOG="${MEKORA_LOG:?defina MEKORA_LOG com o caminho do log do servidor}"
EMAIL="${MEKORA_EMAIL:-portao@teste.local}"

curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" -o /dev/null "$BASE/entrar/pedir"
sleep 1

TOKEN=$(grep -oE "/entrar/[A-Za-z0-9_-]{20,}" "$LOG" | tail -1 | sed 's|/entrar/||')
if [ -z "$TOKEN" ]; then
  echo "nenhum link no log. Sem SMTP o servidor imprime o link ali; com SMTP, ele vai por e-mail." >&2
  exit 1
fi

# Entra pelo link e NAVEGA até a tela pedida.
#
# O `--depois=` faz a segunda navegação. Até 01/09 esta linha não passava nada: o
# comentário aqui descrevia uma flag `--tela` que NUNCA EXISTIU no medir.mjs, e o
# script media o destino do redirecionamento de /entrar/<token> — a Estante —
# fosse qual fosse o argumento. Oito telas passaram meses "medidas" assim.
#
# LARGURA e ALTURA por ambiente, porque o C9 mede as mesmas telas a 390.
node scripts/medir.mjs "$BASE/entrar/$TOKEN" "${LARGURA:-1440}" "${ALTURA:-1100}" \
  scripts/portao.js $TEMA --depois="$BASE$TELA"
