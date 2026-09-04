# O que já foi julgado e recusado

Cobrado por `node scripts/rejeitado.mjs`.

Este arquivo existe por causa de uma frase de 02/09: *"sistema de destaque de
livro na estante continua péssimo apesar dos meus feedbacks"*. O feedback
existia — estava numa conversa. Conversa não é lugar de morar: ninguém relê,
nenhum instrumento consulta, e ela some quando a janela de contexto vira.
Trinta e oito críticas ficaram assim.

O `DESIGN-SYSTEM.md` guarda como as coisas **devem** ser. Aqui fica o que já
foi tentado e **reprovado** — que é o que se repete, porque quem refaz não sabe
que aquilo já foi feito e recusado uma vez.

## A regra

**Fechar exige prova.** Um comando que fica vermelho enquanto o defeito está lá
e verde quando ele some. `sem-prova` num item fechado é reprovação: "fechado"
sem medida é opinião, e opinião não segura regressão.

Item **aberto** conta e aparece, mas não derruba. Dívida com nome não é falha —
é dívida com nome.

## Formato

```
### R-00 · 2026-09-01 · aberto
**Erik:** "as palavras dele, sem parafrasear"
**Onde:** /rota ou nome da tela
**Prova:** sem-prova
```

O texto do Erik entra **verbatim**. Parafrasear é onde a exigência vira o que
quem lê achou que ela era — e foi assim que o destaque da estante voltou.

---

## 01–02/09 — a leva de trinta e oito

Estado de cada um: `docs/RETORNO-2026-09-02.md`.

### R-01 · 2026-09-01 · aberto
**Erik:** "Hover nos livros é muito feio e não dá o devido destaque, pode passar facilmente despercebido"
**Onde:** /estante
**Medido em 04/09:** Medido em 04/09: a unica regra de hover e `background: color-mix(--foreground 4%)`. E ela quase nao dispara — a capa e pintada por cima do alvo, entao passar o mouse sobre a capa nao acende nada.
**Prova:** sem-prova

### R-02 · 2026-09-01 · fechado
**Erik:** "O click só funciona na div inferior à da capa, usuários tendem a clicar na capa"
**Onde:** /estante
**Medido em 04/09:** `.livro-alvo` e `.capa` estavam ambos em `z-index: 1`, e `.capa-caixa` é `position: relative` **sem** `z-index` — logo não abre contexto de empilhamento próprio, as duas disputam o mesmo e a ordem do DOM desempata. A capa vem depois, ficava por cima e comia o clique. O conserto é `pointer-events: none` na capa, e não `z-index: 2` no alvo: subir o alvo o poria na frente da imagem e levaria junto o véu de 4% do `:hover` — o mesmo véu sobre a capa que a regra do escolhido já tinha tirado por apagar o que se está tentando mostrar. Medido com ponteiro de verdade pelo CDP, nos dois sentidos: limpo, o centro da capa entrega o clique a `button.livro-alvo` e a ficha passa de "Cadernos de campo" para "Relatório de pesquisa"; envenenado (`pointer-events: auto` de volta), quem recebe é `img.capa` e a ficha não muda.
**Prova:** `node scripts/provas.mjs r02`

### R-03 · 2026-09-01 · fechado
**Erik:** "O marcador de notas e destaques quebra o grid e vaza tanto da capa quanto invade o espaço do filtro superior"
**Onde:** /estante
**Desenho pretendido:** "livros sem borda, sem borda com cor, com o item que conta quantas notas ou destaques tem NA PARTE DE TRÁS com z-index menor + livro na frente"
**Medido em 04/09:** Medido em 04/09: marcador `z-index: 0` contra `z-index: 1` da capa, `elementFromPoint` na sobreposicao devolve a capa, e o marcador nao alcanca a barra de recortes. Sobra 37px acima do topo da capa — o desenho que ele descreveu.
**Prova:** `node scripts/provas.mjs r03`

### R-04 · 2026-09-01 · aberto
**Erik:** "O item de detalhes do lado direito está gigante, e a cor nesses destaques / notas não funciona — pesado, puxa toda a atenção da tela"
**Onde:** /estante
**Medido em 04/09:** Medido a 1440: a ficha ocupa 476px, 33% da janela, com fundos `rgb(28,28,28)`, `rgb(22,22,22)` e `rgb(97,114,47)` dentro.
**Prova:** sem-prova

### R-05 · 2026-09-01 · aberto
**Erik:** "Não precisa do botão enviar ao Kindle na Estante — o usuário faz isso na tela do livro"
**Onde:** /estante
**Medido em 04/09:** Medido: o botao "Enviar ao Kindle" continua na Estante (`Estante.jsx:536`).
**Prova:** sem-prova

