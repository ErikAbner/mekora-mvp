/* Acha classe CSS definida em mais de um arquivo de tela.
 *
 *     node scripts/classes.mjs
 *
 * POR QUE ISTO EXISTE
 * ===================
 * Os CSS das jornadas entram todos no mesmo pacote e dividem um espaço de nomes
 * global. Duas telas que definem `.nota-origem` não geram erro: a última
 * carregada vence, e a outra regra desaparece sem aviso.
 *
 * Aconteceu duas vezes em 31/08. `.rodape` — eu criei um componente com o nome
 * de um `<footer>` que já existia, e meu fundo pintou o dele. E `.nota-origem`,
 * onde a definição de `notas.css` apagava a do Canvas e derrubava o contraste
 * para 2,53 sobre o pastel escuro.
 *
 * Nenhuma das duas apareceria lendo o código: os arquivos estão certos
 * separados, e erram juntos.
 *
 * O QUE ELE NÃO ACUSA
 * ===================
 * Classe definida uma vez e usada em várias telas — isso é reúso, e é o certo.
 * O problema é a mesma classe DEFINIDA em dois lugares com valores diferentes.
 *
 * A SEGUNDA PERGUNTA, DE 03/09
 * ============================
 * O `index.html` ganhou um esqueleto — a forma que aparece enquanto o pacote
 * baixa — com estilo embutido num `<style>`. As regras eram escopadas
 * (`#esqueleto .barra`), e escopar deveria bastar. Não bastou: `mesa-cheia.css`
 * define `.barra` SOLTA, como a barra de progresso de 4 pixels de altura, e ela
 * entrou por cima. O esqueleto mediu 32 pixels de altura em vez de 112.
 *
 * A lição é que escopar protege a SUA regra de vazar, e não protege você da
 * regra solta de outra pessoa. Então a segunda pergunta é outra: alguma classe
 * USADA no `index.html` está DEFINIDA solta numa folha de tela? Se está, o
 * esqueleto vai receber estilo que ninguém escreveu para ele.
 *
 * A TERCEIRA PERGUNTA, DE 03/09 — A CLASSE DE FORA
 * ================================================
 * As duas de cima olham o CSS. Esta olha o JSX, e é o buraco por onde passou o
 * defeito mais caro da semana: `<span className="conta">` na barra da escolha do
 * Canvas casou `.conta` do `conta.css` — o layout da tela de Conta, com 128px de
 * recheio de cada lado. A barra virou um bloco de 292px de altura.
 *
 * Nenhuma das duas primeiras pega: `.conta` está definida em UM arquivo só, e
 * não aparece no `index.html`. A colisão é entre a DEFINIÇÃO num módulo e o USO
 * noutro.
 *
 * Então: classe usada no JSX de um módulo, não definida na folha dele nem no
 * alicerce (`base.css`, tokens), e definida na folha de OUTRO módulo. O par é
 * por convenção de nome — `Canvas.jsx` ↔ `canvas.css`,
 * `ConfiguracoesArquivo.jsx` ↔ `configuracoes-arquivo.css` —, que é a convenção
 * que este repositório já segue.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Só as folhas de tela e de componente: `base.css` e os tokens definem o
 * alicerce, e é justamente o papel deles serem usados por todos. */
const PASTAS = ['web/src/jornadas', 'web/src/componentes'];

const onde = new Map();

for (const pasta of PASTAS) {
  const dir = join(raiz, pasta);
  for (const arq of readdirSync(dir).filter((f) => f.endsWith('.css'))) {
    const css = readFileSync(join(dir, arq), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    /* Só o seletor de classe SOLTO no começo da regra. `.nota-canvas .nota-origem`
     * é escopado de propósito e não conflita — é essa a saída, não o problema. */
    for (const m of css.matchAll(/(^|[},])\s*((?:\.[\w-]+)(?:\s*,\s*\.[\w-]+)*)\s*\{/g)) {
      for (const sel of m[2].split(',')) {
        const nome = sel.trim();
        if (!/^\.[\w-]+$/.test(nome)) continue;
        if (!onde.has(nome)) onde.set(nome, new Set());
        onde.get(nome).add(`${pasta.split('/').pop()}/${arq}`);
      }
    }
  }
}

/* AS CLASSES DO ESQUELETO, conferidas contra as folhas de tela.
 *
 * `onde` já tem o mapa de quem define o quê; aqui só se pergunta quais dos
 * nomes usados no HTML aparecem lá — soltos, que é a forma que vaza. */
const HTML = 'web/index.html';
const html = readFileSync(join(raiz, HTML), 'utf8');
const usadas = new Set();
for (const m of html.matchAll(/class="([^"]+)"/g)) {
  for (const c of m[1].split(/\s+/)) if (c) usadas.add(`.${c}`);
}
const invadidas = [...usadas].filter((c) => onde.has(c)).sort();

