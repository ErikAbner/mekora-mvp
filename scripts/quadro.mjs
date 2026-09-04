/* O quadro do Figma como oráculo — e a AUSÊNCIA de conferência como falha.
 *
 *     node scripts/quadro.mjs            # cobra
 *     node scripts/quadro.mjs --semear   # cria o livro a partir do TELAS-FIGMA.md
 *     node scripts/quadro.mjs --provar   # controle negativo
 *
 * POR QUE ISTO EXISTE
 * ===================
 * "Comparar contra o Figma" era uma FASE. Fase separada é fase que não roda:
 * ela fica por último, o dia acaba, e o silêncio dela é indistinguível de
 * aprovação. Nenhum instrumento aqui perguntava "esta tela já foi conferida
 * contra o desenho?", então a resposta "nunca" saía verde.
 *
 * Este arquivo troca o silêncio por vermelho. Tela do Figma sem linha no livro
 * REPROVA. Não é um relatório: é a cobrança de uma dívida que estava invisível
 * porque ninguém tinha escrito onde ela mora.
 *
 * AS TRÊS FALHAS QUE ELE ACUSA
 * ============================
 *   NUNCA CONFERIDA     o quadro existe no `docs/TELAS-FIGMA.md` e não tem
 *                       linha no livro. É a dívida que este arquivo nasceu para
 *                       tornar visível.
 *
 *   INSTRUMENTO ERRADO  conferida por CAPTURA. O próprio `TELAS-FIGMA.md` já
 *                       tem a lição escrita — "O dado do nó vence a captura — e
 *                       isto custou uma pendência de dois dias". O
 *                       `get_screenshot` de um quadro de 390×4674 volta em
 *                       117×1400: um bloco de 100px sai com 30 de altura, e
 *                       espaçamento errado por três vezes some no reescalo.
 *                       Quem conferiu recheio e dimensão em captura conferiu a
 *                       imagem, não o desenho.
 *
 *   CONFERÊNCIA VENCIDA o código da tela mudou DEPOIS da data da conferência.
 *                       Vinte e quatro linhas do inventário dizem "comparada ·
 *                       corrigida" sem dizer contra qual versão do código —
 *                       e uma delas é a Estante, que mudou muitas vezes desde.
 *                       Conferência sem validade é memória, e memória não é
 *                       evidência.
 *
 * O QUE ELE NÃO FAZ
 * =================
 * Ele não abre o Figma. A ferramenta de leitura do desenho vive no agente, não
 * num processo de linha de comando, e fingir o contrário produziria um portão
 * que falha por falta de credencial e ensina todo mundo a passar por cima.
 *
 * Ele cobra que a conferência TENHA ACONTECIDO, com data, com nó, e contra o
 * dado do nó. A conferência em si continua sendo ato de quem lê o desenho — o
 * que muda é que agora não fazê-la tem cor.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const INVENTARIO = join(RAIZ, 'docs/TELAS-FIGMA.md');
const LIVRO = join(RAIZ, 'docs/quadros/conferido.json');

/* `| `964:24178` | M · Apresentação | `/` | **comparada · corrigida** |`
 *
 * A primeira versão desta expressão exigia que a coluna da rota fosse UM par de
 * crases e nada mais. Ela engoliu duas linhas em silêncio: a de id em FAIXA
 * (`941:23103`–`941:23105`, o assistente do Kindle) e a da estante 3D, cuja
 * rota é ``/estante`` (vista 3D) — crase no meio da célula. Cinquenta de
 * cinquenta e sete, e o instrumento anunciava cinquenta como se fosse o total.
 *
 * Um portão que descarta linha calado é o defeito que ele veio cobrar, dentro
 * dele mesmo. Agora o que não casa é ACUSADO, não descartado. */
const LINHA = /^\|\s*((?:`\d+:\d+`[^|]*?)+)\|\s*([^|]+?)\s*\|([^|]*)\|\s*(.*?)\s*\|\s*$/;
const PRIMEIRO_ID = /`(\d+:\d+)`/;

/* QUAL TABELA É INVENTÁRIO, E QUAL É PROSA
   O arquivo tem três tabelas de inventário (Telefone, Símbolos, Computador) e
   várias tabelas de ANÁLISE cuja primeira coluna também começa com um id —
   `| `966:25321` · M · Conta | um campo de **Senha** | …`. Filtrar por formato
   da linha confunde as duas. Filtrar pelo CABEÇALHO não: inventário é a tabela
   cuja primeira coluna se chama `id`. */
