# O inventário das telas do Figma

**Este arquivo existe porque eu perdi os ids duas vezes.** O `get_metadata` da
página vem truncado e não devolve as telas; sondar id por id não funciona,
porque os números não são sequenciais entre quadros irmãos (medido: `964:24607`
é FILHO de `964:24606`, não o vizinho dele). O Erik teve de mandar a lista à mão.

Ela fica aqui para não se perder de novo. Quando uma tela nova nascer no Figma,
acrescente a linha.

Arquivo: `uuhto6FREG14H3DME0XCI7` — *Kindle local tool - Project*.

## Como abrir uma que não está aqui

A ferramenta lê a **seleção atual** do Figma quando não recebe id. Selecione o
quadro e peça — o nome e o id vêm juntos.

## Telefone — `M ·`

| id | tela | rota do produto | estado |
|---|---|---|---|
| `964:24178` | M · Apresentação | `/` | **comparada · corrigida** |
| `964:24606` | M · Estante — grade | `/estante` | **comparada · corrigida** |
| `966:25321` | M · Conta | `/conta` | **comparada · corrigida** |
| `966:25554` | M · Conta — Dispositivos Kindle | `/conta/kindle` | **comparada · corrigida** |
| `966:25786` | M · Conta — Preferências | `/conta/preferencias` | **comparada · confere** |
| `966:26643` | M · Conta — Privacidade | `/conta/privacidade` | **comparada · corrigida** |
| `966:27160` | M · Atualizações | `/atualizacoes` | **comparada · confere** |
| `966:27747` | M · Ajuda e recursos | `/ajuda` | **comparada · confere** |
| `966:28476` | M · Mesa | `/mesa` | **comparada · confere** |
| `966:29052` | M · Livro — o que ficou | `/estante/:id` | **comparada · corrigida** |
| `966:29395` | M · Leitura | `/leitura/:id` | **comparada · corrigida** |
| `966:29743` | M · Estudo — página | `/estudo/:id` | **comparada · corrigida** (a seção Livros existe) |
| `966:30269` | M · Conexões — sugestões | `/nota/:id` | **comparada · confere** |
| `966:30771` | M · Estudos — lista | `/estudos` | **comparada · corrigida** |
| `966:31095` | M · Estudos — lista (variação) | `/estudos` | **comparada · corrigida** |
| `966:31504` | M · Preparo — o que encontrei | `/preparo/:id` | **comparada · corrigida** |
| `967:31833` | M · Preparo — em andamento | `/preparo/:id` | **comparada · construída** (medida com conversão real) |
| `973:32414` | M · Leitura · aparência | painel da leitura | **é o `941:23110`, já construído** |

## O que a comparação achou

Cada linha abaixo foi vista lado a lado: a captura do nó no Figma, e a captura
da rota do produto a 390 de largura.

### Corrigido

**Estante (`964:24606`).** A grade cabia UMA coluna a 390 — o desenho tem duas.
O alternador Capas/3D estava depois da grade, isto é, abaixo de todos os livros.

**Leitura (`966:29395`).** Seis botões de 56px não cabem em 390: a segunda caixa
do cromo ficava cortada fora do viewport. O título de abertura passou a 56, o
degrau que o desenho pede e que entrou na escala.

**Conta (`966:25321`).** Eu tinha trocado a navegação pela `TrilhaLinhas`. O
desenho mostra lista com ÍCONE em cada item e o ativo em tinta cheia. Voltou a
ser isso; a trilha de linhas fica na estante em 3D, onde o `895:7506` a mostra.

**Dispositivos Kindle (`966:25554`).** O desenho abre com os cartões dos
aparelhos; "Primeira vez?" e "Antes do primeiro envio" não estão no topo. Eles
descem quando já há aparelho.

**Privacidade (`966:26643`).** A lista mostrava `preferencias`, `no_canvas` e
`grupos_do_canvas` — chaves de código servidas cruas. Viraram nomes de gente, e
o portão passou a recusar `_` no meio de palavra.

**Livro (`966:29052`) e Preparo (`966:31504`).** A capa tinha largura fixa
herdada do desktop, onde ela divide a linha com o título. A 390 a linha quebra e
sobra meia tela vazia ao lado de uma capa pequena. Agora ela ocupa a largura,
como nos dois desenhos.

### Confere

**Preferências (`966:25786`)**, **Atualizações (`966:27160`)**,
**Ajuda (`966:27747`)** e **Mesa (`966:28476`)** batem em estrutura, ordem e
texto. Na Mesa, a lista de formatos difere porque ela vem do SERVIDOR e não do
desenho: o Figma mostra seis, o backend aceita oito.

### Buracos que ficaram, e não são de layout

**Estudos (`966:31095`)** — dois dos três buracos foram fechados:

1. ~~**Recortes**~~ — construídos: Abertos / Respondidos / Tudo, com a contagem
   de cada um, e o recorte vazio não é clicável.
2. ~~**A capa do livro** ao lado de cada nota reunida.~~ Construída. Numa lista
   de trinta trechos de quatro livros, a capa é o que separa um do outro de
   relance; o nome em texto cinza obriga a ler. Um pedido só para todos os
   livros do estudo, e não um por nota.
3. ~~**"Fora de estudo — N"**~~ — construída. É a que fecha o gesto: um estudo
   se monta a partir do que sobrou solto, e a tela mostrava o que já foi reunido
   e escondia o material. Vinte por vez, e o teto é DITO.

**Conta (`966:25321`)** — o desenho tem **retrato**, **Nome** e **Senha**. O
produto não tem nenhum dos três: a conta é um e-mail e mais nada, sem senha, por
DEC-0039. O desenho é anterior a essa decisão. **Decisão do Erik:** o desenho
muda, ou a decisão muda.

