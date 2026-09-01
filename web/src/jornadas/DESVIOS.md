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

---

# Conta — preferências (`895:10715`)

## O teste dos componentes do design system, e o resultado

Esta tela existia para responder uma pergunta: **os onze componentes construídos
servem?**

**Não servem para esta.** Ela é feita de **seis grupos de escolha**, e entre os
onze não há rádio, caixa de marcar nem interruptor. O que dava para aproveitar
era `Text` e `Divider` — e nenhum dos dois é o problema.

Os onze são: Button, Chip, Divider, Icon, IconButton, Input, Link, Text, Toast,
mais `AdContainer`, `CommentsDisabled`, `Article` e `Flag` — **estes quatro são
do produto de notícias de onde o template veio**, e não têm uso aqui.

Então `Escolha` nasceu no produto, e não no `mekora-ds`: o design system é cópia
de terceiro sob MIT, e componente do Mekora não entra lá.

## Três decisões que o desenho não tomava

**A forma é quadrada, e o custo fica escrito.** Vem da regra — raio zero em ação e
estrutura — e do próprio desenho. Mas redondo contra quadrado é **como o olho
distingue "escolha uma" de "marque quantas quiser"**. Se um dia existir caixa de
marcar no produto, ela precisa de outra distinção que não seja a forma.

**O selecionado é degrau de superfície.** O desenho não mostrava este estado:
todos os quadrados estão vazios nele. A regra decidiu — seleção é superfície,
nunca matiz.

**A borda era `#878787`**, o mesmo valor que estava cravado nos ícones e que não
existe no sistema. Virou `border/subtle`.

## É um `<input type="radio">` de verdade

Um `<div>` com `onClick` parece igual e não é: perde seta do teclado, perde
agrupamento por `name`, perde o anúncio de *"opção 2 de 3"*, e perde o
comportamento de formulário. O que se desenha é a aparência; **o que responde
continua sendo o controle nativo**.

O input fica com `opacity: 0` e não `display: none` — `display: none` tira do
foco. E o `:focus-visible` é desenhado na marca, porque o controle está
invisível: sem isso, quem navega por teclado não sabe onde está.

`fieldset` e `legend` não são decoração: são o que faz o leitor de tela anunciar o
título do grupo antes de cada opção. Um `<p>` solto acima das opções fica órfão.

Conferido na página servida: **6 grupos, 13 rádios, agrupamento por `name`
funcionando**, seleção trocando dentro do grupo certo.

---

# D · Apresentação (Figma 895:7063)

## Quatro erros de escrita no desenho, corrigidos

O desenho traz `photografia`, `capitulos` sem acento, `letra , há` com espaço
antes da vírgula, e `todos sem sumário você vai marcar` sem a pontuação que
separa as duas orações. Foram para `fotografia`, `capítulos`, `letra, há` e
`todos sem sumário. Você vai marcar`.

Copiar erro de digitação é a leitura mais literal possível do desenho e a menos
fiel à intenção dele. Se algum for deliberado, é só dizer e eu volto.

## Três cores fora do sistema, trocadas pelo token

| onde | no desenho | virou |
|---|---|---|
| citação de "O livro não termina" (`895:7232`) | `#666668` | `text/secondary` |
| chip `.cbr` (`895:7275`) | `#727274` | `text/secondary` |
| links do rodapé (`895:7308`) | `#d5d5d5` em 28px | o `Rodape` do produto |

As três são vizinhas do token e nenhuma delas existe na paleta. As duas primeiras
são erros isolados: os outros cinco chips da mesma fileira usam o token certo.

## O que estava repetido no desenho, e entrou uma vez

- A seção "PDF não é um livro" aparece **duas vezes** dentro do mesmo bloco
  (`895:7173` e `941:22531`), com texto idêntico ao caractere.
- A legenda "Um relatório de pesquisa sem capa…" aparece **três vezes**
  (`895:7195`, `895:7285`, `895:7306`).

Repetir o mesmo parágrafo três vezes numa página só ensina a pessoa a pular. Cada
um entrou uma vez, na primeira posição em que aparece.

## O rodapé: os lugares que existem, e não "Link link link"

O desenho traz quatro colunas de `Link link link` — marcador de posição, porque o
rodapé do site ainda não foi decidido. A tela usa o `Rodape` do produto, que
lista o que existe. Um link morto é pior que um link a menos.

## As duas seções de imagem: uma virou capa de verdade, a outra não entrou

**A das três capas (`895:7183`) entrou** com as capas do próprio produto, servidas
de `publico/capas/`. A legenda ao lado fala exatamente de capa montada pelo
Mekora — mostrar capa de verdade é o que a seção afirma.

**A do mockup grande (`895:7279`) ficou de fora — e depois entrou.**

Omiti porque o MCP recusava exportar o asset, e um retângulo cinza seria o
placeholder que esta rodada existe para eliminar. **O erro foi anterior a isso:
eu tinha lido a estrutura da tela nó por nó e nunca a VI.** Quando o Erik
perguntou se eu estava enxergando a tela e eu peguei a captura, o retângulo de
1540×858 não era imagem — era **a própria Estante do Mekora**, com cabeçalho,
recortes, grade de capas e ficha ao lado.

Então ela é **construída, e não fotografada**. Uma captura envelheceria na
primeira mudança da Estante, e a landing passaria a mostrar um produto que não
existe mais — que é exatamente o que uma página de apresentação não pode fazer.

É vitrine, e não a Estante: nada clica, e `inert` garante isso para teclado e
leitor de tela. Uma cópia interativa da Estante numa landing seria uma segunda
Estante para manter.

**Duas coisas do desenho não entraram, e as duas são capacidades que a Estante
ainda não tem:** o alternador *"Capas / Estante em 3D"*, e o *"80% lido"* com
barra. O produto guarda capítulo e deslocamento, não páginas lidas — a vitrine
mostra `capítulo 2 de 3`, que é o que a ficha real mostra. Uma landing que promete
um número que a Estante não tem mente duas vezes.

## A lombada estava vazia

No desenho ela carrega o **título na vertical**, lendo de baixo para cima, como
título de lombada é impresso. A minha era um retângulo cinza: não diz que aquilo
é um livro de pé, diz que falta alguma coisa ali.

Outra que só apareceu ao ver a tela, e não ao ler a estrutura.

## Os chips mostram a lista do servidor, e não os seis do desenho