### R-06 · 2026-09-01 · fechado
**Erik:** "O item ao lado da pesquisa é de DÚVIDAS, não de notas"
**Onde:** /estante
**Medido em 04/09:** O atalho ao lado da busca e `aria-label="Duvidas"`, com `icone-duvidas.svg`, levando a `/ajuda` (`Cabecalho.jsx:114`).
**Prova:** `node scripts/provas.mjs r06`

### R-07 · 2026-09-01 · fechado
**Erik:** "Você trocou o ícone da Estante, o que não faz sentido — existem componentes para isso"
**Onde:** /estante
**Medido em 04/09:** A causa era os ARQUIVOS trocados: `icone-estante.svg` desenhava um "?". Os dois foram renomeados para o que desenham, e a prova fixa o `sha256` dos dois auditados em 04/09 — trocar de novo fica vermelho.
**Prova:** `node scripts/provas.mjs r07`

### R-08 · 2026-09-01 · fechado
**Erik:** "Não respeitou o espaçamento entre usuário e a div com pesquisa e dúvidas"
**Onde:** /estante
**Medido em 04/09:** Medido: 56px entre a busca e os atalhos, 16px entre os dois atalhos — os numeros dos nos 900:52331 e 900:52339.
**Prova:** `node scripts/provas.mjs r08`

### R-09 · 2026-09-01 · aberto
**Erik:** "A pesquisa é MENOR e se expande quando o usuário tenta pesquisar — você não respeitou o componente que já existia e criou outro por cima"
**Onde:** /estante
**Prova:** `node scripts/inventario.mjs`

### R-10 · 2026-09-01 · fechado
**Erik:** "Conta: clicar navega automaticamente em vez de abrir um dropdown"
**Onde:** /estante
**Medido em 04/09:** Medido: clicar nao muda a rota, `aria-expanded` vai a `true`, e o menu abre com cinco itens.
**Prova:** `node scripts/provas.mjs r10`

### R-11 · 2026-09-01 · aberto
**Erik:** "O espaçamento entre itens está errado"
**Onde:** /estante
**Prova:** sem-prova

### R-12 · 2026-09-01 · fechado
**Erik:** "A única coisa certa são os pontos no fundo — e até isso está errado, porque na parte superior simplesmente tem fundo branco"
**Onde:** /canvas
**Medido em 04/09:** Medido: em `y=8` e no meio da tela quem pinta e o mesmo `.canvas-mundo`, com o mesmo `radial-gradient`. Nao ha faixa branca no topo. **O resto do item — "as funcoes estao erradas" — e o R-13, e continua aberto.**
**Prova:** `node scripts/provas.mjs r12`

### R-13 · 2026-09-01 · aberto
**Erik:** "As funções estão erradas, e os itens dentro das funções também"
**Onde:** /canvas
**Prova:** sem-prova

### R-14 · 2026-09-01 · fechado
**Erik:** "Eu não consigo mover os post-it"
**Onde:** /canvas
**Medido em 04/09:** Medido: arrasto de 140x90 move a nota 139x92. A causa antiga esta escrita no `Canvas.jsx:415` — o chao roubava a captura de ponteiro, e a guarda procurava `.canvas-nota`, classe que nao existe.
**Prova:** `node scripts/provas.mjs r14`

### R-15 · 2026-09-01 · aberto
**Erik:** "Os grupos se sobrepõem e não são como o que eu criei no Figma"
**Onde:** /canvas
**Prova:** sem-prova

### R-16 · 2026-09-01 · aberto
**Erik:** "Canvas travado, péssimas animações, interação ruim e confusa, ícones errados"
**Onde:** /canvas
**Prova:** sem-prova

### R-17 · 2026-09-01 · aberto
**Erik:** "Navegação enfiada onde não precisa — em alguns lugares é válida, em outros foi forçada sem necessidade e não seguiu o Figma"
**Onde:** /estudos
**Prova:** sem-prova

### R-18 · 2026-09-01 · aberto
**Erik:** "Kanban não funciona, interação péssima, parece de enfeite"
**Onde:** /estudos
**Medido em 04/09:** O gesto pedido nao existe de proposito: o no 895:8849 poe um botao "Reler" na coluna do lido, e ele existe e esta ligado. **Fica aberto porque trocar o gesto pedido por outro e julgamento do Erik, nao meu.**
**Prova:** sem-prova

### R-19 · 2026-09-01 · aberto
**Erik:** "Figma totalmente ignorado"
**Onde:** /estudos
**Prova:** sem-prova

