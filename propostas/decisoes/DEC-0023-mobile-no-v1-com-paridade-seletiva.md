# DEC-0023 — Mobile no V1 com paridade seletiva

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Decidido por:** Erik, em 2026-08-20

## Contexto

O protótipo tem CSS responsivo. `prototipo-mesa.html` tem 34 blocos `@media`, dos quais 23 são de
largura; os demais respondem a `prefers-reduced-motion` e `hover:none` (contagem de 2026-08-20). Os
blocos de largura aparecem ao longo de todo o arquivo — `:56`, `:166`, `:241`, `:518`, `:810`,
`:866`, `:1057`, `:1673`, entre outros. O menor ponto de quebra declarado é 520px (`:810`). Nenhuma
media query mira 390px.

O mesmo arquivo diz, em `:6742`: "Nenhuma dessas telas foi vista no celular ainda". E em
`:6653-6654`: "Nada foi visto a 390 ainda". CSS responsivo que nunca foi aberto num telefone é
hipótese, não suporte. Media query existente é estado observado do arquivo, não prova de que o
produto funciona em 390. A formulação geral dessa distinção — evidência não é norma — está proposta
na DEC-0027, mesma data, e ainda não é norma vigente.

O arquivo também nomeia, em `:6653-6654`, os três casos que ele próprio considera mais difíceis:
"agora existem uma superfície arrastável, um mapa com zoom e um modo paginado, que são os três casos
mais difíceis de tudo". Esses três casos são o custo real de mobile, e nenhum deles foi verificado.

O registro não tinha norma sobre aparelhos. A regra 1 da DEC-0019 (aceita, 12/08) diz "os quatro
lugares — Mesa, Estante, Canvas, Conexões — iguais nas quatro superfícies"
(`decisions/DEC-0019-experience-architecture-final-round.md:11-12`). Nesse vocabulário,
"superfícies" são os próprios lugares do produto, e não os aparelhos: a DEC-0018 escreve
literalmente "O design system é feito para quatro superfícies (Mesa, Estante, Canvas, Conexões)"
(`decisions/DEC-0018-mekora-identity-and-mvp-scope.md:51-52`). A regra 1 obriga a barra a ser a
mesma nos quatro lugares — que é o problema que a própria DEC-0019 declara ter resolvido:
"preparação e biblioteca não compartilhavam nenhum componente"
(`decisions/DEC-0019-experience-architecture-final-round.md:38-39`). Ela nunca tratou de paridade
entre desktop, tablet e telefone. Esta DEC não a emenda: preenche uma lacuna que ela deixou em
aberto.

O escopo da primeira versão está fixado na DEC-0018 (aceita, 12/08): "a primeira versão inclui
preparação e biblioteca. Estante, Canvas e Conexões entram; não são fase dois"
(`decisions/DEC-0018-mekora-identity-and-mvp-scope.md:12-13`). A DEC-0018 fala de MVP; esta rodada
fala de V1. Se são a mesma coisa, não foi declarado por ninguém.

## Decisão

1. Mobile faz parte do V1. Um V1 que só roda em desktop não cumpre o escopo.
2. Não existe paridade obrigatória de features entre aparelhos. Uma feature ausente num aparelho
   não é, por si só, defeito.
3. Em 390px são requisitos de V1: Estante, Reader, busca, highlights, notas e revisão. Uma dessas
   seis indisponível ou inoperante a 390px é falha de V1.
4. Canvas é desktop-only no V1.
5. Conexões preserva seu valor no mobile sem obrigação de preservar a mesma representação. Relações,
   trilhas e assuntos podem existir em listas e detalhes. No telefone, Conexões se apresenta como
   "Relacionadas · Trilhas · Assuntos", sem grafo.
6. O Mapa pode permanecer desktop-only. Sua ausência no telefone não conta como feature faltando.
7. O tablet é decidido feature a feature. Nenhuma feature é considerada presente ou ausente no
   tablet por herança automática do desktop ou do telefone.
8. O recorte por aparelho que Erik escreveu, registrado como ponto de partida — e, para telefone,
   coincidente com os requisitos do item 3:
   - **Desktop:** Mesa, Estante, Reader, Notas, Canvas, Conexões
   - **Tablet:** Estante, Reader, Notas, Conexões simplificadas — Canvas: avaliar depois
   - **Telefone:** Estante, Reader, Busca, Highlights, Notas, Para revisar — sem Canvas

   A linha do telefone é normativa porque o item 3 já a fixa. A linha do tablet é subordinada ao
   método do item 7: é desenho, não recorte vigente.
9. Regra de design system, aplicável a qualquer feature em qualquer superfície:
   **"Responsividade não significa reproduzir a mesma representação em todos os dispositivos.
   O significado é preservado; a representação pode mudar."**

## O que esta decisão NÃO decide

- **Se "V1" e o "MVP" da DEC-0018 são a mesma coisa.** Pergunta fechada para o dono: o V1 desta
  decisão é a primeira versão cujo conteúdo a DEC-0018 fixa — sim ou não? O item 3 cria seis
  requisitos de 390px, e quatro deles (Reader, busca, highlights, revisão) não são nomeados no
  escopo da DEC-0018. Enquanto a resposta não existir, não se sabe se esta DEC atribui aparelho a um
  escopo já fixado ou acrescenta itens a ele.
- **Se Notas é um lugar do produto.** O recorte do item 8 lista Notas nos três aparelhos porque foi
  assim que Erik o escreveu, mas quem constitui Notas como lugar de primeira classe é a DEC-0024,
  proposta na mesma data. Sob a norma vigente hoje, os lugares são quatro e Notas não está entre
  eles (`decisions/DEC-0019-experience-architecture-final-round.md:11-12`). Se a DEC-0024 não for
  aceita, o item 8 precisa ser relido: Notas passaria a ser função dentro de outro lugar, e a
  exigência de 390px do item 3 recairia sobre esse outro lugar.