O desenho fixa `.pdf .epub .docx .cbz .cbr .zip`. A tela mostra o que
`/formatos` responde — hoje onze. **A lista vem de quem decide:** escrita à mão
ela divergia do backend nos dois sentidos, e nenhuma das metades aparece
testando. Oferecer a mais dá erro depois do upload; esconder de menos não dá erro
nenhum, a pessoa simplesmente não tenta.

## O cabeçalho não é o das jornadas

O `Cabecalho` lista os quatro lugares do produto. Esta é a única tela escrita para
quem ainda não entrou, e oferecer Canvas e Estudos a quem nunca soltou um arquivo
é oferecer porta que não abre. O daqui tem dois destinos, e os dois levam a algum
lugar: uma âncora para "Como funciona", nesta mesma página, e `/entrar`.

## Três medidas que o desenho não fecha em 1440

O desenho é de 1920. Em 1440:

1. **As três capas** somavam 1588px e a terceira saía pela direita. Os itens
   ganharam `min-width: 0` — sem ele o item flex não encolhe abaixo do conteúdo —
   e a lombada virou proporção (11,7%, que é 72 de 614) em vez de 72px fixos.
2. **Os números dos passos** têm larguras diferentes, e os títulos de 1 e 4
   começavam 17px à esquerda dos de 2 e 3. Ganharam largura fixa de 64px. O
   desenho compensa isso com um gap maior só no primeiro item, o que resolve para
   `1` e quebra em qualquer outro dígito.
3. **O gap dos passos** caiu de 64 para 48: com 64 sobravam 472px de texto e
   "Mostra o que encontrou e o que vai fazer" quebrava em duas linhas. O desenho
   pede 489px para essa linha, e 48 os devolve.

E uma que o desenho não tem: em 390px o cabeçalho somava 517px e a página ganhava
rolagem horizontal. A marca encolhe para 24px, os atalhos perdem respiro lateral
e o cabeçalho quebra linha se precisar.

## A área de soltar virou componente

Ela nasceu na `MesaVazia` e a Apresentação precisa dela duas vezes — topo e fim.
Três cópias de sessenta linhas, cada uma com seu próprio `fetch` da lista de
formatos, seriam três chances de uma delas parar de buscar sem ninguém ver: as
três continuariam mostrando a lista de espera.

Saiu para `componentes/Soltar.jsx`, e os chips para `componentes/Formatos.jsx`,
porque a Apresentação os mostra também fora da área de soltar.

Medido depois: a Mesa continua passando no portão, com os mesmos 33 nós.

---

# Conta — visão geral e segurança

**As duas foram construídas SEM O DESENHO.** O `figma-local` é o único conector
que alcança o arquivo do Mekora, e ele exige o Dev Mode ligado no app — a aba
estava em `mode=design`. O conector remoto está autenticado na conta da empresa e
responde *"you don't have edit access"* nesse arquivo, que é da conta pessoal.

Então elas são **candidatas para o pente fino**, e não telas conferidas. O que
está abaixo é o raciocínio de cada decisão, para a conversa ser sobre escolhas e
não sobre adivinhação.

## Por que a visão geral existe

`/conta` renderizava a tela de **Dispositivos Kindle**. A trilha da conta promete
quatro destinos e dois abriam a mesma coisa, com o primeiro mentindo sobre o que
é. Um item de menu que leva a outro lugar é pior que um item a menos: ele ensina
que o menu não é confiável.

## Nenhum número dela é escrito à mão

O e-mail e a data vêm do `/eu`; as contagens vêm do `/privacidade`, que é a mesma
fonte que a tela de Privacidade lê. Copiar os números daria dois lugares
contando, e dois lugares contando divergem — é só questão de quando.

A tela só mostra a linha cuja contagem **veio como número**. Uma contagem ausente
virando `0` afirmaria que está vazio, e ausência não é vazio.

## Segurança: o que faltava era o backend

O modelo `Sessao` guarda criação, último uso e vencimento **desde que existe**, e
não havia nada que os mostrasse. O `/sair` encerra só este navegador: não havia
como responder *"onde mais estou logado?"*, nem derrubar um computador
emprestado ou um celular perdido.

Entraram `GET /sessoes`, `POST /sessoes/{id}/encerrar` e
`POST /sessoes/encerrar-outras`.

**A linha nunca carrega o token.** O que o banco guarda é o resumo `sha256`, e
devolvê-lo daria a quem lesse a resposta a metade que falta para reconhecer uma
sessão. Qual delas é este navegador é decidido no servidor, comparando resumo com
resumo, e o que chega à tela é um booleano.

**404 e não 403** quando a sessão é de outra pessoa: dizer *"existe, mas não é
sua"* confirma a existência de sessão alheia para quem testar ids em sequência.

Provado com duas contas: o intruso recebe 404, a vítima continua logada, e o
intruso só enxerga a própria sessão. Sem conta, `encerrar-outras` responde 401.

## O que a tela NÃO diz, e por quê

Não há *"Chrome no Mac"*, nem cidade, nem "última vez em São Paulo". O Mekora
**não guarda user-agent nem IP** — e inventar um nome de aparelho a partir de
nada daria à pessoa uma certeza falsa justamente na tela onde ela decide se uma
sessão é dela. O que aparece é o que o servidor sabe: quando foi usada por
último, e quando vence.

"Há 3 dias" em vez da data: ninguém lembra em que dia entrou, mas todo mundo sabe
se usou o Mekora ontem.

## `encerrar-outras` mantém este navegador

É a ação de quem desconfia de alguma coisa, e ela precisa não derrubar quem a
está executando — senão o remédio pede o link de novo, e a pessoa fica de fora
junto com quem queria tirar. A resposta devolve **quantos caíram**, porque
"pronto" sem número não deixa saber se havia alguma coisa lá, que é exatamente o
que ela quer saber.

## O cabeçalho fica fora do `.conta`

`.conta` é a linha de trilha mais painel. Com o cabeçalho dentro ele vira uma
terceira coluna e empurra o painel para fora da tela — foi o que a primeira
captura mostrou, com o painel cortado pela direita.

---

# Preparo — o veredito cravado, e os dois estados que faltavam

## Três coisas que a tela afirmava sem o servidor saber

**"Nenhuma página corrompida — N de N abriram sem erro."** Não existe campo de
página corrompida no `ProcessingJob`. A frase era verdadeira por acaso, e
apareceria igual num arquivo com metade das páginas quebradas. Virou o fato que
existe: `N páginas · Contadas na análise do arquivo`.

