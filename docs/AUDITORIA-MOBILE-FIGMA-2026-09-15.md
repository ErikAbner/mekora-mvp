# Auditoria mobile × Figma — 15 de setembro de 2026

## Veredito

A interface mobile do Mekora estava funcional, mas havia um defeito estrutural
grave no componente compartilhado de cabeçalho: a navegação desenhada para o
rodapé era contida pelo próprio cabeçalho e aparecia no topo. A causa era
`will-change: transform` no ancestral de um filho com `position: fixed`.
Esse detalhe cria um novo bloco de contenção; portanto, “fixo” deixou de
significar fixo à janela.

A rodada corrigiu esse defeito, reduziu a carga inicial de Estudos no telefone,
normalizou os alvos de toque encontrados e eliminou o único transbordo que
aparecia abaixo da largura canônica do Figma. Não foi reintroduzida nenhuma
decisão antiga que o produto já havia superado.

### Resultado mensurável

| Medida | Antes | Depois |
|---|---:|---:|
| posição da navegação numa janela 390×844 | topo, `y=27` | rodapé, `y=761` |
| altura de Estudos com a bancada atual | 10.171 px | 5.897 px |
| redução da rolagem inicial de Estudos | — | 42% |
| notas soltas mostradas inicialmente no telefone | 19 de 19 | 6 de 19 |
| transbordo em Estudos a 320 px | 5 px | 0 px |
| rotas principais com transbordo a 390 px | 0 | 0 |
| alvos acionáveis menores que 44 px nas telas críticas | vários | 0 |

As capturas de referência estão em
[`docs/auditoria-mobile/antes`](auditoria-mobile/antes) e
[`docs/auditoria-mobile/depois`](auditoria-mobile/depois).

## Escopo e método

Esta auditoria cruzou quatro fontes:

1. o produto atual renderizado com sessão e dados reais da bancada;
2. os frames mobile canônicos do arquivo Figma
   `uuhto6FREG14H3DME0XCI7`;
3. as decisões posteriores registradas no repositório;
4. os pedidos mais recentes do Erik, que prevalecem quando um frame antigo
   representa uma decisão já descartada.

O trabalho combinou três lentes:

- **Website Audit:** cobertura, conteúdo, fluxo, estados, acessibilidade e
  prontidão;
- **Interface Craft:** hierarquia, ritmo, agrupamento, affordance, movimento e
  consistência;
- **Figma Design to Code:** leitura direta dos nós, tokens, medidas e
  composição antes de alterar a implementação.

Não foi instalada outra skill. As três disponíveis cobriam integralmente o
trabalho; instalar uma quarta com a mesma finalidade só adicionaria instruções
concorrentes.

### Larguras verificadas

- **390×844:** largura canônica dos frames mobile do Figma;
- **320×760:** limite estreito, usado para revelar mínimos intrínsecos e botões
  que não cabem;
- **430×900:** limite superior ainda dentro do arranjo mobile;
- **1920:** comportamento desktop preservado pelas regras escopadas em
  `max-width: 767px`.

### O que foi medido

- largura do documento contra largura da janela;
- posição e tamanho de elementos `fixed` e `sticky`;
- alvos interativos menores que 44 px;
- elementos desenhados para fora da janela;
- altura total e densidade das páginas;
- presença e ordem dos blocos principais;
- correspondência visual com o screenshot e com o contexto de design de cada
  nó.

Elementos intencionalmente fora da janela, como os cartões futuros do carrossel
da Mesa, foram distinguidos de transbordo do documento. O carrossel usa um
trilho interno e o documento continua com `scrollWidth === clientWidth`.

## Inventário Figma conferido

Todos os nós mobile registrados no Project OS foram relidos nesta rodada.

| Produto | Rota | Nó Figma | Situação atual |
|---|---|---|---|
| Conta | `/conta` | `966:25321` | equivalente, com dados reais |
| Kindle | `/conta/kindle` | `966:25554` | equivalente |
| Preferências | `/conta/preferencias` | `966:25786` | equivalente |
| Privacidade | `/conta/privacidade` | `966:26643` | equivalente |
| Atualizações | `/atualizacoes` | `966:27160` | equivalente dentro da gaveta vigente |
| Ajuda | `/ajuda` | `966:27747` | equivalente, conteúdo aprofundado |
| Mesa | `/mesa` | `966:28476` | equivalente com estados dinâmicos |
| Livro | `/estante/:id` | `966:29052` | equivalente |
| Leitura | `/leitura/:id` | `966:29395` | equivalente com cromo vigente |
| Estudo | `/estudo/:id` | `966:29743` | equivalente |
| Nota / conexões | `/nota/:id` | `966:30269` | equivalente e ampliada |
| Estudos — lista | `/estudos` | `966:30771` | equivalente |
| Estudos — variação | `/estudos` | `966:31095` | equivalente com limite responsivo |
| Preparo analisado | `/preparo/:id` | `966:31504` | equivalente dentro da gaveta vigente |
| Estante | `/estante` | `964:24606` | equivalente, exceto decisões superadas |

