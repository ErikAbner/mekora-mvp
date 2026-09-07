# O que já foi julgado e recusado

Cobrado por `node scripts/rejeitado.mjs`.

Este arquivo existe por causa de uma frase de 02/09: *"sistema de destaque de
livro na estante continua péssimo apesar dos meus feedbacks"*. O feedback
existia — estava numa conversa. Conversa não é lugar de morar: ninguém relê,
nenhum instrumento consulta, e ela some quando a janela de contexto vira.
Trinta e oito críticas ficaram assim.

O `DESIGN-SYSTEM.md` guarda como as coisas **devem** ser. Aqui fica o que já
foi tentado e **reprovado** — que é o que se repete, porque quem refaz não sabe
que aquilo já foi feito e recusado uma vez.

## A regra

**Fechar exige prova.** Um comando que fica vermelho enquanto o defeito está lá
e verde quando ele some. `sem-prova` num item fechado é reprovação: "fechado"
sem medida é opinião, e opinião não segura regressão.

Item **aberto** conta e aparece, mas não derruba. Dívida com nome não é falha —
é dívida com nome.

## Formato

```
### R-00 · 2026-09-01 · aberto
**Erik:** "as palavras dele, sem parafrasear"
**Onde:** /rota ou nome da tela
**Prova:** sem-prova
```

O texto do Erik entra **verbatim**. Parafrasear é onde a exigência vira o que
quem lê achou que ela era — e foi assim que o destaque da estante voltou.

---

## 07/09 — as dezoito decisões, e quinze itens que elas fecham

O Erik respondeu de uma vez o levantamento "O que depende de você". O texto de
cada decisão está **verbatim** em `docs/DECISOES-2026-09-07.md`; aqui fica só o
que cada uma fechou, e com que prova.

| item | o que fechou | prova |
|---|---|---|
| R-04 · R-25 | o filete marca a citação; a marca do texto rarefaz, e o traço é a cor do outro tema | portão em /notas, /leitura, /estante, /estudos, dois temas |
| R-09 | a busca expande no foco — 476 → 626, busca 258 → 408 | portão em /estante |
| R-13 | a barra vira "Adicionar" com Nota, Livro da Estante e Mídia | portão em /canvas, dois temas |
| R-16 | pan e drag medidos sem easing; ícones auditados por olho, os 27 | medida do computado + folha de contato |
| R-18 | o quadro se arrasta, e o caminho clicável fica | `node scripts/provas.mjs r18` |
| R-21 | a trilha saiu em 04/09; a pergunta que sobrava era minha, não dele | — |
| R-23 | a superfície de leitura deixa de encostar na janela | portão em /leitura + `amassado.mjs` |
| R-27 | o vertical trim fica: os vãos das 51 telas foram medidos com ele | — |
| R-30 | os dezoito itens da Privacidade ganham grupos, sem esconder nada | portão nos dois temas + `amassado.mjs` |
| R-36 | o teto da folha desce de 852 para 720; 48 volta a separar bloco e não parágrafo | medida da regra em /sistema |
| R-37 | volta a ser QA, e não decisão dele | ver a nota abaixo |
| R-48 | as catorze capas entram no sorteio | `scripts/folha-de-capas.mjs` |
| R-49 | índice e páginas ganham desenho próprio | `node scripts/provas.mjs r07` |
| R-51 | a Estante lista só livro pronto | testes do backend + medida em /estante |

**A MUDANÇA DE CRITÉRIO QUE VEIO JUNTO, e que vale para tudo daqui em diante:**

> Nem tudo que você colocou como "depende de mim" realmente depende de decisão
> minha. Antes de me devolver qualquer nova pendência, verifique Figma, Design
> System, componentes existentes, código, estados, screenshots e documentação.

Ela já se provou na mesma rodada. **Quatro dos dezenove itens que eu tinha
mandado como decisão dele não eram decisão nenhuma:**

- o **botão Cancelar** do Preparo, que eu disse não existir — existia desde
  antes, e o que faltava era ele funcionar;
- a **expansão da busca**, que eu disse não acontecer — a regra estava escrita e
  disparava na hora errada;
- os **dois estados da busca no Figma**, que eu pedi a ele — estavam nos nós
  `900:53900` e `941:23107`, e os dois números já estavam escritos num
  comentário do próprio `cabecalho.css`;
- a **trilha da ficha**, cuja pergunta ele respondeu sem responder: *"meu
  feedback já respondia essa questão"*.

É a mesma família do "vermelho por omissão", com uma agravante: aqui eu não só
concluí ausência de um instrumento cego — eu passei a conclusão adiante como
pergunta, e perguntar custa o tempo de quem responde.

**R-37 não fecha por prova, e sim por mudança de natureza.** O Erik: *"isto
deixa de ser uma decisão minha e volta a ser item de QA"*. A comparação visual
de /estudos e /canvas contra `895:8849` e `895:6938` foi feita nesta rodada e as
duas telas mudaram por decisão dele — o quadro passou a arrastar, a barra virou
"Adicionar". **Uma divergência ficou sem medir e não vira pendência dele:** a
seção "Fora de estudo" aparece no nó com os itens em CAIXA e no produto em linha
com filete. Não a corrigi porque só a li em captura reescalada, e este arquivo já
registra o preço de mexer numa medida lida em miniatura. Fica como QA, com o nó
por ler.

---

## 01–02/09 — a leva de trinta e oito

Estado de cada um: `docs/RETORNO-2026-09-02.md`.

### R-01 · 2026-09-01 · fechado
**Erik:** "Hover nos livros é muito feio e não dá o devido destaque, pode passar facilmente despercebido"
**Onde:** /estante
**Medido em 04/09:** Medido em 04/09: a unica regra de hover e `background: color-mix(--foreground 4%)`. E ela quase nao dispara — a capa e pintada por cima do alvo, entao passar o mouse sobre a capa nao acende nada.
**Prova:** `node scripts/provas.mjs r01`

**Fechado em 06/09.** O que estava lá era `background: 4%` no alvo, e o alvo
pinta POR CIMA da capa: passar o mouse LAVAVA a arte com um cinza de 4%. As
duas metades da frase dele saem do mesmo defeito — 4% é pouco para ver e é
demais para a arte.

**A regra já estava escrita neste mesmo arquivo, trinta linhas acima**, sobre o
estado escolhido: *"o véu de 8% sobre a imagem saiu: ele apagava a capa para
marcar a escolha, que é gastar justamente o que se está tentando mostrar"*. O
hover ficou de fora daquela decisão.

Agora a capa sobe 4px e ganha sombra e borda de meia-tinta — um degrau ABAIXO
do escolhido, que usa tinta cheia —, e o título sublinha, que é como o sistema
diz "isto leva a algum lugar". Só `transform` e sombra, 160ms na curva `--saida`,
atrás de `hover: hover` para o toque não deixar o estado aceso. O escolhido não
sobe: ele já está no degrau de cima.

**O instrumento precisou aprender a passar o mouse**, e é por isso que este item
atravessou três rodadas sem prova: `:hover` não se alcança com evento
sintético, e o `--gesto` aperta o botão — apertar um cartão o SELECIONA, que é
outro estado. `medir.mjs --mouse=<seletor>` leva o ponteiro até o centro do
elemento sem apertar, e a prova `r01` mede o estado de verdade.

### R-02 · 2026-09-01 · fechado
**Erik:** "O click só funciona na div inferior à da capa, usuários tendem a clicar na capa"
**Onde:** /estante
**Medido em 04/09:** `.livro-alvo` e `.capa` estavam ambos em `z-index: 1`, e `.capa-caixa` é `position: relative` **sem** `z-index` — logo não abre contexto de empilhamento próprio, as duas disputam o mesmo e a ordem do DOM desempata. A capa vem depois, ficava por cima e comia o clique. O conserto é `pointer-events: none` na capa, e não `z-index: 2` no alvo: subir o alvo o poria na frente da imagem e levaria junto o véu de 4% do `:hover` — o mesmo véu sobre a capa que a regra do escolhido já tinha tirado por apagar o que se está tentando mostrar. Medido com ponteiro de verdade pelo CDP, nos dois sentidos: limpo, o centro da capa entrega o clique a `button.livro-alvo` e a ficha passa de "Cadernos de campo" para "Relatório de pesquisa"; envenenado (`pointer-events: auto` de volta), quem recebe é `img.capa` e a ficha não muda.
**Prova:** `node scripts/provas.mjs r02`

### R-03 · 2026-09-01 · fechado
**Erik:** "O marcador de notas e destaques quebra o grid e vaza tanto da capa quanto invade o espaço do filtro superior"
**Onde:** /estante
**Desenho pretendido:** "livros sem borda, sem borda com cor, com o item que conta quantas notas ou destaques tem NA PARTE DE TRÁS com z-index menor + livro na frente"
**Medido em 04/09:** Medido em 04/09: marcador `z-index: 0` contra `z-index: 1` da capa, `elementFromPoint` na sobreposicao devolve a capa, e o marcador nao alcanca a barra de recortes. Sobra 37px acima do topo da capa — o desenho que ele descreveu.
**Prova:** `node scripts/provas.mjs r03`

### R-04 · 2026-09-01 · fechado
**Erik:** "O item de detalhes do lado direito está gigante, e a cor nesses destaques / notas não funciona — pesado, puxa toda a atenção da tela"
**Onde:** /estante
**Medido em 04/09:** Medido a 1440: a ficha ocupa 476px, 33% da janela, com fundos `rgb(28,28,28)`, `rgb(22,22,22)` e `rgb(97,114,47)` dentro.
**Prova:** `node scripts/provas.mjs r04`

**Medido de novo em 06/09, e a frase se parte em duas.**