**"N páginas, todas abriram"** no veredito, pela mesma razão. Virou `N páginas
lidas`.

**"Capa gerada — o arquivo não tinha nenhuma."** Aparecia sempre, inclusive sobre
arquivo com capa. **Minha primeira correção trocou a afirmação falsa por outra:**
li `cover_path` e as `thumbnails` como prova de que o arquivo trazia capa, e
disse *"o arquivo já traz uma"* — mas `cover_path` só é preenchido quando a
pessoa **escolhe** uma miniatura (`jobs.py:996`), e as miniaturas são páginas
renderizadas do documento, não uma capa própria.

O backend **não sabe** se o arquivo tem capa. Então a tela diz o que vai fazer, e
não de onde a capa veio: escolheu uma página, ela vira a capa; não escolheu, o
Mekora monta uma.

## "Running…" na cara de quem esperava

O contrato fazia `etapa: j.phase || andando[0]`, e `derive_phase` no backend
devolve o **vocabulário canônico de máquina** — `pending | running | completed |
failed | blocked`. A tela de Preparo mostrava **"Running…"** num produto inteiro
em português.

`phase` serve para decidir, não para mostrar. O rótulo humano é a lista que o
próprio `estado.js` já mantém em português — *convertendo*, *traduzindo*,
*enviando ao Kindle*. O `phase` continua disponível como `fase`, num campo
próprio.

## Os dois estados

`converter()` era chamado e a tela navegava para a Mesa **no mesmo instante**. Um
PDF digitalizado de trezentas páginas leva minutos com OCR, e a pessoa ficava na
Mesa sem saber se algo estava acontecendo.

**Em andamento** usa o `acompanhar()` que já existia no contrato e nunca tinha
sido usado aqui. Ele para sozinho em três casos — pronto, erro, ou o teto — e o
teto é relatado.

**A barra só aparece quando o servidor manda porcentagem.** Quando não manda, a
tela diz *"O servidor não informa quanto falta nesta etapa"*. Uma barra que anda
sozinha sem dado por trás é a mentira mais comum desta tela em qualquer produto.

**Pronto** é uma tela, e não um empurrão de volta para a Mesa: quem esperou a
conversão quer saber que terminou, e escolher o que fazer.

### E o desenho mostrou que eu tinha escolhido as ações erradas

O nó `895:8164` traz **Enviar ao Kindle**, **Baixar EPUB** e **Abrir na estante**.
A minha primeira versão oferecia "Ler agora", "Ver na estante" e "Preparar
outro" — e perdia as duas ações que a tela existe para dar.

**Baixar não existia em tela nenhuma do produto.** A Apresentação promete *"Solte
ele agora, receba o resultado e baixe"*, e não havia como baixar em lugar
algum. O endpoint `/storage/output/{endereco}/{arquivo}` já existia; nada o
usava.

O link usa o `endereco` — o token público do trabalho —, que é o que a rota
aceita sem sessão, e é caminho relativo pela mesma regra que o contrato já
escreveu: o caminho é o mesmo em dev e em produção, porque a borda repassa
`/storage` para `/storage`.

Provado: `HTTP 200`, 37.955 bytes, `application/epub+zip`. Com chave inválida,
404.

**O tamanho do arquivo não entrou.** O desenho mostra "8,4 MB", e o backend não
expõe bytes em lugar nenhum — nem o `status` nem o job completo. Inventar um
número numa faixa que existe para dar certeza seria o oposto do que ela faz.
Ficou o nome do arquivo, que é verdade.

Medido com conversão real de ponta a ponta: o clique dispara, a tela mostra
*"Convertendo…"*, e termina em *"Medida está na estante."*

---

# Ajuda e Atualizações

**As duas foram construídas sem o desenho**, pela mesma razão das telas de Conta:
o `figma-local` exige o Dev Mode ligado. São candidatas para o pente fino.

## O acordeão não acordeava nada

`display: flex` num filho de `<details>` **anula o esconder nativo**: o navegador
esconde os filhos de um `details` fechado por um `display: none` implícito, e
qualquer `display` declarado no filho ganha dele.

Medido: com os dez fechados, `.ajuda-resposta` tinha altura maior que zero — as
dez respostas apareciam de uma vez, e o `+` não fazia nada. Só apareceu porque a
medida perguntou pela altura, e não pelo `open`.

## A Ajuda foi refeita quando o desenho apareceu, e a mudança é de tese

Eu a construí **por assunto**, com nove perguntas em acordeão. O nó `895:11193`
decide o contrário: **por tarefa**. Quatro tarefas em destaque no topo — conectar
o Kindle, preparar o primeiro arquivo, o envio que não chegou, os dois modos —, e
só abaixo delas a lista por categoria, com resposta de uma linha.

O próprio changelog do produto já tinha essa decisão escrita: *"Ajuda por tarefa,
não por índice."* Eu tinha feito o índice.

A diferença não é de arrumação. Quem abre a ajuda está tentando **fazer** alguma
coisa, e um índice pede que ela primeiro descubra em que categoria o problema
dela mora. Os botões das quatro tarefas não abrem artigo sobre a tarefa: abrem a
tarefa.

**O campo de busca do desenho não entrou.** A busca do produto não existe — o
próprio cabeçalho traz o botão desligado dizendo isso —, e uma busca que só olha
esta página encontraria menos do que a página mostra inteira.

**Cada resposta leva ao lugar onde ela pode ser conferida.** Ajuda que não leva a
lugar nenhum obriga a pessoa a procurar de novo, agora com a resposta na cabeça e
sem saber onde aplicá-la. E é o que mantém a página honesta: se uma capacidade
mudar, a tela citada desmente o texto, e a pessoa descobre antes de nós.

## O desenho apareceu depois, e a metade que faltava era a segunda

O `figma-local` voltou no fim da sessão, e o nó `895:11060` mostrou o que a minha
versão tinha perdido: o subtítulo é **"O que mudou e, principalmente, o que ainda
não é confiável"**, cada item traz uma etiqueta vertical — *novo*, *melhorado*,
*corrigido* — e existe uma seção final chamada **"O que ainda não está de pé"**.