- **A distinção entre lugar e função.** O recorte do item 8 usa dois vocabulários ao mesmo tempo —
  lugares (Mesa, Estante, Canvas, Conexões, Notas) e funções (Reader, Busca, Highlights, Para
  revisar). Nada aqui decide qual é qual.
- **O tablet, feature a feature.** O item 7 fixa o método — decidir uma a uma — e o item 8 registra
  o desenho escrito hoje, que já traz "Canvas: avaliar depois" e "Conexões simplificadas" sem dizer
  o que "simplificadas" significa. Cada feature do tablet continua em aberto.
- **Se o modo paginado é requisito de V1 no telefone.** Paginação contra rolagem contínua é bloqueio
  declarado e não resolvido. Esta DEC não o resolve.
- **Se Mesa existe no telefone.** O recorte do item 8 lista Mesa apenas no desktop. Erik não disse
  que Mesa some no telefone. A ausência na lista não foi declarada como decisão de remoção. A lacuna
  fica apontada e não preenchida.
- **O desenho de Conexões no telefone.** O item 5 fixa o conteúdo — "Relacionadas · Trilhas ·
  Assuntos", sem grafo. Nenhuma tela foi decidida.
- **Como se verifica se o significado sobreviveu.** O item 9 fixa a regra; o critério de
  conformidade que a operacionaliza não foi escrito pelo dono. Ver Consequências.
- **O que acontece com Canvas e Mapa depois do V1.** "Desktop-only no V1" não diz nada sobre V2.
- **Pontos de quebra, larguras-alvo além de 390px, e comportamento entre 390px e o desktop.** Nenhum
  valor foi decidido além de 390px como largura de referência do telefone.

## Consequências

- Estante, Reader, busca, highlights, notas e revisão passam a ter 390px como requisito de V1, e
  nenhuma das seis foi verificada a 390. `prototipo-mesa.html:6742` afirma que nenhuma dessas telas
  foi vista no celular, e `:6653-6654` diz "Nada foi visto a 390 ainda". O menor ponto de quebra do
  arquivo é 520px (`:810`). Isso é dívida declarada por esta DEC, não pendência descoberta depois: o
  requisito é criado aqui sabendo-se que não está cumprido.
- Conexões precisa de um desenho próprio para telefone. Erik definiu o conteúdo, não a tela. O
  desenho concreto desse bloco não foi decidido, não foi verificado e não constitui requisito.
- Dois dos três casos difíceis nomeados em `prototipo-mesa.html:6653-6654` saem do caminho crítico
  do V1 por serem desktop-only: o mapa com zoom (item 6) e a superfície arrastável do Canvas
  (item 4). Sobra o modo paginado, que continua no caminho crítico e continua sem decisão — ver a
  seção acima.
- **Leitura proposta da regra do item 9, ainda não validada por Erik:** uma feature estaria cumprida
  em outra superfície quando a pessoa consegue fazer ali o que a feature serve para fazer, ainda que
  por outra representação; e descumprida quando o significado se perde, mesmo que a aparência tenha
  sido preservada. É inferência de quem redigiu, não fala do dono, e não vale como critério até ele
  confirmar.
- A DEC-0019 não dizia nada sobre aparelhos: sua regra 1 trata dos quatro lugares do produto, no
  sentido em que a DEC-0018 define o termo
  (`decisions/DEC-0018-mekora-identity-and-mvp-scope.md:51-52`). Essa ausência é a lacuna que esta
  DEC fecha. Não há conflito de norma entre as duas, e nada na DEC-0019 fica emendado se esta for
  aceita.
- O CSS responsivo existente no protótipo não conta como cumprimento dos itens 3 e 8. Media query é
  estado observado do arquivo; verificação a 390px é o que resolve o requisito. Nenhuma verificação
  a 390px existe hoje.
- A frase do item 9 pertence ao design system, e não só a esta DEC: se aceita, qualquer decisão
  futura sobre uma feature em outra superfície passa a ser avaliada por ela. Onde o design system
  vive e como a regra entra lá não está decidido — não verificado.

## Histórico

A arquitetura anterior tratava os quatro lugares como territórios separados. A DEC-0019 (aceita,
12/08) os unificou: uma casa, uma barra, os mesmos quatro lugares em toda parte. Aparelho não estava
em discussão naquela rodada, e nenhuma DEC aceita até 20/08 diz o que acontece em telefone ou
tablet.

O protótipo seguiu por dois caminhos ao mesmo tempo. De um lado, acumulou 23 media queries de
largura ao longo de todo o arquivo, de `:56` a `:1673`. De outro, registrou por escrito, em `:6742`
e `:6653-6654`, que nada disso tinha sido visto num celular e que três construções recentes —
superfície arrastável, mapa com zoom, modo paginado — eram os casos mais difíceis do produto. O CSS
sugeria suporte; o texto do próprio arquivo dizia que não havia.

Esta rodada desfez o empate por cima: em vez de escolher entre cortar mobile do V1 ou prometer
paridade, separou o que precisa existir em 390px do que pode ficar no desktop, e trocou o critério
de "mesma tela" por "mesmo significado". Canvas e Mapa, as duas features que carregavam dois dos
três casos difíceis, saíram do V1 mobile por decisão, não por adiamento tácito. Conexões ficou, mas
por outra representação.

O tablet, que nas rodadas anteriores era tratado como caso intermediário resolvido por herança,
deixa de ter regra automática. Passa a ser decidido feature a feature.
