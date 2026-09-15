# Mekora — o sistema de design

**Estado:** vigente
**Última revisão:** 2026-08-21

> **Este documento descreve o estado vigente.** Histórico, alternativas rejeitadas e evolução
> normativa pertencem às DECs e à reconciliação, e **não são repetidos aqui** — com **uma exceção
> declarada**: a seção *"O que já foi recusado, e por medição"*. Ela existe porque uma decisão visual
> descartada volta sozinha se ninguém escrever por que caiu, e voltar custa a mesma medição de novo.

## Por que este documento é diferente dos outros dois

**O Mekora não tem fonte de design formal.** Não há arquivo de design, não há design system em
repositório separado. O que existe é o **Protótipo de Produto do Mekora** — referência funcional e de
interação vigente `DEC-0033 §2` — que é, ao mesmo tempo, protótipo, exploração e implementação.

Um artefato que mistura três papéis não pode ser a autoridade que os distingue `DEC-0033 §4`. **É
por isso que este documento existe, e é o que ele faz:** separar, dentro do protótipo, o que é regra
visual vigente do que ainda é exploração.

**Este documento não é um retrato do protótipo.** Retrato de artefato vivo nasce desatualizado
`DEC-0033` consequência 2.

## Como ler as marcas

```
REGRA        vale. Quebrar é defeito.
MEDIDO       regra que veio de medição, e o número está junto. Só se derruba com outra medição.
EXPLORAÇÃO   está no protótipo e ainda NÃO é regra. Pode sair sem que nada quebre.
ABERTO       não decidido. Está em ABERTO.md.
```

---

# Fundamentos

## Cor · REGRA `DEC-0037 §5-6`

**Preto e branco neutro, e a cor tem três endereços.** Verbatim do Erik, 29/08:
*"preto e branco neutro, apenas itens como notas, capas de livro e estados do sistema que
podem ter cor."*

```
SUPERFÍCIE  surface/base #f9f9f9   surface/sunken #f3f3f3   surface/deep #ebebeb
            surface/inverse #161616
TINTA       text/strong #151515    text/primary #535353     text/secondary #6a6a6a
            text/on-inverse #f3f3f3
OBJETO      icon/default #6a6a6a   border/subtle #b1b1b1
NOTA        nota/verde #d7f285  nota/rosa #f28587  nota/amarelo #f2e685  nota/azul #85bcf2
CAPA        capa/verde #efffbf  capa/rosa #ffbfc0  capa/amarelo #fff8bf  capa/azul #bfdfff
ESTADO      estado/ok #2f7d55   estado/atencao #976519   estado/perigo #b23b2a
```

### As quatro regras que governam a cor

**1 · As camadas vêm do fundo, não da borda.** É o que permite tirar borda de quase tudo.
Um degrau de superfície é uma troca de `surface/*`, não um contorno.

**2 · Cor é exceção, e tem endereço.** Nota, capa, estado. Fora desses três, o sistema é
preto e branco. Um token de cor sem endereço não entra — foi por isso que os conjuntos
`médio` e `quebrado` dos pastéis ficaram fora: existem no Figma, não viram token.

**3 · Seleção é degrau de superfície, não matiz.** O acento `#c0451d` foi medido contra o
`estado/perigo` `#b23b2a` e deu **11,9** de distância perceptual — abaixo do limiar de ~15
em que duas cores se confundem. Marcar o gesto mais frequente do produto com o tom do
alarme mais raro é sinal invertido. Seleção usa `surface/sunken` e `surface/deep`.

**4 · Tinta cheia é o elemento mais alto da paleta, e o alto é da exceção.**

> **Gastar preto no gesto mais frequente do produto seria inflação.**

### A regra que substituiu um conserto

**Tinta de estado não pousa em `surface/deep`.** Lá o `estado/ok` dá 4,21 e o
`estado/atencao` dá 4,20, os dois abaixo de 4,5. Escurecer os três estados para atender uma
combinação que nenhuma tela faz embaçaria o sinal inteiro. A regra custa menos que o
conserto — e é conferível.

### Como esta paleta nasceu

Havia **duas** paletas base e elas não concordavam. A regra da reconciliação foi: *mantém a
estrutura e a luminância da quente, e tira o matiz.* A quente era a medida e a completa; a
do Figma tinha os nomes por papel, com escopo, ligados a mil e poucos nós. Cada uma tinha
metade.

