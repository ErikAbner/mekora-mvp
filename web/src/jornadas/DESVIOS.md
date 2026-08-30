# O que mudou em relação ao desenho, e por quê

O nó `895:10286` foi desenhado **antes** do sistema de 29/08. Onde ele e o sistema
discordam, o registro fica aqui: nada foi "melhorado" em silêncio.

A ordem de autoridade que decidiu cada linha: **REGRA escrita > desenho vigente**.
Onde o desenho traz um valor solto que o sistema já nomeou, o token vence, porque
é isso que o portão vai cobrar da página servida.

## Cor: dez valores soltos viraram token

| no desenho | virou | por quê |
|---|---|---|
| `bg-white` | `surface/base` `#f9f9f9` | off-white em vez de branco puro, primeira linha da regra de Cor |
| `#111` (título) | `text/strong` `#151515` | mesma tinta cheia, valor decidido |
| `#282828` | `text/strong` | não existe no sistema |
| `#cfcfcf` (borda da nav) | `border/subtle` `#b1b1b1` | não existe no sistema |
| `#e0e0e0` (borda do chip) | `border/subtle` | idem |
| `#6b6b80` (texto do chip) | `text/secondary` `#6a6a6a` | o `80` no azul puxa a cor para fora do neutro |
| `rgba(255,255,255,.8)` | `surface/base` | superfície translúcida esconde o par de contraste real |
| `bg-black` (rodapé e botão) | `surface/inverse` `#161616` | preto puro não existe no sistema |
| `#d5d5d5` (links do rodapé) | `text/on-inverse` `#f3f3f3` | não existe no sistema |
| `#585858` | `text/primary` `#535353` | idem |

## Geometria: o raio dos chips — e um erro meu, corrigido

Os chips de formato tinham `border-radius: 16px`. Eu os **zerei**, citando *"raio
zero em ação e estrutura é REGRA"*.

**A regra existe e não cobre este caso.** Ela é explícita sobre o que recebe cada
valor:

```
--r1  0px      ação e estrutura: botão, campo, card, lista, folha
--rp  pílula   dado: tag, chip, trilho, interruptor
```

Um chip de formato de arquivo é **dado**. Por regra ele é **pílula**. O desenho
estava em 16px, que é errado dos dois lados — nem a nitidez do zero, nem a curva
de verdade —, e a minha correção trocou um erro por outro.

Corrigido para `999px`. Fica registrado porque o defeito foi citar uma regra
verdadeira para um caso que ela não governa, e isso é mais difícil de pegar do
que inventar regra.

## Tipografia: três corpos fora da escala

| no desenho | virou | por quê |
|---|---|---|
| `14/16` nos chips | `14/22` (`Label/Small`) | entrelinha abaixo da regra `corpo + 8` |
| `16/16` no "não é preciso criar conta" | `16/24` (`Label/Medium`) | idem |
| `28/24` nos links do rodapé | **não implementado** | entrelinha menor que o corpo, o mesmo defeito do antigo `Heading/H5-Bold-28`. E o conteúdo é `Link link link`: placeholder |

**O rodapé saiu inteiro, menos a marca.** Os quarenta nós de `Link link link` são
um componente que nunca foi preenchido, e o Erik pediu para pausar essa parte até
o rodapé do site existir. Sistematizar placeholder é polir o que vai ser
substituído.

## O que NÃO foi corrigido, de propósito

**As sombras da nav.** Cinco camadas quase invisíveis, entre 0 e 4% de opacidade.
O idioma do produto pede *poucas* sombras, não zero, e um elemento que flutua sobre
a página é o caso em que uma sombra sutil é o certo. Ficaram.

**A largura de 1920px do quadro.** O desenho é de uma tela específica; a
implementação é fluida, com o conteúdo limitado por `max-width`. Copiar 1920 fixo
seria copiar a moldura em vez do desenho.

---

# Estante — grade (`895:7315`)

## Os três estados do desenho falham AA. Os três do sistema passam.

Este é o desvio que mais importa, e não é preferência: é conserto.

