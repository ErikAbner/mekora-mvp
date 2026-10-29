#!/bin/bash
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
APLICATIVOS="$HOME/Applications"
APP="$APLICATIVOS/Mekora Local.app"
CONTEUDO="$APP/Contents"
EXECUTAVEL="$CONTEUDO/MacOS/Mekora Local"
RECURSOS="$CONTEUDO/Resources"
ICONE_CHROME="$HOME/Applications/Chrome Apps.localized/Mekora.app/Contents/Resources/app.icns"
FONTE_APP="$RAIZ/scripts/MekoraLocal.swift"

mkdir -p "$CONTEUDO/MacOS" "$RECURSOS"

cat > "$CONTEUDO/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>Mekora Local</string>
  <key>CFBundleExecutable</key>
  <string>Mekora Local</string>
  <key>CFBundleIdentifier</key>
  <string>local.mekora.launcher</string>
  <key>CFBundleIconFile</key>
  <string>app.icns</string>
  <key>CFBundleName</key>
  <string>Mekora Local</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.2</string>
  <key>CFBundleVersion</key>
  <string>3</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
  </dict>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>Iniciar o Mekora local</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>mekora-local</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
PLIST

printf '%s\n' "$RAIZ" > "$RECURSOS/repository-root.txt"

if ! command -v xcrun >/dev/null 2>&1 || ! xcrun --find swiftc >/dev/null 2>&1; then
  printf 'Não foi possível criar a janela local: as ferramentas de desenvolvimento do macOS não estão instaladas.\n' >&2
  exit 1
fi

# A janela é WebKit nativo: clicar no app nunca entrega a rota para o Chrome,
# portanto não abre abas duplicadas nem depende de uma PWA antiga instalada.
xcrun swiftc "$FONTE_APP" -framework Cocoa -framework WebKit -o "$EXECUTAVEL"

if [ -f "$ICONE_CHROME" ]; then
  cp "$ICONE_CHROME" "$RECURSOS/app.icns"
elif command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
  ICONSET="$(mktemp -d)/app.iconset"
  mkdir -p "$ICONSET"
  ORIGEM="$RAIZ/web/publico/app-icon-512.png"
  if [ -f "$ORIGEM" ]; then
    for TAMANHO in 16 32 128 256; do
      sips -z "$TAMANHO" "$TAMANHO" "$ORIGEM" --out "$ICONSET/icon_${TAMANHO}x${TAMANHO}.png" >/dev/null
      DOBRO=$((TAMANHO * 2))
      sips -z "$DOBRO" "$DOBRO" "$ORIGEM" --out "$ICONSET/icon_${TAMANHO}x${TAMANHO}@2x.png" >/dev/null
    done
    cp "$ORIGEM" "$ICONSET/icon_512x512.png"
    cp "$ORIGEM" "$ICONSET/icon_256x256@2x.png"
    iconutil -c icns "$ICONSET" -o "$RECURSOS/app.icns" 2>/dev/null || true
  fi
fi

LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
if [ -x "$LSREGISTER" ]; then
  "$LSREGISTER" -f "$APP" >/dev/null 2>&1 || true
fi

if command -v codesign >/dev/null 2>&1; then
  codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
fi

printf '✓ Aplicativo local instalado em %s\n' "$APP"
