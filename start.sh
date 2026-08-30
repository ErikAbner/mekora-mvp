#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== Kindle Local Tool ==="
echo "Raiz: $ROOT_DIR"

# ---------------------------------------------------------------------------
# Pacotes locais do Argos Translate
# ---------------------------------------------------------------------------
export ARGOS_PACKAGES_DIR="$ROOT_DIR/storage/models/argos-packages"

# ---------------------------------------------------------------------------
# Modo produção: build do frontend + um único servidor
# ---------------------------------------------------------------------------
if [ "$1" = "--prod" ]; then
  echo ""
  echo "[frontend] Gerando build de produção..."
  cd "$ROOT_DIR/frontend"
  if [ ! -d "node_modules" ]; then
    npm install -q
  fi
  npm run build

  cd "$ROOT_DIR"
  echo ""
  echo "[backend] Iniciando em modo produção (porta 8000)..."
  if [ ! -d ".venv" ]; then
    echo "[backend] Criando virtualenv em $ROOT_DIR/.venv ..."
    python3 -m venv .venv
  fi
  source .venv/bin/activate
  pip install -r backend/requirements.txt -q

  echo ""
  echo "Acessível em: http://localhost:8000"
  echo "Pressione Ctrl+C para encerrar."
  uvicorn backend.main:app --host 127.0.0.1 --port 8000
  exit 0
fi

# ---------------------------------------------------------------------------
# Modo desenvolvimento: backend (8000) + frontend dev server (5173)
# ---------------------------------------------------------------------------

# ---- Backend ---------------------------------------------------------------
echo ""
echo "[backend] Iniciando..."
cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
  echo "[backend] Criando virtualenv em $ROOT_DIR/.venv ..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r backend/requirements.txt -q

uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "[backend] Rodando em http://localhost:8000 (PID $BACKEND_PID)"

# ---- Frontend --------------------------------------------------------------
echo ""
echo "[frontend] Iniciando..."
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "[frontend] Instalando dependências npm..."
  npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "[frontend] Rodando em http://localhost:5173 (PID $FRONTEND_PID)"

echo ""
echo "Backend:  http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo ""
echo "Pressione Ctrl+C para encerrar."

trap "echo ''; echo 'Encerrando...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
