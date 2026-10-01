#!/bin/bash
set -euo pipefail

# O modo normal continua fechado no computador. Este atalho abre o servidor
# somente na rede local para que um tablet conectado ao mesmo Wi‑Fi possa usar
# a instalação sem publicar nada na internet.
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
export MEKORA_ACESSO_TABLET=1
exec "$RAIZ/scripts/iniciar-local.sh" "$@"