### R-20 · 2026-09-01 · aberto
**Erik:** "Div central com 2 larguras sem necessidade"
**Onde:** /estudos
**Medido em 04/09:** Medido a 1440: NOVE larguras distintas entre os blocos maiores que 240px — 389, 411, 514, 910, 974, 1172, 1180, 1222, 1440. Ele escreveu "2".
**Prova:** sem-prova

### R-21 · 2026-09-01 · aberto
**Erik:** "Navegação onde não deveria ter, e errada"
**Onde:** detalhes do arquivo
**Medido em 04/09:** A trilha existe e mudou de conteudo: lista as notas da pessoa, citando o no 895:7631. **Fica aberto porque se ela deve existir ali e questao de fidelidade.**
**Prova:** sem-prova

### R-22 · 2026-09-01 · aberto
**Erik:** "Não seguiu o Figma — inventou coisa que nem devia existir"
**Onde:** detalhes do arquivo
**Prova:** sem-prova

### R-23 · 2026-09-01 · aberto
**Erik:** "Seguiu a ideia, mas fugiu muito do grid; as Memórias Póstumas podiam ser enquadradas melhor"
**Onde:** /leitura/:id
**Prova:** sem-prova

### R-24 · 2026-09-01 · aberto
**Erik:** "Menu errado: itens abrem do lado contrário ao do ícone; dropdowns e modais abrem errado, com largura errada, ícones apertados"
**Onde:** /leitura/:id
**Prova:** sem-prova

### R-25 · 2026-09-01 · aberto
**Erik:** "Notas e destaques você coloriu demais"
**Onde:** /leitura/:id
**Medido em 04/09:** Medido em /notas: quatro familias de cor fora do neutro, e a azeitona `rgb(116,108,47)` em 111 elementos.
**Prova:** sem-prova

### R-26 · 2026-09-01 · fechado
**Erik:** "Os temas têm 1 cor e justamente um tem 2 palavras — é ele que quebra o layout. Remover o 'do'"
**Onde:** /leitura/:id
**Medido em 04/09:** Os quatro rotulos tem uma palavra: Claro, Sepia, Escuro, Sistema (`Leitura.jsx:1335-1347`).
**Prova:** `node scripts/provas.mjs r26`

### R-27 · 2026-09-01 · aberto
**Erik:** "Você esqueceu de REMOVER o vertical trim de todos os textos — line height normal, nada de vertical trim"
**Onde:** todas
**Medido em 04/09:** Medido na Leitura: ha computados com `text-box-trim: trim-both`. Continua aplicado.
**Medido em 04/09, na Estante:** vivo em `web/src/estilo/base.css:117`, global. Um título de uma linha mede `clientHeight` 17 onde a linha pede 32; de duas linhas, 57 onde pede 64. **Quinze pixels por linha a menos do que o texto ocupa.** Consequência para a Fase 2a: varredura de transbordo que compare `scrollHeight` com `clientHeight` acusa FALSO em toda tela enquanto ele estiver lá — aconteceu aqui hoje, seis títulos "cortados" que não estavam cortados.
**Prova:** sem-prova

### R-46 · 2026-09-04 · aberto
**Erik:** "limitar a quantidade de caracteres do titulo do arquivo aparecendo na estante, se nao, vai ter texto enorme quebrando o layout e fazendo a tela perder o sentido"
**Onde:** /estante
**Feito em 04/09:** corte em DUAS LINHAS, não em número de caracteres — contagem não sabe a largura do glifo, e `IIIIIIIIIIIIIIIIIIII` e `WWWWWWWWWWWWWWWWWWWW` têm vinte caracteres e larguras muito diferentes. `title` no elemento devolve o nome inteiro. Veneno de 140 caracteres: o cartão cresceu **0px**, o título parou em 2 linhas, 6 cartões com 1 altura só (467px).
**Falta:** a prova entra no `scripts/provas.mjs` — precisa da bancada de pé.
**Prova:** sem-prova

### R-47 · 2026-09-04 · aberto
**Erik:** "tem um component set no figma com varias capas que criei justamente pro usuario n ficar sem capa caso o arquivo dele n tivesse uma... em caso de n haver borda ou lateral a gente segue o padrao de cor solida principal do livro"
**Onde:** /estante, /canvas, /estante/:id
**Lido em 04/09:** conjunto `1016:31030` — 14 capas de 420×594 e 14 lombadas de 58×594, mapeadas em `docs/TELAS-FIGMA.md`. São gabaritos que recebem o título, não fundos. Paleta: `#f4f2ec`, `#101010`, `#d9d9d9`.
**Feito:** uma peça só (`componentes/CapaDeReserva.jsx`) no lugar de TRÊS implementações divergentes — `.capa-vazia`, `.livro-capa-vazia`, `.livro-pagina-capa-vazia` —, com a variante saindo do token do trabalho: mesmo livro, mesma capa, sempre.
**Falta:** a ARTE das catorze. Cada variante tem nó próprio; entra como regra `[data-capa]`, sem tocar no componente.
**Prova:** sem-prova

