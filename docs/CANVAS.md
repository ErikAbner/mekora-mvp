# O Canvas — estado atual, e como se chegou nele

Este arquivo foi escrito em camadas, ao longo de 02–03/09/2026, e as camadas
**discordam entre si de propósito**: cada uma registra o que era verdade quando
foi escrita. Um modelo de posse foi medido e reprovado, outro tomou o lugar; o
Grupo foi diagnosticado, defendido, recusado e removido — tudo aqui dentro.

**A regra de leitura é uma só:**

> **O [Estado atual](#estado-atual) manda. Todo o resto é registro histórico**,
> preservado porque explica POR QUE o modelo atual é assim — e não porque
> descreve o que o código faz hoje.

Seções superadas trazem um aviso no começo. Não confie em nenhum parágrafo deste
arquivo que esteja abaixo de um aviso desses para saber o que existe hoje.

Tudo que está marcado como **medido** foi medido no produto rodando, por CDP, e o
número está aqui.

---

## Estado atual

**Vigente em 03/09/2026, commit `78a7aac`.** É a única descrição autoritativa do
Canvas neste repositório. Conferido contra o código, não contra a memória.

### O modelo

| decisão | o que vale hoje | onde vive |
|---|---|---|
| **Escolha** | estado **temporário**, nunca persistido. Chaves compostas — `nota:12`, `secao:3`, `livro:7`, `liga:9` | `escolha` em `Canvas.jsx`; nada no banco |
| **Seção** | **único primitivo organizacional persistente** do produto | `Secao` em `Canvas.jsx`, `canvas_grupos` no banco |
| **Grupo** | **fora do produto.** Não existe como conceito, nem na tela nem no vocabulário do código | removido em `94ebd4b` |
| **Pertencimento** | **explícito — Modelo E.** A geometria acende a candidata; o **gesto** decide; `grupo_id` guarda | `grupo_id` em `canvas_nos` e `canvas_livros` |
| **Esticar** | **não muda pertencimento.** Cobrir um objeto com a área não o adota; só soltar dentro adota | `esticar`, `membrosDe` |
| **Aninhamento** | impossível por construção: Seção não tem `grupo_id` | — |
| **Livros** | objetos de primeira classe na superfície, **por referência**: tirar apaga a posição, não o livro | `Livro`, `canvas_livros`, `POST /canvas/livros` |
| **Ligações** | **pontas polimórficas** (`de_tipo`/`para_tipo`). Nota↔nota e nota↔livro. A ligação é **objeto escolhível** (`liga:`) | `ligacoes`, `POST /canvas/ligacoes` |
| **Desfazer/refazer** | **por operação**, registrado no **confirmar** — um arrasto de cem quadros é um passo. Criar também desfaz | `usarHistoria.js`, `criarComHistoria` |
| **Roteador de gesto** | fonte única de precedência, na **fase de captura**. Objeto novo implementa comportamento; não decide precedência | `rotearGesto`, `onPointerDownCapture` |
| **Deslocar** | temporário por **Espaço** apertado ou botão do meio, resolvido antes de qualquer alvo | `espacoRef`, `querDeslocar` |
| **Zoom semântico** | três níveis: `tudo` ≥ 0,6 · `menos` ≥ 0,35 · `silhueta` abaixo. Capa e marca de cor são as últimas a sumir | `detalheDoZoom` |
| **Câmera** | guardada em `sessionStorage`, chave `mekora-canvas-camera`. Voltar da leitura volta ao mesmo lugar, e uma aba nova nasce limpa | `ONDE_EU_ESTAVA` |

### A ordem de precedência do gesto

Quem decide o que o ponteiro significa é o **estado da entrada**, e não o alvo
embaixo dele.

| ordem | quem | quando |
|---|---|---|
| 1 | **gesto em curso** | uma vez começado, ele termina — a posse é estável pela vida do gesto |
| 2 | **deslocar temporário** | Espaço apertado, ou botão do meio, no `pointerdown` — resolvido na **fase de captura**, antes de qualquer alvo |
| 3 | **esticar** | ponteiro na moldura de 10px do objeto |
| 4 | **ligar** | ponteiro numa pega de borda |
| 5 | **mover objeto** | ponteiro no corpo do objeto |
| 6 | **laço** | ponteiro no vazio |
| 7 | **chão** | o que sobrou |

### O que existe para navegar e agir

- **Enquadrar tudo** (`⌘1`) e **enquadrar a escolha** (`⌘2`, e botão na barra).
- **Procurar na superfície** (`⌘F`) — sem acento, sobre notas, livros e seções.
  É **navegação**, não busca: ela leva a vista até o objeto.
- **Guias de alinhamento** entre objetos, com ímã, e elas **ganham da malha**
  quando as duas discordam. Valem para qualquer tipo, num objeto por vez:
  arrastar vários ou esticar não alinha. Ao soltar, **todo** objeto encosta na
  malha de 24.
- **Doca** — três entradas de criação, todas globais e frequentes: **nova nota**,
  mídia, trazer da estante. Duplo toque no vazio continua como atalho.
- **Barra da escolha** — o único lugar das ações sobre vários: criar seção,
  duplicar, organizar (a partir de três notas), as ações da seção quando ela é a
  única escolhida (renomear/nomear, ajustar ao conteúdo, dissolver), tirar,
  enquadrar, largar.
- **Copiar, colar e duplicar**, com desfazer.
- Cartões no idioma **Editorial Utility**: raio pelo token (`var(--radius, 0)`),
  filete fino; só a pega de ligação é redonda.

### O nome legado, declarado

A tabela `canvas_grupos` e as rotas `/canvas/grupos` **ficam com o nome antigo**,
de propósito: renomear é migração de verdade (SQLite recria a tabela, duas outras
apontam para ela) e o ganho para quem usa o produto é zero. O vocabulário que uma
pessoa lê — na tela e no código do Canvas — é **seção**. Isto é um nome antigo no
disco, e não uma segunda arquitetura.

### O que continua fraco

- **Objeto visualmente dentro sem ser membro** fica idêntico a um que é, quando
  parado. O hover responde nos dois sentidos; a fraqueza é do repouso.
- **Refazer uma seção apagada a recria com id novo.**
- **`pointerleave` saindo do Canvas** não foi provado limpar as marcas.
- **Nada foi testado com dedo de verdade** — os gestos são medidos por CDP, que é
  mouse. Toque e trackpad continuam sem prova.
- **Os cenários de uso longo foram julgados, não vividos**: nenhum Estudo real
  atravessou semanas dentro deste modelo.

---

# Registro histórico

**Daqui para baixo é como se chegou ao estado acima.** Nada nesta parte descreve
o código de hoje sem que o Estado atual concorde.

---

> **Investigação histórica — 02/09/2026, antes de mexer na estrutura.** O
> diagnóstico A–G abaixo descreve o Canvas COMO ELE ERA. As oito lacunas que ele
> nomeia — contenção, faixa de pegada, seleção, desfazer, livro, zoom, câmera e
> desempenho — foram todas fechadas depois, e o contêiner duplo (Grupo × Seção)
> virou um só. Leia como motivação, nunca como estado.

## A. Os problemas que eu confirmo

### 1. A área não levava o que estava dentro dela — *consertado hoje*

**Medido:** arrastar o grupo 144px deixou a nota de dentro parada em `0`.

Um retângulo que desliza por baixo do próprio conteúdo não é um contêiner; é um
desenho. Este é o defeito de fundo por trás de "mover grupo é ruim", e nenhuma
curva de animação o consertaria. Foi o primeiro a sair.

### 2. Só uma faixa de 30px arrastava a área — *consertado hoje*

**Medido:** `faixa_de_pegada_px: 30`, e `pointer-events: none` no corpo.

Mover um retângulo de 480×320 exigindo acertar 30px dele é o que fazia o gesto
parecer duro. A rigidez não estava no movimento: estava no alvo.

### 3. Não existe seleção — **este é o buraco principal**

O Canvas não tem noção de "isto está selecionado". Nenhuma. E é dela que
dependem, todas de uma vez:

- mover três coisas juntas;
- apagar duas;
- criar uma seção a partir do que está escolhido;
- qualquer ação contextual sobre mais de um objeto;
- teclado.

Enquanto não houver seleção, cada uma dessas vira um caso especial. É a lacuna
que segura as outras.

### 4. Não existe desfazer

Mover, esticar, ligar e tirar são todos definitivos. Só o "Organizar" tem volta,
e ele tem porque eu me recusei a mexer em trinta objetos sem ela. A ausência
aparece no comportamento: dá medo mexer, e medo de mexer num canvas é o defeito
mais caro que ele pode ter.

### 5. Livro não existe no Canvas

O Erik chamou de esquecimento e é isso mesmo. Ver a seção E.

### 6. O zoom não simplifica nada

**Medido:** 123 cartões = 1744 nós no DOM, todos desenhados igual em qualquer
zoom.

A 25% o texto de 20px é ilegível e continua ocupando exatamente o mesmo espaço,
custando exatamente o mesmo. A superfície vira um campo de retângulos brancos
iguais — a densidade cresce e a informação não.

### 7. O contexto se perde ao sair e voltar

A câmera nasce em `{x: 0, y: 0, escala: 1}` toda vez. Abrir um livro e voltar
joga a pessoa de volta na origem do plano, que pode estar a mil pixels do que ela
estava olhando.

### 8. A ponta do desempenho era real — *consertado hoje*

**Medido, com 123 cartões:** pior quadro de um arrasto **66,6ms → 17,4ms** depois
de memoizar a nota. Quatro quadros perdidos de uma vez viraram nenhum.

A mediana já era 16,7ms (60fps) antes e depois. O problema nunca foi a média: era
o engasgo, e engasgo em arrasto é o que faz a superfície parecer barata.

---

## B. Diagnóstico do Grupo

**Não é animação.** Foi a primeira coisa que descartei, e vale registrar porque a
pergunta veio nesta ordem.

| suspeito | veredito |
|---|---|
| rastreamento do ponteiro | **inocente** — medido 1:1, dedo 120/60, nota 120/60 |
| latência percebida | **inocente** — mediana em 16,7ms |
| interpolação / curva | **inocente** — não há transição no gesto, de propósito |
| biblioteca de arrasto | não há uma; é ponteiro cru |
| **contenção** | **culpado** — a área não levava nada |
| **hitbox** | **culpado** — 30px de 320 |
| **arquitetura de estado** | **cúmplice** — sem seleção, tudo é caso especial |
| renderização | **cúmplice** — sem `memo`, um arrasto redesenhava 123 cartões |

O que sobrou de verdade depois dos consertos: **não há feedback de estado**. A
área não diz quando está sob o ponteiro, não diz quando está pegando alguém, e
não diz quem vai junto se você largar. Isso é o próximo passo, e é feedback — não
enfeite.

---

## C. Diagnóstico das Seções

**A pergunta do Erik é a certa, e a resposta hoje é: não, não há motivo para
criar uma.** Mas a causa é pior do que ele imagina.

**No código, Seção e Grupo são a MESMA COISA.** Existe uma entidade,
`GrupoCanvas`. O botão do dock diz "Criar uma seção" e cria um Grupo. O produto
tem um conceito com dois nomes — que é o pior dos dois mundos: a confusão de ter
dois, sem o poder de ter dois.

O papel mais forte que a Seção pode ter não é visual nem semântico. É este:

> **A Seção é a unidade que se move, se recolhe e se leva junto.**

Ou seja: ela ganha razão de existir no momento em que carregar a Seção carrega o
conteúdo — que passou a ser verdade hoje — e no momento em que ela puder ser
recolhida. Antes disso, ela é mesmo um retângulo, e a pessoa está certa em
ignorá-la.

---

## D. Grupo × Seção — recomendação forte

**Um conceito só. Chama-se Seção. "Grupo" sai do produto.**

A distinção proposta — *Grupo: estes objetos se comportam juntos / Seção: estes
objetos pertencem à mesma área conceitual* — não sobrevive numa superfície
espacial. Nela, "pertencer à mesma área" **é** "estar no mesmo lugar", e um
contêiner que segura os dois já os faz se comportarem juntos. A distinção existe
no Figma porque lá o Frame recorta, restringe e faz layout; o Grupo não faz nada
disso. No Mekora não há nenhuma dessas diferenças para sustentar duas coisas.

E há o custo que o próprio Erik nomeou no item 20: dois contêineres com
affordances quase idênticas obrigam a **decidir qual criar** antes de saber o que
se está fazendo. Isso é trabalho administrativo puro.

**Onde "se comportam juntos" é necessário, a resposta é SELEÇÃO — que é temporária
e não precisa ser persistida.** Mover cinco coisas juntas não deveria exigir criar
um objeto no banco. Essa é a troca: sai um conceito persistente, entra um estado
efêmero, e a pessoa deixa de arquivar para conseguir agir.

---

## E. Livros no Canvas

**Sim, nativo — e por referência, nunca por cópia.**

O modelo já faz isso certo em outro lugar: `NoCanvas` guarda `nota_id` e a nota
continua sendo da estante. Livro segue o mesmo: o cartão no Canvas é uma
**referência ao livro que já existe**, e tirar da superfície apaga uma linha de
posição — não o livro.

As três remoções precisam ser distintas e ditas com todas as letras:

| ação | o que some |
|---|---|
| tirar do Canvas | a posição na superfície |
| tirar do Estudo | o vínculo com aquele Estudo |
| apagar o livro | o arquivo, na Estante |

Só a terceira é destrutiva, e ela **não pertence ao Canvas**.

**Representação:** capa + título + autor. O livro tem que continuar parecendo um
livro — a capa é a única coisa que se reconhece a 25% de zoom, e é justamente o
que os cartões de texto não têm. Isso torna o Livro o primeiro objeto que
*justifica* níveis de detalhe por zoom.

**Onde guardar:** `canvas_livros(pessoa_id, job_id, x, y, largura)`, espelhando
`canvas_nos`. Eu considerei generalizar para `canvas_itens(tipo, ref_id)` agora e
**recusei**: polimorfismo com dois tipos é abstração antes da segunda dor. Se
aparecer um terceiro tipo — Output é o candidato —, aí sim vale a migração, e ela
será pequena porque as duas tabelas já terão o mesmo formato.

---

## F. Estudo → solto → aglomerados → Seções → síntese → Output

**Aceito como modelo mental. Recuso como estrutura obrigatória.**

A descrição está certa sobre como pesquisa acontece de verdade: ninguém sabe as
categorias antes de ter o material. E o princípio que o Erik tirou dela —
**criar primeiro, organizar depois** — é o melhor parágrafo do pedido inteiro.
Ele deve governar tudo.

O que eu recuso é transformar isso em etapas no produto: estágios, promoções,
"avançar para síntese". Isso é a burocracia que o item 20 proíbe, escrita com
outro nome. A pessoa saberia que estava na etapa errada e pararia de pensar para
arrumar a etiqueta.

**A forma certa de o produto sustentar esse modelo é não cobrar nada no começo e
tornar barato estruturar depois.** Concretamente: seleção → "criar seção disto",
num gesto. É a diferença entre o modelo estar no produto e o modelo estar no
caminho.

---

## G. Classificação de cada ideia

### Recomendado agora

| ideia | por quê |
|---|---|
| **Seleção (uma, várias, laço no vazio)** | destrava seis coisas de uma vez; é a lacuna raiz |
| **Desfazer / refazer** | medo de mexer é o defeito mais caro de um canvas |
| **Livros no Canvas** | recurso central do Estudo, ausente |
| **Um contêiner só (Seção)** | ver D |
| **Criar Seção a partir da seleção** | é o "organizar depois" em um gesto |
| **Detalhe por zoom** | 1744 nós iguais a 25% não informam nada |
| **Guardar a câmera ao sair** | voltar para a origem do plano é perder o lugar |

### Recomendado depois

| ideia | por quê depois |
|---|---|
| Recolher Seção | precisa de contenção estável primeiro — que só existe desde hoje |
| Foco / isolar | zoom-na-seleção resolve 80% disso por muito menos |
| Descrição na Seção | barato, mas sem valor antes de as Seções serem usadas |
| Proveniência Livro → nota → síntese | o dado já existe (`fonte`, `job_id`); falta a leitura visual |

### Precisa de validação

| ideia | o que validar |
|---|---|
| Seções semânticas (Pesquisa, Fontes, Síntese…) | **como rótulo opcional, nunca como tipo.** Tipo obriga a classificar antes de saber; rótulo é um nome que a pessoa escolheu. Só o uso real diz se os nomes se repetem o suficiente para virar sugestão |
| Output como entidade | ver abaixo |

Sobre **Output**: minha inclinação é que ele é conceito de **Estudo**, não de
Canvas. O Canvas é onde se pensa; o Estudo é o que se tem. Um "marcar como
Output" dentro do Canvas cria uma hierarquia nova (objeto normal × objeto
especial) para resolver um problema que uma referência no Estudo resolve sem
hierarquia nenhuma. Mas não tenho confiança suficiente para decidir sozinho — e
esta é uma pergunta que só se responde com um Estudo de verdade terminado.

