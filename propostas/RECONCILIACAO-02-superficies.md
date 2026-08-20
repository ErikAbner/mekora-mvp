# Reconciliação — segunda leva: Reader, Mobile, Estante e Mesa

**Data:** 2026-08-20
**Estado:** análise apresentada, **nenhuma DEC foi alterada**
**Método:** por assunto, com passagem obrigatória pelas perguntas de `ABERTO.md`

---

## ⚠ Antes de tudo — um erro meu dentro de uma DEC já aceita

A **DEC-0027**, seção *Histórico*, afirma:

> *"Uma captura do artefato publicado de 14/08/2026, às 14h29, mostra `mesa C · workspace` ativo na
> barra de depuração. O run das **17h33 do mesmo dia** registra a recusa da Mesa C. Implementação e
> aprovação estiveram separadas por **três horas**, na mesma tarde."*

**As três horas não existem.** Eu comparei um horário local com um horário UTC.

Verificado: os `created_at` dos runs são UTC, e o fuso da máquina é UTC−3 — o run
`20260820T135528Z` foi gravado às 10h55 locais. Logo:

| horário no id (UTC) | local | o que aconteceu |
|---|---|---|
| `20260814T160313Z` | **13h03** | Mesa C recomendada |
| — | **14h29** | captura mostra `mesa C · workspace` ativo |
| `20260814T173304Z` | **14h33** | Mesa C recusada |

A captura está **1h26 depois da recomendação e 4 minutos antes da recusa.**

**O argumento da DEC-0027 item 9 não enfraquece — fica mais forte.** "Implementação não prova
aprovação" é melhor ilustrado por uma variante que estava rodando na tela **quatro minutos antes de
ser recusada** do que por um intervalo de três horas.

**Proposta:** corrigir o parágrafo do *Histórico* da DEC-0027. É correção factual, não normativa —
não toca a seção Decisão. **Não a executei**, conforme a instrução de não alterar DECs durante a
análise.

---

## Assunto 5 — Reader

### 1. Estado normativo atual

| | |
|---|---|
| **DEC-0016** | a âncora semântica manda no leitor; qualquer implementação futura herda a regra ou a quebra |
| **DEC-0021** | o item persistido é o formato canônico; **não existe PDF paralelo ao EPUB** |
| **DEC-0023** itens 9–12 | os dois modos existem; paginado é padrão para livros textuais; a escolha é lembrada; a decisão não é irreversível |
| **DEC-0024** | Notas é lugar próprio, e dentro do livro é visão filtrada |

### 2. Histórico relevante

| quando | o quê |
|---|---|
| 12/08 | sistema editorial do DOC.cc aplicado à leitura: escala fluida por `clamp` em rem, 87,5% a 125% do tamanho que a pessoa escolheu no navegador |
| 14/08 | painel de leitura ganha escopo — *"o escopo do ajuste mora no painel onde o ajuste acontece, e não em Preferências"*; controles carregam a razão junto |
| 19/08 19h11 | a fita de leitura: *"controle que altera a visualização não mora em folha"* |
| 19/08 19h42 | reader chrome: topo diz onde estou, dock diz o que posso fazer aqui, seleção diz o que posso fazer com este trecho |
| 20/08 | âncora resiliente: citação + antes + depois, resolvendo em cinco degraus, e dizendo quando perde |

### 3. Estado observado

O Reader é o bloco mais especificado do produto. Também é o que carrega mais defeito conhecido:
`Original / Adaptado / Comparar` implementado em `:2663` e `:2676`, e o menu de dentro da leitura
com quatro lugares em `:5359`.

### 4. Convergências

- A escala fluida por `clamp` preserva a preferência de tamanho do navegador — **compatível com a
  paridade de valor da DEC-0023** e com a DEC-0016.
- *"O escopo do ajuste mora no painel onde o ajuste acontece"* sustenta a regra do caderno 02 de
  Preferências ser espelho e não fonte. As duas continuam de pé, e a segunda depende da primeira.