*"O item de detalhes do lado direito está gigante"* — **não reproduz.** A ficha
mede 476, e 476 é o número do nó: `895:7315` e `895:7506` desenham a coluna da
direita com essa largura exata, nas duas vistas da Estante. Os 33% da janela
vêm de o nó ser desenhado a 1920, onde 476 são 25%.

*"A cor nesses destaques / notas não funciona — pesado, puxa toda a atenção"* —
**continua aberto, e agora com o motivo localizado.** O `rgb(97,114,47)` que a
medida de 04/09 achou é `--nota-verde` no tema ESCURO. As quatro cores claras
são do nó (`941:23120`: `#efffbf`, `#fff8bf`, `#bfdfff`, `#ffbfc0`); **as quatro
escuras não têm nó** — foram escolhidas aqui, medindo contraste, porque no
escuro o pastel sobre tinta clara dava 1,19 e era ilegível.

Então o peso que ele viu é de valores que nós inventamos, e trocá-los é decisão
dele: ou outros quatro tons, ou o destaque deixa de ser preenchimento no escuro
e vira filete. Não dá para tirar do Figma, porque o Figma não tem tema escuro.

### R-05 · 2026-09-01 · fechado
**Erik:** "Não precisa do botão enviar ao Kindle na Estante — o usuário faz isso na tela do livro"
**Onde:** /estante
**Medido em 04/09:** Medido: o botao "Enviar ao Kindle" continua na Estante (`Estante.jsx:536`).
**Feito em 04/09:** o bloco `.ficha-kindle` saiu inteiro da ficha lateral, com o `aoEnviar` que o alimentava (`Estante.jsx`, `App.jsx`) e o CSS que sobrou. **O estado continua na ficha** — "No Kindle · Enviado" está nos dados do arquivo —, o que saiu é o gatilho: a ficha é resumo, e mandar um arquivo para um aparelho é a ação que sai da tela e a mais cara de desfazer. Ao lado de "Continuar" e "Notas", que agem dentro dela, a diferença entre as três sumia.

**A prova mede as DUAS metades**, e a segunda importa mais: sem ela, apagar o botão das duas telas passaria — e aí o produto perderia a promessa que dá nome a ele em vez de mudar de lugar de lugar. Envenenada (o botão reposto na ficha), ela acusa *"o envio ao Kindle continua na Estante"*.
**Prova:** `node scripts/provas.mjs r05`

### R-06 · 2026-09-01 · fechado
**Erik:** "O item ao lado da pesquisa é de DÚVIDAS, não de notas"
**Onde:** /estante
**Medido em 04/09:** O atalho ao lado da busca e `aria-label="Duvidas"`, com `icone-duvidas.svg`, levando a `/ajuda` (`Cabecalho.jsx:114`).
**Prova:** `node scripts/provas.mjs r06`

### R-07 · 2026-09-01 · fechado
**Erik:** "Você trocou o ícone da Estante, o que não faz sentido — existem componentes para isso"
**Onde:** /estante
**Medido em 04/09:** A causa era os ARQUIVOS trocados: `icone-estante.svg` desenhava um "?". Os dois foram renomeados para o que desenham, e a prova fixa o `sha256` dos dois auditados em 04/09 — trocar de novo fica vermelho.
**Ampliado em 04/09, na Fase 3:** a prova deixou de fixar dois ícones e passou a fixar **os 27 da biblioteca**, com o `sha256` de cada um, mais a recusa de arquivo novo sem auditoria e de par novo com o mesmo desenho. Foi essa passada que achou o R-49.
**Prova:** `node scripts/provas.mjs r07`

### R-08 · 2026-09-01 · fechado
**Erik:** "Não respeitou o espaçamento entre usuário e a div com pesquisa e dúvidas"
**Onde:** /estante
**Medido em 04/09:** Medido: 56px entre a busca e os atalhos, 16px entre os dois atalhos — os numeros dos nos 900:52331 e 900:52339.
**Prova:** `node scripts/provas.mjs r08`

### R-09 · 2026-09-01 · fechado
**Erik:** "A pesquisa é MENOR e se expande quando o usuário tenta pesquisar — você não respeitou o componente que já existia e criou outro por cima"
**Onde:** /estante
**Medido em 04/09 — duas das três queixas não se reproduzem.** A moldura mede **258×60 em repouso, 258×60 com o foco dentro e 258×60 digitando**: ela não expande. E há **um** campo de busca na página (`input[type=search]`, `.busca-campo`), não dois — não existe componente por cima de componente. O painel abre e acha: digitando "urbana" com teclado de verdade, um item, "Malha Urbana · Ana Duarte · PDF".

**A terceira queixa fica de pé e é do quadro:** "a pesquisa é MENOR" é uma medida contra o desenho, e o `941:23107` está do lado da Fase 4. **Pendência do Erik**, não escolha de quem implementa: se 258 é menor do que o nó pede, o número vem de lá.

**O `inventario.mjs` NÃO é a prova deste item.** Ele relata assinaturas visuais repetidas — hoje seis pares, nenhum deles da busca — e sai com **0** em qualquer caso: relatório, não portão. Item fechado com ele seria fechado com nada.
**Prova:** `node scripts/provas.mjs r09`

### R-10 · 2026-09-01 · fechado
**Erik:** "Conta: clicar navega automaticamente em vez de abrir um dropdown"
**Onde:** /estante
**Medido em 04/09:** Medido: clicar nao muda a rota, `aria-expanded` vai a `true`, e o menu abre com cinco itens.
**Prova:** `node scripts/provas.mjs r10`

### R-11 · 2026-09-01 · fechado
**Erik:** "O espaçamento entre itens está errado"
**Onde:** /estante
**Prova:** `node scripts/provas.mjs r11`

**Fechado em 06/09 — medido contra o nó, e não reproduz.** `895:7382` põe 64
entre as linhas da grade, `895:7383` põe 48 entre as colunas, `895:7384` põe 24
entre a capa e o texto do item e `895:7390` põe 16 entre título e autor. O
produto tem exatamente esses quatro números, e a prova `r11` os cobra um a um.

**O que difere, e não é vão:** o nó é desenhado a 1920 e a coluna da estante lá
tem 1221, com quatro livros por linha. A 1440 sobram 852 depois da ficha de 476,
e cabem três. O vão entre eles continua sendo 48 — o que muda é quantos cabem,
que é o que uma grade responsiva faz.

### R-12 · 2026-09-01 · fechado
**Erik:** "A única coisa certa são os pontos no fundo — e até isso está errado, porque na parte superior simplesmente tem fundo branco"
**Onde:** /canvas
**Medido em 04/09:** Medido: em `y=8` e no meio da tela quem pinta e o mesmo `.canvas-mundo`, com o mesmo `radial-gradient`. Nao ha faixa branca no topo. **O resto do item — "as funcoes estao erradas" — e o R-13, e continua aberto.**
**Prova:** `node scripts/provas.mjs r12`

### R-13 · 2026-09-01 · fechado
**Erik:** "As funções estão erradas, e os itens dentro das funções também"
**Onde:** /canvas
**Prova:** `node scripts/provas.mjs r13`

### R-14 · 2026-09-01 · fechado
**Erik:** "Eu não consigo mover os post-it"
**Onde:** /canvas
**Medido em 04/09:** Medido: arrasto de 140x90 move a nota 139x92. A causa antiga esta escrita no `Canvas.jsx:415` — o chao roubava a captura de ponteiro, e a guarda procurava `.canvas-nota`, classe que nao existe.
**Prova:** `node scripts/provas.mjs r14`

### R-15 · 2026-09-01 · fechado
**Erik:** "Os grupos se sobrepõem e não são como o que eu criei no Figma"
**Onde:** /canvas
**Medido em 04/09:** **nada no produto impede duas seções de se sobreporem**, e a tolerância é deliberada — está escrita no `Canvas.jsx`: a contenção é por VÍNCULO e não por geometria, e a versão que perguntava "quem está por cima?" foi testada e reprovou justamente "com duas áreas sobrepostas". O `organizar()` desfaz sobreposição de **notas** (`conjunto = alvos || nos`), e não toca em seção. E a seção nasce em volta do que está selecionado — se duas seleções se cruzam no plano, as duas áreas se cruzam.

Não deu para medir a sobreposição na tela: **o acervo semeado traz uma seção só** ("Design & Tecnologia", 620×420), e sobreposição precisa de duas.

**Pendência do Erik, e é uma regra que falta:** seção pode encostar em seção? Se não pode, o produto deve *impedir* (empurrar como o `organizar` faz com as notas) ou apenas *avisar*? Isso não está no repositório e não se deduz do código — a segunda metade da queixa ("não são como o que eu criei no Figma") é do quadro, na Fase 4.
**Prova:** `node scripts/provas.mjs r15`

**Fechado em 06/09, e a bancada precisou aprender a mostrar o defeito.**

A nota de 04/09 termina com *"não deu para medir a sobreposição na tela"* — o
acervo semeado traz UMA seção só. Um defeito que a bancada não consegue mostrar
é um defeito que ninguém consegue fechar. `scripts/_sessao.py secao-coberta`
escreve a segunda, cabendo dentro da primeira.

**Com ela na tela, o defeito apareceu, e é pior que estético:** as duas seções
nasciam com `z-index: 0`, e no empate quem ganha é a ordem do DOM, que é a
ordem de criação. Uma seção INTEIRAMENTE dentro de outra ficava **inalcançável**
— `elementFromPoint` no topo dela devolvia o que estava embaixo. Uma área que
não se pode pegar não existe para quem usa.

A regra agora é de ÁREA e não de idade: quanto menor, mais alto. Uma seção que
cobre outra por inteiro é sempre a maior das duas, então a coberta sobe sozinha.