### Recusado

| ideia | por quê |
|---|---|
| **Seções aninhadas** | com contenção geométrica, aninhar já acontece de graça e sem estrutura. Persistir uma hierarquia reintroduz duas verdades — dentro na tela, fora na tabela — que é exatamente o que o modelo atual evita de propósito |
| **Grupo dentro de Seção** | consequência do de cima, e some junto com o Grupo |
| **"Desenhar Seção em volta do conteúdo, com inclusão automática"** | **não é recurso: já é o modelo.** Quem está dentro é quem está por cima. Não há nada a construir |
| **Detectar aglomerados e sugerir Seção** | resolve o problema errado agora. Antes de a Seção ser útil, sugerir Seção é sugerir trabalho |
| **Organizador automático / IA** | o próprio pedido põe as ressalvas certas; elas somam a "não agora" |

---

## O que isto expõe do sistema de design

O Erik pediu (item 26) para não contornar regra ruim em silêncio.

**`text-box-trim: trim-both`, ligado globalmente.** Ele foi uma escolha dele —
"caixa abraça as letras, como no Figma" — e está certa. Mas ela tem uma
consequência que ninguém escreveu: **com a caixa aparada, todo espaço entre duas
linhas é só o que a regra declara.** Não sobra meia entrelinha para disfarçar um
valor curto.

