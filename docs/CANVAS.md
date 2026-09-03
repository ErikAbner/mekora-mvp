# O Canvas — diagnóstico, decisões e o que fica de fora

Escrito em 02/09/2026, a pedido do Erik, antes de mexer na estrutura. Ele pediu
opinião de produto e não uma lista de tarefas: o que segue diz o que eu confirmo,
o que eu recuso, e por quê.

Tudo que está marcado como **medido** foi medido no produto rodando, por CDP, e o
número está aqui.

---

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

## O que continua fraco, sem enfeitar

- **Sem feedback de estado na área.** Ela não diz quando está sob o ponteiro, nem
  quem vai junto se você soltar. É o próximo passo do Grupo.
- **Sem seleção, sem desfazer, sem Livros.** Os três estão recomendados acima e
  nenhum foi feito.
- **Sem detalhe por zoom.** A 25% a superfície continua ilegível.
- **O ícone de "criar seção" ainda é o alfinete**, que não desenha uma seção.
  Depende de o arquivo de design estar na aba da frente no Figma.
- **A malha só encosta a Seção**, não as notas, e não há guias de alinhamento
  entre objetos.
- **Nada disso foi testado com dedo de verdade** — os gestos são medidos por CDP,
  que é mouse. Toque e trackpad continuam sem prova.
