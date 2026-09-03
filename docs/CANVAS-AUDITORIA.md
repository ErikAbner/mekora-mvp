# Auditoria do Canvas — capacidades, gestos, barra, ícones e teclado

Escrita em 03/09/2026, antes de implementar. O Erik pediu o inventário primeiro,
e a razão é boa: o Canvas hoje é tecnicamente forte e funcionalmente incompleto,
e as duas coisas se confundem quando se olha só para o que funciona.

O que está marcado **medido** foi medido no produto rodando. O resto é leitura de
código e julgamento, e está dito qual é qual.

O filtro de tudo que segue: **ler → pensar → conectar → organizar → sintetizar.**
Recurso que não serve a isso não entra, por mais que um canvas "normalmente"
tenha.

---

## 1 · Matriz de capacidades

| capacidade | estado | nota |
|---|---|---|
| **Criar** | | |
| nota escrita | **existe, escondida** | só duplo toque no vazio; nada na tela diz isso |
| mídia por endereço | completa | folha própria, com prévia |
| foto | completa | WebP, EXIF descartado |
| livro | completa | folha "Trazer para a superfície" |
| seção vazia | completa | dock |
| seção da escolha | completa | barra da escolha |
| ligação | **existe, limitada** | só entre notas — **livro não liga** |
| **Escolha** | | |
| clique / shift / cmd | completa | medido |
| laço | completa | agnóstico de tipo, medido |
| entre tipos | completa | nota + livro + seção no mesmo laço |
| `⌘A` | **ausente** | ver §6 — não recomendo |
| **Transformar** | | |
| mover | completa | 1:1, medido |
| mover vários | completa | medido |
| esticar | **existe, limitada** | só nota, e só pelas laterais. **Livro não estica** |
| duplicar | **ausente** | ver §6 |
| tirar | completa | menu, `Delete`, barra |
| copiar/colar | **ausente** | semântica indefinida |
| ordem de pilha | **ausente** | não julgo necessário |
| alinhar / distribuir | **ausente** | ver §5 |
| encostar na malha | **existe, limitada** | só a seção encosta; cartão não |
| **Organizar** | | |
| criar seção da escolha | completa | um gesto, medido |
| entrar / sair de seção | completa | soltar dentro / fora, medido |
| transferir entre seções | **não testado** | A → B nunca foi provado |
| renomear seção | **existe, escondida** | clicar no nome, sem affordance |
| desfazer seção | completa | "Desfazer grupo" — **rótulo errado**, ver §4 |
| ajustar área ao conteúdo | **ausente** | pedido explicitamente |
| ver membros | completa | passar sobre a área |
| **Relações** | | |
| criar ligação | completa | pegas nas bordas, e lista pelo teclado |
| desfazer ligação | completa | junta na linha, sob o ponteiro |
| escolher uma ligação | **ausente** | não é objeto escolhível |
| reconectar | **ausente** | é preciso desfazer e refazer |
| significado da ligação | **ausente** | ver §8 |
| livro participa | **ausente** | **lacuna real** |
| **Navegar** | | |
| zoom | completa | botões + pinça, ancorados |
| deslocar | completa | espaço, botão do meio, dois dedos |
| detalhe por distância | completa | três níveis, medido |
| enquadrar tudo | **ausente** | lacuna real em superfície grande |
| enquadrar a escolha | **ausente** | idem |
| voltar da leitura no mesmo lugar | **ausente** | a câmera nasce na origem |
| buscar na superfície | **ausente** | ver §9 |
| **História** | | |
| desfazer / refazer | completa | por operação, medido |
| nome do passo | completa | "Desfeito: cartão movido" |
| identidade preservada | completa | seção volta com o mesmo id |

---

## 2 · As dez lacunas que mais custam, por impacto

Ordenadas por quanto atrapalham quem usa, e não por quanto custam para fazer.

