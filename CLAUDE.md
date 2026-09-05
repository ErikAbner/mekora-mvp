# Mekora

Ambiente pessoal de leitura e pesquisa: prepara documentos (PDF, EPUB, DOCX, CBZ,
CBR, imagens) para o Kindle e os guarda numa estante, com notas e ligações.

A exploração vive num arquivo só: **`prototipo-mesa.html`**, HTML autocontido, sem
build, que abre por `file://`. Publicado como Artifact a partir de
`artefato-mekora.html`, que é **gerado** por `scripts/artefato.mjs` — nunca editado
à mão, e **fora do versionamento desde 03/09** (C14): o gerador o reproduz byte a
byte, então versioná-lo guardava 2,87 MB por vez sem guardar nada.

## Duas frentes, e as regras não são as mesmas

Este repositório carrega **duas coisas com regras diferentes**, e confundi-las já
custou trabalho nos dois sentidos:

| frente | o que é | regra |
|---|---|---|
| **Exploração visual** — `prototipo-mesa.html`, `artefato-mekora.html` | HTML autocontido, sem build, para decidir desenho | **não toca em backend, DB, API nem infraestrutura**: ali nada disso é o produto, e mexer é trabalho jogado fora |
| **Produto** — `web/`, `backend/`, `contrato/`, `docs/` | o Mekora que roda, com conta, banco e migrações | backend, API, modelo e migração são **trabalho legítimo**, quando o produto pede |

As regras de idioma visual e de honestidade da interface valem para as **duas**.

## O que não fazer

- Não criar projeto novo, não criar outro index, não apagar exploração anterior.
- **Não mexer em backend, DB, API nem infraestrutura por causa do protótipo.** O
  `prototipo-mesa.html` não é o produto real; o que ele precisa, ele finge. No
  produto (`web/` + `backend/`), a regra que vale é outra: mudança de modelo ou
  de rota é normal, e migração destrutiva continua pedindo aprovação explícita.
- Não voltar para linguagem de SaaS arredondado. O idioma é **Editorial Utility**:
  preto, off-white, cinzas, raio quase zero, bordas finas, poucas sombras, serifa
  na narrativa, sans na interface, grade rígida, interface silenciosa.
- Não fazer "IA mágica". Nunca "a IA descobriu" ou "o Mekora sabe". O certo é
  *"estas notas parecem relacionadas"*, com as palavras contadas ao lado, para
  poder ser discordado.
- Evitar: transformar tudo em cartão, dashboard, grafo futurista, exigir
  organização manual, obrigar tags, dezenas de filtros, pasta como estrutura
  principal, e tratar sugestão como fato.
- Não criar solução nova para problema já resolvido só porque existe uma captura
  antiga mostrando o problema. Conferir a versão atual antes.

## Regras de desenho que já custaram uma rodada cada

- **O chão marca o conteúdo; o filete marca a citação.** O inverso fazia a frase
  do autor pesar mais que a do leitor, dentro de uma área chamada Conhecimento.
- **Respiro conta hierarquia.** Com tudo à mesma distância, nada agrupa.
- **Hierarquia é distância.** 17% entre o assunto e a referência não é hierarquia;
  é uma lista de coisas parecidas. Mede-se por massa visual: caracteres × corpo ×
  contraste.
- **Um recorte não pode repetir o eixo da vista.** Se as colunas já são o estado,
  o filtro por estado some.
- **Arranjo espacial só vale quando a posição significa alguma coisa.**
- **Estado derivado, corrigível à mão.** Nunca um campo de status para alguém
  manter — é a primeira coisa que fica desatualizada, e aí o filtro mente com a
  culpa do usuário.
- **Número na interface sai do modelo, não da mão.** Dois números escritos à mão
  ao lado de um derivado fazem da tela uma coisa meio honesta, que é pior.
- **Página não se guarda**: ela muda quando a fonte muda. O que se guarda é o
  progresso.
- **Botão repetido cinco vezes vira textura** e some como coisa clicável.
- `--ink-4` mede 2,05:1 — proibido em texto. Só borda e ponto.
- Quatro categorias de interação que não se misturam: **Navegação · Ferramenta ·
  Menu de objeto · Barra flutuante**.

## A busca também precisa de controle negativo

