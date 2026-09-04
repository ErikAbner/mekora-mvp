/* Acha o que a folha de telefone MUDA em relação à base.
 *
 *     node scripts/telefone.mjs
 *     node scripts/telefone.mjs --provar
 *
 * POR QUE ISTO EXISTE
 * ===================
 * Três telas conferidas contra o Figma em 04/09, e nas TRÊS o mesmo padrão: o
 * CSS base estava certo, e uma `@media` de telefone mexia no que o desenho não
 * mexe.
 *
 *   Estante   título 24/32 → 20/28, e o autor 20/30 → 18/27. O nó do telefone
 *             (`966:25145`) não encolhe nada: pede os mesmos 24/32 do desktop.
 *   Leitura   entrelinha do título 72 → 64. O nó (`966:29657`) mantém 72 no
 *             corpo menor. O comentário dizia que o 56 vinha "como o desenho
 *             mobile pede", e vinha — a entrelinha desceu junto sozinha.
 *   Conta     a ilustração DESLIGADA (`display: none`), com o argumento de que
 *             272px de ornamento não cabem. E cabem: o nó do telefone
 *             (`966:25339`) põe a mesma peça em 138×164, metade do desktop.
 *
 * O erro tem uma forma só, e ela é sedutora: **"a tela é menor, logo tudo
 * encolhe"**. Às vezes o desenho encolhe o corpo e mantém a entrelinha; às
 * vezes troca a peça por uma menor em vez de apagá-la. Quem deduz em vez de ler
 * acerta a direção e erra a medida.
 *
 * O QUE ELE FAZ, E O QUE NÃO FAZ
 * ==============================
 * Ele NÃO chama o Figma — nenhum instrumento de linha de comando aqui chama. O
 * que ele faz é entregar a LISTA EXATA do que conferir: cada propriedade que
 * uma `@media` de telefone sobrescreve, com o valor da base ao lado.
 *
 * Isso troca "achar tela a tela" por "conferir esta lista contra o nó de
 * telefone". A Fase 4 leva as duas medidas de cada linha na mão.
 *
 * DUAS FORMAS GANHAM DESTAQUE, porque foram as três que apareceram:
 *   ENCOLHEU    corpo ou entrelinha menor que a base
 *   DESLIGOU    `display: none` sobre algo que a base mostra
 *
 * O resto entra como `mudou`, sem julgamento: mudar no telefone é o normal, e
 * um relatório que acusa o normal não se lê duas vezes.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const PASTAS = ['web/src/jornadas', 'web/src/componentes', 'web/src/estilo', 'web/src/leitor'];
const TELEFONE = 767;   /* o corte que este projeto usa */

/* Só as propriedades que o desenho FIXA. `flex-direction`, `order` e afins
   mudam de propósito no telefone e não se comparam com nó nenhum. */
const OLHADAS = new Set([
  'font-size', 'line-height', 'font-weight', 'letter-spacing',
  'padding', 'padding-block', 'padding-inline', 'gap', 'row-gap', 'column-gap',
  'display', 'inline-size', 'block-size', 'aspect-ratio',
  'border-radius', 'border-width',
]);

function arquivos() {
  const saida = [];
  for (const pasta of PASTAS) {
    let itens;
    try { itens = readdirSync(join(RAIZ, pasta), { withFileTypes: true }); } catch { continue; }
    for (const item of itens) {
      if (item.isDirectory()) { PASTAS.push(join(pasta, item.name)); continue; }
      if (item.name.endsWith('.css')) saida.push(join(pasta, item.name));
    }
  }
  return saida;
}

/* Percorre chaves contando profundidade, para saber quando se está dentro de
   uma `@media` e qual. Sem isto, uma regra de telefone parece regra base. */