E a medição achou o que ninguém tinha olhado: **nenhum valor do Figma era neutro.** Todos
puxavam para o azul, incluindo o `#0C0D0D`. O `--ink` quente já era `#151515` — neutro puro
desde sempre.

**O `prototipo-mesa.html` ainda renderiza a paleta quente**, e isso é sabido. Ele deixou de
ser a autoridade de cor pela `DEC-0037 §1`; continua sendo a referência funcional e de
interação. Repintá-lo é trabalho separado.

## Contraste · MEDIDO

| token | contra a página | onde pode |
|---|---:|---|
| `--ink-3` | **5,03:1** | texto, e é o mais claro que alcança |
| `--ink-4` | **2,05:1** | **proibido em texto pelo próprio projeto** |
| `--line-3` | 1,69:1 | filete decorativo — **não** serve de limite de componente |
| `--line` | 1,28:1 | separação de superfície |

**Limite de componente pede 3:1**, e entre os tokens de filete **nenhum alcança**. Onde um campo
precisa declarar sua própria borda — a régua de um `textarea`, por exemplo — ela é `--ink-3`, e a
escolha é medição, não gosto.

## Espaço · REGRA

Base **4px**, com os degraus operacionais de 20 e 40.

```
--s1 4    --s2 8    --s3 12   --s4 20
--s5 30   --s6 40   --s7 60   --s8 80
```

### Espaço copiado de desenho sem `text-box-trim` precisa ser reconferido · REGRA

O produto liga `text-box-trim: trim-both` com `text-box-edge: cap alphabetic` —
foi escolha do Erik em 02/09, "caixa abraça as letras, como no Figma", e está
certa.

**A consequência que ninguém tinha escrito: com a caixa aparada, o espaço entre
duas linhas é SÓ o que a regra declara.** Não sobra meia entrelinha para
disfarçar um valor curto.

Um valor tirado de um desenho — ou de uma tela antiga do próprio produto — que
pressupunha caixa de linha normal chega aqui menor do que parecia. Ele não pode
ser copiado: tem de ser reconferido na tela, com o trim ligado.

Já cobrou duas vezes, e as duas com a mesma cara — dois textos encostados que
liam como um parágrafo só:

| onde | valor | o que acontecia |
|---|---|---|
| Ajuda | `margin-block-end: 0` no `h1` | o título encostava no campo de busca |
| Preparo | `margin: 0 0 4px` no `h3` | o título do item colava na explicação |

Nos dois casos o valor estava escrito e parecia deliberado. Não estava: era
sobra de entrelinha que tinha sumido.

**Como aplicar:** ao trazer espaçamento de fora, medir o resultado antes de
aceitá-lo. E ao ver dois textos que "quase" se tocam, suspeitar disto primeiro.

## Geometria · REGRA

**Estrutura é reta.**

```
--r1  0px      ação e estrutura: botão, campo, card, lista, folha
--r2  0px      superfície grande
--rm  2px      só mídia recortada, para o canto não brigar com a borda
--rp  pílula   dado: tag, chip, trilho, interruptor
50%   círculo  avatar e ponto — não é raio, é forma
```

**Pílula e círculo são os 5% que quebram a regra, e funcionam por serem raros:** numa composição
reta, uma curva vira sinal.

O raio 4px foi retirado por ser *"o pior dos dois mundos: perdia a nitidez do 0 sem comprar a
simpatia de uma curva de verdade."*

## Tipografia · REGRA `DEC-0035`, `DEC-0037`

**Duas famílias, e cada uma tem um papel escrito.**

- **Zodiak Variable** — a interface inteira e os títulos de capa. Serifada em tudo, e isso é
  decisão de produto pela `DEC-0035`, não economia.
- **IBM Plex Mono** — a **leitura de dado**: contador, medida, percentual, numeração de capa.

A razão do mono é **figura tabular**, e não estética: num contador o dígito não pode mudar de
largura ao trocar, senão o número treme enquanto conta. Mono resolve isso por construção.