**Isto não mexe na contenção.** Quem está dentro de quem continua sendo vínculo,
e não geometria — a versão que perguntava "quem está por cima?" para decidir
pertencimento foi testada e reprovou exatamente com duas áreas sobrepostas. Aqui
só se decide quem PINTA na frente.

**Fica dito o que não foi feito:** nada impede duas seções de se cruzarem, e
essa tolerância continua deliberada. Se ele quiser que o produto as empurre ou
recuse a criação, é regra dele — o que este item consertou foi a área que
sumia.

### R-16 · 2026-09-01 · fechado
**Erik:** "Canvas travado, péssimas animações, interação ruim e confusa, ícones errados"
**Onde:** /canvas
**Prova:** `node scripts/provas.mjs r16`

### R-17 · 2026-09-01 · fechado
**Erik:** "Navegação enfiada onde não precisa — em alguns lugares é válida, em outros foi forçada sem necessidade e não seguiu o Figma"
**Onde:** /estudos
**Prova:** `node scripts/provas.mjs r17`

**Fechado em 06/09.** A trilha de /estudos já tinha sido movida por causa
desta frase, e o próprio arquivo registra: *"o Erik apontou que ela foi forçada
onde não cabia, e o desenho confirma: no `895:8849` ela aparece SÓ na fileira de
baixo, ao lado de 'Você ligou'. Em cima não há o que indexar."*

O que faltava era prova. `r17` mede as três coisas: que a trilha esteja DENTRO
da fileira de baixo, que comece abaixo do topo da página, e que a coluna dela
seja de 200. Envenenada — a trilha devolvida para o topo, indexando a página
inteira —, ela reprova nomeando o nó.

E a navegação existe no desenho: `900:56142` traz a mesma trilha, com "Início",
"O que ficou" e as perguntas dos estudos.

### R-18 · 2026-09-01 · fechado
**Erik:** "Kanban não funciona, interação péssima, parece de enfeite"
**Onde:** /estudos
**Medido em 04/09:** O gesto pedido nao existe de proposito: o no 895:8849 poe um botao "Reler" na coluna do lido, e ele existe e esta ligado. **Fica aberto porque trocar o gesto pedido por outro e julgamento do Erik, nao meu.**
**Prova:** `node scripts/provas.mjs r18`

### R-19 · 2026-09-01 · fechado
**Erik:** "Figma totalmente ignorado"
**Onde:** /estudos
**Prova:** `node scripts/provas.mjs r19`

**Fechado em 06/09 — a tela foi conferida contra o nó.** `900:56142` e
`966:30771` estão no quadro como `dado-do-no`, e o que mudou nesta rodada:
título em heading-xl 48/56 com -0,96px (estava 32/40 nas duas larguras), frase
de abertura em body-medium 20/30 (estava 16/24), respiro de 128 entre as faixas
também no telefone, e os recortes ANTES do cartão do que ficou pela metade — os
dois nós escrevem essa ordem, e o produto tinha o cartão colado no cabeçalho.
A lista de estudos virou duas colunas, que é como o nó a desenha.

A frase é sobre a tela inteira, e uma tela inteira não cabe numa prova. O que a prova guarda são as medidas que estavam ERRADAS quando ele escreveu — envenená-la com os números antigos a faz reprovar nomeando qual número e qual nó. Se ele olhar e ainda discordar, o item reabre: é para isso que o livro serve.

### R-20 · 2026-09-01 · fechado
**Erik:** "Div central com 2 larguras sem necessidade"
**Onde:** /estudos
**Medido em 04/09:** Medido a 1440: NOVE larguras distintas entre os blocos maiores que 240px — 389, 411, 514, 910, 974, 1172, 1180, 1222, 1440. Ele escreveu "2".
**Prova:** `node scripts/provas.mjs r20`

**Fechado em 06/09.** Ele escreveu "2" e a medida de 04/09 achou **nove**
larguras. Hoje são **duas**, e as duas vêm do nó: 1222 nas faixas acima da
trilha e 974 nas que ficam ao lado dela — `900:56142` só põe a trilha ao lado da
parte de baixo, e 1222 − 200 de trilha − 48 de vão dá exatamente 974.

A prova conta as larguras distintas e exige que sejam essas duas. Envenenada com
uma terceira — uma faixa de 1100 sem motivo estrutural —, ela reprova nomeando
as três. É esse o defeito que o item descreve: bloco com largura própria sem
razão. As duas que ficam têm razão, e ela é do desenho.

### R-21 · 2026-09-01 · fechado
**Erik:** "Navegação onde não deveria ter, e errada"
**Onde:** detalhes do arquivo
**Medido em 04/09:** A trilha existe e mudou de conteudo: lista as notas da pessoa, citando o no 895:7631. **Fica aberto porque se ela deve existir ali e questao de fidelidade.**
**Prova:** `node scripts/provas.mjs r21`

### R-22 · 2026-09-01 · fechado
**Erik:** "Não seguiu o Figma — inventou coisa que nem devia existir"
**Onde:** detalhes do arquivo
**Prova:** `node scripts/provas.mjs r22`

**Fechado em 06/09.** "Detalhes do arquivo" é a folha de Configurações de
arquivo, e ela entrou no quadro contra `941:23118`: 1082 de largura, cinco
linhas em `p-40` com 40 entre as partes, 24 entre linhas, título Body/Large
24/32 e explicação Body/Medium 20/30 — tudo isso já batia.

O que estava fora era o recheio da folha AMPLA, que usava o das estreitas: 32
em volta contra os 40 do cabeçalho e os 56 do corpo que o `895:12217` pede.
Painel maior, respiro maior.

Sobre "inventou coisa que nem devia existir": as cinco linhas são as cinco do
nó — Renomear, Ver todas as páginas, Baixar, Refazer a preparação e Remover da
estante —, e a prova conta que sejam cinco.

A frase é sobre a tela inteira, e uma tela inteira não cabe numa prova. O que a prova guarda são as medidas que estavam ERRADAS quando ele escreveu — envenená-la com os números antigos a faz reprovar nomeando qual número e qual nó. Se ele olhar e ainda discordar, o item reabre: é para isso que o livro serve.

### R-23 · 2026-09-01 · fechado
**Erik:** "Seguiu a ideia, mas fugiu muito do grid; as Memórias Póstumas podiam ser enquadradas melhor"
**Onde:** /leitura/:id
**Prova:** `node scripts/provas.mjs r23`

### R-24 · 2026-09-01 · fechado
**Erik:** "Menu errado: itens abrem do lado contrário ao do ícone; dropdowns e modais abrem errado, com largura errada, ícones apertados"
**Onde:** /leitura/:id
**Prova:** `node scripts/provas.mjs r24`

**Fechado em 06/09, e uma das três frases não reproduzia mais.**

*"Itens abrem do lado contrário ao do ícone"* — medido nos cinco painéis do
leitor, e os cinco abrem do lado do botão que os chama: Índice, Notas e
Marcadores à esquerda (botões em x=21, 85 e 149), Aparência e Buscar à direita
(x=1301 e 1363). Alguém já tinha consertado isso antes desta rodada; a medida
fica aqui para não voltar.

*"Largura errada"* — essa reproduzia. Cinco painéis abertos pelo mesmo tipo de
botão da mesma barra tinham **três larguras**: Índice, Marcadores e Buscar em
464, o Caderno em 380 e a Aparência em 384. O `941:23110` põe os painéis do
leitor em 464. Agora são cinco em 464.

*"Ícones apertados"* — os botões da barra são 56×56 com ícone de 24, que é o
`938:22282` do sistema: 56 com `p-8` em volta de um glifo de 23,867. Não
reproduz.

A prova `r24` abre os três painéis principais, um por vez, e cobra as duas
coisas em cada um: que o lado do painel seja o lado do botão, e que a largura
seja 464.

### R-25 · 2026-09-01 · fechado
**Erik:** "Notas e destaques você coloriu demais"
**Onde:** /leitura/:id
**Medido em 04/09:** Medido em /notas: quatro familias de cor fora do neutro, e a azeitona `rgb(116,108,47)` em 111 elementos.
**Prova:** `node scripts/provas.mjs r04`

**Medido de novo em 06/09 — é o mesmo caso do R-04, pela outra ponta.** A
azeitona `rgb(116,108,47)` é `--nota-amarelo` no tema escuro. As quatro cores
existem como token nomeado por papel desde então, e as claras são exatamente as
quatro do `941:23120`. As escuras são nossas.

Fica aberto pela mesma razão: quanto peso o destaque deve ter no escuro é
escolha de desenho, e o desenho não cobre o tema escuro.

### R-26 · 2026-09-01 · fechado
**Erik:** "Os temas têm 1 cor e justamente um tem 2 palavras — é ele que quebra o layout. Remover o 'do'"
**Onde:** /leitura/:id
**Medido em 04/09:** Os quatro rotulos tem uma palavra: Claro, Sepia, Escuro, Sistema (`Leitura.jsx:1335-1347`).
**Prova:** `node scripts/provas.mjs r26`

### R-27 · 2026-09-01 · fechado
**Erik:** "Você esqueceu de REMOVER o vertical trim de todos os textos — line height normal, nada de vertical trim"
**Onde:** todas
**Medido em 04/09:** Medido na Leitura: ha computados com `text-box-trim: trim-both`. Continua aplicado.
**Medido em 04/09, na Estante:** vivo em `web/src/estilo/base.css:117`, global. Um título de uma linha mede `clientHeight` 17 onde a linha pede 32; de duas linhas, 57 onde pede 64. **Quinze pixels por linha a menos do que o texto ocupa.** Consequência para a Fase 2a: varredura de transbordo que compare `scrollHeight` com `clientHeight` acusa FALSO em toda tela enquanto ele estiver lá — aconteceu aqui hoje, seis títulos "cortados" que não estavam cortados.