~~**Dispositivos Kindle (`966:25554`)** — cada cartão tem **"Editar"**.~~
Construído. E a rota NÃO servia: ela aceitava nome, principal e autorizado, e
não o endereço — dava para renomear e eleger o principal, e não dava para
corrigir um endereço digitado errado. A única saída era apagar o aparelho e
ligar de novo, perdendo nome e histórico. O endereço passa pela mesma validação
de forma do cadastro, e dois aparelhos com o mesmo endereço são recusados.

~~**Livro (`966:29052`)** — menu ⋮ ao lado do título e chips de formato/estado.~~
Construídos. O ⋮ abre o que já existia como um botão de largura inteira embaixo
de "Continuar lendo" — cinco decisões raras não merecem o mesmo peso visual da
ação que se faz sempre. Os selos dizem formato, páginas, se está preparado e se
foi ao Kindle, e cada um só aparece quando há o que dizer.

**"Escrever sobre o livro" foi construído** — o Erik mandou o id do trecho
(`895:7839`, a versão de computador) quando eu disse que a captura saía com 38
pixels de largura. É a lição prática: numa tela de 4673 de altura, o caminho é
pedir o NÓ DE DENTRO, e não a tela inteira.

~~**Ainda ilegíveis nesta tela:** o bloco escuro com a citação e dois botões, e o
cartão "três páginas ficaram sem texto · Ver o original".~~ **Lidos em 03/09**,
com o conector do Figma ligado — e os dois eram outra coisa:

- **O "bloco escuro com a citação e dois botões"** é a leitura de uma captura de
  38px de largura. No arquivo são três coisas separadas e todas já construídas: a
  citação com **filete à esquerda** (`966:29082`), o botão **Ler** em
  `surface/inverse` (`966:29085` — o "escuro" é ele), **Enviar ao Kindle**
  secundário e **Ver o preparo** em texto.
- **O cartão diz "Ver as páginas"**, e não "Ver o original" — o que dissolve o
  conflito aparente com a decisão do A-21. Ele é `895:7716` no computador e
  `966:29091` no telefone: ícone `solar:bug-minimalistic-outline`, a frase
  "Três páginas ficaram sem texto." e um botão secundário. **Construído em
  03/09**, com a linha equivalente saindo da lista "Este arquivo".

**Com a chave do topo deste arquivo e o id da tela, `get_metadata` e
`get_design_context` respondem sem depender de o Erik selecionar nada no Figma.**
O A-27 e o A-30 do `ABERTO.md` descrevem o problema de ACHAR um id que não está
escrito; com o id em mãos — e eles estão todos aqui — não há bloqueio nenhum.

~~**Preparo (`966:31504`)**~~ — fechada. O alternador **Guiado / Personalizado**
subiu para o topo, e o botão do fim saiu. O **tamanho do arquivo** passou a
existir: era o único selo do desenho sem dado por trás.

~~**Estudo (`966:29743`)**~~ — fechada. Os nomes que eu tinha posto nesta lista
estavam errados em quatro linhas, e a ferramenta os deu certos quando perguntei
um a um. Este é o **estudo aberto**, e ele tem uma seção **"Livros"** com as
CAPAS dos livros de onde as notas vieram, e um "Ver na estante". **A seção e as
capas foram construídas** (`Estudos.jsx`): a capa leva para `/estante/:id`, e o
livro sem arquivo — nota trazida do Kindle, que guarda só o título — entra com a
caixa vazia e o nome dentro.

**Preparo em andamento (`967:31833`)** — só existe enquanto uma conversão roda,
e o acervo semeado não converte nada. **Resolvido em 02/09**: um TXT de 2,5 MB
subido pela API leva alguns segundos no Calibre, o que dá tempo de medir. A tela
foi construída inteira a partir do `895:8029` — ver a seção do desktop.

### Corrigido na Apresentação (`964:24178`)

**A marca "Mekora" estava branca e cortada.** O SVG saiu do Figma com
`fill="white"` cozido dentro — letra branca sobre papel claro, invisível no topo
da primeira tela do produto — e com um `clipPath` de 212 de altura enquanto o
desenho vai até 290, o que cortava a parte de baixo das letras. É o mesmo tipo
de mis-export da "ilustração" da Privacidade.

A tinta agora vem do sistema por máscara, como nos ícones, e o recorte foi
aberto. O rodapé usava a mesma imagem e tinha o mesmo corte.

## Símbolos — trechos de fluxo

| id | símbolo | onde vive | estado |
|---|---|---|---|
| `941:23103`–`941:23105`, `941:23115`–`941:23117` | Kindle · assistente | `/conta/kindle` | construído |
| `941:23106` | Criar conta | gate de quem não entrou | construído (A-22) |
| `941:23107` | Estudo · seletor | busca do cabeçalho | construído |
| `941:23108` | Conectar nota | folha da página da nota | construído (A-24) |
| `941:23109` | Aviso · preferência fora do padrão | `/preparo/:id` | construído |
| `941:23110` | Leitura · aparência | painel da leitura | construído |
| `941:23111` | Leitura · notas e destaques | painel da leitura | construído |
| `941:23112` | Leitura · índice | painel da leitura | construído |
| `941:23113` | Nota · cartão | popup de escrever a nota | construído |
| `941:23118` | Arquivo · configurações | ficha do livro | construído (A-23) |
| `941:23120` | Seleção · ações | leitura | construído |

## Computador — `D ·`

Os vinte e dois ids vieram do Erik em 01/09, junto da observação de que "muitas
telas você criou muito errado". A comparação está em curso.

