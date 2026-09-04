#!/usr/bin/env bash
# Uma sessão de medida, SEM pedir link de entrada.
#
#   scripts/sessao-de-prova.sh      # imprime o token na 1ª linha, e o livro na 2ª
#
# POR QUE ISTO EXISTE
# ===================
# O `entrar-como-dono.sh` faz o caminho de verdade: pede um link, espera o
# servidor emiti-lo, e abre. Ele é o certo para PROVAR a entrada — e é o errado
# para medir sessenta e seis telas, porque desde 03/09 há um teto de **20 links
# por origem por hora** (`LINKS_POR_ORIGEM`, em `api/vazao.py`).
#
# A auditoria pedia um link POR MEDIDA. Ela morria no vigésimo: as medidas
# seguintes caíam na tela de "Criar conta", e o `medir.mjs` as recusava com
# "pediu /notas e parou em /entrar". Alto, e não em silêncio — mas a rodada
# ficava pela metade, e o 21 de 21 nunca fechava numa corrida só. Medido:
# 66 medidas pedidas, 20 atendidas.
#
# O teto está certo e não se mexe nele. O que muda é o instrumento: aqui a
# sessão é escrita DIRETO no banco de prova, como o `conftest.py` já faz para os
# 843 testes. Nenhum link é pedido, nenhum teto é tocado, e o caminho do link
# continua provado onde ele é o assunto — `test_acesso.py` e o próprio
# `entrar-como-dono.sh`.
#
# ELE SÓ SERVE PARA O BANCO DE PROVA. `MEKORA_PROVA` aponta para `.ver`, e
# escrever sessão à mão no banco de produção seria fabricar uma entrada que
# ninguém fez.
set -euo pipefail
cd "$(dirname "$0")/.."

PROVA="${MEKORA_PROVA:-$PWD/.ver}"
BANCO="$PROVA/storage/kindle_tool.db"
PY_="$PWD/.venv/bin/python"
[ -x "$PY_" ] || PY_="$(command -v python3)"

[ -f "$BANCO" ] || { echo "sem banco de prova em $BANCO — suba o scripts/prova.sh antes" >&2; exit 1; }

EMAIL="medida-$(date +%s)-$RANDOM@teste.local"

# A ORDEM IMPORTA, e o semeador diz por quê: ele recusa uma conta que ainda não
# existe. Então a pessoa e a sessão nascem primeiro, e o acervo vem depois — sem
# acervo a auditoria mede a estante vazia e passa em tudo.
"$PY_" scripts/_sessao.py "$BANCO" "$EMAIL" criar

# O ACERVO, agora que a conta existe.
MEKORA_PROVA="$PROVA" MEKORA_EMAIL="$EMAIL" "$PY_" scripts/semear.py >/dev/null 2>&1 || true

# E O PRIMEIRO LIVRO DESTA CONTA, na segunda linha — o mesmo contrato do
# `entrar-como-dono.sh`, para quem chama não precisar saber qual dos dois usou.
"$PY_" scripts/_sessao.py "$BANCO" "$EMAIL" livro
