/* Acha componente REESCRITO — a peça nova que já existia com outro nome.
 *
 *     node scripts/inventario.mjs
 *
 * POR QUE ISTO EXISTE
 * ===================
 * Dois dos trinta e oito itens da crítica do Erik de 01–02/09 são o MESMO
 * defeito, e é este:
 *
 *   7. "Você trocou o ícone da Estante, o que não faz sentido — existem
 *       componentes para isso"
 *   9. "A pesquisa é MENOR e se expande quando o usuário tenta pesquisar —
 *       você não respeitou o componente que já existia e criou outro por cima"
 *
 * O sistema de design estava no lugar quando as duas aconteceram. Não faltou
 * biblioteca: faltou alguém ser OBRIGADO a consumi-la. Um sistema que ninguém
 * é obrigado a usar não é sistema, é sugestão — e sugestão perde para a pressa
 * toda vez.
 *
 * O `classes.mjs` não pega isto, e a diferença importa: ele acha a mesma classe
 * definida em dois arquivos. Aqui as classes têm nomes DIFERENTES. `.busca` e
 * `.estante-procura` não colidem em lugar nenhum — elas apenas são a mesma
 * peça desenhada duas vezes, e é por isso que uma delas está errada e ninguém
 * percebeu.
 *
 * O QUE É "A MESMA PEÇA"
 * ======================
 * A assinatura visual: o conjunto de declarações que dão a APARÊNCIA — borda,
 * fundo, raio, sombra, recheio, corpo, peso, altura mínima, vão. Layout de
 * posição (grid-area, position, top, z-index) fica de fora de propósito: duas
 * peças iguais em lugares diferentes continuam sendo a mesma peça, e é
 * exatamente esse o caso do 9.
 *
 * PISO DE QUATRO
 * ==============
 * Uma regra com duas declarações casa com dezenas por acidente. O piso de
 * quatro propriedades de aparência é o que separa "mesma peça" de "duas regras
 * curtas que por acaso usam o mesmo cinza". Sem ele o instrumento cospe uma
 * lista que ninguém lê duas vezes, e um portão que se aprende a ignorar já
 * morreu — está escrito no `seletores.mjs` e vale aqui igual.
 *
 * CONTROLE NEGATIVO
 * =================
 *     node scripts/inventario.mjs --provar
 *
 * Injeta um par sabidamente duplicado e confirma que o instrumento o acha. Uma
 * medida que nunca foi vista falhando pelo motivo certo não é medida: é um
 * verde por omissão esperando a vez.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const PASTAS = ['web/src/jornadas', 'web/src/componentes', 'web/src/estilo', 'web/src/leitor'];

/* As propriedades que constituem a IDENTIDADE de uma peça. Posição não entra:
   ver o cabeçalho. `content` e `transition` também não — a primeira é dado, a
   segunda é comportamento, e nenhuma das duas faz duas peças serem a mesma. */