1. **Voltar da leitura cai na origem do plano.** Abrir um livro e voltar joga a
   pessoa a mil pixels do que ela estava olhando. É a lacuna que mais quebra o
   fluxo *ler → pensar*, porque é exatamente a ida e volta que o produto pede.
2. **Não há "enquadrar tudo".** Depois de deslocar longe, não existe caminho de
   volta senão arrastar até achar. Numa superfície sem fim, isso é ficar perdido.
3. **Livro não pode ser ligado.** O livro é a ORIGEM das notas, e o produto não
   deixa dizer isso na superfície. Fere `conectar` diretamente.
4. **Escrever uma nota é invisível.** O gesto existe (duplo toque) e nada o
   anuncia. A ação mais frequente de todas depende de adivinhação.
5. **"Desfazer grupo" mente.** Ele apaga a seção, não o vínculo — e "grupo" nem é
   mais a palavra do produto.
6. **Livro não estica.** Uma capa fixa em 280px numa superfície onde tudo mais é
   redimensionável.
7. **Renomear a seção não tem affordance.** O nome é clicável e nada diz isso.
8. **Não há "ajustar a área ao conteúdo".** Depois de mover membros, a área fica
   frouxa ou apertada, e arrumar é manual.
9. **Ligação não é objeto.** Não dá para escolher, nem reconectar — só desfazer e
   refazer.
10. **Não há duplicar.** `⌘D` é reflexo em desktop, e hoje não faz nada.

---

## 3 · Auditoria de gestos

| gesto | dono | estado |
|---|---|---|
| espaço + arrasto | **roteador, na captura** | **consertado hoje** — medido sobre vazio, nota, livro, seção e pega |
| botão do meio | roteador | mesmo caminho |
| arrasto no vazio | laço | ✓ |
| arrasto no cartão | o cartão | ✓ |
| arrasto na borda do cartão | esticar | ✓ |
| arrasto na pega | fio | ✓ |
| arrasto no miolo da seção | a seção | ✓ |
| arrasto na borda da seção | esticar | ✓ |
| roda | deslocar | ✓ |
| ctrl/cmd + roda | zoom no ponteiro | ✓ |

**A arquitetura mudou, e é o que importa.** Antes cada objeto decidia sozinho e
parava o evento na origem; o chão nunca via o gesto. Agora:

```
estado da entrada → escolher o dono → executar → só então o alvo
```

O roteador mora na **fase de captura**, que desce do mundo até o alvo. Ele roda
antes de qualquer `pointerdown` de objeto.

**A posse é estável pela vida do gesto** — medido: soltar o espaço no meio manteve
o deslocamento, e nada se moveu no plano.

**Conflitos que restam:** nenhum encontrado. A pega de ligação fica no meio da
borda que estica, e ali a pega ganha — é deliberado e está documentado.

---

## 4 · Auditoria da barra e das ações

**O que existe hoje**

| lugar | conteúdo | quando aparece |
|---|---|---|
| dock (3) | mídia, organizar, criar seção | sempre |
| barra da escolha | contagem, criar seção, tirar, largar | com algo escolhido |
| menu do cartão | abrir no livro, ligar a…, tirar | sob o ponteiro |
| faixa da seção | nome, "Desfazer grupo" | sempre (com nome) / sob o ponteiro (sem) |
| zoom | +, %, − | sempre |

**Problemas**

- **"Organizar a superfície" fica sempre visível** e é a ação mais rara das três.
  Ela alinha e desencavala; ninguém faz isso toda hora.
- **"Desfazer grupo" está errado em duas frentes**: apaga a seção (não desfaz
  vínculo) e usa a palavra que o produto abandonou. Deveria ser **"Dissolver
  seção"**, e deveria dizer que o conteúdo fica.
- **Nada no dock cria nota**, que é a ação mais frequente.
- **Seção escolhida não tem ações próprias** — a barra mostra as genéricas.

**Arquitetura proposta**

| estado | barra mostra |
|---|---|
| nada escolhido | criar nota · adicionar mídia · trazer · criar seção |
| um objeto | ações do objeto |
| vários | criar seção · tirar · largar |
| seção | renomear · ajustar ao conteúdo · escolher membros · dissolver |
| ligação | desfazer (já existe, na própria linha) |