| id | tela | rota do produto | estado |
|---|---|---|---|
| `895:7063` | D · Apresentação | `/` | **comparada** — bate |
| `895:7315` | D · Estante — grade | `/estante` | comparada · corrigida |
| `895:7506` | D · Livro — ficha / estante 3D | `/estante` (vista 3D) | comparada · corrigida |
| `895:6938` | D · Canvas | `/canvas` | comparada · grupos e prévia construídos |
| `895:10599` | D · Conta — visão geral | `/conta` | **comparada · ver nota abaixo** |
| `895:10715` | D · Conta — preferências | `/conta/preferencias` | **comparada** — bate palavra por palavra |
| `895:10909` | D · Conta — dados | `/conta/privacidade` | **comparada · corrigida** |
| `895:11060` | D · Atualizações | `/atualizacoes` | **comparada · atualizada** |
| `895:11193` | D · Ajuda — início | `/ajuda` | **comparada · corrigida** (busca) |
| `895:9348` | D · Mesa — cheia | `/mesa` | **comparada · corrigida** |
| `895:9981` | D · Mesa — variação | `/mesa` | **comparada · corrigida** |
| `895:10286` | D · Mesa — vazia | `/mesa` | **comparada** — bate |
| `895:9736` | D · Mesa — primeira vez | `/mesa` | **comparada · corrigida** |
| `895:7631` | D · Livro — o que ficou | `/estante/:id` | **comparada · corrigida** |
| `895:10472` | D · Leitura | `/leitura/:id` | **comparada · corrigida** (epígrafe) |
| `895:8260` | D · Estudo — página | `/estudo/:id` | **comparada · corrigida** |
| `895:8545` | D · Conexões — sugestões | `/nota/:id` | **comparada · corrigida** (3ª faixa) |
| `895:8849` | D · Estudos — lista | `/estudos` | **comparada · corrigida** |
| `900:56142` | D · Estudos — lista (variação) | `/estudos` | **comparada · corrigida** |
| `895:7856` | D · Preparo — o que encontrei | `/preparo/:id` | **comparada · corrigida** |
| `895:8029` | D · Preparo — em andamento | `/preparo/:id` | **comparada · construída** |
| `895:8164` | D · Preparo — pronto | `/preparo/:id` | **comparada · corrigida** |

E um trecho solto, que o Erik mandou quando eu disse que não conseguia ler:

| `895:7839` | "Escrever sobre o livro" — trecho do `895:7631` | `/estante/:id` | **construído** |

## Como ler uma tela alta

A captura tem teto de cerca de 1024 no lado MAIOR. Numa tela de 1920 × 4700 isso
dá 418 de largura — dá para ver a estrutura e não dá para ler o texto. Numa
mobile de 390 × 4673, dá 85.

Duas saídas, e as duas funcionam:

1. **O nó de dentro.** Pedir o trecho em vez da tela inteira devolve a captura em
   tamanho legível — foi assim com o `895:7839`.
2. **`get_design_context`.** Ele devolve o conteúdo como CÓDIGO, com todo o texto
   e todas as medidas, sem teto de resolução. É mais caro em leitura e é o
   caminho certo quando o que importa é o texto exato.

O que eu não conseguia era **achar** os ids: o `get_metadata` da página vem
truncado e não devolve as telas. Isso o Erik resolveu mandando a lista.


## O que a comparação do desktop achou

### `895:8164` — Preparo, pronto

O desenho escreve **"Diário 02.epub · 8,4 MB"**, e os selos de cima trazem
"PDF · 12,8 MB · 96 páginas · Português". As duas coisas confirmam a vírgula — o
`tamanhoLegivel` já a usava, e agora há de onde tirar a prova.

O tamanho do EPUB não existia no backend; passou a existir.

E a **ordem do alternador estava trocada**: o desenho põe Personalizado à
esquerda e Guiado à direita, marcado.

### `895:10599` — Conta, visão geral

O painel desta tela mostra os **dispositivos Kindle**, com a navegação marcando
"Conta". No desenho de telefone (`966:25321`) a mesma navegação marca "Conta" e o
painel mostra Nome, E-mail e Senha; e os dispositivos têm tela própria
(`966:25554`).

Os dois desenhos discordam entre si, e no desktop não existe um
`D · Conta — Kindle`. O mais provável é que este seja um mock cujo conteúdo não
foi trocado. **Pergunta para o Erik**, junto da de nome e retrato.

O que ele confirma, e que já está construído: navegação de **quatro itens com
ícone**, ativo em tinta cheia; cartões de aparelho com "Editar" e "Tornar
principal"; "Conectar outro kindle" e o rodapé sobre o principal.

O que ele tem e o produto não: o **modelo e a resolução** do aparelho
("Paperwhite · 1236 x 1680") e a **data do último envio**. O Mekora guarda nome e
endereço, e mais nada — a Amazon não conta o resto.

### `895:9736` — Mesa, primeira vez

As contagens por estado eram uma **frase**; o desenho as põe como **recortes
clicáveis**, com "N arquivos adicionados" marcado por padrão. É a mesma forma da
estante e dos estudos, e vale aqui pelo mesmo motivo: numa fila de trinta, "só os
que deram erro" é a pergunta que se faz.

E o rótulo do estado `trabalhando` dizia **"Em preparo"**, que é também o nome da
seção — a tela se contradizia: "Em preparo" no topo e "0 Em preparo" logo
abaixo. Eu tinha resolvido trocando o nome da seção para "A mesa", o que
consertou a contradição e afastou a tela do desenho. **O desenho não tem esse
problema:** lá a seção é "Em preparo" e o estado é "Enviando". Agora aqui também.