const APARENCIA = new Set([
  'background', 'background-color',
  'border', 'border-width', 'border-style', 'border-color',
  'border-top', 'border-bottom', 'border-left', 'border-right',
  'border-radius',
  'box-shadow',
  'padding', 'padding-block', 'padding-inline',
  'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing',
  'color',
  'min-height', 'min-block-size', 'height', 'block-size',
  'gap', 'column-gap', 'row-gap',
  'text-transform',
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

/* Sem comentário, sem @media, sem @keyframes. O bloco de mídia é uma VARIAÇÃO
   da mesma peça — contá-lo como peça separada faz toda regra responsiva parecer
   duplicada de si mesma, que é o falso positivo mais fácil de produzir aqui. */
function regras(css) {
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const fora = [];
  let profundidade = 0, inicio = 0, dentroDeArroba = -1;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (c === '{') {
      if (profundidade === 0) {
        const seletor = limpo.slice(inicio, i).trim();
        if (seletor.startsWith('@')) dentroDeArroba = 0;
        else fora.push({ seletor, corpo: i + 1 });
      }
      profundidade++;
    } else if (c === '}') {
      profundidade--;
      if (profundidade === 0) { inicio = i + 1; dentroDeArroba = -1; }
      else if (profundidade === 1 && dentroDeArroba === 0) { inicio = i + 1; }
      if (fora.length && fora[fora.length - 1].fim === undefined && profundidade === 0) {
        fora[fora.length - 1].fim = i;
      }
    }
  }
  return fora
    .filter((r) => r.fim !== undefined)
    .map((r) => ({ seletor: r.seletor, decl: limpo.slice(r.corpo, r.fim) }));
}

/* Só classe simples e única. `.a .b`, `.a:hover`, `.a.b` e tag solta saem: um
   estado não é uma peça, e um descendente pertence a uma peça que já está na
   lista pelo próprio nome. */
function classeSimples(seletor) {
  const m = /^\.([a-zA-Z0-9_-]+)$/.exec(seletor.trim());
  return m ? m[1] : null;
}

function assinatura(decl) {
  const pares = [];
  for (const bruto of decl.split(';')) {
    const i = bruto.indexOf(':');
    if (i < 0) continue;
    const prop = bruto.slice(0, i).trim().toLowerCase();
    if (!APARENCIA.has(prop)) continue;
    const valor = bruto.slice(i + 1).replace(/!important/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!valor) continue;
    pares.push(prop + ':' + valor);
  }
  return pares.sort();
}

const PISO = 4;

function levantar(extra = []) {
  const porAssinatura = new Map();
  const fontes = arquivos().map((f) => [f, readFileSync(join(RAIZ, f), 'utf8')]).concat(extra);
  for (const [arquivo, css] of fontes) {
    for (const { seletor, decl } of regras(css)) {
      const classe = classeSimples(seletor);
      if (!classe) continue;
      const a = assinatura(decl);
      if (a.length < PISO) continue;
      const chave = a.join('|');
      if (!porAssinatura.has(chave)) porAssinatura.set(chave, []);
      porAssinatura.get(chave).push({ classe, arquivo, propriedades: a.length });
    }
  }
  const achados = [];
  for (const [chave, lista] of porAssinatura) {
    const nomes = [...new Set(lista.map((l) => l.classe))];
    if (nomes.length < 2) continue;
    achados.push({ assinatura: chave.split('|'), ocorrencias: lista });
  }
  return achados.sort((a, b) => b.assinatura.length - a.assinatura.length);
}

if (process.argv.includes('--provar')) {
  const semente = [['(controle negativo)', '.peca-de-prova-um{padding:12px;border:1px solid #ccc;border-radius:8px;font-size:14px}\n.peca-de-prova-dois{padding:12px;border:1px solid #ccc;border-radius:8px;font-size:14px}']];
  const com = levantar(semente);
  const sem = levantar();
  const achou = com.some((a) => a.ocorrencias.some((o) => o.classe === 'peca-de-prova-um'));
  console.log(achou ? 'CONTROLE NEGATIVO: o instrumento acha o par plantado. Serve.'
                    : 'CONTROLE NEGATIVO FALHOU: o par plantado passou. O instrumento nao mede nada.');
  console.log(`  com semente: ${com.length} achados · sem semente: ${sem.length}`);
  process.exit(achou ? 0 : 1);
}

const achados = levantar();
if (!achados.length) {
  console.log('inventario: nenhuma peca reescrita.');
  process.exit(0);
}
console.log(`inventario: ${achados.length} assinatura(s) visual(is) com mais de um nome.\n`);
for (const { assinatura: a, ocorrencias } of achados) {
  console.log('  ' + [...new Set(ocorrencias.map((o) => '.' + o.classe))].join('  ==  '));
  for (const o of ocorrencias) console.log(`      .${o.classe}  ${o.arquivo}`);
  console.log('      ' + a.slice(0, 6).join('; ') + (a.length > 6 ? ` … (+${a.length - 6})` : ''));
  console.log('');
}
console.log('Cada par acima e uma peca desenhada duas vezes. Uma das duas esta errada.');
process.exit(1);