### R-28 · 2026-09-01 · aberto
**Erik:** "Clico em adicionar cor (criar destaque, não nota) e o texto da leitura não muda de cor — botão que não pressiona, não muda, não dá feedback"
**Onde:** /leitura/:id
**Medido em 04/09:** Medido na Leitura: zero elementos de marca (`mark`, `.destaque`) no DOM do capitulo aberto.
**Prova:** sem-prova

### R-29 · 2026-09-01 · aberto
**Erik:** "Há imagens ilustrativas nas seções, cuidadosamente posicionadas para ficar em cima do container, com layout e ordem de layers pensados para não dar problema na implementação — e ainda assim você fez errado"
**Onde:** /conta e filhas
**Medido em 04/09:** Medido em /conta/privacidade: nenhuma imagem maior que 24px. O `Privacidade.jsx:50` registra por que — o SVG exportado era o no ERRADO, um bloco de texto branco, e foi apagado.
**Prova:** sem-prova

### R-30 · 2026-09-01 · aberto
**Erik:** "As letras pequenas podiam virar hot spot: bolinha clicável que abre popup informativo, em vez de texto quebrado e minúsculo por toda parte"
**Onde:** /conta e filhas
**Medido em 04/09:** Nao ha popover nem hot spot nas telas de conta.
**Prova:** sem-prova

### R-31 · 2026-09-01 · aberto
**Erik:** "Na tela de dados de uso você modificou tudo — se não havia outra forma, siga o Figma"
**Onde:** /conta/privacidade
**Prova:** sem-prova

### R-32 · 2026-09-01 · aberto
**Erik:** "Tela de privacidade completamente quebrada"
**Onde:** /conta/privacidade
**Medido em 04/09:** Medido: cinco blocos `.conta-secao`, todos com 863px, nenhum bloco vazio com altura. Nao achei quebra estrutural — o que responde e o quadro.
**Prova:** sem-prova

### R-33 · 2026-09-01 · aberto
**Erik:** "Espaçamento bugado, não segue o grid do Figma, navegação errada"
**Onde:** por onde começar
**Prova:** sem-prova

### R-34 · 2026-09-01 · aberto
**Erik:** "Bem errada também, não condizendo com o Figma"
**Onde:** /preparo/:id
**Prova:** sem-prova

### R-35 · 2026-09-01 · aberto
**Erik:** "Continua completamente bugada"
**Onde:** estante 3D
**Medido em 04/09:** Medido: o alternador existe, muda para a pilha, seis livros deitados, nenhum fora da janela e nenhum com altura zero.
**Prova:** sem-prova

### R-36 · 2026-09-01 · aberto
**Erik:** "Popups grandes até demais, fontes enormes. Coisas que deveriam caber numa tela única precisam de scroll. Grandes e legíveis, mas pecam no exagero"
**Onde:** todas
**Medido em 04/09:** Medido: /estudos tem 5397px de altura numa janela de 1000.
**Prova:** sem-prova

### R-37 · 2026-09-01 · aberto
**Erik:** "Estudos e Canvas: péssima organização, criação, uso e animação — não segue em nada o Figma. Eu não o criei por brincadeira"
**Onde:** /estudos e /canvas
**Prova:** sem-prova

### R-38 · 2026-09-01 · fechado
**Erik:** "As telas com um container atrás, numa cor diferente, sobre canvas pontilhado, são GAVETAS — seções que sobrepõem o conteúdo anterior, seguindo a lógica de navegação dentro do canvas. Usar o vaul desde o início: https://github.com/emilkowalski/vaul.git"
**Onde:** arquitetura de navegação
**Nota:** DECISÃO, não conserto. Adotar muda o modelo de navegação de várias telas. Não implementar sem o Erik confirmar.
**Medido em 04/09:** A `vaul` esta nas dependencias e o `GavetaDeSecao` a usa **nao-modal**, sem escurecer o fundo, fechando por arrasto — o no 895:10599 mostra o cabecalho vivo com a Conta aberta. **Quais telas ainda nao sao gavetas continua aberto, no R-17.**
**Prova:** `node scripts/provas.mjs r38`

