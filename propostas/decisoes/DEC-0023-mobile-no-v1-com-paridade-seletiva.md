# DEC-0023 — Mobile no V1 com paridade seletiva

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

O protótipo tem 15 media queries de largura reais, quatro blocos `@media(hover:none)`, e o caderno 03
declarando que abaixo de 900px vira coluna única. E tem, escrito no próprio arquivo:
"Nenhuma dessas telas foi vista no celular ainda" (`prototipo-mesa.html:6742`). E, mais preciso:
"Nada foi visto a 390 ainda — e agora existem uma superfície arrastável, um mapa com zoom e um modo
paginado, que são os três casos mais difíceis de tudo" (`:6653`).

CSS responsivo que nunca foi aberto num telefone é hipótese, não suporte. O bloqueio aparece nos três
runs de 20/08.

Uma leitura precisa ser desfeita antes de tudo: a regra 1 da DEC-0019 fala em "os quatro lugares —
Mesa, Estante, Canvas, Conexões — iguais nas quatro superfícies"
(`DEC-0019-experience-architecture-final-round.md:11-12`). No vocabulário do registro, **superfície é
lugar do produto, não aparelho** — a DEC-0018 escreve literalmente "O design system é feito para
quatro superfícies (Mesa, Estante, Canvas, Conexões)" (`DEC-0018:51`). A regra 1 obriga a barra a ser
a mesma nos lugares, e é a solução do problema que a própria DEC-0019 declara ter resolvido:
"preparação e biblioteca não compartilhavam nenhum componente". Ela nunca tratou de paridade entre
desktop, tablet e telefone. **Esta DEC não a emenda; preenche uma lacuna que ela deixou.**

## Decisão

### O princípio

1. **Mobile faz parte do V1.** Um V1 que só roda em desktop não cumpre o escopo.
2. **Não existe paridade obrigatória de features entre aparelhos.** Uma feature ausente num aparelho
   não é, por si só, defeito.
3. **A regra é paridade de valor, não paridade de interface.** Formulada como norma de design
   system, aplicável a qualquer feature em qualquer superfície:

   > **Responsividade não significa reproduzir a mesma representação em todos os dispositivos.
   > O significado é preservado; a representação pode mudar.**

### A capacidade essencial

4. **Estas capacidades existem no telefone, e portanto em todos os aparelhos:**

   ```
   Mesa · Estante · Reader · Busca · Highlights · Notas · Marcadores · Para revisar
   ```

   Mais **Conexões em representação adaptada**, conforme o item 6.

   A 390px, uma dessas indisponível ou inoperante é falha de V1.

5. **Canvas é desktop-only no V1.** Depende de espaço, posicionamento espacial, arraste e múltiplos
   objetos simultâneos em contexto visual. Forçá-lo a 390px para poder dizer que é responsivo
   produziria experiência pior que a ausência.

6. **Conexões existe em todos os aparelhos, com representações diferentes.** No telefone se apresenta
   como **Relacionadas · Trilhas · Assuntos**, em listas e detalhes, sem grafo. É a aplicação direta
   do item 3: a capacidade de descobrir relação é preservada; o mapa não é o único jeito de mostrá-la.

7. **O Mapa pode permanecer desktop-only.** Sua ausência no telefone não conta como feature faltando.

8. **O tablet não é uma terceira especificação rígida.** Adota comportamento por capacidade e
   espaço disponível, e é decidido feature a feature. Nenhuma feature é considerada presente ou
   ausente no tablet por herança automática do desktop ou do telefone.

### O Reader

9. **O Reader oferece os dois modos: paginado e rolagem contínua.**
10. **Paginado é o padrão para livros textuais.** Oferece unidade espacial estável, reduz
    deslocamento acidental e se aproxima do modelo mental de livro.
11. **Rolagem contínua é alternativa escolhida pela pessoa, e a escolha é lembrada.**
12. **Paginação versus rolagem não é escolha irreversível do produto.** Tipos de conteúdo que
    funcionem melhor verticalmente podem ter outro padrão, decidido depois e com evidência.