Isso não é detalhe de layout. É o produto dizendo o que não faz na página que
existe para se gabar: uma tela de atualizações só com acertos é release note; com
a segunda metade, é um lugar onde dá para confiar no que a primeira diz. Eu tinha
feito só a primeira.

**Um item do desenho saiu**, e a razão importa. Ele lista *"Entrar e sair da conta
— decisão pendente: o método de acesso ainda não foi escolhido, então não existe
tela de senha, de provedor nem de sessões"*. A decisão foi tomada — é link por
e-mail, sem senha — e a tela de sessões que ele dizia não existir agora existe.
Uma pendência resolvida que continua listada é pior que nenhuma lista: ela ensina
que a lista não é atualizada.

**O portão pegou um link azul.** `#9e9eff`, o padrão do navegador no tema escuro,
num bloco novo que esqueceu a cor.

## Atualizações não é o `git log`

Derivar do histórico seria fácil e errado: o commit fala de arquivo, e quem usa
quer saber o que passou a funcionar. Refatoração não é notícia, e três commits
podem virar uma linha.

**A curadoria é do Erik.** O que está lá foi escrito a partir do que efetivamente
entrou nesta sessão, e ele decide o que merece aparecer — inclusive se a tela
deve existir antes de haver público.

A data fica em ISO no dado e é formatada na tela: escrita "1 de setembro" ela não
ordena, e ordenar à mão é como a lista sai de ordem sem ninguém ver.

## As duas são públicas, e o rodapé ganhou uma coluna

Quem ainda não entrou tem dúvida, e quem nunca vai entrar tem direito de saber o
que mudou. Elas não ficam na coluna da conta no rodapé, que exige sessão — ficam
numa coluna "O produto", junto com a Apresentação.

---

# Estudo — página

**A lista já mostrava o estudo inteiro** — pergunta, notas, trechos, ações — e era
isso o problema: três estudos de vinte notas cada viram uma página de rolagem
infinita onde nenhum deles se lê. A pergunta que o estudo faz some no meio das
notas dos outros.

A página **reusa o componente `Estudo` da lista**, e não uma cópia. Duas cópias
divergem: uma ação acrescentada num lugar aparece só nele, até alguém notar meses
depois. O que muda é o entorno.

## A rota é `/estudo/:id`, no singular

`/estudos/:id` **cai abaixo de `/estudos`, que é caminho do backend**, e a borda
manda tudo abaixo dele para a API — a tela viria em branco em produção e
funcionaria em desenvolvimento, que é o pior lugar para descobrir.

`scripts/rotas.py` pegou antes de virar commit, e apontou o precedente: é o mesmo
caso que `/notas` teve, resolvido do mesmo jeito.

## "Buscando…" para sempre

Derivei `carregando` de `!estudos.length && !erro`, e uma conta **sem nenhum
estudo** ficava presa em *"Buscando o estudo…"* — a condição nunca deixava de ser
verdadeira.

O hook `usarEstudos` **já expunha `carregando`**, e ele sabe a diferença entre
"ainda não respondeu" e "respondeu vazio". Era só perguntar a ele.

Três estados, e não dois: buscando, não existe, e o estudo. Mostrar "não existe"
enquanto ainda se busca é a maneira mais rápida de a pessoa ir embora de uma
página que ia carregar.

---

# Leitura — o padrão de imagem do desenho, e WebP na conversão

## As três larguras

O nó `895:10472` usa três medidas: a coluna de texto em **680**, a imagem larga
em **1540×830**, e uma faixa que sangra até a borda. O CSS daqui dizia o
contrário, com todas as letras: *"Ocupa a coluna do texto e não sangra para fora:
numa tela de leitura, imagem maior que a medida quebra o ritmo da coluna."* Era
decisão minha, e o desenho decide diferente.

680 + 430 + 430 = **1540 exato**. A grade de colunas nomeadas encaixa nas medidas
do desenho sem `margin` negativa nem `calc(50vw)`, e o mesmo padrão serve para
texto, imagem e faixa — em vez de três técnicas.

## Qual imagem recebe qual largura, e a prova que mudou o critério

Nenhum livro marca *"esta imagem é larga"*. O critério tem de sair do que existe
no arquivo, e o que existe é a **resolução nativa**.

Os limiares primeiro foram **1200** e **1600** — ambos MENORES que as larguras de
destino, 1540 e 1792. Uma varredura do critério achou **32 casos** em que uma
figura de 1210px seria esticada até 1540, que é exatamente o que a regra existe
para impedir.

Subir o limiar até a largura de destino resolveria e jogaria toda imagem de
1400px de volta para a coluna de 680 — desperdício do outro lado. A saída foi a
imagem **levar o próprio tamanho como teto**: `--natural` vira `max-inline-size`,
e "larga" passa a querer dizer *"pode passar da coluna, até onde seus pixels
alcançarem"*.

Medido com livro real: `2000×800` virou faixa cheia em 1856px; `1200×800` virou
larga em **1200px, e não 1540** — o próprio tamanho.

## O defeito que estava escondido há mais tempo

**Nenhuma imagem de livro aparecia na leitura.** O parser lia um `<p>`, não descia
para dentro dele, e a `<img>` sumia; como o parágrafo ficava sem texto, o filtro
de blocos vazios apagava o resto. E é assim que quase todo EPUB escreve figura:
`<p><img/></p>`.

Sem erro em lugar nenhum, porque não havia erro — havia um bloco a menos.

## WebP: dois arquivos, e não um

O EPUB que a leitura abre é **o mesmo que vai para o Kindle**, e o Kindle não lê
WebP de forma confiável. Trocar as imagens no arquivo único deixaria a leitura
mais leve e poderia quebrar o envio, que é a promessa mais visível do produto.

Então são dois. `livro.epub` continua como está e é o que a Amazon recebe;
`livro.web.epub` tem as mesmas páginas com as imagens em WebP, e é ele que
`leitura_url` entrega ao navegador. **A escolha é por destino, não por
preferência.**

Medido de ponta a ponta: **263 KB → 91 KB**, com as imagens caindo de 308 KB para
91 KB — **70% menor**. Em nove imagens reais do projeto, a média foi 59%: JPEG
fotográfico cai 72–83%, PNG cai 52–64% **sem perda** (`lossless`, porque desenho
de traço sofre com compressão com perda justamente na borda da linha).

Três coisas nunca são tocadas: **SVG**, que já é vetor; **GIF animado**, que
viraria imagem parada; e qualquer imagem que fique **maior** em WebP — gravar um
arquivo pior porque a etapa se chama "otimizar" seria trocar o objetivo pelo nome
dele.

