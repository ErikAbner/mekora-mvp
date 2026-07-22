#!/bin/bash
# install.sh — Setup do Kindle Local Tool para macOS via Homebrew
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== Kindle Local Tool — Instalação ==="
echo "Raiz: $ROOT_DIR"
echo ""

# ---------------------------------------------------------------------------
# 1. Verificar Homebrew
# ---------------------------------------------------------------------------
if ! command -v brew &>/dev/null; then
  echo "✗ Homebrew não encontrado."
  echo "  Instale em: https://brew.sh"
  exit 1
fi
echo "✓ Homebrew encontrado"

# ---------------------------------------------------------------------------
# 2. Instalar dependências do sistema
# ---------------------------------------------------------------------------
echo ""
echo "[deps] Instalando dependências do sistema..."

MISSING_DEPS=()
command -v ebook-convert &>/dev/null || MISSING_DEPS+=("calibre")
command -v tesseract    &>/dev/null || MISSING_DEPS+=("tesseract" "tesseract-lang")
command -v gs           &>/dev/null || MISSING_DEPS+=("ghostscript")
# 7zz is required by KCC to extract CBZ/CBR/CB7/CBC archives on macOS.
# The 'sevenzip' formula provides the 7zz binary; 'p7zip' (7z) is NOT sufficient.
command -v 7zz          &>/dev/null || MISSING_DEPS+=("sevenzip")

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo "[deps] Instalando: ${MISSING_DEPS[*]}"
  brew install "${MISSING_DEPS[@]}"
else
  echo "[deps] Calibre, Tesseract, Ghostscript e 7zz já instalados."
fi

# ---------------------------------------------------------------------------
# 3. Virtualenv Python
# ---------------------------------------------------------------------------
echo ""
echo "[python] Configurando virtualenv..."
cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r backend/requirements.txt -q
echo "✓ Dependências Python instaladas"

# ---------------------------------------------------------------------------
# 4. Build do frontend
# ---------------------------------------------------------------------------
echo ""
echo "[frontend] Gerando build de produção..."
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  npm install -q
fi
npm run build
cd "$ROOT_DIR"
echo "✓ Frontend compilado"

# ---------------------------------------------------------------------------
# 5. Criar comando kindle-tool
# ---------------------------------------------------------------------------
echo ""
KINDLE_CMD="$ROOT_DIR/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000"

# Detectar shell do usuário
SHELL_RC=""
if [[ "$SHELL" == *"zsh"* ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
  SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ]; then
  # Remover alias anterior se existir
  sed -i.bak '/alias kindle-tool=/d' "$SHELL_RC" 2>/dev/null || true
  echo "alias kindle-tool='cd $ROOT_DIR && source .venv/bin/activate && $KINDLE_CMD'" >> "$SHELL_RC"
  echo "✓ Alias 'kindle-tool' adicionado a $SHELL_RC"
  echo ""
  echo "=== Instalação concluída ==="
  echo ""
  echo "Para usar:"
  echo "  1. Abra um novo terminal (ou execute: source $SHELL_RC)"
  echo "  2. Configure o .env com suas credenciais SMTP"
  echo "  3. Execute: kindle-tool"
  echo "  4. Acesse: http://localhost:8000"
else
  echo "✓ Instalação concluída"
  echo ""
  echo "Para iniciar manualmente:"
  echo "  cd $ROOT_DIR"
  echo "  source .venv/bin/activate"
  echo "  $KINDLE_CMD"
fi
