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
  console.log(`nenhuma classe definida em dois arquivos, e nenhuma do ${HTML} invadida.`);
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
