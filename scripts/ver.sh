#!/usr/bin/env bash
# Sobe o Mekora com uma conta pronta, dados semeados e um link de entrada.
#
# POR QUE ISTO EXISTE: o Erik ainda nao tinha visto nada do que foi construido.
# Entrar exige um link por e-mail, o e-mail nao esta configurado em
# desenvolvimento, e o link vive quinze minutos e serve uma vez — entao "ve no
# localhost" nao era um convite, era uma tarefa.
#
# Aqui ele roda um comando e recebe uma URL que abre o produto ja dentro, com
# estante cheia. Se o link vencer, roda de novo.
#
#   uso:  scripts/ver.sh          sobe tudo e imprime o link
#         scripts/ver.sh --link   so um link novo, com o servidor ja no ar
set -euo pipefail
cd "$(dirname "$0")/.."

WEB="${MEKORA_WEB:-http://localhost:5180}"
API="${MEKORA_API:-http://localhost:8199}"
RAIZ="${MEKORA_PROVA:-$PWD/.ver}"
LOG="$RAIZ/servidor.log"
EMAIL="${MEKORA_EMAIL:-erik@mekora.local}"

if [ "${1:-}" != "--link" ]; then
  echo "▸ subindo o backend e o web…"
  MEKORA_PROVA="$RAIZ" bash scripts/prova.sh >/dev/null 2>&1 &
  for _ in $(seq 40); do
    sleep 1
    curl -s -o /dev/null "$API/health" && break || true
  done
  curl -s -o /dev/null "$API/health" || { echo "o backend não subiu — veja $LOG" >&2; exit 1; }
  echo "  no ar."
fi

# A conta. O mesmo e-mail sempre, para o acervo semeado continuar sendo dele.
curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\"}" -o /dev/null "$API/entrar/pedir"
CHAVE=""
for _ in $(seq 24); do
  sleep 0.5
  CHAVE=$(grep -A3 "$EMAIL" "$LOG" 2>/dev/null | grep -oE "/entrar/[A-Za-z0-9_-]{20,}" | tail -1 | sed 's|/entrar/||' || true)
  [ -n "$CHAVE" ] && break
done
[ -n "$CHAVE" ] || { echo "não saiu link para $EMAIL. O limite é de 5 pedidos a cada 10 minutos." >&2; exit 1; }

if [ "${1:-}" != "--link" ]; then
  echo "▸ semeando o acervo…"
  MEKORA_PROVA="$RAIZ" MEKORA_EMAIL="$EMAIL" python3 scripts/semear.py || true
fi

cat <<FIM

  ┌─────────────────────────────────────────────────────────────────
  │  Abra este endereço no navegador — ele entra na conta e leva
  │  direto para a Estante:
  │
  │  $WEB/entrar/$CHAVE
  │
  │  Vale 15 minutos e serve uma vez. Para outro:  scripts/ver.sh --link
  └─────────────────────────────────────────────────────────────────

  As telas, todas alcançáveis pelo menu depois de entrar:

    $WEB/                      Apresentação — a primeira tela
    $WEB/mesa                  Mesa
    $WEB/estante               Estante  (o alternador Capas / Estante em 3D)
    $WEB/canvas                Canvas
    $WEB/estudos               Estudos
    $WEB/notas                 Notas
    $WEB/ajuda                 Ajuda
    $WEB/atualizacoes          Atualizações
    $WEB/conta                 Conta — visão geral
    $WEB/conta/kindle          Dispositivos Kindle
    $WEB/conta/seguranca       Segurança — as sessões
    $WEB/conta/preferencias    Preferências  (o tema claro/escuro fica aqui)
    $WEB/conta/privacidade     Privacidade

  Para parar tudo:  bash scripts/prova.sh parar

FIM
