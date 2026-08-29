# Plugin de correções do Mekora

## Por que ele existe

Os dois conectores MCP do Figma têm **metades diferentes** do que é preciso, e nenhum
tem as duas:

| conector | escreve | vê a Zodiak |
|---|---|---|
| `plugin:figma:figma` — remoto | sim | **não** |
| `figma-local` — app do Erik | **não** | sim |

Um plugin roda na máquina do Erik: tem a Plugin API inteira **e** as fontes dele.
Investigação completa em `docs/references/auditoria-escala-espacamento-resiliencia-mekora-2026-08-27.md`,
Parte D.3, no Project OS.

## Como carregar, uma vez só

No Figma desktop: **Plugins → Development → Import plugin from manifest…** e escolher
`plugin/manifest.json` deste repositório.

Depois disso ele aparece em Plugins → Development, e cada correção nova é uma edição
no `code.js` — sem reimportar.

## Regra deste plugin

> Nada roda sozinho, e **toda correção relata o que fez** — nó tocado, valor antes,
> valor depois.

E toda correção **confere a premissa antes de escrever**. Se o valor no arquivo não
for o que a medição registrou, ela para e conta em vez de aplicar. Um plugin que
aplica no escuro é pior que nenhum: ele produz um estado que ninguém consegue
explicar depois.

## Antes de rodar

Abra a página **Wireframing - Media**. As correções agem sobre a página atual.

## O que ele faz hoje

1. **Entrelinha, os dois sem ambiguidade** — `H6-Italico-24` de 24/54 para 24/32, e
   `DestaquePersonalizado-italico-64` de 64/54 para 64/72. Os 39 nós são de uma linha
   e o `leadingTrim` é `CAP_HEIGHT`: **nenhuma tela muda de aparência.**
2. **`Heading/H5-Bold-28`** — corrigir o valor, ou absorver no gêmeo `Sem padding` e
   apagar. A segunda é irreversível, e por isso é botão separado.
3. **O `3` duplicado** na tela `Kindle · 0 — vamos conectar`. A lista numera 1, 2, 3, 3.

## Depois de rodar

Cole o relato numa sessão. Ela confere pelo `figma-local` lendo o arquivo de volta —
é isso que fecha o ciclo: você aplica com um clique, e a prova de que ficou certo não
vem do mesmo lugar que aplicou.