**O que ficou:** o desenho tem a área de soltar no TOPO, com o título "Comece
soltando um arquivo", antes da fila — na tela ela é o "Adicionar mais" do fim. E
cada cartão da fila tem ações próprias (pausar, repetir, remover, ⋮).


## As 22 telas de desktop, comparadas uma a uma

Feito em 01–02/09/2026, depois de o Erik mandar os 22 ids. O que segue é o que
cada comparação achou — e o que ela deixou de fora, com o motivo.

### Como ler uma tela alta, de novo

Duas saídas, e as duas funcionam. A captura tem teto de ~1024 no lado maior:
numa tela de 1920×4700 sobram 418 de largura. Ou se pede o **nó de dentro**, ou
se usa **`get_design_context`**, que devolve o texto como código e não tem teto.
O segundo custa muito token e é o que vale quando o que importa são as palavras.

### O que estava errado, por tela

**`895:7856` · Preparo — o que encontrei.** Faltavam duas linhas de "O que vou
fazer": o sumário navegável e "Idioma: X, como no original / Nada é traduzido a
não ser que você peça". O veredito não nomeava o que tinha sido decidido sem
perguntar. "Alterar" por linha e "Ajustar manualmente" no rodapé não existiam —
o segundo eu tinha removido de propósito, e o desenho tem os dois.

**`895:8029` · Preparo — em andamento.** A tela trocava a página inteira por uma
linha. Construída inteira: topo mantido, o card que explica por que a barra
existe numa etapa e não na seguinte, o relógio, a lista com a etapa marcada, e
os botões Cancelar / Continuar navegando. Cancelar exigiu expor o
`operation_id`, que o contrato jogava fora.

**`895:9348` e `895:9981` · Mesa cheia.** A fila não sobrevivia a um
recarregamento — e por isso a própria tela era inalcançável a não ser soltando
um arquivo naquele instante. A área de soltar não estava no topo. Os recortes
tinham número depois do rótulo e ordem errada. Faltavam o cartão "Continue" e as
duas faixas de capas.

**`895:7631` · Livro.** Faltavam a origem do arquivo, a barra de leitura em
porcentagem, a última nota como citação, dois dos três botões, os recortes, a
busca e as ações por nota.

**`895:10472` · Leitura.** Faltava a epígrafe escura. Ela é declarada pelo livro
(`epub:type="epigraph"`), e o livro de prova passou a declarar uma — sem isso o
tratamento existiria no código sem aparecer em tela nenhuma.

**`895:8849` e `900:56142` · Estudos.** O estudo na lista mostrava todas as
notas; no desenho ele é um cartão. Faltavam a busca, o cartão "O que ficou pela
metade" e a vista Leitura inteira.

**`895:8260` · Estudo.** Faltava o título "Como isso se formou", a busca dentro
do estudo e "Copiar com origem".

**`895:8545` · Conexões.** Duas das três faixas existiam. "Talvez um estudo" era
nomeada no cabeçalho do serviço e não existia.

**`895:10909` · Privacidade.** Faltavam "Seus arquivos" e "Dados de uso"
inteiras. E a tela afirmava que não há análise de uso, o que era falso.

**`895:11193` · Ajuda.** Faltava a busca.

**`895:10715` · Preferências.** Bate palavra por palavra. Nada a fazer.

**`895:10286` · Mesa vazia.** Bate, filete incluído.

**`895:7063` · Apresentação.** Bate. A lista de formatos é maior que a do desenho
porque vem do servidor, que é a fonte certa.

### O que continua de fora, e por quê

| O que | Onde | Por quê |
|---|---|---|
| "Nenhuma página corrompida — 96 de 96 abriram" | `895:7856` | não há campo de página corrompida no `ProcessingJob` |
| "42 de 96 páginas reconhecidas" | `895:8029` | o `ocrmypdf` roda como processo externo dentro da análise, sem retorno por página |
| Tempo por passo ("01:10", "00:40") | `895:8029` | é previsão, e nada estima |
| "A partir dos 14 títulos de capítulo" | `895:7856` | a análise não conta capítulos; quem lê o sumário é o `epub.js`, depois da conversão |
| ~~Botão "Traduzir"~~ | `895:7856` | **construído em 02/09** — a tela pergunta ao servidor os pares instalados; sem motor, ela diz o que falta |
| ~~"Precisa de você"~~ | `895:9348` | **construído em 02/09** — `needs_pass` do PyMuPDF, coluna `bloqueio` e o estado `precisa` no contrato |
| Recorte "rascunho" | `895:7631` | não há estado de nota no modelo; recorte que devolve sempre zero é promessa, não filtro |
| "Três páginas ficaram sem texto" | `895:7631` | não há detecção de página sem texto |
| ~~"Você ligou"~~ | `895:8849` | **construído em 02/09** — `GET /notas/agrupadas`, união de conjuntos com dois cortes ditos na tela |
| ~~Trilha de âncoras à esquerda~~ | `895:7631`, `895:8260` | **construída em 02/09** — `TrilhaDaPagina`, marcada pelo que está sendo lido |
| Modelo e resolução do aparelho | `895:10599` | o Mekora guarda nome e endereço; a Amazon não conta o resto |

### Perguntas para o Erik

1. **Nome e retrato na conta.** Nunca foi decidido por ninguém. A DEC-0039 só
   fixou que não há senha nem provedor externo. Hoje a tela de privacidade diz
   "não há nome, telefone nem foto", e isso é verdade porque não foi construído —
   não porque alguém escolheu.
