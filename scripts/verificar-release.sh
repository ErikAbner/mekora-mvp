#!/usr/bin/env bash
# Portão local da release: falha na primeira verificação reprovada.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

PYTHON="${PYTHON:-$RAIZ/.venv/bin/python}"
if [ ! -x "$PYTHON" ]; then
  PYTHON="$(command -v python3)"
fi

echo "[1/5] Backend"
"$PYTHON" -m pytest -q

echo "[2/5] Interface e contratos"
find contrato web/src -name '*.teste.mjs' -print0 | xargs -0 node --test

echo "[3/5] Build web"
(cd web && npm ci && npm run build)

echo "[4/5] Contrato de rotas"
"$PYTHON" scripts/rotas.py --conferir

echo "[5/5] Integridade do repositório"
git diff --check

proibidos="$(git ls-files | grep -E '(^|/)(\.env$|storage/(input|output|temp|models|logs|covers|backups|retratos|thumbnails|ui-audit)/|.*\.(db|sqlite|sqlite3)$)' || true)"
if [ -n "$proibidos" ]; then
  echo "Arquivos locais ou sensíveis foram versionados:" >&2
  echo "$proibidos" >&2
  exit 1
fi

echo "Release aprovada pelos portões locais."