**Medido de novo em 04/09, e não é só a varredura: o trim CORTA TINTA.** `text-box-edge: cap alphabetic` fecha a caixa na linha de base, e descendente mora abaixo dela. No `.livro-texto h3` da Estante, que tem `overflow: hidden` por causa do corte em duas linhas do R-46, a conta fecha assim: Zodiak Variable 24px tem `actualBoundingBoxDescent` de **4,8px**, a base da última linha cai em 698,7 e o fundo da caixa em 698,2 — **5,3px de tinta abaixo do recorte**. Na captura, o "p" de "campo", o "q" de "Sequência" e o "ç" de "Apresentação" saem cortados.

Isso muda a ordem: enquanto o trim estiver lá, todo bloco que ganhar `overflow: hidden` — e o corte em duas linhas do R-46 é um — passa a raspar descendente. **A varredura de transbordo é a segunda vítima, não a primeira.**

O escopo é grande, e está escrito no próprio `base.css`: o trim entrou junto com a decisão de tirar os vãos que eram meia-entrelinha sobrando, e removê-lo devolve 654px à Ajuda, 703px às Atualizações e 431px aos Termos — três telas que voltam a ter vão sem decisão. Tirar o trim sem pôr o vão do Figma no lugar troca um defeito por outro.
**DECIDIDO pelo Erik em 04/09:** o trim FICA por enquanto, e o R-27 vira item da Fase 4. Tirá-lo agora devolve 654px à Ajuda, 703px às Atualizações e 431px aos Termos — três telas que voltam a ter vão sem decisão, e a decisão do vão é justamente o que a leitura do quadro vai dar. Tirar antes trocaria um defeito por três telas redesenhadas às cegas. Sai quando o substituto do vão vier junto, do Figma.
**Consequência enquanto ficar:** todo bloco de h1..h6/p/li que ganhar `overflow: hidden` precisa de `text-box-edge: cap text` + `padding-block-end: 0.2em`, senão corta descendente. E a varredura de transbordo da Fase 2a usa a MESMA CAIXA contra ela mesma (antes e depois), e não `scrollHeight` contra `clientHeight` — o critério do r46, o único dos três que sobreviveu ao controle negativo.
**Prova:** `node scripts/provas.mjs r27`

### R-46 · 2026-09-04 · fechado
**Erik:** "limitar a quantidade de caracteres do titulo do arquivo aparecendo na estante, se nao, vai ter texto enorme quebrando o layout e fazendo a tela perder o sentido"
**Onde:** /estante
**Feito em 04/09:** corte em DUAS LINHAS, não em número de caracteres — contagem não sabe a largura do glifo, e `IIIIIIIIIIIIIIIIIIII` e `WWWWWWWWWWWWWWWWWWWW` têm vinte caracteres e larguras muito diferentes. `title` no elemento devolve o nome inteiro. Veneno de 140 caracteres: o cartão cresceu **0px**, o título parou em 2 linhas, 6 cartões com 1 altura só (467px).
**Provado em 04/09, com a bancada de pé:** o nome longo entra na própria medida — prova que só vê nome curto não sabe dizer nada sobre nome comprido. Limpo, a caixa do nome cresceu **0px** e os 6 cartões ficaram com uma altura só; com o corte removido, ela esticou **192px**.

**O instrumento errou duas vezes antes de acertar, e as duas por ler altura absoluta.** `Range.getClientRects()` devolve uma caixa por linha DIAGRAMADA, e o `-webkit-line-clamp` esconde as de baixo sem tirá-las do fluxo: 7 linhas no limpo e 7 no envenenado, com a tela cortando em 2 nos dois casos — controle negativo verde dos dois lados, que é o mesmo que não medir. Dividir altura por entrelinha erra pelo motivo do R-27. O que serve é a diferença da MESMA caixa antes e depois, que não carrega nem o corte nem o trim.
**Prova:** `node scripts/provas.mjs r46`

### R-47 · 2026-09-04 · fechado
**Erik:** "tem um component set no figma com varias capas que criei justamente pro usuario n ficar sem capa caso o arquivo dele n tivesse uma... em caso de n haver borda ou lateral a gente segue o padrao de cor solida principal do livro"
**Onde:** /estante, /canvas, /estante/:id
**Lido em 04/09:** conjunto `1016:31030` — 14 capas de 420×594 e 14 lombadas de 58×594, mapeadas em `docs/TELAS-FIGMA.md`. São gabaritos que recebem o título, não fundos. Paleta: `#f4f2ec`, `#101010`, `#d9d9d9`.
**Feito:** uma peça só (`componentes/CapaDeReserva.jsx`) no lugar de TRÊS implementações divergentes — `.capa-vazia`, `.livro-capa-vazia`, `.livro-pagina-capa-vazia` —, com a variante saindo do token do trabalho: mesmo livro, mesma capa, sempre.
**Falta:** a ARTE das catorze. Cada variante tem nó próprio; entra como regra `[data-capa]`, sem tocar no componente. Isso não segura o fechamento: o que o item cobra é o livro sem capa não virar buraco, e isso está na tela e medido.

**Visto na tela em 04/09, e não só em processo.** O caminho estava provado em teste com controle negativo nos dois sentidos, e mesmo assim nunca tinha aparecido: a estante de prova tinha 6 livros e os 6 tinham capa. **`scripts/semear.py` passou a semear um sem capa de propósito** — "Cadernos de campo" — e a razão está escrita lá: acervo de prova onde todo arquivo é perfeito é acervo que só sabe dizer que está tudo bem. Foi assim que três implementações divergentes do mesmo estado conviveram sem nenhuma chegar à tela.

Medido: o cartão sem capa desenha `.capa-de-reserva` com variante `1`, papel `rgb(244, 242, 236)`, o título dentro, e a caixa **252×356 — razão 0,707, a mesma 420/594 da capa de verdade**, com a mesma largura dos outros cinco. Nenhuma moldura quebrada na estante. Envenenado (o gabarito trocado pela `<img>` sem arquivo, que é o estado anterior), a prova acusa: *capa quebrada na estante, e nao o gabarito: Cadernos de campo*.
**Prova:** `node scripts/provas.mjs r47`

### R-28 · 2026-09-01 · fechado
**Erik:** "Clico em adicionar cor (criar destaque, não nota) e o texto da leitura não muda de cor — botão que não pressiona, não muda, não dá feedback"
**Onde:** /leitura/:id
**Medido em 04/09:** Medido na Leitura: zero elementos de marca (`mark`, `.destaque`) no DOM do capitulo aberto.

**Medido de novo em 04/09, com o gesto inteiro, e o defeito era REAL — e primeiro-uso.** Selecionar um trecho, soltar, e clicar na primeira cor: numa conta nova, a marca **não** aparecia; na segunda tentativa, aparecia. Foi por isso que ele parecia consertado — quem mede duas vezes só vê a segunda.

**A causa não era o botão, e a medida quase mentiu duas vezes.** O `POST /jobs/:id/notas` respondia **201** com a nota gravada: nada falhava, e não havia erro para mostrar. O que estava errado era o CAPÍTULO. A leitura é rolagem contínua — há várias `<section class="capitulo">` na página ao mesmo tempo —, e `App.jsx` gravava a nota com `livro.capitulo`, que é só o capítulo em que o livro foi ABERTO. O trecho selecionado era de outro, e o desenho filtra as notas por `n.capitulo === indice`: a marca não aparecia em capítulo nenhum. O deslocamento ia junto no erro, porque ele é contado a partir do começo do capítulo — e o capítulo era outro. Na segunda visita o livro abre onde a leitura parou, o capítulo de entrada passa a ser o mesmo, e a marca aparece.

**A mesma armadilha já tinha sido paga três linhas ao lado**, para o progresso: *"usá-lo faria toda a leitura ser gravada como se fosse no capítulo de entrada"*. A marcação ficou para trás. Agora o capítulo sai da seleção (`leitor/selecao.js`), como o deslocamento já saía.

Medido depois do conserto, em conta nova: `POST` com `capitulo: 0` — o do parágrafo, e não `1`, o de entrada — e **uma** marca na tela, com fundo `rgb(239, 255, 191)`.
**Prova:** `node scripts/provas.mjs r28`

### R-29 · 2026-09-01 · fechado
**Erik:** "Há imagens ilustrativas nas seções, cuidadosamente posicionadas para ficar em cima do container, com layout e ordem de layers pensados para não dar problema na implementação — e ainda assim você fez errado"
**Onde:** /conta e filhas
**Medido em 04/09:** Medido em /conta/privacidade: nenhuma imagem maior que 24px. O `Privacidade.jsx:50` registra por que — o SVG exportado era o no ERRADO, um bloco de texto branco, e foi apagado.
**Prova:** `node scripts/provas.mjs r29`

**Fechado em 06/09.** As quatro telas de conta têm desenho, e cada uma tem o
seu: `/conta` 272×224, `/conta/kindle` 190×224, `/conta/preferencias` 201×224 e
`/conta/privacidade` 224×224. A medida de 04/09 — "nenhuma imagem maior que
24px" — não reproduz mais.

A segunda metade da frase do Erik é a que a prova cobra junto: *"posicionadas
para ficar em cima do container"*. Um desenho presente mas empilhado acima do
card não cumpre o que ele descreveu, então `r29` mede a sobreposição e não só a
presença — a base do desenho tem de cair DENTRO do card.

Fica dito o que ainda não é do jeito dele: a largura seguia cravada em 272 para
todos, e a de Preferências (200,601×224) vinha esticada 1,36×. Agora a altura é
fixa e a largura segue a proporção de cada desenho.

### R-30 · 2026-09-01 · fechado
**Erik:** "As letras pequenas podiam virar hot spot: bolinha clicável que abre popup informativo, em vez de texto quebrado e minúsculo por toda parte"
**Onde:** /conta e filhas
**Medido em 04/09:** Nao ha popover nem hot spot nas telas de conta.
**Prova:** `node scripts/provas.mjs r30`