2. **`895:10599`.** O painel mostra os dispositivos Kindle com a navegação
   marcando "Conta". No telefone, "Conta" mostra Nome/E-mail/Senha e os
   dispositivos têm tela própria. Os dois desenhos discordam, e no desktop não
   existe um `D · Conta — Kindle`. Provavelmente é mock com conteúdo não trocado
   — mas é a sua palavra, não a minha.


## 02/09 — o que o Erik mandou atacar

Ele decidiu duas coisas e mandou seguir com as quatro pendências construíveis.

**Nome e retrato na conta.** A pergunta estava aberta desde o começo, e o que
havia era pior que a falta: `App.jsx` fazia `email.split("@")[0]`, então
`erik@mekora.local` virava "erik" na trilha — enquanto a tela de privacidade
afirmava, a duas telas de distância, que não havia nome nenhum. Os dois campos
agora existem, os dois são opcionais, e o retrato é sempre reescrito pelo
servidor como PNG quadrado: guardar o arquivo que chega seria guardar o EXIF.

**"Precisa de você".** Faltava um estado, e por isso a seção não existia. Um PDF
com senha não está com erro, não está trabalhando e não está na fila — e o
PyMuPDF abre um arquivo protegido sem reclamar, o que fazia o produto tratá-lo
como digitalização e responder "OCR falhou". Agora ele para e pergunta.

**"Você ligou".** União de conjuntos sobre as notas, com dois cortes ditos na
tela: três notas no mínimo, e dois livros no mínimo. É a travessia que faz o
grupo ser notícia — três notas do mesmo capítulo sobre o mesmo assunto é o
capítulo.

**Tradução.** A tela pergunta ao servidor quais pares estão instalados. Nesta
máquina não há nenhum, e ela diz isso — `argostranslate` não está instalado, e
ele puxa `stanza`, que puxa `torch`. O outro ramo foi provado trocando as duas
respostas do servidor na mão, e está registrado como tal.

**Trilha de âncoras.** Construída, e a primeira versão foi jogada fora: o
`IntersectionObserver` errava a última seção sempre, porque ela nunca chega ao
alto da tela. O porquê está no comentário do componente.

### O que ficou de fora, agora

| O que | Onde | Por quê |
|---|---|---|
| "Nenhuma página corrompida" | `895:7856` | não há campo de página corrompida |
| "42 de 96 páginas reconhecidas" | `895:8029` | o `ocrmypdf` roda como processo externo, sem retorno por página |
| Tempo por passo | `895:8029` | é previsão, e nada estima |
| "os 14 títulos de capítulo" | `895:7856` | a análise não conta capítulos |
| Recorte "rascunho" | `895:7631` | não há estado de nota no modelo |
| "Três páginas ficaram sem texto" | `895:7631` | não há detecção de página sem texto |
| "Ignorar" num grupo | `895:8849` | ignorar precisa ser LEMBRADO, e não há onde |
| Modelo e resolução do aparelho | `895:10599` | a Amazon não conta |


## 02/09 — Canvas e Estudos, refeitos contra o desenho

O Erik disse que os dois "ficaram péssimos e não seguiram o Figma". Olhados lado
a lado, ele estava certo — e no Canvas o erro era estrutural, não de acabamento.

### Canvas (`895:6938`)

| o que o desenho tem | o que eu tinha feito |
|---|---|
| o canvas É a página, de borda a borda | uma seção com título, parágrafo e uma janelinha de 720px com filete |
| barra vertical de ícones flutuando à esquerda | quatro botões largos numa fileira no alto |
| cartão branco, filete fino, sombra quase nada | folha amarela, azul ou verde — a cor do destaque pintando o objeto |
| rodapé com origem e data | uma fileira de botões, com "Tirar" na cara de todo cartão |
| ligação em curva, com um ponto na junta | segmento reto, e uma lista "Ligações N" abaixo do canvas |
| sem rodapé | rodapé institucional debaixo de uma superfície sem fim |

O cartão branco apagou um problema inteiro de contraste: havia três regras
existindo só para fazer a tinta funcionar sobre quatro pastéis em dois temas.

O ponto na junta substituiu a lista, e o motivo aparece usando: para desfazer a
ligação entre duas notas visíveis na tela, era preciso rolar para fora do canvas
e achar a linha certa entre trinta parecidas.

**O portão pegou dois corpos fora da escala** — 11 e 13 —, que eu tinha inventado
para o selo de contagem e para o rodapé do cartão. Os dois viraram 14.

### Estudos (`900:56142`, `895:8849`)

O topo era uma barra com o botão puxado para a direita; nos dois nós ele é uma
coluna estreita centrada — título, frase e busca —, e as ações começam na fileira
de baixo, junto dos recortes.

**O que não copiei:** o desenho recorta em "Estudos / Todas as notas / Em
pesquisa", e os nossos são "Abertos / Respondidos / Tudo". Os nossos saem de um
estado que existe no modelo; "Em pesquisa" não tem definição em lugar nenhum.

### Telefone

As três telas novas foram medidas a 390 e nenhuma tem rolagem lateral.

O Canvas tinha dois defeitos só visíveis lá, e os dois vieram de número mágico:
a altura do chão era `calc(100vh - 88px)`, e 88 é o cabeçalho medido no
computador — a 390 ele tem 76, e sobravam doze pixels de nada. Agora quem faz a
conta é o `flex`, e `100dvh` cuida da barra do navegador que entra e sai.

E o zoom ficava POR CIMA da barra de ferramentas: medido, a barra começa em
y=766 e o zoom estava em 770. Ele subiu.

