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
