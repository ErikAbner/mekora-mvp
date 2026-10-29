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
  if [ -t 0 ]; then
    printf '  Esta janela ficará aberta para você conseguir ler o erro.\n' >&2
    read -r -p '  Pressione Enter para fechar. ' _ || true
  elif command -v osascript >/dev/null 2>&1; then
    osascript -e 'display alert "O Mekora não conseguiu iniciar" message "Abra ~/Library/Logs/Mekora/local.log para ver o motivo." as critical' >/dev/null 2>&1 || true
  fi
  exit 1
}

abrir_produto() {
  # A execução pelo Terminal continua abrindo a página no navegador. O app
  # instalado define MEKORA_NAO_ABRIR=1 e mostra esta mesma rota numa janela
  # WebKit própria; assim os dois caminhos nunca disputam a abertura.
  open "$PAGINA"
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

# Dependências só são instaladas quando faltam OU quando a lista mudou. Conferir
# apenas a existência da pasta deixava o app indefinidamente numa versão antiga:
# o Git trazia um package-lock/requirements novo, mas o build continuava usando
# o node_modules e o .venv da primeira instalação.
assinatura_de() {
  python3 -c 'import hashlib, pathlib, sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())' "$1"
}

if [ ! -x "$RAIZ/.venv/bin/python" ]; then
  titulo "Primeira preparação"
  python3 -m venv "$RAIZ/.venv" || falha "não consegui criar o ambiente Python."
fi

REQ_STAMP="$RAIZ/.venv/.mekora-requirements.sha256"
REQ_ATUAL="$(assinatura_de "$RAIZ/backend/requirements.txt")"
REQ_INSTALADO=""
if [ -f "$REQ_STAMP" ]; then REQ_INSTALADO="$(tr -d '[:space:]' < "$REQ_STAMP")"; fi
if [ "$REQ_ATUAL" != "$REQ_INSTALADO" ]; then
  titulo "Atualizando o motor local"
  "$RAIZ/.venv/bin/pip" install -r "$RAIZ/backend/requirements.txt" || \
    falha "não consegui instalar as dependências Python."
  printf '%s\n' "$REQ_ATUAL" > "$REQ_STAMP"
fi

# O Argos antigo trazia Stanza como dependência obrigatória. Atualizar para a
# versão com MiniSBD não apaga pacotes que deixaram de ser dependência, então o
# Stanza vulnerável permanecia no disco apesar de não ser mais usado nem estar
# no requirements. Removê-lo é seguro e torna o ambiente real igual à lista.
if "$RAIZ/.venv/bin/pip" show stanza >/dev/null 2>&1; then
  "$RAIZ/.venv/bin/pip" uninstall -y stanza >/dev/null || \
    falha "não consegui remover a dependência antiga Stanza."
fi

NODE_STAMP="$RAIZ/web/node_modules/.mekora-package-lock.sha256"
NODE_ATUAL="$(assinatura_de "$RAIZ/web/package-lock.json")"
NODE_INSTALADO=""
if [ -f "$NODE_STAMP" ]; then NODE_INSTALADO="$(tr -d '[:space:]' < "$NODE_STAMP")"; fi
if [ ! -d "$RAIZ/web/node_modules" ] || [ "$NODE_ATUAL" != "$NODE_INSTALADO" ]; then
  titulo "Atualizando a interface local"
  npm --prefix "$RAIZ/web" ci || falha "não consegui instalar a interface."
  printf '%s\n' "$NODE_ATUAL" > "$NODE_STAMP"
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
  if [ "${MEKORA_NAO_ABRIR:-0}" != "1" ]; then abrir_produto; fi
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
export ARGOS_CHUNK_TYPE="${ARGOS_CHUNK_TYPE:-MINISBD}"

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
  # O tablet precisa entrar na MESMA identidade que já possui o acervo. Usar
  # uma conta fixa aqui fazia uma instalação usada parecer vazia, embora os
  # livros continuassem intactos no banco. `auto` só escolhe quando há uma
  # única dona comprovada; com ambiguidade, para e pede uma escolha explícita.
  TOKEN="$(MEKORA_PROVA="$RAIZ" MEKORA_EMAIL="${MEKORA_EMAIL:-auto}" "$RAIZ/.venv/bin/python" "$RAIZ/scripts/chave-local.py")" || \
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
          abrir_produto
          exit 0
        fi
        sleep 0.25
      done
      aviso "O servidor demorou para responder; abra $PAGINA manualmente."
    ) &
  fi
  exec "$RAIZ/.venv/bin/uvicorn" backend.main:app --host "$HOST" --port "$PORTA" --log-level warning
fi