### R-31 · 2026-09-01 · fechado
**Erik:** "Na tela de dados de uso você modificou tudo — se não havia outra forma, siga o Figma"
**Onde:** /conta/privacidade
**Prova:** `node scripts/provas.mjs r32`

**Fechado em 06/09, junto com o R-32.** "Siga o Figma" virou verificável: a
tela foi conferida contra os dois nós — `895:10909` no computador e `966:26643`
no telefone — e o quadro registra `dado-do-no`, não mais `captura`.

O que estava fora, e é o que a prova `r32` guarda: o item da lista em 16/24 e a
explicação em 14/20, contra os `body-medium 20/30` e `body-small 16/24` que os
dois nós escrevem — um passo abaixo nos dois, nas duas larguras. O título de
seção no telefone estava 24/32 contra os 24/36 do nó.

A conferência anterior desta tela olhou o interruptor da medição e a borda da
seção sem volta e passou por cima da escala. É o tipo de verde que este
repositório já paga caro: a medida passou porque mediu outra coisa.

### R-32 · 2026-09-01 · fechado
**Erik:** "Tela de privacidade completamente quebrada"
**Onde:** /conta/privacidade
**Medido em 04/09:** Medido: cinco blocos `.conta-secao`, todos com 863px, nenhum bloco vazio com altura. Nao achei quebra estrutural — o que responde e o quadro.
**Prova:** `node scripts/provas.mjs r32`

**Fechado em 06/09.** A medida de 04/09 já dizia que não havia quebra
estrutural — cinco blocos de 863px, nenhum vazio — e que "o que responde é o
quadro". O quadro respondeu: `895:10909` e `966:26643` conferidos contra o dado
do nó em 06/09, com a escala dos itens corrigida. Ver o R-31, que é a mesma
tela pela outra frase.

### R-33 · 2026-09-01 · fechado
**Erik:** "Espaçamento bugado, não segue o grid do Figma, navegação errada"
**Onde:** por onde começar
**Prova:** `node scripts/provas.mjs r33`

**Fechado em 06/09.** "Por onde começar" é a Ajuda, e o cartão de tarefa dela
foi refeito contra `895:11193` e `966:27747`: recheio 40 (era 32), vão 40 (era
12), algarismo em display-large-capitular 64/72 itálico (era 40/48 reto no
computador e 32/40 no telefone), título Heading/SM 28/36 e botão de largura
cheia. Os vãos do desenho são três — 40, 24 e 40 — e uma coluna de vão único
não sabe dizer três números; daí os dois grupos do nó no JSX.

A frase é sobre a tela inteira, e uma tela inteira não cabe numa prova. O que a prova guarda são as medidas que estavam ERRADAS quando ele escreveu — envenená-la com os números antigos a faz reprovar nomeando qual número e qual nó. Se ele olhar e ainda discordar, o item reabre: é para isso que o livro serve.

### R-34 · 2026-09-01 · fechado
**Erik:** "Bem errada também, não condizendo com o Figma"
**Onde:** /preparo/:id
**Medido em 04/09 — o único dos 38 que ninguém tinha conseguido nem olhar.** A tela é o nó `966:31504`, o estado `analyzed`, e a bancada não o produzia: todo trabalho semeado nascia em `converted`, e `/preparo/{id}` abria a tela de espera (`967:31833`). Agora o `semear.py` grava um parado em `analyzed`, e a comparação das **catorze linhas** que o nó pede está em `docs/TELAS-FIGMA.md`.

**Três batem, onze divergem.** Batem: o fundo da faixa do veredito (`#f3f3f3`), o fundo do cartão (`#f9f9f9`) e a altura do botão do cartão (58). Divergem, entre outras: o título é **28/40 peso 700 `#151515`** onde o nó pede **32/40 peso 540 `#535353`**; o vão título→selos é **12** onde ele pede **32**; selos→alternador é **20** onde ele pede **64**; os selos têm raio **999px** (cápsula) onde ele pede **24**; e os botões finais têm **80** de altura onde ele pede **58**. Nenhuma rolagem horizontal.

**Duas divergências não são número, são peça:**

1. **O botão ⋮ não existe.** O nó o desenha 56×56, girado −90°, ao lado do título. A tela não tem nada ali.
2. **A faixa do veredito não tem filete à esquerda.** O nó pede `border-l-2 #6a6a6a`, e é ele que faz aquele parágrafo ser uma faixa em vez de um bloco cinza — a regra que este repositório já escreveu ao contrário uma vez: *"o chão marca o conteúdo; o filete marca a citação"*.

**E uma terceira, que só apareceu porque agora existe um trabalho sem capa:** a capa do Preparo cai para `<span>{titulo}</span>` dentro de `.preparo-pagina-capa` — **a quarta implementação divergente do "sem capa"**, depois das três que a `CapaDeReserva` unificou no R-47.

**Fica aberto porque o conserto é a Fase 4**, e não a medida: as catorze linhas estão escritas, o item agora tem número em vez de adjetivo. Os **ícones desta tela continuam em branco no quadro** — oito quadrados `32×32` em `#d9d9d9` —, e preencher por conta própria é como o ícone de "ver todas as páginas" nasceu clonado do Canvas. Ver o R-49.
**Prova:** `node scripts/provas.mjs r34`

**Fechado em 06/09.** As três telas do Preparo entraram no quadro como
`dado-do-no` — `895:7856`, `966:31504`, `967:31833` e `895:8164`. O que a prova
guarda: a marca do arquivo em 13 por 17 com Label/Small 14/22 (era 4 por 12 com
14/20, do tamanho de um selo), o cartão de achado com 40 de recheio, o título em
40/48 e o de seção em heading-md 32/40.

A tela de andamento foi medida pela primeira vez nesta rodada — a bancada nunca
a mostrava, porque o conversor de teste falha na hora. Ver o R-54.

A frase é sobre a tela inteira, e uma tela inteira não cabe numa prova. O que a prova guarda são as medidas que estavam ERRADAS quando ele escreveu — envenená-la com os números antigos a faz reprovar nomeando qual número e qual nó. Se ele olhar e ainda discordar, o item reabre: é para isso que o livro serve.

### R-35 · 2026-09-01 · fechado
**Erik:** "Continua completamente bugada"
**Onde:** estante 3D
**Medido em 04/09:** Medido: o alternador existe, muda para a pilha, seis livros deitados, nenhum fora da janela e nenhum com altura zero.
**Prova:** `node scripts/provas.mjs r35`

**Fechado em 06/09.** A medida de 04/09 já dizia que a vista monta, muda para
a pilha e desenha os livros deitados. O que faltava era conferi-la contra o nó,
e `895:7506` entrou no quadro nesta rodada: pilha, trilha de lombadas à
esquerda e ficha de 476 com o cartão em `p-40 gap-32` e título heading-md 32/40.

Duas medidas estavam fora e foram corrigidas: a contagem de notas em peso 400
quando Body/Large é 500, e o vazio em 14/20 quando Label/Small é 14/22.

**Uma diferença de largura fica, e não é defeito:** o nó é desenhado a 1920 —
293 + 128 + 831 + 128 + 476 + 64 fecham exatamente 1920 — e o vão de 128 entre
colunas não cabe a 1440.

A frase é sobre a tela inteira, e uma tela inteira não cabe numa prova. O que a prova guarda são as medidas que estavam ERRADAS quando ele escreveu — envenená-la com os números antigos a faz reprovar nomeando qual número e qual nó. Se ele olhar e ainda discordar, o item reabre: é para isso que o livro serve.

### R-36 · 2026-09-01 · fechado
**Erik:** "Popups grandes até demais, fontes enormes. Coisas que deveriam caber numa tela única precisam de scroll. Grandes e legíveis, mas pecam no exagero"
**Onde:** todas
**Medido em 04/09:** Medido: /estudos tem 5397px de altura numa janela de 1000.
**Prova:** `node scripts/provas.mjs r36`

### R-37 · 2026-09-01 · aberto
**Erik:** "Estudos e Canvas: péssima organização, criação, uso e animação — não segue em nada o Figma. Eu não o criei por brincadeira"
**Onde:** /estudos e /canvas
**Prova:** sem-prova

### R-38 · 2026-09-01 · fechado
**Erik:** "As telas com um container atrás, numa cor diferente, sobre canvas pontilhado, são GAVETAS — seções que sobrepõem o conteúdo anterior, seguindo a lógica de navegação dentro do canvas. Usar o vaul desde o início: https://github.com/emilkowalski/vaul.git"
**Onde:** arquitetura de navegação
**Nota:** DECISÃO, não conserto. Adotar muda o modelo de navegação de várias telas. Não implementar sem o Erik confirmar.
**Medido em 04/09:** A `vaul` esta nas dependencias e o `GavetaDeSecao` a usa **nao-modal**, sem escurecer o fundo, fechando por arrasto — o no 895:10599 mostra o cabecalho vivo com a Conta aberta. **Quais telas ainda nao sao gavetas continua aberto, no R-17.**
**Prova:** `node scripts/provas.mjs r38`

---

## 02/09 — o que ele achou andando pelo produto

### R-39 · 2026-09-02 · fechado
**Erik:** "padding bugado" (nas seções)
**Onde:** /conta e filhas
**Prova:** `node scripts/provas.mjs r39`

**Fechado em 06/09.** O recheio das seções da conta era meu, não do nó: 40 em
cima, 24 dos lados e 80 embaixo, e com isso a coluna media 310 numa tela de 390.
`966:25321` pede 56 / 16 / 64, o que dá os 326 que o nó desenha.

