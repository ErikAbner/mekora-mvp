# Mekora

Ambiente pessoal de leitura e pesquisa: prepara documentos (PDF, EPUB, DOCX, CBZ,
CBR, imagens) para o Kindle e os guarda numa estante, com notas e ligações.

A exploração vive num arquivo só: **`prototipo-mesa.html`**, HTML autocontido, sem
build, que abre por `file://`. Publicado como Artifact a partir de
`artefato-mekora.html`, que é **gerado** por `scripts/artefato.mjs` — nunca editado
à mão, e **fora do versionamento desde 03/09** (C14): o gerador o reproduz byte a
byte, então versioná-lo guardava 2,87 MB por vez sem guardar nada.

## O que não fazer

- Não criar projeto novo, não criar outro index, não apagar exploração anterior.
- Não mexer em backend, DB, API nem infraestrutura. Isto não é o produto real.
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
- Heredoc de python com acento literal falha contra fonte JS que tem `\uXXXX`.
  Usar edição por linha: `split("\n")`, achar por prefixo, emendar.

## Os instrumentos, e o que cada um responde

    node scripts/verificar.mjs prototipo-mesa.html     # estático, 6 detectores
    node scripts/verificar.mjs --autoteste             # o instrumento se prova
    node scripts/medir.mjs <url> <larg> <alt> [setup.js] <medida.js> [--png=] [--gesto=]
    node scripts/medir.mjs .../prototipo-mesa.html 1440 900 scripts/medidas/smoke.js
    node scripts/artefato.mjs                          # gera E verifica a saída

`--gesto=arq.js` roda na página, devolve pontos, e o Chrome anda por eles com o
botão apertado — é como se testa arrasto de verdade.

**Verde por omissão é pior que vermelho.** Já aconteceu três vezes: `CAPS` lido
cedo demais, `S.terr` semeado depois de um renome, e `S.conta` nunca setada, que
deixou a Mesa inteira fora da cobertura por 294 telas. Depois de renomear estado,
reler os casos.

**Medir antes de opinar.** Crítica sem contagem não vale: *"há quatro cores de
fundo competindo"*, e não *"cores demais"*. Sem hedge, sem elogio de enchimento,
sem prescrição sem justificativa. O método está em
`Projeto-os/erik-project-os/docs/references/interface-craft-2026-08-12.md`.

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

Parte das skills de desenho do Erik vive **só no Mac** (`emil-design-eng`,
`interface-craft`, `apple-design`, as de animação, as do GSAP). Nesta máquina elas
não existem, e pedir por elas aqui não resolve.

A regra que funciona, e que já se provou uma vez: **skill que carrega método tem o
método extraído para `docs/references/` do registro**, que é sincronizado. Foi
assim que o método de crítica sobreviveu à troca de máquina. Ver
`docs/references/skills-2026-08-24.md`.
