/* As provas do livro de recusas — um comando que sabe ficar vermelho.
 *
 *     node scripts/provas.mjs r03        # uma
 *     node scripts/provas.mjs --provar   # o controle negativo de todas
 *
 * POR QUE ELAS MORAM JUNTAS
 * =========================
 * O `docs/REJEITADO.md` só aceita fechar um item com uma prova: um comando que
 * falha enquanto o defeito está lá. Escrever cada uma como arquivo solto
 * espalharia dez scripts quase iguais — o que muda entre eles é a asserção, e
 * não o aparato. Aqui o aparato é um só e a asserção é uma função.
 *
 * AS DE TELA PRECISAM DO SERVIDOR, E FALHAM SEM ELE — DE PROPÓSITO.
 * ================================================================
 * Uma prova que passa quando não conseguiu medir é verde por omissão, que é o
 * defeito mais caro deste repositório. Sem `vite` em pé, elas dizem isso e
 * saem com erro. O item volta a aparecer como REGREDIU até alguém subir o
 * servidor — chato e honesto, nessa ordem.
 *
 * O CONTROLE NEGATIVO É PARTE DA PROVA, e vai nos DOIS sentidos: cada uma roda
 * limpa (tem de passar) e envenenada (tem de reprovar). As de arquivo recebem
 * o texto mutilado; as de tela recebem um veneno de CSS ou de DOM injetado na
 * própria página, que refaz o defeito que o Erik descreveu.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const WEB = process.env.MEKORA_WEB || 'http://localhost:5180';
const arq = (p) => readFileSync(RAIZ + p, 'utf8');

/* ── o aparato de tela ──────────────────────────────────────────────────── */

let sessaoGuardada = null;
function sessao() {
  if (sessaoGuardada) return sessaoGuardada;
  const saida = execSync('scripts/sessao-de-prova.sh', {
    cwd: RAIZ, encoding: 'utf8', timeout: 90000,
    env: { ...process.env, MEKORA_PROVA: process.env.MEKORA_PROVA || RAIZ + '.ver' },
  });
  const [token, livro] = saida.trim().split('\n');
  sessaoGuardada = { token, livro };
  return sessaoGuardada;
}