**Sem desenho de telefone, e adaptados do computador:** `Canvas` e `Preparo —
pronto` não têm nó `M ·` nenhum. Os dois são as mesmas telas com as regras de
390 já aplicadas — a barra de ferramentas vira barra de rodapé, e o zoom sobe.


## 02/09, noite — o hambúrguer e o funil, decididos

O Erik respondeu a pergunta que estava aberta desde 01/09 — o painel do
`895:10599` é **conteúdo copiado de outra tela sem trocar** — e autorizou decidir
o resto sozinho.

### O que o `895:10599` ser cópia significa

Que a tela de Conta do computador mostra os **dados da conta**, e os aparelhos
têm tela própria — que é exatamente o que o telefone (`966:25321` e `966:25554`)
desenha, e o que o produto já fazia. Nada a mudar; a pergunta fecha.

### O hambúrguer (`964:24606`)

Ele existe no desenho, ao lado da busca, e não tem painel desenhado em lugar
nenhum do arquivo. **Decisão:** o que ele abre é o que NÃO CABE na barra de
baixo.

A barra tem os quatro lugares principais. Sobram as Notas, a Conta e suas quatro
telas, a Ajuda, as Atualizações e os dois documentos — que no computador se
alcança pelos dois ícones do cabeçalho e pelo rodapé. No telefone o rodapé fica
no fim de uma página que pode ter três telas de altura, e os dois ícones não
cabem junto da busca: o nó traz **um** ícone ao lado dela.

Nada foi inventado — a lista é a mesma do rodapé. E ela passou a morar num lugar
só, `menu.js`: duas cópias é como o menu passa a oferecer um lugar que o rodapé
não tem.

**Um link morto apareceu ao juntar as duas:** o rodapé dizia "Dispositivos
Kindle" apontando para `/conta`. O rótulo é de quando não existia tela de
aparelhos, e sobreviveu à criação dela.

### O funil (`964:24606`)

Mesma situação, mesma decisão: ele abre **os mesmos recortes** que o computador
mostra em linha. Num telefone de 390 os cinco ou quebram em duas fileiras —
comendo um terço da tela antes do primeiro livro — ou rolam para o lado, e
recorte que rola para o lado é recorte que ninguém vê.

O botão **diz qual recorte está valendo** quando não é "tudo": um funil mudo
esconde que a estante está filtrada, e aí a pessoa procura um livro que está ali.

Medido a 390: um ícone ao lado da busca, quinze lugares no menu, os recortes em
linha escondidos, o funil visível, e nenhuma rolagem lateral.

---

# O que o Erik achou percorrendo o produto — 03/09/2026

Ele abriu o produto pela primeira vez de ponta a ponta e escreveu uma lista. A
auditoria estava em 60/60 no mesmo momento, e é isso que precisa ser dito
primeiro: **o portão mede cor, contraste e escala tipográfica. Ele nunca mediu se
a tela é a do desenho.** Verde por omissão outra vez, e o mais caro até aqui —
porque o escopo do V1 é o Figma completo, e o instrumento não olhava justamente
para isso.

A lista abaixo é dele, item por item, com o nó do Figma ao lado quando eu já
conferi. Nada aqui é interpretação minha do que ele quis dizer: onde eu não
tinha certeza, está escrito que não tenho.

## Cabeçalho — vale para TODAS as telas

| | o que está errado | conferido |
|---|---|---|
| C1 | ~~O ícone ao lado da busca é de DÚVIDAS ("?"), não de notas~~ | `941:23107` · **feito** |
| C2 | ~~O ícone da Estante estava trocado com ele~~ | **feito** — os arquivos estavam trocados |
| C3 | A busca é MENOR e se expande quando a pessoa digita, com resultados embaixo (capa, título, autor · formato). Eu ignorei o componente e fiz outro | `941:23107` |
| ~~C4~~ | ~~Conta abre um DROPDOWN com as telas de configuração; hoje ela navega direto~~ **feito** — ver a nota abaixo | não está no Figma atual |
| C5 | Espaçamento entre a busca, as dúvidas e a conta não é o do desenho | `895:7315` |
| C6 | Espaçamento entre itens errado em geral | a conferir |

## Estante — `895:7315`

| | o que está errado |
|---|---|
| E1 | O *hover* nos livros é feio e não destaca — passa despercebido |
| E2 | O clique só funciona na faixa abaixo da capa. A pessoa clica NA CAPA |
| E3 | O marcador de notas quebra a grade: sai da capa e invade o filtro de cima. No desenho ele fica DENTRO do canto da capa |
| E4 | O painel de detalhes à direita está gigante |
| E5 | A cor no destaque/nota não funciona: pesa e puxa toda a atenção. No desenho a citação é um bloco discreto com filete à esquerda, sem fundo colorido |
| E6 | "Enviar ao Kindle" não existe ali. Isso é da tela do livro |
| E7 | "Ver detalhes do arquivo" — eu inventei; não está no desenho |

## Canvas — `895:6938`

O mais errado de todos. O desenho tem:

| | o que está errado |
|---|---|
| K1 | **O cabeçalho continua lá.** Eu tirei e pus uma barra flutuante no lugar |
| K2 | O fundo pontilhado vai por baixo do cabeçalho. No meu, o topo é branco |
| K3 | A barra de ferramentas é um cartão pequeno e flutuante com TRÊS ícones, no meio da lateral esquerda |
| K4 | As funções estão erradas, e os itens dentro delas também |
| K5 | Não dá para mover os post-its |
| K6 | Os grupos se sobrepõem. No desenho o grupo é um retângulo tracejado com o nome ACIMA dele |
| K7 | O canvas é travado; animação ruim; interação confusa; ícones errados |

