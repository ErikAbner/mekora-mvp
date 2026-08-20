# DEC-0024 — Os cinco lugares do Mekora

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** emenda a DEC-0019, regra 1 — na enumeração dos lugares. O restante da regra 1
e as regras 2 a 8 permanecem vigentes. Esta é a única DEC deste lote que emenda a regra 1.
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

O protótipo diverge de si mesmo. `prototipo-mesa.html:2065` enumera cinco lugares — Mesa, Estante,
Notas, Canvas, Conexões. `prototipo-mesa.html:5359`, no menu de dentro da leitura, enumera quatro.
E o próprio código admite que não foi decisão: "Notas entra na barra porque a aposta da rodada e que
ela e o produto" (`:2061`).

A norma vigente é a regra 1 da DEC-0019: "Uma casa, uma barra. Marca à esquerda que volta para a
Mesa, e os quatro lugares — Mesa, Estante, Canvas, Conexões — iguais nas quatro superfícies. Busca,
ajuda e conta à direita" (`DEC-0019-experience-architecture-final-round.md:11-12`).

Notas nasceu como aposta de uma rodada e ficou. A auditoria de 20/08 registrou a divergência como
bloqueio B2 e a levou ao dono do produto.

## Decisão

### Os lugares

1. **Os lugares do Mekora são cinco: Mesa, Estante, Notas, Canvas e Conexões.**

2. **Notas é um dos cinco.** A razão registrada é a de Erik: *"Se retirarmos Notas, obrigamos outro
   lugar a absorver uma função que já demonstrou identidade própria."* O que só Notas faz, conforme
   ele listou: notas por livro, notas soltas, ideias, revisão, origem, edição, conexões sugeridas, e
   destaques sem nota encaminhados para revisão.

3. **A arquitetura funcional do produto é esta**, e ela é o argumento da decisão, não ilustração
   dela — cada verbo tem um artefato próprio, e a nota é o artefato de PENSAR:

   ```
   LER        →  destaque
   PENSAR     →  nota
   ORGANIZAR  →  canvas
   DESCOBRIR  →  conexões
   ```

4. **A regra 1 da DEC-0019 passa a ler-se:** "Uma casa, uma barra. Marca à esquerda que volta para a
   Mesa, e os cinco lugares — Mesa, Estante, Notas, Canvas, Conexões — iguais nas cinco superfícies.
   Busca, ajuda e conta à direita."

### Notas é uma entidade global

5. **Notas é um espaço de trabalho global**, não uma aba de outro lugar. Não é aba da Estante, não é
   painel de outro lugar, e não é derivada de Conexões.

6. **Dentro de um livro não existe um segundo sistema de notas.** O que aparece ali é uma **visão
   filtrada das mesmas notas**, restrita àquele livro:

   ```
   NOTAS (global)                    ESTE LIVRO
   todas as notas                    Conteúdo
   todos os livros          ←→       Destaques
   notas soltas                      Notas      ← Notas global, filtrado por este livro
   revisão                           Marcadores
   ideias
   relações
   ```

7. **Notas está no MVP.**

### O que "cinco lugares" não significa

8. **Cinco lugares na arquitetura de informação não significam cinco botões permanentemente visíveis
   em toda tela e todo aparelho.** A arquitetura fixa quais lugares existem; não fixa que todos
   tenham acesso explícito e simultâneo em cada superfície.

9. **A ordem em que os cinco aparecem não está decidida.** Nomeá-los numa sequência, aqui ou em
   qualquer lugar, não a torna norma de layout.

## O que esta decisão NÃO decide

- **A ordem dos cinco lugares.** Fica em aberto de propósito. A DEC-0029 torna a V1 observável, e
  frequência de acesso, transições mais comuns, tempo até tarefa e sequência de uso passam a ser
  medíveis. A ordem deixa de ser opinião e passa a ter evidência.