**Zero por seletor errado tem a mesma cara de zero por defeito.** Em 04/09 isto
aconteceu CINCO vezes num dia: `.canvas-no` quando a classe era `nota-canvas`;
`.livro-texto p` quando a prosa era `.bloco.paragrafo`; um `closest()` procurando
para dentro quando o alvo era o `<li>` ancestral; um avatar "que não existe" e
que media exatamente os 80×80 do nó. Nenhuma era defeito do produto. Todas
quase viraram um.

A regra: **antes de reportar ausência, provar que a busca sabe achar.** Se o
seletor devolveu zero, procurar o mesmo elemento por outro caminho — texto,
`aria-label`, forma da árvore — e só então dizer que não há. É o controle
negativo aplicado à busca, e vale tanto para `querySelector` quanto para `grep`.

**E o inverso, que custou o mesmo dia:** agir sobre o resumo de um relatório em
vez do relatório. Em 04/09 troquei o fundo de uma faixa que JÁ BATIA porque li a
lista de divergências e mexi no que não estava nela — o texto dizia, com todas
as letras, que aquele valor estava certo. Ler menos não é economia quando o que
se pula é a parte que impede o trabalho errado.

## O número do nó é o CONTEÚDO, e o recheio vem por fora

O Figma escreve a largura da coluna dentro de um `hero` que tem o próprio
recheio: `895:7683` diz `w-[1222px]` num pai com `p-[64px]`. Em CSS, com o
`box-sizing: border-box` que o produto usa, escrever `max-inline-size: 1222px`
com `padding: 64px` dá **1094 de conteúdo** — 128 a menos do que o desenho pede.

A forma que este repositório passou a usar deixa os dois números à vista:

    max-inline-size: calc(1222px + 2 * 64px);
    padding-inline: 64px;

Está em três telas — Livro, Preparo e Mesa —, e nas três o defeito só apareceu
quando o número CRESCEU: enquanto o teto era menor que o texto, o conteúdo batia
nele por acaso e a conta parecia certa. **Um teto que o conteúdo não alcança
mente em silêncio.**

Duas armadilhas irmãs, as duas pagas no mesmo dia:

- **Filho de flex mede o conteúdo, não o teto.** O `.preparo-pagina` tinha
  `max-inline-size` e parava em 1028 dos 1350, porque o `.mesa` é flex e ele não
  esticava. Faltava `inline-size: 100%`.
- **Seções da mesma página com modelos diferentes desalinham.** Na Mesa, as
  faixas declaravam 888 com o recheio por dentro (760 de conteúdo) e a fila 876
  sem recheio: duas bordas na mesma tela, que é o R-20 visto no computador.

## A caixa aparada cobra o vão escrito

`text-box-trim: trim-both` está ligado em todo bloco de texto desde 03/09. Ele
fecha a caixa entre a altura de maiúscula e a linha de base, e o efeito é que
**o vão entre dois blocos passa a ser SÓ o que a regra declara** — não há mais
meia entrelinha sobrando de cada lado para disfarçar um valor curto.

Uma tela escrita antes disso, e não refeita depois, tem os vãos antigos. Eles
eram folgados quando havia sobra; agora são o vão inteiro, e o texto — que
continua sendo desenhado no tamanho do glifo — transborda a própria caixa e cai
no vizinho. No Livro isso pintou "Origem · malha-urbana.pdf" por cima dos selos.

**Nenhum instrumento daqui via.** O portão mede cor, contraste e escala; a
cobertura conta rotas visitadas. As caixas não se sobrepõem — só o desenho
delas. Uma tela assim passa em tudo e chega quebrada na tela da pessoa.

`scripts/amassado.mjs` é quem vê. Ele mede o transbordo REAL do glifo (um canvas
com a mesma fonte devolve `actualBoundingBoxAscent` e `actualBoundingBoxDescent`)
contra o vão entre as caixas de CONTEÚDO dos vizinhos. Duas versões erradas
antes desta, as duas pegas antes de virar relatório:

- estimar o transbordo como `(entrelinha − altura) / 2` conta o vão da
  entrelinha como se fosse desenhado. Acusou 13 colisões na Ajuda, que é uma das
  telas já refeitas.
- usar a caixa do elemento em vez da de conteúdo conta o recheio como texto. Um
  `h2` com 32px de recheio embaixo encosta no vizinho sem que o texto chegue
  perto. Acusou quatro falsas na Privacidade.

