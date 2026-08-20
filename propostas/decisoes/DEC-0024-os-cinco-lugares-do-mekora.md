# DEC-0024 — Os cinco lugares do Mekora

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** emenda a DEC-0019, regra 1, na enumeração dos lugares — a regra reescrita por inteiro está na Consequência 2; e emenda a DEC-0018, Consequência, `DEC-0018-mekora-identity-and-mvp-scope.md:51-52`, na enumeração das superfícies do design system. O restante das duas permanece vigente. Esta é a única DEC deste lote que emenda a regra 1 da DEC-0019.
**Decidido por:** Erik, em 2026-08-20

## Contexto

A DEC-0019 (aceita, 12/08) fixou na regra 1 "os quatro lugares — Mesa, Estante, Canvas, Conexões — iguais nas quatro superfícies" (`DEC-0019-experience-architecture-final-round.md:11-12`).

"Superfície", no vocabulário do registro, é o lugar do produto — não o aparelho. A prova está na DEC-0018, Consequência, `:51-52`: "O design system é feito para quatro superfícies (Mesa, Estante, Canvas, Conexões), não para uma." As quatro superfícies da regra 1 são, portanto, os próprios quatro lugares: a regra obriga a barra a ser idêntica dentro de cada lugar do produto. Ela nada diz sobre desktop, tablet ou telefone.

O protótipo diverge de si mesmo. Em `prototipo-mesa.html:2065` a barra tem **cinco** lugares: `[["mesa","Mesa"],["estante","Estante"],["notas","Notas"],["canvas","Canvas"],["conexoes","Conexões"]]`. Em `prototipo-mesa.html:5359`, no menu de dentro da leitura, a mesma barra tem **quatro**: `[["mesa","Mesa"],["estante","Estante"],["canvas","Canvas"],["conexoes","Conexões"]]`. O mesmo arquivo afirma duas arquiteturas diferentes.

Contra a norma que vigora hoje, quem diverge é `:2065`. A DEC-0019 está aceita e diz quatro; a tela que mostra cinco é a que se afastou dela, e `:5359` está em conformidade. Essa é a situação que esta DEC se propõe a inverter.

O próprio código admite que a presença de Notas não era decisão. O comentário em `prototipo-mesa.html:2061` diz: "Notas entra na barra porque a aposta da rodada e que ela e o produto". Isso é estado observado, não autoridade normativa: uma aposta de rodada registrada em comentário de implementação.

Esta DEC existe para resolver isso pela norma, e não pelo código: decidir quantos lugares o Mekora tem, registrar a razão, e registrar explicitamente que a arquitetura mudou.

## Decisão

1. **Os lugares do Mekora são cinco: Mesa, Estante, Notas, Canvas e Conexões.**

2. **Notas é um dos cinco lugares.**

3. **A razão registrada é a de Erik:** "Se retirarmos Notas, obrigamos outro lugar a absorver uma função que já demonstrou identidade própria." O que só Notas faz, conforme ele listou: notas por livro, notas soltas, ideias, revisão, origem, edição, conexões sugeridas, e highlights sem nota encaminhados para revisão.

4. **A arquitetura funcional do produto é esta:**

   ```
   LER      → highlight
   PENSAR   → nota
   ORGANIZAR→ canvas
   DESCOBRIR→ conexões
   ```

   Ela é o argumento da decisão, não ilustração dela: cada um dos quatro verbos tem um artefato próprio, e a nota é o artefato de PENSAR.

5. **A alteração histórica fica declarada, não escondida.** Anteriormente eram quatro lugares. A introdução de Notas alterou a arquitetura global do produto — não é acréscimo cosmético de um item de menu. Exigência explícita de Erik: "não esconder a alteração histórica. A DEC deve dizer que anteriormente eram quatro e que a introdução de Notas alterou a arquitetura global."

## O que esta decisão NÃO decide

- Não decide a ordem visual definitiva dos cinco lugares, nem rótulo, ícone ou representação de cada um. A ordem em que Erik os nomeou está registrada acima. Pergunta em aberto: **a ordem em que Erik nomeou os cinco lugares é norma de layout, sim ou não?**
- Não decide que formas concretas de subordinação de Notas ficam excluídas. Pergunta em aberto: **Notas pode aparecer como aba de Estante, como painel de outro lugar ou como derivada de Conexões, sim ou não?**
- Não decide a forma que o menu de dentro da leitura (`prototipo-mesa.html:5359`) deve assumir.
- Não decide o escopo do MVP. Pergunta em aberto: **Notas está dentro do MVP, sim ou não?** Ver Consequência 7.
- Não decide o que Notas contém tela a tela, nem sua navegação interna. A lista do item 3 é a justificativa da identidade do lugar, não uma especificação de funcionalidades.
- Não decide a presença de cada lugar em cada aparelho. Isso é matéria da DEC-0023, e a regra 1 da DEC-0019 nunca tratou disso.
- Não decide o estado formal da DEC-0019 no registro. O vocabulário de estados — `proposta`, `aceita`, `substituída`, `revogada` — é assunto da DEC-0027, também em proposta; não existe hoje `decision.schema.json` nem campo `superseded_by`.

## Consequências