/* ─── A CLASSE DE FORA ──────────────────────────────────────────────────────
 *
 * `onde` diz quem DEFINE cada classe. Aqui se pergunta quem USA, e se o par
 * bate.
 */
const ALICERCE = ['web/src/estilo', 'web/tokens'];

/* O VOCABULÁRIO COMPARTILHADO, e ele é curto de propósito.
 *
 * Quatro classes que toda tela usa e nenhuma tela é dona: `.dado` é a forma de
 * um número, `.mesa` é o contêiner de página, `.botao` e `.campo` são as formas
 * de um componente usadas onde o componente não cabe — um `<a>` que parece botão
 * não pode ser `<Botao>`.
 *
 * Acrescentar um nome aqui é uma DECISÃO, não um jeito de calar o portão: é
 * declarar que aquele nome pertence a todo mundo, e que quem mexer nele mexe em
 * toda tela. */
const VOCABULARIO = new Set(['.dado', '.mesa', '.botao', '.campo']);

/* A DÍVIDA CONHECIDA, levantada em 03/09 quando esta checagem nasceu.
 *
 * Vinte e quatro usos que já estavam lá. Nenhum deles é o `.conta` — aquele foi
 * consertado —, e cada um é um pedaço de estilo que vem de uma tela que ninguém
 * abriu no arquivo que o usa. A lista existe para o portão poder ficar VERDE hoje
 * e vermelho amanhã: sem ela, ele nasceria vermelho, e portão que nasce vermelho
 * é portão que ninguém roda.
 *
 * ELA SÓ ENCOLHE. Tirar uma linha daqui é consertar um caso; acrescentar uma é
 * dizer em voz alta que se está criando o defeito de novo. */
const CONHECIDAS = new Set([
  'componentes/TrazerDoKindle.jsx .campo-arquivo',
  'componentes/TrazerDoKindle.jsx .importou-livros',
  'componentes/TrilhaLinhas.jsx .indice',
  'jornadas/Canvas.jsx .livro-texto',
  'jornadas/Canvas.jsx .nota-acoes',
  'jornadas/Canvas.jsx .nota-origem',
  'jornadas/Canvas.jsx .nota-quando',
  'jornadas/Canvas.jsx .nota-trecho',
  'jornadas/Conta.jsx .conta-erro',
  'jornadas/ContaKindle.jsx .campo-ajuda',
  'jornadas/ContaKindle.jsx .conta-painel',
  'jornadas/ContaKindle.jsx .conta-secao',
  'jornadas/ContaSeguranca.jsx .conta-erro',
  'jornadas/ContaSeguranca.jsx .conta-painel',
  'jornadas/ContaVisao.jsx .campo-arquivo',
  'jornadas/ContaVisao.jsx .conta-erro',
  'jornadas/ContaVisao.jsx .conta-painel',
  'jornadas/EstudoPagina.jsx .estudos-erro',
  'jornadas/Livro.jsx .recortes',
  'jornadas/MesaCheia.jsx .recortes',
  'jornadas/Privacidade.jsx .conta-condicao',
  'jornadas/Privacidade.jsx .conta-erro',
  'jornadas/Privacidade.jsx .conta-nota',
  'jornadas/Privacidade.jsx .marca-arquivo',
]);
const globais = new Set();
for (const pasta of ALICERCE) {
  let arqs = [];
  try { arqs = readdirSync(join(raiz, pasta)).filter((f) => f.endsWith('.css')); } catch { continue; }
  for (const arq of arqs) {
    const css = readFileSync(join(raiz, pasta, arq), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/\.([\w-]+)/g)) globais.add(`.${m[1]}`);
  }
}

/* `MenuDaConta.jsx` → `menu-da-conta.css`. É a convenção do repositório, e é
 * ela que define o que é "a folha DESTE módulo". */
