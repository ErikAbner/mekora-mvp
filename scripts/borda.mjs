/* Acha borda e raio fora do sistema.
 *
 *     node scripts/borda.mjs
 *     node scripts/borda.mjs --provar
 *
 * POR QUE ISTO EXISTE
 * ===================
 * O Erik pediu em 04/09, ao mandar uma lista de componentes de fora:
 *
 *   "n quero que eles tenham o poder de adicionar borda no nosso projeto, ou de
 *    adicionar cores sem antes consultar a gente, ja ocorreu isso outras vezes"
 *
 * A metade da COR já estava guardada: o `portao.js` reprova tinta e superfície
 * fora da lista de tokens, e em 04/09 ele reprovou as minhas próprias capas de
 * reserva até o Erik decidir que elas viravam família. A porta existe e fecha.
 *
 * A metade da BORDA não estava. O portão julga cor, contraste, escala
 * tipográfica e fonte servida — nunca espessura nem raio. E o `inventario.mjs`
 * só acusa peça reescrita quando a nova COLIDE com uma existente: uma borda
 * nova que não se pareça com nada passa pelos dois. Este arquivo fecha isso.
 *
 * O QUE O SISTEMA TEM, medido em 04/09
 * ====================================
 *   espessura   1px em 192 lugares, 2px em 13. Depois disso cai para 4px em
 *               quatro, 3px em um, e um caso de 8/13 que nem é borda.
 *   raio        `var(--radius, 0)` em 13 e `0` em 12 — `--radius` vale ZERO, o
 *               produto é de canto vivo. Fora disso, `999px` em cinco (cápsula)
 *               e `50%` em dois (ponto).
 *
 * O QUADRO CONFIRMA O 2. O nó `966:31540`, a faixa do veredito do Preparo, usa
 * `border-l-2` — dois pixels. As quatro barras de acento do código usam quatro.
 *
 * O QUE ELE NÃO ACUSA, e por quê
 * ==============================
 *   `50%`        é ponto e avatar, forma e não raio.
 *   a cápsula    o desenho TEM cápsula: o nó `966:31521` põe `rounded-[24px]`
 *                nos selos do Preparo. `999px` é como o código escreve isso, e
 *                é UM valor — plural de cápsula é que seria problema.
 *   o triângulo  `border-width: 8px 0 8px 13px` com lados transparentes é o
 *                truque de desenhar seta com borda. Não é moldura de nada, e
 *                acusá-lo ensinaria a ignorar a lista.
 *
 * DÍVIDA CONHECIDA
 * ================
 * Ele nasce com achados, e por isso RELATA em vez de derrubar — o mesmo caminho
 * que o `classes.mjs` e o `seletores.mjs` percorreram. Vira portão quando a
 * lista de hoje estiver triada; até lá, o que ele acusa aparece e não bloqueia.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const PASTAS = ['web/src/jornadas', 'web/src/componentes', 'web/src/estilo', 'web/src/leitor'];

const ESPESSURAS = new Set(['0', '0px', '1px', '2px', 'thin', 'medium', 'currentcolor']);
const RAIOS = new Set(['0', '0px', '50%', '999px', '9999px']);

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

const EH_BORDA = /^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-width)?$/;

/* O TRUQUE DA SETA. Quatro espessuras diferentes com lados transparentes não é
   moldura: é um triângulo desenhado com borda. Ele tem assinatura própria —
   mais de duas espessuras distintas na mesma declaração — e sai da conta. */
function ehTriangulo(valor) {
  /* Assinatura: atalho com tres ou mais lados E um lado ZERO. Triangulo feito
     com borda sempre tem um lado nulo — e o `transparent` que completa o truque
     costuma vir noutra declaracao, entao procura-lo aqui nao serve. Medido: a
     primeira versao pedia "mais de duas espessuras distintas" e deixou passar
     `8px 0 8px 13px`, que tem duas. */
  const partes = valor.trim().split(/\s+/);
  return partes.length >= 3 && partes.some((p) => /^0(px)?$/.test(p));
}

