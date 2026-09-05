/* Acha o texto AMASSADO — a dívida que o `text-box-trim` deixou espalhada.
 *
 *     node scripts/amassado.mjs            varre as telas
 *     node scripts/amassado.mjs --provar   o controle negativo
 *
 * O DEFEITO, E POR QUE ELE É INVISÍVEL PARA TUDO QUE JÁ EXISTE AQUI
 * ================================================================
 * O `base.css` ligou `text-box-trim: trim-both` em 03/09, e o próprio comentário
 * avisa o preço: "o vão de cada bloco está no desenho, escrito. Cada tela recebe
 * o número de lá conforme for refeita". Ajuda, Atualizações e Termos foram
 * refeitas. O resto não.
 *
 * Numa tela não refeita, a caixa de cada parágrafo encolheu para o pedaço entre
 * a altura de maiúscula e a linha de base — cerca de METADE da entrelinha —, e
 * as margens antigas viraram o vão inteiro. O texto continua sendo DESENHADO no
 * tamanho da entrelinha, então ele transborda a própria caixa e cai na vizinha.
 *
 * No Livro isso pintava "Origem · malha-urbana.pdf" por cima dos selos. E
 * NENHUM instrumento daqui via: o portão mede cor, contraste e escala; a
 * cobertura conta rotas visitadas; as caixas não se sobrepõem — só o desenho
 * delas. Uma tela assim passa em tudo e chega quebrada na tela da pessoa.
 *
 * COMO A MEDIDA FUNCIONA, E A PRIMEIRA VERSÃO ESTAVA ERRADA
 * ========================================================
 * A caixa aparada vai do topo da MAIÚSCULA à LINHA DE BASE. O que sobra para
 * fora dela é o acento por cima e a perna do "g", do "p", do "ç" por baixo — e
 * mais nada.
 *
 * A primeira versão calculou o transbordo como `(entrelinha - altura) / 2`, e
 * isso conta como desenhado o VÃO da entrelinha, que é espaço vazio. Ela acusou
 * 13 colisões na Ajuda, que é uma das três telas JÁ refeitas — e teria me feito
 * anunciar "toda tela está amassada" com um instrumento que não distingue tela
 * refeita de tela quebrada. O controle negativo pegou antes.
 *
 * Agora o transbordo é MEDIDO, e não estimado: um `canvas` com a mesma fonte
 * devolve `actualBoundingBoxAscent` e `actualBoundingBoxDescent` do texto real
 * daquele bloco. Abaixo da caixa sobra o descendente; acima, o quanto o
 * ascendente passa da altura de maiúscula. Dois vizinhos colidem quando o vão
 * entre as caixas é menor que a soma dos dois transbordos que se encaram.
 *
 * SÓ CONTA VIZINHO DE VERDADE: mesmo pai, um logo abaixo do outro, com
 * sobreposição horizontal. Sem isso, duas colunas lado a lado seriam acusadas de
 * colidir por estarem na mesma altura.
 *
 * CONTROLE NEGATIVO em dois sentidos (`--provar`): a varredura tem de achar o
 * defeito numa tela envenenada — margens zeradas — e tem de ficar limpa na
 * mesma tela sem o veneno. Uma medida que só sabe dizer "está tudo bem" é o
 * verde por omissão de sempre.
 *
 * SAÍDA: 0 sem colisão, 1 com colisão, 97 quando não conseguiu medir.
 */