Junto veio o recheio das folhas, que tinha o mesmo problema por outro caminho:
32 por 40 nas estreitas contra os 32 em volta que dois nós escrevem
(`895:12444`, `973:32415`), e a folha ampla — Configurações de arquivo — com o
mesmo número das estreitas, quando `895:12217` pede 40 e 56.

### R-40 · 2026-09-02 · fechado
**Erik:** "falta os desenhos das configurações"
**Onde:** /conta e filhas — mesmo defeito que o R-29
**Prova:** `node scripts/provas.mjs r40`

**Fechado em 06/09.** A tela de configurações tem o desenho dela —
`ilustracao-preferencias.svg`, 201×224 —, e a prova cobra as duas coisas: que
exista, e que seja o DELA. Quatro telas de conta, quatro desenhos; um só,
repetido, seria o mesmo defeito voltando de outro jeito.

É por isso que o Kindle não usa o do nó: `966:25687` manda repetir ali o mesmo
desenho de `/conta`, e duas abas vizinhas com o mesmo ornamento leem como
defeito. Está registrado no quadro `966:25554` e é trocável numa linha.

### R-41 · 2026-09-02 · fechado
**Erik:** "espaçamento na estante incoerente com o figma"
**Onde:** /estante — mesmo defeito que o R-08 e o R-11
**Prova:** `node scripts/provas.mjs r11`

**Fechado em 06/09, com o R-11.** É a mesma frase pela segunda vez, e a
resposta é a mesma: os vãos da grade são os do nó, medida a medida. Ver o R-11
para os números e para a diferença de largura, que vem de o nó ser desenhado a
1920.

### R-42 · 2026-09-02 · fechado
**Erik:** "sistema de destaque de livro na estante continua péssimo apesar dos meus feedbacks"
**Onde:** /estante — é o R-01 e o R-03, na terceira vez
**Nota:** este é o item que fez este arquivo existir.
**Prova:** `node scripts/provas.mjs r01`

**Fechado em 06/09, com o R-01.** É a terceira vez que ele escreve a mesma
coisa, e é o item que fez este arquivo existir. Ver o R-01: o defeito era o véu
de 4% sobre a arte, e a correção segue a regra que o próprio arquivo já tinha
escrito para o estado escolhido.

O R-03 — o marcador de notas atrás da capa — já estava fechado com prova desde
04/09. Com este, os três feedbacks dele sobre a Estante têm medida.

### R-43 · 2026-09-02 · fechado
**Erik:** "itens no canvas que diz escrita aqui mas n da pra escrever nem alterar o que tem na nota"
**Onde:** /canvas
**Prova:** `node scripts/provas.mjs r43`

## 04/09 — o que ele achou nas onze capturas

**Fechado em 06/09, e a frase dele estava inteira certa.** Uma nota escrita no
Canvas não podia ser alterada em lugar nenhum:

- **no Canvas**, o menu tinha "Abrir no livro", "Ligar a…" e "Tirar" — nenhuma
  ação de editar;
- **na página da nota**, "Editar o que escrevi" mexe no `comentario`. Numa nota
  do Canvas o texto mora no `trecho`, e o `comentario` está vazio: editar ali
  acrescentava um comentário embaixo em vez de mudar o que estava escrito;
- **no servidor**, `PATCH /notas/{id}` aceitava `comentario`, `cor`, `estado` e
  `revisar`. `trecho` não estava na lista.

Os três consertados: o modelo aceita `trecho`, o menu da nota ganhou "Editar", e
a mesma folha de escrever serve para os dois — escrever é editar uma nota que
ainda não existe.

**A guarda é do produto, e não minha:** o servidor recusa mudar o `trecho`
quando a nota tem livro. Ali ele é a CITAÇÃO, e deixar editá-la faria o Mekora
guardar, com origem e página, uma frase que o autor não escreveu — para o que a
pessoa tem a dizer já existe o comentário. Medido: `PATCH` com `trecho` numa
nota de leitura responde **400** com essa frase; com `comentario`, **200**.

A prova `r43` faz o gesto inteiro no navegador — abre o menu, clica em Editar,
troca o texto, guarda, e confere que a superfície mudou. Envenenada sem o item
do menu, ela reprova nomeando o que sobrou.

### R-44 · 2026-09-04 · fechado
**Erik:** "capa do livro errado — o cartão Relatório de pesquisa renderiza a capa de Malha Urbana"
**Onde:** /estante
**Medido em 04/09:** A causa não era do produto: cada cartão apontava para o seu próprio arquivo. Errado estava o DADO — `scripts/semear.py` tinha **quatro** imagens de exemplo para **seis** livros, e `exemplo-1` servia a dois títulos (Malha Urbana e Relatório de pesquisa), `exemplo-3` a outros dois. E havia um segundo defeito embaixo: a lista pedia `exemplo-1.png` e o que existe em disco é `.webp`, então o `if origem.exists()` pulava a cópia **em silêncio** — as capas que apareciam eram restos de uma rodada antiga. Agora cada livro ganha uma capa distinta, com o título escrito nela, e arquivo de exemplo faltando é erro que fala.
**Prova:** `node scripts/provas.mjs r44`

### R-45 · 2026-09-04 · fechado
**Erik:** (não é dele — saiu de medir a outra metade do R-44, a pedido dele: "quando a extração de capa de um livro REAL falha, o cartão cai em `.capa-vazia` ou fica com imagem de outro livro?")
**Onde:** /estante · `backend/app/api/jobs.py`
**Medido em 04/09:** Nenhuma das duas. A resposta é uma terceira: o cartão fica com um `<img class="capa">` **quebrado** — `naturalWidth: 0`, `complete: true`, e **sem** `.capa-vazia`. Imagem de outro livro não acontece: `serve_thumbnail` resolve o token para o `job_id` e lê de `STORAGE_TEMP/{job_id}`, então cada cartão só pode servir o próprio diretório. O que acontece é que `jobs.py` monta `cover_url` de `token_publico` + número da página **sempre que há `page_count`**, sem olhar se o arquivo existe — e a tela confia: `capa: e.cover_url ?? null`, e `capa ? <img> : <div class="capa capa-vazia">`. Um `cover_url` não-nulo apontando para 404 é justamente o caso em que o `.capa-vazia` existe e não é usado.

Medido no acervo semeado: com `storage/temp/9374/page_0.png` removido, a rota devolve 404 e o cartão "Relatório de pesquisa" fica com `larguraNatural: 0` e `temCapaVazia: false`; com o arquivo de volta, `larguraNatural: 420`. E no banco de desenvolvimento real (`storage/kindle_tool.db`), **32 dos 37 trabalhos** carregam `cover_url` não-nulo e **nenhum** dos 32 arquivos existe em disco — `storage/temp` é temporário.

O `scripts/semear.py` já sabia disso e contornou: *"TODOS OS LIVROS TÊM CAPA... um livro semeado sem arquivo em disco vira 404 — a estante mostrava capa quebrada nos dois que não tinham"*. Dar capa a todo livro semeado fez o sintoma sumir do acervo de prova sem tirá-lo do produto.

**Isto não reabre o R-44.** O R-44 diz "capa do livro errado", e capa de outro livro está medida como impossível por construção. Este é outro defeito, com outro sintoma, e por isso outro número.

**Consertado em 04/09, e maior do que a linha que eu previ.** Eram CINCO emissores — a Estante (`api/jobs.py`), a busca, os Estudos, o Canvas e as miniaturas (`services/pdf_service.py`) —, e nenhum conferia o arquivo. `services/capa_service.py` passou a ser o único, e ele devolve `None` sem arquivo em disco.

**E havia um segundo defeito embaixo, que eu não tinha visto:** a capa morava em `storage/temp/{id}`, e o `cleanup_old_jobs` faz `rmtree` de `temp` depois de `retention_days`. Está escrito no próprio limpador que a pasta de saída fica de propósito, porque apagá-la "apagaria o EPUB da estante de alguém trinta dias depois" — a capa não tinha tido a mesma consideração. Ela estava na pasta que a política existe para apagar, enquanto a estante que a mostra é permanente. Agora a capa é **promovida** para `storage/covers/{id}/capa.png` no fim da análise e a cada troca; `backend/scripts/promover_capas.py` faz o acervo que já existia (medido: 1 com miniatura em disco, 13 com PDF de origem, o resto sem de onde tirar — e sem de onde tirar é `.capa-de-reserva`, não moldura vazia).

**A prova cobre os dois**, e cada metade foi alcançada sozinha no controle negativo: apontar uma capa para arquivo que não existe dá *"capa emitida sem arquivo, e a moldura sai quebrada"*; reescrever as cinco de `/storage/covers/` para `/storage/temp/` — com arquivo vivo, 0 quebradas — dá *"capa fora de /storage/covers, na pasta que a limpeza por idade apaga"*.
**Prova:** `node scripts/provas.mjs r45`

### R-48 · 2026-09-04 · fechado
**Erik:** "seria interessante se o usuario pudesse trocar as cores, afinal, sao placeholders pra eles"
**Onde:** capas de reserva — `componentes/CapaDeReserva.jsx`
**Contexto:** o conjunto `1016:31030` desenha catorze capas para arquivos sem capa própria. Elas são do LEITOR, não do produto — daí a ideia de ele escolher a cor.
**Preparado em 04/09:** as três cores saíram para variável (`--capa-papel`, `--capa-tinta`, `--capa-trama`) num lugar só, e a família `capa-reserva/*` entrou no portão como superfície própria. Trocar por pessoa passa a ser escrever as três variáveis em vez de caçar hex.
**O que falta é produto, não CSS:** onde a pessoa escolhe, se a escolha é por livro ou geral, e onde ela é guardada — provavelmente ao lado das preferências de leitura. Não implementado: é recurso novo, e a fila do lançamento vem antes.
**Nota do Erik, no mesmo dia:** "as cores tao erradas pq n refinei elas" — os valores atuais são os do quadro, e são provisórios por decisão dele.
**Prova:** `node scripts/provas.mjs r48`

