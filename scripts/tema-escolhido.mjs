/* Gera o CSS do tema ESCOLHIDO a partir do tema do SISTEMA.
 *
 *     node scripts/tema-escolhido.mjs
 *     node scripts/tema-escolhido.mjs --conferir
 *
 * O PROBLEMA
 * ==========
 * `tokens/theme.css` é gerado pelo Design System Controller e diz, no topo, que
 * não deve ser editado à mão. Ele traz os valores do tema escuro dentro de um
 * `@media (prefers-color-scheme: dark)`, que responde ao SISTEMA.
 *
 * Falta o caminho da ESCOLHA: quem usa o computador no claro e escolhe escuro
 * no Mekora. Nenhuma preferência de sistema alcança esse caso, e sem ele a
 * opção era guardada e não fazia nada — justamente para quem a escolheria.
 *
 * POR QUE GERAR, E NÃO COPIAR
 * ===========================
 * Copiar os cinquenta e poucos valores criaria uma segunda lista, que
 * divergiria na primeira vez que o DS fosse regerado — e a divergência
 * apareceria só para quem escolheu o tema à mão, que é a minoria que ninguém
 * testa.
 *
 * Assim o arquivo sai do mesmo lugar, e `--conferir` acusa quando ele
 * envelheceu.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = join(raiz, 'web/tokens/theme.css');
const SAIDA = join(raiz, 'web/src/estilo/tema-escolhido.css');

const MARCA = '@media (prefers-color-scheme: dark) {';

function extrair(css) {
  const i = css.indexOf(MARCA);
  if (i === -1) throw new Error('bloco de tema escuro não encontrado em theme.css');

  // Conta chaves a partir da abertura do @media, para achar o fecho dele.
  let nivel = 0;
  let j = i + MARCA.length - 1;
  do {
    if (css[j] === '{') nivel++;
    else if (css[j] === '}') nivel--;
    j++;
  } while (nivel > 0 && j < css.length);

  const bloco = css.slice(i, j);

  /* Dentro do @media há um seletor `:root:not([data-tema="claro"])`. O miolo
   * dele é o que interessa: as declarações. */
  const abre = bloco.indexOf('{', bloco.indexOf(':root'));
  const fecha = bloco.lastIndexOf('}', bloco.lastIndexOf('}') - 1);
  return bloco.slice(abre + 1, fecha).trim();
}

const declaracoes = extrair(readFileSync(FONTE, 'utf8'));

const saida = `/* GERADO por scripts/tema-escolhido.mjs — não editar à mão.
 *
 * Os mesmos valores que \`tokens/theme.css\` aplica quando o SISTEMA está
 * escuro, aplicados aqui quando a PESSOA escolheu escuro. São três situações, e
 * o \`@media\` sozinho cobre duas:
 *
 *   sistema escuro, nada escolhido   -> o @media
 *   sistema escuro, escolheu claro   -> o :not([data-tema="claro"]) do @media
 *   sistema claro,  escolheu escuro  -> ESTE ARQUIVO
 *
 * Para atualizar depois de regerar o Design System:
 *   node scripts/tema-escolhido.mjs
 */
:root[data-tema="escuro"] {
${declaracoes}
}
`;

if (process.argv.includes('--conferir')) {
  let atual = '';
  try {
    atual = readFileSync(SAIDA, 'utf8');
  } catch {
    /* não existe ainda */
  }
  if (atual !== saida) {
    console.log('FORA DE DATA — rode `node scripts/tema-escolhido.mjs`');
    console.log('  web/src/estilo/tema-escolhido.css');
    process.exit(1);
  }
  console.log('em dia');
} else {
  writeFileSync(SAIDA, saida, 'utf8');
  const quantas = declaracoes.split(';').filter((l) => l.trim()).length;
  console.log(`escrito: web/src/estilo/tema-escolhido.css (${quantas} declarações)`);
}