- A regra topo/dock/seleção é aceita do Erik e generaliza para conversão, canvas e leitura.

### 5. Divergências

| | contra |
|---|---|
| `Original / Adaptado / Comparar` (`:2663`, `:2676`) | DEC-0021 itens 5, 6 e 7 |
| menu da leitura com quatro lugares (`:5359`) | DEC-0024 item 1 |

**A avaliação do Original/Adaptado sob a nova realidade:** ele derivava um "original" do texto
adaptado por regra fixa — quebra em 58 colunas, hifenização, fólio a cada 14 linhas. Não era o PDF:
era uma **simulação de PDF**. Com a DEC-0021 tirando o PDF da biblioteca, a feature perde as duas
pernas: não há original persistido para comparar, e o que ela mostrava nunca foi o original. Não é
material a preservar; é drift a remover.

### 6. Evidência de rejeição explícita

Quatro recusas com razão escrita — e **uma reversão declarada**, que é o achado mais interessante
deste assunto:

- **Hambúrguer na leitura**, recusado: *"hambúrguer promete o app inteiro, e saindo da leitura não se
  vai para o app: vai-se para o livro, e essa porta já existia."*
- **Folha para controle que altera visualização**, recusada: *"folha cobre, e cobrir obriga a
  simular."*
- **Barra flutuante de seleção**, eliminada — e com ela sumiram três problemas que só existiam por
  causa dela: compensação de rolagem, limiar medido de sticky e cálculo de coordenada.
- **Paginação**, recusada em 14/08 por honestidade: *"ficou de fora por não dar para simular com
  honestidade neste protótipo. É controle real de leitor."* **Esta recusa foi superada pela DEC-0023
  item 9** — não por mudança de opinião, mas porque a decisão saiu do protótipo e virou norma.

> **A reversão.** Em 19/08: *"REVERSÃO: o menu recolhido entra. Eu o tinha recusado dizendo que
> promete o app inteiro, e ao deletar o nav global deixei a leitura sem porta para Estante ou
> Canvas."*
>
> É recusa desfeita **pela consequência da própria recusa**, com o raciocínio registrado. Vale mais
> que qualquer das quatro acima: mostra que "rejeitado" também tem prazo de validade, e que a razão
> registrada é o que permite reabrir com honestidade.

### 7. Princípio recorrente

```
PRINCÍPIO RECORRENTE — não fingir certeza que não se tem     (4ª ocorrência)
```

19/08: *"Medida de layout que a interface precisa vem medida, nunca chutada. 53px era o certo no
desktop e errado no celular, e o sintoma era a fita cobrindo a barra em que ela se apoia."*

Quarta ocorrência, por caminho independente dos outros três. E é a primeira em que o custo de chutar
aparece medido.

### 8. Resultado

Tudo vigente. Nenhuma DEC anterior se revelou obsoleta.

### 9. Ação normativa proposta

**Nenhuma.**

### 10. Ação posterior

- **DRIFT:** `:2663` e `:2676` — remover Original/Adaptado/Comparar. Contra DEC-0021.
- **DRIFT:** `:5359` — menu da leitura a cinco lugares. Contra DEC-0024.
- **Registrar:** *busca dentro do livro* foi bloqueio declarado duas vezes em 19/08 — *"a única
  feature de referência marcada como obrigatória pela auditoria"* — e apareceu implementada em
  `:4899` em 20/08, **sem run**. É drift na direção contrária: implementado sem registro.

### ↳ Passagem pelo `ABERTO.md`

| | pergunta | resultado |
|---|---|---|
| **B10** | como a escolha de modo de leitura é lembrada | **continua aberta** |
| **D2** | que tipos de conteúdo têm padrão diferente de paginado | **continua aberta** |

**Nova pergunta, e ela nasce de um bloqueio de 19/08 que a DEC-0023 tornou relevante:**