### R-49 · 2026-09-04 · fechado
**Erik:** (não é dele — saiu da Fase 3, a auditoria de ícone: glifo contra rótulo, passada única nos 27 da biblioteca)
**Onde:** `web/publico/icones/` · /leitura/:id, /canvas, /preparo/:id, o cabeçalho
**Medido em 04/09:** **dois pares de arquivos são byte a byte iguais** — mesmo `sha256`, mesmo tamanho:

    ec02f366132ee4b8…   icone-indice.svg   ==   icone-menu.svg      (14.585 bytes)
    f90e29714752fd20…   icone-canvas.svg   ==   icone-paginas.svg   (21.235 bytes)

São dois nomes para um desenho, em quatro lugares da tela: o índice do leitor e o menu do cabeçalho mostram o mesmo hambúrguer; o Canvas na navegação e "páginas" na tela de preparo mostram a mesma grade de quatro. **O `Leitura.jsx` chega a explicar a distinção que não existe:** *"O ícone do índice é uma LISTA, e não o da estante: aquele é o lugar onde os livros ficam"* — e o arquivo do índice é o hambúrguer do menu, letra por letra.

É a mesma família do R-07, e a mesma lição: **nenhuma leitura de CSS ou de JSX pega isto.** O nome do arquivo está certo em todos os quatro usos, o `import` está certo, o rótulo ao lado está certo. O que está errado é o CONTEÚDO do arquivo, e só a impressão digital o vê.

**Qual dos dois de cada par é o errado é do QUADRO, e por isso o item fica aberto.** "Menu = hambúrguer" e "grade de quatro = páginas" são as leituras mais prováveis, o que faria de `icone-indice.svg` e `icone-canvas.svg` os dois a refazer — mas provável não é medido, e desenhar de palpite é como as telas ficaram erradas da primeira vez. Os nós estão do lado da Fase 4.

**O que já entrou:** o `r07` deixou de fixar dois ícones e passou a fixar **os 27**, com o `sha256` de cada um como estavam nesta auditoria, mais a recusa de qualquer par novo. Verificado nos dois sentidos: um byte a mais no `icone-fixar.svg` dá *"mudou de desenho desde a auditoria de 04/09"*; copiar um ícone sobre outro dá o mesmo, e o vermelho chega antes da regra de par — está escrito na prova por que ela ainda não é alcançável, e para quando ela serve.

**Dois ícones não são usados em lugar nenhum:** `icone-camadas.svg` (30.660 bytes) e `icone-fixar.svg` (32.365 bytes), zero referências em `web/src`. Não apaguei: podem ser de tela que ainda não existe, e apagar arte que alguém desenhou por não achar o uso é decisão de quem desenhou. **Pendência do Erik:** ficam ou saem?

**O resto da biblioteca passou.** 25 desenhos distintos, cada um legível como o rótulo ao lado — aparelho, baixar, buscar, caderno, conta, copiar, defeito, dúvidas, enviar, estante, estudos, mais-ações, marcador, mesa, nota-imagem, nota-nova, preferências, privacidade, refazer, remover, renomear. Duas observações que são de desenho e não de defeito, e por isso não viram item: o `baixar` põe a barra ACIMA da seta enquanto o `enviar` põe a bandeja ABAIXO — o par não espelha; e o `marcador` é um hexágono com um ponto, que é o glifo de nó ou de ajuste, e não o da fita que marca a página.
**Prova:** `node scripts/provas.mjs r07`

**06/09 — medido, e metade do conserto está fora do meu alcance.**

O `scripts/icones.mjs` passou a contar DESENHOS, e não arquivos: *"27 arquivos,
25 desenhos distintos"*, com os dois pares nomeados. O par seguinte não entra
sem alguém ver, que era o risco real de um item que ninguém consegue fechar.

Saiu daqui o que era só sujeira: o `iconeMenu` do `Leitura.jsx` estava declarado
e **nunca usado** — a tela de leitura só desenha o índice. Sem ele, o hambúrguer
do menu e o do índice não aparecem juntos em tela nenhuma hoje.

**O que falta é desenho, e desenho é do Erik.** Duas ideias precisam de glifo
próprio, e não há candidato na biblioteca que não crie outra confusão:

- **índice** (o sumário do leitor). Hoje é o hambúrguer, que é o glifo da
  navegação. Precisa de uma LISTA.
- **páginas** (o achado "nenhuma página corrompida", no Preparo). Hoje é o grid
  do Canvas — de novo um glifo de navegação. A tela de Configurações de arquivo
  já resolveu o mesmo problema com `icone-camadas`, mas no Preparo o `camadas`
  já está em "Reconhecer o texto", **na mesma tela**: dar o mesmo desenho aos
  dois trocaria uma duplicata invisível por uma visível.

Fica aberto porque o que falta não é decisão nem código.


### R-50 · 2026-09-04 · fechado
**Erik:** (não é dele — é defeito da BANCADA, e o pior tipo: ele fazia o instrumento passar verde na tela errada)
**Onde:** `scripts/semear.py` · /preparo/:id
**Medido em 04/09:** o `semear.py` gravava trabalhos em `converted` e `done`. O nó `966:31504` — Preparo, "o que encontrei" — é o estado **`analyzed`**, e pedir `/preparo/{id}` na bancada abria "Analisando o arquivo…", que é outra tela (`967:31833`).

**O custo não era a medida faltando, era a medida MENTINDO.** Qualquer varredura que rode "em todas as rotas" passava por `/preparo/:id`, media a tela de espera e ficava verde; a cobertura registrava a rota como visitada. Instrumento certo, dado errado — a mesma família dos três "verde por omissão" que o `CLAUDE.md` já lista, e a razão de uma tela inteira do produto nunca ter sido medida por ninguém.

**Consertado:** um trabalho parado em `analyzed` no semeador (312 páginas, `pt`, 14 capítulos, 11,5 MB, sem capa e sem miniatura), e um endereço para ele — `_sessao.py … analisado` imprime o id, o `sessao-de-prova.sh` o devolve na terceira linha, e as provas o pedem por `{ANALISADO}`. **Apontar para "o primeiro livro" era o erro:** o primeiro livro já está convertido, e a rota sobre ele volta para a tela de espera.

Sem arquivo em disco: `GET /analyze/{id}` devolve o trabalho em cache assim que `status != "uploaded"`. O que ele não faz é converter, e isso está dito no semeador.

**A prova reprova pelo defeito, e não por perto dele:** envenenada, ela troca o relatório pela tela de espera — exatamente o que a varredura via — e acusa *"a rota abriu na tela de ESPERA, e nao no relatorio"*. Ela também recusa a bancada sem o estado: sem trabalho em `analyzed`, o `_sessao.py` devolve `0`, a rota vira `/preparo/0` e a prova diz que o semeador precisa gravar um — em vez de medir a tela errada em silêncio.
**Prova:** `node scripts/provas.mjs r50`

### R-51 · 2026-09-04 · fechado
**Erik:** (não é dele — apareceu no minuto em que a bancada ganhou um trabalho que ainda não é livro)
**Onde:** /estante · `web/src/estado/useJornada.js`
**Medido em 04/09:** o trabalho parado em `analyzed` **aparece como cartão na Estante**, ao lado dos seis livros convertidos — com o nome do arquivo no lugar do título (`estrategia-de-ux-oreilly.pdf`), sem capa, e sem leitura para abrir. `livros` é o `historico()` inteiro, sem nenhum filtro de estado.

**As duas intenções escritas no repositório discordam, e é por isso que isto é pendência e não conserto.**

- O `useJornada.js` diz, uma função acima: *"O que entra na Mesa é o que AINDA NÃO ESTÁ PRONTO: **pronto é livro, e livro mora na estante**. Quem decide isso é o `estadoDe` do contrato."* Por essa regra, a Estante deveria mostrar só `pronto`, e este cartão está sobrando.
- O `Estante.jsx` diz o contrário pela ação: a ficha tem um ramo `!selecionado.leituraUrl` que escreve *"Ainda em preparo. O texto abre quando a conversão terminar."* — texto que só faz sentido para um livro NÃO pronto visível na Estante.

Uma das duas está errada, e escolher entre elas é decisão de produto: ou a Estante é só o acervo pronto (e a Mesa é onde o preparo aparece), ou ela mostra tudo e o cartão em preparo precisa de um estado visual próprio — hoje ele é indistinguível de um livro, com nome de arquivo em vez de título.

**Nunca tinha aparecido porque a bancada não produzia o caso:** todo trabalho semeado nascia `converted`. É o mesmo buraco do R-50, visto de outra tela — dado de prova onde tudo já está pronto só sabe dizer que está tudo bem.
**Prova:** `node scripts/provas.mjs r51`

### R-52 · 2026-09-04 · fechado
**Erik:** *"canvas n vai existir no telefone, ja falamos sobre isso"*
**Onde:** /canvas · `web/src/lugares.js` · `web/src/componentes/Cabecalho.jsx` · `web/src/menu.js`
**Medido em 04/09:** a 390px a rota `/canvas` renderizava o Canvas **inteiro** — plano infinito, notas, ferramentas — e "Canvas" aparecia na barra de lugares e no menu do telefone como qualquer outro lugar.

**O "já falamos sobre isso" é o achado, e não o defeito.** A decisão era antiga e o produto nunca soube dela: ela vivia na conversa, e conversa não é executável. É a mesma família dos 38 itens que voltaram como defeito — não porque alguém discordou, mas porque a decisão nunca chegou ao código. O `lugares.js` já carregava `pronto` para dizer "este lugar ainda não existe"; não havia nada para dizer "este lugar não existe **aqui**".