const folhaDe = (jsx) =>
  jsx.replace(/\.jsx$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() + '.css';

const deFora = [];
const divida = [];

for (const pasta of PASTAS) {
  const dir = join(raiz, pasta);
  for (const arq of readdirSync(dir).filter((f) => f.endsWith('.jsx'))) {
    const jsx = readFileSync(join(dir, arq), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    const curto = `${pasta.split('/').pop()}/${folhaDe(arq)}`;

    /* AS FOLHAS QUE ESTE MÓDULO IMPORTA contam como dele: um componente que
     * importa a folha de outro está declarando a dependência, e declarada ela
     * deixa de ser surpresa. */
    const minhas = new Set([curto]);
    for (const m of jsx.matchAll(/import\s+["']\.\/([\w.-]+\.css)["']/g)) {
      minhas.add(`${pasta.split('/').pop()}/${m[1]}`);
    }

    /* Só o `className` literal. Template com `${}` entra pelo pedaço estático,
     * que é onde os nomes soltos aparecem. */
    const usadas_ = new Set();
    for (const m of jsx.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const bruto = (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, ' ');
      for (const c of bruto.split(/\s+/)) if (/^[\w-]+$/.test(c)) usadas_.add(`.${c}`);
    }

    for (const nome of usadas_) {
      if (globais.has(nome) || VOCABULARIO.has(nome)) continue;
      const donos = onde.get(nome);
      if (!donos) continue;                       // não é de folha de tela: segue
      if ([...donos].some((d) => minhas.has(d))) continue;   // é dele, ou importada
      const quem = `${pasta.split('/').pop()}/${arq}`;
      if (CONHECIDAS.has(`${quem} ${nome}`)) { divida.push(`${quem} ${nome}`); continue; }
      deFora.push({ jsx: quem, nome, donos: [...donos].sort() });
    }
  }
}

/* A DÍVIDA QUE SUMIU também é notícia: quem consertou um caso deve poder tirar a
 * linha da lista, e o portão avisa quando ela ficou velha. */
const curadas = [...CONHECIDAS].filter((c) => !divida.includes(c));
if (curadas.length) {
  console.log('DÍVIDA JÁ CONSERTADA — tire estas linhas de `CONHECIDAS`:\n');
  for (const c of curadas.sort()) console.log(`  ${c}`);
  console.log('');
}

if (deFora.length) {
  console.log('CLASSE USADA NUM MÓDULO E DEFINIDA SÓ NA FOLHA DE OUTRO:\n');
  for (const d of deFora.sort((a, b) => a.jsx.localeCompare(b.jsx) || a.nome.localeCompare(b.nome))) {
    console.log(`  ${d.jsx} usa ${d.nome}`);
    for (const dono of d.donos) console.log(`      definida em ${dono}`);
  }
  console.log('\nO estilo vem de uma tela que ninguém abriu aqui, e muda quando ELA mudar.');
  console.log('Dê à classe o prefixo do componente, ou importe a folha e assuma a dependência.');
  process.exit(1);
}

const brigando = [...onde.entries()]
  .filter(([, arqs]) => arqs.size > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));

if (invadidas.length) {
  console.log(`CLASSES DO ${HTML} QUE UMA FOLHA DE TELA TAMBÉM DEFINE:\n`);
  for (const nome of invadidas) {
    console.log(`  ${nome}`);
    for (const a of [...onde.get(nome)].sort()) console.log(`      ${a}`);
  }
  console.log('\nO esqueleto do HTML vai receber estilo escrito para outra coisa,');
  console.log('e escopar a regra dele não resolve — quem vaza é a outra.');
  console.log('Dê um nome que só exista ali (o prefixo `esqueleto-`).');
  process.exit(1);
}

if (!brigando.length) {
  console.log(`nenhuma classe definida em dois arquivos, nenhuma do ${HTML} invadida,`);
  console.log(`e nenhuma classe de fora além das ${divida.length} conhecidas.`);
  process.exit(0);
}

console.log('CLASSES DEFINIDAS EM MAIS DE UM ARQUIVO:\n');
for (const [nome, arqs] of brigando) {
  console.log(`  ${nome}`);
  for (const a of [...arqs].sort()) console.log(`      ${a}`);
}
console.log('\nA última carregada vence, e a outra some sem erro.');
console.log('Escope uma delas (`.contexto .classe`) ou dê nomes diferentes.');
process.exit(1);