function achar(extra = []) {
  const achados = [];
  const fontes = arquivos().map((f) => [f, readFileSync(join(RAIZ, f), 'utf8')]).concat(extra);
  for (const [arquivo, cssBruto] of fontes) {
    const css = cssBruto.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const linhas = css.split('\n');
    for (let i = 0; i < linhas.length; i++) {
      for (const m of linhas[i].matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)) {
        const prop = m[1].trim(), valor = m[2].trim();
        if (prop === 'border-radius') {
          /* `var(--radius, 0)` tem espaco DENTRO. Partir por espaco produzia
             `var(--radius,` e `0)`, e o primeiro nao comeca com `var(` depois do
             corte — o controle negativo acusou o proprio sistema. Some-se a
             funcao inteira antes de olhar os pedacos. */
          const semVar = valor.replace(/var\([^)]*\)/g, ' ');
          for (const parte of semVar.split(/\s+/)) {
            const v = parte.trim().toLowerCase();
            if (!v || v.startsWith('var(') || RAIOS.has(v)) continue;
            achados.push({ arquivo, linha: i + 1, tipo: 'raio', valor: v, todo: valor.slice(0, 46) });
          }
          continue;
        }
        if (!EH_BORDA.test(prop)) continue;
        if (ehTriangulo(valor)) continue;
        for (const px of valor.match(/[0-9.]+px/g) || []) {
          if (ESPESSURAS.has(px)) continue;
          achados.push({ arquivo, linha: i + 1, tipo: 'espessura', valor: px, todo: `${prop}: ${valor}`.slice(0, 60) });
        }
      }
    }
  }
  return achados;
}

if (process.argv.includes('--provar')) {
  const bom = [['(prova)', '.x { border: 1px solid red; border-radius: var(--radius, 0); }\n.y { border-radius: 50%; }']];
  const ruimEspessura = [['(prova)', '.x { border-inline-start: 7px solid red; }']];
  const ruimRaio = [['(prova)', '.x { border-radius: 11px; }']];
  const seta = [['(prova)', '.x { border-width: 8px 0 8px 13px; border-color: transparent; }']];
  const so = (extra) => achar(extra).filter((a) => a.arquivo === '(prova)');
  const a = so(bom).length === 0;
  const b = so(ruimEspessura).some((x) => x.tipo === 'espessura' && x.valor === '7px');
  const c = so(ruimRaio).some((x) => x.tipo === 'raio' && x.valor === '11px');
  const d = so(seta).length === 0;
  console.log(a && b && c && d
    ? 'CONTROLE NEGATIVO: cala no que e do sistema, acusa espessura e raio de fora, e nao confunde o triangulo com borda. Serve.'
    : `CONTROLE NEGATIVO FALHOU: sistema=${a} espessura=${b} raio=${c} triangulo=${d}`);
  process.exit(a && b && c && d ? 0 : 1);
}

const achados = achar();
if (!achados.length) { console.log('borda: nenhuma espessura nem raio fora do sistema.'); process.exit(0); }
const porTipo = { espessura: [], raio: [] };
for (const a of achados) porTipo[a.tipo].push(a);
console.log(`borda: ${achados.length} fora do sistema — ${porTipo.espessura.length} de espessura, ${porTipo.raio.length} de raio.\n`);
for (const [tipo, lista] of Object.entries(porTipo)) {
  if (!lista.length) continue;
  console.log(`  ${tipo.toUpperCase()}  (${lista.length})`);
  for (const a of lista) console.log(`      ${a.valor.padEnd(6)} ${a.arquivo}:${a.linha}   ${a.todo}`);
  console.log('');
}
console.log('RELATORIO, ainda nao portao: a lista de hoje precisa de triagem antes de derrubar.');
console.log('O quadro ja respondeu uma: o no 966:31540 usa border-l-2, e o codigo usa 4px em quatro barras de acento.');
process.exit(1);