E a etapa **nunca derruba a conversão**: se falhar, o livro continua pronto,
enviável e legível. Deixá-la propagar exceção transformaria uma otimização em
causa de falha de conversão.

**Quadrinho não ganha versão web.** Ele já é imagem de ponta a ponta, e o KCC
escolheu formato e tamanho para o aparelho.

## O portão parou de julgar o texto do livro

Ele reprovou a leitura por *"capitulo nao terminar"* — palavras do arquivo que a
pessoa enviou, não do produto. Um livro em inglês reprovaria inteiro, e um erro
de digitação do autor viraria defeito nosso. A regra de escrita vale onde o
produto escreve; `.prosa` e as citações de nota ficam de fora, e o resto da tela
continua medido.

## O que NÃO foi feito, e é decisão sua

O desenho não tem **"Capítulo anterior / Próximo capítulo"** — a leitura dele é
rolagem contínua. O produto tem os dois botões, e trocá-los por rolagem significa
carregar todos os capítulos de uma vez, o que muda memória, progresso e âncora de
nota. Está no resumo, para você decidir.


---

# A porcentagem lida — o que eu tinha chamado de impossível

Escrevi, na vitrine da Apresentação e em dois comentários do código, que **o
produto não sabe a porcentagem**: *"o servidor não conhece o tamanho do texto —
o EPUB é lido no navegador"*.

A primeira metade é verdadeira. A conclusão não era.

**O cliente conhece.** E não porque alguém tenha de abrir o livro inteiro para
contar: o índice do zip do EPUB guarda o **tamanho descomprimido de cada
entrada**, e esse índice já é lido por completo na abertura. A extensão de um
livro de oitocentas páginas custa uma consulta a um `Map` que já existe.

Eu tinha tratado como limitação de natureza o que era pendência com caminho — e
o caminho estava escrito. A colheita no GitHub de 31/08 já dizia, sobre a peça
irmã: *"As duas metades do requisito existem em contextos incompatíveis. **Esta
peça se escreve.**"*

## "capítulo 2 de 3" não é 66%

É o caso que derruba a medida antiga, e ele está no teste: um livro com prefácio
de vinte páginas e dois capítulos de quinhentas. Terminar o prefácio marcava **um
terço lido**; o número real é **dois por cento**.

## Bytes de XHTML, e a honestidade da aproximação

A extensão é medida em **bytes do arquivo**, não em caracteres de texto. Contar
caracteres exigiria abrir e parsear todos os capítulos na abertura — que é
exatamente o que o leitor evita para não travar a aba.

O byte carrega marcação junto, então a medida é aproximada. Ela é honesta porque
a marcação se distribui de forma parecida ao longo de um livro: um capítulo com
uma tabela enorme distorce, um livro inteiro não.

Dentro do capítulo aberto, aí sim é caractere — o `deslocamento` já era isso — e
a fração é normalizada para 0–1 antes de entrar na conta, porque as duas medidas
são de naturezas diferentes.

## Onde a conta mora, e por quê

No **cliente**. O servidor guarda e devolve `fracao`, e não deriva nada: ele
nunca vê o tamanho dos capítulos. A coluna é nula para leitura registrada antes
disso, e a ficha então cai no "capítulo N de M" — **nulo não é zero**, e zero
afirmaria que a leitura está no começo.

## O campo morreu no mapeamento, e a tela não reclamou

Na primeira medida, o `/history` já devolvia `fracao: 0.8963` e a ficha mostrava
*"no último capítulo"* com a barra em 100%. O `useJornada` montava o livro campo
a campo e `fracao` não estava na lista.

Nenhum erro em lugar nenhum: o dado chegava, era descartado, e a tela caía no
plano B sem nada indicar que existia um plano A.

## Provado com livro real

Aberto no Chrome, virado o capítulo e rolado até 60%: o servidor guardou
`{capitulo: 1, deslocamento: 246, capitulos: 2, fracao: 0.8963}`, e a ficha da
estante mostra **`Ana Duarte · EPUB · 89% lido`** com a barra em 89,63% e o
`aria-label` dizendo *"89 por cento lido"*.

## O que continua fora, e agora com o motivo certo

A **Estante em 3D** do desenho. Não é falta de projeto — a colheita leu os que
existem e registrou o veredito: *"quem faz 3D de verdade usa Three.js; quem faz
CSS faz retângulo decorativo com espessura constante e texto de 7px"*, e a única
linha aproveitável é `Math.max(4, Math.min(22, Math.round(pages / 35)))`. A peça
se escreve, e ela não estava no escopo desta rodada.

---

# Estante em 3D — a peça que a colheita disse que se escreve

O alternador **"Capas / Estante em 3D"** já existia na ficha: dois botões com
`aria-pressed` cravado e **sem `onClick`**. Era o desenho prometendo o que o
produto não tinha.

## Por que não havia de onde copiar

A colheita no GitHub de 31/08 procurou e fechou com número: *"13 arquivos, 10
deles o mesmo componente copiado entre repositórios — o ecossistema não tem dez
soluções, tem uma, replicada, e ela não atende."*

E o diagnóstico de por que não atende: *"quem faz 3D de verdade usa Three.js;
quem faz CSS faz retângulo decorativo com espessura constante e texto de 7px;
quem calcula espessura de lombada a sério está fazendo capa de impressão, em
LaTeX ou InDesign, em 2D. **As duas metades do requisito — espessura derivada e
tipografia legível em superfície rotacionada — existem em contextos
incompatíveis. Esta peça se escreve.**"*

## A espessura tem unidade

A única linha aproveitável era a do `hubcrm`,
`Math.max(4, Math.min(22, Math.round(pages / 35)))`, e o próprio documento já
dizia que ela seria trocada. Ela é um número por outro: 35 páginas por pixel não
sai de lugar nenhum, e o resultado não tem unidade — **dá o mesmo pixel numa
estante grande e numa miniatura**.

A conta em `contrato/lombada.js` é a da gráfica: duas páginas por folha, 0,1 mm
por folha de papel comum, 2 mm de capas. E o milímetro vira pixel pela **escala
da capa** — a proporção 420×594 é √2, o formato A, e um A5 tem 210 mm de altura.