---

## 02/09 — o que ele achou andando pelo produto

### R-39 · 2026-09-02 · aberto
**Erik:** "padding bugado" (nas seções)
**Onde:** /conta e filhas
**Prova:** sem-prova

### R-40 · 2026-09-02 · aberto
**Erik:** "falta os desenhos das configurações"
**Onde:** /conta e filhas — mesmo defeito que o R-29
**Prova:** sem-prova

### R-41 · 2026-09-02 · aberto
**Erik:** "espaçamento na estante incoerente com o figma"
**Onde:** /estante — mesmo defeito que o R-08 e o R-11
**Prova:** sem-prova

### R-42 · 2026-09-02 · aberto
**Erik:** "sistema de destaque de livro na estante continua péssimo apesar dos meus feedbacks"
**Onde:** /estante — é o R-01 e o R-03, na terceira vez
**Nota:** este é o item que fez este arquivo existir.
**Prova:** sem-prova

### R-43 · 2026-09-02 · aberto
**Erik:** "itens no canvas que diz escrita aqui mas n da pra escrever nem alterar o que tem na nota"
**Onde:** /canvas
**Prova:** sem-prova

## 04/09 — o que ele achou nas onze capturas

### R-44 · 2026-09-04 · fechado
**Erik:** "capa do livro errado — o cartão Relatório de pesquisa renderiza a capa de Malha Urbana"
**Onde:** /estante
**Medido em 04/09:** A causa não era do produto: cada cartão apontava para o seu próprio arquivo. Errado estava o DADO — `scripts/semear.py` tinha **quatro** imagens de exemplo para **seis** livros, e `exemplo-1` servia a dois títulos (Malha Urbana e Relatório de pesquisa), `exemplo-3` a outros dois. E havia um segundo defeito embaixo: a lista pedia `exemplo-1.png` e o que existe em disco é `.webp`, então o `if origem.exists()` pulava a cópia **em silêncio** — as capas que apareciam eram restos de uma rodada antiga. Agora cada livro ganha uma capa distinta, com o título escrito nela, e arquivo de exemplo faltando é erro que fala.
**Prova:** `node scripts/provas.mjs r44`

### R-45 · 2026-09-04 · aberto
**Erik:** (não é dele — saiu de medir a outra metade do R-44, a pedido dele: "quando a extração de capa de um livro REAL falha, o cartão cai em `.capa-vazia` ou fica com imagem de outro livro?")
**Onde:** /estante · `backend/app/api/jobs.py`
**Medido em 04/09:** Nenhuma das duas. A resposta é uma terceira: o cartão fica com um `<img class="capa">` **quebrado** — `naturalWidth: 0`, `complete: true`, e **sem** `.capa-vazia`. Imagem de outro livro não acontece: `serve_thumbnail` resolve o token para o `job_id` e lê de `STORAGE_TEMP/{job_id}`, então cada cartão só pode servir o próprio diretório. O que acontece é que `jobs.py` monta `cover_url` de `token_publico` + número da página **sempre que há `page_count`**, sem olhar se o arquivo existe — e a tela confia: `capa: e.cover_url ?? null`, e `capa ? <img> : <div class="capa capa-vazia">`. Um `cover_url` não-nulo apontando para 404 é justamente o caso em que o `.capa-vazia` existe e não é usado.

Medido no acervo semeado: com `storage/temp/9374/page_0.png` removido, a rota devolve 404 e o cartão "Relatório de pesquisa" fica com `larguraNatural: 0` e `temCapaVazia: false`; com o arquivo de volta, `larguraNatural: 420`. E no banco de desenvolvimento real (`storage/kindle_tool.db`), **32 dos 37 trabalhos** carregam `cover_url` não-nulo e **nenhum** dos 32 arquivos existe em disco — `storage/temp` é temporário.

O `scripts/semear.py` já sabia disso e contornou: *"TODOS OS LIVROS TÊM CAPA... um livro semeado sem arquivo em disco vira 404 — a estante mostrava capa quebrada nos dois que não tinham"*. Dar capa a todo livro semeado fez o sintoma sumir do acervo de prova sem tirá-lo do produto.

**Isto não reabre o R-44.** O R-44 diz "capa do livro errado", e capa de outro livro está medida como impossível por construção. Este é outro defeito, com outro sintoma, e por isso outro número.

**Conserto de uma linha, quando for a vez:** `jobs.py` conferir o arquivo em disco antes de emitir `cover_url` — sem arquivo, `None`, e a tela já cai sozinha no `.capa-vazia`, que existe exatamente para isto.
**Prova:** sem-prova
