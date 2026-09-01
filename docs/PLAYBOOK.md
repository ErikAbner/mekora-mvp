# Como acrescentar uma tela ao Mekora

Escrito a partir das quatro telas que já existem, e não de teoria. Cada passo aqui
foi executado; onde algo deu errado na primeira tentativa, o erro está nomeado,
porque é o que faz a receita valer mais que a lista.

**Faltam 59 telas.** O Figma tem 63 quadros e o código tem 4. Esta é a receita
para as outras.

---

## 0 · Antes de qualquer coisa: ligue o portão

```bash
cd ~/dev/mekora/web && npm run dev          # a interface, porta 5180
cd ~/dev/mekora && node scripts/medir.mjs \
  "http://localhost:5180/sua-rota" 1440 1000 scripts/portao.js
```

Ele mede a **página servida** num Chrome de verdade. Não é teste de laboratório, e
a diferença tem nome: na Vynce *"o portão media o laboratório, não a página"*, e
essa foi a primeira das cinco causas do sofrimento.

Rode antes de começar. Uma tela que já nasce medida não acumula dívida.

---

## 1 · Ler o desenho do Figma, nunca a captura

```
/figma-design-to-code                        (carregue a guia primeiro)
get_design_context  nodeId: 895:XXXX
dirForAssetWrites:  /Users/sipnm/dev/mekora/web/publico/icones
```

**Nunca desenhe um ícone à mão.** Sem o vetor real, qualquer `<svg>` que você
escreva é invenção com cara de fidelidade — passa despercebida por semanas, e
depois ninguém entende por que o ícone está "quase certo".

Se o Figma recusar escrever: **Dev Mode → painel MCP → Allowed directories**. É
uma lista separada de "habilitar o servidor", e essa confusão custou três
tentativas.

### O mapeamento de asset sai da geometria

Os `inset` percentuais do código determinam o `viewBox` de cada SVG. O ícone da
Mesa tem `inset: 8,33%` num contêiner de 23,867px com expansão de
`-2,97/-4,06/-4,05/-5,63` — o que dá `21,8155 × 21,2854`, e havia exatamente um
arquivo com esse `viewBox`. **Casar por conta é mais confiável que abrir um por
um.**

---

## 2 · Ícone é máscara, não imagem

Os SVG vêm do Figma com a **tinta cravada dentro**. Três vinham em `#878787`, que
não existe no sistema, e o portão **passou verde** — ele lê CSS computado de nó de
texto, e cor cozida num arquivo é invisível para ele.

```jsx
<Icone src="/icones/icone-x.svg" />        // já resolve
```

O `Icone` põe o SVG como `mask-image` com `background: currentColor`. Os caminhos
do vetor ficam intactos; o que sai do arquivo é uma **decisão que pertence ao
sistema**. Aí o ícone segue a tinta do texto ao lado sem ninguém lembrar.

Ao trazer um ícone novo:

```bash
cd web/publico/icones
python3 -c "import re,sys;p=sys.argv[1];s=open(p).read();open(p,'w').write(re.sub(r'(fill|stroke)=\"#[0-9A-Fa-f]{3,8}\"', r'\1=\"currentColor\"', s))" icone-novo.svg
```

**Ilustração não.** Arte tem paleta própria e o portão a relata sem julgar.

---

## 3 · Os valores vêm do sistema, sempre

Nenhum hex no seu CSS. Tudo por variável, de `web/tokens/`:

```css
background: var(--background);      /* surface/base   #f9f9f9 */
color: var(--foreground);           /* text/strong    #151515 */
border: 1px solid var(--border);    /* border/subtle  #b1b1b1 */
color: var(--muted-foreground);     /* text/secondary #6a6a6a */
background: var(--card);            /* surface/sunken #f3f3f3 */
```

### As regras que o portão cobra

**Entrelinha = corpo + 8.** Uma exceção escrita: o corpo de leitura fica em razão
**1,5**. No mobile ela atravessa como **razão, nunca como número** — `20/30` vira
`18/27`, não `18/30`.

**Raio zero em ação e estrutura** — botão, campo, card, lista, folha. **Pílula em
dado** — tag, chip, trilho, interruptor. *Eu errei isto*: zerei o raio de chips de
formato citando "raio zero é REGRA". A regra existe e **não cobre o caso**. Citar
regra verdadeira para caso que ela não governa passa na revisão, e é pior que
inventar regra.

**Cor só em três endereços:** nota, capa, estado. Fora deles o sistema é preto e
branco neutro.

**Filete e limite de controle são dois tokens, não um.** `--border`
(`border/subtle`) é separador decorativo, e a WCAG não lhe cobra mínimo.
`--borda-controle` é limite de botão, campo e rádio, e **pede 3,0**. O filete dá
**2,04** sobre a superfície e reprova.

Isso foi achado construindo o botão, e o desenho já sabia sem ter nome para
dizer: a borda do rádio e a tinta dos ícones vinham em `#878787`, que passa. Eu
troquei por `border/subtle` chamando de correção, e piorei — **terceira vez no
mesmo dia em que um valor solto carregava uma distinção que o sistema não
tinha**.

**Seleção é degrau de superfície, não matiz.** O acento estava a 11,9 de distância
perceptual do estado de perigo — abaixo do limiar de ~15 em que duas cores se
confundem.

---

## 4 · Estado vem do contrato, nunca da tela

```js
import { situacao, acompanhar } from "../../contrato/api.js";
```

O backend carrega **sete campos de estado**; a tela mostra **um**. A redução mora
em `contrato/estado.js` e acontece uma vez. Reduzir de novo na tela é como duas
telas passam a discordar sobre o mesmo arquivo — a fila diz *pronto* e a estante
diz *convertendo*, porque cada uma olhou um campo diferente.

