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

# O PYTHON DO PROJETO QUANDO ELE EXISTE.
#
# O `python3` do sistema, no macOS, e um atalho para as Command Line Tools — e
# ele falha com "You have not agreed to the Xcode license agreements" de forma
# intermitente, sem aviso e no meio de uma medida. Com `2>/dev/null` por perto,
# a falha vira uma linha vazia e a medida vira um numero errado.
PY_="$PWD/.venv/bin/python"
[ -x "$PY_" ] || PY_="$(command -v python3)"


PUBLICAS="/ /entrar /ajuda /atualizacoes /politica-de-privacidade /termos-de-uso"

# SEM CONTA, num lugar que exige conta: e a tela do no 941:23106, que explica
# antes de empurrar. Ela so existe deslogado, entao mede-se como publica.
SEM_CONTA="/estante"

PRIVADAS="/mesa /estante /canvas /estudos /notas /conta /conta/kindle /conta/seguranca /conta/preferencias /conta/privacidade"

# A ficha de um livro e o preparo dele levam numero no caminho, e o numero muda
# a cada semeadura. Descobre-se o primeiro da estante em vez de fixar um id que
# some na proxima vez que o banco for refeito.
descobrir_livro() {
  local k
  k=$(MEKORA_PROVA="$RAIZ" scripts/entrar-como-dono.sh 2>/dev/null) || return 1
  # `--input-type=module` porque o corpo usa `await` no topo. Sem ele o node
  # falha, o `2>/dev/null` engole, e a variavel volta vazia — que aqui nao e
  # "nao ha livro", e sim "nao perguntei".
  node --input-type=module -e "
    const chave = process.argv[1];
    const r = await fetch('$WEB/entrar/' + chave, { redirect: 'manual' });
    const biscoito = (r.headers.getSetCookie?.() ?? []).join('; ');
    const h = await (await fetch('$WEB/history', { headers: { cookie: biscoito } })).json();
    if (h.length) process.stdout.write(String(h[0].upload_id ?? h[0].id));
  " "$k" 2>/dev/null
}

medida() {   # $1 rota  $2 largura  $3 altura  $4 tema  $5 privada?
  local url="$WEB$1"
  if [ "$5" = "sim" ]; then
    local k
    # O id do livro vem de `$LIVRO`, e nao fixo em 1: com o `1` escrito aqui, a
    # conta de medida virava dona de um trabalho antigo qualquer, e a ficha e o
    # preparo mediam um livro que a sessao do navegador nao possuia.
    k=$(MEKORA_PROVA="$RAIZ" scripts/entrar-como-dono.sh "${LIVRO:-}" 2>/dev/null) || { echo "sem sessao"; return; }
    node scripts/medir.mjs "$WEB/entrar/$k" "$2" "$3" scripts/portao.js $4 --depois="$url" 2>/dev/null
  else
    node scripts/medir.mjs "$url" "$2" "$3" scripts/portao.js $4 2>/dev/null
  fi
}

resumo() {
  "$PY_" -c "
import json,sys
t = sys.stdin.read()
try: d = json.loads(t)
except Exception: print('nao mediu'); raise SystemExit
fora = len(d['cor_fora_do_sistema']) + len(d['contraste_abaixo']) + len(d['corpo_fora_da_escala'])
print(('passou' if d['passou'] else 'FALHOU') + f\"  {d['nos_com_texto']:>3} nos\" + (f'  · fora: {fora}' if fora else '') + ('  · sem acento: %d' % len(d['texto_sem_acento']) if d['texto_sem_acento'] else '') + ('  · TELA VAZIA' if d['tela_vazia'] else ''))
"
}

LIVRO="$(descobrir_livro)"
[ -n "$LIVRO" ] && echo "livro de prova: $LIVRO" || echo "sem livro na estante — a ficha e o preparo ficam de fora"

for larg in "1440 1000 " "390 844 " "1440 1000 --escuro"; do
  set -- $larg
  echo "═══ ${1}x${2} ${3:-claro} ═══"
  for r in $PUBLICAS; do printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" nao | resumo; done
  for r in $SEM_CONTA; do printf "  %-22s " "$r (sem conta)"; medida "$r" "$1" "$2" "${3:-}" nao | resumo; done
  for r in $PRIVADAS; do printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" sim | resumo; done
  if [ -n "${LIVRO:-}" ]; then
    # A LEITURA ENTRA NA MEDIDA. Ela era a unica tela do produto fora da
    # auditoria, e por isso o cromo passou meses transbordando 390 sem que nada
    # apontasse: seis botoes de 56px nao cabem, e a segunda caixa ficava cortada
    # fora do viewport. `?exemplo` porque o livro semeado nao tem EPUB de
    # verdade — e a tela do exemplo tem o mesmo cromo e a mesma prosa.
    for r in "/estante/$LIVRO" "/preparo/$LIVRO" "/leitura/$LIVRO?exemplo"; do
      printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" sim | resumo
    done
  fi
done