O teste prova contra a régua: 200 páginas dão 12 mm, 300 dão 17, 600 dão 32. E
prova o defeito da linha antiga: **ela empata 800, 1000 e 2000 páginas em 22px**,
enquanto a conta daqui os separa em 59, 74 e 85.

## Sem Three.js, e não por economia

O desenho pede uma estante de capas vista de lado, não uma cena. Um canvas aqui
traria uma árvore que leitor de tela não percorre e teclado não alcança, para
desenhar retângulos que o CSS desenha com `rotateY`.

`rounded-r-[4px]` e `shadow-book` — os dois valores que a colheita marcou como "a
zerar" no componente replicado — ficaram zerados, o que a regra do sistema já
exigia.

## Dois defeitos que a medição pegou, e o olho não

**A capa cobria os vizinhos.** Ela começava em `inset-inline-start: 100%`, e 100%
é a largura do *elemento* — que cresce 84px quando o livro é puxado, para abrir
espaço. A capa nascia 84px adiante do lugar certo. Medido: a capa do livro de 900
páginas ia até 261px, e os outros dois moravam em 182 e 206 — cobertos inteiros.
O certo é `var(--espessura)`, o fim da lombada, que **não muda** quando o livro é
puxado.

**O `page_count` morria no schema.** Ele existe no modelo e no `JobResponse`
desde sempre, e faltava no `HistoryEntry` — então toda lombada da estante saía
com "espessura desconhecida". A tela estava certa ao dizer isso; o dado é que não
chegava.

## Livro sem contagem de páginas não ganha espessura de chute

Ele aparece com a lombada mínima e o `aria-label` diz *"espessura
desconhecida"* — em vez de inventar um número que a pessoa leria como
informação.

---

# Leitura em rolagem contínua

O desenho (`895:10472`) não tem *"Capítulo anterior / Próximo capítulo"* — a
leitura é uma rolagem só. Eu tinha levantado que trocar significaria carregar o
livro inteiro na abertura, o que trava a aba num livro de oitocentas páginas.

**A saída foi do Erik:** carregar em janela, como jogo faz com terreno. Alguns
capítulos por vez, e mais quando a pessoa se aproxima do fim do que existe.

## Para cima também, e isso não era opcional

A janela abre **onde a pessoa parou**. Quem parou no capítulo 6 abre o livro ali
— e sem carregar para cima, os seis anteriores ficariam inalcançáveis: a rolagem
contínua tinha acabado de tirar os botões de virar, que eram a única forma de
voltar.

Ao inserir um capítulo **acima** do que está na tela, a rolagem é compensada pela
diferença de altura. Sem isso o texto salta sob os olhos de quem lê — o defeito
clássico de lista infinita bidirecional.

## Três defeitos, e nenhum apareceu olhando

**1 · O grid não alcançava os blocos.** Cada capítulo é uma `<section>` com
`display: contents`, e isso faz os blocos participarem do grid — mas no DOM eles
continuam sendo **netos**, e `.prosa > *` não os pega. Sem `grid-column`, o grid
colocou cada bloco onde coube.

O sintoma não foi um layout torto visível: foi a **janela parar de crescer aos
seis capítulos**, porque a sentinela do carregamento foi parar numa linha do meio
em vez do fim. Medida a 5.888px do fim da página, com `temMais` ainda verdadeiro
e a sentinela ainda no DOM.

**2 · Corrida entre o callback e o estado.** `pedirMais` lia `janela` do closure.
Com a rolagem rápida, duas chamadas entram, a segunda carrega o callback de um
render anterior, e pede um índice que já existe — o `setJanela` deduplica, nada
muda na tela, e o `IntersectionObserver` não vê mudança de interseção. Nunca mais
dispara.

As bordas passaram para um `ref`, avançado **antes** da busca. Medido antes:
a janela pulava de 4 para 6, sinal de duas chamadas pedindo ao mesmo tempo.

**3 · O medidor media o texto de exemplo.** Duas rodadas inteiras de medição
foram feitas contra o livro errado: a sessão do navegador não era a dona do
trabalho, `analisar()` respondia "Não encontrado", e a tela caía no exemplo — que
tem **um** capítulo.

A tela estava certa e dizia isso em letra visível: *"Este é um texto de exemplo.
O livro não pôde ser aberto."* Quem não leu o aviso fui eu.

A causa raiz é o limite de cinco links por dez minutos, que existe por uma boa
razão: quando ele estoura, o backend responde 204 **sem emitir link**, e o
`grep` seguinte no log pega a chave anterior, já consumida.
`scripts/entrar-como-dono.sh` resolve criando uma conta nova a cada medida — o
limite é por e-mail, então nunca é atingido.

## `data-capitulos`, `data-carregados`, `data-tem-mais`

Estado que a tela já tinha, declarado onde um instrumento alcança. Sem eles, *"a
janela cresceu?"* só se responde contando `<section>`, e *"parou por quê?"* não
se responde de jeito nenhum.

## A leitura conferida contra a tela mobile

O nó `966:29395` existia e eu nunca o tinha aberto — mesma lição da Apresentação:
ler a estrutura não é ver a tela. Quatro divergências, todas medidas:

| | eu tinha | o desenho | ficou |
|---|---|---|---|
| respiro lateral | 32px | 16px | **16px** |
| coluna de texto | 326px | 358px | **358px** |
| corpo do texto | 18px | 20px | **20px** |
| título de abertura | 40px | 56px | **48px** |

**O corpo não cai no telefone.** O `base.css` desce de 20 para 18 no produto
inteiro, e a razão escrita lá é sobre a **entrelinha** acompanhar em razão — não
sobre o corpo. O desenho mantém `body-medium-prosa`, e ele está certo: numa tela
de leitura o texto é o produto, e apertar o único conteúdo da tela para caber
mais dele é o troco errado.

Fica registrado o custo: a 20px numa coluna de 358, a Zodiak dá cerca de **34
caracteres por linha** — abaixo da faixa confortável de 45 a 75. É a medida de
livro de bolso, e o pente fino decide se vale.

## O portão recusou o título do desenho

`56px` **não existe na escala** `[14,16,18,20,22,24,28,32,40,48,64]`, e o portão
disse exatamente isso: *"corpo 56, degrau mais perto 48"*. A escala é uma
progressão, e entre 48 e 64 não há degrau.

Ficou **48**. Acrescentar 56 à escala mexeria no sistema inteiro por causa de uma
tela — decisão do Erik, não minha.