| | pergunta | classe |
|---|---|---|
| **B21** | Auto-ocultar as barras no celular depois de segundos sem interação. O run de 19/08 registra que ficou de fora e que *"precisa de regra para nunca ocultar com campo em foco"*. Com mobile no V1, deixou de ser detalhe de protótipo. | B |
| **D13** | O Sumário continua sendo folha, e folha cobre o texto. O run de 19/08 o nomeia como *"o próximo candidato"* se a tese da fita valer. | D |

---

## Assunto 6 — Mobile

### 1. Estado normativo atual

**DEC-0023** inteira, com doze itens. Mobile no V1; paridade de valor, não de interface; sete
capacidades em todos os aparelhos; Canvas desktop-only; Conexões por outra representação; tablet por
capacidade; os dois modos de leitura.

### 2. Histórico relevante

Quinze media queries de largura reais, quatro blocos `@media(hover:none)`, e o caderno 03 declarando
coluna única abaixo de 900px. Mais o material de 24/07, hoje preservado, com wireframes 390 para três
direções de arquitetura.

E uma medida que vale como prova: *"53px era o certo no desktop e errado no celular"* (19/08).

### 3. Estado observado

`prototipo-mesa.html:6742`: *"Nenhuma dessas telas foi vista no celular ainda."*

O CSS responsivo existe. A verificação não. São coisas diferentes, e a distinção norma/estado
observado da DEC-0027 se aplica em cheio: **o CSS é evidência de intenção, não de conformidade.**

### 4. Convergências

- A regra do container (18/08) — *"layout dimensionado por container se guarda com `@container`,
  nunca com `@media`; a media query olha a janela, e a janela não sabe o tamanho da caixa"* — é
  exatamente o mecanismo que a paridade de valor exige. Uma capacidade que muda de representação por
  espaço disponível, e não por largura de janela, é `@container`.
- A escala fluida por `clamp` em rem já preserva a preferência da pessoa em qualquer largura.

### 5. Divergências

Nenhuma de norma. **A divergência é de verificação:** sete capacidades ganharam 390px como requisito
de V1, e zero foram abertas num telefone.

### 6. Evidência de rejeição explícita

**Nenhuma rejeição.** Isto importa: mobile nunca foi recusado neste projeto. Foi **adiado por
escopo**, e o adiamento caiu quando a DEC-0022 desfez a dependência de sincronização. Tratar o
material de 390 de 24/07 como "rejeitado" seria erro — ele é **abandonado por mudança de direção do
produto**, que é outra coisa.

### 7. Princípio recorrente

Nenhum novo.

### 8. Resultado

Tudo vigente. A pergunta do assunto mudou de natureza: não é mais *"o Mekora terá mobile?"* e sim
*"como cada capacidade já decidida se transforma em 390?"*

### 9. Ação normativa proposta

**Nenhuma.**

### 10. Ação posterior

Sete capacidades a verificar a 390px. É dívida com endereço, não pendência a descobrir.

### ↳ Passagem pelo `ABERTO.md`

| | pergunta | resultado |
|---|---|---|
| **B11** | o tablet, feature a feature | **continua aberta** |
| **B12** | breakpoints além de 390px | **continua aberta** — com evidência nova: a regra `@container` de 18/08 sugere que parte do problema não se resolve por breakpoint |
| **B13** | como os cinco lugares se apresentam no telefone | **continua aberta** |
| **C8** | quando as telas são efetivamente verificadas a 390px | **continua aberta** |
| **B9** | se o Mapa ganha representação no telefone | **continua aberta** |

---

## Assunto 7 — Estante

### 1. Estado normativo atual

| | |
|---|---|
| **DEC-0021** | a Estante guarda **conteúdo persistido**, não arquivo de origem |
| **DEC-0024** | é um dos cinco lugares |
| **DEC-0023** | existe a 390px, como requisito de V1 |
| **DEC-0018** | entra no MVP; não é fase dois |

### 2. Histórico relevante

| quando | o quê |
|---|---|
| 12/08 | telas reconstruídas com o acervo real — 14 capas e 14 lombadas |
| 12/08 | a Estante 3D é declarada experimento, **com a razão medida** |
| 18/08 | o filtro se nomeia: funil vira linha nomeada com contagem derivada |

