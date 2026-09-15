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

**Conta (`966:25321`) — dois dos três foram construídos; sobra a senha.** O
desenho tem **retrato**, **Nome** e **Senha**.

- **Retrato e Nome existem** desde 02/09, quando o Erik decidiu que a conta os
  tem: `PATCH /eu`, `PUT /eu/retrato` e a tela em `ContaVisao.jsx`. Os dois são
  **opcionais**, e entrar nunca pede nenhum deles.
- **Senha não existe, e é decisão, não falta.** A `DEC-0039` faz a entrada por
  link no e-mail, e a tela de Segurança diz isso com todas as letras: *"Não há
  senha. Você pede um link, ele chega por e-mail, vale quinze minutos."* O
  desenho é anterior à decisão.

**O que sobra para o Erik** é só o desenho: o `966:25321` continua mostrando um
campo de senha que o produto não vai ter. Ou o quadro muda, ou ele fica como
registro de uma versão anterior da conta.

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

## Quadro não se corrige: se data

**Um quadro do Figma nunca fica errado. Ele fica VELHO** — e as duas coisas
pedem tratamentos opostos.

Apagar do arquivo o que uma decisão superou destrói a evidência de que o produto
já planejou aquilo, que é justamente o contexto de por que hoje ele faz o
contrário. O problema nunca é o quadro existir: é ele estar **alcançável como
oráculo sem aviso** — alguém abre, lê, implementa, e ninguém sabe que a coisa foi
decidida em outro lugar.

Então a política, e ela vale para todos os casos que vierem:

1. **O quadro fica no arquivo, como está.**
2. **A data e a decisão que o superam ficam AQUI**, na linha dele.
3. **A divergência entra no `DESVIOS.md`**, na seção de decisões que superam
   frame — porque implementar contra um quadro é uma decisão, e decisão sem
   registro vira "fidelidade", que é palavra que não pede justificativa.

### Os quadros datados

| quadro | o que ele mostra | o que o supera |
|---|---|---|
| `966:25321` · M · Conta | um campo de **Senha** | **`DEC-0039`** — a entrada é por link no e-mail, e não há senha. A tela de Segurança diz isso com todas as letras. Retrato e Nome, do mesmo quadro, **foram construídos** em 02/09 |
| `895:8545` e `966:30269` · Conexões | o **cabeçalho** da seção de ligações, escrito **"Relacionadas"** | **Só o cabeçalho é superado; a AÇÃO do mesmo quadro é mantida.** A seção continua sendo a do quadro, com a ação do quadro — "Conectar outra nota" → *"Ligar esta nota a qual?"* —, e o produto a chama de **"Ligadas"**. Ver a razão abaixo |

### Conexões · construído em 03/09: as duas ações da candidata

O nó `895:8780` põe **duas** ações lado a lado em cada sugestão — *"Confirmar a
ligação"* e *"Ir para nota"*. O produto tinha uma só, e nem era botão: **o cartão
inteiro era clicável e ligava no primeiro toque.**

Não havia como LER a candidata antes de afirmar que ela se liga — e ligar é o ato
de quem diz que duas notas se falam. O produto fazia a pessoa dizer isso sobre um
trecho de duas linhas que ela não podia abrir.

As duas são de categorias de interação diferentes, e o desenho respeita isso:
"Confirmar" é botão (ato), "Ir para nota" é texto sublinhado (navegação).

### Por que o cabeçalho de Conexões é o único superado

**O quadro se contradiz, e o produto escolheu o sinal mais forte dele.** O
cabeçalho diz "Relacionadas"; a ação do mesmo quadro diz *"Ligar esta nota a
qual?"*. O verbo do fluxo é LIGAR, e o substantivo tem de concordar com o verbo
— "ligar" é o verbo do produto inteiro: a tabela `Ligacao`, `/canvas/ligacoes`,
"Ligar a…" no menu do cartão. Isto não é o produto contrariando o quadro: é o
produto escolhendo, entre dois sinais do mesmo quadro, o que concorda com o ato.

**E a composição que o próprio quadro especifica quebra com o outro nome.** Logo
abaixo desta seção ficam três palpites, nomeados na voz do que pode ser
discordado. Com "Relacionadas" em cima, a coluna lê:

    Relacionadas       ← na verdade: o que VOCÊ ligou
    Parecem próximas   ← palpite
    Talvez             ← palpite
    Talvez um estudo   ← palpite

Quatro seções que soam como graus da mesma coisa, um gradiente de confiança — e a
primeira não está no gradiente: ela é fato, escrito pela pessoa. O rótulo funciona
sozinho e quebra na composição.

**"Cabeçalho superado, ação mantida"** é o registro exato, e ele existe para que
uma auditoria futura não reabra isto achando que houve descuido.

## O dado do nó vence a captura — e isto custou uma pendência de dois dias

**Do lado do ORÁCULO — o Figma —, `get_design_context` e `get_variable_defs` são
a fonte, e o PNG é render com perda.** Julgar uma região por imagem só vale
depois de conferir a **resolução efetiva daquela região**, e ela quase nunca é a
que se imagina.

O caso, medido: `get_screenshot` do `966:29052` devolve **117 × 1400** para um
quadro de **390 × 4674** — o teto do lado maior é ~1024–1400, e a largura desce
junto. Um bloco de 100px de altura no arquivo sai com **30 de altura e 117 de
largura** na imagem inteira. Foi assim que nasceu "o bloco escuro com a citação e
dois botões": não existe. São a citação com filete (`966:29082`), o botão **Ler**
em `surface/inverse` (`966:29085` — o "escuro" é só ele) e mais dois botões, e os
quatro já estavam construídos. A pendência ficou aberta desde 01/09 descrevendo
uma coisa que o arquivo não tem.

**Do lado da IMPLEMENTAÇÃO a regra é a inversa, e continua valendo:**
comportamento renderizado vence inferência de código. Ler o CSS e concluir que a
faixa cabe não é medir a faixa; foi medindo que apareceram os 102px de transbordo
do cabeçalho e os 70px do campo de busca.

Em uma linha: **no Figma, dado estrutural manda; no produto, pixel medido manda.**

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

## As capas de reserva — `1016:31030`, lido em 04/09

O conjunto chama-se **"Capa para arquivos sem capa predefinida pelo proprio"** e
existe para o caso que a Estante tinha em aberto: livro cujo arquivo não traz
capa. Antes de conhecê-lo, o produto emitia URL para uma capa que não existia, e
o `.capa-vazia` era uma caixa cinza com o título em 16px no meio — inventado,
sem quadro nenhum por trás.

São **14 capas de 420×594** — a mesma proporção que a grade já usa — e **14
lombadas de 58×594**, que no Figma se chamam `Property 1=Background`. Não são
fundos decorativos: cada uma é um GABARITO que recebe o título, com lombada à
esquerda e o texto girado nela.

A paleta inteira tem três valores: `#f4f2ec` (papel), `#101010` (preto),
`#d9d9d9` (cinza). A arte é meio-tom e marca geométrica.

**A regra do Erik, 04/09:** *"em caso de não haver borda ou lateral a gente
segue o padrão de cor sólida principal do livro"*.

| variante | nó | variante | nó |
|---|---|---|---|
| 1 | `1016:31028` | 8 | `1016:31015` |
| 2 | `1016:31018` | 9 | `1016:31021` |
| 3 | `1016:31014` | 10 | `1016:31024` |
| 4 | `1016:31027` | 11 | `1016:31013` |
| 5 | `1016:31017` | 12 | `1016:31006` |
| 6 | `1016:31019` | 13 | `1016:31023` |
| 7 | `1016:31022` | 14 | `1016:31012` |

Os ids ficam aqui pela mesma razão que os das telas: **o `get_metadata` da
página vem truncado** e não devolve os filhos, então achar o conjunto de novo
custa um clique do Erik. Com o id do conjunto em mãos, `get_metadata` nele
devolve os catorze — foi assim que esta tabela nasceu.

## `964:24606` — M · Estante, conferida por DADO DE NÓ · 04/09

A primeira das cinquenta e uma. O inventário dizia **"comparada · corrigida"** —
por captura, que era o único método na época. Dez divergências.

**Bate:** grade de 2 colunas · vão 24 entre colunas e 40 entre linhas · capa em
420/594 · vão de 24 entre a capa e o texto · sem transbordo horizontal.

**Divergia:**

| medida | nó | produto | |
|---|---|---|---|
| vão título→autor | 16 (`966:25142`) | 8 | corrigido |
| título | 24/32, peso 500 (`966:25145`) | 20/28, peso 400 | corrigido |
| autor | 20/30 (`966:25146`) | 18/27 | corrigido |
| regra duplicada | — | `.livro-texto h3` e `p` duas vezes no mesmo `@media` | removida |
| recheio do alternador | 10 (`966:25072`) | 8 | **aberto** |
| botão do alternador | 14/24 (`966:25075`) | 12/16 | **aberto** |
| largura do funil | 58 (`966:25080`) | 85 | **aberto** |
| recheio do funil | 17 | 12/16 | **aberto** |
| barra inferior | recheio 12, item 16 (`964:24800`) | 8 e 8/4 | **aberto** |
| vão alternador→grade | 40 (`964:24611`) | 48 | **aberto** |