| papel | no desenho | sobre base / sunken | no sistema | sobre base / sunken |
|---|---|---|---|---|
| ok | `#1da832` | 2,98 / 2,82 **falha** | `#2f7d55` | 4,77 / 4,52 passa |
| perigo | `#dd2525` | 4,57 / 4,33 **falha** | `#b23b2a` | 5,62 / 5,33 passa |
| atenção | `#e2791e` | 2,85 / 2,71 **falha** | `#976519` | 4,76 / 4,52 passa |

## Cor: mais sete valores soltos

`#d8d8d8` e `#dfdfdf` e `#e0e0e0` viraram `border/subtle`. `#636363` e `#666668` e
`#727274` viraram `text/secondary`. `#d3d3d3` virou `text/on-inverse`. E o
`#0c0d0d` da borda da capa virou `text/strong` — ele é o valor **antigo** do
`text/strong`, de antes da reconciliação neutra.

## Um alarme do portão que era verdadeiro, e o conserto certo

O portão acusou o número do marcador de notas em **1,05** — `#f3f3f3` sobre
`#f9f9f9`. Na tela ele estava certo, sobre o balão escuro.

**Não era falso alarme para calar.** A forma do balão estava como *irmã*
absolutamente posicionada atrás do número, então a árvore dizia que o fundo do
número era a página. Uma árvore que só fica certa quando pintada é uma árvore que
leitor de tela, seletor de CSS e instrumento nenhum consegue ler.

O conserto foi pôr a máscara no **próprio** elemento, com o fundo escuro nele e o
número dentro. Agora o fundo do número é o balão na tela **e** na árvore.

## O que veio do desenho sem mudar

O raio de pílula da etiqueta `#Design` e a borda de 2px na capa. Os dois estão
certos por regra: `--rp` é de dado (tag, chip, trilho, interruptor) e `--rm` é de
mídia recortada, para o canto não brigar com a borda.

---

# Leitura (`895:10472`)

## Eu tinha trocado os dois conjuntos de pastel

Chamei o conjunto `claro` de **`capa/*`** raciocinando *"área grande pode ser
sutil"*, e o `vivo` de **`nota/*`** por *"marca pequena precisa ser vista"*.

**A leitura mostra que é o contrário**, e a medição confirma. O destaque existe
para receber texto por cima, e só o `claro` mantém a prosa legível:

| matiz | vivo, com a tinta da prosa | claro, com a tinta da prosa |
|---|---|---|
| verde | 4,36 **falha** | 5,08 ok |
| rosa | 2,18 **falha** | 3,47 **falha** |
| amarelo | 4,23 **falha** | 5,00 ok |
| azul | 2,70 **falha** | 3,92 **falha** |

Meu raciocínio media a coisa errada: contraste do destaque **contra o papel**, que
é sobre notar a marca. O que decide é o contraste **do texto sobre a marca**, que
é sobre continuar lendo.

Os nomes `nota/*` e `capa/*` no Figma estão trocados e precisam de um ato.

## A prosa estava na tinta mais fraca do sistema

O desenho põe o texto do livro em `text/secondary` — a terceira tinta — num
produto cuja razão de existir é ler. Com destaque atrás, o rosa dá **3,47** e o
azul **3,92**: reprovam.

Com `text/strong`, os oito pares passam, o pior deles em **11,71**. Medido na
página servida:

```
#151515 sobre #efffbf  17,15      #151515 sobre #bfdfff  13,23
#151515 sobre #fff8bf  16,90      #151515 sobre #ffbfc0  11,71
```

## O destaque virou `<mark>`, e não retângulo posicionado

O desenho tem **oito retângulos** com `top` e `left` em pixel, atrás do texto.
Isso quebra na primeira mudança de corpo, de largura ou de idioma — e some para
leitor de tela: o trecho destacado deixa de ser destacado e vira um retângulo
colorido ao lado de um texto qualquer.

`<mark>` acompanha o texto **porque é o texto**, e é anunciado como marcação. Os
destaques do exemplo vêm por **índice de caractere**, que é como eles chegarão do
servidor — não por coordenada de tela.

## Cada passo virou endereçável, e isso não é conveniência

`?passo=leitura` abre a tela direto. Sem isso o portão precisa clicar pela jornada
inteira para chegar na última, o que amarra a medição da estante ao funcionamento
do upload: uma falha no backend viraria *"a estante tem defeito de contraste"*.

**Tela medível sozinha é a diferença entre um portão que diz ONDE está o problema
e um que só diz que existe.**