Isso foi descoberto ao contrário. O papel já existia — 28 nós de `"24 MB de 24 MB"` e `"24"`
na Mesa e na Estante — mas estava vestido de **Satoshi**, uma terceira família que ninguém
tinha declarado. Alguém escolheu uma sans neutra porque algarismo de serifada de display fica
errado num contador; **a escolha estava certa e não estava escrita.**

Saíram em 29/08: `Satoshi` da interface e das capas, `Archivo` (2 nós) e um `Roboto` solto —
padrão do Figma vindo de um colar, que nunca foi escolha.

**Satoshi permanece em 14 nós, de propósito:** são os espécimes `Ab` das telas
`Leitura · aparência`. Essas telas oferecem **escolha de fonte ao leitor**, e Satoshi é uma
das opções. Não é sistema, é conteúdo.

Dos 392 nós que estavam sem style, **33 foram adotados** por baterem exatamente com um style
existente, e mais **86** ganharam style próprio — capa e dado. Restam 273.

### A escala, nos dois modos

Coleção `Mekora Tipografia`, modos **Desktop** e **Mobile**, 32 variáveis ligadas.

| style | peso | desktop | mobile | razão |
|---|---|---|---|---|
| `Display/Large` | Extrabold | 64/72 | 40/48 | 0,63 |
| `Display/Large/Capitular` | Italic | 64/72 | 40/48 | 0,63 |
| `Heading/XL` | Bold | 48/56 | 32/40 | 0,67 |
| `Heading/LG` | Bold | 40/48 | 28/36 | 0,70 |
| `Heading/MD` | Bold | 32/40 | 24/32 | 0,75 |
| `Heading/SM` | Bold | 28/36 | 22/30 | 0,79 |
| `Heading/XS` · `/Italic` | Bold · Italic | 24/32 | 20/28 | 0,83 |
| `Body/Large` | Regular | 24/32 | 20/28 | 0,83 |
| `Body/Medium` | Regular | 20/30 | 18/27 | 0,90 |
| `Body/Medium/Prosa` | Regular | 20/30 | 18/27 | 0,90 |
| `Label/Small/Caps` | Italic | 20/28 | 18/26 | 0,90 |
| `Label/Large` | Regular | 18/26 | 18/26 | 1,00 |
| `Body/Small` · `Label/Medium` | Regular | 16/24 | 16/24 | 1,00 |
| `Label/Small` | Regular | 14/22 | 14/22 | 1,00 |

### As quatro regras que governam o tipo

**1 · Entrelinha = corpo + 8.** Uma exceção escrita: o corpo de leitura fica em razão
**1,5**. Somar 8 absolutos produz uma razão que cai conforme o corpo cresce — 1,44 no 18 e
1,17 no 48 — que é exatamente a curva que a tipografia pede. **Por isso a regra não precisa
de versão mobile.**

**2 · A exceção atravessa como razão, nunca como número.** `20/30` vira `18/27`, não
`18/30` — copiar o 30 daria razão 1,67, frouxo e desperdiçando tela.

**3 · O piso do mobile é 18.** Nada abaixo do corpo encolhe. Diminuir texto pequeno
justamente na tela menor é o sinal invertido.

**4 · Tracking é relativo, nunca absoluto.** Corrigido em 29/08: o mesmo `-1.6px` valia
**-2,5%** num corpo 64 e **-6,7%** num corpo 24 — invertido, porque tipo grande precisa de
*mais* aperto, não menos. E o mobile amplificava: a 32px o mesmo valor daria -5%.

```
64 → -2,5%    48 → -2,0%    40 → -1,5%    ≤ 32 → 0
```

O `Heading/MD` e o `Heading/SM` ficaram em zero de propósito: dar tracking a quem não tem
é inventar curva nova, e isso é trabalho do playbook, com o olho junto.

### Medida de leitura · MEDIDO

O avanço médio da Zodiak Regular é **0,5204 em**, medido no arquivo da fonte e ponderado
pela frequência de letras do português, espaço incluído.

```
tela 375   medida 343px    18px → 37 caracteres    16px → 41
tela 393   medida 361px    18px → 39               16px → 43
tela 430   medida 398px    18px → 42               16px → 48
```

Abaixo dos 45 clássicos — **e isso é a tela, não a escolha**: chegar a 45 em 343px exigiria
corpo 15, pequeno demais para leitura contínua. Trinta e sete é o que um celular dá.