**Consertado em três peças, e a divisão entre elas é o ponto:**

- `soNoComputador` + `porqueSoNoComputador` no `lugares.js`, ao lado de `pronto`. A decisão passa a ser dado, e o motivo viaja com ela.
- **Sai do menu e da barra no telefone** (`Cabecalho.jsx`, `menu.js`). Oferecer o que não funciona ensina que o produto está quebrado, e a barra de baixo é onde a pessoa aprende o que ele faz.
- **A rota continua respondendo** (`SoNoComputador.jsx`), com a explicação no lugar da tela. Quem guardou o endereço, ou abriu no computador e voltou pelo histórico, recebe o motivo — não uma página em branco. Não anunciado onde não serve; não quebrado onde for pedido.

O corte de 767px saiu para `estreito.js` porque o CSS já respondia a ele em 40 pontos, e dois cortes que ninguém garante iguais é como o Canvas some da barra num tamanho em que ele ainda abre.

**A prova mede nos dois sentidos, e o segundo não é zelo:** a 390 ela cobra o Canvas ausente da barra, ausente do menu, e a explicação servida; a 1920 ela cobra o Canvas **presente** na barra e a rota abrindo o Canvas. Sem essa metade, eu fecharia o item apagando o Canvas de todo tamanho de tela e a prova aplaudiria. Verificado injetando esse exato erro no produto — `!l.soNoComputador` sem o `estreito` — e a prova respondeu *"a 1920 o Canvas sumiu da barra de lugares — o conserto do telefone levou o computador junto"*.

Antes de dizer "o Canvas não está lá", ela prova que sabe achar: a Estante tem de aparecer na barra nos dois tamanhos, senão a resposta é INDETERMINADA (97) e não aprovação.
**Prova:** `node scripts/provas.mjs r52`

### R-53 · 2026-09-05 · fechado
**Erik:** (não é dele — apareceu ao tentar conferir o nó `895:8164`, a tela de Preparo pronta)
**Onde:** /preparo/:id · `web/src/jornadas/Preparo.jsx`
**Medido em 05/09:** **a tela de "pronto" era inalcançável por navegação.** Nenhum dos doze trabalhos convertidos da bancada a abria; todos caíam de volta na tela de análise, com o botão "Preparar com recomendações" — como se nada tivesse acontecido —, enquanto o livro já estava na estante.

**A causa:** `feito` era `useState(false)` e só virava verdadeiro quando a pessoa clicava em "Preparar" **naquela aba**. Quem fechasse a aba durante a conversão e voltasse ao mesmo endereço via a proposta de novo. O estado existia no banco e a tela não o lia.

É o **R-50 visto do outro lado**: lá o estado faltava no banco e a tela nunca era exercitada; aqui o estado está no banco e a tela não pergunta por ele. Nos dois casos o resultado é o mesmo — uma tela inteira que nenhum instrumento mediu, porque nenhum instrumento conseguia chegar nela.

**Consertado:** um trabalho que já tem EPUB abre direto na tela de pronto.

O sinal é o EPUB e não o `status`: é ele que sustenta o nome do arquivo, o tamanho e o download que a tela oferece. Um trabalho com status de convertido e sem EPUB cairia numa tela que promete um arquivo que não existe.

**UMA CORREÇÃO A ESTE PRÓPRIO ITEM.** A primeira versão dele afirmava um segundo defeito que **não existe**: que `epub_path` não chegava ao navegador e que o nome do arquivo na tela lia um campo inexistente. Perguntei à API depois, e a resposta de `/analyze/{id}` traz `epub_path`, `epub_url` e `epub_bytes` — os três.

O que tinha falhado no meu primeiro teste era a **sessão**: pedi o trabalho `1182`, que é de outra pessoa da bancada, a rota respondeu 404 e a tela nunca carregou o trabalho. Eu li a tela vazia como campo ausente, e escrevi um item sobre isso.

**O erro é da mesma família que este arquivo já registra**: conclusão sobre AUSÊNCIA tirada de um instrumento que não conseguia achar. Inferi de um `grep` parcial no schema em vez de perguntar ao servidor — e a resposta estava a um `curl` de distância.

Fica `epub_url` no código porque é o que a tela consome: o caminho público, o mesmo do download. O `epub_path` é absoluto no disco do servidor.
**Prova:** `node scripts/provas.mjs r53`

### R-54 · 2026-09-05 · fechado
**Erik:** (não é dele — irmão do R-53, achado ao conferir a terceira tela do Preparo)
**Onde:** /preparo/:id · `web/src/jornadas/Preparo.jsx` · `backend/app/api/jobs.py`
**Medido em 05/09:** `preparando` tem a mesma falha que o `feito` tinha: **é estado de sessão**. Quem fecha a aba durante a conversão e volta ao mesmo endereço vê a **proposta**, com "Preparar com recomendações" clicável — enquanto o servidor já está convertendo aquele arquivo.

**O custo é maior que no R-53.** Lá a pessoa só perdia a notícia de que terminou. Aqui ela pode mandar converter de novo o que já está sendo convertido.

**Escrevi o conserto e ele não funciona, e isso também está medido.** `active_operation` é o campo que diria que há operação em curso, e ele **chega ao navegador** — conferido por `curl`. Mas o `analisar(id)` que abre a tela **dispara** a análise, e disparar limpa o campo: a mesma resposta que traz `convert:teste` pelo `curl` traz `null` para a página, porque a página perguntou depois de disparar.

    curl → active_operation = 'convert:teste'
    página → active_operation = null

A saída passa por perguntar a **situação** antes de disparar a análise — `/jobs/{id}/status`, que é o que o `acompanhar` já usa —, e isso mexe na ordem do carregamento desta tela. **Removi o ramo que escrevi:** um caminho que promete e não cumpre é pior que a ausência dele, e fica um comentário no lugar dizendo por quê.

**A bancada também não produz o estado**, e essa é a terceira vez: não há trabalho com `active_operation` semeado, então a tela de "em andamento" (`895:8029`, `967:31833`) continua sem conferência contra o nó. Marquei um à mão para medir e desfiz depois — a bancada está limpa.
**Prova:** `node scripts/provas.mjs r54`

**Fechado em 06/09.** A saída era a que estava escrita aqui: perguntar a
SITUAÇÃO antes de disparar. `buscar()` agora começa por `situacao(id)` —
`GET /jobs/{id}/status`, que só lê — e, se a resposta diz `trabalhando` com
etapa `convertendo`, vai direto para a tela de espera e acompanha dali. Os
dados do arquivo vêm de `trabalho(id)` (`GET /jobs/{id}`, "retorna todos os
dados de um job sem re-executar a análise") e não de `analisar(id)`, que
dispararia uma análise por cima de uma conversão em curso.

**A bancada aprendeu a semear o caso.** Ela nunca teve um trabalho em conversão
— o conversor de teste falha na hora, e a tela só existia por meio segundo
depois de um clique. `scripts/_sessao.py <banco> <email> convertendo [id]`
escreve `conversion_status = 'converting'`, e `parado` desfaz; a prova desfaz
sempre, num `finally`, porque a bancada tem UMA pessoa por rodada e deixar o
trabalho em conversão faria a prova seguinte medir outra tela sem saber por quê.

**Prova `r54`**, com controle negativo nos dois sentidos: limpa passa,
envenenada (escondendo `.preparo-andando`) devolve *"uma conversao em curso nao
abre na tela de espera: ela volta para a proposta"*. Ela também verifica o custo
do defeito, e não só o sintoma: que "Preparar com recomendações" não fique
clicável por cima de uma conversão em curso.


### R-55 · 2026-09-05 · fechado
**Erik:** (não é dele — é da BANCADA, e o defeito acabou sendo do INSTRUMENTO)
**Onde:** `scripts/medir.mjs` · /canvas
**Medido em 05/09:** a captura do Canvas saía **vazia**, com "Nada aqui ainda", e eu escrevi um item inteiro dizendo que a bancada não entregava notas para a pessoa da sessão.

**Ela entrega.** O `semear.py` cria três nós de canvas por pessoa e diz isso na saída — *"semeado: 7 trabalhos, 22 notas, 3 no Canvas"* —, a API devolve os três em `/canvas/superficie`, e a medida os encontra no DOM: visíveis, opacidade 1, dentro da vista, com o texto certo. **Medido por nove segundos seguidos: três notas o tempo todo, e nenhum recado de vazio.**

**A FOTO É QUE MENTIA.** O `medir.mjs` capturava com `captureBeyondViewport: true` para pegar a página inteira, e isso redimensiona a área de composição por baixo. Numa página que só empilha conteúdo, tudo bem. **No Canvas, não:** ele desenha em função do tamanho da janela, e a captura estendida devolvia a tela vazia meio segundo depois de a medida ter visto três notas.

**Consertado:** `--vista` captura só a janela, sem estender. Com ele o Canvas fotografa as três notas, as ligações entre elas e o preview de link.

**O que este item custou, e é a lição:** eu vi uma foto, escrevi um item de bancada, e a bancada estava certa. Foi a **quarta vez no dia** que confundi "não consegui ver" com "não existe" — e a única em que o instrumento errado era o meu próprio. As três anteriores (R-50, R-53, R-54) tinham defeito real por trás; esta não tinha nenhum.
**Prova:** `node scripts/captura-nao-mente.mjs`

### R-55-nota · o texto original deste item, mantido
**O que eu tinha escrito, e estava errado:** que o banco tinha "763 nós de canvas e 5502 notas, todos de pessoas de rodadas anteriores" e que por isso o Canvas não podia ser conferido. Os números eram reais; a conclusão, não — a pessoa da sessão TEM os seus três nós, e o `sessao-de-prova.sh` chama o semeador que os cria. Fica registrado porque o erro de leitura é mais instrutivo que o conserto.

