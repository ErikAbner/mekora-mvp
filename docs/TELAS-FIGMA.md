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
| `966:29743` | M · Estudo — página | `/estudo/:id` | **comparada · falta a seção Livros** |
| `966:30269` | M · Conexões — sugestões | `/nota/:id` | **comparada · confere** |
| `966:30771` | M · Estudos — lista | `/estudos` | **comparada · corrigida** |
| `966:31095` | M · Estudos — lista (variação) | `/estudos` | **comparada · corrigida** |
| `966:31504` | M · Preparo — o que encontrei | `/preparo/:id` | **comparada · corrigida** |
| `967:31833` | M · Preparo — em andamento | `/preparo/:id` | **exige conversão rodando — ver abaixo** |
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
com os passos e o tempo de cada um. Não dá para capturá-la sem uma conversão de
verdade em curso, e o acervo semeado não converte nada. **Fica por comparar até
haver um arquivo real passando pela fila.**

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
| `895:7063` | D · Apresentação | `/` | por comparar |
| `895:7315` | D · Estante — grade | `/estante` | comparada · corrigida |
| `895:7506` | D · Livro — ficha / estante 3D | `/estante` (vista 3D) | comparada · corrigida |
| `895:6938` | D · Canvas | `/canvas` | comparada · grupos e prévia construídos |
| `895:10599` | D · Conta — visão geral | `/conta` | **comparada · ver nota abaixo** |
| `895:10715` | D · Conta — preferências | `/conta/preferencias` | por comparar |
| `895:10909` | D · Conta — dados | `/conta/privacidade` | por comparar |
| `895:11060` | D · Atualizações | `/atualizacoes` | por comparar |
| `895:11193` | D · Ajuda — início | `/ajuda` | por comparar |
| `895:9348` | D · Mesa — cheia | `/mesa` | por comparar |
| `895:9981` | D · Mesa — variação | `/mesa` | por comparar |
| `895:10286` | D · Mesa — vazia | `/mesa` | por comparar |
| `895:9736` | D · Mesa — primeira vez | `/mesa` | **comparada · corrigida** |
| `895:7631` | D · Livro — o que ficou | `/estante/:id` | por comparar |
| `895:10472` | D · Leitura | `/leitura/:id` | por comparar |
| `895:8260` | D · Estudo — página | `/estudo/:id` | por comparar |
| `895:8545` | D · Conexões — sugestões | `/nota/:id` | por comparar |
| `895:8849` | D · Estudos — lista | `/estudos` | por comparar |
| `900:56142` | D · Estudos — lista (variação) | `/estudos` | por comparar |
| `895:7856` | D · Preparo — o que encontrei | `/preparo/:id` | por comparar |
| `895:8029` | D · Preparo — em andamento | `/preparo/:id` | por comparar |
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