### 3. Estado observado

Duas vistas, filtro nomeado, coleções, 3D como experimento marcado. E um defeito registrado pela
própria instrumentação: *"o filtro da Estante deixava TXT e XLSX fora da partição"*.

### 4. Convergências

**A mais importante desta leva.** O run de 18/08 decidiu que *"a contagem é derivada na
renderização: um filtro que anuncia um número que não bate é pior que filtro nenhum"*.

Isso é a **quinta ocorrência** do princípio de derivar em vez de gravar, e é o mesmo mecanismo que a
DEC-0021 exige para progresso e para descrição.

### 5. Divergências

**Uma conceitual, e ela é a razão de reconciliar a Estante depois do conteúdo.**

Qualquer versão que trate `PDF`, `EPUB` e `DOCX` como itens permanentes distintos está em conflito
com a DEC-0021. Sob a norma nova, a Estante não é gerenciador de arquivos: ela guarda **conteúdo,
estado, progresso, coleções e notas**. O formato de origem é etapa do pipeline, não atributo
permanente do item.

Se o filtro atual particiona por extensão de origem — e o defeito do TXT e XLSX sugere que sim —
então **a partição inteira está construída sobre uma premissa que a DEC-0021 removeu.** Não é bug de
implementação: é modelo mental antigo sobrevivendo na interface.

**Não verificado:** se o filtro de hoje particiona por formato de origem ou por outra coisa.

### 6. Evidência de rejeição explícita

- **"Ainda não enviados"** ficou fora dos filtros — e a razão é exemplar: *"não existe campo para
  isso no ACERVO. Não foi inventado um."*
- **A Estante 3D** é o melhor caso do lote de "explorado, mantido, e marcado como tal". O caderno 03
  a pôs em adiar com instrução escrita: *"experimento honesto; hoje entrega menos que a lista.
  Manter, MARCAR COMO TAL."* Ela ficou mantida e não ficou marcada — e o commit de 12/08 conserta
  isso pondo o selo `EXP` **no botão**, porque *"marcar depois do clique seria marcar tarde"*.

### 7. Princípio recorrente

```
PRINCÍPIO RECORRENTE — derivar em vez de gravar     (5ª ocorrência)
```

### 8. Resultado

Tudo vigente. **Uma divergência conceitual a investigar** — a partição do filtro.

### 9. Ação normativa proposta

**Nenhuma.** A partição do filtro é implementação, não norma: a DEC-0021 já decide o que a Estante
guarda.

### 10. Ação posterior

- **Verificar** se o filtro particiona por formato de origem. Se sim, é drift contra a DEC-0021.
- **Registrar** o defeito conhecido do TXT e XLSX fora da partição.

### ↳ Passagem pelo `ABERTO.md`

| | pergunta | resultado |
|---|---|---|
| **C9** | migração do acervo e das notas para identidade estável | **tem implementação histórica a auditar** — o schema de 14/08 no Mac tem `livros`, `notas`, `tags`, `livro_tags`; se ele já resolve a migração, não foi verificado |
| **B2** | quais formatos de entrada são aceitos | **continua aberta**, e ganhou urgência: a partição do filtro pode depender dela |

---

## Assunto 8 — Mesa

O assunto mais confuso do lote, como previsto — e o que mais precisa da separação rigorosa.

### 1. Estado normativo atual

**DEC-0019**: uma casa, uma barra; a marca à esquerda volta para a Mesa.
**DEC-0024**: Mesa é um dos cinco lugares.
**DEC-0023** item 4: Mesa existe no telefone.

### 2. Histórico relevante — os cinco estados, separados

Este é o caso que o Erik pediu para tratar com rigor. As categorias **não** são sinônimos:

