#!/bin/bash
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${MEKORA_PORTA_LOCAL:-8000}"
HOST="${MEKORA_HOST:-127.0.0.1}"
ACESSO_TABLET="${MEKORA_ACESSO_TABLET:-0}"
if [ "$ACESSO_TABLET" = "1" ]; then HOST="0.0.0.0"; fi
ENDERECO_LOCAL="http://127.0.0.1:${PORTA}"
PAGINA="${ENDERECO_LOCAL}/mesa"
BUILD="$RAIZ/web/dist/index.html"
MARCA_BUILD="$RAIZ/web/dist/.mekora-source.sha256"
BACKUPS_PADRAO="$HOME/Library/Application Support/Mekora/Backups"

cd "$RAIZ"

titulo() { printf '\n\033[1m%s\033[0m\n\n' "$1"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
aviso() { printf '  \033[33m!\033[0m %s\n' "$1"; }
falha() {
  printf '\n  \033[31mNão foi possível iniciar:\033[0m %s\n\n' "$1" >&2
  printf '  Esta janela ficará aberta para você conseguir ler o erro.\n' >&2
  read -r -p '  Pressione Enter para fechar. ' _ || true
  exit 1
}

titulo "Mekora local"

ip_da_rede() {
  if command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  elif command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}' || true
  fi
}

if [ "$ACESSO_TABLET" = "1" ]; then
  IP_REDE="${MEKORA_IP_REDE:-$(ip_da_rede)}"
  if [ -z "$IP_REDE" ]; then
    falha "não consegui descobrir o endereço desta máquina na rede. Defina MEKORA_IP_REDE manualmente."
  fi
  ENDERECO_REDE="http://${IP_REDE}:${PORTA}"
else
  ENDERECO_REDE="$ENDERECO_LOCAL"
fi

command -v python3 >/dev/null 2>&1 || falha "Python 3 não está instalado."
command -v npm >/dev/null 2>&1 || falha "Node.js/npm não está instalado."

# Dependências só são instaladas quando faltam. Iniciar o produto no dia a dia
# não deve depender da rede nem modificar o ambiente sem necessidade.
if [ ! -x "$RAIZ/.venv/bin/python" ]; then
  titulo "Primeira preparação"
  python3 -m venv "$RAIZ/.venv" || falha "não consegui criar o ambiente Python."
  "$RAIZ/.venv/bin/pip" install -r "$RAIZ/backend/requirements.txt" || \
    falha "não consegui instalar as dependências Python."
fi

if [ ! -d "$RAIZ/web/node_modules" ]; then
  titulo "Primeira preparação da interface"
  npm --prefix "$RAIZ/web" install || falha "não consegui instalar a interface."
fi

# A assinatura é por CONTEÚDO, e não por data de modificação. Git pode trazer
# código novo com uma data anterior à do dist; a comparação antiga aceitava o
# pacote velho e o app instalado abria bundles que já não correspondiam ao
# código atual — inclusive a tela branca sem controles.
ASSINATURA_ATUAL="$("$RAIZ/.venv/bin/python" "$RAIZ/scripts/fingerprint-interface.py" "$RAIZ")" || \
  falha "não consegui conferir a versão da interface."
ASSINATURA_BUILD=""
if [ -f "$MARCA_BUILD" ]; then ASSINATURA_BUILD="$(tr -d '[:space:]' < "$MARCA_BUILD")"; fi

PRECISA_BUILD=0
if [ ! -f "$BUILD" ] || [ "$ASSINATURA_ATUAL" != "$ASSINATURA_BUILD" ]; then PRECISA_BUILD=1; fi
if [ "$PRECISA_BUILD" = "1" ]; then
  titulo "Atualizando a interface"
  npm --prefix "$RAIZ/web" run build || falha "a interface não pôde ser compilada."
  printf '%s\n' "$ASSINATURA_ATUAL" > "$MARCA_BUILD"
else
  ok "Interface pronta."
fi

