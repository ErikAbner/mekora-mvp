/* Link que aponta para rota que nao existe.
 *
 * Um link morto e pior que um link a menos: ele ensina a pessoa a nao clicar. E
 * o roteador nao reclama — ele cai no `*`, que e a tela de nao encontrado, e a
 * unica pessoa que descobre e quem clicou.
 *
 * Le os `to=` e `href=` internos do codigo e confere contra as rotas que o
 * App.jsx declara. Rota com `:id` casa por prefixo.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('../web/src', import.meta.url).pathname;

const arquivos = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : /\.jsx?$/.test(n) ? [p] : [];
  });

const app = readFileSync(join(RAIZ, 'App.jsx'), 'utf8');
const rotas = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
/* Os lugares que o roteador monta a partir da lista, e nao de um `path=` fixo. */
const lugares = readFileSync(join(RAIZ, 'lugares.js'), 'utf8');
rotas.push(...[...lugares.matchAll(/rota:\s*"([^"]+)"/g)].map((m) => m[1]));

const existe = (destino) => {
  const limpo = destino.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  return rotas.some((r) => {
    if (r === '*') return false;
    if (r === limpo) return true;
    if (!r.includes(':')) return false;
    const re = new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '$');
    return re.test(limpo);
  });
};

const mortos = [];
for (const f of arquivos(RAIZ)) {
  const txt = readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/(?:to|href)=(?:"([^"]+)"|\{`([^`$]+)`\})/g)) {
    const destino = m[1] ?? m[2];
    if (!destino.startsWith('/')) continue;   // externo ou ancora: nao e rota
    if (!existe(destino)) {
      const linha = txt.slice(0, m.index).split('\n').length;
      mortos.push(`${f.replace(RAIZ, 'web/src')}:${linha} → ${destino}`);
    }
  }
}

if (mortos.length) {
  console.error(`${mortos.length} link(s) para rota que nao existe:`);
  for (const m of mortos) console.error('  ' + m);
  process.exit(1);
}
console.log(`nenhum link morto. ${rotas.length} rotas declaradas.`);