| | Mesa A | Mesa B | Mesa C | Mesa editorial |
|---|---|---|---|---|
| **explorado** | ✓ | ✓ | ✓ | ✓ |
| **implementado** | ✓ | ✓ | ✓ *(captura de 14h29 prova)* | ✓ |
| **recomendado** | — | — | ✓ *(pelo agente, 13h03)* | — |
| **aprovado pelo Erik** | — | — | **✗ nunca** | não verificado |
| **vigente** | — | — | — | ✓ |
| **rejeitado** | — | — | ✓ *(14h33, com razão)* | — |

**A Mesa C nunca foi aprovada.** Ela foi recomendada por um agente às 13h03, com critério declarado
— *"não foi estético: é se a tela responde as seis perguntas sem rolar"* —, o `next_step` daquele run
dizia *"Erik cicla as quatro composições e escolhe"*, e às 14h33 o **mesmo agente** a recusou:

> *"A Mesa C que eu tinha recomendado era o dashboard que a direção editorial recusa — e a causa não
> era quantidade de informação: era dar o mesmo tratamento visual para categorias diferentes."*

Autorrecusa com razão escrita, 1h26 depois da recomendação.

### 3. Estado observado

A Mesa editorial de quatro níveis — foco, exceção, estado do sistema, biblioteca. Saíram a faixa de
números que lia como KPI, o dropzone permanente, as duas colunas e a seção de recém-prontos.

**Cinco variantes seguem vivas no código atrás de botão de debug.** É o que permitiu a captura de
14h29 existir — e é também o que faria alguém, daqui a três meses, encontrar a Mesa C e concluir que
é a Mesa atual.

### 4. Convergências

Duas decisões da rodada de redução sobrevivem inteiras e valem como regra geral:

- **Tratamento por categoria:** *"conteúdo ganha espaço, tipografia e composição; decisão mostra
  poucas alternativas e uma recomendação; estado do sistema informa em silêncio; exceção chama
  atenção; ferramenta avançada fica escondida até ser pedida."*
- **Copy de doutrina não entra no produto:** *"raciocínio de arquitetura mora no painel de notas;
  dentro do produto é ruído com voz de manual."*

E uma da auditoria de 13h03 que continua valendo: *"nenhum número entra na Mesa sem ajudar a decidir
o que fazer agora. O único com barra é o progresso de leitura, que é real e é do usuário."*

### 5. Divergências

**Uma, e ela é conhecida desde 19/08:** *"ferramenta avançada fica escondida até ser pedida"*
(14/08) contra *"o segundo ato mais comum passa a ficar à vista"* (19/08, reversão declarada com a
razão: *"esconder ação já falhou três vezes na observação do Erik"*).

As duas são regras de tratamento, as duas estão registradas, e a segunda é posterior e explícita.
**Isto é emenda não registrada, não conflito de autoridade** — mas nenhuma das duas é DEC, então não
há o que emendar formalmente. É material para o `PRODUTO.md`, quando ele existir.

### 6. Evidência de rejeição explícita

- **Mesa C** — rejeitada com razão, pelo próprio autor da recomendação.
- **Faixa de números que lia como KPI** — removida.
- **Dropzone permanente de topo** — removido; a Mesa inteira vira área de solta ao arrastar.
- **Seção separada de recém-prontos** — removida; *"aparecem na estante em vez de ganhar seção"*.
- **Alternativa C de arquitetura** (entrada direta em vez de Mesa como Home), 12/08: *"a única
  condição que faria a entrada direta ganhar era uso esporádico, e a resposta 4 a eliminou."*

### 7. Princípio recorrente

Nenhum novo. Mas a Mesa é a melhor **evidência** do princípio da DEC-0027 item 9, e é por isso que a
correção do horário no início deste documento importa.

### 8. Resultado

Tudo vigente. Nenhuma DEC obsoleta.

### 9. Ação normativa proposta

**Correção factual à DEC-0027, seção Histórico** — o intervalo de três horas. Não executada.

### 10. Ação posterior