## Estudos — `895:8849`

| | o que está errado |
|---|---|
| S1 | A trilha lateral (`Início / Pela metade / …`) no desenho aparece **só na parte de baixo**, ao lado de "Você ligou". Eu pus no topo, para a página inteira |
| S2 | Kanban não funciona: não arrasta, parece enfeite |
| S3 | A coluna central tem duas larguras sem necessidade |
| S4 | Os recortes do desenho são "Abertos / Todas as notas / Em pesquisa"; os meus são "Abertos / Respondidos / Tudo" — **este é um desvio que eu registrei de propósito** porque "Em pesquisa" não tem definição no modelo. Fica para o Erik decidir |

## Detalhes do arquivo

| | o que está errado |
|---|---|
| D1 | Navegação onde não devia haver, e errada |
| D2 | Não segue o desenho; tem coisa que não devia existir |

## Leitura — `895:10472`

| | o que está errado |
|---|---|
| L1 | A ideia está certa; o **grid** fugiu muito |
| L2 | A epígrafe ("Ao verme que primeiro roeu…") pede enquadramento melhor, ainda mais tendo sido feita como texto |

## O que muda no instrumento

Consertar as telas sem consertar isto deixa a mesma armadilha armada. O portão
precisa de uma pergunta que ele não faz: **esta tela bate com o nó do Figma?**
Não dá para automatizar "bate" por inteiro, e dá para automatizar o que mais doeu
aqui — asset usado pelo nome sem ninguém olhar o desenho, e componente
reimplementado quando já existia um.

## Segunda leva — mesma sessão, resto do produto

### Leitura (continuação)

| | o que está errado |
|---|---|
| L3 | Menu errado: os itens abrem do lado CONTRÁRIO ao do ícone. Dropdown e modal abrem errado, com largura errada, ícones apertados |
| L4 | Notas e destaques coloridos demais. Deve ter cor — mas o jeito que ficou precisa ser reavaliado |
| L5 | ~~Em Aparência, os temas têm uma palavra cada e "Do sistema" tem duas: é ela que quebra a fileira~~ **feito** — virou "Sistema" |
| L6 | **O "vertical trim" dos textos.** Ver a nota abaixo: é sistêmico e é provavelmente a causa de "tudo está grande demais" |
| L7 | Clicar em adicionar cor (destaque, não nota) **não muda a cor do texto na leitura**. Botão que não aperta, não muda e não dá retorno |

### Configurações

| | o que está errado |
|---|---|
| G1 | As imagens ilustrativas das seções foram posicionadas com cuidado POR CIMA do contêiner, numa ordem de camadas feita para não dar problema na implementação. Eu fiz errado mesmo assim |
| G2 | As letras miúdas têm o tamanho certo, e o texto quebrado e minúsculo espalhado é ruim. Vira **hot spot**: bolinha clicável que abre um balão com a explicação |
| G3 | Em "dados de uso" eu modifiquei tudo. Havia razão? Se não, seguir o desenho |
| G4 | A tela de privacidade está completamente quebrada |

### Por onde começar (`/ajuda`, `895:11193`)

| | o que está errado |
|---|---|
| A1 | Espaçamento bugado |
| A2 | Não segue o grid do Figma |
| A3 | Navegação errada |

### Preparo de arquivos — `895:7856`, `895:8029`, `895:8164`

Bem errada, não condiz com o desenho.

### Estante 3D — `895:7506`

Continua completamente bugada.

---

## As três coisas SISTÊMICAS

Consertar tela por tela sem estas três é repintar parede molhada.

### 1. As seções sobre o pontilhado são GAVETAS, não páginas

Onde há um contêiner de cor diferente sobre o canvas pontilhado, aquilo **não é
uma página nova**: é uma seção que SOBREPÕE o conteúdo anterior, seguindo a
lógica de navegação dentro do canvas. Eu li como rota e construí como página.

