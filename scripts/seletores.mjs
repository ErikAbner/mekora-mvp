/* Cruza o alcance dos seletores em TODAS as rotas, e acusa quem não casa em
 * nenhuma.
 *
 *     scripts/prova.sh
 *     node scripts/seletores.mjs
 *
 * Uma regra que não casa numa rota não é notícia — `.canvas-nota` não existe na
 * Mesa, e é assim que tem de ser. Notícia é a regra que não casa em rota
 * NENHUMA: ou é código morto, ou é um modelo errado do DOM escrito com
 * confiança, e foi o segundo caso que deixou os dois atalhos do cabeçalho na
 * tela do telefone por meses.
 *
 * ESTE É UM RELATÓRIO, E NÃO UM PORTÃO — ainda.
 * ============================================
 * Ele sai com código 0 mesmo achando. A razão é honesta: o pacote tem centenas
 * de seletores, e uma parte dos que não casam hoje descreve estado que estas
 * rotas não alcançam — erro de rede, lista vazia, folha que só abre com dado que
 * a semente não tem. Transformar isso em portão sem triar cada um primeiro
 * ensinaria a ignorá-lo, que é a única forma de um portão morrer.
 *
 * O caminho para virar portão está escrito em `docs/ABERTO.md`: triar a lista
 * uma vez, guardar o resto como dívida conhecida — igual ao que o
 * `scripts/classes.mjs` faz — e então cobrar.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = process.env.MEKORA_WEB ?? 'http://localhost:5180';
const PROVA = process.env.MEKORA_PROVA ?? join(raiz, '.ver');

const ROTAS = ['/mesa', '/estante', '/canvas', '/estudos', '/notas', '/conta', '/conta/preferencias', '/conta/privacidade'];
const LARGURAS = [1440, 390];

const chave = () =>
  execFileSync(join(raiz, 'scripts/entrar-como-dono.sh'), {
    env: { ...process.env, MEKORA_PROVA: PROVA },
    encoding: 'utf8',
  }).split('\n')[0].trim();

const alcance = new Map();
let regras = 0;
const visitadas = [];

for (const largura of LARGURAS) {
  for (const rota of ROTAS) {
    let saida;
    try {
      saida = execFileSync('node', [
        join(raiz, 'scripts/medir.mjs'),
        `${WEB}/entrar/${chave()}`, String(largura), '1000',
        join(raiz, 'scripts/seletores.js'),
        `--depois=${WEB}${rota}`,
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      console.log(`  ${rota} @ ${largura}: não mediu`);
      continue;
    }
    const dado = JSON.parse(saida.slice(saida.indexOf('{')));
    regras = Math.max(regras, dado.regras);
    visitadas.push(`${rota} @ ${largura}`);
    for (const [sel, quantos] of Object.entries(dado.alcance)) {
      alcance.set(sel, Math.max(alcance.get(sel) ?? 0, quantos));
    }
    process.stdout.write(`  ${rota} @ ${largura}: ${Object.keys(dado.alcance).length} seletores\n`);
  }
}

const mortos = [...alcance.entries()].filter(([, q]) => q === 0).map(([s]) => s).sort();

console.log(`\n${visitadas.length} estados medidos, ${regras} regras, ${alcance.size} seletores distintos.`);
console.log(`${mortos.length} não casaram em estado nenhum:\n`);
for (const s of mortos) console.log(`  ${s}`);
console.log('\nRELATÓRIO, não portão. Cada linha é uma pergunta, não um veredito:');
console.log('código morto, ou modelo errado do DOM? A segunda é a que morde.');
