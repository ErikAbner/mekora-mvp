# Mekora — cadernos de exploração

Explorações de UX, arquitetura de informação e interação para o Mekora — produto de leitura,
biblioteca pessoal e conhecimento gerado a partir da leitura.

Não são especificações fechadas. São **instrumentos para testar hipóteses antes de decidir**:
cada caderno junta o raciocínio e um protótipo funcional na mesma página, para que a discussão
aconteça em cima de algo que se pode operar, e não em cima de uma imagem.

## Como abrir

Abra `index.html` no navegador. Não há build, dependências nem servidor —
os arquivos são HTML autocontidos e funcionam offline, inclusive com duplo clique.

## Os cadernos

### Caderno 01 — A bancada do card de livro
`caderno-01-bancada-do-card.html`

Nove modelos de card (incluindo o card atual como linha de base) montados e funcionando sobre
o mesmo acervo sintético de 200 livros. Controles de modelo, tamanho do acervo, densidade e modo
de entrada (mouse/touch). As métricas — colunas por linha, telas de scroll, cliques até ler,
reflow, sobrevivência sem hover — são **medidas do DOM depois de cada render**, não escritas à mão.

Inclui matriz de decisão ponderada: a vitória de um modelo é condicional ao perfil de produto,
e dá para mudar os pesos e ver a ordem se reorganizar.

### Caderno 02 — Preferências, Conta e Perfil (Revisão A)
`caderno-02-preferencias-e-prototipo.html`

Arquitetura da área de preferências, em 18 seções. Abre com o registro da **Revisão A**: o que caiu,
o que mudou e o que sobreviveu quando a premissa do produto foi corrigida de local-first para
produto com conta e continuidade entre aparelhos.

Contém:

- inventário de 84 ajustes, filtrável por onde devem viver e por âmbito;
- quatro arquiteturas comparadas, com teste de localização;
- matriz de decisão ponderada;
- cinco modelos de navegação;
- dez fluxos com a microcópia real;
- **protótipo navegável** com oito cenários de teste que se marcam sozinhos conforme você age;
- as hipóteses que cada tela testa, e o que indicaria que falharam;
- as dependências de produto que ainda bloqueiam parte do desenho.

### Caderno 03 — Rodada final: UX/UI Exploration
`caderno-03-rodada-final.html`

A rodada que parte de todas as telas que existem hoje — as 26 capturas de 12 de agosto de 2026,
preservadas em `telas-atuais/` — e vai até a arquitetura proposta, sem começar por componente.

A conclusão que organiza o resto: **o Mekora está construído como duas aplicações que compartilham
só o nome.** A preparação se comporta como página de produto; a biblioteca, como aplicativo. Elas
não têm um elemento de interface em comum, e o caminho de uma para a outra é de mão única.

Contém:

- inventário das 26 telas, com veredito por tela (manter, fundir, virar estado, deixar de existir);
- o mapa do fluxo atual, reconstruído sem inferir passagens que não estão desenhadas;
- 34 achados classificados em P0, P1, P2 e P3, cada um com a tela em que foi observado;
- a arquitetura proposta de navegação, e por que Configurações não precisa existir;
- **22 telas propostas navegáveis** — sem conta, Mesa, item de documento, lote, quadrinho, editor
  manual, pendências, ajuda, perfil, atualizações e onboarding —, com Guiado e Personalizado
  funcionando;
- oito comparações atual × proposta, com a captura original de um lado;
- três dúvidas reais com duas ou três alternativas de arquitetura cada, e a escolha justificada;
- o que recomendo manter, alterar, remover e adiar;
- as seis respostas do Erik e o que cada uma mudou no desenho.

**Revisão B, 12 de agosto de 2026.** As perguntas foram respondidas e duas respostas corrigiram o
protótipo. O preparo roda no navegador, então a promessa *"pode fechar esta tela"* — escrita em três
telas — era falsa e saiu, junto com um estado novo para o que fica interrompido quando a aba fecha.
E como não há confirmação de que a direção de leitura pode ser detectada, a confiança declarada
naquela pendência saiu também: ela virou uma pergunta com a evidência à vista. A regra que ficou:
**confiança só quando existe medição; sem medição, o produto pergunta.**

## As três decisões centrais do Caderno 02

**Conta é real e vira o cabeçalho de Preferências**, não um item da lista — ela é o contexto em que
tudo o mais acontece, e isso libera a lista para continuar ordenada da ação inofensiva à irreversível.

**Perfil não deve existir ainda.** A biblioteca e as notas já são a representação da pessoa dentro do
produto; um Perfil seria um índice duplicado. Gatilho declarado para reabrir a decisão: o dia em que
houver compartilhamento — coleção pública, nota compartilhada, lista com link.

**Preferências é um espelho, não a fonte.** Todo ajuste de efeito visível mora onde o efeito acontece
(tipografia no leitor, densidade na estante, OCR no fluxo de conversão) e sobe a padrão por ato
deliberado. Preferências guarda o que não tem contexto, reflete o resto, e mantém o diário do que
você mudou — com a origem e o aparelho.

## O eixo que organiza tudo

> Sincroniza o que descreve a leitura. Fica no aparelho o que descreve a tela e a rede.

É simples o bastante para qualquer pessoa do time aplicar diante de um ajuste novo, que é o teste real
de uma regra de arquitetura. Resolve cerca de 90% dos casos; os que sobram estão listados como
fronteira a decidir, e três deles estão implementados no protótipo como alternativas comparáveis.

## Perguntas ainda em aberto

Estão na seção 18 do Caderno 02. As que bloqueiam desenho:

- onde a conversão e o OCR rodam;
- se a tradução envia o texto para processamento externo;
- o que "aparelho" significa se houver versão web;
- se existe compartilhamento no roadmap.