Classificação das ações: **imediata** (criar, escolher, mover), **contextual**
(criar seção, tirar), **secundária** (organizar, dissolver), **perito** (teclado).

---

## 5 · Auditoria de ícones

Montei uma **folha de contato com as 32 peças da biblioteca** e olhei uma a uma.
Julgar por nome já custou uma rodada nesta casa.

**Corrigidos hoje**

| onde | estava | está | por quê |
|---|---|---|---|
| criar seção | `fixar` | `paginas` | `fixar` desenha uma **bandeirinha** — um marcador, o oposto de um contêiner |
| menu do cartão | `···` de texto | `mais-acoes` | glifo de texto herda fonte e entrelinha, desalinha e muda de tamanho com o tipo |

**Peça acrescentada**: `icone-mais-acoes.svg`. Conferido que faltava nas 32.
Caixa de 24, e a única preenchida da família — um ponto não tem contorno.

**Semântica destrutiva — o achado que importa**

`icone-remover` desenha uma **lixeira**. Ela **não pode** ir para "Tirar da
superfície", que não apaga nada: a nota continua na estante e no caderno. O
rótulo em texto que está lá hoje diz a verdade; a lixeira mentiria. As três
remoções continuam precisando de tratamentos distintos:

| ação | reversível | tratamento |
|---|---|---|
| tirar do Canvas | sim, `⌘Z` | texto, sem alarme |
| dissolver seção | sim, `⌘Z` | texto, sem alarme |
| apagar o livro | não | **não pertence ao Canvas** |

**Consistência**: família uniforme — todas de contorno, mesmo peso, mesma caixa.
Nenhuma mistura de preenchido/contorno, nenhuma biblioteca estranha, nenhum
emoji.

**Um ruído que fica**: `paginas` e `canvas` são quase o mesmo desenho (quatro
peças, cantos retos × arredondados). No dock não colidem com a navegação, mas é
uma semelhança que pode confundir.

**Ícones ausentes que a barra proposta pediria**: enquadrar tudo, enquadrar a
escolha, ajustar ao conteúdo, dissolver. Nenhum existe na biblioteca.

**Zoom**: `+` e `−` são texto, e aqui **não é defeito** — o controle é um passo
numérico com "100%" no meio, e lê como incremento, não como ícone.

**Nos três zooms**: as ações dentro dos cartões somem no nível `silhueta`, o
contorno da escolha é compensado pela escala (2px na tela em qualquer zoom) e o
nome da seção cresce por degrau da escala. Nenhum botão de 5px. Medido.

---

## 6 · Auditoria de teclado

| tecla | hoje | recomendação |
|---|---|---|
| `Delete` / `Backspace` | tira o escolhido | manter |
| `Esc` | larga a escolha | manter |
| `⌘Z` / `⌘⇧Z` | desfaz / refaz | manter |
| espaço | deslocar | manter |
| `⌘C` / `⌘V` | — | **depois** — semântica indefinida |
| `⌘D` | — | **próxima rodada** — reflexo de desktop |
| `⌘A` | — | **recusar** — escolher tudo numa superfície sem fim escolhe o que não se vê |
| setas | — | **depois** |
| `⌘0` / `⌘1` | — | **próxima rodada**, junto de enquadrar |

**Proteção do texto**: medida. `Backspace` num campo não tira nota; espaço num
campo não liga o modo de deslocar. A guarda é uma só, na entrada do tratador.

---

## 7 · Paridade entre objetos