# Mesmo com o servidor aberto a conferência acima precisa acontecer: é comum
# atualizar o repositório e clicar no iniciador enquanto a janela antiga ainda
# está rodando. O servidor entrega os novos arquivos do dist imediatamente; o
# service worker avisa a janela instalada e ela própria recarrega.
if [ "$ACESSO_TABLET" != "1" ] && curl -fsS --max-time 1 "$ENDERECO_LOCAL/health" >/dev/null 2>&1; then
  ok "O Mekora já estava aberto e está com a interface atual."
  if [ "${MEKORA_NAO_ABRIR:-0}" != "1" ]; then open "$PAGINA"; fi
  exit 0
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORTA" -sTCP:LISTEN >/dev/null 2>&1; then
  falha "a porta $PORTA está sendo usada por outro programa."
fi

# O banco é copiado pela API do SQLite e conferido antes de o backend executar
# migrações. O destino fica fora do repositório: limpar ou mover o código não
# pode levar embora, no mesmo gesto, os dados e a única cópia deles.
titulo "Protegendo seu progresso"
export MEKORA_BACKUP_DIR="${MEKORA_BACKUP_DIR:-$BACKUPS_PADRAO}"
mkdir -p "$MEKORA_BACKUP_DIR" || falha "não consegui criar a pasta de backups."
"$RAIZ/.venv/bin/python" "$RAIZ/scripts/backup.py" || \
  falha "o backup não passou na verificação; o Mekora não foi iniciado para não arriscar seus dados."

# Autentica sem enviar mensagem. Falta de internet não impede a leitura local;
# apenas avisa que o envio ao Kindle não funcionará enquanto ela persistir.
if [ "${MEKORA_VERIFICAR_SMTP:-1}" = "1" ]; then
  if "$RAIZ/.venv/bin/python" "$RAIZ/scripts/verificar-smtp.py"; then
    ok "SMTP pronto para enviar ao Kindle."
  else
    aviso "O Mekora abrirá normalmente, mas o SMTP não respondeu. Veja a mensagem acima."
  fi
fi

export ARGOS_PACKAGES_DIR="${ARGOS_PACKAGES_DIR:-$RAIZ/storage/models/argos-packages}"

titulo "Abrindo"
if [ "$ACESSO_TABLET" = "1" ]; then
  "$RAIZ/.venv/bin/uvicorn" backend.main:app --host "$HOST" --port "$PORTA" --log-level warning &
  SERVIDOR_PID=$!
  trap 'kill "$SERVIDOR_PID" 2>/dev/null || true' EXIT INT TERM
  PRONTO=0
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 1 "$ENDERECO_LOCAL/health" >/dev/null 2>&1; then PRONTO=1; break; fi
    sleep 0.25
  done
  if [ "$PRONTO" != "1" ]; then falha "o servidor demorou para responder."; fi
  TOKEN="$(MEKORA_PROVA="$RAIZ" MEKORA_EMAIL="${MEKORA_EMAIL:-mekora@local}" "$RAIZ/.venv/bin/python" "$RAIZ/scripts/chave-local.py")" || \
    falha "não consegui criar o link local para o tablet."
  PAGINA="${ENDERECO_REDE}/entrar/${TOKEN}"
  printf '  Abra este endereço no tablet conectado à mesma rede:\n  %s\n' "$PAGINA"
  printf '  O Mekora ficará acessível somente nesta rede. Control+C encerra.\n\n'
  if [ "${MEKORA_NAO_ABRIR:-0}" != "1" ] && command -v open >/dev/null 2>&1; then open "$PAGINA"; fi
  wait "$SERVIDOR_PID"
else
  printf '  %s\n' "$PAGINA"
  printf '  Feche esta janela ou pressione Control+C para encerrar o Mekora.\n\n'
  if [ "${MEKORA_NAO_ABRIR:-0}" != "1" ]; then
    (
      for _ in $(seq 1 60); do
        if curl -fsS --max-time 1 "$ENDERECO_LOCAL/health" >/dev/null 2>&1; then
          open "$PAGINA"
          exit 0
        fi
        sleep 0.25
      done
      aviso "O servidor demorou para responder; abra $PAGINA manualmente."
    ) &
  fi
  exec "$RAIZ/.venv/bin/uvicorn" backend.main:app --host "$HOST" --port "$PORTA" --log-level warning
fi