function quadros() {
  const saida = [], ilegiveis = [];
  let dentro = false;
  for (const linha of readFileSync(INVENTARIO, 'utf8').split('\n')) {
    if (/^\|\s*id\s*\|/i.test(linha)) { dentro = true; continue; }
    if (!linha.trim().startsWith('|') || linha.startsWith('#')) { dentro = false; continue; }
    if (/^\|\s*-+/.test(linha.replace(/\s/g, ''))) continue;
    if (!dentro) continue;
    const m = LINHA.exec(linha);
    if (!m) { ilegiveis.push(linha.trim().slice(0, 100)); continue; }
    const no = PRIMEIRO_ID.exec(m[1])[1];
    const rota = m[3].replace(/`/g, '').trim();
    saida.push({ no, tela: m[2].trim(), rota: rota || '(sem rota)', estado: m[4].replace(/\*\*/g, '') });
  }
  if (ilegiveis.length) {
    console.error(`quadro: ${ilegiveis.length} linha(s) do inventario que a leitura NAO entendeu — nao contam, e deveriam:`);
    for (const i of ilegiveis) console.error('    ' + i);
    process.exitCode = 1;
  }
  return saida;
}

function livro() {
  if (!existsSync(LIVRO)) return null;
  return JSON.parse(readFileSync(LIVRO, 'utf8'));
}

/* Palpite de quais arquivos compõem a tela, a partir da rota. É palpite mesmo:
   entrada com lista vazia não pode vencer, e por isso a lista vazia é acusada. */
function palpitar(rota) {
  const base = (rota.split('/').filter(Boolean)[0] || 'apresentacao').replace(/:.*/, '');
  const nome = base.replace(/-/g, '');
  const alvos = [];
  for (const cand of ['jornadas', 'componentes']) {
    for (const ext of ['jsx', 'css']) {
      const arq = `web/src/${cand}/${base}.${ext}`;
      if (existsSync(join(RAIZ, arq))) alvos.push(arq);
    }
  }
  try {
    const achados = execFileSync('bash', ['-c',
      `ls web/src/jornadas/*.jsx web/src/jornadas/*.css 2>/dev/null | grep -i "/${nome}\\." || true`],
      { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    for (const a of achados) if (!alvos.includes(a)) alvos.push(a);
  } catch { /* palpite falho vira lista vazia, e lista vazia é acusada */ }
  return alvos;
}

/* CARIMBO CONTRA CARIMBO, e não carimbo contra data.
 *
 * A primeira versão comparava `%cI` do git — `2026-09-04T13:22:07-03:00` — com
 * o que estava no livro, que podia ser só `2026-09-04`. Em texto,
 * `"2026-09-04T13:22:07-03:00" > "2026-09-04"` é SEMPRE verdadeiro: qualquer
 * commit no mesmo dia vencia a conferência feita naquele dia.
 *
 * Isso não é rigor a mais: é ruído. Uma tela conferida hoje nunca conseguiria
 * ficar verde hoje, e portão que não consegue ficar verde é portão que se
 * aprende a ignorar — a mesma morte de sempre.
 *
 * Conferência com data solta passa a valer até o FIM daquele dia; com carimbo,
 * vale a partir do instante. Quem confere de verdade grava carimbo. */
function mudouDepois(arquivos, data) {
  /* Sem hora no livro, compara-se DIA com DIA — e em texto, porque `%cI` já
     começa com a data local no formato certo. A tentativa anterior somava um
     fim-de-dia com fuso `+14:00`, o que em UTC ADIANTA o limite em vez de
     atrasá-lo: um commit das 12:29 local passou a "vencer" uma conferência do
     mesmo dia. Aritmética de fuso é onde se erra o sinal; comparar o texto da
     data não tem sinal para errar. */
  const comHora = data.includes('T');
  const depois = [];
  for (const arq of arquivos) {
    let quando;
    try {
      quando = execFileSync('git', ['log', '-1', '--format=%cI', '--', arq], { cwd: RAIZ, encoding: 'utf8' }).trim();
    } catch { continue; }
    if (!quando) continue;
    const passou = comHora ? new Date(quando) > new Date(data) : quando.slice(0, 10) > data;
    if (passou) depois.push(`${arq} (${quando.slice(0, 16).replace('T', ' ')})`);
  }
  return depois;
}

if (process.argv.includes('--semear')) {
  const entradas = {};
  for (const q of quadros()) {
    /* O estado de partida é o HONESTO: tudo que o inventário diz "comparada"
       foi comparado por captura, porque era o único método que existia quando
       aquelas linhas foram escritas. Semear como `dado-do-no` seria escrever o
       verde por omissão dentro do próprio instrumento que veio matá-lo. */
    const comparada = /comparad|constru/i.test(q.estado);
    entradas[q.no] = {
      tela: q.tela,
      rota: q.rota,
      conferido_em: comparada ? '2026-09-02' : null,
      contra: comparada ? 'captura' : null,
      arquivos: palpitar(q.rota),
      nota: comparada ? 'herdado do TELAS-FIGMA.md; refazer contra o dado do no' : null,
    };
  }
  mkdirSync(join(RAIZ, 'docs/quadros'), { recursive: true });
  writeFileSync(LIVRO, JSON.stringify({ formato: 1, entradas }, null, 2) + '\n');
  console.log(`semeado: ${Object.keys(entradas).length} quadros em docs/quadros/conferido.json`);
  process.exit(0);
}

if (process.argv.includes('--provar')) {
  const l = livro();
  if (!l) { console.log('CONTROLE NEGATIVO: sem livro. Rode --semear primeiro.'); process.exit(1); }
  const nos = Object.keys(l.entradas);
  const bom = { ...l.entradas[nos[0]], conferido_em: '2099-01-01', contra: 'dado-do-no', arquivos: ['web/src/main.jsx'], nota: null };
  const so = quadros().filter((q) => q.no === nos[0]);
  const passa = julgar({ ...l, entradas: { [nos[0]]: bom } }, so).length === 0;
  const reprova = julgar({ ...l, entradas: { [nos[0]]: { ...bom, contra: 'captura' } } }, so).length === 1;
  console.log(passa && reprova
    ? 'CONTROLE NEGATIVO: passa no caso bom e reprova no caso ruim. Serve.'
    : `CONTROLE NEGATIVO FALHOU: bom=${passa} ruim=${reprova}. Instrumento cego num dos sentidos.`);
  process.exit(passa && reprova ? 0 : 1);
}

function julgar(l, lista = quadros()) {
  const faltas = [];
  const vistos = new Set();
  for (const q of lista) {
    vistos.add(q.no);
    const e = l?.entradas?.[q.no];
    if (!e || !e.conferido_em) { faltas.push({ tipo: 'NUNCA CONFERIDA', q }); continue; }
    if (e.contra !== 'dado-do-no') { faltas.push({ tipo: 'INSTRUMENTO ERRADO', q, detalhe: `contra: ${e.contra}` }); continue; }
    if (!e.arquivos?.length) { faltas.push({ tipo: 'SEM ARQUIVO', q, detalhe: 'a conferencia nunca vence porque nao sabe o que observar' }); continue; }
    const mudou = mudouDepois(e.arquivos, e.conferido_em);
    if (mudou.length) faltas.push({ tipo: 'CONFERENCIA VENCIDA', q, detalhe: mudou.join(', ') });
  }
  return faltas;
}

/* quando chamado como --provar, `julgar` roda com um livro de mentira; aqui
   com o de verdade. A ordem das declarações permite as duas. */
const l = livro();
if (!l) {
  console.log('quadro: docs/quadros/conferido.json nao existe.');
  console.log('        Rode `node scripts/quadro.mjs --semear` uma vez.');
  process.exit(1);
}
const faltas = julgar(l);
const total = quadros().length;
if (!faltas.length) {
  console.log(`quadro: ${total} quadros, todos conferidos contra o dado do no e em dia.`);
  process.exit(0);
}
const porTipo = {};
for (const f of faltas) (porTipo[f.tipo] ??= []).push(f);
console.log(`quadro: ${faltas.length} de ${total} quadros sem conferencia valida.\n`);
for (const [tipo, lista] of Object.entries(porTipo)) {
  console.log(`  ${tipo}  (${lista.length})`);
  for (const f of lista.slice(0, 40)) {
    console.log(`      ${f.q.no}  ${f.q.tela}  ${f.q.rota}${f.detalhe ? '\n          ' + f.detalhe : ''}`);
  }
  if (lista.length > 40) console.log(`      … e mais ${lista.length - 40}`);
  console.log('');
}
process.exit(1);