import { execFileSync, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const WEB = process.env.MEKORA_WEB || 'http://localhost:5180';
const PROVAR = process.argv.includes('--provar');

/* As telas, e o que cada uma precisa para não ser medida vazia. `{LIVRO}` e
   `{ANALISADO}` saem da sessão de prova — medir a ficha de um livro que não
   existe mede a tela de "não achei", que não tem texto nenhum para amassar. */
const TELAS = [
  ['/mesa', 'Mesa'],
  ['/estante', 'Estante'],
  ['/estante/{LIVRO}', 'Livro'],
  ['/preparo/{ANALISADO}', 'Preparo'],
  ['/estudos', 'Estudos'],
  ['/conta', 'Conta'],
  ['/conta/preferencias', 'Preferências'],
  ['/conta/privacidade', 'Privacidade'],
  ['/conta/kindle', 'Kindle'],
  ['/ajuda', 'Ajuda'],
  ['/atualizacoes', 'Atualizações'],
  ['/apresentacao', 'Apresentação'],
];

const MEDIDA = (veneno) => `
(async () => {
  await new Promise(r => setTimeout(r, 2200));
  {
${veneno || ''}
  }
  const px = (v) => (v ? parseFloat(v) : 0);
  const blocos = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,dt,dd,figcaption,blockquote')]
    .filter((e) => e.textContent.trim() && e.getBoundingClientRect().height > 0)
    /* Só quem tem texto PRÓPRIO: um <li> que só contém <p> mede a caixa do
       filho, e a colisão dele já é contada uma vez. */
    .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));

  /* O MEDIDOR DE GLIFO. Um canvas com a mesma fonte diz onde o desenho do texto
     começa e termina em relação à linha de base — o único jeito de saber o que
     sobra para fora da caixa aparada sem chutar. */
  const ctx = document.createElement('canvas').getContext('2d');
  const ficha = (e) => {
    const c = getComputedStyle(e); const cx = e.getBoundingClientRect();
    /* A CAIXA DE CONTEUDO, e nao a do elemento. O h2 de .conta-secao tem 32px
       de recheio embaixo: a caixa dele encosta na do vizinho, e o TEXTO fica 32
       acima disso. A primeira versao contou isso como colisao e acusou quatro
       falsas na Privacidade. Recheio nao e texto. */
    const r = {
      top: cx.top + px(c.paddingTop) + px(c.borderTopWidth),
      bottom: cx.bottom - px(c.paddingBottom) - px(c.borderBottomWidth),
      left: cx.left, right: cx.right,
      get height() { return this.bottom - this.top; },
    };
    const entre = c.lineHeight === 'normal' ? px(c.fontSize) * 1.2 : px(c.lineHeight);
    const linhas = Math.max(1, Math.round(r.height / entre));
    ctx.font = c.fontStyle + ' ' + c.fontWeight + ' ' + c.fontSize + ' ' + c.fontFamily;
    const t = e.textContent.trim().slice(0, 120) || 'Hxg';
    const m = ctx.measureText(t);
    /* A caixa de UMA linha é o cap-to-baseline. Acima dela sobra o quanto o
       ascendente do texto real passa disso — acento, aspas, parêntese. */
    const cap = r.height / linhas;
    const acima = Math.max(0, (m.actualBoundingBoxAscent || 0) - cap);
    const abaixo = Math.max(0, m.actualBoundingBoxDescent || 0);
    return { e, r, entre, alt: r.height, acima, abaixo };
  };

  const achados = [];
  const fichas = blocos.map(ficha);
  for (const a of fichas) {
    for (const b of fichas) {
      if (a.e === b.e) continue;
      if (a.e.parentElement !== b.e.parentElement) continue;
      if (b.r.top < a.r.bottom - 0.5) continue;                  // b tem de vir abaixo
      if (b.r.left >= a.r.right || b.r.right <= a.r.left) continue; // e cruzar na horizontal
      const vao = b.r.top - a.r.bottom;
      /* O que se encara: o transbordo de BAIXO do primeiro contra o de CIMA do
         segundo. Sem crase neste comentario: ele mora dentro de um literal de
         template, e crase aqui fecha o literal (CLAUDE.md ja registra esta). */
      const folga = +(vao - a.abaixo - b.acima).toFixed(1);
      if (folga <= 0) {
        achados.push({
          de: a.e.tagName.toLowerCase() + (a.e.className ? '.' + String(a.e.className).split(' ')[0] : ''),
          para: b.e.tagName.toLowerCase() + (b.e.className ? '.' + String(b.e.className).split(' ')[0] : ''),
          texto: a.e.textContent.trim().slice(0, 42),
          vao: Math.round(vao), folga,
          caixa: Math.round(a.alt), entrelinha: Math.round(a.entre),
          desce: +a.abaixo.toFixed(1), sobe: +b.acima.toFixed(1),
        });
      }
    }
  }
  /* CONTROLE: sem bloco de texto nenhum, "zero colisão" é cegueira e não
     aprovação — a tela não montou, ou o seletor não acha nada. */
  return { blocos: blocos.length, achados: achados.sort((x, y) => x.folga - y.folga).slice(0, 12) };
})()`;

let sessao;
function pegarSessao() {
  if (sessao) return sessao;
  const saida = execSync('scripts/sessao-de-prova.sh', {
    cwd: RAIZ, encoding: 'utf8', timeout: 90000,
    env: { ...process.env, MEKORA_PROVA: process.env.MEKORA_PROVA || RAIZ + '.ver' },
  });
  const [token, livro, analisado] = saida.trim().split('\n');
  sessao = { token, livro, analisado };
  return sessao;
}

function medir(rota, veneno) {
  const { token, livro, analisado } = pegarSessao();
  const dir = join(tmpdir(), 'mekora-amassado');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const alvo = join(dir, `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.js`);
  writeFileSync(alvo, MEDIDA(veneno));
  const url = WEB + rota.replace('{LIVRO}', livro).replace('{ANALISADO}', analisado);
  const bruto = execFileSync('node', ['scripts/medir.mjs', url, '1920', '1080', alvo, `--sessao=${token}`],
    { cwd: RAIZ, encoding: 'utf8', timeout: 110000, stdio: ['ignore', 'pipe', 'pipe'] });
  const i = bruto.indexOf('{');
  if (i < 0) throw new Error('a medida nao devolveu JSON');
  return JSON.parse(bruto.slice(i));
}

/* O VENENO ENCOSTA OS BLOCOS UNS NOS OUTROS, que é o estado em que o
   `text-box-trim` deixa uma tela ainda não refeita: a caixa encolheu para o
   cap-to-baseline e o vão que sobrou é o da margem antiga, escrita quando ainda
   havia meia-entrelinha de cada lado.
   Zerar só a margem não bastou — a Ajuda separa os blocos com `gap`, e o
   primeiro veneno passou por ela sem mudar um pixel. Ele precisa zerar os dois,
   senão prova que a medida funciona numa tela que ele não chegou a envenenar. */
const VENENO = `const s = document.createElement('style');
     s.textContent = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote{margin-block:0 !important}' +
                     '*{row-gap:0 !important}';
     document.head.appendChild(s);`;

try {
  if (PROVAR) {
    const limpa = medir('/ajuda', '');
    const doente = medir('/ajuda', VENENO);
    if (!limpa.blocos) { console.error('nao consegui medir a Ajuda'); process.exit(97); }
    const ok = limpa.achados.length === 0 && doente.achados.length > 0;
    console.log(`  ${ok ? 'serve  ' : 'NAO SERVE'} amassado  limpa: ${limpa.achados.length} colisao(oes) · envenenada: ${doente.achados.length}`);
    console.log(ok
      ? '\nCONTROLE NEGATIVO: limpa nao acusa, envenenada acusa. Serve.'
      : '\nCONTROLE NEGATIVO FALHOU: a medida nao distingue tela refeita de tela nao refeita.');
    process.exit(ok ? 0 : 1);
  }

  let comColisao = 0, indeterminadas = 0;
  console.log('amassado: texto que transborda a caixa e cai no vizinho\n');
  for (const [rota, nome] of TELAS) {
    let d;
    try { d = medir(rota, ''); }
    catch (e) { console.log(`  ?  ${nome.padEnd(14)} nao consegui medir (${String(e.message).slice(0, 50)})`); indeterminadas++; continue; }
    if (!d.blocos) { console.log(`  ?  ${nome.padEnd(14)} nenhum bloco de texto — a tela montou?`); indeterminadas++; continue; }
    if (!d.achados.length) { console.log(`  ok ${nome.padEnd(14)} ${String(d.blocos).padStart(3)} blocos`); continue; }
    comColisao++;
    console.log(`  X  ${nome.padEnd(14)} ${String(d.blocos).padStart(3)} blocos · ${d.achados.length} colisao(oes)`);
    for (const a of d.achados.slice(0, 4)) {
      console.log(`       ${a.de} -> ${a.para}  vao ${a.vao}px, folga ${a.folga}px  (desce ${a.desce}, o de baixo sobe ${a.sobe})`);
      console.log(`       "${a.texto}"`);
    }
  }
  console.log(`\n${comColisao} tela(s) com texto amassado, ${indeterminadas} indeterminada(s).`);
  if (indeterminadas && !comColisao) process.exit(97);
  process.exit(comColisao ? 1 : 0);
} catch (e) {
  console.error('nao consegui medir: ' + e.message);
  process.exit(97);
}
