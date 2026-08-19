# Mekora — cadernos de exploração

Explorações de UX, arquitetura de informação e interação para o Mekora — produto de leitura,
biblioteca pessoal e conhecimento gerado a partir da leitura.

Não são especificações fechadas. São **instrumentos para testar hipóteses antes de decidir**:
cada caderno junta o raciocínio e um protótipo funcional na mesma página, para que a discussão
aconteça em cima de algo que se pode operar, e não em cima de uma imagem.

## Como abrir

Abra `index.html` no navegador. Não há build, dependências nem servidor —
os arquivos são HTML autocontidos e funcionam offline, inclusive com duplo clique.

Só para **medir** convém subir a pasta em HTTP (`python3 -m http.server 8765 -d .`) —
ver [Como medir](#como-medir).

## Onde o trabalho está agora

`prototipo-mesa.html` — **o protótipo em que a exploração continua.** Abre na Home,
para quem ainda não sabe o que o produto é, e vai até dentro do livro: a Mesa e seus
estados, o fluxo inteiro dentro de um arquivo, a estante, a leitura com destaque e
nota, e o Perfil absorvendo Configurações. É onde o sistema derivado do DOC.cc está
aplicado de fato — escala fluida, medida editorial de 575 a 775, ritmo de 80px, raio
zero, link por borda.

Depois da Revisão C ele recebeu, entre 12 e 18 de agosto de 2026:

- **a Mesa como página editorial**, e o Perfil em seis seções com fluxo, estado e
  consequência, no lugar de um índice de dobras;
- **destacar e anotar dentro do livro**, com o endereço em três grãos — trecho,
  capítulo, livro. As três formas da tela saem de dois bits (tem âncora, tem nota):
  nenhum campo de tipo, nenhuma tipologia na mão de quem usa;
- **perguntas que guiam a leitura**, derivadas dos títulos dos capítulos do próprio
  arquivo — derivação da estrutura, não geração;
- **notas do Kindle pelo cabo**, com o que é novo, o que já existe e o que veio de
  livro que não está na estante;
- **o progresso da leitura medido no scroll**, pelo parágrafo que encosta no topo:
  0% quando nada foi lido, 100% quando a rolagem acaba, e invariante a corpo,
  entrelinha e largura de coluna.

A aba **Atualizações**, dentro do protótipo, é o registro corrente disso — inclusive
do que foi corrigido, e não só do que foi acrescentado.

`prototipo.html` — a exploração anterior, em tamanho real: biblioteca, leitor,
preferências, conta, importação, a área de Conhecimento e 27 cenários de teste. O
botão **◇ lab** guarda os números medidos de grid e densidade. Continua valendo como
registro; o trabalho novo não acontece mais lá.

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
- as seis respostas do Erik e o que cada uma mudou no desenho;
- **o sistema visual candidato** (seção 11): seis regras aplicadas ao mesmo componente, com o
  sistema atual ao lado, a prova de inversão no tema escuro, a faixa contextual de 60px funcionando
  e a tabela de tokens que vira o design system.

As telas foram reconstruídas com **o acervo real** — 14 capas e 14 lombadas, em `capas/`. Elas
trouxeram uma capacidade que nenhuma captura tinha mostrado: uma das capas diz, na própria arte,
*"gerado automaticamente pelo sistema"*. O Mekora monta capa para arquivo que não tem — o que é
muito melhor do que a fileira de cinco miniaturas idênticas da tela atual. E a Estante 3D reprovada
na auditoria estava a um `<img>` de funcionar: as lombadas existiam desde 6 de agosto.

**Revisão C, 12 de agosto de 2026.** As perguntas foram respondidas e o protótipo foi corrigido duas
vezes. O Mekora é uma aplicação web com servidor: **fechar a aba não mata o preparo** — o que se
perde sem conta é o endereço do trabalho, não o trabalho, e isso amarra a pergunta da conta com a do
processamento. Como não há confirmação de que a direção de leitura pode ser detectada, a confiança
declarada naquela pendência saiu: virou uma pergunta com a evidência à vista. A regra que ficou:
**confiança só quando existe medição; sem medição, o produto pergunta.**

Com traqueamento e mapa de calor aprovados, essa pergunta deixa de ser só uma limitação: **as
respostas às pendências são o dado que falta** para um dia recomendar com número real. O caderno
registra o que isso obriga a desenhar — medir a interface e nunca o conteúdo, consentimento no
momento da primeira pendência, e continuar perguntando enquanto a amostra for pequena.

**Revisão D, 12 de agosto de 2026.** As respostas viraram **DEC-0016 a DEC-0020** no registro do
projeto: as duas explorações de experiência são fontes e nenhuma é descartada; o produto se chama
Mekora e o MVP inclui Estante, Canvas e Conexões; a arquitetura de experiência desta rodada foi
aceita inteira; a instrumentação mede a interface e nunca o conteúdo; e **a âncora semântica manda
no leitor** — é a decisão que o progresso medido em `prototipo-mesa.html` cumpre. A **seção 11** é
nova: o sistema visual candidato, aplicado.

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

## Como medir

As métricas destes cadernos são **medidas no DOM depois do render**, não escritas à
mão. `scripts/` é o instrumento disso: sobe um Chrome de verdade por CDP e avalia a
medida dentro da página.

```
python3 -m http.server 8765 -d .
node scripts/medir.mjs http://localhost:8765/prototipo-mesa.html 1440 900 scripts/medidas/smoke.js
```

Existe porque painel de navegador embutido em editor com agente renderiza e tira
captura, mas **não compõe layout para medição**: `innerWidth` devolve 0 e todo
`getBoundingClientRect()` sai degenerado. Foi assim que 96 miniaturas de página
passaram seis dias medindo 2 por 20 pixels sem ninguém ver — em captura reduzida,
miniatura de 2px parece fio de grade. Captura serve para julgar composição; número
só vale medido. As cinco medidas que já existem estão em
[`scripts/README.md`](scripts/README.md).

## Perguntas ainda em aberto

Estão na seção 18 do Caderno 02. As que bloqueiam desenho:

- onde a conversão e o OCR rodam;
- se a tradução envia o texto para processamento externo;
- o que "aparelho" significa se houver versão web;
- se existe compartilhamento no roadmap.

E duas decisões de produto que o protótipo declara como pendentes em vez de fingir
resposta — elas aparecem com selo `decisão pendente` na própria tela, em Perfil:

- **entrar e sair da conta**, e o que acontece com o trabalho em curso;
- **por quanto tempo o arquivo original fica guardado.** Um prazo inventado no
  protótipo vira promessa no produto, então ali está a pendência e não um número.
