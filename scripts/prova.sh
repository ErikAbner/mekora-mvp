#!/usr/bin/env bash
# Sobe os dois servidores de prova, LIMPOS.
#
#     scripts/prova.sh            # sobe
#     scripts/prova.sh parar      # derruba
#
# POR QUE ISTO EXISTE
# ===================
# Subir à mão deixou processos pendurados três vezes: `npx vite` não morre com
# `pkill -f vite`, e dois servidores na mesma porta fazem o segundo servir uma
# versão antiga do código. Isso produz o pior tipo de confusão — o navegador vê
# uma coisa, o `curl` vê outra, e nenhum dos dois está errado.
#
# Matar POR PORTA e não por nome é a diferença: o nome do processo varia, a
# porta não.
#
# O backend roda com storage e banco no scratchpad, e SEM SMTP: o `.env` real
# tem credenciais, e um servidor de prova que as carrega manda e-mail de
# verdade em cada teste de link. Já aconteceu.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROVA="${MEKORA_PROVA:-/tmp/mekora-prova}"

# AS PORTAS SAO ESCOLHIVEIS, e isto conserta uma briga entre sessoes.
#
# Elas eram cravadas em 8199 e 5180, e o `parar()` abaixo MATA o que estiver
# nelas antes de subir. Com duas sessoes de trabalho na mesma maquina — o que
# aconteceu o dia 04/09 inteiro —, cada `prova.sh` derrubava a bancada da outra
# POR DESENHO. Tres quedas numa tarde, e cada uma custava a medida que estava a
# correr.
#
# Os valores continuam os mesmos por omissao, entao nada muda para quem ja usa.
# Quem quiser uma segunda bancada muda as duas:
#
#     MEKORA_PORTA_API=8200 MEKORA_PORTA_WEB=5181 bash scripts/prova.sh
#
# E as medidas dessa bancada apontam para a porta dela:
#
#     MEKORA_WEB=http://localhost:5181 node scripts/provas.mjs --provar
PORTA_API="${MEKORA_PORTA_API:-8199}"
PORTA_WEB="${MEKORA_PORTA_WEB:-5180}"

parar() {
  # So as portas DESTA bancada. Matar por porta e nao por nome ja era a regra;
  # matar so as suas e a metade que faltava.
  for porta in "$PORTA_API" "$PORTA_WEB"; do
    lsof -ti:"$porta" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  done
  sleep 1
}

parar
[ "${1:-}" = "parar" ] && { echo "servidores parados."; exit 0; }

mkdir -p "$PROVA/storage"

(
  cd "$PROVA"
  # `DONO_EMAIL` e a conta que o `ver.sh` cria: na prova local, quem olha e o
  # dono. Sem isso, `/conta/preferencias` responde 403 aqui e passa na producao,
  # que e a pior forma de diferenca entre os dois.
  MEKORA_STORAGE="$PROVA/storage" SMTP_HOST="" SMTP_USER="" SMTP_PASS="" KINDLE_EMAIL="" \
    DONO_EMAIL="${MEKORA_EMAIL:-erik@mekora.local}" \
    "$RAIZ/.venv/bin/python" -c "
import sys; sys.path.insert(0, '$RAIZ/backend')
import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=$PORTA_API, log_level='warning')
" > "$PROVA/servidor.log" 2>&1 &
)

( cd "$RAIZ/web" && MEKORA_API=http://127.0.0.1:$PORTA_API npx vite --port "$PORTA_WEB" > "$PROVA/web.log" 2>&1 & )

for _ in $(seq 1 30); do
  sleep 1
  if curl -sf -o /dev/null "http://localhost:$PORTA_WEB/health" 2>/dev/null; then
    echo "no ar: http://localhost:$PORTA_WEB  (log: $PROVA)"
    echo "  backend $(lsof -ti:"$PORTA_API" | wc -l | tr -d ' ') processo, web $(lsof -ti:"$PORTA_WEB" | wc -l | tr -d ' ')"
    exit 0
  fi
done

echo "não subiu. Últimas linhas do servidor:" >&2
tail -5 "$PROVA/servidor.log" >&2
exit 1