### Rotas sem frame mobile canônico

- **`/notas`:** é uma frente criada depois dos frames listados. Foi avaliada
  contra os componentes e leis do sistema, não contra uma tela inexistente.
- **`/canvas`:** não existe como ferramenta no telefone por decisão de
  produto. A rota mostra a explicação `SoNoComputador`, não uma versão
  espremida do Canvas.

## Primeira impressão

Antes da correção, a primeira leitura visual era equivocada: a barra de lugares
ocupava o topo e a busca desaparecia. Isso invertia a composição do Figma e
também a ergonomia desejada. Navegação frequente ficava longe do polegar; busca
eventual sumia.

Depois da correção:

- a busca e o menu aparecem no topo, como entrada contextual;
- Mesa, Estante, Notas e Estudos permanecem no rodapé;
- a navegação não some quando o usuário rola;
- o conteúdo começa sem uma segunda barra concorrente;
- o Canvas continua ausente no telefone;
- Notas ocupa o lugar do antigo Canvas, de acordo com a decisão posterior de
  tornar notas um destino fácil de encontrar.

O sistema volta a apresentar uma hierarquia legível: ferramenta no topo,
destinos persistentes no alcance do polegar e conteúdo entre os dois.

## Achados e correções

### 🔴 Crítico — a navegação inferior aparecia no topo

**Sintoma.** Em todas as telas que usam `Cabecalho`, a barra mobile era medida
em `x=0, y=27, w=390, h=83`. Ela cobria a região superior e substituía
visualmente a busca.

**Causa.** O cabeçalho tinha `will-change: transform` permanentemente. Um
ancestral transformável estabelece o bloco de contenção de descendentes fixos.
Assim, `inset-block-end: 0` era calculado contra os 110 px do cabeçalho, não
contra a janela de 844 px.

**Correção.** No mobile, o cabeçalho volta ao fluxo com `position: relative`,
deixa de antecipar transformação, não recebe o estado transformado
`.recolhido`, deixa a busca sair naturalmente com a rolagem e mantém apenas a
barra de lugares fixa à janela.

**Prova.** Depois: `x=0, y=761, w=390, h=83`. Como `761 + 83 = 844`, a barra
fecha exatamente no rodapé da janela.

Arquivos:

- [cabeçalho mobile](../web/src/componentes/cabecalho.css)
- [Estante depois](auditoria-mobile/depois/estante.png)
- [Mesa depois](auditoria-mobile/depois/mesa.png)

### 🟡 Importante — Estudos se comportava como uma segunda tela de Notas

**Sintoma.** Com 19 notas fora de estudo, `/estudos` media 10.171 px de altura
no telefone. A síntese “Você ligou”, os estudos e o material ainda solto tinham
o mesmo custo de rolagem que um arquivo completo.

**Por que prejudica o fluxo.** Estudos existe para responder “o que estou
formando?”. Notas existe para responder “o que guardei?”. Despejar todas as
notas em ambas apaga a diferença entre os destinos e empurra o conteúdo de
síntese para longe.

**Correção.**

- desktop conserva o limite anterior de 20;
- telefone mostra 6 notas inicialmente;
- a contagem total continua explícita;
- o texto “Mostrando 6 de 19” aponta para Notas;
- nenhum dado foi apagado ou escondido sem aviso.

**Prova.** A mesma bancada caiu de 10.171 para 5.897 px, redução de 42%. A tela
preserva seus grupos e informa onde encontrar o restante.

### 🟡 Importante — ações visíveis tinham alvos de mouse no telefone

Foram medidos controles com 24, 32, 36 e 38 px de altura: o campo real da
busca, “Ver o que encontrei”, ações nas listas de Notas e Estudos, chip de
estudo, “Dispensar” e “Deixar um recado”.

