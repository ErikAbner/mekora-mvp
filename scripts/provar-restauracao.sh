#!/usr/bin/env bash
# O CONTROLE NEGATIVO DA RESTAURAÇÃO — cada verificação, envenenada uma vez.
#
#     bash scripts/provar-restauracao.sh
#
# ═══════════════════════════════════════════════════════════════════════════
# POR QUE ISTO EXISTE
# ═══════════════════════════════════════════════════════════════════════════
#
# A lei deste repositório é que verde não conta sem a prova de que o instrumento
# sabe ficar vermelho:
#
#     Os três foram aceitos reproduzindo o defeito e ficando vermelhos: verde
#     sem essa prova não conta.  — CLAUDE.md
#
# O `ensaio-de-restauracao.sh` prova que o caminho funciona. Este prova que as
# VERIFICAÇÕES funcionam: ele restaura numa cópia, estraga uma coisa por vez, e
# cobra que a verificação certa — e não uma qualquer — reprove.
#
# Sem isto, "todas as verificações passaram" pode querer dizer "nenhuma delas
# olha para nada". Foi exatamente o que aconteceu com o portão da interface em
# 04/09: ele passou envenenado porque o seletor não casava em lugar nenhum.
#
# ═══════════════════════════════════════════════════════════════════════════
# OS SEIS VENENOS
# ═══════════════════════════════════════════════════════════════════════════
#
#   banco corrompido        integridade do banco
#   linha apagada           contagem por tabela
#   caminho não reescrito   caminhos apontam para o destino
#   arquivo removido        registro tem arquivo
#   arquivo zerado          nenhum arquivo truncado
#   arquivo alterado        arquivos idênticos ao espelho
#
# A sétima — permissões — não é envenenada: tirar o bit de leitura de um
# arquivo dentro de um teste que roda como o dono exige `chmod` que o próprio
# dono desfaz, e num container que roda como root nem isso vale. Ela é medida,
# e a honestidade é dizer que o controle dela não é exercido aqui.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

STORAGE="${MEKORA_STORAGE:-$RAIZ/storage}"
BACKUPS="${MEKORA_BACKUP_DIR:-$STORAGE/backups}"
TRABALHO="$(mktemp -d "${TMPDIR:-/tmp}/mekora-prova-XXXXXX")"
trap 'rm -rf "$TRABALHO"' EXIT

falhas=0
ok()  { printf '  \033[32mserve\033[0m   %s\n' "$1"; }
mal() { printf '  \033[31mFALHOU\033[0m  %s\n' "$1"; falhas=$((falhas + 1)); }

SNAPSHOT="$(ls -t "$BACKUPS"/kindle_tool_*.db 2>/dev/null | head -1)"
if [ -z "$SNAPSHOT" ]; then
  echo "sem snapshot em $BACKUPS — rode o backup antes." >&2
  exit 1
fi
NOME="$(basename "$SNAPSHOT")"

printf '\n\033[1mControle negativo da restauração\033[0m\n\n'
echo "  snapshot: $NOME"
echo

# Restaura uma cópia limpa, aplica o veneno, valida, e cobra a mensagem certa.
#
# A VALIDAÇÃO RODA SOZINHA — `--so-validar`. Envenenar e restaurar de novo
# apagaria o veneno junto: a restauração reescreve o destino inteiro.
veneno() {
  local nome="$1" esperado="$2"; shift 2
  local copia="$TRABALHO/$nome"
  rm -rf "$copia"
  if ! MEKORA_BACKUP_DIR="$BACKUPS" NO_COLOR=1 python3 scripts/restaurar.py \
       --snapshot "$NOME" --destino "$copia" > "$TRABALHO/$nome.restaurar.log" 2>&1; then
    mal "$nome: a restauração LIMPA já falhou — o veneno não chegou a ser testado"
    return
  fi
  ( cd "$copia" && "$@" )
  if MEKORA_BACKUP_DIR="$BACKUPS" NO_COLOR=1 python3 scripts/restaurar.py \
     --snapshot "$NOME" --destino "$copia" --so-validar > "$TRABALHO/$nome.log" 2>&1; then
    mal "$nome: a validação PASSOU envenenada — ela não olha para isto"
  elif grep -q "$esperado" "$TRABALHO/$nome.log"; then
    ok "$nome  →  reprovou em \"$esperado\""
  else
    mal "$nome: reprovou por OUTRO motivo — $(grep -m1 'FALHOU\|reprovou em' "$TRABALHO/$nome.log" | tr -d '\n')"
  fi
  # A CÓPIA SAI ASSIM QUE O VENENO DELA FOI JULGADO.
  #
  # O `trap` do fim limpava tudo de uma vez, e o pico eram SETE cópias
  # completas vivas ao mesmo tempo — 2,3 GB para um storage de 333 MB. Em
  # 08/09 o disco desta máquina estava com 2 GB livres e os dois últimos
  # venenos morreram em "No space left on device": o controle negativo
  # reprovou por falta de espaço, e um instrumento que falha por recurso
  # ensina a ignorar a falha dele.
  #
  # Uma cópia por vez basta: cada veneno é julgado sozinho.
  rm -rf "$copia"
}