function varrer(css) {
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const base = new Map();      /* seletor+prop -> valor */
  const noTelefone = [];       /* {seletor, prop, valor, linha} */
  let i = 0, linha = 1, midia = null, seletor = null, profundidade = 0, buffer = '';
  const linhaDe = (pos) => limpo.slice(0, pos).split('\n').length;

  while (i < limpo.length) {
    const c = limpo[i];
    if (c === '{') {
      const cabeca = buffer.trim(); buffer = ''; profundidade++;
      if (cabeca.startsWith('@media')) {
        const m = /max-width:\s*(\d+)px/.exec(cabeca);
        midia = m && +m[1] <= TELEFONE ? cabeca : (cabeca.startsWith('@media') ? 'outra' : midia);
      } else if (profundidade === 1 || (profundidade === 2 && midia)) {
        seletor = cabeca;
      }
      i++; continue;
    }
    if (c === '}') {
      profundidade--;
      if (profundidade === 0) { midia = null; seletor = null; }
      else if (profundidade === 1 && midia) seletor = null;
      buffer = ''; i++; continue;
    }
    if (c === ';' && seletor) {
      const decl = buffer.trim(); buffer = '';
      const j = decl.indexOf(':');
      if (j > 0) {
        const prop = decl.slice(0, j).trim().toLowerCase();
        const valor = decl.slice(j + 1).trim();
        if (OLHADAS.has(prop)) {
          for (const s of seletor.split(',').map((x) => x.trim())) {
            if (midia && midia !== 'outra') noTelefone.push({ seletor: s, prop, valor, linha: linhaDe(i) });
            else if (!midia) base.set(`${s}|${prop}`, valor);
          }
        }
      }
      i++; continue;
    }
    buffer += c; i++;
  }
  return { base, noTelefone };
}

const numero = (v) => { const m = /(-?[\d.]+)/.exec(v || ''); return m ? +m[1] : null; };

function achar(extra = []) {
  const achados = [];
  const fontes = arquivos().map((f) => [f, readFileSync(join(RAIZ, f), 'utf8')]).concat(extra);
  for (const [arquivo, css] of fontes) {
    const { base, noTelefone } = varrer(css);
    for (const o of noTelefone) {
      const antes = base.get(`${o.seletor}|${o.prop}`);
      let forma = 'mudou';
      if (o.prop === 'display' && o.valor === 'none') forma = 'DESLIGOU';
      else if (antes && ['font-size', 'line-height'].includes(o.prop)) {
        const a = numero(antes), d = numero(o.valor);
        if (a !== null && d !== null && d < a) forma = 'ENCOLHEU';
      }
      achados.push({ arquivo, ...o, antes: antes ?? '(sem base neste arquivo)', forma });
    }
  }
  const ordem = { DESLIGOU: 0, ENCOLHEU: 1, mudou: 2 };
  return achados.sort((a, b) => ordem[a.forma] - ordem[b.forma]);
}

if (process.argv.includes('--provar')) {
  const encolhe = [['(prova)', '.a { font-size: 24px; }\n@media (max-width: 767px) { .a { font-size: 20px; } }']];
  const cresce  = [['(prova)', '.a { font-size: 20px; }\n@media (max-width: 767px) { .a { font-size: 24px; } }']];
  const desliga = [['(prova)', '.b { display: block; }\n@media (max-width: 767px) { .b { display: none; } }']];
  const desktop = [['(prova)', '.c { font-size: 24px; }\n@media (min-width: 1024px) { .c { font-size: 20px; } }']];
  const so = (e) => achar(e).filter((x) => x.arquivo === '(prova)');
  const a = so(encolhe).some((x) => x.forma === 'ENCOLHEU' && x.antes === '24px');
  const b = so(cresce).every((x) => x.forma !== 'ENCOLHEU');
  const c = so(desliga).some((x) => x.forma === 'DESLIGOU');
  const d = so(desktop).length === 0;
  console.log(a && b && c && d
    ? 'CONTROLE NEGATIVO: acusa encolhimento, cala no crescimento, acha o desligado, e ignora media de desktop. Serve.'
    : `CONTROLE NEGATIVO FALHOU: encolheu=${a} cresceu=${b} desligou=${c} desktop=${d}`);
  process.exit(a && b && c && d ? 0 : 1);
}

const achados = achar();
if (!achados.length) { console.log('telefone: a folha de telefone nao sobrescreve nada do que o desenho fixa.'); process.exit(0); }
const porForma = {};
for (const a of achados) (porForma[a.forma] ??= []).push(a);
console.log(`telefone: ${achados.length} sobrescritas — confira cada uma contra o NO DE TELEFONE, e nao contra o de desktop.\n`);
for (const forma of ['DESLIGOU', 'ENCOLHEU', 'mudou']) {
  const lista = porForma[forma]; if (!lista) continue;
  console.log(`  ${forma}  (${lista.length})`);
  for (const a of lista.slice(0, 30)) {
    console.log(`      ${a.seletor}  ·  ${a.prop}: ${a.antes}  →  ${a.valor}`);
    console.log(`          ${a.arquivo}:${a.linha}`);
  }
  if (lista.length > 30) console.log(`      … e mais ${lista.length - 30}`);
  console.log('');
}
console.log('RELATORIO, nao portao: mudar no telefone e o normal. O que ele entrega e a LISTA do que conferir.');
process.exit(1);
