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

## Cor · REGRA

**Editorial utility.** Off-white em vez de branco puro, preto levemente suavizado.

```
FUNDO      --bg #faf9f5   --bg-2 #f4f3ef   --bg-3 #edebe4   --nav #f4f3ef   --branco #ffffff
TINTA      --ink #151515  --ink-2 #57534d  --ink-3 #6f6b64  --ink-4 #b5b0a8
FILETE     --line 12%     --line-2 7%      --line-3 24%          (de #151515)
ACENTO     --acc #c8481f  --acc-soft #fdf0ea
ESTADO     --ok #2f7d55   --warn #a8701c   --dan #b23b2a         (+ as três -soft)
PAPEL      --paper #f1eee7
```

### As três regras que governam a cor

**1 · As camadas vêm do fundo, não da borda.** É o que permite tirar borda de quase tudo. Um degrau
de superfície é uma troca de `--bg`, não um contorno.

**2 · O acento está reservado à exceção.** Ele não marca o caminho principal, não marca o estado
normal e não marca frequência. Marca o que precisa de atenção.

**3 · Tinta cheia é o elemento mais alto da paleta, e o alto é da exceção.**

> **Gastar preto no gesto mais frequente do produto seria inflação.**

É por isso que a barra de seleção — o gesto mais repetido de todo o produto — é lasca de papel com
filete, e não fundo escuro.

### Não há cor de grifo · REGRA

O destaque no texto usa **a mesma camada que o sistema já usa para separar superfícies**, e mora
dentro da linha. Cor de marca-texto seria o único elemento saturado da tela — **mais alto que o
acento**, que está reservado à exceção.

### Contraste · MEDIDO

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

## Tipografia · REGRA

```
--ui      -apple-system, "Segoe UI", Inter, "Helvetica Neue", Arial, sans-serif
--serif   "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif
--mono    ui-monospace, "SF Mono", Menlo, Consolas, monospace
```

**A escala, e a entrelinha inversa** — quanto maior o texto, menor a entrelinha:

| | tamanho | entrelinha | tracking |
|---|---|---|---|
| display | `clamp(2.6rem, 1.6rem + 3.4vw, 5.2rem)` | .94 | −.03em |
| h1 | 2.15rem | 1.06 | −.025em |
| h2 | 1.5rem | 1.2 | −.015em |
| h3 | 1.14rem | 1.34 | — |
| leitura | 1.16rem | **1.62** | — |
| ui | .94rem | 1.5 | — |
| pequeno | .83rem | — | — |
| mono | .68rem | — | +.06em |

### A escala está em `rem`, e isso é regra de acessibilidade · REGRA

O `clamp` opera sobre **o tamanho que a pessoa escolheu no navegador** — de 87,5% a 125% dele.

Fixar `html { font-size: 14px }` daria a mesma identidade visual e **anularia a preferência de
tamanho de fonte** de quem lê muito, que é exatamente quem a aumenta. **Inaceitável.**

## Medida de leitura · MEDIDO

```
--col   575px  →  675px (≥1200)  →  775px (≥1600)
```

**A medida é o alvo; a largura é consequência.** Na leitura paginada, o número de colunas é calculado
da largura real: com `column-width` solto, cabia uma coluna só numa tela de 1440 e ela esticava para
**133 caracteres por linha**. Contando quantas medidas cabem e transformando o resto em margem,
**mede 69** em 1100, 1440 e 1920.

Outras medidas usadas, e todas medidas na captura, não escolhidas: `60ch` para citação dentro de
grupo — *"a caixa é larga; a linha, não"* —, `52ch` e `56ch` para texto auxiliar.

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