# ── 1 · banco corrompido ──────────────────────────────────────────────────
# Escreve lixo no meio do arquivo, depois do cabeçalho. Zerar o arquivo inteiro
# daria "não abre", que é outro erro — o que se quer é a página estragada que
# só o `integrity_check` vê.
veneno "banco-corrompido" "integridade do banco" \
  python3 -c "
import os
f = os.open('kindle_tool.db', os.O_WRONLY)
os.lseek(f, 40960, os.SEEK_SET)
os.write(f, b'\x00' * 4096)
os.close(f)"

# ── 2 · uma linha a menos ─────────────────────────────────────────────────
veneno "linha-apagada" "contagem por tabela" \
  python3 -c "
import sqlite3
c = sqlite3.connect('kindle_tool.db')
c.execute('DELETE FROM notas WHERE id = (SELECT max(id) FROM notas)')
c.commit(); c.close()"

# ── 3 · um caminho que ficou apontando para a origem ──────────────────────
veneno "caminho-antigo" "caminhos apontam para o destino" \
  python3 -c "
import sqlite3
c = sqlite3.connect('kindle_tool.db')
c.execute(\"UPDATE processing_jobs SET epub_path = '/outro/lugar/storage/output/9/x.epub' \"
          'WHERE id = (SELECT min(id) FROM processing_jobs WHERE epub_path IS NOT NULL)')
c.commit(); c.close()"

# ── 4 · o arquivo que o registro promete, e que sumiu ─────────────────────
veneno "arquivo-sumido" "registro tem arquivo" \
  python3 -c "
import sqlite3, os
c = sqlite3.connect('file:kindle_tool.db?mode=ro', uri=True)
v = c.execute('SELECT epub_path FROM processing_jobs WHERE epub_path IS NOT NULL LIMIT 1').fetchone()[0]
c.close(); os.remove(v)"

# ── 5 · o arquivo que existe e está vazio ─────────────────────────────────
veneno "arquivo-zerado" "nenhum arquivo truncado" \
  python3 -c "
import sqlite3
c = sqlite3.connect('file:kindle_tool.db?mode=ro', uri=True)
v = c.execute('SELECT epub_path FROM processing_jobs WHERE epub_path IS NOT NULL LIMIT 1').fetchone()[0]
c.close(); open(v, 'wb').close()"

# ── 6 · o arquivo com o tamanho certo e o conteúdo trocado ────────────────
# O veneno que separa "conferiu tamanho" de "conferiu conteúdo": um byte muda,
# o tamanho não.
veneno "arquivo-alterado" "arquivos idênticos ao espelho" \
  python3 -c "
import sqlite3, os
c = sqlite3.connect('file:kindle_tool.db?mode=ro', uri=True)
v = c.execute('SELECT epub_path FROM processing_jobs WHERE epub_path IS NOT NULL LIMIT 1').fetchone()[0]
c.close()
f = os.open(v, os.O_WRONLY); os.lseek(f, 30, os.SEEK_SET); os.write(f, b'X'); os.close(f)"

# ── e o controle do controle: sem veneno, tem de passar ───────────────────
copia="$TRABALHO/limpa"
if MEKORA_BACKUP_DIR="$BACKUPS" NO_COLOR=1 python3 scripts/restaurar.py \
   --snapshot "$NOME" --destino "$copia" > "$TRABALHO/limpa.log" 2>&1; then
  ok "sem veneno  →  passa"
else
  mal "sem veneno a restauração falhou: $(grep -m1 'FALHOU' -A2 "$TRABALHO/limpa.log" | tr '\n' ' ')"
fi

printf '\n'
if [ "$falhas" -eq 0 ]; then
  printf '  \033[32mCONTROLE NEGATIVO: cada verificação reprova o defeito dela, e só ele.\033[0m\n\n'
else
  printf '  \033[31m%s VERIFICAÇÃO(ÕES) NÃO SERVE(M).\033[0m\n\n' "$falhas"
fi
exit "$falhas"
