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

**Ainda ilegíveis nesta tela:** o bloco escuro com a citação e dois botões, e o
cartão "três páginas ficaram sem texto · Ver o original". Mesmo problema, mesma
saída — o id do trecho.

~~**Preparo (`966:31504`)**~~ — fechada. O alternador **Guiado / Personalizado**
subiu para o topo, e o botão do fim saiu. O **tamanho do arquivo** passou a
existir: era o único selo do desenho sem dado por trás.

**Estudo (`966:29743`)** — os nomes que eu tinha posto nesta lista estavam
errados em quatro linhas, e a ferramenta os deu certos quando perguntei um a um.
Este é o **estudo aberto**, e ele tem uma seção **"Livros"** com as CAPAS dos
livros de onde as notas vieram, e um "Ver na estante". A API já devolve os nomes
dos livros (`livros`), em texto; faltam as capas e a seção.

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