function medir(rota, corpo, veneno = '') {
  const { token, livro } = sessao();
  const dir = join(tmpdir(), 'mekora-provas');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const alvo = join(dir, `m-${Date.now()}.js`);
  /* O VENENO ENTRA ANTES DA MEDIDA, na mesma página: é assim que o controle
     negativo refaz o defeito sem tocar no produto. */
  /* O VENENO VAI DENTRO DE UM BLOCO, e o motivo custou uma rodada: ele e a
     medida declaram nomes curtos — `const b` nos dois —, e no mesmo escopo isso
     e `Identifier 'b' has already been declared`. O arquivo nem chegava a
     rodar, e o erro chegava aqui como "nao consegui medir", que parece falta de
     servidor. Erro de sintaxe disfarcado de ambiente e o pior tipo. */
  writeFileSync(alvo, `(async () => {\n  const esperar = ms => new Promise(r => setTimeout(r, ms));\n  await esperar(3200);\n  {\n${veneno}\n  }\n  ${corpo}\n})()`);
  const url = `${WEB}${rota.replace('{LIVRO}', livro)}`;
  let bruto;
  try {
    bruto = execFileSync('node', ['scripts/medir.mjs', url, '1440', '1000', alvo, `--sessao=${token}`],
      { cwd: RAIZ, encoding: 'utf8', timeout: 110000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    throw new NaoPodeMedir(`nao consegui medir ${url} — o servidor de desenvolvimento esta em pe? (${String(e.message).slice(0, 90)})`);
  }
  const i = bruto.indexOf('{');
  if (i < 0) throw new Error('a medida nao devolveu JSON: ' + bruto.trim().slice(-120));
  return JSON.parse(bruto.slice(i));
}

/* Nao poder medir e uma terceira resposta, ao lado de "passa" e "reprova".
   Confundi-la com reprovacao inventa regressao; confundi-la com aprovacao e o
   verde por omissao. Ela tem classe propria para poder ter codigo de saida
   proprio (97), lido pelo `scripts/rejeitado.mjs`. */
class NaoPodeMedir extends Error {}

/* ── as provas ─────────────────────────────────────────────────────────────
 * Cada uma devolve `null` quando o defeito NAO esta la, ou a frase do defeito.
 * `veneno` refaz o defeito para o controle negativo. */

const PROVAS = {
  'r44': {
    erik: 'o cartao "Relatorio de pesquisa" renderiza a capa de "Malha Urbana"',
    /* O VENENO E O PROPRIO SINTOMA: dois cartoes passam a mostrar a mesma
       imagem. Ele reproduz o que o Erik fotografou, e nao uma aproximacao. */
    veneno: `const capas = document.querySelectorAll('.livro img.capa');
             if (capas.length > 1) capas[1].setAttribute('src', capas[0].getAttribute('src'));`,
    async correr(veneno) {
      const d = medir('/estante', `
        const cartoes = [...document.querySelectorAll('.livro')].map(l => ({
          titulo: (l.querySelector('h3') || { textContent: '' }).textContent.trim(),
          src: l.querySelector('img.capa') ? l.querySelector('img.capa').getAttribute('src') : null }));
        const resumo = async (u) => {
          const b = await fetch(u, { credentials: 'include' }).then(r => r.arrayBuffer());
          const h = await crypto.subtle.digest('SHA-256', b);
          return [...new Uint8Array(h)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
        };
        const vistos = {};
        for (const c of cartoes) { if (!c.src) continue; c.resumo = await resumo(c.src); (vistos[c.resumo] ??= []).push(c.titulo); }
        return { cartoes, repetidas: Object.entries(vistos).filter(([, t]) => t.length > 1).map(([r, t]) => ({ resumo: r, titulos: t })) };`, veneno);
      const semCapa = d.cartoes.filter((c) => !c.src).map((c) => c.titulo);
      if (semCapa.length) return `livro sem capa na estante: ${semCapa.join(', ')}`;
      if (d.repetidas.length) {
        const par = d.repetidas[0];
        return `dois livros com a MESMA imagem de capa: ${par.titulos.join(' e ')}`;
      }
      return null;
    },
  },
  'r02': {
    erik: 'o click so funciona na div inferior a da capa, usuarios tendem a clicar na capa',
    /* O VENENO DESFAZ O CONSERTO, e nao imita o sintoma de longe: devolve
       `pointer-events: auto` a capa, que e exatamente o estado em que ela
       ficava por cima do alvo e comia o clique. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.capa { pointer-events: auto; }';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estante', `
        const ficha = () => {
          const h = document.querySelector('.ficha-caixa header h2');
          return h ? h.textContent.trim() : null;
        };
        const antes = ficha();
        const cartoes = [...document.querySelectorAll('.livro')];
        const alvo = cartoes.find(l => !l.classList.contains('escolhido')) || cartoes[0];
        if (!alvo) return { vazio: true };
        const capa = alvo.querySelector('.capa');
        const r = capa.getBoundingClientRect();
        const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
        /* ELEMENTFROMPOINT E O MESMO TESTE QUE O NAVEGADOR FAZ para decidir
           quem recebe o clique. Medido nos dois sentidos com ponteiro de
           verdade pelo CDP: limpa ele devolve o botao e a ficha troca;
           envenenada devolve a imagem e a ficha nao troca. */
        const no = document.elementFromPoint(x, y);
        const recebe = no ? (no.tagName.toLowerCase() + (no.className ? '.' + String(no.className).trim().split(/\s+/).join('.') : '')) : null;
        const dentroDoAlvo = !!(no && no.closest('.livro-alvo'));
        if (no) no.click();
        await new Promise(r2 => setTimeout(r2, 500));
        return { antes, depois: ficha(), titulo: (alvo.querySelector('h3') || { textContent: '' }).textContent.trim(), recebe, dentroDoAlvo };`, veneno);
      if (d.vazio) return 'a estante nao tem cartao para clicar — semeie antes';
      if (!d.dentroDoAlvo) return `o centro da capa nao chega ao alvo do clique: quem recebe e ${d.recebe}`;
      if (d.depois !== d.titulo) return `clicar no centro da capa nao trocou a ficha: ela continua em ${d.depois}`;
      return null;
    },
  },
  'r03': {
    erik: 'o marcador vaza da capa e invade o filtro',
    veneno: `document.querySelectorAll('.marcador').forEach(m => { m.style.zIndex = '5'; m.style.position = 'absolute'; });
             document.querySelectorAll('.capa').forEach(c => c.style.zIndex = '0');`,
    async correr(veneno) {
      const d = medir('/estante', `
        const l = document.querySelector('.livro'), c = l.querySelector('.capa'), m = l.querySelector('.marcador');
        const rc = c.getBoundingClientRect(), rm = m.getBoundingClientRect();
        const filtros = document.querySelector('.recortes');
        /* QUEM ESTA NA FRENTE E CONTA DE PINTURA, e nao de ponteiro.
           Isto era um elementFromPoint no ponto onde os dois se cruzam, e a
           resposta mudou quando a capa ganhou pointer-events: none para
           devolver o clique ao .livro-alvo (R-02): sem receber ponteiro, ela
           sumiu do teste de acerto e a prova acusou regressao numa sobreposicao
           que nao mudou um pixel. Instrumento que mede a coisa errada acusa o
           item errado.
           A ordem de pintura entre irmaos posicionados no mesmo contexto de
           empilhamento e o z-index, e a ordem do DOM desempata. */
        const zi = (e) => { const v = getComputedStyle(e).zIndex; return v === 'auto' ? 0 : Number(v); };
        const zc = zi(c), zm = zi(m);
        const depoisNoDom = !!(m.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
        const na_frente = zc > zm ? 'capa' : zc < zm ? 'marcador' : (depoisNoDom ? 'capa' : 'marcador');
        return { na_frente, z_marca: String(zm), z_capa: String(zc),
                 cruzam: rm.bottom > rc.top && rm.top < rc.bottom,
                 invade_filtros: filtros ? rm.top < filtros.getBoundingClientRect().bottom : false };`, veneno);
      if (d.invade_filtros) return `o marcador alcanca a barra de recortes`;
      if (!String(d.na_frente || '').includes('capa')) return `na sobreposicao quem esta na frente e "${d.na_frente}", e nao a capa (z marca ${d.z_marca}, z capa ${d.z_capa})`;
      return null;
    },
  },
  'r06': {
    erik: 'o item ao lado da busca era de notas, e devia ser de duvidas',
    texto: () => arq('web/src/componentes/Cabecalho.jsx'),
    correr(t) {
      if (!/aria-label="D[úu]vidas"/.test(t)) return 'o atalho ao lado da busca nao se chama Duvidas';
      if (!/iconeDuvidas\s*=\s*"\/icones\/icone-duvidas\.svg"/.test(t)) return 'o icone do atalho nao e o de duvidas';
      if (!/to="\/ajuda"/.test(t)) return 'o atalho nao leva para a ajuda';
      return null;
    },
    veneno: (t) => t.replace('aria-label="Dúvidas"', 'aria-label="Notas"'),
  },
  'r07': {
    erik: 'trocou o icone da Estante',
    /* PROVA POR IMPRESSAO DIGITAL. O defeito original foi os ARQUIVOS estarem
       trocados — `icone-estante.svg` desenhava um "?". Nenhuma leitura de CSS
       pega isso; o que pega e fixar o conteudo dos dois arquivos auditados em
       04/09. Se alguem os trocar de novo, o resumo muda e isto fica vermelho. */
    texto: () => JSON.stringify({
      lugares: arq('web/src/lugares.js'),
      resumos: execSync('shasum -a 256 web/publico/icones/icone-estante.svg web/publico/icones/icone-duvidas.svg', { cwd: RAIZ, encoding: 'utf8' }),
    }),
    correr(bruto) {
      const { lugares, resumos } = JSON.parse(bruto);
      if (!/id: "estante"[\s\S]{0,200}icone: "\/icones\/icone-estante\.svg"/.test(lugares)) return 'a Estante nao usa o icone-estante.svg';
      const esperados = {
        'icone-estante.svg': 'a08ea4aca7c094bcbc045801cf305f029cc5e27c824708a3757c3f5a3e72465d',
        'icone-duvidas.svg': '3f37071634f6c04a690ef4963d61edfce99c45ae4be49136f24755941717d155',
      };
      for (const [nome, resumo] of Object.entries(esperados)) {
        const linha = resumos.split('\n').find((l) => l.includes(nome));
        if (!linha) return `nao achei o resumo de ${nome}`;
        if (!linha.startsWith(resumo)) return `${nome} mudou de conteudo desde a auditoria de 04/09`;
      }
      return null;
    },
    veneno: (t) => t.replace('icone: \\"/icones/icone-estante.svg\\"', 'icone: \\"/icones/icone-duvidas.svg\\"'),
  },
  'r08': {
    erik: 'nao respeitou o espacamento entre o usuario e a caixa de busca e duvidas',
    /* O VAO VEM DO `gap` DA CAIXA, e nao de margem no filho — a primeira versao
       deste veneno mexia em `margin-inline-start` e a medida continuava dando 56,
       ou seja, o controle negativo PASSAVA envenenado. Um veneno que nao envenena
       prova o contrario do que se queria. */
    veneno: `document.querySelector('.cabecalho-acoes').style.gap = '0px';
             document.querySelector('.cabecalho-atalhos').style.gap = '0px';`,
    async correr(veneno) {
      const d = medir('/estante', `
        const a = document.querySelector('.cabecalho-acoes');
        const f = [...a.children].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, x: r.x, w: r.width }; }).filter(e => e.w > 0);
        const at = document.querySelector('.cabecalho-atalhos');
        const g = [...at.children].map(e => { const r = e.getBoundingClientRect(); return { x: r.x, w: r.width }; });
        return { entre_busca_e_atalhos: Math.round(f[1].x - (f[0].x + f[0].w)), entre_atalhos: Math.round(g[1].x - (g[0].x + g[0].w)) };`, veneno);
      if (d.entre_busca_e_atalhos !== 56) return `entre a busca e os atalhos ha ${d.entre_busca_e_atalhos}px, e o no 900:52331 pede 56`;
      if (d.entre_atalhos !== 16) return `entre os dois atalhos ha ${d.entre_atalhos}px, e o no 900:52339 pede 16`;
      return null;
    },
  },
  'r10': {
    erik: 'clicar na conta navega em vez de abrir um dropdown',
    /* O VENENO TIRA O MENU, e nao navega — e a diferenca e do INSTRUMENTO.
     *
     * A primeira versao reproduzia o defeito ao pe da letra: o clique levava
     * para `/conta`. So que o `medir.mjs` recusa uma medida que pediu uma rota
     * e terminou noutra — a guarda que existe para nao medir a tela errada —, e
     * o controle negativo morria com "nao consegui medir" em vez de acusar.
     * Um veneno so serve se o vermelho que ele produz for o vermelho do
     * defeito.
     *
     * Entao ele reproduz a metade OBSERVAVEL: o botao vira um clone sem
     * manipulador, e o menu deixa de abrir. E o que a pessoa ve quando o clique
     * navega — o dropdown nao existe. */
    veneno: `const b = document.querySelector('button[aria-label="Sua conta"]');
             b.replaceWith(b.cloneNode(true));`,
    async correr(veneno) {
      const d = medir('/estante', `
        const b = document.querySelector('button[aria-label="Sua conta"]');
        if (!b) return { sem_botao: true };
        const antes = location.pathname;
        b.click(); await esperar(700);
        return { navegou: location.pathname !== antes, expandido: b.getAttribute('aria-expanded'),
                 itens: [...document.querySelectorAll('[class*=menu-conta] a')].length };`, veneno);
      if (d.sem_botao) return 'nao ha botao de conta no cabecalho';
      if (d.navegou) return 'clicar na conta NAVEGA em vez de abrir o menu';
      if (d.expandido !== 'true') return 'o botao nao se anuncia expandido';
      if (d.itens < 3) return `o menu abriu com ${d.itens} itens`;
      return null;
    },
  },
  'r12': {
    erik: 'na parte superior do canvas simplesmente tem fundo branco',
    veneno: `const t = document.createElement('div');
             t.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:120px;background:#fff;z-index:9999';
             document.body.appendChild(t);`,
    async correr(veneno) {
      const d = medir('/canvas', `
        const pinta = (e) => { let n = e; while (n) { const c = getComputedStyle(n);
          if (c.backgroundColor && c.backgroundColor !== 'rgba(0, 0, 0, 0)') return { cor: c.backgroundColor, img: (c.backgroundImage || 'none').slice(0, 30) }; n = n.parentElement; } return null; };
        const topo = pinta(document.elementFromPoint(innerWidth / 2, 8));
        const meio = pinta(document.elementFromPoint(innerWidth / 2, innerHeight / 2));
        return { topo, meio };`, veneno);
      if (!d.topo || !d.meio) return 'nao consegui ler quem pinta o canvas';
      if (d.topo.cor !== d.meio.cor) return `o topo e pintado de ${d.topo.cor} e o meio de ${d.meio.cor}`;
      if (!d.topo.img.startsWith('radial-gradient')) return `o topo do canvas nao tem os pontos: ${d.topo.img}`;
      return null;
    },
  },
  'r14': {
    erik: 'nao consigo mover os post-it',
    veneno: `window.addEventListener('pointerdown', (e) => e.stopPropagation(), true);`,
    async correr(veneno) {
      const d = medir('/canvas', `
        const q = s => [...document.querySelectorAll(s)];
        q('button').find(b => /nova nota/i.test(b.getAttribute('aria-label') || b.textContent || '')).click();
        await esperar(900);
        const folha = q('dialog').find(x => x.open);
        const campo = folha && folha.querySelector('textarea, input[type=text]');
        if (campo) { campo.focus();
          Object.getOwnPropertyDescriptor(campo.constructor.prototype, 'value').set.call(campo, 'prova r14');
          campo.dispatchEvent(new Event('input', { bubbles: true })); await esperar(250);
          const por = [...folha.querySelectorAll('button,.botao')].find(b => /superf/i.test(b.textContent));
          if (por) { por.click(); await esperar(1500); } }
        const notas = q('.nota-canvas');
        if (!notas.length) return { sem_nota: true };
        const nota = notas[notas.length - 1], r0 = nota.getBoundingClientRect();
        const o = (x, y) => ({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true });
        const x0 = Math.round(r0.x + r0.width / 2), y0 = Math.round(r0.y + 12);
        nota.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0)));
        for (let i = 1; i <= 20; i++) { window.dispatchEvent(new PointerEvent('pointermove', o(x0 + 140 * i / 20, y0 + 90 * i / 20))); await new Promise(k => requestAnimationFrame(k)); }
        window.dispatchEvent(new PointerEvent('pointerup', o(x0 + 140, y0 + 90)));
        await esperar(600);
        const r1 = nota.getBoundingClientRect();
        return { andou_x: Math.round(r1.x - r0.x), andou_y: Math.round(r1.y - r0.y) };`, veneno);
      if (d.sem_nota) return 'nao consegui criar uma nota no canvas';
      if (Math.abs(d.andou_x) < 40 || Math.abs(d.andou_y) < 30) return `a nota andou ${d.andou_x}x${d.andou_y} para um arrasto de 140x90`;
      return null;
    },
  },
  'r26': {
    erik: 'um tema com duas palavras quebra o layout — remover o "do"',
    texto: () => arq('web/src/jornadas/Leitura.jsx'),
    correr(t) {
      const bloco = /\["claro",[\s\S]{0,900}?\]\.map/.exec(t);
      if (!bloco) return 'nao achei a lista de temas';
      const rotulos = [...bloco[0].matchAll(/\["[a-z]+",\s*"([^"]+)"\]/g)].map((m) => m[1]);
      if (!rotulos.length) return 'a lista de temas nao tem rotulos legiveis';
      const compostos = rotulos.filter((r) => r.trim().includes(' '));
      if (compostos.length) return `tema com mais de uma palavra: ${compostos.join(', ')}`;
      return null;
    },
    veneno: (t) => t.replace('["sistema", "Sistema"]', '["sistema", "Do sistema"]'),
  },
  'r38': {
    erik: 'as telas sobre o canvas pontilhado sao GAVETAS — usar o vaul',
    /* OS COMENTARIOS SAEM ANTES, e a razao apareceu no controle negativo: o
       `modal={false}` esta citado TRES vezes na prosa do `GavetaDeSecao` e uma
       vez como propriedade. O veneno trocava a primeira ocorrencia — um
       comentario — e a prova continuava verde. Comentario que fala do codigo
       nao e o codigo, e um instrumento que le os dois nao distingue os dois. */
    texto: () => [arq('web/package.json'), arq('web/src/componentes/Gaveta.jsx'), arq('web/src/componentes/GavetaDeSecao.jsx')]
      .join('\n/*—*/\n').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' '),
    correr(t) {
      if (!/"vaul":/.test(t)) return 'a vaul nao esta nas dependencias';
      if (!/from "vaul"/.test(t)) return 'nada importa a vaul';
      if (!/modal=\{false\}/.test(t)) return 'a gaveta e modal: prende o foco e apaga o cabecalho, que e o contrario da secao sobreposta';
      return null;
    },
    veneno: (t) => t.replace('modal={false}', 'modal={true}'),
  },
};

/* ── o comando ──────────────────────────────────────────────────────────── */

async function rodar(id, envenenado = false) {
  const p = PROVAS[id];
  if (!p) throw new Error(`prova desconhecida: ${id}`);
  if (p.texto) {
    let t = p.texto();
    if (envenenado) t = p.veneno(t);
    return p.correr(t);
  }
  return p.correr(envenenado ? p.veneno : '');
}

const args = process.argv.slice(2);

if (args.includes('--provar')) {
  const so = args.find((a) => !a.startsWith('--'));
  const ids = so ? [so] : Object.keys(PROVAS);
  let tudoBem = true, indeterminadas = 0;
  for (const id of ids) {
    let limpa, suja;
    /* TERCEIRO SITIO DA MESMA CONFUSAO. Com o servidor fora, o `NaoPodeMedir`
       virava a string 'ERRO: …' e o arquivo anunciava CONTROLE NEGATIVO FALHOU
       — "o controle esta quebrado" quando a verdade e "nao deu para medir".
       Nao saber nao e reprovar, aqui pela mesma razao que no `rejeitado.mjs`. */
    let mudo = false;
    try { limpa = await rodar(id, false); } catch (e) { if (e instanceof NaoPodeMedir) mudo = true; else limpa = 'ERRO: ' + e.message; }
    if (!mudo) { try { suja = await rodar(id, true); } catch (e) { if (e instanceof NaoPodeMedir) mudo = true; else suja = 'ERRO: ' + e.message; } }
    if (mudo) { indeterminadas++; console.log(`  ?      ${id}  indeterminada — nao deu para medir`); continue; }
    const ok = limpa === null && typeof suja === 'string' && !suja.startsWith('ERRO');
    tudoBem &&= ok;
    console.log(`  ${ok ? 'serve  ' : 'FALHOU '} ${id}  limpa: ${limpa === null ? 'passa' : limpa} · envenenada: ${suja || 'PASSOU, e nao devia'}`);
  }
  if (indeterminadas) {
    console.log(`\n${indeterminadas} de ${ids.length} indeterminadas — o servidor de desenvolvimento esta fora.`);
    console.log('Nao e falha do controle: e ausencia de resposta. Suba `cd web && npm run dev` e rode de novo.');
    process.exit(97);
  }
  console.log(tudoBem
    ? '\nCONTROLE NEGATIVO: toda prova passa limpa e reprova envenenada. Serve.'
    : '\nCONTROLE NEGATIVO FALHOU.');
  process.exit(tudoBem ? 0 : 1);
}

if (!args.length) {
  console.log('provas: ' + Object.keys(PROVAS).join(' '));
  process.exit(0);
}

const id = args[0].toLowerCase();
let defeito;
try {
  defeito = await rodar(id, false);
} catch (e) {
  /* SAIR 97 QUANDO NAO DEU PARA MEDIR — e nao 1.
     Codigo 1 quer dizer "o defeito esta la". Servidor fora tambem saia 1, e o
     `rejeitado.mjs` lia isso como REGREDIU: o portao anunciava regressao em
     dez itens porque ninguem tinha subido o `npm run dev`. Portao que grita
     regressao falsa e portao que se aprende a ignorar, e ai ele nao serve nem
     quando a regressao for de verdade.
     Nao poder medir NAO e passar: e nao saber. 97 diz isso. */
  if (e instanceof NaoPodeMedir) { console.error(`${id}: ${e.message}`); process.exit(97); }
  throw e;
}
if (defeito) { console.error(`${id}: ${defeito}`); process.exit(1); }
console.log(`${id}: o defeito nao se reproduz.`);