**A pergunta da regra duplicada tinha uma terceira resposta: nenhuma das duas.**
Havia `h3` em 20/30 e depois 20/28, `p` em 16/24 e depois 18/27. A segunda
vencia, a primeira era morta — e o nó põe 24/32 e 20/30. O desenho do telefone
**não encolhe** a tipografia; quem encolheu foi a folha, e depois encolheu de
novo por cima.

**Duas cores do desenho não estão no sistema.** O portão reprova `#111111` e
`#f4f2ec`, que são a tinta e o papel das capas de reserva do conjunto
`1016:31030`. Elas vieram do quadro e não são token. Decisão do Erik: ou a
paleta das capas entra no sistema como superfície própria — capa de livro não é
cromo de interface —, ou as capas passam a usar tokens e divergem do desenho.

**O corpo das capas também bateu no sistema.** O desenho põe crédito, formato e
data em 10px numa capa de 420. O produto mostra a capa em 252 no computador e
159 no telefone, onde os 10 viram 6 e 3,7 — o degrau mais baixo da escala é 14.
Os três saíram do desenhado; o CSS deles fica escrito para quando houver um
lugar que mostre a capa em 420.

## `966:29395` — M · Leitura, conferida por DADO DE NÓ · 04/09

**Bate:** a prosa. `.bloco.paragrafo` em 20/30 com recuo de 32 — exatamente
`corpo/body-medium-prosa`, `entre/body-medium-prosa` e `indent-[32px]` do nó
`966:29675`. E a cor, `#6a6a6a`.

**Corrigido:** a entrelinha do título de abertura. Estava em 64 com corpo 56; o
nó `966:29657` põe `leading-[72px]` no mesmo corpo 56 — a mesma entrelinha do
computador. O comentário da folha dizia que 56 vinha "como o desenho mobile
pede", e vinha; a entrelinha desceu junto por conta própria. É o mesmo
encolhimento automático que a Estante tinha: a folha reduz o que o desenho
mantém.

### O cromo diverge por CONTAGEM, e não por recheio

Medido a 390: caixa com recheio 6, botões com 10. O nó põe **12 na caixa e 16
no botão** — os mesmos do computador, sem encolher.

Mas o comentário da folha explica por que alguém encolheu:

> *"O desenho mostra os seis numa fileira só, em botões menores."*

Lido por captura. Por dado de nó, o desenho tem **cinco** itens, não seis nem
sete: `919:18713` traz três à esquerda — menu, notas, marcadores — e
`919:18714` traz dois à direita.

O produto tem **sete**: Menu, Índice, Notas, Marcadores, Aparência à esquerda;
Buscar e Conta à direita. Com sete, o recheio do desenho não cabe a 390 — a
conta dá 480px numa tela de 390. Então encolheram o botão em vez de perguntar
pela contagem.

**Não corrigi**: tirar Índice, Aparência ou Conta do cromo é decisão de produto,
e é a forma precisa do item 24 do Erik ("menu errado"). Com cinco itens, o
recheio do desenho cabe e o encolhimento some sozinho.

**Aberto também:** o `letter-spacing` do título. A folha usa `-2.5%` por
decisão escrita ("tracking relativo, nunca absoluto"); o nó põe `-1.6px`, que
em 56px dá `-2.86%`. Diferença de 0,2px por letra — registrada, não mexida,
porque a regra do relativo é decisão anterior e vale discutir antes de trocar.

## `966:31504` — M · Preparo, "o que encontrei": MEDIDA, enfim · 04/09

> **A bancada alcançou.** O bloco abaixo é o registro de por que ela não
> alcançava; a comparação das catorze linhas vem depois dele.

Tentei conferir por dado de nó e parei antes de medir: **o acervo semeado não
produz o estado que esta tela mostra.**

O `scripts/semear.py` grava trabalhos em `converted` e `done`. A tela
`966:31504` é o estado **`analyzed`** — o momento em que a análise terminou e a
pessoa ainda não decidiu nada. Pedindo `/preparo/{id}` na bancada, o que aparece
é "Analisando o arquivo…", que é outra tela (`967:31833`).

**Isto é uma tela inteira que a bancada nunca mostrou, e portanto nunca foi
medida — nem por mim, nem pelas auditorias anteriores.** E não é uma tela
qualquer: é onde a pessoa lê o que o Mekora encontrou no arquivo dela e decide
se aceita as recomendações. É o item 34 do Erik — *"bem errada também, não
condizendo com o Figma"*.

**O que falta é um trabalho semeado em `analyzed`.** Uma linha no semeador, e
ela vale mais que a medida: enquanto não existir, qualquer varredura que rode
"em todas as rotas" continua passando por `/preparo/:id` e medindo a tela
errada, com verde.

O que o nó pede, para quando der para medir:

| | |
|---|---|
| cabeçalho | `p-16`, busca `px-16 py-17`, atalho `p-17`, vão 16 |
| hero | `py-56 px-16`, coluna com vão 48 |
| capa | `aspect 427/645` dentro de bloco `aspect 270/407` |
| título | Heading/MD 32/40, peso 540, `#535353` |
| botão ⋮ | 56×56, `p-8`, girado -90° |
| selos | `px-17 py-13`, raio 24, Label/Small 14/22, vão 16, quebram linha |
| título→selos | vão 32 · selos→alternador: vão 64 |
| alternador | `p-9.5`, botões `px-24 py-14` |
| corpo | `pb-64 px-16`, seções com vão 48, blocos com vão 64 |
| faixa do veredito | `border-l-2 #6a6a6a`, fundo `#f3f3f3`, `px-24 py-40`, vão 24 |
| cartão | fundo `#f9f9f9`, `px-24 py-40`, vão 24; lista com vão 24 |
| botão do cartão | `h-58`, `px-33 py-17`, borda `rgba(0,0,0,0.15)`, texto `#464646` |
| ações finais | vão 16, botões `h-58` |

**E os ícones desta tela estão em branco no quadro**, como nas Configurações de
arquivo: quadrados `32×32` em `#d9d9d9`, oito deles. É a mesma lacuna que fez o
ícone de "ver todas as páginas" nascer clonado do Canvas — e ela vai se repetir
aqui se alguém preencher por conta própria.

### A bancada passou a alcançar · 04/09

`scripts/semear.py` grava um trabalho parado em **`analyzed`**: 312 páginas,
idioma `pt`, 14 capítulos declarados, 11,5 MB, **sem capa e sem miniatura**. Os
números são os do nó de propósito — o selo "11.5 MB" e os "14 títulos de
capítulo" —, e o título e o autor vêm preenchidos porque o veredito do `895:7856`
diz *"UMA coisa eu resolvi sozinho"*, no singular: sem título detectado a tela
decidiria duas e a frase mudaria de número.

**Não precisa de arquivo em disco**, e é isso que torna a linha barata:
`GET /analyze/{id}` devolve o trabalho em cache assim que `status != "uploaded"`.
O que ele não faz é converter — o botão "Preparar com recomendações" desta linha
falha de propósito, e a tela sob medida é a de ANTES da decisão.

O endereço saiu do palpite: `scripts/_sessao.py … analisado` imprime o id, o
`sessao-de-prova.sh` o devolve na terceira linha, e as provas o pedem por
`{ANALISADO}`. **Apontar a medida para "o primeiro livro" era o erro que deixou
esta tela sem medida:** o primeiro livro já está convertido, e `/preparo/{id}`
sobre ele abre a tela de espera.

### As catorze linhas, medidas a 390

Nenhuma rolagem horizontal. **Três batem, onze divergem** — e duas das onze não
são número, são peça faltando.

