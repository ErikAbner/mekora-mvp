#!/bin/bash
# install.sh — preparação do Mekora para macOS via Homebrew
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== Mekora — Instalação local ==="
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
# 4. Build da interface atual
# ---------------------------------------------------------------------------
echo ""
echo "[interface] Gerando o aplicativo instalável..."
if [ ! -d "$ROOT_DIR/web/node_modules" ]; then
  npm --prefix "$ROOT_DIR/web" ci -q
fi
npm --prefix "$ROOT_DIR/web" run build
"$ROOT_DIR/.venv/bin/python" "$ROOT_DIR/scripts/fingerprint-interface.py" "$ROOT_DIR" \
  > "$ROOT_DIR/web/dist/.mekora-source.sha256"
echo "✓ Frontend compilado"

echo ""
echo "[aplicativo] Instalando o iniciador local..."
"$ROOT_DIR/scripts/instalar-app-local.sh"

# ---------------------------------------------------------------------------
# 5. Criar comando mekora
# ---------------------------------------------------------------------------
echo ""

# Detectar shell do usuário
SHELL_RC=""
if [[ "$SHELL" == *"zsh"* ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
  SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ]; then
  # Remover alias anterior se existir
  sed -i.bak '/alias kindle-tool=/d; /alias mekora=/d' "$SHELL_RC" 2>/dev/null || true
  echo "alias mekora='cd $ROOT_DIR && ./Mekora.command'" >> "$SHELL_RC"
  echo "✓ Comando 'mekora' adicionado a $SHELL_RC"
  echo ""
  echo "=== Instalação concluída ==="
  echo ""
  echo "Para usar:"
  echo "  1. Abra um novo terminal (ou execute: source $SHELL_RC)"
  echo "  2. Copie .env.example para .env e configure o SMTP"
  echo "  3. Abra 'Mekora Local' na pasta Aplicativos ou execute: mekora"
  echo "  4. Acesse: http://127.0.0.1:8000/mesa"
else
  echo "✓ Instalação concluída"
  echo ""
  echo "Para iniciar manualmente ou instalar o aplicativo local:"
  echo "  cd $ROOT_DIR"
  echo "  ./scripts/instalar-app-local.sh"
  echo "  ./Mekora.command"
fi
