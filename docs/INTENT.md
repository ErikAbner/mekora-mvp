# O Intent, e o que ele resolveria aqui

Escrito em 04/09 a pedido do Erik, que recebeu uma análise de fora recomendando
adotá-lo e reduzir o escopo do Project OS. **Nada foi adotado.** Isto é leitura,
não plano.

## O que ele é

Uma central que organiza agentes de programação: cria espaço isolado por tarefa
(branch ou worktree), um Coordinator escreve especificação com critério de
aceitação, o Erik aprova, implementadores executam, um Verifier confere antes
do merge.

## Onde eu discordo da análise que ele recebeu

A análise diz que o Intent ataca isto:

> não lê feedback · não compara tela · não abre Figma · implementa · você aponta
> o erro · corrige só aquilo

Os quatro primeiros são reais e foram exatamente as queixas do Erik. Mas **os
quatro já foram resolvidos aqui, em 04/09, por medida e não por processo**:

| a queixa | o que passou a impedir |
|---|---|
| não lê feedback | `docs/REJEITADO.md` — o feedback tem casa, e fechar exige prova |
| não compara tela | `scripts/quadro.mjs` — não conferir é VERMELHO, não é silêncio |
| não abre Figma | a comparação é por dado de nó, e a ausência dela reprova |
| corrige só aquilo | a prova cobra a CLASSE; o R-45 virou cinco emissores, não um |

E aqui está o ponto que a análise não faz: **nenhum defeito real de hoje teria
sido pego por orquestração.**

- as varreduras de rota viam 1 de 124 — pego por medir o andador
- 77 caminhos apontando para a pasta antiga — pego por conferir o disco
- o corte que raspava a perna do "p" — pego por medir tinta contra caixa
- dois ícones idênticos byte a byte — pego por renderizar e olhar
- quatro seletores meus errados — pegos por perguntar se o zero era real

Nenhum é falha de coordenação. Todos são falha de MEDIDA. Orquestração sobre
medida fraca dá erro organizado, que é mais caro que erro desorganizado porque
parece processo.

## Onde ele ajudaria de verdade, e isso é honesto

Duas dores de hoje são exatamente as dele:

**Duas sessões, uma árvore.** Renomeei uma classe e a prova da outra sessão
ficou vermelha sobre uma tela certa. E o trabalho dela ficou uma hora sem
commit enquanto eu editava os mesmos arquivos. Worktree por tarefa resolve as
duas.

**Quem verifica.** Hoje quem implementa também escreve a prova. Funciona porque
a prova exige controle negativo nos dois sentidos — mas é o mesmo par de olhos.
Um Verifier separado é melhoria de verdade, não teatro.

## Recomendação

**Não agora.** Três razões, em ordem de peso:

1. A fila do lançamento tem 33 itens abertos e 49 telas por conferir. Trocar a
   forma de trabalhar no meio disso troca trabalho por preparação de trabalho.
2. É a mesma regra que o Erik aplicou aos componentes: *"com o produto nem
   funcionando direito seria adicionar contexto pra ser mexido apenas
   posteriormente"*. Vale igual aqui.
3. O teste controlado que a análise propõe — uma feature real, medindo
   qualidade, intervenções, créditos e tempo — é o método certo. Depois do
   lançamento, com uma feature nova, não com o Mekora inteiro.

**O que eu faria antes de considerar o Intent:** worktree por sessão. Resolve a
dor de hoje, custa um comando, e não pede que ninguém aprenda nada.