### Duas coisas que a medição achou e que não foram consertadas

**A exceção da leitura vazou para o style geral.** A `DEC-0035` escreve a exceção para *o
corpo 20 de leitura*, que é o `Body/Medium/Prosa` — os 12 nós dele são a prosa das telas de
Leitura. Mas o `Body/Medium`, 448 nós de corpo de **interface**, também está em 20/30. Pela
regra seria 20/28. **Não foi mexido**, porque 1,5 em corpo de interface é tipografia boa e
não defeito — mas hoje isso é escolha implícita, e escolha implícita é a que ninguém
consegue defender depois.

**O `Label/Small/Caps` tem um nome que mente três vezes.** Os 2 nós são *"14 de agosto de
2026"* e *"12 de agosto de 2026"*: não é caps, é minúscula; não é small, 20px é o corpo; e o
peso é Italic. É um **rótulo de data**. O tracking de `23.8px` — **119% do corpo**, mais que
um caractere inteiro entre letras — é deliberado no desktop: foi calculado para distribuir
“2 DE SETEMBRO DE 2026” pela coluna de conteúdo de 888px. Não deve ser “normalizado” para
um valor tipográfico comum; no telefone a variante usa `4px` para não quebrar a linha.

### Dado · REGRA

| style | fonte | valor | onde |
|---|---|---|---|
| `Dado/Medida` | IBM Plex Mono Regular | 14/22 | contador, medida, percentual |
| `Dado/Contagem` | IBM Plex Mono Regular | 16/24 | contagem na Estante |

Entrelinha por `corpo + 8` como o resto do sistema. Os nós são de uma linha, então ela nunca
aparece — a regra é adotada por consistência, de graça.

### As capas geradas

**São conteúdo, não interface, e a diferença é operacional.** Numa capa o corpo do título
sai do **comprimento do texto**, para preencher a caixa: *"Malha Urbana"* e *"Apresentação
Institucional"* têm de ocupar o mesmo retângulo e as duas parecerem deliberadas. Por isso os
valores lá são `24/24`, `32/44`, `48/64`, `30/33` — **encaixes, não degraus**.

Escala de interface existe para tornar coisas **diferentes** comparáveis. Capa existe para
**uma** coisa preencher um espaço. Forçar a segunda na primeira faz título estourar ou sobrar.

**A fonte, porém, pode ser a mesma** — e provavelmente deve. Uma capa em Zodiak Black fica
editorial e literária, que é o idioma do produto; Satoshi é uma geométrica neutra e não diz
isso. Aqui a mudança melhora, não só uniformiza.

O `Archivo`, com 2 nós, sai: duas ocorrências de uma terceira família não fazem trabalho que
as outras não façam. Isso é acidente, não decisão.

**As styles de capa**, criadas em 29/08:

| style | fonte | valor |
|---|---|---|
| `Capa/Data` | Zodiak Italic | 10/auto |
| `Capa/Credito` | Zodiak Regular | 10/auto |
| `Capa/Nota` | Zodiak Regular | 9/12 |
| `Capa/Numero` | IBM Plex Mono | 8/auto |
| `Capa/Formato` | IBM Plex Mono | 10/auto |

**`auto` é decisão, não omissão:** são rótulos de uma linha, e a entrelinha natural da fonte é
a certa quando não há segunda linha para espaçar.

**O título de capa segue `corpo + 4`**, não `corpo + 8`: mesmo mecanismo do sistema, constante
mais apertada porque display quer menos entrelinha. Dá `24/28`, `32/36`, `48/52`, `30/34`.
Antes disso a razão variava de **1,00 a 1,38 no mesmo papel** — não era escala, era falta de
regra. Vinte e sete nós, dos quais **quatro mudaram de altura**.

### O `28/24` é conteúdo, não tipografia

Quarenta nós em `28/24 Bold` — entrelinha **menor** que o corpo, o mesmo defeito que o
`Heading/H5-Bold-28` tinha antes de ser corrigido. Mas a distribuição conta outra história:
**4 nós em cada uma de 10 telas**, todos com o texto `Link link link`. É um componente com
**placeholder que nunca foi preenchido**, repetido em produção.

