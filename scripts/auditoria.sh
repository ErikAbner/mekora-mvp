#!/usr/bin/env bash
# Passa o portao e o transbordo em TODAS as rotas, em varias larguras.
#
# Uma tela por vez esconde o que so aparece no conjunto: uma regra nova de CSS
# conserta a tela em que foi escrita e quebra outras duas. Aqui a pergunta e
# "quantas passam", e a resposta cabe numa tela.
set -uo pipefail
cd "$(dirname "$0")/.."

RAIZ="${MEKORA_PROVA:-$PWD/.ver}"
WEB="${MEKORA_WEB:-http://localhost:5180}"

PUBLICAS="/ /entrar /ajuda /atualizacoes"
PRIVADAS="/mesa /estante /canvas /estudos /notas /conta /conta/kindle /conta/seguranca /conta/preferencias /conta/privacidade"

medida() {   # $1 rota  $2 largura  $3 altura  $4 tema  $5 privada?
  local url="$WEB$1"
  if [ "$5" = "sim" ]; then
    local k
    k=$(MEKORA_PROVA="$RAIZ" scripts/entrar-como-dono.sh 1 2>/dev/null) || { echo "sem sessao"; return; }
    node scripts/medir.mjs "$WEB/entrar/$k" "$2" "$3" scripts/portao.js $4 --depois="$url" 2>/dev/null
  else
    node scripts/medir.mjs "$url" "$2" "$3" scripts/portao.js $4 2>/dev/null
  fi
}

resumo() {
  python3 -c "
import json,sys
t = sys.stdin.read()
try: d = json.loads(t)
except Exception: print('nao mediu'); raise SystemExit
fora = len(d['cor_fora_do_sistema']) + len(d['contraste_abaixo']) + len(d['corpo_fora_da_escala'])
print(('passou' if d['passou'] else 'FALHOU') + f\"  {d['nos_com_texto']:>3} nos\" + (f'  · fora: {fora}' if fora else '') + ('  · sem acento: %d' % len(d['texto_sem_acento']) if d['texto_sem_acento'] else '') + ('  · TELA VAZIA' if d['tela_vazia'] else ''))
"
}

for larg in "1440 1000 " "390 844 " "1440 1000 --escuro"; do
  set -- $larg
  echo "═══ ${1}x${2} ${3:-claro} ═══"
  for r in $PUBLICAS; do printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" nao | resumo; done
  for r in $PRIVADAS; do printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" sim | resumo; done
done