As ações acionáveis agora têm pelo menos 44 px. Links textuais continuam
visualmente leves; o campo da busca amplia a área real de toque sem aumentar a
caixa desenhada; as regras ficam restritas ao mobile.

Mesa, Notas, Estudos, Estudo e Nota retornam zero alvos acionáveis abaixo de
44 px. Em Preferências, os controles nativos de 40 px permanecem dentro de
`label`s de linha inteira; a área acionável efetiva é o rótulo.

### 🟡 Importante — um botão ultrapassava 320 px

Em 320 px, “Criar estudo com estas notas” media 309 px começando em `x=16`,
terminava em `x=325` e ampliava o documento em 5 px.

O texto continua numa linha. Apenas o padding horizontal desse botão cai de
32 para 20 px no telefone, fazendo-o caber sem reduzir fonte ou cortar texto.
Depois, `/estudos` em 320 px tem `scrollWidth=320`.

## Comparação página por página

### Mesa — `966:28476`

Batem busca superior, título editorial, ilustração de envio, formatos, ação de
seleção, Continue antes da fila, estados de preparo, “Precisa de você” e os
carrosséis finais.

O frame tem dados fixos; o produto apresenta fila, livros, estado e tempo
reais. Cartões futuros ficam no trilho, não no documento.

### Estante — `964:24606`

Batem duas colunas em 390 px, proporção 420/594, vãos 24/40, filtro mobile,
seleção, ficha, busca superior e navegação inferior.

Duas diferenças são decisões posteriores:

- o Figma ainda mostra “Capas / Estante em 3D”; a vista foi removida porque a
  representação não atingia a qualidade prometida;
- o Figma ainda mostra Canvas na barra; o produto mostra Notas e mantém Canvas
  fora do telefone.

Reintroduzir essas peças seria regredir produto, não aumentar fidelidade.

### Livro — `966:29052`

Batem capa, identidade, selos, progresso, ação principal, Kindle, citação do
ponto atual, “O que ficou”, escrita sobre o livro e metadados. O produto amplia
o frame com filtros e ações completas para os estados já implementados.

### Leitura — `966:29395`

Batem coluna de prosa 20/30, título 56/72, imagens, cromo flutuante, painéis e
largura íntegra. O cromo atual contém controles funcionais adicionados depois
do frame; eles não foram removidos apenas para igualar a contagem antiga.

### Estudos — `966:30771` e `966:31095`

Batem título, apoio, busca, recortes, alternador Lista/Leitura, cartões,
livros por estado, “Você ligou” e “Fora de estudo”. O telefone agora mostra um
recorte representativo das notas e leva ao acervo completo.

### Estudo — `966:29743`

Batem pergunta central, livros, formação, semelhantes e ações. Não houve
transbordo nem alvo pequeno nas três larguras.

### Nota / conexões — `966:30269`

Batem trilha, trecho, comentário, estudos, notas ligadas, sugestões com
evidência, confirmação separada de navegação e descarte reversível. Chips e
ações textuais agora têm alvo de 44 px sem receber peso visual primário.

### Notas — sem frame próprio

A tela agrupa por origem: capa e título identificam o livro antes da lista,
contagem acompanha o grupo, cada nota separa trecho, comentário, origem e
ações, e a importação do Kindle fica no topo.

A altura passou de 6.680 para 6.944 px porque alvos de 32 px passaram a 44 px.
Esse aumento é intencional: densidade não pode ser comprada com precisão
motora.

### Conta, Kindle, Preferências e Privacidade

Nos nós `966:25321`, `966:25554`, `966:25786` e `966:26643`, batem largura,
padding, identidade, navegação, ilustração sobre o card, seções, hierarquia,
detalhe progressivo e controles. As páginas vivem em gavetas por decisão
posterior explícita; o conteúdo interno segue os frames.

### Ajuda — `966:27747`

Batem pergunta de entrada, busca, sequência numerada, temas e rodapé. O conteúdo
atual é mais extenso porque respostas superficiais foram substituídas por
orientação executável.

### Atualizações — `966:27160`

Batem título, frase com filete, ilustração, data editorial, marcador “Novo”,
blocos e separação de mudanças confiáveis e pendentes. A tela continua em
gaveta sobre o chão pontilhado por decisão posterior.

### Preparo — `966:31504`

Batem capa, título, selos, alternador, veredito, “O que encontrei”, “O que vou
fazer” e ações finais. A largura da gaveta não estica os blocos internos.

### Canvas — sem frame mobile

O Canvas não é comprimido. A rota explica que a ferramenta exige computador e
a barra inferior não oferece um destino que não pode cumprir.

