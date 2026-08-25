# DEC-0034 — Quatro lugares, e o Conhecimento recebe o que você leva

**Data:** 2026-08-25
**Estado:** proposed
**Projeto:** Mekora
**Amends:**
- DEC-0024 — escopo: itens 1, 3 e 6. Os itens 2, 4, 5, 7, 8 e 9 permanecem vigentes
**Supersedes:** nenhuma

> ⚠ **Isto é proposta, não decisão.** Nada aqui tem autoridade até o Erik aceitar. Ela existe porque
> a implementação de 24/08 contradiz uma DEC aceita em dois pontos, e pela ordem de autoridade do
> projeto **quem se corrige é a norma ou o código — nunca o silêncio.**

## Contexto

A **DEC-0024**, aceita em 20/08, fixa cinco lugares e descreve Notas como espaço de trabalho global.
Em 24/08, dezesseis commits mudaram as duas coisas — **e nenhum deles é bug.** Cada um tem run,
medição e argumento. O que ficou para trás foi o registro.

É o mesmo padrão que a DEC-0025 encontrou quando *"`mekora-canvas-motion` é o frontend canônico"*
sobreviveu nove dias depois de ter deixado de descrever o projeto. **Nada obriga uma frase a
envelhecer em voz alta.**

## Decisão

### Os lugares

1. **O item 1 da DEC-0024 passa a ter esta redação:**

   > Os lugares do Mekora são **quatro: Mesa, Estante, Conhecimento e Canvas.**

2. **Conexões deixa de ser lugar, e a razão é medida.** Perguntou-se se dois pontos próximos no mapa
   tinham relação entre si:

   ```
   correlação entre força da relação e proximidade    −0,145
   distância média entre notas RELACIONADAS            202px
   distância média entre notas SEM NADA EM COMUM       180px
   ```

   **As notas sem relação ficavam mais perto.** A posição — a variável visual mais forte de qualquer
   arranjo espacial — não carregava informação, e ainda enganava um pouco. Medido o que existia só
   ali, Territórios era a lista de Ideias com outro nome, e o único conteúdo exclusivo era a trilha —
   que é a forma de **um** conceito atravessando livros, e por isso mora na página dele.

3. **Notas passa a se chamar Conhecimento**, e o nome foi obrigado pelo item 6 abaixo, não escolhido.

4. **O Canvas fica, e por contraste:** lá a posição significa o que **você** decidiu. É a `DEC-0030`
   item 2 aplicada — *Canvas organiza, Conexões descobre* — e o que a medição mostrou é que a
   organização sobrevive ao teste da posição e a descoberta não.

### O verbo que perdeu o lugar, e não perdeu a função

5. **O item 3 da DEC-0024 passa a ter esta redação:**

   ```
   LER        →  destaque
   PENSAR     →  nota
   ORGANIZAR  →  canvas
   DESCOBRIR  →  comportamento, não lugar
   ```

6. **Descobrir continua acontecendo, em dois lugares que já existem:** dentro de uma nota, como
   Relacionadas; e na página de um conceito, como a trilha com a palavra que liga cada dois passos
   escrita entre eles.

   **O que caiu foi a área, não a capacidade.** É a `DEC-0023` item 3 aplicada a uma superfície em
   vez de a um aparelho: *o significado é preservado; a representação pode mudar.*

### O portão, e o que ele inverte

7. **O item 6 da DEC-0024 é emendado, e a metade que sobrevive é a mais importante.**

   **Sobrevive:** não existe um segundo sistema de notas. Há uma entidade Nota, um só lugar onde ela
   mora, e nenhuma ontologia paralela.

   **Cai:** que o Conhecimento mostre todas as suas notas. A redação vigente passa a ser:

   > **Escrever uma nota não a manda para lugar nenhum.** A nota nasce e mora no livro. **Levar é um
   > segundo gesto**, e o Conhecimento reúne o que foi levado.

8. **A direção da filtragem se inverte em relação à DEC-0024.** Ela dizia que o livro mostra uma
   visão filtrada do conjunto completo. Hoje é o contrário: **o livro mostra tudo o que você escreveu
   nele, e o Conhecimento é que é o recorte.**

9. **A distinção é o produto, e a tese é do Erik, de 11 de agosto:**

   > *"O que chega aqui não é tudo que foi destacado: é o que a pessoa levou. A distinção É o produto
   > — sem ela isto vira o arquivo que ninguém abre."*

10. **Duas consequências que não são cosméticas, e já estão implementadas:** sugestão só sai do que
    foi levado; e tirar do Conhecimento **não apaga a anotação** — ela volta a morar só no livro.

11. **É o portão que torna o nome honesto.** Uma tela chamada Notas que não mostra todas as suas
    notas seria mentira. Conhecimento é honesto **justamente por não receber tudo.**

## O que esta decisão NÃO decide

- **A ordem dos quatro lugares.** Continua aberta de propósito — é a `D1`, e a V1 observável a
  responde com dado.
- **Se Mesa é um lugar como os outros ou a casa que a marca abre.** É a `B14`, e a ambiguidade é
  anterior à DEC-0024.
- **Que vistas o Conhecimento tem.** Hoje são três — Estudos, Todas as notas, Por pergunta — mais o
  Quadro como vista de Estudos. É a `B15`, e ela muda de enunciado: era sobre Notas.
- **Se o Mapa continua existindo em alguma forma.** Ele sai como área; se sobrevive recolhido é a
  `B9`.
- **O que acontece com uma nota levada cuja origem foi excluída.** É a `B6` e a `B16`, e o portão
  acrescenta um caso que elas não tinham: a nota **não levada** de um livro excluído.

## Consequências

1. **A DEC-0024 permanece `accepted`** e passa a declarar `amended_by: DEC-0034`. Pela `DEC-0027`,
   emenda parcial é relacionamento, não estado.

2. **Seis dos nove itens da DEC-0024 continuam vigentes sem alteração** — inclusive o item 2, que é o
   argumento de por que Notas merecia ser lugar próprio, e que esta emenda **reforça**: o
   Conhecimento continua sendo lugar, com mais razão do que antes, porque agora tem porta de entrada.

3. **A `DEC-0019` regra 1 muda de novo**, e pela terceira vez. A cadeia fica: DEC-0019 escreveu
   quatro lugares → DEC-0024 emendou para cinco → esta emenda volta a quatro, com outro conjunto.
   **Não é indecisão: são três arquiteturas diferentes**, e a última é a única com medição por trás.

4. **A `DEC-0018` §51 é alcançada de novo**, na mesma enumeração de superfícies que a DEC-0024 já
   havia emendado.

5. **Os quatro documentos canônicos de `docs/` ficam desatualizados neste ponto**, e a correção é
   trabalho de reconciliação — não desta decisão. Documento canônico descreve norma; não a cria.

6. **Uma pergunta nova entra na fila:** onde fica a fronteira entre a nota que mora no livro e a nota
   levada, quando o livro é arquivado em vez de excluído. A `DEC-0021` item 14 separa os dois atos; o
   portão acrescenta um eixo que ela não previa.

## Histórico

A DEC-0024 foi escrita para consertar uma enumeração que tinha ficado velha. **Ela ficou velha em
quatro dias** — e por trabalho bom, feito com medida e com run, o que é a única forma de ficar velha
que não é problema.

O que esta emenda registra não é que a DEC-0024 errou. É que **quatro dias de implementação medida
valem mais que uma enumeração escrita antes dela** — e que o preço de manter isso verdadeiro é
escrever a emenda no dia seguinte, e não no nono.