**Contagem é derivada da lista, nunca mantida.** Campo de status que alguém
atualiza é a primeira coisa que fica desatualizada, e aí o filtro mente com a
culpa do usuário.

**A mensagem de erro vem do backend e é mostrada.** Trocar por "falhou" esconde a
única informação que resolve o problema. Foi mostrando a mensagem que apareceu
*"Job deve estar analisado antes de converter"* — um bug que estava escondido.

---

## 5 · A rota, e por que ela precisa existir sozinha

Acrescente em `web/src/lugares.js` se for um lugar; em `web/src/App.jsx` se for
uma tela dentro de um.

**Cada tela tem de abrir direto.** Sem isso o portão precisa clicar pela jornada
inteira para chegar na última, e uma falha no upload viraria *"a estante tem
defeito de contraste"*. **Tela medível sozinha é a diferença entre um portão que
diz onde está o problema e um que só diz que existe.**

Lugar desenhado e não construído usa `AindaNao` e **diz isso**. Botão que não
responde ensina o usuário a não clicar; tela em branco parece defeito. Nunca *"em
breve"* — não informa nada e não pode ser desmentido.

---

## 6 · Escrever os desvios, sempre

`web/src/jornadas/DESVIOS.md`. **Nada é melhorado em silêncio.**

O desenho é anterior ao sistema, então ele e o sistema discordam. Onde o desenho
traz valor solto que o sistema já nomeou, o token vence — porque é isso que o
portão vai cobrar. Mas a razão fica escrita, com o número.

Exemplo do que já foi encontrado assim: as três cores de estado do desenho
**falham AA** e as três do sistema passam. `ok` 2,98 contra 4,77. A substituição
não foi coerência, foi conserto.

---

## 7 · Rodar o portão nos DOIS temas

```bash
node scripts/medir.mjs "http://localhost:5180/sua-rota" 1440 1200 scripts/portao.js
node scripts/medir.mjs "http://localhost:5180/sua-rota" 1440 1200 scripts/portao.js --escuro
node scripts/tokens.mjs      # procedência dos tokens, que o portão não vê
```

```
0 cor fora do sistema · 0 contraste abaixo · 0 corpo fora da escala
0 tinta cravada em ícone
```

**O escuro não é o claro invertido.** Ele tem valores próprios, e os estados são
outros: o `estado/ok` do claro dá 3,64 sobre fundo escuro e reprova. O destaque
da leitura também muda — no escuro ele escurece e a tinta continua clara, porque
destaque claro numa página escura vira mancha de luz.

Sem `--escuro` um tema nasce com preto puro e branco puro sem ninguém ver. Já
nasceu assim uma vez.

**O `tokens.mjs` vê o que o portão não vê.** O portão mede a página SERVIDA, então
variável declarada e não usada não aparece nele — e `web/tokens/` carrega 501
declarações com valor do template, que explodem no dia em que alguém as usar.

Quando ele acusar, a pergunta não é *"como faço passar"*.

O número do marcador de notas deu **1,05** de contraste. Na tela estava certo,
sobre o balão escuro. **Não era falso alarme:** a forma do balão era irmã
absolutamente posicionada, então a árvore dizia que o fundo era a página. **Árvore
que só fica certa quando pintada é árvore que leitor de tela, seletor e
instrumento nenhum consegue ler.** O conserto foi pôr a máscara no próprio
elemento — e o código ficou menor.

---

## O que este playbook não cobre

**Autenticação.** A `AUTH-001` está `proposed`, não aceita.

**Os componentes do design system.** Existem 11 construídos em `@ds/components-react`
e o Storybook os mostra (`cd ~/dev/mekora-ds && npm run storybook`). As quatro
telas feitas usam **tokens e não componentes**, porque são editoriais e
específicas. As telas de Conta, Preferências e Ajuda provavelmente devem usar os
componentes — isso ainda não foi tentado.

**A história "Color Palette" do Storybook está quebrada** por incompatibilidade
pré-existente: ela espera `foundation.brand` num artefato de build que o pipeline
atual não emite. Não é da nossa marca. A documentação de cor está melhor em
`docs/DESIGN-SYSTEM.md`.

## O portão não vê botão morto — o `botoes.mjs` vê

É a classe de defeito que mais apareceu neste produto, e sempre do mesmo jeito:
um `<button>` desenhado, montado, medido e **verde** — sem `onClick`. Ele parece
ativo, aceita o clique e não responde, e quem usa aprende a não clicar.

O portão não pega: um botão morto tem a mesma cor, o mesmo corpo e o mesmo
contraste de um botão vivo. Os que foram achados na mão, um a um, ao longo de
semanas:

- os quatro recortes da estante (Tudo / Com nota / No Kindle / Quadrinhos)
- o alternador Capas / Estante em 3D
- "Notas" na ficha da estante
- "Marcadores", "Buscar no livro" e "Conta" no cromo da leitura

Cada um ficou meses na tela.

```bash
node scripts/botoes.mjs
```

Conta como vivo: `onClick`, `onPointerDown`, `type="submit"`, `{...resto}`, ou
`disabled` — o desligado é honesto, e a regra pede que ele diga por quê no
`title`.

**Ele ignora comentários.** A primeira versão acusou três, dois deles
descrevendo defeitos já corrigidos: este repositório explica os defeitos no
próprio código, e as explicações citam o que estava errado. Consertar o texto
para o instrumento seria o avesso; o instrumento é que aprende a não ler
comentário.

Roda dentro de `scripts/auditoria.sh`, junto do `classes.mjs`, antes de o
navegador subir.