Isso já cobrou duas vezes: o título da Ajuda encostando no campo de busca, e o
título de cada item do Preparo colado na explicação (`margin: 0 0 4px` lia como
zero).

**Correção proposta:** é global, e é de documentação, não de código — valores de
espaçamento herdados de desenhos sem trim precisam ser reconferidos, não
copiados. Está anotado aqui e no `DESIGN-SYSTEM.md`.

---

---

## O que foi construído em 02/09, e o que cada coisa provou

> **Diário de construção.** As capacidades continuam existindo, e algumas
> mudaram depois: o desfazer passou a cobrir também **criar, duplicar, colar e
> ligar**, e a posse deixou de ser geométrica. As medidas de desempenho desta
> seção foram tiradas no **servidor de desenvolvimento** e por isso não valem —
> ver "A passada de convergência", no fim do arquivo.

A ordem foi a que o Erik aprovou: **Escolha → Desfazer → Livros → Seção da
escolha → Detalhe por zoom.** Cada camada foi medida, e a medida está aqui.

### A escolha

| gesto | resultado |
|---|---|
| clicar | 1 escolhido |
| shift-clicar | 2 |
| cmd-clicar | 3 |
| shift de novo no mesmo | 2 — tirou |
| `Esc` | 0 |
| clicar no vazio | 0 |
| laço no vazio | 3 notas + 1 seção, barra dizendo "4 escolhidos" |
| arrastar um de dois | **os dois andaram 120** |
| `Delete` | tira da superfície, sem apagar |

