#!/usr/bin/env bash
# Põe uma pasta na lista de pastas permitidas do servidor MCP do Figma.
#
#     bash scripts/figma-pasta.sh                 # a raiz do projeto
#     bash scripts/figma-pasta.sh /outro/caminho
#
# POR QUE ISTO EXISTE
# ===================
# `get_design_context` exige `dirForAssetWrites` e recusa qualquer caminho que
# não esteja numa lista guardada em
# `~/Library/Application Support/Figma/settings.json`, na chave
# `mcpAllowedDirectoriesByUser`. Sem a pasta do projeto lá, a leitura do Figma
# não roda — e a comparação com o desenho é a única coisa que separa "parece
# certo" de "é o que foi desenhado".
#
# O painel que edita isso não foi encontrado no Figma desktop em 04/09. O
# arquivo, sim.
#
# COM O FIGMA ABERTO NÃO ADIANTA. Ele guarda as configurações em memória e
# reescreve o arquivo ao sair, então uma edição feita com ele no ar é apagada
# no fechamento seguinte. Por isso este script RECUSA em vez de escrever no
# vazio: falhar dizendo por quê é melhor que "funcionar" e não ter efeito.
set -euo pipefail

ARQ="$HOME/Library/Application Support/Figma/settings.json"
PASTA="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

[ -f "$ARQ" ] || { echo "não achei $ARQ — o Figma desktop está instalado?"; exit 1; }
[ -d "$PASTA" ] || { echo "essa pasta não existe: $PASTA"; exit 1; }

if pgrep -x Figma >/dev/null; then
  echo "O FIGMA ESTÁ ABERTO. Feche-o (cmd+Q, não só a janela) e rode de novo."
  echo "Com ele no ar, a edição é apagada quando ele sair."
  exit 1
fi

cp "$ARQ" "$ARQ.antes-de-$(date +%Y%m%d-%H%M%S)"

python3 - "$ARQ" "$PASTA" <<'PY'
import json, sys
arq, pasta = sys.argv[1], sys.argv[2]
with open(arq, encoding="utf-8") as f:
    d = json.load(f)
chave = "mcpAllowedDirectoriesByUser"
por_pessoa = d.get(chave) or {}
if not por_pessoa:
    print("a lista está vazia e não sei o teu id de usuário do Figma.")
    print("Abra o Figma, leia um nó qualquer pelo MCP uma vez, e rode isto de novo.")
    raise SystemExit(1)
mudou = False
for quem, pastas in por_pessoa.items():
    if pasta not in pastas:
        pastas.append(pasta)
        mudou = True
d[chave] = por_pessoa
if mudou:
    with open(arq, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    print(f"acrescentada: {pasta}")
else:
    print(f"já estava lá: {pasta}")
for quem, pastas in por_pessoa.items():
    for p in pastas:
        print(f"    {p}")
PY

echo
echo "Abra o Figma de novo. A pasta só vale depois disso."