- **Como os cinco lugares se apresentam no telefone.** Pelo item 8, alguns podem estar sob outra
  navegação se o teste mostrar que funciona melhor. A DEC-0023 fixa quais capacidades existem a
  390px; não fixa a forma da navegação.
- **Se Mesa é um lugar como os outros, ou a casa que a marca abre.** A regra 1 a trata das duas
  formas na mesma frase, e essa ambiguidade é anterior a esta DEC.
- **Que vistas Notas tem** — a auditoria observou cinco no protótipo — e como se chama a partição
  hoje rotulada "Soltas", declarada em aberto em `:6740`.
- **Como a visão filtrada do item 6 se comporta** quando a origem de uma nota foi excluída
  (DEC-0021, item 15).

## Consequências

1. **`prototipo-mesa.html:5359` passa a ser BUG conhecido, se esta DEC for aceita.** O menu de dentro
   da leitura precisa ir a cinco. Enquanto o estado for "proposta", o veredito é o inverso: `:2065`
   é que diverge da norma vigente.

2. **A regra 1 da DEC-0019 é emendada, não revogada.** O restante dela e as regras 2 a 8 continuam
   valendo — em especial "Não existe área de Configurações", e "Preferências pessoais vivem no Perfil
   e no ponto de uso". Revogar a DEC inteira jogaria fora regras que ninguém contestou.

3. **A DEC-0019 passa a declarar `amended_by: DEC-0024, escopo: regra 1`.** Pela DEC-0027, emenda
   parcial não muda o estado do documento emendado: a DEC-0019 permanece `accepted` e ganha o
   apontamento reverso.

4. **A DEC-0018 fica desatualizada num ponto.** Ela escreve "O design system é feito para quatro
   superfícies (Mesa, Estante, Canvas, Conexões)" (`DEC-0018:51`). Com o item 1, são cinco. É
   consequência de enumeração, não mudança de escopo do MVP — mas exige que a DEC-0018 receba
   `amended_by` no mesmo ato.

5. **Notas entra no escopo do MVP.** A DEC-0018 fixou o MVP com Estante, Canvas e Conexões dentro e
   não mencionava Notas como lugar. O item 7 a inclui.

6. **A arquitetura de dados de Notas fica determinada pelos itens 5 e 6.** A nota não pode ser
   armazenada como filha do livro: precisa de existência própria, e a visão do livro é consulta
   filtrada. Isso é coerente com a DEC-0021 item 15, que faz a nota sobreviver à exclusão do arquivo
   — as duas decisões exigem a mesma coisa por razões diferentes.

7. **A DEC-0023 e esta não se contradizem.** "Os cinco lugares" descreve a arquitetura de informação;
   não obriga presença em toda tela nem em todo aparelho. Canvas ser desktop-only no V1 não o remove
   dos cinco lugares.

## Histórico

**Anteriormente eram quatro lugares.** A introdução de Notas alterou a arquitetura global do produto
— não foi acréscimo cosmético de um item de menu. Erik foi explícito ao pedir que isso ficasse
escrito: *"não esconder a alteração histórica. A DEC deve dizer que anteriormente eram quatro e que a
introdução de Notas alterou a arquitetura global."*

A ancestral de Notas é a área de **Conhecimento**, que existiu no protótipo anterior
(`prototipo.html`) e foi recusada em 18/08 com argumento registrado em run: "Conhecimento não existe
neste produto e ponte para lugar inexistente é promessa não verificável". O nome foi revisto no mesmo
período, com a razão anotada no próprio arquivo (`:6706-6708`): *"Conhecimento é uma afirmação sobre
o resultado; Notas descreve o conteúdo."*

Uma versão anterior desta proposta elevava a arquitetura funcional do item 3 a norma e declarava, ao
mesmo tempo, que "todo o resto da regra 1" permanecia — o que teria revalidado a enumeração de quatro
que o item 1 justamente altera. A regra 1 foi reescrita por inteiro, e não por remendo.