Ela guarda **chaves compostas** — `nota:12`, `secao:3`, `livro:7`. Foi essa
decisão que fez o Livro entrar depois sem tocar em nada.

O laço ocupou o gesto que ficou vago quando o deslocamento saiu do clique
simples. Numa superfície espacial, arrastar no vazio é *selecionar*.

### O desfazer

Por operação, no **confirmar** — nunca durante a previsão. Um arrasto de cem
quadros é um passo. Cobre mover, mover vários, esticar, mover uma seção com o
que ela leva, tirar, e criar seção.

**Limite conhecido:** desfazer uma seção apagada a recria com **id novo**. A nota
não tem esse problema — o que se recria é a posição dela, e a nota é a mesma.
Para a seção, um refazer encadeado depois disso não encontra a antiga.

### Os livros

Referência, nunca cópia. `canvas_livros` guarda `job_id`.

| prova | resultado |
|---|---|
| trazer | 201 |
| trazer o mesmo de novo | `ja_estava: true`, **sem duplicar entidade** |
| cartão resolvido | título, autor e capa |
| tirar da superfície | 0 na superfície |
| **continua na estante** | **6** |
| livro + nota escolhidos | "2 escolhidos" |
| arrastar o livro | **os dois andaram 120** |
| `⌘Z` | os dois voltaram — "Desfeito: 2 movidos" |

O que mudou no sistema para o Livro caber: **uma linha em `filhosDe` e uma função
`moverChave`**. Nada mais. É a prova de que escolha e contenção não sabem que
tipos existem.

### A seção a partir da escolha

Escolher, apertar, pronto — nenhum passo de configuração. Com escolha mista de
duas notas e um livro: 1 → 2 seções, abraçando os escolhidos, escolha limpa,
`⌘Z` desfaz.

Ela **não mexe em nada**: nenhum objeto é movido nem reparentado. A seção pousa
em volta do que já estava lá.

### O detalhe por distância

| zoom | nível | texto | rodapé | marca de cor | capa do livro |
|---|---|---|---|---|---|
| 100% | tudo | ✓ | ✓ | ✓ | ✓ |
| 50% | menos | ✓ | — | ✓ | ✓ |
| 25% | silhueta | — | — | **✓** | **✓** |

A diferença entre os tipos é a última coisa a sumir. É ela que permite achar algo
num plano cheio.

### Desempenho, com 123 cartões

| momento | mediana | p90 | pior |
|---|---|---|---|
| antes de tudo | 16,7ms | 17,3ms | 66,6ms |
| depois do `memo` | 16,7ms | 17,2ms | 17,4ms *(corrida sortuda)* |
| com escolha, sem `ref` | 16,7ms | 17,5ms | **83,9ms** — regressão |
| hoje | 16,7ms | 17,6ms | 50,1ms |

**Duas coisas honestas sobre estes números.** A primeira: o 17,4ms foi uma
corrida que não se repete — medindo três vezes, o valor se firma perto de 50–67ms.
A segunda, e mais importante: **o pior quadro é o 54 de 58 — o SOLTAR, e não o
arrastar.** Durante o gesto a mediana é 16,7ms. O engasgo está no fim, quando o
objeto já está onde deveria.

A regressão para 83,9ms teve causa achada e consertada: `seguirArrasto` tinha
`escolha` e `nos` nas dependências, trocava de identidade a cada escolha, e
quebrava o `memo` das 123 notas de uma vez — no `pointerdown`, que é justamente o
quadro em que a mão espera resposta. Os dois passaram a chegar por `ref`.

---

## As duas perguntas que o Erik mandou validar antes de apagar o Grupo

> **Superado.** As duas foram respondidas: a posse passou a ser **explícita**
> (Modelo E), o que resolve a pergunta 2 sem depender de geometria, e o Grupo foi
> removido em `94ebd4b`. O parágrafo abaixo — "o Grupo não foi apagado" — era
> verdade quando foi escrito, e não é mais.

**Elas continuam abertas, e de propósito.** O Grupo não foi apagado, nenhuma
migração destrutiva foi feita, e a recomendação final só vem depois de rodar
cenários de uso de verdade. O que já dá para dizer:

**1. Seleção temporária × relação persistente.** A escolha resolve "estes se
comportam juntos agora". Ela **não** resolve "isto continua acoplado amanhã" —
imagem + nota de interpretação, citação + anotação. Hoje a única resposta para
isso é uma Seção, e uma Seção nomeada em volta de dois objetos pode mesmo ser
burocracia. Fica aberto.

**2. Geometria não é necessariamente pertencimento.** Os casos ambíguos que o
Erik listou **não foram testados** — duas seções sobrepostas, objeto maior que a
seção, redimensionar por cima de objetos, mover objeto entre seções sobrepostas.
O que o código faz hoje: **o CENTRO do objeto decide**, e a lista de quem vai
junto é lida **uma vez, no começo do gesto** (senão a área ia catando gente pelo
caminho). Isso já responde a alguns dos casos, mas não a todos, e não foi provado.

---

## A regra de contenção, escrita com precisão

> **Superado — este é o Modelo G, que foi reprovado.** A regra do CENTRO e a
> fotografia no `pointerdown` descrevem a **posse geométrica**, que os cenários
> abaixo derrubaram. Hoje a posse é **explícita** (`grupo_id`): a geometria só
> sugere, e o gesto decide. Mover uma seção leva **os membros**, e não quem está
> por cima.

O Erik pediu isto antes dos testes, e com razão: sem a regra escrita, os cenários
não têm o que julgar.

**Mover uma Seção**

1. No `pointerdown`, calcula-se quais objetos têm o **centro** dentro da caixa da
   Seção. Centro, e não interseção: exigir o objeto inteiro dentro deixaria de
   fora todo cartão que encosta na borda, e é ali que as pessoas encostam.