Quatro dos quarenta quebram linha, então adotar `Heading/SM` (28/36) é quase invisível — e
vale, porque `28/24` é quebrado independente do texto que entrar. Mas os 40 ficam registrados
como pendência de **conteúdo**, não de tipo.

## Movimento · REGRA

```
--curva   cubic-bezier(.16, 1, .3, 1)
--d1 .16s      --d2 .26s      --d3 .42s
```

**Movimento amacia o que a geometria endureceu.** Mas ele não existe para suavizar:

> **Se a animação pode ser removida sem perder informação, ela não deveria estar ali.**

**São quatro, e cada uma diz algo que o estado parado não diz:**

| | o que diz |
|---|---|
| `subiu` | o item **mudou de categoria** |
| `traça` | **quais dois** foram ligados — a linha se desenha de A para B |
| `chega` | a trilha **é uma ordem**, e por isso chega em ordem |
| `reachou` | **onde** o trecho foi reencontrado depois de o texto mudar |

**Todas as quatro têm desligamento em `prefers-reduced-motion`**, e o global também: transições vão a
`.001s` e animações a `none`.

> ⚠ **Divergência interna encontrada nesta revisão.** As notas dentro do próprio protótipo afirmam
> que as durações são *".12 / .24 / .42s"*. Os tokens dizem **.16 / .26 / .42**. Os tokens são a
> verdade; a prosa está desatualizada. Registrado, não corrigido — é texto de nota, não de norma.

---

# Regras de composição

## Texto é porta, botão é arrumação · MEDIDO

**A regra mais consequente do sistema.**

> Todo texto que você lê é a porta de onde ele veio. Botão, nas listas, é **sempre** arrumação —
> nunca o caminho principal.

**O efeito medido:** estendê-la ao trecho tirou **71 controles** da tela em trinta itens; aplicada ao
conjunto, derrubou os controles visíveis de **108 para 30** em trinta escritos.

**O que fica à vista é a ação destrutiva, sempre no mesmo canto** — superior direito.

## Exceção antes de configuração · REGRA `DEC-0019 §4`

A pessoa é chamada quando há dúvida real, **uma de cada vez, com a evidência à vista**. Quando não há
exceção, **não aparece nada**.

Disso decorre, no visual: **cláusula sem dado não aparece.** Um campo vazio não é informação.

## Um filete por grupo, não por item · REGRA

*"A cerca acaba porque há uma linha onde há um assunto, e não uma por coisa escrita."*

## O produto diz o que não sabe · REGRA `DEC-0019 §7-8`, `DEC-0020 §4`

Isto tem consequência visual direta, não só de texto:

- **Barra de progresso só em etapa contável.** Nas demais, a etapa e o tempo decorrido — **nunca
  porcentagem inventada**.
- **Estado de erro que nunca acontece não entra.** Ramo inalcançável não é honestidade, é decoração.
- **Marca de conclusão não vai sobre estado incompleto.** O ✓ verde é reservado ao estado final.

---

# Acessibilidade

| | |
|---|---|
| **Tamanho de fonte** | escala em `rem`; a preferência do navegador é preservada |
| **Contraste de texto** | **AA: 4,5 para texto normal, 3,0 a partir de 24px.** Medido, não estimado — `node scripts/contraste.mjs` |
| **Contraste de texto** | `--ink-4` é proibido em texto — mede 2,05:1 |
| **Limite de componente** | 3:1; nenhum token de filete alcança, então usa-se `--ink-3` |
| **Movimento** | `prefers-reduced-motion` desliga as quatro animações e as transições globais |
| **Foco** | `:focus-visible` com contorno de 1px em `--ink`, offset 2px |
| **Tema escuro** | existe, e é **exploração** — ver abaixo |

---

# O que é exploração, e não regra

Esta seção é a razão de o documento existir. **Nada aqui vale como norma visual.**

## Tema escuro · EXPLORAÇÃO

Existe uma paleta escura completa em `:root[data-tema="escuro"]`, e ela **não segue o sistema por
decisão declarada**: *"um protótipo de revisão abre na paleta que está sendo decidida. Ele existe
abaixo, e entra só quando pedido."*

**Não é regra até uma decisão dizer que é.**

