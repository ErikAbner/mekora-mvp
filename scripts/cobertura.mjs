/* A COBERTURA DA AUDITORIA É INVARIANTE, e não retrato.
 *
 *     node scripts/cobertura.mjs
 *
 * POR QUE ISTO EXISTE
 * ===================
 * A auditoria dizia "21 de 21" e nada conferia que 21 era o total certo. Uma
 * tela nova que esquecesse o par em `DE_DENTRO` faria a rodada cobrir 21 de 22 e
 * continuar dizendo 21 de 21 — completo por DENOMINADOR MÓVEL, que é a forma de
 * cobertura que sempre fecha.
 *
 * Aqui o total vem da fonte: as rotas declaradas no `App.jsx`. O conjunto
 * auditado vem do `auditoria.sh`. E a conferência FALHA NOS DOIS SENTIDOS, como
 * a do portão de dono:
 *
 *   rota nova sem cobertura        → vermelho, e diz o nome dela
 *   rota coberta que não existe    → vermelho também, porque um par apontando
 *                                    para tela que sumiu é cobertura de nada
 *
 * O QUE FICA DE FORA, e a razão de cada uma está escrita abaixo — porque
 * exceção sem razão vira lista de tudo que dá trabalho medir.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* As rotas ANINHADAS do App.jsx aparecem como caminho relativo. A tabela diz de
 * quem elas são filhas — e ela é curta porque só a Conta tem filhos. */
const MAE = { kindle: '/conta/kindle', preferencias: '/conta/preferencias', seguranca: '/conta/seguranca', privacidade: '/conta/privacidade' };

const FORA = {
  '*': 'o 404 do roteador, e não uma tela do produto',
  '/apresentacao': 'redirecionamento para `/`, mantido porque o endereço foi divulgado',
  '/sistema': 'instrumento, e só existe em DEV — o Rollup corta o ramo em produção',
};

const app = readFileSync(join(raiz, 'web/src/App.jsx'), 'utf8');
const declaradas = new Set();
for (const m of app.matchAll(/<Route\s+path="([^"]+)"/g)) {
  const p = m[1];
  declaradas.add(MAE[p] ?? p);
}
/* A rota-mãe da Conta é declarada com quebra de linha entre `<Route` e `path`, e
 * a expressão acima não a alcança. Ela existe, tem tela e é auditada. */
if ([...declaradas].some((r) => r.startsWith('/conta/'))) declaradas.add('/conta');

const alvo = [...declaradas].filter((r) => !(r in FORA)).sort();

/* O QUE A AUDITORIA COBRE, lido do script e não repetido aqui: duas listas que
 * dizem a mesma coisa divergem no dia em que alguém mexer só numa. */
const sh = readFileSync(join(raiz, 'scripts/auditoria.sh'), 'utf8');
const listas = ['PUBLICAS', 'SEM_CONTA', 'PRIVADAS']
  .map((n) => new RegExp(`^${n}="([^"]*)"`, 'm').exec(sh)?.[1] ?? '')
  .join(' ')
  .split(/\s+/)
  .filter(Boolean);

/* As três com `{LIVRO}` e as duas de dentro. */
const comLivro = [...sh.matchAll(/"(\/[a-z/]*\{LIVRO\})"/g)].map((m) => m[1].replace('{LIVRO}', ':id'));
/* ATÉ O FIM DA LINHA, e não até a próxima aspa: os seletores levam aspas
 * escapadas dentro (`a[href^=\"/nota/\"]`), e `[^"]*` parava na primeira delas.
 * A primeira versão desta linha leu só metade do `DE_DENTRO` e acusou
 * `/estudo/:id` como não coberta — o instrumento achando um buraco dele. */
const deDentro = (/^DE_DENTRO="(.*)"\s*$/m.exec(sh)?.[1] ?? '')
  .split(/\s+/).filter(Boolean)
  .map((par) => par.split('|')[0]);

/* A tela alcançada por `--dentro` é a do ITEM, e o par nomeia a LISTA. A tabela
 * traduz uma na outra, e ela é a única parte que precisa ser sabida aqui. */
const ITEM_DE = { '/notas': '/nota/:id', '/estudos': '/estudo/:id' };
const cobertas = new Set([...listas, ...comLivro, ...deDentro.map((r) => ITEM_DE[r] ?? r)]);

const semCobertura = alvo.filter((r) => !cobertas.has(r));
const cobreOQueNaoExiste = [...cobertas].filter((r) => !declaradas.has(r) && !(r in FORA)).sort();

console.log(`rotas de tela declaradas: ${alvo.length}`);
console.log(`cobertas pela auditoria:  ${alvo.filter((r) => cobertas.has(r)).length}`);
for (const [r, porque] of Object.entries(FORA)) console.log(`  fora: ${r.padEnd(16)} ${porque}`);

if (!semCobertura.length && !cobreOQueNaoExiste.length) {
  console.log(`\nA auditoria cobre ${alvo.length} de ${alvo.length}. O denominador vem do App.jsx.`);
  process.exit(0);
}

if (semCobertura.length) {
  console.log('\nROTA DE TELA QUE A AUDITORIA NÃO ALCANÇA:\n');
  for (const r of semCobertura) console.log(`  ${r}`);
  console.log('\nAcrescente em PUBLICAS/PRIVADAS, ou — se ela só se alcança por dentro —');
  console.log('num par `rota|seletor` em DE_DENTRO, e a tradução em ITEM_DE aqui.');
}
if (cobreOQueNaoExiste.length) {
  console.log('\nA AUDITORIA MEDE ROTA QUE NÃO EXISTE MAIS:\n');
  for (const r of cobreOQueNaoExiste) console.log(`  ${r}`);
  console.log('\nCobertura de rota que sumiu é cobertura de nada, e ela conta como coberta.');
}
process.exit(1);