2. Esse conjunto é **fotografado**.
3. Seção e fotografia andam juntas.
4. **A pertinência não é recalculada durante o gesto.** Sem isso, a área iria
   catando objetos pelo caminho ao passar por cima deles.
5. Ao soltar, cada um vai ao servidor com o mesmo passo. Nada é reparentado: não
   existe pertencimento persistido.

**Seções não contêm Seções.** `filhosDe` só olha notas e livros.

**O laço** usa a mesma função com uma diferença: ele pega por **interseção**, e
não por centro. Cercar tudo com folga seria um gesto grande demais.

---

## Os oito cenários — o que foi medido

> **Histórico — medido sob a posse geométrica.** Os defeitos que estes cenários
> acharam (dois donos, conteúdo arrancado da seção de dentro, adoção silenciosa
> ao esticar) foram o que motivou a troca de modelo. **Nenhum deles se reproduz
> hoje**: sem geometria decidindo posse, não há dono ambíguo, e esticar não
> adota.

### 3 · Sobreposição parcial · **a regra do centro se sustenta**

Movendo a Seção A 120px:

| objeto | centro | andou |
|---|---|---|
| só a ponta entra | fora | **0** |
| centro fora por pouco | fora | **0** |
| bem dentro | dentro | **120** |

A regra é previsível. **O que ela não dá é visibilidade**: em repouso, nada diz
quem está dentro. O feedback novo cobre o momento do arrasto — não o repouso.

### 4 · Seções sobrepostas · **defeito confirmado**

Objeto no meio da sobreposição de A e B:

- movi A → **ele andou com A** (+120)
- movi B → **ele andou com B** (+128)

**Ele pertence às duas.** Arrastar qualquer uma o leva. É previsível num sentido
estreito — "a área que você pegou leva o que está nela" — mas o objeto tem dois
donos e nada na tela diz isso.

### 5 · Seção crescendo por cima de objetos · **adoção silenciosa**

1. Objeto fora de A.
2. Estiquei A até cobri-lo → o centro dele passou a estar dentro.
3. **No gesto seguinte, ele veio junto (+96).**

O modelo é coerente consigo mesmo — a fotografia é tirada no começo de *cada*
gesto. Mas **nada acontece no momento do redimensionamento**: a adoção é
silenciosa, e só se descobre na próxima vez que a área for movida.

### 6 · Objeto atravessando uma Seção · **coerente**

Nada é persistido. Durante o arrasto, a seção que o receberia acende; ao soltar,
só a posição mudou. O modelo e o que se vê batem.

### 7 · Seção dentro de Seção · **o achado mais forte**

Seção C inteiramente dentro da Seção A. Movi A:

- **C não andou** (ficou em x=100) — seções são excluídas da pertinência
- **uma nota que estava dentro de C andou** (+120), porque o centro dela está
  dentro de A

Resultado: **A andou, o conteúdo de C saiu de C, e o retângulo de C ficou.** A
caixa fica; o que estava nela vai embora.

**Aninhamento visual NÃO vem de graça.** Ele produz um estado incoerente, e
ninguém precisou pedir aninhamento para chegar nele — basta desenhar uma área
dentro da outra.

---

## O conserto que a evidência pede

> **Superado, e nunca implementado — de propósito.** A regra da **menor Seção**
> era o conserto do modelo geométrico. Ela ficou sem objeto quando a posse passou
> a ser explícita: com `grupo_id`, cada objeto tem **um dono declarado**, e não
> há empate a desempatar. Se um agente futuro encontrar esta seção, ela **não é
> trabalho pendente**.

Os cenários 4 e 7 são **a mesma pergunta**: quando duas áreas cobrem o mesmo
ponto, de quem é o objeto?

Uma regra resolve os dois:

> **A menor Seção que contém o centro do objeto é a dona dele.**

- Sobreposição: o objeto fica com a área mais apertada, que é a mais específica.
- Aninhamento: a nota dentro de C é de C, e não de A. Mover A deixa de arrancar o
  conteúdo de C — e, por consequência, mover A deveria levar C inteira, que é o
  que se vê.

**Isto ainda não foi implementado.** Está recomendado, não feito.

---

## A recomendação: **A — só a Seção**

