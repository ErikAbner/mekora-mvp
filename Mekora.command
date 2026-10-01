#!/bin/bash

# Duplo clique no Finder abre o Mekora local com o acervo desta instalação.
# A lógica fica num script comum para também poder ser usada pelo Terminal.
RAIZ="$(cd "$(dirname "$0")" && pwd)"
exec "$RAIZ/scripts/iniciar-local.sh"
