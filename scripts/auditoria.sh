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

# AS CONFERÊNCIAS ESTÁTICAS VÊM ANTES DO NAVEGADOR.
#
# Elas custam um segundo e pegam o que a medida não pega: classe CSS com dois
# donos (a última carregada apaga a outra em silêncio) e botão sem gesto — a
# classe de defeito que mais apareceu aqui, e que passa verde no portão porque
# um botão morto tem a mesma cor e o mesmo contraste de um vivo.
#
# Elas NÃO derrubam a auditoria: o que elas acusam aparece no topo, e a medida
# das telas continua — saber que três telas transbordam vale mesmo com uma
# classe duplicada em aberto.
echo "── conferências estáticas ──"
node scripts/classes.mjs || true
node scripts/botoes.mjs || true
# O SVG re-exportado do Figma volta com seis casas decimais e 51 KB por icone.
# Isto so avisa; enxugar e um comando, e o desenho nao muda (scripts/svg.py).
"$PY_" scripts/svg.py --conferir || true
# As ferramentas de fora do Python. A imagem de producao as confere no build; a
# maquina de quem desenvolve, ninguem conferia — e a falta so aparecia como
# "o OCR falhou" no meio de um arquivo de verdade.
"$PY_" scripts/conferir-ferramentas.py 2>&1 | grep -E "FALTA|Faltam" || true
# Os testes do contrato: funcoes puras, sem navegador, um arquivo por peca.
for t in contrato/*.teste.mjs; do node "$t" >/dev/null 2>&1 || echo "FALHOU  $t"; done
# A mascara das gravadoras. As duas tapam de jeitos diferentes, e a da Clarity
# nao acusa nada quando esta errada — a gravacao sai com o livro de alguem
# dentro, embaixo de uma tela de privacidade dizendo que nao sai.
node web/src/medir.teste.mjs || true
echo

medida() {   # $1 rota  $2 largura  $3 altura  $4 tema  $5 privada?
  local url="$WEB$1"
  if [ "$5" = "sim" ]; then
    # DUAS LINHAS: a chave, e o primeiro livro DA CONTA que acabou de nascer.
    #
    # A versao anterior descobria o id do livro numa conta e o passava de volta
    # ao helper para medir com OUTRA — e passar um id ali TRANSFERE o trabalho.
    # Cada rodada da auditoria roubava um livro do acervo do Erik, e depois de
    # algumas a leitura dele abria no texto de exemplo, porque o livro com EPUB
    # tinha mudado de dono. Ninguem transfere nada agora.
    local saida k livro
    saida=$(MEKORA_PROVA="$RAIZ" scripts/entrar-como-dono.sh 2>/dev/null) || { echo "sem sessao"; return; }
    k=$(printf '%s\n' "$saida" | sed -n 1p)
    livro=$(printf '%s\n' "$saida" | sed -n 2p)
    [ -n "$k" ] || { echo "sem sessao"; return; }
    [ -n "$livro" ] || livro=0
    url="$WEB${1//\{LIVRO\}/$livro}"
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

for larg in "1440 1000 " "390 844 " "1440 1000 --escuro"; do
  set -- $larg
  echo "═══ ${1}x${2} ${3:-claro} ═══"
  for r in $PUBLICAS; do printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" nao | resumo; done
  for r in $SEM_CONTA; do printf "  %-22s " "$r (sem conta)"; medida "$r" "$1" "$2" "${3:-}" nao | resumo; done
  for r in $PRIVADAS; do printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" sim | resumo; done
  # A LEITURA ENTRA NA MEDIDA. Ela era a unica tela do produto fora da
  # auditoria, e por isso o cromo passou meses transbordando 390 sem que nada
  # apontasse: seis botoes de 56px nao cabem, e a segunda caixa ficava cortada
  # fora do viewport. Agora o livro semeado tem EPUB de verdade, entao ela abre
  # o texto do livro e nao o de exemplo.
  for r in "/estante/{LIVRO}" "/preparo/{LIVRO}" "/leitura/{LIVRO}"; do
    printf "  %-22s " "$r"; medida "$r" "$1" "$2" "${3:-}" sim | resumo
  done
done