## Consistência visual

### Hierarquia e espaçamento

- títulos preservam os degraus do sistema;
- corpo e metadado não encolhem automaticamente no telefone;
- fundos marcam conteúdo e filetes marcam citação ou relação;
- 16 px é o respiro externo mobile;
- grupos usam 24/32/40/64 px conforme sua relação;
- colunas mantêm teto próprio em vez de esticar o conteúdo.

### Botões

- 58 px para ações de tarefa;
- 44 px de área mínima para ações compactas em listas;
- texto sublinhado para navegação;
- texto simples para ações terciárias, ainda com alvo adequado.

Não foi aplicada uma altura global indiscriminada: isso faria todas as ações
parecerem igualmente importantes.

### Movimento

Não foi adicionada animação decorativa. A navegação inferior permanece estável;
busca e conteúdo saem naturalmente com a rolagem. O sistema respeita
`prefers-reduced-motion` onde já existe movimento.

## Acessibilidade e interação

### Confirmado

- zero transbordo nas rotas principais em 320, 390 e 430 px;
- navegação persistente no rodapé;
- conteúdo final alcançável atrás da barra;
- alvos críticos com no mínimo 44 px;
- foco visível preservado;
- botões e links mantêm semântica distinta;
- Canvas não cria beco sem saída;
- filtros dizem o recorte atual;
- listas limitadas dizem quantos itens faltam e onde encontrá-los.

### Falsos positivos tratados

- cartões do carrossel fora do viewport não são overflow do documento;
- input de upload 1×1 é controle oculto acionado por rótulo;
- radios de 40×40 em Preferências pertencem a labels de linha inteira;
- mais altura em Notas é consequência do alvo de toque, não regressão.

## O que não foi alterado

1. **Estante 3D:** permanece removida.
2. **Canvas mobile:** permanece indisponível, com explicação.
3. **Gavetas mobile:** Conta, Ajuda, Atualizações e Preparo continuam em Vaul.
4. **Controles da leitura:** não foram reduzidos sem decisão de produto.
5. **Dados reais:** não foram cortados para imitar quantidades fixas dos frames.
6. **Backend e segurança:** nenhuma regra de dados, autenticação ou persistência
   mudou nesta rodada.

## Riscos restantes e próximos critérios

### 🟢 Atualizar frames históricos

O Figma ainda comunica Canvas na navegação mobile e “Estante em 3D”. O produto
não deve ser alterado para acompanhar essas peças. Os frames precisam ser
atualizados ou anotados como históricos.

### 🟢 Criar frame próprio de Notas

Notas é destino principal e não tem frame mobile canônico. Um frame próprio
permitiria decidir quantas notas abrir por grupo, como grupos longos recolhem e
como busca e filtros convivem em acervos muito maiores.

### 🟢 Automatizar a posição do dock

Um teste futuro deve medir
`getBoundingClientRect().bottom === innerHeight`. Ler apenas
`inset-block-end: 0` não detecta um ancestral que aprisiona o elemento fixo.

## Critério de aceite

A rodada termina quando:

- build de produção passa;
- testes do front e backend passam;
- rotas medidas em 390 px têm transbordo zero;
- rotas principais passam em 320 e 430 px;
- a navegação termina no fim da janela;
- Mesa, Notas, Estudos, Estudo e Nota não têm alvo acionável abaixo de 44 px;
- diferenças do Figma são classificadas como erro corrigido ou decisão
  posterior preservada.

## Validação final — 15 de setembro de 2026

- build de produção: aprovado (`vite build`, 228 módulos transformados);
- testes da interface e contratos: 14 aprovados, nenhum reprovado;
- testes do backend: 936 aprovados, 1 ignorado, nenhum reprovado;
- portão de seletores: aprovado em 15 telas e 835 seletores; nenhuma regra de
  tela aponta para marcação inexistente;
- verificação de whitespace e conflitos no diff: aprovada;
- auditoria visual e geométrica: transbordo horizontal zero em 320, 390 e
  430 px nas rotas cobertas;
- altura da tela de Estudos em 390 px: de 10.171 px para 5.897 px, redução de
  aproximadamente 42% sem esconder o caminho para o restante das notas.

Durante esse portão também foram removidas 28 regras órfãs da antiga Estante
3D e uma regra órfã da Mesa. A limpeza não ressuscita recursos abandonados; ela
faz o CSS voltar a descrever apenas o produto existente.