## Estante 3D · EXPLORAÇÃO — e é o exemplo correto de como marcar

A vista traz o selo `exp` **no próprio botão**, antes do clique. A razão está escrita no código:
*"marcar só depois do clique seria marcar tarde."*

E quando a vista abre, **a razão medida aparece**, com número:

> As lombadas ocupam **menos de um décimo** da prateleira, e o título só se lê de lado, um por vez.
> Em Capas, os 14 títulos ficam legíveis de uma vez. Isto continua aqui porque a estante é a metáfora
> certa — **não porque já entrega mais que a lista.**

**Este é o padrão que o sistema adota para marcar exploração:** selo antes do clique, e razão medida
dentro. *"Dizer 'experimento' sem dizer o que ele faz pior seria selo decorativo."*

## As cinco variantes de Mesa · EXPLORAÇÃO **NÃO MARCADA**

Atrás do botão de depuração existem cinco variantes de Mesa — reduzida, A operacional,
B continuidade, C workspace, e a atual. **Elas são bancada de comparação, e não estão marcadas.**

> ⚠ **Isto é dívida conhecida.** A Estante 3D recebeu o selo exatamente por este motivo; a Mesa não
> recebeu. Sem marca, quem encontrar a Mesa C não terá como saber que ela foi recusada às 14h33 de
> 14/08. Registrado como `P2` em `propostas/DRIFT-revisao.md`, e **o precedente de qual marca usar já
> existe.**

---

# O que já foi recusado, e por medição

**Esta seção não é história.** Ela existe para que uma escolha derrubada por medição não volte porque
ninguém lembrava do número.

| | quando | por quê |
|---|---|---|
| **Medida de 50 caracteres** | 11/08 | ritmo de ensaio de oito minutos, retorno de linha a cada ~8 palavras — **cansa em 300 páginas** |
| **Entrelinha 1,30** | 11/08 | mesma medição |
| **Bleed de título** | entrou, e caiu no dia seguinte | o olho tinha de sair da coluna e voltar a cada capítulo. **Sobrou** a régua atravessando na fronteira de capítulo, com o título alinhado ao texto |
| **Raio de 4px** | — | perdia a nitidez do 0 sem comprar a simpatia de uma curva de verdade |
| **Fundo escuro na barra de seleção** | — | tinta cheia é o elemento mais alto da paleta, e o alto é da exceção |
| **Cor de marca-texto no destaque** | — | seria o único elemento saturado da tela, mais alto que o acento |
| **`html { font-size: 14px }`** | — | anula a preferência de tamanho de fonte de quem lê muito |
| **Dock de navegação na Estante** | — | repetia Capas/Estante, que já estão no seletor acima |

---

# O que este documento ainda não cobre

Nada aqui é omissão por descuido — são pontos genuinamente não decididos, e estão em `ABERTO.md`.

- **Componentes.** Este documento cobre fundamentos e regras de composição. **Não existe catálogo de
  componentes** com estados, variantes e anatomia.
- **Tema escuro como norma.** Ver acima.
- **Comportamento em toque, e regra de escala do Canvas acima de ~50 itens** — é a `D14`. Não
  bloqueia: Canvas é desktop-only no V1 `DEC-0023 §5`.
- **A ordem dos cinco lugares na barra.** Nomeá-los numa sequência não a torna norma de layout
  `DEC-0024 §9`.
- **Se e quando existe uma fonte de design formal**, e em que forma — arquivo de design, tokens em
  código, ou os dois. Quando existir, o papel do protótipo migra por nova decisão `DEC-0033 §6`.

---

## As decisões que sustentam este documento

| | |
|---|---|
| `DEC-0019` | Arquitetura de experiência — §3, §4, §7, §8 |
| `DEC-0020` | Instrumentação — §4, ter dado não autoriza fingir certeza |
| `DEC-0023` | Paridade de valor, não de interface — §3, §5 |
| `DEC-0024` | Os cinco lugares — §8, §9 |
| `DEC-0033` | O Protótipo de Produto do Mekora — §2, §4, §5, §6 |

Elas vivem em `erik-project-os/decisions/`. Os valores e regras marcados **REGRA** e **MEDIDO** vêm
do Protótipo de Produto do Mekora, que é referência vigente por `DEC-0033 §5`.