| linha | o nó pede | medido | |
|---|---|---|---|
| cabeçalho | `p-16`, busca `px-16 py-17` | `12/16`, busca `13/16` | diverge |
| hero | `py-56 px-16`, coluna vão 48 | sem recuo próprio (`0/0/0/0`), vão **24** | diverge |
| capa | img `427/645` (0,662) em bloco `270/407` (0,663) | bloco **0,707** | diverge — 0,707 é `420/594`, a razão da **Estante** |
| título | 32/40, peso **540**, `#535353` | **28**/40, peso **700**, `#151515` | diverge nos três |
| botão ⋮ | 56×56, `p-8`, girado −90° | **não existe** | falta |
| selos | `px-17 py-13`, raio **24**, 14/**22**, vão 16 | `4/12`, raio **999px**, 14/**20**, vão **8** | diverge |
| título→selos | 32 | **12** | diverge |
| selos→alternador | 64 | **20** | diverge |
| alternador | `p-9.5`, botões `px-24 py-14` | `12/12`, botões `12/16` | diverge |
| corpo | `pb-64 px-16`, seções vão 48 | `32/40/80/40`, seções vão **28** | diverge |
| faixa do veredito | `border-l-2 #6a6a6a`, fundo `#f3f3f3`, `px-24 py-40`, vão 24 | **sem filete** (`0px`), fundo `#f3f3f3` ✓, `20/24`, vão **6** | fundo bate, o resto não |
| cartão | fundo `#f9f9f9`, `px-24 py-40`, vão 24 | fundo `#f9f9f9` ✓, `16/20`, lista com vão **1px** | fundo bate, o resto não |
| botão do cartão | `h-58`, `px-33 py-17`, borda `rgba(0,0,0,.15)`, texto `#464646` | **h-58 ✓**, `16/32`, borda `#878787`, texto `#6a6a6a` | altura bate |
| ações finais | vão 16, botões `h-58` | vão **12**, botões **h-80** | diverge |

**As duas que não são número:**

1. **O botão ⋮ não existe.** O nó o desenha 56×56 girado −90° ao lado do título;
   a tela não tem nada ali. Não é medida errada: é peça ausente.
2. **A faixa do veredito não tem o filete à esquerda.** `border-l-2 #6a6a6a` é o
   que faz aquele parágrafo ser uma FAIXA e não um bloco cinza qualquer — e é a
   regra do sistema que o repositório já escreveu ao contrário uma vez: *"o chão
   marca o conteúdo; o filete marca a citação"*. Aqui o desenho pede os dois, e
   só o chão está.

**E uma terceira, que veio de graça com a bancada nova:** a capa do Preparo cai
para `<span>{titulo}</span>` dentro de `.preparo-pagina-capa` — **uma quarta
implementação divergente do "sem capa"**, depois das três que a `CapaDeReserva`
unificou no R-47. Medido: `ehComponenteDeReserva: false`. Foi só existir um
trabalho sem capa para ela aparecer.

**Os ícones continuam sem preencher, e de propósito.** O aviso do bloco acima
vale: oito quadrados `32×32` em `#d9d9d9` no quadro, e preencher por conta
própria é como o ícone de "ver todas as páginas" nasceu clonado do Canvas.
Medido em 04/09, no R-49: `icone-indice.svg` e `icone-menu.svg` são byte a byte
iguais, e `icone-canvas.svg` e `icone-paginas.svg` também.

## `966:30771` — M · Estudos, primeira medida · 04/09

A rota nunca tinha sido medida: até hoje a bancada mostrava o portão de quem não
entrou nela e em mais seis (ver `docs/BANCADA-CEGA.md`). Esta é a primeira vez
que alguém compara.

**Corrigido, e vale para TODAS as telas:** o cabeçalho tinha `padding: 12px 16px`
no telefone. Quatro nós diferentes — Estudos `966:31048`, Estante `964:24607`,
Preparo `966:31683` e Conta `966:25486` — põem `p-[16px]` fechado. É o mesmo
componente em todas, então é um conserto só. Medido depois: 16px, sem transbordo
horizontal, portão passa em cinco rotas.

**O item 20 do Erik é de COMPUTADOR.** *"Div central com 2 larguras sem
necessidade"* — a 390 há duas larguras e as duas são certas (342 é o conteúdo
dentro dos 16 de respiro, 390 é a faixa de borda a borda). A outra sessão mediu
NOVE larguras a 1440. A tela do telefone está bem nessa medida; o problema é o
desktop, e é lá que ele precisa ser conferido contra o `895:8849`.

**Registrado, não mexido:** `.cabecalho-acoes` tem vão 8 e o nó da caixa de ações
pede 16. Não toquei porque não confirmei que os dois são a mesma peça — e hoje
oito seletores meus pegaram o elemento errado, o que é justamente o motivo de a
regra da busca ter entrado no `CLAUDE.md`.

**O que a varredura do telefone diz desta tela:** duas linhas, as duas em
`.estudos-fio-conta` — corpo 20→18 e entrelinha 30→27. Ficam para a conferência
contra o nó, com o resto das 51.

## `895:8849` — D · Estudos, o item 20 medido · 04/09

O item 20 do Erik é *"div central com 2 larguras sem necessidade"*. Ele estava
certo sobre haver mais de uma, e errado sobre o número — como eu sobre a leitura
dele.

**A 1440 há DOZE larguras distintas:**

```
1440  cabeçalho                        ← borda a borda, esperado
1222  estudos · estudos-topo           ← BATE com o nó (1222 aparece 5 vezes lá)
1172  estudo-livros
 974  estudos-de-baixo · estudos-fios
 910  estudos-fio-notas
 580  · 560 campo · 546 lugares · 505 recortes
 476  cabecalho-acoes                  ← BATE (o nó põe 476)
 411  estudos-vistas · 389 fio-acoes
```

**O que está estabelecido:** a coluna principal está certa. 1222 no produto e
1222 no nó, cinco vezes. E a caixa de ações do cabeçalho, 476 nos dois. Isso não
se sabia antes desta medida.

**O que NÃO está, e não vou fingir que está:** se 1172, 974 e 910 divergem. O nó
também tem blocos internos de larguras variadas — 755, 746, 616, 587, 287, 270,
205, 184, 174, 137, 130, 116, 93, 72 —, então "o nó tem uma coluna só" é leitura
minha, e é falsa. Dizer que três larguras sobram exigiria mapear bloco a bloco,
e isso é a Fase 4 desta tela por inteiro.

**Uma hipótese minha que a medida derrubou:** achei que `.estudo-livros` fosse um
`<ul>` com o recuo padrão do navegador — o clássico dos 40px. Medido:
`padding-inline-start: 0` em TODAS as listas da tela, e o pai do `<ul>` de 1172
também mede 1172. O estreitamento acontece acima dele, e não nele.

Fica como a fatia seguinte, com o mapeamento bloco a bloco por fazer.

## `895:7315` — D · Estante: a grade cabia um livro a mais · 04/09

**Medir na largura do QUADRO, e não numa qualquer.** A primeira medida foi a
1440 e disse "coluna de 852 onde o nó pede 1221, três colunas onde ele pede
quatro". As duas coisas eram falsas: o quadro `895:7315` é de **1920**, e a 1440
o produto estava só respondendo à janela menor.

Quase virou dois achados inventados. Quadro de desktop mede-se a 1920; o de
telefone, a 390 — e isso passa a valer para as 45 telas que faltam.

**A 1920, o achado é o oposto e é real:** cinco livros por linha onde o desenho
põe quatro, com a coluna de conteúdo em 1332 contra os 1221 do nó.

A causa é uma só: `grid-template-columns: minmax(0, 1fr) 476px` — a coluna de
conteúdo crescia até onde a janela deixasse, e a grade fluida (`auto-fill`,
mínimo 220, vão 48) cabia mais um.

Com o teto nos 1221 do nó, a conta fecha sozinha: `(1221 + 48) / (220 + 48)` dá
exatamente quatro. Não é conta minha — é a mesma que o desenho fez.

E `justify-content: space-between`, porque no `895:7366` o conteúdo e a ficha
ficam nas duas pontas com o resto de sobra entre eles: a 1920 sobram 159px, e o
`gap: 48` fixo os grudava.

Medido depois: **a 1920, 4 colunas e coluna de 1221** — o nó exato. A 1440
degrada para 3 e 852, que é a resposta honesta a uma janela menor.

**Também corrigido:** o recheio do alternador no telefone, 8 → 10. O 12 do
computador estava certo (`917:8199`); o 10 é do nó de telefone (`966:25072`), e
o produto encolhia mais do que o desenho.

Portão passa a 1920, 1440 e 390.

## `895:10472` — D · Leitura, spec lida · 04/09

A tela de leitura de computador nunca tinha sido medida em largura nenhuma. A
spec fica aqui para a comparação ser uma passada, e não uma descoberta.

O quadro é de **1920**, e o contêiner do conteúdo mede **1856**.

| | |
|---|---|
| cabeçalho | `px-32 py-16`, `mb-[-82px]` — ele encavala o conteúdo |
| cromo (`919:18768`) | `p-8`, duas caixas nas pontas, cada uma `p-12` com itens `p-16` |
| abertura (`895:10562`) | `p-64`, vão 64, altura 564 |
| título | Display/Large — 64/72, Extrabold, `#151515` |
| autor | Body/Medium 20/30 |
| **coluna de prosa** | **680px fixos**, dentro de um `p-64` |
| prosa | `body-medium-prosa` 20/30, recuo 32, vão 32 entre parágrafos |
| destaques | as quatro cores do sistema, faixas de 28 a 36 de altura |
| imagem | 1540×830, dentro de `p-64` |
| rodapé preto | `pt-128 px-64`, vão 128, marca 1704×212 |

**Uma pendência fecha de graça.** O `letter-spacing` do título estava registrado
como divergência: a folha usa `-2.5%` por decisão escrita ("tracking relativo,
nunca absoluto") e a instância do nó diz `-1.6px`. O ESTILO do nó diz
`letterSpacing: -2.5` — e a 64px, -2,5% dá exatamente -1,6px. **São o mesmo
valor**, e o produto está certo. A divergência era da minha leitura, não da
folha.

**O rodapé desta tela é o A-14**: `895:10591` traz "Link link link" quatro vezes
e a marca. É o único quadro com rodapé entre as sete telas lidas em 04/09, e é
placeholder — por isso a Leitura ficou de fora da retirada de rodapés das seis
superfícies de produto.

**Medido a 1920 e corrigido:** a abertura tinha vão 40 e altura livre — 345
contra os 564 do nó. Os dois nós, computador e telefone, pedem vão 64 e
`h-[564px]`. A altura fixa não é capricho: com altura de conteúdo, um título
curto encolhe a abertura inteira e o efeito de "abrir um livro" some.

No telefone o recheio era 40/24 e o vão 24, contra `py-64 px-16` e vão 64 do
`966:29655`. Terceiro caso do mesmo reflexo nesta tela.

**Batem sem tocar:** coluna de prosa em 680 exatos, prosa 20/30 com recuo 32,
título 64/72 peso 700 com tracking -2,5%. Portão passa a 1920 e a 390.

## `895:6938` — D · Canvas, primeira medida contra o nó · 04/09

**O que BATE, e é a maior parte:** o Dock em 86 de largura, encostado a 16 da
esquerda, com três botões, recheio 16 e vão 16 — o `900:52962` inteiro. A nota
em 375. A prosa da nota em Body/Medium 20/30. A seção com borda tracejada de
1px e rótulo em 20/30. A posição do zoom (`bottom-16 right-16`).

**Corrigido:** o dentro do controle de zoom. Recheio 4 e vão 4 com o valor em
16px, onde o `895:7014` põe recheio 16, vão 24 e Body/Medium. A posição já
estava certa; o que divergia era o interior — um controle apertado onde o
desenho põe um respirado.

**RESOLVIDO EM 07/09, e não por medida nova — por uma regra.** O recheio da nota
voltou aos **40** do `895:7033`. Estava em 24, com um argumento meu escrito na
folha:

> *"Antes: 40px de recheio e uma sombra dupla forte que fazia o cartão ler como
> bloco flutuante, não como artefato de estudo. Agora: recheio na grade (24px, o
> passo da malha), um filete fino e uma sombra sussurrada."*

O argumento continua de pé como argumento, e mesmo assim perde. O Erik deu a
regra no mesmo dia, a propósito da ilustração do Kindle: *"não substituir uma
decisão explícita do desenho por outra ilustração apenas para evitar
repetição. Se posteriormente criarmos uma própria, isso será uma alteração
deliberada"*. Vale igual para um número: quando o quadro diz 40 e eu acho 24
melhor, o quadro fica — e a mudança, se vier, é dele.

**O que também veio daquela passada e FICA:** a sombra sussurrada e o filete
fino, no lugar da sombra dupla forte. Ali não havia número do nó sendo
contrariado; havia uma sombra minha trocada por outra minha, e a segunda é a da
identidade.

**QUATRO SELETORES MEUS ERRARAM NESTA TELA**, e a regra do `CLAUDE.md` pegou os
quatro antes de virarem conserto: o Dock "não existia" (procurei por `dock` e
`doca`, e ele é `.canvas-ferramentas`); a seção "não tinha borda" (ela está no
filho `.canvas-secao-area`); o fundo "não batia" (a bancada estava em tema
escuro, e `rgb(28,28,28)` é o `surface/inverse`, não ausência de fundo).

Nenhuma das três era defeito do produto. Sem a regra, teriam virado três
consertos de coisas que já estavam certas.

## 04/09 — a Mesa e o Livro, conferidas contra o NÓ

As duas estavam marcadas "comparadas" no quadro, e o quadro as recusava por
INSTRUMENTO ERRADO: a comparação tinha sido feita contra **captura**. Numa
miniatura de 1024 no lado maior, 32px e 40px são o mesmo pixel. Refeitas contra
`get_design_context`, com duas medidas novas (`scripts/medidas/mesa-contra-no.js`
e `livro-contra-no.js`) que colhem do navegador o que ele compôs, em número.

**Uma armadilha do método, e ela vale para tudo que já foi comparado aqui:** o
Chrome da bancada herda o tema do macOS, que está escuro. As duas primeiras
capturas do produto saíram em tema escuro e os nós são claros — comparação de
cor entre telas de cores diferentes. As capturas de comparação agora forçam
`data-tema="claro"` antes de fotografar.

### Mesa — `895:9348` (cheia), `895:9981` (variação), `966:28476` (telefone)

**A ORDEM ESTAVA INVERTIDA, e os três nós concordam.** O desenho põe o cartão
**Continue** logo abaixo da área de soltar, e **Em preparo** em seguida. A tela
fazia o contrário. O comentário no `MesaCheia.jsx` citava só o `895:9981` para
justificar o Continue no fim — e o `895:9981` mostra o Continue no começo, como
os outros dois. Não era conflito entre desenhos: era a tela invertida, com um
comentário que afirmava o oposto do nó que ele citava. **Consertado.**

A ordem tem razão, e ela sobrevive a quem não viu o desenho: quem chega na Mesa
quase sempre volta para o que estava lendo. A fila é o que já foi mandado fazer.

**"N arquivos adicionados" ficava em primeiro, colado nos recortes de estado.**
No `895:9523` a faixa é um `justify-between`: os recortes de estado numa ponta,
o total na outra. Colado nos outros, ele se lê como mais um recorte de estado —
e não é: os outros dividem a fila, ele mostra a fila inteira. **Consertado**
(`margin-inline-start: auto` no último, sem tocar no `.recortes` que a Estante
também usa).

**O título "Em preparo" estava um degrau abaixo.** O `895:9520` traz
`corpo/heading-lg` 40 sobre `entre/heading-lg` 48, entreletra -0.6px; a tela
tinha 32/40. O efeito era "Em preparo" pesar MENOS que "Ficaram prontos" e "Na
estante" logo abaixo, que já estavam em 40/48 — a tela hierarquizava ao
contrário do desenho. **Consertado.**

#### O que NÃO foi consertado, e por quê

- ~~**A forma dos recortes.**~~ **RESOLVIDO em 04/09.** No nó
  (`895:9525`–`895:9532`) cada recorte é um chip solto, com borda de 1px
  colorida por estado, fundo quase branco, recheio 25/17 e 24 de vão, **sem
  caixa em volta**. As três cores do desenho — `#e2791e`, `#1da832`, `#dd2525` —
  não existem no sistema. **Erik decidiu:** *"pode seguir as cores que já
  definimos pro sistema, sem adicionar cores semânticas novas"*. Construído com
  `--warning`, `--success` e `--destructive`, que vivem nos dois temas.
  A regra fica escopada em `.preparo` para a Estante — que usa o mesmo
  `.recortes` na forma de caixa — não mudar junto.
  **"Precisa de você" é o único que não sai do nó:** lá ele é uma seção, não um
  recorte. Recebeu a tinta forte, que não é cor semântica nova. Se ele virar
  seção, a linha sai junto.
- **A caixa em volta de "Em preparo"** (`background: var(--card)`, 1096 de
  largura). Nos dois nós de computador o título é solto sobre o fundo da página
  e só os cartões da fila têm caixa; a coluna mede 876.
- **A largura da coluna.** O nó traz 1096 na área de soltar (que a tela acerta),
  e 876/888 nas outras seções; a tela usa 1096 em todas e 760 nas faixas. Os
  876/888 são medidas do Figma, não tokens — e escolher entre eles seria
  inventar uma coluna. Precisa de um número decidido.
- **O recorte "Precisa de você".** A tela tem seis recortes, o nó tem quatro
  mais o total: no desenho, "Precisa de você" é uma **seção própria** entre a
  fila e as capas, e não um recorte. A seção existe na tela (`PrecisaDeVoce`), e
  a bancada não semeava nenhum arquivo nesse estado — o mesmo buraco do R-50.
  Ter as duas coisas pode ser certo; é decisão de produto.

### Livro — `895:7631` (computador), `966:29052` (telefone)

**O topo estava com o texto amassado, e a causa é de classe.** Na captura de
04/09, "Origem · malha-urbana.pdf" e "EPUB · 80% lido" apareciam desenhados por
cima dos selos. As caixas não se sobrepunham — cada uma media **metade da
entrelinha**: autor 13px de 28, origem 10px de 20, "lido" 11px de 24 —, e o
texto transbordava a sua e caía na vizinha.

A causa é o `text-box-trim` que o `base.css` ligou em 03/09, e ele já avisa o
preço com todas as letras: *"o vão de cada bloco está no desenho, escrito. Cada
tela recebe o número de lá conforme for refeita."* Esta tela ainda não tinha
sido refeita. As margens dela (8, 16, 20) foram escritas quando a meia-entrelinha
ainda sobrava dos dois lados do texto; com a caixa aparada elas viraram o vão
inteiro. **Toda tela ainda não refeita depois de 03/09 tem esse defeito à
espera** — a Ajuda, as Atualizações e os Termos já foram; o resto não.

**Consertado, com os números vindos do nó e não de mim:**

| o que | nó | estava |
|---|---|---|
| vãos do bloco de identidade | 32 título→dados, 24 selos→origem, 16 entre selos, 16 no bloco da leitura (`895:7688`, `7693`, `7694`, `7700`) | margens de 8/16/20, escritas antes do trim |
| título | 40/48 (`895:7690`) | 32/40 |
| autor | 20/30, **junto com a barra** (`895:7700`) | 18/28, logo abaixo do título |
| origem | 16/24 (`895:7699`) | 14/20 |
| selos | recheio 13/17, vão 16 (`895:7694`, `7695`) | recheio 6/14, vão 8 |
| os três botões | **em linha**, vão 24 (`895:7709`) | empilhados, vão 10 |
| capa e identidade | 48 de vão (`895:7683`) | 32 |
| coluna e recheio | 1222 / 64 (`895:7683`) | 1140 / 40 |
| razão da capa | 420/594 = 0,707 | **2/3 = 0,667** |

A razão da capa merece nota: a ficha e a Estante desenhavam o **mesmo objeto**
com formas diferentes — a prova r47 cobra 0,707 na Estante, e aqui era 2/3. Quem
abre um livro vem justamente da Estante.

Os botões empilhados davam a "Enviar ao Kindle" e a "Ver o preparo" o mesmo peso
vertical de "Ler": três ações de frequências muito diferentes lidas como lista.

#### O que NÃO foi consertado, e por quê

- ~~**A largura da capa.**~~ **RESOLVIDO em 04/09.** O nó traz 427, e ela não
  cabia: a trilha lateral comia 248px do topo. **Erik decidiu:** *"pode remover
  essa navegação, que nem era pra existir nessa tela"*. A trilha saiu, a capa
  está em 427 e o topo tem os 1222 do nó — 427 de capa, 48 de vão, 747 de texto.
  Duas larguras vinham junto e estavam erradas pelo mesmo motivo: o
  `max-inline-size: 1222px` da página contava o recheio por dentro (dando 1094
  de conteúdo), e o `.livro-pagina-corpo` guardava um teto de 900px que era a
  medida de leitura de uma coluna que dividia a página com a trilha.

  **Uma coisa fica em aberto, e é do desenho.** O `895:7631` tem, à esquerda do
  bloco "O que ficou", uma coluna de linhas com "Início / O que ficou / Isso
  serve para… / Que método de… / Solto no livro… / Escreva sobr…". Foi ela que
  eu li como trilha e construí. O Erik diz que aquilo não é navegação e não era
  para existir. **Ela continua no nó** — resta ele dizer o que é, porque muda o
  que se constrói ali. A decisão de tirar a que existia não depende disso.
- **A mesma trilha existe em outras três telas** — `EstudoPagina`, `Estudos` e
  `Sistema` — pelo mesmo componente (`TrilhaDaPagina`). Só a do Livro foi
  removida, porque só dela o Erik falou. As outras três precisam da mesma
  pergunta.
- **O rótulo do botão principal.** O nó diz **"Ler"**; a tela diz "Continuar
  lendo". Palavra é decisão dele, e "Continuar lendo" carrega uma informação que
  "Ler" não carrega — que você já começou.
- **Quantos selos.** O nó tem dois (`EPUB`, `93 de 96 páginas`); a tela tem
  quatro (formato, tamanho, páginas, estado) e pode ter cinco. Nenhum deles é
  ruído, mas quatro é outra coisa que dois.
- **As faixas coloridas das notas.** A tela pinta cada nota com a cor do
  marcador; no nó as notas são cartões brancos com o texto em negrito e
  "Capítulo X" abaixo. Isso encosta no R-48 — o Erik já disse que as cores são
  provisórias e quer poder trocá-las.
- **A ilustração de "Escrever sobre o livro"**, presente no nó e ausente na tela.

### O telefone das duas, conferido depois — `966:28476` e `966:29052`

Mexer no computador quebrou o telefone das duas, e as duas só apareceram na
captura a 390.

**Mesa.** Os chips soltos herdavam o `flex: 1 0 auto` que o `estante.css` põe em
`.recortes button` abaixo de 767 — cada um esticava para a largura inteira e a
fileira virava uma pilha de seis blocos, de 61px para mais de 400px de altura. O
nó (`966:28582`, `966:28591`) tem os quatro estados num `wrap` de **16** de vão
(e não os 24 do computador), com "N arquivos adicionados" como bloco **irmão**,
32 abaixo. Construído assim.

**Livro.** Os três botões estavam com `align-items: stretch` e
`inline-size: 100%` — barras de largura inteira, dando a "Enviar ao Kindle" e a
"Ver o preparo" o mesmo peso de "Ler". É o mesmo defeito que o computador tinha
antes de eles irem para uma linha só. O nó (`966:29084`) é `flex-col` com vão 16
e **`items-start`**: cada botão mede o próprio conteúdo.

**O resto do telefone bate com o computador, e isso foi o achado.** O
`966:29052` mantém os MESMOS números do `895:7631` — título 40/48, selos 14/22
com recheio 13/17, origem 16/24, autor 20/30, citação 20/30, botões 16/24. Só o
vão dos botões muda, de 24 para 16. Não há uma escala de telefone: há uma escala,
e um arranjo por tamanho.

### Estante — grade, `895:7315` (computador)

**Ela bate.** É a primeira tela desta rodada em que a medida não achou defeito de
geometria nenhum, e vale registrar o que foi conferido para a próxima pessoa não
refazer: coluna 1221, quatro colunas, vão 64 nas linhas e 48 nas colunas, capa
em 420/594, título do cartão 24/32 peso 500, autor 20/30, recortes com recheio
12 e botões 24/14 em 16/24, ficha de 476 com vão 40, título dela 32/40 peso 540,
botões de 58 com recheio 16/32. Todos conferem com o nó.

**Um falso positivo que quase virou conserto.** O nó põe `text-center` no título
de cada cartão, e a tela alinha à esquerda. Só que ali o `text-center` é
**inerte**: o bloco tem `whitespace-nowrap` e `shrink-0`, então ele mede o
próprio texto, e centralizar dentro de uma caixa do tamanho do conteúdo não move
nada. Na captura do nó os títulos estão à esquerda, como na tela. Eu ia
"consertar" um alinhamento que o desenho não pede.

**E um segundo:** o primeiro cartão da bancada não tem marcador de notas, e a
medida leu isso como peça faltando. É o trabalho em `analyzed` do R-51 — ele não
tem notas. A medida passou a clicar num livro que TENHA nota antes de olhar a
ficha, senão ela mede "0 notas, sem barra, sem citação" e eu leio três peças
ausentes onde há um dado vazio.

#### As divergências, e nenhuma é de geometria

- **Os recortes têm número na tela e não no nó** — "Tudo 7", "Com nota 5". O
  `895:7369` traz só os rótulos. Na Mesa o nó TEM os números, então isto não é
  regra do sistema: é uma tela que diverge da outra. O número aqui não é enfeite
  — é ele que sustenta o recorte vazio ficar desabilitado. **Decisão de produto.**
- **"Filtrar" no alternador.** A tela tem três botões onde o nó (`917:8198`) tem
  dois: Capas e Estante em 3D.
- **A cor do título da ficha.** O nó pede `text/primary #535353`; a tela usa
  `--foreground #151515`. **Não mexi:** `#535353` não existe como variável no
  produto, e criá-la é acrescentar cor — o oposto do que o Erik decidiu em 04/09.
- **A etiqueta `#Design`** (pílula de `rounded-[32px]` no `917:8379`). O produto
  não tem etiquetas de nota — não é fidelidade que falta, é funcionalidade que
  não existe.
- **"Ver detalhes do arquivo"**, o expansor da ficha, não está no nó.

**O que esta conferência NÃO cobriu:** o estado de hover dos cartões (R-01, que
continua aberto — "hover nos livros é muito feio"), a vista Estante em 3D
(`895:7506`) e o telefone (`964:24606`, já conferido em 04/09 contra o dado do
nó).

### Estudos — lista, `895:8849` (computador)

**O quadro de três colunas existe, e eu quase escrevi que não.** A primeira
comparação pôs a captura do nó ao lado da captura da tela e concluiu: "o kanban
não está no produto". O nó mostra o alternador com **"Leitura"** marcado; a tela
abre em **"Lista"**. Duas telas, dois estados, e a diferença lida como peça
faltando. É o R-50 outra vez — instrumento certo, estado errado —, e desta vez
comparando com o desenho em vez do banco.

Com a vista certa aberta, o quadro está lá: "A ler", "Lendo", "Lido", com
contador em cada título, capa, nome, autor, e a porcentagem com barra na coluna
do meio. A medida agora clica em "Leitura" antes de olhar.

**Dois números consertados**, com os do nó:

- vão entre as colunas **48**, e não 32 (`895:8945`). A 32 o vão entre colunas
  era igual ao vão entre a coluna e o cartão dentro dela, e nada dizia onde uma
  acaba.
- capa do cartão **93**, e não 56 (`895:8953` e irmãos). A 56 ela vira miniatura
  de lista e deixa de ser reconhecível — e é pelo desenho da capa que a pessoa
  acha o livro, como acha na Estante.

**E um erro de leitura meu, do tipo que este arquivo já documenta.** Li "Por
pesquisa" no terceiro recorte a partir da captura reduzida; a tela diz **"Por
pergunta"**, que é o que o nó pede. O próprio `Estudos.jsx` registra que uma
leitura de captura pequena demais já me fez fazer ao Erik uma pergunta sobre um
rótulo que não existia. Passei a comparar texto com texto.

#### As divergências que ficam

- ~~**O recheio dos recortes.**~~ **RESOLVIDO em 05/09** — e o desenho não
  divergia de si mesmo: **eu é que tratava dois componentes como um.**

  Na Estante os nós pedem uma CAIXA com os botões dentro (`895:7369`, `p-12`,
  botões `px-24 py-14`, sem borda por botão). Na Mesa e nos Estudos pedem CHIPS
  SOLTOS, cada um com a sua borda, separados por 24 (`895:9524`, `895:8910`). São
  papéis diferentes: a caixa é escolha exclusiva entre modos de ver a mesma coisa
  (Capas ou 3D, Lista ou Leitura); o chip é recorte de conteúdo.

  **O recheio do chip é 16/24, e o número saiu de uma conta.** Na Mesa o nó
  escreve `px-25 py-17` no chip e `px-24 py-16` no total ao lado — 25 = 24+1,
  17 = 16+1: o Figma somou a borda de 1px para as duas caixas terminarem do
  mesmo tamanho. O recheio de projeto é 24/16. Nos Estudos o nó pede `px-32`;
  24 aparece nas outras três instâncias e no alternador, então 24 é o horizontal
  do produto e 32 é o caso isolado.

  A forma mora em `.recortes.soltos` (`estante.css`), usada pela Mesa e pelos
  Estudos. O Erik passou a decisão: *"é uma mudança tranquila de você decidir"*.
- ~~**"Criar novo estudo" dentro da caixa do alternador.**~~ **RESOLVIDO.** No nó
  (`895:8930`) ele é um botão separado, a 56 de distância, e a caixa tem 587 só
  para Lista e Leitura. Dentro dela uma AÇÃO se lia como uma terceira VISTA.
- **"Você ligou" virou "Parecem do mesmo assunto"** em 03/09, e **fica assim.**
  O Erik passou a decisão em 05/09 perguntando o que eu achava.

  Não é sutil, e o que muda é de quem é o gesto. A seção vem de
  `/notas/agrupadas`, que é varredura: quem juntou foi o sistema. Um produto que
  diz "Você ligou" sobre um agrupamento que a pessoa não fez ensina que os
  rótulos dele não são para levar a sério — e o custo não fica nesta seção, cai
  em cima de todo palpite que o Mekora dá depois: as faixas de Conexões, o "Fora
  de estudo", o "O que ficou pela metade". O título antigo também contradizia o
  próprio corpo, que dizia "Nada foi organizado por você" três linhas abaixo.

  O `CLAUDE.md` já pede essa divisão: o TÍTULO carrega a postura (é palpite,
  pode ser discordado) e o CORPO carrega o critério (N notas, M livros, P
  palavras).
- **"Ver as outras"**, o link do cartão "O que ficou pela metade" (`895:8919`),
  não existe na tela. O destino não está no nó, e o produto não tem uma vista
  dessas anotações — construir seria inventar para onde ele leva.
- **"Virar um estudo"** no nó contra **"Juntar as N num estudo"** na tela, e
  **"Buscar em livros, rotas e contexto"** contra **"Buscar nos estudos"**.
- **O botão "Reler"** nos cartões da terceira coluna: a bancada não tem nenhum
  livro terminado, então a coluna está vazia e a medida não pode dizer se ele
  falta. Buraco de dado, como o do R-50.

### Leitura — `895:10472` (computador)

A tela onde a pessoa passa o tempo, e a que mais confere: coluna de prosa **680**
(68 caracteres por linha), corpo 20/30, recuo de primeira linha 32, título
64/72 com -2,5% de entreletra — que é exatamente o `tracking-[-1.6px]` do nó,
porque -2,5% de 64 dá 1,6 —, autoria 20/30, abertura de 564 com recheio e vão
de 64, ornamento em 169×78. Todos conferem.

**Dois consertos, os dois na epígrafe** — o bloco escuro que abre o capítulo.

- **Recheio vertical 128, e não 64** (`895:10569`, `px-32 py-128`). Com metade do
  ar a faixa preta parecia um aviso empurrado entre dois parágrafos, em vez do
  respiro que ela é.
- **O fundo sangra, o texto não.** O texto herdava a sangria junto com o fundo e
  corria **1856px de ponta a ponta** — uma linha desse comprimento não se lê, e o
  olho perde o começo da seguinte. No nó o bloco preto ocupa a largura inteira e
  o conteúdo dentro dele é `items-center`, numa caixa estreita.

  A primeira tentativa pôs `max-inline-size: 680` no próprio bloco, e isso
  encolheu o elemento junto com o texto: o preto deixou de sangrar. A saída é o
  recuo CALCULADO — `padding-inline: max(var(--borda), calc((100% - 680px) / 2))`
  —, que mantém o elemento na largura cheia e deixa a coluna de 680 no meio.
  Medido: a 1920 o bloco tem 1920 de largura com 620 de recuo de cada lado; a
  390 ele cai para os 16 da borda, sem nunca ficar menor que ela.

#### As divergências que ficam

- **A cor do corpo do texto.** O nó pede `text/secondary #6a6a6a` para a prosa; a
  tela usa `--foreground #151515`. **Não mexi**, e aqui a razão não é o token: um
  produto de leitura escurece o texto do livro, não o clareia. `#6a6a6a` sobre
  `#f9f9f9` passa em AA por pouco; `#151515` dá quatro vezes mais contraste. Se
  o cinza for mesmo a intenção, é decisão do Erik e vale rever no escuro também.
- **O rodapé preto com "Link link link" e a marca gigante.** O `Rodape.jsx` já
  registra que essas quatro colunas são marcador de posição no desenho, e que
  reproduzi-las daria quatro colunas de âncoras que não vão a lugar nenhum. Vale
  aqui pelo mesmo motivo — e um rodapé de site no fim de um capítulo é mais
  estranho ainda que numa tela de produto.
- **A epígrafe do nó é um VETOR**, e não texto: `895:10570` é uma imagem de
  317×188 dentro do bloco preto. A tela põe texto de verdade, declarado pelo
  livro (`epub:type="epigraph"`), que é o que permite qualquer livro ter a sua.

### Preparo — o que encontrei, `895:7856` (computador)

**A tela inteira estava numa escala menor**, e um número errado no topo puxou
todos os outros: a coluna era **760** onde o nó pede **1222**. Com 760 a capa
cabia em 120, os cartões viravam linhas de tabela e o título caía dois degraus.

| o que | nó | estava |
|---|---|---|
| coluna e recheio | 1222 / 64 (`900:56497`, `895:7907`) | 760 / 40 |
| vão entre capa e identidade | 48 (`895:7908`) | 24 |
| capa | 270, razão 427/645 (`895:7909`) | 120, razão 2/3 |
| título do arquivo | Heading/LG 40/48, -0.6px (`895:7915`) | 28/40 |
| título de seção | Heading/MD 32/40 (`895:7943`) | 22/28 |
| os itens | **cartões** de `p-40`, 24 entre eles (`895:7944`) | linhas de 16/20 coladas por filetes de 1px |
| título do item | Body/Large 24/32 peso 500 (`895:7949`) | 16/24 |
| explicação do item | Body/Small 16/24 (`895:7950`) | 14/20 |
| veredito | `p-40` em volta (`895:7937`) | 40/24 |

A diferença dos itens não é de gosto. Cada um deles é uma **decisão que o
produto tomou sobre o arquivo da pessoa** — reconhecer o texto, gerar um
sumário, montar uma capa. Colados numa caixa única, leem-se como propriedades de
um registro; separados, cada um se lê como algo a conferir, que é o que a tela
pede que se faça.

**Um defeito de layout que só apareceu porque o número cresceu.** Com
`max-inline-size: 1350px` a página continuou parando em 1028. O `.mesa` é um
flex container, e um filho flex mede o CONTEÚDO, não o teto: faltava
`inline-size: 100%`. Isso passou despercebido durante todo o tempo em que o teto
era 760, porque o texto batia nele por acaso — **o valor só começou a mentir
quando ficou maior que o conteúdo**.

#### O que ficou

- **O quadrado cinza de 32×32** à esquerda de cada item (`895:7947` e irmãos).
  **Resolvido em 07/09, lendo o nó em vez de perguntar.** O
  `get_design_context` dele devolve uma linha: `<div className="bg-[#d9d9d9]
  relative size-full" />` — sem nome, sem borda, sem filho, sem estado. Uma
  caixa de marcar teria borda e dois estados, e este arquivo tem componentes de
  controle de verdade (a Privacidade usa interruptores). É **lugar reservado de
  imagem**, e `#d9d9d9` é a mesma cor que as capas de reserva usam para "onde a
  foto entraria". Continua não implementado, e agora por saber o que é: espaço
  de arte que ninguém desenhou ainda, e não comportamento que falta.
- **Os botões por item** — "Por quê" no texto em imagem, "Ver" na capa gerada,
  "Traduzir" no idioma. A tela só tem "Alterar" no título e no autor. Cada um
  desses abre algo que precisa existir.
- **O recheio do telefone** foi posto em 16, que é o que os nós de telefone da
  Leitura (`966:29655`) e da Mesa usam nos seus heroes. **Não conferi o
  `966:31504`**, que é o nó de telefone desta tela.

### Preparo — os quadrados vazios, e uma correção minha

**Eu disse que "Traduzir", "Ver" e "Alterar" não existiam. Dois dos três
existem, e um deles inteiro.**

- **"Traduzir" está construído**, ponta a ponta: o botão, a folha com a escolha
  de idioma de destino, o aviso de que a tradução é automática e o original fica
  intacto, a gravação dos idiomas antes da chamada (o `/translate` os LÊ do
  trabalho, não os recebe no corpo), o acompanhamento e o tratamento de falha.
  Ele **não aparece na bancada** porque o servidor de prova não tem pacote de
  idioma instalado — e nesse caso a tela mostra o motivo em vez do botão, que é
  a regra certa: *"numa instalação sem o motor ou sem o par, o botão abriria um
  caminho que responde 409"*.
- **"Alterar" no título e no autor está construído** — é o `Ajustar
  manualmente`, que troca a seção por campos.
- **"Ver" e "Por quê" não existiam.** Foram construídos agora.

**O erro foi de método, e é o mesmo que este arquivo já registra três vezes:** eu
li a AUSÊNCIA NA TELA como ausência no produto, sem abrir o código. A bancada não
tem pacote de idioma, e o arquivo semeado não é digitalização — então nem o botão
de traduzir nem a linha de "texto em imagem" tinham como aparecer. Medir a tela é
medir a tela mais os dados que ela recebeu.

#### Os ícones dos itens

O quadrado de 32×32 do nó (`895:7947` e irmãos) é `#d9d9d9` numa camada sem
nome — lugar reservado, não desenho. **O mesmo problema já tinha sido resolvido
neste repositório:** o `941:23118` desenha as cinco ações da ficha de arquivo com
o quadrado vazio, e o `ConfiguracoesArquivo.jsx` o preencheu reusando glifo que
já existia, *"sem arte nova, sem inventar glifo"*. Esta lista segue a regra.

**A condição do Erik é verificável, e a primeira tentativa reprovou nela.** Ele
autorizou *"desde que o usuário não confunda com outra possível tela ou nav"*.
`scripts/icones.mjs` classifica a biblioteca em **LUGAR** (identifica item de
navegação — `lugares.js`, cabeçalho, menu da conta), **AÇÃO** e **LIVRE**: 10, 16
e 1. Minha primeira escolha usava `estante` e `conta`, que são dois itens da
barra de lugares, e mais `buscar`, que é a busca global. A varredura pegou.

Entre os de AÇÃO a regra é que o glifo signifique a **mesma coisa** nos dois
lugares, ou coisa vizinha o bastante para o rótulo ao lado desambiguar:

| linha | ícone | onde mais aparece, e por que serve |
|---|---|---|
| Texto em imagem | `nota-imagem` | Canvas: nota de imagem. Aqui: o texto que É imagem |
| O texto já está no arquivo | `caderno` | Leitura: o caderno. Aqui: o texto dentro do documento |
| Página corrompida / sem texto | `paginas` | o que se conta por página |
| N páginas não abriram | `defeito` | Livro: o aviso de defeito |
| Reconhecer o texto | `camadas` | Ficha: a pilha de páginas. Aqui: o OCR escreve uma camada de texto POR BAIXO da imagem — a mesma pilha, de perfil |
| Converter para EPUB | `refazer` | Ficha: reprocessar |
| Gerar um sumário navegável | `indice` | Leitura: o índice. Aqui: o sumário que vai VIRAR aquele índice |
| Capa | `marcador` | Leitura: a fita. Aqui: o que identifica o livro de longe |
| Idioma | `copiar` | Leitura: copiar com origem. Aqui: traduzir produz um SEGUNDO texto |
| Título | `renomear` | Ficha: renomear |
| Autor | `nota-nova` | Canvas e Leitura: escrever. Aqui: quem escreveu |

**Nenhum é de LUGAR**, e isso é cobrado por medida e não por memória: uma
verificação cruza os ícones usados no `Preparo.jsx` com a lista de navegação que
o `icones.mjs` produz.

**Não há ícone de idioma na biblioteca** — nem globo, nem bandeira, nem scanner.
Procurei no arquivo do Figma, inclusive nos assets que o `get_design_context`
exporta, e o que existe é o que já está em `publico/icones` mais o grafo das
Conexões (`solar:share-circle-outline`) e os óculos da abertura. Não desenhei
nenhum: vetor à mão é invenção com cara de fidelidade.

#### O que foi construído

- **"Ver"**, na capa gerada. Abre a capa que vai ser montada, com o mesmo
  gabarito e os mesmos dados que a Estante usa — então é a capa, e não uma prévia
  parecida com ela. É a única decisão da lista que produz uma IMAGEM, e descrever
  imagem em texto é justamente o que esta tela não deveria pedir.
- **"Por quê"**, no texto em imagem. A linha ao lado afirma uma consequência — o
  Kindle não busca palavras —, e consequência sem motivo é o produto pedindo
  confiança sem dar razão. A folha explica que cada página é uma foto do papel,
  o que isso impede, o que o reconhecimento faz e onde ele erra.

**O "Por quê" não foi visto em tela**: a bancada não tem arquivo digitalizado, e
a linha só existe quando `is_scanned` é verdadeiro. Mesmo buraco do R-50.

### Preparo — pronto, `895:8164` (computador)

**Esta tela só pôde ser conferida depois do R-53**, que a tornou alcançável. E o
primeiro achado é o que uma tela invisível acumula: **ela não tinha o topo.**

O comentário do próprio `Topo` já dizia, desde que foi escrito: *"nos nós
895:8164 (pronto) e 895:8029 (em andamento) o topo é o MESMO da tela de análise:
a capa à esquerda, o título, os selos do arquivo e o alternador"*. Só o "em
andamento" tinha ganhado. A tela de pronto ficou de fora, e ninguém notou —
porque ninguém chegava nela. **Uma tela que não se vê acumula defeito em
silêncio, e é isso que faz o R-53 valer mais que o conserto de uma rota.**

Consertado: o topo volta, com `inerte` — os dois botões do alternador continuam
à vista, marcando a escolha que foi feita, e não aceitam clique.

#### As divergências que ficam

- **A faixa do veredito.** O nó escreve uma linha só: *"Pronto. Diário 02.epub ·
  8,4 MB"*, com a explicação abaixo. A tela separa em três — a marca "PRONTO", o
  título *"X está na estante."* e o nome do arquivo numa faixa própria. A forma
  da tela diz mais (o livro está na estante, e não só que o arquivo saiu), e por
  isso não mexi: é escolha de conteúdo, não de geometria.
- **"O que foi feito neste arquivo"**, o link à direita dos botões no nó, não
  existe na tela. Ele abriria o relatório do que foi decidido — e o produto já
  tem essa informação na tela de análise, que agora não é mais alcançável depois
  de pronto.
- **"Preparar outro"** existe na tela e não no nó.

### Conta — as quatro telas, `895:10599` e `895:10715`

**A ilustração vinha faltando em três das quatro.** O `.conta-desenho` já traz o
comentário — *"o desenho acima do painel, do nó de CADA tela de conta"* — e a
regra estava aplicada num lugar só: medido em 05/09, `/conta` tem um desenho de
272×224 e `/conta/preferencias`, `/conta/privacidade` e `/conta/kindle` não têm
nenhum.

**Preferências ganhou a sua** (`934:11083`, 200,6×224, com os mesmos 26 de
encavalamento sobre o card).

**As outras duas dependem do Erik.** A de Privacidade (`937:20283`, "exploring
new horizons") não sai do Figma como arquivo: ela é uma composição de **77
vetores posicionados um a um**, e o `get_design_context` exporta cada um
separado. Montá-la aqui seria redesenhar o traço dele em código, que é o oposto
do que o `Icone.jsx` manda fazer. **Pedido:** exportar Privacidade e Kindle como
SVG achatado, como a de Preferências e a da visão geral já estão.

#### As divergências de conteúdo, e são decisão dele

- **A trilha da conta tem 5 itens na tela e 4 no nó.** A tela acrescenta
  **Segurança**, e mais **"Sair desta conta"** abaixo do filete. O nó
  (`900:53581`) lista Conta, Dispositivos Kindle, Preferências, Privacidade.
- **O que a aba "Conta" mostra.** No nó `895:10599` — que se chama "Conta —
  visão geral" — o painel da direita mostra os **aparelhos Kindle**: "Kindle de
  Erik", "Scribe do escritório", "Conectar outro kindle". Na tela, `/conta`
  mostra o perfil (e-mail, retrato, nome) e os aparelhos vivem em
  `/conta/kindle`. **São duas arquiteturas diferentes**, e nenhuma está errada:
  ou a visão geral é a dos aparelhos, ou é a do perfil.
- **Os botões do aparelho.** Nó: "Tornar principal" e "Editar", com "Último
  envio hoje, 09:12" e a explicação de o que é o aparelho principal. Tela:
  "Editar" e "Desligar", sem data de último envio e sem o conceito de principal.
- **Preferências bate palavra por palavra** — três seções, mesmos títulos,
  mesmas opções, mesmas explicações. Nada a fazer ali além da ilustração.

### Ajuda — `895:11193` (computador)

**A tela inteira estava um degrau abaixo**, e é o mesmo padrão do Preparo: cada
peça um passo menor que o desenho, e o efeito somado é uma tela que parece de
outro produto.

| o que | nó | estava |
|---|---|---|
| cabeçalho de categoria | 28/36 (`895:11296`) | 24/32 |
| pergunta | 24/32 (`895:11301`) | 20/30 |
| explicação | 20/30 (`895:11302`) | 16/24 |
| vão dentro do item | 24 (`895:11300`) | 6 |
| vão entre itens | 40 (`895:11299`) | 0, só o filete |
| vão entre categorias | 64 (`895:11294`) | 48 |

Estrutura, ordem e palavras batem: título, busca, os quatro cartões numerados,
a trilha lateral, e as quatro categorias com as mesmas perguntas.

**Fica:** o nó põe um chevron (`918:17241`) à direita de cada pergunta, e a tela
não tem. Ele sugere que a pergunta ABRE — e na tela ela leva a outra página em
vez de expandir. Um chevron ali prometeria expansão; a seta certa depende de o
Erik decidir qual dos dois comportamentos vale.

### Apresentação e Atualizações — `895:7063` e `895:11060`

**As duas batem em estrutura, ordem e palavras.** A Apresentação percorre título,
área de soltar, "PDF não é um livro", a faixa de capas, "Quatro passos", "O livro
não terminou quando o arquivo fica pronto", a captura da Estante, o convite
final e o rodapé — na mesma ordem do nó. A lista de formatos é maior que a do
desenho porque vem do servidor, que é a fonte certa.

Atualizações traz título, subtítulo, as datas, os itens com o selo vertical
(Novo / Melhorado / Corrigido) e o bloco "O que ainda não está de pé".

**A ilustração das Atualizações está aplicada** (`937:20482`, “business balance”),
abaixo do subtítulo, com o quadro de `472 × 467px` do nó desktop.

### As ilustrações que não saem do Figma como arquivo

Três das cinco ilustrações do produto **não podem ser exportadas por aqui**:

| tela | nó | por quê |
|---|---|---|
| Conta — privacidade | `937:20283` "exploring new horizons" | 77 vetores posicionados |
| Atualizações | `937:20482` "business balance" | exportada e aplicada como SVG |
| Conta — Kindle | (não conferido) | — |

O `get_design_context` exporta **cada vetor separado**, com a posição em
`ml`/`mt` no código gerado. Remontá-las aqui seria transcrever o desenho do Erik
para CSS — dezenas de `<div>` posicionados à mão —, e qualquer erro de um pixel
vira um traço torto num desenho que é dele. É a mesma regra que o `Icone.jsx`
escreve: *"desenhar vetor à mão é inventar com cara de fidelidade"*.

**Pedido ao Erik:** exportar as três como SVG achatado, como a de Preferências
(`934:11083`) e a da visão geral já estão. No Figma é selecionar a moldura e
exportar como SVG com "outline text" — o traço e o efeito vêm junto.

### Canvas — `895:6938` (computador)

**A tela está certa; o instrumento é que não sabia fotografá-la.** Ver R-55: a
captura saía vazia porque o `medir.mjs` estendia a viewport para pegar a página
inteira, e o Canvas desenha em função do tamanho da janela. Com `--vista` ele
fotografa as três notas, as ligações e o preview de link.

Conferido com o nó: nota com texto, autor e data; ligação desenhada entre duas
notas; preview de link dentro da nota; barra de ferramentas à esquerda; zoom no
canto inferior direito; chão pontilhado.

**O que não deu para conferir, e é falta de dado na bancada:**

- **As capas de livro no Canvas.** O nó põe duas — "Malha Urbana" e "Diário 02" —
  ancoradas à esquerda, com o marcador de fita em cima. A API devolve
  `livros: 0` para a pessoa da sessão: o semeador não põe livro no Canvas.
- **A seção nomeada.** O nó tem "Design & Tecnologia" com a moldura tracejada em
  volta do grupo. A tela tem a peça (`.canvas-secao-area`, medida em 620×366),
  e a bancada não cria nenhuma seção.
- **O cartão de imagem com "Ver transcrição"**, que o nó mostra à direita.

Os três itens abertos do Erik sobre esta tela — R-16 (travado, animações,
interação), R-43 (nota que diz "escrita aqui" e não deixa editar) e R-48 (trocar
as cores) — **continuam abertos**: são sobre comportamento e cor, e nenhum deles
se responde com uma captura parada.

### O bloco final — telefone, Estudo, Nota, Mesa vazia

**A borda do telefone era duas, e virou uma** (R-20). Medido a 390: a coluna dava
358 em nove telas e 342 em três — Mesa, Livro e Estudos usavam 24 de lado onde as
outras usam 16. Os nós de telefone põem `px-16` nos seus heroes. Uma borda só.

**O 22 saiu da escala.** Ele não existe em token nenhum do Figma — a escala de lá
é 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64 — e vivia em cinco lugares do
código, com duas entrelinhas diferentes para a mesma peça. O portão deixou de
aceitá-lo: um portão que aceita o degrau inventado só porque o código o usa não
é portão, é espelho.

**Os números do telefone saem do nó, e não da escala vizinha.** Minha primeira
correção do 22 levou a seção do Livro para 24/32 por ser o degrau vizinho; o
`966:29052` pede **32/40**. E "Em preparo" na Mesa não encolhe no telefone — o
`966:28578` traz `heading-lg` 40, o mesmo do computador. O telefone deste produto
reduz alguns títulos e mantém outros, e quem decide é o nó.

**A página de um estudo estava três degraus abaixo** (`895:8260`): título 24/32
onde o nó pede 40/48, "Livros" 16/24 e "Como isso se formou" 20/30 onde ele pede
32/40. O cartão do estudo e a página dele compartilham o `.estudo`, e é certo que
compartilhem — mas os tamanhos não são os mesmos.

**A Mesa vazia bate** (`895:10286`), incluindo a ilustração da área de soltar e a
de "A mesa está limpa". A lista de formatos é maior porque vem do servidor.

**Os três painéis da Leitura existem e abrem** — Índice (464 de largura, à
esquerda), Notas e destaques (380, à esquerda), Aparência (384, à direita) —, com
o marcador de "você está aqui" no índice, como o `941:23112` pede.

#### O que falta e é FUNCIONALIDADE, não fidelidade

- **A tela da nota** (`895:8545`) tem, no nó, cinco peças que o produto não tem:
  as **tags**, o painel **"Ligar esta nota a qual?"** com busca, e as três seções
  de sugestão — **"Talvez um estudo"**, **"Parecem próximas"** e **"Talvez"**.
  Duas das três faixas já existiam; a de estudo nunca existiu.
- **A página do estudo** não tem **"Notas semelhantes"**, **"Podem
  complementar"**, a **busca dentro do estudo** nem **"Ver rede neural"**.

#### Triagem de produto posterior — 14/09

Esta lista é um inventário do que aparecia nos quadros, não autorização para
reintroduzir decisões antigas. A conferência posterior estabeleceu que o
estado atual do produto prevalece quando o fluxo mudou desde a captura.

- **Não entram por comparação visual:** reconstruir Conexões segundo a captura
  antiga; criar "Notas semelhantes", "Podem complementar" ou "Ver rede
  neural" só para preencher a página do estudo; e simular tempos ou etapas no
  Preparo. Todos alterariam comportamento, vocabulário ou promessa do produto.
- **Entram porque completam a forma vigente sem mudar o fluxo:** a ilustração
  já desenhada de "Escrever sobre o livro" e a moldura externa do Preparo com
  a mesma largura da Leitura.
- **Regra de largura:** a moldura pode crescer até os 32px de respiro da cena;
  a coluna interna continua limitada. Largura de tela não é licença para
  esticar texto, capa, formulário ou linha de leitura.

### As ilustrações, resolvidas — component set `1016:30664`

O Erik mandou o component set com as **56 ilustrações nomeadas**, e ele resolve a
pendência que eu tinha registrado como dele.

**A ferramenta era outra.** O `get_design_context` sempre quebra a ilustração em
vetores separados — 77 na de Privacidade —, e foi por isso que escrevi que elas
"não saem do Figma como arquivo". Saem: `download_assets` com
`defaultFormat: "svg"` devolve o campo **`export`**, que é o nó inteiro num SVG
só. A informação estava a uma ferramenta de distância.

| tela | nó no component set | nome |
|---|---|---|
| Conta — privacidade | `1016:30615` | exploring new horizons |
| Atualizações | `1016:30623` | business balance |
| Conta — preferências | `1016:30662` | business process setup |

**Duas sujeiras do exportador, as duas removidas na gravação:**

- um `<rect width="264" height="264" fill="#F5F5F5">`, que é o **artboard** do
  component set e não o desenho;
- um `<rect stroke="#8A38F5" stroke-dasharray="10 5">` de **1783×2967** dentro de
  um SVG de 264×264 — a **moldura tracejada** que o Figma desenha em volta de um
  component set. Ela fica fora da vista e não aparece na tela, e continua sendo
  tinta que não é do produto. **Quem a pegou foi o portão**, no campo
  `tinta_cravada_em_asset`: `#8A38F5` num desenho que só tem `#262B09`. Um roxo
  invisível não muda um pixel, e é exatamente o tipo de coisa que entra sem
  ninguém decidir.

**Kindle e Segurança continuam sem ilustração**, e agora por um motivo diferente:
não há nó de tela para elas com uma. Escolher da biblioteca sem nó seria eu
decidindo o desenho da tela.

### Conta — privacidade, `895:10909`

**A tela prometia um controle que não existia.** A linha "Quem mede a navegação,
e só depois de você deixar" termina dizendo, palavra por palavra, que *"a
resposta pode ser mudada aqui a qualquer momento"* — e não havia onde. O nó põe
um interruptor ali; o código tinha um comentário afirmando que *"não existe
interruptor, e fingir um seria pior que não ter"*.

**Isso era verdade quando foi escrito, e deixou de ser.** A máquina entrou junto
com as três ferramentas de fora, em 03/09: o `medir.js` guarda a resposta no
`localStorage` e só sobe os scripts depois de um "sim". Faltava expor.
Consentimento que não se pode retirar não é consentimento — e numa tela de
privacidade a distância entre o texto e o que ele pode fazer é o defeito inteiro.

Construído: o servidor marca a linha com `interruptor: "medicao"` (o valor mora
no navegador, porque são os scripts do cliente que sobem ou não sobem), e a tela
troca a marca pelo par **botão + estado** — "Ligar / Desligado". Um botão
"Desligar" sozinho não responde "está ligado?".

**E "Apagar a conta" ganhou a borda vermelha** do nó. Era a única ação sem volta
da tela e tinha a mesma borda neutra das outras quatro seções. Cor da borda com
`--destructive`, pela mesma decisão que o Erik deu para os chips da Mesa: cor
semântica vem do sistema.

**Um defeito de layout que o controle novo revelou:** a linha só virava fileira
com `:has(> .marca-arquivo)`, e o interruptor — que entra no LUGAR da marca —
caía por cima do título. A regra passou a reconhecer os dois.

#### O que fica

- **"O que é medido" e "Quantas visitas houve"** seguem com "Sem interruptor":
  são medidas do **servidor**, e desligá-las é decisão de arquitetura, não um
  botão. As marcas dizem isso, e dizem a verdade.
