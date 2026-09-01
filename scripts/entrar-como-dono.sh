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

# Sem id, so cria a sessao — util para medir tela que nao depende de trabalho.
JOB="${1:-}"
BANCO="${2:-$MEKORA_PROVA/storage/kindle_tool.db}"
LOG="${3:-$MEKORA_PROVA/servidor.log}"
API="${MEKORA_API:-http://localhost:8199}"

# O PYTHON DO PROJETO QUANDO ELE EXISTE.
#
# O `python3` do sistema, no macOS, e um atalho para as Command Line Tools — e
# ele falha com "You have not agreed to the Xcode license agreements" de forma
# intermitente, sem aviso e no meio de uma medida. Com `2>/dev/null` por perto,
# a falha vira uma linha vazia e a medida vira um numero errado.
PY_="$(cd "$(dirname "$0")/.." && pwd)/.venv/bin/python"
[ -x "$PY_" ] || PY_="$(command -v python3)"


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

"$PY_" - "$BANCO" "$EMAIL" "$JOB" <<'PY'
import sqlite3, sys
banco, email, job = sys.argv[1], sys.argv[2], sys.argv[3]
c = sqlite3.connect(banco)
r = c.execute("SELECT id FROM pessoas WHERE email=?", (email,)).fetchone()
if not r:
    print(f"a conta {email} não existe no banco", file=sys.stderr); raise SystemExit(1)
if job:
    # Com id, o trabalho passa para a conta nova. Sem id, so a sessao interessa.
    c.execute("UPDATE processing_jobs SET dono_id=? WHERE id=?", (r[0], int(job)))
    c.commit()
PY

# SEM ACERVO, A MEDIDA NAO VALE.
#
# Este script cria uma conta NOVA a cada chamada, e conta nova abre toda tela
# vazia. Uma auditoria que mede a estante sem livros, os estudos sem estudo e as
# notas sem nota passa em tudo — e nao disse nada sobre o produto.
#
# Aconteceu: 41 de 41 telas "passaram" numa rodada inteira antes de alguem
# reparar que a estante media estava vazia. Entao a conta nasce com acervo.
#
# E SEMEIA MESMO COM UM JOB DADO. A versao anterior so semeava quando nenhum id
# vinha — e a auditoria passa um id em TODA rota privada. Resultado: cada tela
# privada foi medida numa conta que tinha exatamente um livro e mais nada, com
# estudos, notas e canvas vazios. O mesmo erro de antes, com uma condicao a
# mais. Passar um id diz de QUAL livro a conta e dona; nao diz que ela deva ser
# pobre.
MEKORA_PROVA="$(dirname "$BANCO")/.." MEKORA_EMAIL="$EMAIL" "$PY_" scripts/semear.py >/dev/null 2>&1 || true

echo "$CHAVE"

# E O PRIMEIRO LIVRO DESTA CONTA, na segunda linha.
#
# A auditoria precisava do numero de um livro para medir a ficha, o preparo e a
# leitura — e o pegava de OUTRA conta, passando esse id de volta aqui para que o
# trabalho fosse TRANSFERIDO. Ou seja: cada rodada da auditoria roubava um livro
# do acervo do Erik, e depois de algumas ele abria a leitura e via o texto de
# exemplo, porque o livro com EPUB tinha mudado de dono.
#
# Agora a conta de medida diz qual e o livro DELA. Ninguem precisa transferir
# nada, e o `$JOB` fica so para quem quiser medir um trabalho especifico.
"$PY_" - "$BANCO" "$EMAIL" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
r = c.execute("SELECT id FROM pessoas WHERE email=?", (sys.argv[2],)).fetchone()
if r:
    # O LIVRO COM EPUB VEM PRIMEIRO.
    #
    # `ORDER BY id DESC` devolvia o ULTIMO semeado — e o unico com EPUB de
    # verdade e o PRIMEIRO. A auditoria media entao a leitura de um livro sem
    # arquivo, que cai no texto de exemplo: sete nos, verde, e nada do leitor
    # de verdade sob medida. Verde por omissao outra vez.
    livro = c.execute(
        "SELECT id FROM processing_jobs WHERE dono_id=? "
        "ORDER BY (epub_path IS NULL OR epub_path = ''), id LIMIT 1",
        (r[0],),
    ).fetchone()
    if livro:
        print(livro[0])
PY