E um veneno errado: zerar só as margens não envenena uma tela que separa os
blocos com `gap` — o controle passou por ela sem mudar um pixel e teria provado
que a medida funciona numa tela que ele não chegou a envenenar.

Ao refazer qualquer tela contra o nó: o vão vem do desenho, escrito. E rode o
`amassado.mjs` depois.

## Pergunte ao servidor, não ao schema

Duas vezes em 05/09 concluí que um campo não existia lendo o código em vez de
pedir a resposta. Na segunda, escrevi um item inteiro no livro de recusas sobre
um defeito que não existia: `epub_path` chega ao navegador, e o que tinha
falhado no meu teste era a SESSÃO — pedi um trabalho de outra pessoa da bancada,
a rota respondeu 404, e eu li a tela vazia como campo ausente.

É a mesma família de "a busca também precisa de controle negativo", noutra
superfície: uma conclusão sobre AUSÊNCIA tirada de um instrumento que não
conseguia achar. O `grep` no schema mostra o que está nas linhas que ele leu; a
API mostra o que ela manda.

    curl -s -b "mekora_sessao=$TOKEN" "$API/analyze/$ID" | python3 -m json.tool

O nome do biscoito é `mekora_sessao`, e o trabalho tem de ser DA PESSOA da
sessão — `sessao-de-prova.sh` semeia por pessoa, e um id de outra rodada
responde 404 sem dizer que o motivo é dono, e não campo.

## Armadilhas de implementação já pagas

- **Arrastar não mexe no DOM.** Mover o nó libera a captura de ponteiro no
  primeiro pixel (`lostpointercapture`), e o arrasto morre. O jeito certo:
  transform para seguir o ponteiro, captura no container, limiar de 4px, e a
  ordem só escrita ao soltar.
- **Semear é a última coisa que o modelo faz**, não a primeira. Já estourou duas
  vezes por zona morta temporal.
- **Especificidade de `:has()` é a do argumento mais específico.** Já fez a
  exceção vencer a regra.
- **Editar por linha exige âncora de conteúdo, não deslocamento.** Splice por
  limite de bloco já engoliu 14 rotas e duas regras de CSS.
- **`useCallback` com dependência declarada depois deixa a tela branca.** O array
  de dependências é avaliado NA HORA, e não quando a função roda — um `const`
  citado ali antes de existir dá `Cannot access X before initialization`. Custou
  três rodadas no `Canvas.jsx` (`escolha`, `medidasRef`, `espacoRef`,
  `membrosDe`). O portão pega, mas só depois do build: a tela monta com 4 nós.
- **Função que vai como propriedade para muitos filhos não pode depender de
  lista.** Ela troca de identidade a cada mudança da lista e quebra o `memo` de
  todos de uma vez. Já custou 66ms num quadro de arrasto com 123 objetos, duas
  vezes: em `usarHistoria` e nos `useCallback` de `usarCanvas`. A saída é ler a
  lista por `ref`.
- **`animation: ... both` vence estilo inline PARA SEMPRE.** O modo `both` mantém
  o último quadro aplicado depois que a animação acaba, e animação ganha de
  `style`. `canvas-entra` terminava em `transform: scale(1)`, e por isso todo
  cartão que o arrasto pintava por `transform` ficava parado: o valor inline
  chegava, o computado voltava a `matrix(1,0,0,1,0,0)`. Só o cartão sob o dedo
  escapava, porque `.movendo` desliga a animação. Custou o arrasto de vários e o
  conteúdo levado pela seção. Entrada usa **`backwards`**.
- **Medir desempenho no servidor de desenvolvimento mede o StrictMode.** Em
  `vite`, o corpo do componente roda DUAS vezes e o pacote não é minificado: o
  mesmo arrasto que dá 66–84ms de tarefa longa em `:5180` dá **zero** tarefa
  longa no build. O `vite preview` (porta 5181, com `preview.proxy` igual ao de
  desenvolvimento) é o único lugar onde o número é do produto.
- **Evento sintético não entra no Event Timing.** `dispatchEvent` não é evento
  confiável: o `PerformanceObserver({type:'event'})` devolve lista vazia e a
  leitura vira "nada demorou". Para separar manipulador de apresentação é
  preciso mouse de verdade — `--gesto`.