| | nota | livro | mídia | seção | ligação |
|---|---|---|---|---|---|
| clique | ✓ | ✓ | ✓ | ✓ | ✗ |
| laço | ✓ | ✓ | ✓ | ✓ | ✗ |
| arrastar | ✓ | ✓ | ✓ | ✓ | — |
| esticar | ✓ | **✗** | ✓ | ✓ | — |
| tirar | ✓ | ✓ | ✓ | ✓ | ✓ |
| duplicar | ✗ | ✗ | ✗ | ✗ | — |
| teclado | ✓ | ✓ | ✓ | ✓ | ✗ |
| membro de seção | ✓ | ✓ | ✓ | — | — |
| ligar | ✓ | **✗** | ✓ | ✗ | — |
| menu | ✓ | ✓ | ✓ | parcial | ✗ |
| detalhe por zoom | ✓ | ✓ | ✓ | ✓ | ✓ |
| desfazer | ✓ | ✓ | ✓ | ✓ | ✗ |

**Assimetrias justificadas**: seção não é membro de seção (decisão do modelo);
ligação não é objeto espacial.

**Assimetrias que são dívida de implementação, e não semântica**:
- **livro não liga** — e ele é a origem das notas;
- **livro não estica**;
- **ligação não é escolhível nem desfazível pelo teclado**.

---

## 8 · Ligações — o que falta perguntar

A interação melhorou; o **significado** não existe. Hoje uma ligação diz "estas
duas se falam", e nada mais.

- começar: pega na borda ✓
- alvo: soltar sobre a outra ✓
- desfazer: junta sob o ponteiro ✓
- escolher: **não existe**
- reconectar: **não existe**
- livro participar: **não existe** — e é a lacuna com significado
- tipo/rótulo: **não recomendo agora**

A pergunta certa é *o que uma ligação quer dizer no Mekora*, e ela ainda não tem
resposta de produto. Enquanto não tiver, acrescentar tipos seria inventar
vocabulário antes de ter o que dizer.

**Recomendação**: fazer o livro participar (é semântica que já existe — a nota
veio dele) e deixar tipos para quando um Estudo real pedir.

---

## 9 · Navegação em superfície grande

Medido no Estudo de 23 objetos: dá para trabalhar. O que falta aparece quando se
sai do enquadramento.

| recurso | veredito |
|---|---|
| enquadrar tudo | **agora** — é o botão de "estou perdido" |
| enquadrar a escolha | **próxima rodada** |
| voltar da leitura no lugar | **agora** — quebra o fluxo central |
| buscar na superfície | **depois** — o cabeçalho já busca no Mekora inteiro |
| navegador de seções | **depois** |
| minimapa | **recusar** — não porque canvas costuma ter, e sim porque com detalhe por distância o afastar já é o mapa |

---

## 10 · Recomendação

### Consertar agora

| o quê | por quê |
|---|---|
| ~~espaço perdendo o gesto~~ | **feito** |
| ~~ícone da seção e do menu~~ | **feito** |
| ~~aviso de quem vai junto antes de mover~~ | **feito** |
| "Desfazer grupo" → **"Dissolver seção"** | o rótulo mente sobre o que faz |
| **criar nota no dock** | ação mais frequente, hoje invisível |
| **enquadrar tudo** | é o caminho de volta |
| **guardar a câmera ao sair** | quebra o fluxo ler → pensar |
| **livro liga** | paridade com significado |

### Próxima rodada do Canvas

Esticar livro · ajustar área ao conteúdo · escolher os membros de uma seção ·
renomear com affordance · barra contextual por tipo de escolha · `⌘D` ·
enquadrar a escolha.

### Depois

Copiar/colar com semântica definida · colar texto e imagem · buscar na
superfície · navegador de seções · setas movendo o escolhido · reconectar ·
ligação como objeto escolhível.

### Recusar

| o quê | por quê |
|---|---|
| `⌘A` | escolher tudo numa superfície sem fim escolhe o que não se vê |
| minimapa | o afastar com detalhe por distância já é o mapa |
| alinhar e distribuir completo | empurra para trabalho de design, não de pensamento |
| tipos de ligação | vocabulário antes de ter o que dizer |
| ordem de pilha | quem está por cima é quem foi tocado por último, e basta |
| auto-layout, restrições, árvore de camadas | é virar Figma |
