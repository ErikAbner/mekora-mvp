# Resgate — material recuperado, ainda não classificado

Este diretório existe por um motivo só: **tirar material insubstituível de lugares onde ele
pode sumir sem aviso.** Nada aqui foi classificado, e nada aqui tem autoridade.

## A regra que vale neste diretório

> Estar aqui não torna nada uma decisão vigente. Este material é anterior à consolidação e
> descreve um produto que mudou de nome, de direção e de premissa desde então.

Estes arquivos **não são especificação**. São evidência histórica. Quem for escrever
`PRODUTO.md`, `SISTEMA.md` ou `DESIGN-SYSTEM.md` pode citá-los como origem de uma ideia, nunca
como fonte de uma regra em vigor. A autoridade de cada item só se decide na fase de
reconciliação, comparando com as decisões registradas e com a implementação atual.

O caminho é: **resgatar → preservar → classificar → só então decidir autoridade.** Hoje estamos
no segundo passo.

## O que está aqui

### `2026-07-24-kindle-local/`

Dois relatórios de teste de 24 de julho de 2026, quando o produto ainda se chamava
**Kindle Local** e empurrava arquivos *para* o Kindle — direção que o produto inverteu uma
semana depois, ao virar Mekora e passar a ler o aparelho.

| Arquivo | O que é | Tamanho |
|---|---|---|
| `relatorio-testes-v1.md` | Relatório de testes de UX e funcionalidade do primeiro protótipo | 51 KB |
| `relatorio-testes-v2-e-direcoes.md` | Reteste do v2, três direções de arquitetura comparadas e o fluxo de dez telas | 66 KB |
| `proveniencia.json` | O índice de anexos que localizava os dois arquivos, preservado como prova de origem | 4,7 KB |

**De onde vieram:** `C:\Users\erikc\.codex\attachments\` — o cache de anexos do Codex. Não é
uma pasta de trabalho: é estado interno de ferramenta, e o próprio índice tem um campo
`pendingRemovalPaths`, ou seja, os arquivos vivem numa fila de remoção por design. Foram
encontrados por varredura de conteúdo em 20/08/2026, não por nome — nenhum dos dois tinha
"mekora" ou "kindle" no nome do arquivo. Cópia verificada por md5 contra a origem.

**Por que importam.** Os dois documentos contêm mais especificação de produto do que qualquer
documento hoje versionado neste repositório:

- método de evidência marcada — `[V]` verificado em execução, `[C]` lido no código e não
  exercitado, `[H]` hipótese sem participantes, `[R]` recomendação — com a declaração de
  honestidade que o projeto reinventaria três semanas depois: *"Não houve participantes humanos.
  Nenhum número de compreensão ou tempo neste documento é medição."*;
- conformidade WCAG 2.2 AA item a item, com conformes, não conformes e ressalvas;
- execução real em Chromium headless por Playwright a 1440×900, 768×1024, **390×844**,
  720×450 (zoom 200%) e 320×800 (reflow), mais percurso só por teclado;
- scorecard, matriz de cobertura e achados priorizados por severidade;
- três direções de arquitetura comparadas, cada uma com wireframe desktop **e mobile a 390px**;
- fluxo de dez telas com a microcópia final de cada uma;
- backlog em três níveis e cinco experimentos de produto;
- uma segunda passagem auditando as próprias contradições internas.

**O que isso muda, e o que não muda.** O material mostra que 390px já foi desenhado, e que a
disciplina de critérios de aceite já existiu neste projeto. Mas foi produzido para um produto na
direção antiga. A pergunta certa na reconciliação não é "isto vale?", e sim: *o que já foi
resolvido em 390, por que foi resolvido daquela maneira, e quais dessas decisões sobrevivem ao
Mekora atual?*

## Um padrão a procurar na reconciliação

Vale marcar, ao ler este material, os casos de:

```
ideia antiga  →  esquecida  →  redescoberta de forma independente
```

Quando a mesma ideia é encontrada duas vezes por caminhos separados, é sinal de princípio forte
do produto — e não de coincidência. Esses casos merecem virar decisão registrada com prioridade.

## O que ainda não foi resgatado

Segue em cópia única na máquina Windows, fora de qualquer repositório, aguardando autorização:

- `Documents/Codex/2026-07-24/` — o repositório Git do Kindle Local, **sem remoto**; a melhor
  versão dele está em `outputs/`, que o `.gitignore` exclui, então um push não a levaria;
- `Documents/Codex/2026-07-31/` — o protótipo "Importar do Kindle" e o `mekora-library-lab`,
  com a Estante 3D em WebGL e o Canvas com pan e zoom;
- `Downloads/Exploracao Profunda Card.dc.html` — o raciocínio que produziu o Caderno 01;
- `Pictures/img/` — 22 capturas do painel de leitura do Kindle, base de uma decisão de 20/08;
- 6 capturas únicas do artefato publicado, em `Downloads/`.

---

*Criado em 20 de agosto de 2026, na fase de preservação da consolidação do Mekora. Nenhum
arquivo existente foi movido, renomeado ou alterado para criar este diretório.*