- **Registrar:** cinco variantes de Mesa vivas atrás de botão de debug. Não é bug — é bancada de
  comparação. Mas precisa de marcação, como a Estante 3D recebeu o selo `EXP`. Sem isso, o próximo
  a encontrar a Mesa C não terá como saber que ela foi recusada.
- **Registrar:** a contradição *esconder × mostrar o segundo ato*, para o `PRODUTO.md`.

### ↳ Passagem pelo `ABERTO.md`

| | pergunta | resultado |
|---|---|---|
| **B14** | se Mesa é um lugar como os outros, ou a casa que a marca abre | **continua aberta, com evidência nova** — a DEC-0019 a trata das duas formas na mesma frase, e o run de 12/08 fechou "a Mesa é a Home". A ambiguidade pode ser deliberada; a pergunta continua sendo se é definição ou descuido |
| **D1** | a ordem dos cinco lugares | **continua aberta** — e a Mesa reforça: se ela é a casa, sua posição na barra não é comparável à dos outros quatro |

---

## Delta de `ABERTO.md`

| | antes | depois |
|---|---|---:|
| **A** — antes da arquitetura | 8 | 8 |
| **B** — antes da feature afetada | 20 | **21** |
| **C** — antes do lançamento | 15 | 15 |
| **D** — backlog técnico | 12 | **13** |
| **Total** | **55** | **57** |

### O que mudou de estado

| | pergunta | de → para |
|---|---|---|
| **C9** | migração do acervo para identidade estável | continua aberta → **tem implementação histórica a auditar** |
| **B12** | breakpoints além de 390px | continua aberta → **continua aberta, com evidência nova** (a regra `@container` de 18/08) |
| **B14** | Mesa é lugar ou casa | continua aberta → **continua aberta, com evidência nova** |

### As duas novas

| | pergunta | por que nasceu |
|---|---|---|
| **B21** | auto-ocultar as barras no celular | bloqueio de 19/08 que a DEC-0023 tornou requisito de V1 |
| **D13** | o Sumário como folha | o run de 19/08 o nomeia como próximo candidato à tese da fita |

### Nenhuma foi respondida, nenhuma ficou obsoleta

**E isso é o resultado correto.** A reconciliação encontrou implementação histórica em dois pontos —
o schema no Mac e a regra `@container` — e em nenhum dos dois promoveu código antigo a resposta. A
regra da leva anterior se manteve: **não reinventar, e também não promover implementação a norma.**

---

## Resumo da leva

| assunto | resultado | ação normativa proposta |
|---|---|---|
| **Reader** | tudo vigente | nenhuma |
| **Mobile** | tudo vigente | nenhuma |
| **Estante** | tudo vigente | nenhuma · **verificar** se o filtro particiona por formato de origem |
| **Mesa** | tudo vigente | **1 correção factual** à DEC-0027, seção Histórico |

**Oito assuntos reconciliados, nenhuma DEC marcada `superseded` ou `revoked`.** O padrão das duas
levas é consistente: enumeração desatualizada, consequência cumprida sem registro, e implementação
divergindo da norma — não autoridade morta.

### Drift acumulado, registrado separadamente

| onde | o quê | contra |
|---|---|---|
| `:2663` `:2676` | Original/Adaptado/Comparar | DEC-0021 |
| `:5359` | menu da leitura com quatro lugares | DEC-0024 |
| `:1858` `:2441` `:2455` | identidade por título | DEC-0021 |
| `:6587` `:6647` `:6652` | microcópia "produto local" | DEC-0022 |
| `:4899` | busca no livro implementada sem run | — *drift de registro, não de norma* |
| Estante | filtro deixa TXT e XLSX fora da partição | defeito conhecido |
| Mesa | cinco variantes vivas sem marcação | — *precisa do selo que a Estante 3D recebeu* |

### Princípios recorrentes — o placar

```
derivar em vez de gravar                5 ocorrências independentes
não fingir certeza que não se tem       4 ocorrências, 2 redescobertas
```

Os dois seguem marcados, sem virar DEC. Reader e Estante produziram uma ocorrência nova cada.
