#!/usr/bin/env bash
# Devolve um link de entrada valido para uma conta que E DONA do trabalho dado.
#
# POR QUE ISTO EXISTE: medir a leitura exige uma sessao do dono do livro, e o
# limite de cinco links por dez minutos — que existe para o campo de e-mail
# aberto na internet nao virar maquina de incomodar — derruba a terceira ou
# quarta medida seguida. Quando ele derruba, o backend responde 204 sem emitir
# nada, e o proximo `grep` no log pega a chave ANTERIOR, ja consumida.
#
# O sintoma disso na tela nao e um erro: e o texto de exemplo, com o aviso
# "o livro nao pode ser aberto". Duas medidas inteiras desta sessao foram feitas
# contra o exemplo antes de alguem notar.
#
# A saida e uma conta NOVA a cada medida, com o trabalho passado para ela — o
# limite e por e-mail, entao ele nunca e atingido.
#
#   uso: scripts/entrar-como-dono.sh <job_id> [banco] [log]
set -euo pipefail

JOB="${1:?falta o id do trabalho}"
BANCO="${2:-$MEKORA_PROVA/storage/kindle_tool.db}"
LOG="${3:-$MEKORA_PROVA/servidor.log}"
API="${MEKORA_API:-http://localhost:8199}"

EMAIL="medida-$(date +%s)-$RANDOM@teste.local"
curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\"}" -o /dev/null "$API/entrar/pedir"

# Espera a chave APARECER no log, em vez de dormir um tempo fixo: com o servidor
# ocupado o tempo fixo pega a chave da medida anterior.
CHAVE=""
for _ in $(seq 20); do
  sleep 0.5
  CHAVE=$(grep -A3 "$EMAIL" "$LOG" 2>/dev/null | grep -oE "/entrar/[A-Za-z0-9_-]{20,}" | tail -1 | sed 's|/entrar/||' || true)
  [ -n "$CHAVE" ] && break
done
[ -n "$CHAVE" ] || { echo "não saiu link para $EMAIL — o servidor está no ar?" >&2; exit 1; }

python3 - "$BANCO" "$EMAIL" "$JOB" <<'PY'
import sqlite3, sys
banco, email, job = sys.argv[1], sys.argv[2], int(sys.argv[3])
c = sqlite3.connect(banco)
r = c.execute("SELECT id FROM pessoas WHERE email=?", (email,)).fetchone()
if not r:
    print(f"a conta {email} não existe no banco", file=sys.stderr); raise SystemExit(1)
c.execute("UPDATE processing_jobs SET dono_id=? WHERE id=?", (r[0], job))
c.commit()
PY

echo "$CHAVE"