O Erik indicou o componente para isso — a `vaul`, do Emil Kowalski
(<https://github.com/emilkowalski/vaul>) — e disse que ela precisa perder borda e
mais alguma coisa, **e que era para ter sido usada desde o começo**. Já está
instalada.

Isto vem PRIMEIRO porque muda o que as outras telas são. Consertar o espaçamento
de uma página que devia ser gaveta é trabalho jogado fora.

### 2. Tudo está grande demais — e há uma causa mecânica

"Popups grandes demais, fontes enormes, coisas que deviam caber numa tela só
precisam de scroll." Isso não é gosto, é medida.

**No Figma o texto tem trim vertical: a caixa abraça as letras.** No CSS a caixa
de linha acrescenta meia entrelinha ACIMA e ABAIXO das letras. Num corpo de 20
com entrelinha 30, são 5px sobrando em cima e 5 embaixo, **em cada bloco de
texto**. Eu li os espaçamentos do desenho e apliquei como margem, e cada um deles
saiu 10px maior — somando descendo a tela.

Conferido: não há `text-box-trim` nem `leading-trim` em nenhum CSS do produto. A
diferença está entre os dois sistemas, e não numa propriedade que eu tenha
ligado.

### 3. O portão não pergunta se a tela é a do desenho

Ele mede cor, contraste e escala tipográfica. Passou 60/60 enquanto tudo acima
era verdade.


## O menu da conta não está no Figma atual — 03/09/2026

O Erik pediu, e a mecânica não tem ambiguidade: clicar na conta oferece as telas
em vez de levar a uma delas. Foi construído.

**A aparência não veio do desenho, e isso precisa estar escrito.** Há um menu
suspenso no arquivo — o `55:2563`, na página `Exploração` —, e ele é da fase
ANTERIOR: fonte Satoshi, cantos de 24px, cinza `#636363`, itens com seta. Copiá-lo
traria de volta a linguagem que a DEC-0038 aposentou quando o produto virou um
repositório só.

Então o menu usa a linguagem de HOJE: filete de 1px, sem raio, degrau de
superfície, Zodiak, e a mesma `.acao` do cabeçalho. Ele nasce do canto de cima à
direita — de onde o botão está — em 180ms, começando em 0,96 e não em zero.

**Se houver um nó do menu no desenho atual que eu não achei, é só apontar** que
eu troco. Procurei em `900:52331` (só tem a variante Default), na página
`Exploração` inteira, e nas telas de Conta.

As cinco telas vêm de `TrilhaConta`, exportadas de lá: duas listas das telas de
conta é como uma delas fica sem a próxima que alguém acrescentar.


## A gaveta NÃO é o padrão de todas as telas — 03/09/2026

Depois de a Conta virar gaveta eu ia aplicar o mesmo em Preparo e Livro. Fui
conferir antes, e os dois **não são gavetas**:

| nó | tem a sombra de gaveta? | fundo |
|---|---|---|
| `895:10599` Conta | **sim**, os cinco degraus até 242px | pontilhado por baixo |
| `895:7631` Livro | não — nenhum `242px` no arquivo | `bg-white`, liso |
| `895:7856` Preparo | não | liso, conteúdo centrado |

O Livro é página normal: cabeçalho, um `hero` com `py-64`, e uma fileira de
1222px com `gap-48`. Preparo idem.

**Fica registrado para eu não generalizar de novo**: a gaveta é o tratamento da
área de CONFIGURAÇÃO, e não de tudo que se abre. Antes de aplicar em outra tela,
procurar a sombra no nó.

## A trilha lateral lista as NOTAS, não as seções — `895:7631`

Eu tinha construído um sumário de cabeçalhos: "Início / O que ficou / Escrever
sobre / Este arquivo". O desenho lista outra coisa:

> Início · O que ficou · **Isso serve para…** · **Que método de…** · **Solto no
> livro…** · Escreva sobr…

As do meio são as PRÓPRIAS NOTAS da pessoa, cortadas nas primeiras palavras.

A diferença é o que a trilha serve para fazer. Um sumário de seções diz que a
página tem quatro partes — o que a pessoa já vê rolando. Listar as notas deixa
ela pular para UMA delas lendo o começo, e num livro com dezenas de notas é a
única forma de achar aquela.

**A mesma leitura vale para os Estudos** (`895:8849`), cuja trilha lista
"Início / O que ficou / Isso serve para… / Que método de… / Solto no livro… /
Escreva sobr…" — e lá ela ainda aparece só na parte de baixo, o que continua por
fazer.


## Estudos — os recortes, e o botão que ficou de fora · 03/09/2026

**Os três recortes do desenho não filtram estado.** Eu tinha inventado "Abertos /
Respondidos / Tudo", um filtro pelo estado do estudo — e foi por cima dessa
invenção que eu ainda perguntei ao Erik o que significaria "Em pesquisa". A
pergunta inteira nasceu de uma leitura errada de uma captura pequena demais.

Lidos no `895:8911`, `895:8913` e `895:8915`, eles trocam o que a tela MOSTRA:

| recorte | o que aparece | precisa de campo novo? |
|---|---|---|
| Estudos | o que você reuniu, por estudo | não |
| Todas as notas | tudo o que marcou, sem passar por estudo | não |
| Por pergunta | as notas debaixo da pergunta do estudo | não |

### O quadro não se arrasta, e isso é decisão

O Erik: *"kanban não funciona, interação péssima, parece de enfeite"*. A parte de
enfeite era verdade — não havia gesto nenhum. Mas o gesto que faltava **não é
arrastar**.

A coluna é DERIVADA da fração lida, que é um fato medido pelo leitor e não um
estado que alguém escolhe. Arrastar um livro para "Lido" faria o número mentir —
e é o mesmo número que a Estante, a ficha e a barra de progresso mostram. Um
quadro que deixa você declarar que leu o que não leu não organiza nada; ele
estraga a medida.

O desenho não pede arrastar: ele põe um botão **"Reler"** na coluna do que já foi
lido (`895:8849`). É esse o gesto — ler de novo zera a marca, e o livro volta
para "A ler" por si.

Construído e conferido num Chrome de verdade: `Lido 1 → Lido 0`,
`A ler 2 → A ler 3`, e o botão some com a coluna vazia.

### O quarto item NÃO foi construído, e é decisão do Erik

O desenho põe **"Escrever uma nota"** como botão dessa fileira. No modelo toda
nota pertence a um livro — `criarNota` pede um `jobId` —, e dali não há livro
escolhido.

Construir o botão sem resolver isso daria exatamente o defeito que o Erik apontou
na Leitura: *"botão que não pressiona, não muda, não dá retorno"*. Então ele não
existe, e a pergunta é:

- a nota escrita daqui **pergunta de qual livro é**, ou
- o **Canvas** é o lugar da nota sem livro, e o botão leva para lá?

**Respondido pelo Erik:** *"Canvas é lugar de nota sem livro, mas acredito que só
faça sentido se o usuário criar essa nota lá"*. E há uma segunda razão do lado
desta tela: os Estudos são sobre ORGANIZAR o que já existe — um verbo de criação
aqui produziria uma nota sem contexto de leitura, que é justamente o que separa
uma nota do Mekora de um arquivo de texto.

O botão do desenho existe, e faz a coisa honesta: **leva ao Canvas**, o lugar
onde aquilo se escreve.
