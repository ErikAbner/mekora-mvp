# Microauditoria do Canvas — não são três linhagens, são cinco

**Data:** 2026-08-20
**Escopo:** fechar a evidência necessária para decidir o Canvas vigente. **Nada foi decidido.**
**Método:** contrato funcional primeiro, comparação depois — nunca por idade, aparência ou completude

---

## 1. O resultado decisivo sobre o `library-lab`

O `library-lab` de 31/07 **não é um Canvas.** É uma terceira renderização da Estante.

A prova está em uma linha. Em `resgate/2026-07-31-mekora-library-lab/work/mekora-library-lab/src/main.js`,
a posição de cada card no "canvas" é calculada a partir do **índice no array**:

```js
left:      80 + (i%4)*285 + (i%2)*24 + "px"
top:       70 + Math.floor(i/4)*385 + (i%3)*18 + "px"
transform: rotate([-2,1,-1,2][i%4] + "deg)")
```

Uma grade de quatro colunas, com um deslocamento pequeno e uma rotação alternada para parecer
colocado à mão. **A pessoa não posiciona nada.** Não há `x` nem `y` por livro em `data.js` —
verificado: zero ocorrências.

O que existe de verdade é pan e zoom sobre um mundo, e o botão "Enquadrar". A mesma lista
`filtered()` alimenta a Grade e o Canvas: é um **seletor de vista** sobre o mesmo acervo, ao lado de
Grade e Estante 3D.

| contrato | library-lab |
|---|---|
| trazer nota existente | ✗ — só segura livros |
| criar nota solta | ✗ |
| mover e posicionar | ✗ — posição derivada do índice |
| conectar manualmente | ✗ |
| remover da superfície | ✗ |
| manter a origem | n/a |
| persistir posição | ✗ — não há posição a persistir |
| reutilizar a Connection | ✗ |

**Zero de nove.** O `library-lab` é ancestral da **Estante**, não do Canvas. Descartá-lo da disputa
não é escolha estética: é constatação de que ele nunca esteve na disputa.

---

## 2. A varredura dos oito artefatos publicados

### O que respondi, e o que não

| artefato | data | verificado |
|---|---|---|
| Mekora — referência de componentes da biblioteca | 06/08 | **sim, integralmente** |
| Mekora · área pessoal | 12/08 | **sim, integralmente** |
| Bancada do card · Mekora | 10/08 | é o `caderno-01`, já auditado |
| Preferências do Mekora · exploração | 11/08 | é o `caderno-02`, já auditado |
| Kindle no cabo — exploração de animação | 06/08 | **não verificado** |
| Kindle Tool — telas do projeto (nomes derivados no lote) | 02/08 | **não verificado** |
| Kindle Tool — protótipo das telas do projeto | 31/07 | **não verificado** |
| Kindle Local Tool — exploração de navegação em camadas | 29/07 | **não verificado** |

Os quatro não verificados são todos da era do fluxo de conversão — 29/07 a 06/08 —, quando o Kindle
era destino e Canvas não existia como conceito no produto. **Probabilidade baixa, não zero.** Se
alguma dessas quatro importar, é a de animação, porque motion é justamente o que o contrato admite
absorver.

### As três perguntas

**① Algum contém Canvas, organização espacial ou relações entre notas que altere a comparação?**

**Sim, e muda bastante.** O artefato *"Mekora — referência de componentes da biblioteca"* documenta
**duas linhagens de Canvas que nenhum inventário tinha** — e as duas são anteriores ao
`canvas-motion`:

**Canvas de capas**, extraído de `mekora-prototype-v2.zip`. Descrito literalmente como *"o modo de
'mapa visual' da biblioteca"*:

- capas soltas sobre grid pontilhado, **arrastáveis individualmente**;
- **agrupadas por coleção com moldura tracejada** e rótulo sobreposto que "corta" a linha;
- mundo de 1500 × 800 com `transform-origin: 0 0`, zoom por `scale()`;
- controles de zoom no canto: `−` · `100%` · `+` · `⤢` (ajustar à tela);
- dica: *"Arraste para navegar · role para ampliar"*;
- seleção por círculo de 18px no canto da capa.

**Canvas do app React**, de `projeto-mekora/app/MekoraV2.tsx`: `.v2-canvas` com fundo pontilhado,
`.v2-canvas-book` posicionado em absoluto, 220px, `cursor: grab`. Mais um `.v2-network` — uma vista
de rede em três colunas.

E o artefato *"Mekora · área pessoal"* (que é o `prototipo.html`) traz um achado paralelo que **não é
Canvas, mas importa para Conexões**: uma rede em SVG onde *"o nó é o objeto, com rótulo legível — não
uma bolinha"*, com nós de três tipos (livro, assunto, nota), links de origem e de tema, e — o mais
relevante — **relações com estado de aceitação**:

```
.krow.aceita     borda esquerda verde
.krow.recusada   opacidade reduzida
.kforca          força da relação
```

Um modelo de relação sugerida que a pessoa **aceita ou recusa**, com força. Isso é matéria de
Conexões, não de Canvas, e deve entrar na reconciliação daquele assunto — não nesta decisão.

**② Algum foi explicitamente aprovado ou rejeitado?**

**Nenhum.** Nenhuma das cinco linhagens tem rejeição registrada. O artefato de componentes descreve a
transição como fato técnico — a estante *"ainda era um grid, antes de virar WebGL na v3"* —, não como
julgamento. Todas foram **deixadas para trás por mudança de ferramenta ou de lugar de trabalho.**