- **Classe curta e genérica em JSX herda o layout de outra tela.** `<span
  class="conta">` da barra da escolha do Canvas casava `.conta` do `conta.css` —
  o layout da tela de Conta, com `padding: 128px`. A barra virava um bloco de
  292px de altura, o "slab gigante". O `scripts/classes.mjs` NÃO pega isto: ele
  recusa uma classe definida em DOIS arquivos CSS, e aqui `.conta` está definida
  em um só; a colisão é entre a definição CSS e o USO no JSX de outro módulo. A
  regra que sobrou: classe de componente leva prefixo do componente
  (`canvas-escolha-conta`), nunca um substantivo solto que outra tela possa ter.
- **Raio mora no token, e o token é zero.** O Design System declara `--radius:
  0` (e `--radius-field: 0`). Cápsulas `border-radius: 999px` e cantos de 6–12px
  soltos no `canvas.css` eram fora da identidade por definição — a Doca e o zoom
  já usavam `--radius`. Superfície de comando do Canvas usa `var(--radius, 0)`;
  só ponto redondo de verdade (pega de ligação) fica em `50%`.
- **Manipulador na PEGA não recebe evento despachado na janela.** As quatro
  pegas de ligação tratam `pointermove`/`pointerup` nelas mesmas, com captura de
  ponteiro. Um teste que despacha na `window` nunca as alcança, e o fio parece
  quebrado quando está inteiro.
- Heredoc de python com acento literal falha contra fonte JS que tem `\uXXXX`.
  Usar edição por linha: `split("\n")`, achar por prefixo, emendar.

## Os instrumentos, e o que cada um responde

    node scripts/verificar.mjs prototipo-mesa.html     # estático, 6 detectores
    node scripts/verificar.mjs --autoteste             # o instrumento se prova
    node scripts/medir.mjs <url> <larg> <alt> [setup.js] <medida.js> [--png=] [--gesto=]
    node scripts/medir.mjs .../prototipo-mesa.html 1440 900 scripts/medidas/smoke.js
    node scripts/artefato.mjs                          # gera E verifica a saída
    .venv/bin/python -m pytest -q                      # a suíte do backend
    node scripts/classes.mjs                           # classe de dois donos, e classe de fora
    node scripts/medir.mjs <url> 1440 1000 scripts/coluna.js   # coluna estrangulada
    node scripts/seletores.mjs                         # seletor que não casa em rota nenhuma
    node scripts/cobertura.mjs                         # a auditoria alcança todas as rotas?

`--gesto=arq.js` roda na página, devolve pontos, e o Chrome anda por eles com o
botão apertado — é como se testa arrasto de verdade.

`--sessao=<token>` põe o biscoito antes da primeira navegação, e o token sai do
`scripts/sessao-de-prova.sh`, que escreve a sessão direto no banco de PROVA. A
razão é um teto: `LINKS_POR_ORIGEM` é 20 por hora, e a auditoria pedia um link
por medida — 66 pedidos, 20 atendidos, e a rodada morria na metade. O teto está
certo; o instrumento é que pedia demais.

`--dentro=<seletor>` clica DEPOIS de chegar e mede onde parou. Existe para as
duas telas que não têm URL fixa — `/nota/:id` e `/estudo/:id`, cujo id nasce
diferente a cada semente. Sem ele a auditoria alcançava 19 de 21 telas, e as duas
que faltavam eram as do conhecimento. O clique é do ROTEADOR: `location.href`
derruba a sessão de medida.

**O portão de seletor e escopo, de 03/09.** Três defeitos da mesma semana tinham
a mesma forma — o seletor com um modelo errado do DOM, e a tela parecendo certa:
`.conta` do `conta.css` caindo no `<span>` da barra do Canvas; o grid `14px 1fr`
da lista de Trazer recebendo um filho sem marca; e
`.cabecalho-acoes > .acao:not(.cabecalho-menu)` mirando neto. Nenhum dos três é
visível no CSS lido sozinho, e nenhum é cor, contraste ou corpo — então o portão
não os via.

    classes.mjs   classe usada num módulo e definida só na folha de outro
    coluna.js     texto com 3+ palavras quebrando uma palavra por linha
    seletores.mjs regra que não casa em rota nenhuma  (RELATÓRIO, não portão)

Os três foram aceitos reproduzindo o defeito e ficando vermelhos: verde sem essa
prova não conta.