> **Versão intermediária, superada pela [recomendação final](#a-recomendação-final-a--só-a-seção)
> mais abaixo.** A conclusão é a mesma; a base mudou. Aqui ela ainda se apoiava
> na regra da menor Seção, que não foi feita.

Com duas condições, e uma ressalva honesta.

### Por que não B (Seção + Grupo leve)

O cenário 1 — imagem + nota de interpretação, que devem continuar acopladas
amanhã — é o caso que justificaria o Grupo. E ele tem uma resposta melhor:

**Acoplamento mecânico invisível é uma armadilha.** Se dois objetos andam juntos
e não há nada na tela dizendo por quê, a pessoa arrasta um, o outro se mexe, e
ela não tem como descobrir a causa nem como desfazer o vínculo. Um Grupo sem
região visível é exatamente o comportamento surpreendente que o resto deste
documento passou o dia removendo.

A área visível não é o custo do acoplamento: **é a explicação dele.**

### As duas condições

1. **A regra da menor Seção**, acima. Sem ela, A herda os defeitos 4 e 7.
2. **Seção sem nome precisa ser QUIETA.** É a única coisa verdadeira que o
   cenário 1 expõe: uma área em volta de dois objetos hoje desenha filete, faixa
   de título e "Desfazer grupo" — burocracia visual para uma composição de dois.
   Uma seção sem nome deveria ser quase invisível em repouso, e aparecer no
   gesto. Isso é presença visual, não um conceito novo.

### Como cada opção se sai

| | A — só Seção | B — Seção + Grupo | C — um primitivo, dois modos |
|---|---|---|---|
| clareza conceitual | **alta**: uma coisa | baixa: decidir qual antes de saber | média: dois nomes, uma tabela |
| custo de interação | um gesto | escolher entre dois | idem B |
| complexidade | menor | dois ciclos de vida | um modelo, dois desenhos |
| geometria ambígua | resolvida pela regra da menor | Grupo escaparia dela por não ter geometria | idem A |
| Livros / Artefatos futuros | entram pela cena, sem saber de nada | dois contêineres a ensinar | idem A |
| descoberta | "cerque e crie" | Grupo é invisível — não se descobre | idem |

### A ressalva

**Isto vem de geometria medida e de raciocínio, não de uso ao longo de sessões.**
Os cenários 1, 2 e 8 pedem semanas de trabalho real, e nenhum deles foi vivido —
foram julgados. A decisão é do Erik, e o Grupo continua no lugar.

---

## Desempenho, por fase, com 123 objetos

Perfil isolado, três corridas:

| fase | mediana | pior |
|---|---|---|
| `pointerdown` | 16,7ms | 16,7–18,5ms |
| **quadro 0 do arrasto** | — | **29–44ms** |
| resto do arrasto | 16,7ms | ≤ 18,7ms |
| soltar (síncrono) | — | **1,3ms** |
| arrastar três | 16,7ms | 17,5–18,8ms |
| laço | 16,7ms | 33–34ms |

Contra o início desta rodada: quadro 0 em **83ms**, picos de até **55ms** no meio
do gesto, três tarefas longas por arrasto. O corpo do gesto agora fica inteiro em
60fps.

**Um número que eu não consegui atribuir.** Numa bateria por fases, o arrasto de
UM cartão aparece com pior quadro de 50 a 83ms, enquanto o de TRÊS aparece com
18 — e os dois fazem o mesmo caminho. O perfil isolado não reproduz. Fica aberto
em vez de explicado errado: já errei a atribuição deste pico uma vez.

---

# Os dois modelos de posse, medidos

> **A comparação que decidiu a arquitetura. O Modelo E venceu e está no código;
> o Modelo G é histórico.** Esta é a seção histórica mais útil do arquivo: ela
> explica por que o pertencimento é uma coluna, e não uma conta de geometria.

## Modelo G — posse geométrica

*A menor Seção que contém o centro é a dona, recalculada a cada gesto.*

**O que ele acerta**
- Nada a manter: desenhar uma área em volta das coisas já organiza.
- Nenhuma migração, nenhum estado novo.
- "Criar seção em volta do conteúdo" não é recurso — é o modelo.

**Onde ele falha — medido**

| cenário | o que aconteceu |
|---|---|
| seções sobrepostas | o objeto do meio **andou com as duas** |
| seção dentro de seção | **A andou, o conteúdo de C saiu de C, e C ficou** |
| esticar por cima | adotou em silêncio, sem gesto nenhum |

E o defeito de fundo, que o desempate não resolve: **a relação muda sem que
ninguém a tenha mudado.** Determinístico não é o mesmo que compreensível.

## Modelo E — posse explícita, sugerida pela geometria

*A geometria acende a candidata; o gesto decide; `grupo_id` guarda.*

**O que ele acerta — medido**

| prova | resultado |
|---|---|
| criar seção da escolha | os 2 escolhidos viraram **membros** |
| esticar por cima de um terceiro | membros continuaram **2** — e o terceiro está **visualmente dentro** |
| mover a seção | andaram **só os membros**; o não-membro visualmente dentro ficou |
| soltar dentro | **virou membro** |
| soltar fora | **saiu** |
| `⌘Z` | devolveu **o vínculo**, e não só a posição |
| aninhamento | impossível por construção — Seção não tem `grupo_id` |

**O que ele cobra**
- Uma conversão de dados, sem a qual toda organização existente morre em
  silêncio. Feita — e medida antes: a seção andava 140 e a nota de dentro andava
  0.
- Uma semente que mentia teve de ser corrigida.
- **Uma fraqueza nova**: um objeto pode estar visualmente dentro sem ser membro,
  e parado ele fica idêntico a um que é.

Essa última se paga com feedback, e por isso ele foi construído nos **dois
sentidos**: passar sobre um membro acende a área; passar sobre a área marca quem
é dela. Medido: 1 e 2 membros marcados, seção revelada, marcas limpas ao trocar.

---

# A recomendação final: **A — só a Seção**

> **Aceita e executada.** A remoção do Grupo aconteceu em `94ebd4b`. O parágrafo
> "O Grupo continua no lugar", no fim desta seção, é o estado de **antes** da
> execução.

O que mudou desde a última vez não é a conclusão, é a **base dela**. Antes eu
recomendava A com um modelo de contenção que os cenários tinham reprovado. Agora
A vem com posse explícita, e ela sustenta o que o Grupo existiria para fazer.

## Como cada opção se sai

| | **A — só Seção** | B — Seção + Grupo | C — um primitivo, dois modos | D — outro |
|---|---|---|---|---|
| clareza conceitual | **alta** — uma coisa, dois trajes | baixa — decidir qual antes de saber | média — dois nomes, uma tabela | — |
| custo de interação | um gesto: cercar e criar | escolher entre dois toda vez | idem B | — |
| persistência | `grupo_id`, um nível | dois ciclos de vida | um, com modo | — |
| geometria ambígua | **resolvida** — só o gesto muda posse | Grupo escaparia por não ter geometria | idem A | — |
| escala | membro é uma coluna indexada | duas relações a conciliar | idem A | — |
| Livros, Artefatos, Outputs | entram pela cena sem saber de nada | dois contêineres a ensinar | idem A | — |
| descoberta | cercar e criar; hover explica | **Grupo é invisível — não se descobre** | idem | — |

## Os três casos que o Grupo existiria para resolver, e o que aconteceu

**Composição pequena e persistente** — imagem + nota de interpretação. Hoje:
escolher os dois, um botão, e eles são membros de uma seção **sem nome, quieta**
— filete rarefeito, sem faixa de título, sem controles parados. Passar por cima
revela. É o Grupo, com uma diferença: **dá para ver que existe.**

**Área conceitual maior** — dar nome promove a mesma seção. Nenhum tipo novo.

**Acoplamento sem área visível** — este o Grupo faria e a Seção não faz. E é
justamente o que eu recuso: **acoplamento mecânico invisível é uma armadilha.**
Se dois objetos andam juntos e nada explica por quê, a pessoa não descobre a
causa nem desfaz o vínculo. A área visível não é o custo do acoplamento — é a
explicação dele. E agora ela é barata: quieta parada, clara quando perguntada.

## A ressalva, que continua de pé

**Os cenários 1, 2 e 8 foram medidos como mecânica, não vividos como trabalho.**
Nenhum Estudo real atravessou sessões dentro deste modelo. O que os testes
provam é que o mecanismo faz o que diz; não que ele é agradável de usar por
semanas.

**O Grupo continua no lugar.** Nada foi apagado, nenhuma migração destrutiva
aconteceu, e a decisão de removê-lo é do Erik.

---

# O plano de remoção do Grupo — escrito antes de executar

> **Executado em `94ebd4b`.** O plano está aqui como está — inclusive o tempo
> futuro — porque ele registra a decisão de **manter o nome legado no disco**,
> que continua valendo. O que ele previa está no Estado atual.

## O achado que decide tudo: não há dois modelos

Levantei o que existe antes de planejar, e o resultado muda a natureza do
trabalho:

**Existe UMA entidade.** `GrupoCanvas`, tabela `canvas_grupos`. A tela já a chama
de **seção** em 61 lugares; "grupo" sobrevive em **um** `aria-label` e no
vocabulário interno do código.

Ou seja: **não há Grupo para migrar.** Não há registros de um tipo a converter em
outro, não há duas árvores de renderização, não há dois caminhos de contenção. O
que existe é um nome morto sobre a coisa certa.

Isso torna a remoção **sem risco de dados** — e é por isso que ela pode acontecer
nesta passagem em vez de virar um projeto.

## O que muda, e o que não muda

| camada | decisão |
|---|---|
| dados | **nada muda.** Nenhuma linha é lida, escrita ou apagada |
| tabela `canvas_grupos` | **fica com o nome** — ver abaixo |
| rotas `/canvas/grupos` | **ficam** — mesma razão |
| vocabulário do código | **renomeado** para seção |
| strings de tela | **renomeadas** |
| classes de CSS | **renomeadas** |

### Por que a tabela e as rotas ficam

Renomear `canvas_grupos` é uma migração de verdade: no SQLite a tabela é
recriada, e duas outras tabelas apontam para ela com chave estrangeira. O
benefício para quem usa o produto é **zero** — ninguém vê o nome de uma tabela.

Trocar risco real por nenhum ganho não é consolidação, é arrumação. As duas ficam
com o nome legado, **documentado aqui como legado**, e o vocabulário que uma
pessoa lê — na tela e no código do Canvas — passa a ser um só.

Isso não deixa "duas arquiteturas para compatibilidade": deixa **um nome antigo
no disco**, que é outra coisa.

## Recuperação

Não há migração de dados, logo não há o que reverter. O passo é reversível por
`git revert` como qualquer mudança de código.

## O que a remoção precisa provar

1. Nenhum Estudo existente perde organização — **medido antes e depois**.
2. Membros continuam andando juntos.
3. Seção sem nome continua quieta.
4. Desfazer/refazer continuam.
5. Livros continuam membros.
6. Ligações intactas.
7. Nenhum objeto salta de lugar.

---

## O roteador de gesto — a ordem de precedência

> **Vigente, e a tabela mora no [Estado atual](#a-ordem-de-precedência-do-gesto).**
> Ela não é repetida aqui para não haver duas versões da mesma ordem.

Fonte única. Objeto novo **não** decide precedência por conta própria: ele
implementa comportamento, e a precedência é resolvida antes dele.

**A regra que sustenta a ordem**: quem decide o que o ponteiro significa é o
ESTADO DA ENTRADA, e não o alvo embaixo dele. Foi invertê-la que causou o defeito
do espaço.

## O que continua fraco, sem enfeitar

> **Lista de 02/09 — quase toda fechada, e por isso histórica.** Foram resolvidos
> depois: o feedback nos dois sentidos (passar sobre um membro acende a área,
> passar sobre a área marca quem é dela), o pico do soltar (era o servidor de
> desenvolvimento), os casos ambíguos de contenção (medidos, e derrubaram o
> modelo geométrico), as guias de alinhamento com ímã, e o ícone da seção.
> **O que continua fraco de verdade está no [Estado atual](#o-que-continua-fraco)** —
> esta lista fica como registro do que era.

- **Sem feedback de estado na área.** Ela não diz quando está sob o ponteiro, nem
  quem vai junto se você soltar. É o próximo passo do Grupo.
- **O pior quadro do soltar continua em 50ms**, com 123 objetos. É o `setNos`
  otimista mais o recálculo dos traços, e não foi atacado.
- **Os casos ambíguos de contenção não foram testados.** Ver acima.
- **Refazer uma seção apagada a recria com id novo.**
- **Objeto visualmente dentro sem ser membro** é a fraqueza que a posse explícita
  cria. O hover responde, mas parado os dois são idênticos.
- **O pico de 50–83ms no arrasto de UM cartão continua sem causa reproduzida.**
  Há instrumentação (`window.__canvas`) para quando ele voltar.
- **`pointerleave` saindo do Canvas** não foi provado limpar as marcas — o teste
  sintético não dispara o evento do React. Mover o ponteiro para o chão limpa.
- **Os cenários 1, 2 e 8 foram julgados, não vividos.**
- **Não há guias de alinhamento** entre objetos, e a malha só encosta a Seção.
- **O ícone de "criar seção" ainda é o alfinete**, que não desenha uma seção.
  Depende de o arquivo de design estar na aba da frente no Figma.
- **A malha só encosta a Seção**, não as notas, e não há guias de alinhamento
  entre objetos.
- **Nada disso foi testado com dedo de verdade** — os gestos são medidos por CDP,
  que é mouse. Toque e trackpad continuam sem prova.

---

# A passada de convergência — o que foi medido no fim

> **Vigente.** É o registro de medida mais recente do Canvas (03/09/2026,
> `78a7aac`), e o único cujos números foram tirados contra o **build**. Onde
> outra seção deste arquivo der um número de desempenho diferente, vale este.

## O pico de 50–83ms era o servidor de desenvolvimento

O arrasto de um cartão com 123 objetos produzia, de forma reprodutível, **uma
tarefa longa de 66–84ms por gesto** — 5 corridas em 5. A causa não estava no
Canvas: estava no instrumento.

Em `vite` o React roda em StrictMode e o corpo do componente desenha **duas
vezes**, sobre um pacote não minificado. O mesmo gesto, no build servido por
`vite preview`:

| onde | tarefas longas por arrasto | pior quadro |
|---|---|---|
| `:5180` — servidor de desenvolvimento | 1 (66–84ms) | 83,4ms |
| `:5181` — build | 0 | 18,5ms |

A separação foi feita com Event Timing e mouse de verdade, que dá o único corte
honesto entre trabalho e apresentação:

| evento | manipulador | apresentação |
|---|---|---|
| `pointerdown` (dev) | 42,7ms | 42,8ms |
| `pointerup` (dev) | 95,2ms | 32,3ms |
| `pointerdown` (build) | 2,5ms | 67,3ms |
| `pointerup` (build) | 11,7ms | 36,0ms |

**Veredito: não se reproduz no build.** O instrumento foi provado vermelho com
um bloqueio plantado de 120ms, que apareceu como tarefa longa de 121ms.

## A bancada, com 119 objetos e 1806 nós

`scripts/bancada/` — cena e fases. Todas as fases, no build:

    arrastar nota      mediana 16,7   p90 17,4   pior 18,6   2 desenhos
    arrastar livro     mediana 16,7   p90 18,1   pior 18,6   2 desenhos
    arrastar secao     mediana 16,7   p90 16,9   pior 18,6   2 desenhos
    arrastar tres      mediana 16,7   p90 17,9   pior 18,6   2 desenhos
    puxar fio          mediana 16,7   p90 18,1   pior 18,5  32 desenhos
    laco               mediana 16,7   p90 18,3   pior 18,5  31 desenhos
    espaco deslocando  mediana 16,7   p90 16,8   pior 18,7  30 desenhos
    busca              mediana 16,7   p90 17,8   pior 17,9   5 desenhos
    zoom por degraus   mediana 16,7   p90 16,8   pior 18,3  10 desenhos

Nenhuma tarefa longa em nenhuma fase.

Os três gestos de arrastar custam **2 desenhos por gesto inteiro**: a pintura é
imperativa e o React só entra no commit. Laço, deslocamento e fio desenham por
quadro porque o que muda ali É estado da superfície — o retângulo do laço, a
câmera, a ponta do fio.

## Os dois defeitos que a bancada encontrou

**Apertar o que já está escolhido derrubava a escolha.** `escolher` só
preservava a escolha de tamanho 1. Com três cartões escolhidos, apertar um deles
para arrastar o grupo devolvia `new Set([chave])`: o gesto "mover estes três"
virava "mover este". Reduzir a um passou a ser gesto de **clique** —
`pointerup` sem arrasto —, em `escolherSozinho`.

**`animation: canvas-entra 200ms both` vencia o estilo inline, para sempre.** O
modo `both` mantém o último quadro aplicado depois que a animação acaba, e
animação ganha de `style`. Como o quadro final é `transform: scale(1)`, todo
cartão que `pintarArrasto` movia por `transform` ficava parado: o valor inline
chegava, o computado voltava a `matrix(1,0,0,1,0,0)`. Só o cartão sob o dedo
escapava, porque `.movendo` desliga a animação.

Medido nos dois sentidos, com os três membros de uma seção:

| modo | andaram durante o gesto | andaram no total |
|---|---|---|
| `both` | 0, 0, 0 | 156, 156, 156 |
| `backwards` | 144, 144, 144 | 156, 156, 156 |

Com `both`, o conteúdo de uma seção ficava parado e **teletransportava ao
soltar** — a mesma leitura de defeito que o Erik já tinha apontado nas linhas.

**Dissolver pela faixa da seção não era desfazível.** O botão chamava
`aoDissolverSecao` direto, pulando `dissolver`, que é quem registra o passo e
revincula os membros. A porta mais óbvia da ação mais destrutiva era a que não
voltava.

## A jornada de 31 passos

`scripts/bancada/jornada.js` — 31 passos verdes, três corridas seguidas, contra
o build. Cada passo afirma o EFEITO, e não a ausência de erro: contagens antes e
depois, `grupo_id` no servidor, posição dos companheiros, nome gravado.

O que ela **não** alcança: confirmar o nome de uma seção. `blur` só acontece
depois de um foco de verdade, e `dispatchEvent` não dá foco. O caminho inteiro
— clicar, digitar, Enter, gravar — está provado à parte com `--gesto` e a nova
flag `--teclas`, que digita por `Input.dispatchKeyEvent`.

## As guardas de dono, provadas nos dois sentidos

`backend/tests/test_canvas.py`, onze casos. As quatro guardas — ponta de ligação
nota, ponta livro, seção de outra pessoa, livro de outra pessoa — foram
afrouxadas uma a uma, e o teste correspondente ficou vermelho nas quatro.

## A matriz de desfazer, e os cinco buracos que ela achou

O §32 pedia cobertura de desfazer para toda mutação tocada nesta passada.
`scripts/bancada/desfazer.js` executa cada operação, desfaz, e lê o SERVIDOR —
não a tela. A primeira corrida:

| operação | desfazia? |
|---|---|
| mover, esticar, mover vários | sim |
| tirar nota, tirar livro | sim |
| criar seção, sair de uma seção | sim |
| **criar nota** | **não** |
| **duplicar** | **não** |
| **criar ligação** | **não** |
| **colar** | **não** |
| **trocar de seção (A → B)** | **não** |

As quatro primeiras eram a mesma falta: **criar não registrava nada**. `⌘Z`
depois de criar não fazia coisa alguma, e era o único lugar da superfície onde a
pessoa não podia mudar de ideia. A saída foi `criarComHistoria(rotulo, criar)`:
`criar` devolve o que nasceu em chaves, desfazer apaga essas chaves, e refazer
roda `criar` de novo **reescrevendo a lista** — o que nasce da segunda vez tem
ids novos, e sem reescrever um segundo `⌘Z` tentaria apagar ids que já não
existem. Duplicar uma seção com cinco notas dentro continua sendo **um** passo.

`usarCanvas.trazer` passou a devolver o nó criado em vez de `true`, e
`usarCanvas.ligar` devolve `{id, ja_existia}`. O `ja_existia` importa: a rota é
idempotente, e sem essa conferência puxar um fio entre duas notas JÁ ligadas
registraria um passo, e o `⌘Z` seguinte apagaria uma ligação antiga que ninguém
tocou.

A quinta era outra coisa, e o rastro de rede a nomeou:

    PATCH nos/16821 {"x":560,"y":300,"largura":375,"grupo_id":1756} [404]

Desfazer devolve o vínculo de antes — e "antes" pode ser uma seção **dissolvida
depois**. O servidor recusa `grupo_id` de seção dissolvida, e a recusa vem como
404 do PATCH inteiro: o desfazer perdia também a POSIÇÃO, porque é uma chamada
só. Agora o passo confere, na hora de voltar, se a seção ainda existe; se não,
a coisa volta para onde estava, solta.

**Essa conferência mora em `registrarMovimento`, e não em `moverChave`.** Posta
em `moverChave`, ela também pegava a seção RECÉM-CRIADA — que existe no servidor
e ainda não entrou na lista do desenho — e "Criar seção" passou a nascer sem
membro nenhum. A jornada mediu na corrida seguinte: 0 membros onde ela espera 2.
No passo da história a conferência olha só para o passado, que é o único lugar
onde uma seção pode ter deixado de existir.

Doze de doze desfazem.