Isto vale como regra de leitura: nesta família, "antigo" nunca significa "recusado".

**③ Algum contém solução que sobreviveu no produto atual?**

Parcialmente, e a lista do que **não** sobreviveu é a mais útil:

| solução | origem | no produto atual |
|---|---|---|
| arrastar para posicionar | prototype-v2, React v2 | **sim** — `cvModo:"mover"`, `canvasPos` |
| conectar manualmente | — | **sim** — `cvLigando`, e é novo |
| agrupamento com moldura tracejada e rótulo | prototype-v2 | **não** |
| controles de zoom com "ajustar à tela" | prototype-v2, library-lab | **não** — zero ocorrências de "enquadrar" |
| mundo maior que a viewport com pan | library-lab, prototype-v2 | **não verificado** |
| rotação leve de "papel sobre a mesa" | library-lab, prototype-v2 | **não** |

---

## 3. As cinco linhagens, e a linha evolutiva que elas desenham

Ordenadas por data, com **o objeto que cada uma manipula**:

| | quando | objeto | posicionamento |
|---|---|---|---|
| **library-lab** | 31/07 | livro | derivado do índice — não é canvas |
| **prototype-v2** | ≤ 03/08 | livro (capa) | arrastável, com agrupamento e zoom |
| **MekoraV2 React** | ≤ 06/08 | livro (card) | arrastável |
| **canvas-motion** | 12/08 | **item** — imagem, link/vídeo, notas do Kindle, grupos, texto | não verificado |
| **mesa de notas** | 20/08 | **nota** | arrastável, com ligação manual |

A linha é clara, e não é sobre completude:

```
livro como assunto   →   item como assunto   →   nota como assunto
```

O `canvas-motion` é a dobradiça, e o comentário do próprio arquivo diz isso melhor do que qualquer
resumo: *"A mudança não é acrescentar quatro tipos ao lado do livro — é parar de tratar o livro como
o assunto."*

---

## 4. Comparação contra o contrato

O contrato exclui **três das cinco por definição, não por idade**. Ele diz *"usa as entidades reais
do Mekora; não cria 'nota de Canvas'"*, *"trazer nota existente"*, *"criar nota solta"*, e
*"não é gerenciador da biblioteca"*.

**As linhagens 1, 2 e 3 têm o livro como objeto.** São gerenciadores de biblioteca com layout
espacial — exatamente o que o contrato exclui. Não falham por serem antigas; falham por manipularem
a entidade errada.

### A mesa de notas contra o contrato

| deve permitir | mesa de notas |
|---|---|
| trazer nota existente | **✓** `cv-trazer` |
| criar nota solta | **✓** `cv-nota` |
| mover e posicionar | **✓** `cvModo:"mover"` · `canvasPos` |
| conectar manualmente | **✓** `cvLigando` |
| remover da superfície sem apagar a entidade | **✗** — nenhuma ação de remover |
| manter a origem da nota | **✓** — *"o Canvas recebe notas, e a origem vem junto"* (`:1623`) |
| abrir a origem | **✓** |
| persistir posição | **✗** — vive em memória (é o **B22** do `ABERTO.md`) |
| reutilizar a mesma Connection de Notas/Conexões | **✓** — *"uma relação só, com duas maneiras de fazer"* |

**Sete de nove.** As duas faltas são lacunas de implementação com endereço, não divergência de
modelo.

### O `canvas-motion` contra o contrato

**Não verificável daqui** — o disco está no Mac. O que o registro afirma: cinco tipos de item, e a
intenção declarada de tirar o livro do centro. Pelo contrato, ele acerta o movimento
(livro → item) e **erra o destino** (item, não nota), além de arrastar consigo tipos que o contrato
não pede: imagem, link/vídeo e texto solto.

---

## 5. O que a evidência sustenta — e o que continua sendo decisão sua

**A hipótese do Erik se confirma: não há vencedor integral.**

O que a evidência sustenta:

- **O `library-lab` sai da disputa.** Não por ser antigo — por não ter posicionamento.
- **`prototype-v2` e `MekoraV2` saem pelo objeto.** São canvas de livro; o contrato pede canvas de
  nota.
- **A mesa de notas é a única que satisfaz o contrato**, com sete de nove itens e duas lacunas
  conhecidas.
- **Há soluções de interação comprovadas nos ancestrais que o produto atual não tem**, e que o
  contrato explicitamente admite absorver: agrupamento com moldura e rótulo, e controles de zoom com
  "ajustar à tela".

**O que só o Erik decide:**

1. Se a formulação correta é a que ele mesmo esboçou — *o Canvas vigente é definido pelo contrato; a
   mesa de notas é sua base conceitual e funcional; soluções comprovadas de interação dos ancestrais
   podem ser incorporadas sem restaurar suas arquiteturas.*
2. Se o **agrupamento** entra no contrato como capacidade, ou fica como interação a absorver. Ele é a
   única coisa dos ancestrais que não é só interação — grupo é entidade, e o `canvas-motion` já
   tratava "grupos" como um dos cinco tipos.

---

## 6. Registro dos oito artefatos

Conforme o Erik pediu, sem desviar para classificá-los agora:

```
8 published artifacts (claude.ai)
status: discovered / not yet classified
```

Eles são a classe de problema que o futuro `artifact registry` do Project OS deve resolver: **um
conjunto relevante de evidência existindo exclusivamente numa conta externa**, invisível a uma
auditoria que varre disco, Git e Drive.

Dois deles já provaram valor nesta microauditoria — sem eles, a decisão do Canvas teria sido tomada
sobre três linhagens quando existem cinco.