O portão da interface não tem atalho de `npm`: ele roda da **raiz** do
repositório, por `scripts/medir.mjs … scripts/portao.js`. Existe um caminho só —
ver `docs/PLAYBOOK.md`.

**O critério do backend é "a suíte inteira passa", e não um número.** Contagem de
teste muda a cada rodada, e número escrito à mão em documento vira mentira
sozinho — inclusive por confundir *coletados* com *passaram*, que já aconteceu.
Quem quiser o número roda `pytest -q` e lê o rodapé.

**Verde por omissão é pior que vermelho.** Já aconteceu três vezes: `CAPS` lido
cedo demais, `S.terr` semeado depois de um renome, e `S.conta` nunca setada, que
deixou a Mesa inteira fora da cobertura por 294 telas. Depois de renomear estado,
reler os casos.

**Medir antes de opinar.** Crítica sem contagem não vale: *"há quatro cores de
fundo competindo"*, e não *"cores demais"*. Sem hedge, sem elogio de enchimento,
sem prescrição sem justificativa. O método está em
`Projeto-os/erik-project-os/docs/references/interface-craft-2026-08-12.md`.

## O Figma é somente leitura

**Nunca escrever, criar ou editar nó.** `get_design_context`, `get_metadata`,
`get_screenshot` e `download_assets` — e nada mais. `use_figma`,
`generate_figma_design` e companhia ficam fora, mesmo quando o quadro está errado
e a correção parece de um clique.

A razão não é de permissão, é de método: **oráculo que dá para reescrever não
reprova ninguém.** No momento em que a implementação pode ajustar o desenho, a
divergência entre os dois deixa de ser informação — e a decisão de 03/09 sobre a
senha da Conta (`966:25321`) só vale porque o quadro continua lá, dizendo o que
dizia. Quadro não se corrige: se data, e a data mora em `docs/TELAS-FIGMA.md`.

## Decisões vão em lote

Pergunta de decisão **não interrompe implementação**. Elas se juntam e vão de uma
vez, com o material de cada uma levantado — o que o quadro mostra, o que o código
faz, o que a norma diz. Uma por vez, no meio do trabalho, troca o custo de decidir
pelo custo de ser interrompido, e quem decide paga os dois.

O que não tiver quadro nem regra **vira pendência para o Erik**, e não escolha de
quem implementa.

## Documentação

O mapa está em `docs/README.md`, e ele diz qual documento é **vigente**, qual é
**ferramenta** e qual é **histórico**. Onboarding começa por ele.

**Quando uma decisão de arquitetura mudar:** atualizar o documento de estado
vigente, marcar o raciocínio superado como histórico — com aviso no começo da
seção, sem apagar a medição que o derrubou —, e **não deixar duas verdades
"atuais" no mesmo arquivo**. A regra inteira está em `docs/README.md`. Isto não é
capricho: as próximas sessões fazem onboarding por estes arquivos, e a versão
errada é tão citável quanto a certa.

## Project OS

O registro fica em `C:/Users/erikc/Projeto-os/erik-project-os` e é **compartilhado
entre projetos**.

    node bin/project-os.mjs start mekora <workflow> "<titulo>" --scope "..." --owner erik --executor claude
    node bin/project-os.mjs close <id> --summary "..." --test "..." --file "..." --decision "..." --next "..."

Workflows: `audit` (somente leitura), `bugfix`, `feature`, `visual-exploration`.

- **Achar run pelo NOME**, nunca `ls -t | head -1`: outra sessão pode ter escrito
  entre as duas chamadas.
- **Commitar por caminho explícito**, nunca `git add -A`: o repositório é de todos
  os projetos.
- O assunto é sempre o Mekora. O registro entra curto, e no fim.

## Skills

**Confira o que existe no ambiente da sessão antes de supor presença ou
ausência.** As skills variam por máquina: as de desenho do Erik
(`emil-design-eng`, `interface-craft`, `apple-design`, as de animação, as do
GSAP) estão em algumas e não em outras. Esta linha já dizia que elas não existiam
"nesta máquina" — e estava errada na máquina seguinte, porque foi escrita de uma
só.

A regra que funciona, e que já se provou uma vez: **skill que carrega método tem o
método extraído para `docs/references/` do registro**, que é sincronizado. Assim o
método vale mesmo onde a skill não existe — foi assim que o método de crítica
sobreviveu à troca de máquina. Ver `docs/references/skills-2026-08-24.md`.
