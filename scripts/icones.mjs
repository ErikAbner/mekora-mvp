/* Onde cada ícone é usado, e qual deles é NAVEGAÇÃO.
 *
 *     node scripts/icones.mjs
 *     node scripts/icones.mjs --provar
 *
 * POR QUE ISTO EXISTE. O Erik autorizou usar ícones para preencher os quadrados
 * do Preparo com uma condição: "desde que o usuário não confunda com outra
 * possível tela ou nav, evitar ruído na comunicação / navegação". A condição é
 * verificável, e verificar de memória é como eu escolhi errado da primeira vez —
 * usei `estante` e `conta`, que são os dois itens da barra de lugares.
 *
 * A REGRA, em três degraus:
 *
 *   LUGAR    o ícone identifica um item de navegação (`lugares.js`, cabeçalho,
 *            menu da conta). Nunca decora conteúdo: quem o vê aprende que
 *            aquilo leva a algum lugar.
 *   ACAO     o ícone nomeia uma ação de alguma tela. Pode reaparecer, desde que
 *            signifique A MESMA COISA. `renomear` num campo de título é o mesmo
 *            renomear; `copiar` marcando "idioma" não é o mesmo copiar.
 *   LIVRE    ninguém usa ainda.
 *
 * CONTROLE NEGATIVO: a varredura tem de achar os ícones de navegação que
 * SABEMOS existir — mesa, estante, canvas, estudos vêm de `lugares.js`. Se ela
 * devolver menos que esses quatro, o seletor está errado e a lista de "livres"
 * não vale nada.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const RAIZ = new URL('..', import.meta.url).pathname;
const PASTA = RAIZ + 'web/publico/icones/';

/* Os arquivos onde um ícone significa NAVEGAÇÃO. Não é heurística: são os três
   lugares do produto que desenham menu. */
const DE_NAVEGACAO = ['lugares.js', 'componentes/Cabecalho.jsx', 'componentes/MenuDaConta.jsx'];

const icones = readdirSync(PASTA).filter((f) => f.startsWith('icone-') && f.endsWith('.svg'));
const linhas = execSync(
  `grep -rn "icone-[a-z-]*\\.svg" web/src --include=*.js --include=*.jsx || true`,
  { cwd: RAIZ, encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const onde = new Map();
for (const l of linhas) {
  const arq = l.slice(0, l.indexOf(':')).replace('web/src/', '');
  for (const m of l.matchAll(/icone-[a-z-]+\.svg/g)) {
    if (!onde.has(m[0])) onde.set(m[0], new Set());
    onde.get(m[0]).add(arq);
  }
}

const fora = { lugar: [], acao: [], livre: [] };
for (const i of icones) {
  const usos = [...(onde.get(i) || [])].sort();
  const nav = usos.filter((u) => DE_NAVEGACAO.includes(u));
  const nome = i.slice(6, -4);
  if (nav.length) fora.lugar.push({ nome, usos, nav });
  else if (usos.length) fora.acao.push({ nome, usos });
  else fora.livre.push({ nome, usos });
}

if (process.argv.includes('--provar')) {
  /* Os quatro lugares do produto. Se a varredura não os classifica como LUGAR,
     ela não está lendo o `lugares.js` — e aí "livre" é cegueira, não resposta. */
  const esperados = ['mesa', 'estante', 'canvas', 'estudos'];
  const achou = esperados.filter((e) => fora.lugar.some((x) => x.nome === e));
  const serve = achou.length === esperados.length;
  console.log(`  ${serve ? 'serve  ' : 'NAO SERVE'} icones  os quatro lugares como LUGAR: ${achou.join(', ') || 'nenhum'}`);
  console.log(serve
    ? '\nCONTROLE NEGATIVO: a varredura acha a navegacao que sabemos existir. Serve.'
    : '\nCONTROLE NEGATIVO FALHOU: sem achar os quatro lugares, a lista de livres nao vale nada.');
  process.exit(serve ? 0 : 1);
}

/* DOIS NOMES PARA UM DESENHO — o R-49.
 *
 * A biblioteca tem 27 arquivos e menos de 27 desenhos: pares byte a byte
 * iguais. O custo não é o disco, é a promessa: o código escreve
 * `icone-indice.svg` e a tela mostra o hambúrguer do menu — o glifo da
 * NAVEGAÇÃO servindo de rótulo de conteúdo, que é exatamente o que o Erik
 * proibiu. E o `Leitura.jsx` chegava a explicar a distinção que não existe.
 *
 * Isto só MEDE. Fechar o par pede desenho novo, e desenho é do Erik. O que
 * esta contagem impede é o par seguinte entrar sem ninguém ver. */
const porDesenho = new Map();
for (const f of icones) {
  const h = createHash('sha256').update(readFileSync(PASTA + f)).digest('hex');
  if (!porDesenho.has(h)) porDesenho.set(h, []);
  porDesenho.get(h).push(f);
}
const gemeos = [...porDesenho.values()].filter((g) => g.length > 1);

console.log(`icones: ${icones.length} arquivos, ${porDesenho.size} desenhos distintos\n`);
if (gemeos.length) {
  console.log(`  NOMES SEM DESENHO PROPRIO  (${gemeos.length} par(es)) — R-49`);
  for (const g of gemeos) console.log(`      ${g.join('  ==  ')}`);
  console.log('');
}
for (const [classe, titulo, aviso] of [
  ['lugar', 'LUGAR', 'nunca decoram conteudo — quem os ve aprende que aquilo leva a algum lugar'],
  ['acao', 'ACAO', 'podem reaparecer, desde que signifiquem a mesma coisa'],
  ['livre', 'LIVRE', 'ninguem usa ainda'],
]) {
  const lista = fora[classe];
  console.log(`  ${titulo}  (${lista.length}) — ${aviso}`);
  for (const x of lista) {
    console.log(`      ${x.nome.padEnd(14)} ${x.usos.join(', ') || '—'}`);
  }
  console.log('');
}