## O respiro saiu assimétrico, e a medida pegou

Baixei o respiro para 32px totais e as colunas de borda do grid continuaram
pedindo `minmax(32px, 1fr)`. Com só 32px de folga, uma borda ficou com 32 e a
outra com **zero**: o texto encostava na direita.

`--borda` cai junto com `--respiro`, e a medida confirma **16 · 358 · 16**.

---

# Conexões — sugestões: o C16 resolvido pelo próprio desenho

Esta era a última tela D que faltava, e eu a tinha deixado de fora dizendo que
dependia de uma decisão sua sobre o limiar. **O desenho já a tinha tomado.**

O C16 pedia um número e alertava: *"uma palavra em comum pode ser generoso demais
num acervo grande, e calibrar com onze notas seria no escuro."* O nó `895:8545`
não pede um corte binário — pede **faixas nomeadas**: "Parecem próximas" e
"Talvez".

Isso muda a natureza da decisão. Um limiar único obriga a acertar onde a linha
cai; duas faixas só precisam estar **em ordem**, e quem lê vê o rótulo junto com
a evidência. Errar a fronteira custa um rótulo; errar um corte binário esconde a
sugestão.

**Os cortes aparecem na tela**: *"A partir de 4 palavras de assunto em comum."*
Limiar escondido é limiar em que ninguém pode discordar.

## A evidência vai junto, e o portão me corrigiu nela

Cada sugestão diz **quantas palavras** as duas notas dividem e **quais** — o
`CLAUDE.md` exige isso de qualquer coisa que o produto proponha por conta
própria, e sem as palavras seria palpite apresentado como fato.

A primeira versão mostrava a forma **normalizada**: "tambem", "memoria". O portão
pegou como texto sem acento, e ele estava certo — normalizar para comparar é
correto, mostrar o resultado da normalização é devolver à pessoa uma versão pior
do que ela escreveu. Agora a comparação usa a forma sem acento e a tela mostra a
original.

## O que isto não é

**Não é busca semântica.** Não há modelo, embedding nem serviço externo: é
interseção de palavras. Duas notas que dizem a mesma coisa com palavras
diferentes não se encontram — limitação registrada, e preferível a um vetor que
ninguém pode conferir.

Palavras de menos de quatro letras e uma lista curta de vazias ficam de fora:
sem isso, "para o que é um dia" ligaria metade do acervo.

## Já ligadas não voltam como sugestão

Sugerir o que a pessoa já conectou é pedir que ela faça de novo o que fez, e faz
a lista parecer que não aprendeu nada.


---

# A vista 3D refeita: livros deitados, empilhados

A primeira versão os pôs **em pé, lado a lado**. O nó `895:7506` mostra o
contrário: uma **pilha**, vista de lado e de cima, com o escolhido maior e à
frente e os outros recuando atrás.

A diferença não é de gosto. Em pé, a espessura vira **largura** e uma estante de
cinquenta livros não cabe na tela; deitados, ela vira **altura da fatia** e a
pilha cresce para baixo — a direção em que a página já rola.

A conta de `contrato/lombada.js` não mudou: continua milímetros de papel, só que
agora medindo a altura. Medido com o acervo semeado: 1020 páginas dão 79px de
lombada, 88 dão 9px.

## O hover empurra os vizinhos

Passar sobre a pilha faz **todos** recuarem um pouco mais, e o que está sob o
dedo vir para a frente e crescer. É o gesto de puxar um livro de uma pilha, em
que os de cima cedem.

## Três defeitos no caminho

**As fatias não se encostavam.** A face de cima tem 96px e é girada 72° — ela
**ocupa** ~30px na tela e **reserva** 96 no fluxo. Sobravam 66px de vazio entre
um livro e o próximo. A margem negativa sai da própria conta: `96 − 96·cos(72°)`.

**A capa ia para o diretório errado.** A URL é `/storage/temp/{token}/page_0.png`
e o token engana: o endpoint **traduz o token em id** e serve de
`STORAGE_TEMP / str(job_id)`. O semeador gravava no caminho da URL, e toda capa
dava 404 — o arquivo existia, no lugar errado.

**Imagem que não abre agora some**, em vez de virar ícone quebrado. Vale além do
acervo semeado: livro em preparo e arquivo removido caem no mesmo caso, e um
ícone de imagem faltando parece defeito do produto.

---

# O painel de Aparência da leitura

Do nó `973:32215`, e ele é o que torna **editável** o que o desenho fixa — a
condição do Erik para aceitar a medida de coluna: *"desde que seja editável, tá
tudo bem."*

Seis grupos: **Tema**, **Tamanho**, **Tipografia**, **Entrelinha**, **Coluna** e
**Seus destaques**.

**"Coluna — Larga" é a resposta ao A-13.** A medida do desenho dá cerca de 34
caracteres por linha no telefone, abaixo da faixa confortável. "Larga" recupera
isso para quem quiser, sem tirar de quem prefere a medida desenhada.

## Mora no navegador, e não na conta

Ler com letra maior é preferência **do aparelho**: o mesmo leitor quer corpo
grande no telefone e a medida cheia no monitor. Amarrar isso à conta faria uma
escolha atravessar o outro aparelho sem ser pedida.

O **tema** é a exceção — ele continua sendo o mesmo das Preferências da conta,
lido e escrito pelo mesmo módulo. Dois lugares para a mesma escolha é
conveniência; duas escolhas diferentes com o mesmo nome seria defeito.

## A amostra mostra o que a escolha faz

"Solta" não diz nada até se ver a entrelinha solta, e "Larga" não diz nada até se
ver a linha larga. Entrelinha e coluna se mostram com traços, e não com "Ab": o
que muda nelas é o espaço entre linhas e a largura da linha, e nenhum dos dois
cabe numa letra.

## Os degraus saem da escala

18/20/24 para o corpo, e não multiplicadores. "1,2× de 20" dá 24, que existe;
"1,15×" daria 23, que não. A entrelinha é **razão** e não número: mudar o corpo
sem mudar a entrelinha aperta o texto justamente quando alguém pediu para ele
respirar.

## "Do sistema" não está no desenho, e fica

Sem ele, quem tem o telefone em automático perde isso ao tocar uma vez aqui, e
não tem como voltar.

---

# Os cinco símbolos: busca, configurações de arquivo, aviso, criar conta

Nós `941:23107`, `941:23118`, `941:23109`, `941:23106` e `941:23108`.

