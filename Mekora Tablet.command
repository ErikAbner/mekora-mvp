#!/bin/bash
set -e
RAIZ="$(cd "$(dirname "$0")" && pwd)"
exec "$RAIZ/scripts/iniciar-tablet.sh"