1. **Enquanto esta DEC estiver em `proposta`, nada aqui é norma e nada no protótipo é bug por causa dela.** A norma vigente continua sendo a regra 1 da DEC-0019, com quatro lugares; nesse estado, `prototipo-mesa.html:2065` é a linha divergente e `:5359` está em conformidade. A DEC-0027, também em proposta, escreve a regra geral: "Enquanto uma DEC estiver em `proposta`, a implementação que a contraria **não** é bug — a norma ainda não existe." **Se esta DEC for aceita**, a situação se inverte: `:5359` passa a ser BUG conhecido e precisa ir a cinco lugares, e `:2065` passa a ser a linha conforme.

2. **Se aceita, a regra 1 da DEC-0019 passa a ler-se assim, por inteiro:**

   > **Uma casa, uma barra.** Marca à esquerda que volta para a Mesa, e os cinco lugares — Mesa, Estante, Notas, Canvas, Conexões — iguais nas cinco superfícies. Busca, ajuda e conta à direita. "Como funciona" é conteúdo de entrada de quem não tem conta, não item de produto. Não existe área de Configurações.

   A regra é reescrita inteira, e não emendada por remendo, porque a contagem aparece duas vezes na mesma frase: como "lugares" e como "superfícies". Trocar só a primeira deixaria o texto discordando de si mesmo. As regras 2 a 8 da DEC-0019 continuam sem alteração.

3. **Se aceita, a Consequência da DEC-0018 também muda.** `DEC-0018-mekora-identity-and-mvp-scope.md:51-52` diz hoje: "O design system é feito para quatro superfícies (Mesa, Estante, Canvas, Conexões), não para uma." Passa a ler-se: "O design system é feito para cinco superfícies (Mesa, Estante, Notas, Canvas, Conexões), não para uma." Essa é a linha que prova o que "superfície" significa no registro; deixá-la desatualizada custaria mais do que a própria enumeração.

4. **A DEC-0019 fica emendada, não revogada.** Revogar a DEC inteira jogaria fora regras que ninguém contestou. Dentro da regra 1, tudo que não é a enumeração permanece — inclusive "Não existe área de Configurações". Fora dela, permanecem as regras 2 a 8 e as consequências, entre elas "Preferências pessoais vivem no Perfil e no ponto de uso, conforme o Caderno 02" (`DEC-0019:68`). Nenhuma dessas foi tocada.

5. **`prototipo-mesa.html:2065` deixa de ser aposta e passa a ser conformidade, se esta DEC for aceita.** O comentário de `:2061` ("porque a aposta da rodada e que ela e o produto") descreve como a tela chegou lá; a partir da aceitação, a razão normativa é a do item 3, e o comentário deve ser lido como histórico, não como justificativa.

6. **A razão do item 3 implica que Notas não seja absorvida por outro lugar.** É leitura da razão registrada, não decisão sobre desenho: que formas concretas isso exclui não foi decidido — ver a seção acima.

7. **A DEC-0018 precisa ser relida à luz desta decisão.** Ela fixa o escopo do MVP com "preparação e biblioteca", e diz "Estante, Canvas e Conexões entram; não são fase dois" (`DEC-0018:12`). Notas não é mencionada. Com Notas promovida a lugar, a pergunta "Notas está dentro ou fora do MVP?" passa a existir e não tem resposta registrada. Esta DEC aponta a pendência; não decide o escopo. Registre-se que a DEC-0018 argumenta: "Cortar Estante, Canvas e Conexões do MVP esvazia o único argumento honesto de cadastro e deixa um conversor pedindo login sem razão" — o efeito desse argumento sobre Notas não foi avaliado.

8. **A DEC-0023 não toca esta redação.** Ela trata de presença de features por aparelho, matéria sobre a qual a regra 1 da DEC-0019 nada diz — "superfícies", ali, são os lugares do produto (`DEC-0018:51-52`). Por isso esta é a única DEC do lote que emenda a regra 1, e não há duas redações concorrentes da mesma regra. Também não há contradição de conteúdo: sob a DEC-0023, o telefone tem Notas e não tem Canvas; "os cinco lugares" descreve quais lugares existem na arquitetura, não uma obrigação de presença de todos em todo aparelho.

9. **Documentos de desenho que enumeram quatro lugares ficam desatualizados.** As duas enumerações localizadas e tratadas aqui são `DEC-0019:11-12` e `DEC-0018:51-52`. Fora do registro de decisões — cadernos, protótipo, material de design system —, quais documentos e onde: não verificado.

## Histórico

A arquitetura de quatro lugares foi fixada na DEC-0019, em 2026-08-12, na rodada final de UX (Caderno 03, revisão C). Ela resolvia um problema real: preparação e biblioteca não compartilhavam nenhum componente de navegação, e a regra 1 unificou a barra. O acerto dessa unificação não está em causa — só a contagem.

Entre 13 e 20/08, o desenho continuou nos runs, e a auditoria desta rodada apurou que 88 decisões de produto foram tomadas nesse período sem que nenhuma virasse DEC. A promoção de Notas está entre elas: ela apareceu na barra do protótipo (`:2065`) como "aposta da rodada" (`:2061`), sem decisão registrada. É o padrão que esta rodada corrige — implementação não prova aprovação.

O caminho até aqui, portanto, foi: quatro lugares decididos e registrados (12/08) → Notas entra na barra por aposta de rodada, sem DEC → o protótipo passa a afirmar cinco num lugar e quatro noutro → 20/08, Erik decide cinco e registra a razão. A alteração fica visível no registro porque ele exigiu que ficasse: a arquitetura global mudou quando Notas entrou, e o documento tem de dizer isso.