## A busca existia no desenho e estava desligada há meses

O botão *"Buscar em Mekora"* do cabeçalho nasceu `disabled`, com o motivo
escrito no próprio código: *"não há rota de busca no backend, e uma busca que só
olha o que a tela já carregou encontraria menos do que a pessoa tem"*. A razão
era boa e continuava valendo — o que faltava era a rota. Ela é o `busca.py`.

**Três grupos, e não uma lista misturada.** Um livro e uma nota não se comparam
por relevância; quem compara é quem procurou. O que ela **não** faz está no
A-25.

**O `%` é escapado.** No `LIKE` ele é curinga. Escrito por uma pessoa, é um por
cento — e sem escapar, procurar "100%" devolveria a estante inteira. Há teste.

## O que o "Remover da estante" apaga, e o que o desenho não diz

O botão diz *"O arquivo preparado e o original saem. Não dá para desfazer."* Diz
a verdade e conta menos da metade: as notas do livro saem por cascata do banco.
A confirmação — que o desenho não tem — nomeia isso com o número: *"3 notas
deste livro saem junto."* Uma ação irreversível a um clique de distância era a
única coisa cara nessa folha.

## O aviso de preferência recebe o botão em vez de trazer o seu

No `941:23109` o *"Preparar arquivos"* está dentro da caixa. A tela de preparo já
tem a ação dela, e duas primárias com o mesmo destino — uma dentro e outra fora
da moldura — é a pessoa escolhendo entre dois botões idênticos. A caixa envolve
a ação de quem a usa. Quando não há desvio, não há caixa: *"0 preferências fora
do padrão"* é ruído.

## `Criar conta` substituiu um empurrão mudo

Quem não tinha entrado e clicava em Estante caía num campo de e-mail sem uma
palavra, com o voltar do navegador inutilizado por um `<Navigate replace>`. Os
três itens do desenho são exatamente os três lugares que empurram. A tela ganhou
uma linha que o desenho não tem — *"Você pediu a Estante. É um dos três."* —
porque sem ela a folha explica o geral e cala sobre o clique que a abriu.

O rótulo do primário está no A-22.

## O que a medição achou por causa disto

Três defeitos que já existiam e ninguém via:

1. **O proxy de desenvolvimento ignorava query string.** `^/buscar$` não casava
   `/buscar?q=campo`: o pedido caía no SPA e voltava `<!doctype html>`. Nenhuma
   rota exata usava query até agora.
2. **A auditoria media telas privadas numa conta vazia** — de novo. O
   `entrar-como-dono.sh` só semeava quando NENHUM id vinha, e a auditoria passa
   um id em toda rota privada. `/estudos` foi de 30 para 86 nós ao ser semeada,
   e reprovou: o título de um estudo é link, e link sem tinta declarada sai no
   `#0000ee` do navegador. Enquanto a tela era medida sem estudo nenhum, não
   havia título para pintar de azul.
3. **`/jobs/{id}/status` derrubava com 500 diante de uma coluna nula.**
   `_sem_buracos` existe para isso e estava em dois lugares; este era o
   terceiro. A tela de preparo dizia *"O Mekora não está respondendo agora"*
   para um trabalho que o `/analyze` devolvia sem reclamar.

A folha também ganhou teto de altura: sem ele o `<dialog>` crescia além da tela
e a rolagem movia a folha inteira, tirando o título do viewport.

---

# Os painéis da leitura: índice, notas, seleção

Nós `941:23110` (aparência, já construído), `941:23111`, `941:23112` e
`941:23120`.

## O índice mostra POR CENTO onde o desenho mostra página

A coluna da direita do `941:23112` traz "20", "30", "40" ao lado dos capítulos.
São números de página, e o produto não tem páginas — o EPUB não tem. A medida de
posição que ele conhece de verdade é a extensão em bytes, que já sustenta a
porcentagem da estante, e é ela que vai ali. Quando não dá para saber, a linha
não mostra número: zero afirmaria "no começo".

O desenho escreve **"Vc esta aqui"**, abreviado e sem acento. Na tela é "Você
está aqui" — o portão recusa texto sem acento, e com razão.

## O filete da nota tem a cor da nota

No `941:23111` o filete à esquerda de cada item é cinza em todos. Com quatro
cores de destaque, isso faz o painel não distinguir uma nota verde de uma rosa —
e a cor é o único dado que as separa. Aqui ela vai para o filete, que continua
sendo forma. O trecho citado ficou na superfície recuada do desenho, e não
pintado da cor: repeti-la atrás do texto era o que obrigava a medir contraste de
tinta sobre pastel em dois temas.

**O campo de busca do desenho diz "Buscar em Mekora"** — é o componente da busca
global reaproveitado no painel. Aqui ele procura nas notas DESTE livro, e o
rótulo diz isso: prometer o Mekora inteiro e devolver as notas de um livro é a
tela afirmando o que não faz.

**O que o desenho não tem e ficou:** trocar a cor, apagar, escrever o comentário.
Tirá-los para casar com um desenho estático seria trocar função por semelhança.

## A barra de seleção tinha só as cores

O `941:23120` tem quatro cores, **Adicionar nota**, **Copiar** e **Cancelar**. A
implementação tinha as cores e mais nada — marcar de uma cor é metade do que se
faz com um trecho.

"Adicionar nota" marca e abre o caderno no mesmo gesto: nota é destaque com
comentário, e sem o caderno aberto não há onde escrever o comentário. "Copiar"
diz quando o navegador recusa — permissão negada, documento sem foco — em vez de
fingir que copiou.

Os dois ícones (`document-add-outline` e `solar:copy-line-duotone`) não entraram:
eles passam pelo efeito handmade do Figma, e desenhá-los à mão produziria ícones
que não são do sistema. Mesmo caso do A-23.

## A ficha da estante mostra os dados do arquivo

Clicar num livro **seleciona**, e a seleção existe para a ficha da direita dizer
o que aquele arquivo é. Ela dizia só o que a leitura sabe — progresso, notas,
última nota —, e páginas, digitalizado, traduzido, quadrinho, Kindle e data de
chegada ficavam a um clique de distância, na tela do livro. Cada linha só
aparece quando há o que dizer.

O botão **"Notas"** da ficha não fazia nada: `<Botao>` sem `onClick`. Virou link
para a ficha inteira, que é onde cabem todas.