## O que esta decisão NÃO decide

- **O tablet, feature a feature.** O item 8 fixa o método, não o resultado. O recorte que Erik
  esboçou para tablet — Estante, Reader, Notas, Conexões simplificadas, e Canvas a avaliar depois — é
  ponto de partida, não recorte vigente.
- **Como Relacionadas, Trilhas e Assuntos se apresentam.** Erik esboçou o formato: dentro de uma
  nota, um bloco `RELACIONADO` listando as notas próximas com o livro de origem, e um "Ver trilha →".
  É ponto de partida para desenho, não especificação fechada.
- **Se o Mapa ganha alguma representação no telefone**, ou se simplesmente não existe lá.
- **Que tipos de conteúdo têm padrão diferente de paginado** (item 12), e com que evidência isso se
  decide.
- **Como a escolha de modo é lembrada** — por conta, por aparelho, por livro — e o que acontece
  quando divergem.
- **Quais breakpoints existem** além de 390px, e o que "tablet" significa em números.
- **Quando as telas passam a ser efetivamente verificadas a 390px.**

## Consequências

1. **Sete capacidades ganham 390px como requisito de V1, e nenhuma foi verificada lá.** Isso é dívida
   declarada, com endereço, e não pendência a descobrir. `:6742` documenta o estado inicial.

2. **Dois dos três casos difíceis saem do caminho crítico do V1.** `:6653` nomeia superfície
   arrastável, mapa com zoom e modo paginado. Os itens 5 e 7 tiram os dois primeiros do telefone.
   **Sobra o modo paginado — e o item 10 o torna o padrão do Reader**, ou seja, o caso mais difícil
   remanescente é também o mais usado.

3. **Conexões precisa de desenho próprio para telefone.** Não é adaptação do mapa: é outra
   representação da mesma capacidade.

4. **Mesa entra no mobile.** Um recorte anterior discutido nesta sessão listava Mesa só no desktop.
   O item 4 a inclui.

5. **A DEC-0019 não é emendada por esta decisão.** Uma versão anterior desta proposta declarava
   emenda à regra 1, sobre uma leitura errada de "superfícies". A correção evitou registrar um
   conflito que não existe.

6. **A DEC-0029 responde o que era pergunta aberta aqui.** V1 e MVP nomeiam a mesma versão; os
   requisitos deste documento incidem sobre o escopo que a DEC-0018 fixou.

7. **O item 9 acrescenta trabalho ao Reader.** Dois modos completos, com estado lembrado, é mais que
   um modo bem-feito. O bloqueio "paginação versus rolagem contínua ainda não foi decidida",
   registrado no run de 20/08, deixa de ser bloqueio e vira escopo.

## Histórico

Uma versão anterior desta proposta recomendava desktop-first, com mobile fora do V1. O argumento era
de escopo: o Mekora já carrega conversão, OCR, biblioteca, Kindle, Reader, notas, Canvas, Conexões,
representações e tradução, e mobile abriria uma dependência escondida — como o telefone recebe a
biblioteca, o que implica sincronização, rede, autenticação e conflito.

A DEC-0022 desfez essa dependência. Sendo o Mekora web-first e account-based, o telefone não precisa
receber a biblioteca: ele acessa a mesma conta. O que travava mobile era a premissa local-first, e
ela caiu.

Mobile já teve desenho neste projeto, e o trabalho se perdeu. Os relatórios de 24/07/2026,
preservados em `resgate/2026-07-24-kindle-local/`, trazem três direções de arquitetura, **cada uma com
wireframe desktop 1440 e mobile 390**, e execução real em Chromium headless a cinco viewports —
1440×900, 768×1024, 390×844, 720×450 e 320×800. Era outro produto, na direção antiga, e nada dali é
especificação hoje. Mas a pergunta certa a fazer sobre 390px não é "como fazemos mobile" — é *o que
já foi resolvido em 390, por que foi resolvido daquela maneira, e quais dessas decisões sobrevivem ao
Mekora atual.*
