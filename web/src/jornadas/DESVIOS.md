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

**A do mockup grande (`895:7279`) ficou de fora.** É um retângulo de 1540×858 sem
conteúdo no desenho, e o MCP do Figma recusa exportar asset enquanto o diretório
de escrita não estiver liberado em *Dev Mode > MCP > Allowed directories*:

> Cannot write to this directory. The user must add this directory to their
> allowed directories list in Figma Dev Mode settings.

Um retângulo cinza no lugar seria o placeholder que esta rodada existe para
eliminar. A legenda dela era a terceira cópia da legenda das capas, então nada de
texto se perdeu.

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
conversão quer saber que terminou, e escolher o que fazer — ler, ver na estante,
ou preparar outro.

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

## A Ajuda não tem busca, categorias nem "isto foi útil?"

São nove perguntas. Uma estrutura de central de ajuda em cima de nove perguntas é
mais navegação que conteúdo.

**Cada resposta leva ao lugar onde ela pode ser conferida.** Ajuda que não leva a
lugar nenhum obriga a pessoa a procurar de novo, agora com a resposta na cabeça e
sem saber onde aplicá-la. E é o que mantém a página honesta: se uma capacidade
mudar, a tela citada desmente o texto, e a pessoa descobre antes de nós.

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
