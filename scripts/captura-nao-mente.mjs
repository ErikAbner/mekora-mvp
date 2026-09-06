/* A FOTO CONFERE COM A TELA? — a prova do R-55.
 *
 *     node scripts/captura-nao-mente.mjs
 *     node scripts/captura-nao-mente.mjs --provar
 *
 * POR QUE ISTO EXISTE. Em 05/09 escrevi um item de bancada dizendo que ela não
 * entregava as notas do Canvas. Entregava: a API respondia, o DOM tinha as três
 * notas visíveis por nove segundos, e a MEDIDA as via. Quem mentiu foi a FOTO —
 * `captureBeyondViewport` redimensiona a área de composição, e a captura saiu
 * com "Nada aqui ainda" numa tela que tinha conteúdo. O conserto foi `--vista`.
 *
 * Em 06/09 o `--vista` mentiu de novo, por outro motivo: o recorte é em
 * coordenada de PÁGINA, e numa página rolada `y: 0` aponta para um topo que já
 * não está composto. A foto saiu PRETA duas vezes antes de eu medir o `scrollY`
 * em vez de olhar a imagem e supor.
 *
 * O padrão é o mesmo nos dois: a captura sai de UMA cor só, e uma tela de uma
 * cor só é sempre mentira — nenhuma tela do Mekora é um retângulo liso. Esta
 * prova mede exatamente isso, na tela que ROLA sozinha (a Leitura restaura onde
 * a pessoa parou), que é onde o defeito de 06/09 aparecia.
 *
 * CONTROLE NEGATIVO (`--provar`): a mesma contagem sobre um PNG de uma cor só
 * tem de acusar. Sem isso, "a foto confere" é só o que o instrumento sempre diz.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const WEB = process.env.MEKORA_WEB || 'http://localhost:5180';
const dir = mkdtempSync(join(tmpdir(), 'mekora-foto-'));

function cores(png) {
  const saida = execFileSync('python3', ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
print(len(im.getcolors(maxcolors=1 << 24) or []))
`, png], { encoding: 'utf8' });
  return parseInt(saida.trim(), 10);
}

function sessao() {
  const saida = execFileSync('scripts/sessao-de-prova.sh', {
    cwd: RAIZ, encoding: 'utf8', timeout: 90000,
    env: { ...process.env, MEKORA_PROVA: process.env.MEKORA_PROVA || RAIZ + '.ver' },
  });
  const [token, livro] = saida.trim().split('\n');
  return { token, livro };
}

function fotografa() {
  const { token, livro } = sessao();
  const medida = join(dir, 'm.js');
  writeFileSync(medida, 'Math.round(scrollY)');
  const png = join(dir, 'f.png');
  const bruto = execFileSync('node', ['scripts/medir.mjs', `${WEB}/leitura/${livro}`, '1440', '1000',
    medida, `--sessao=${token}`, `--png=${png}`, '--vista'],
    { cwd: RAIZ, encoding: 'utf8', timeout: 110000 });
  return { png, rolou: parseInt(bruto.trim(), 10) || 0 };
}

if (process.argv.includes('--provar')) {
  const liso = join(dir, 'liso.png');
  execFileSync('python3', ['-c', `
from PIL import Image
Image.new('RGB', (200, 200), (17, 17, 17)).save('${liso}')
`]);
  const nLiso = cores(liso);
  let nReal = null, mudo = null;
  try { nReal = cores(fotografa().png); } catch (e) { mudo = String(e.message).slice(0, 90); }
  if (mudo) {
    console.log(`  ?      captura  indeterminada — nao deu para fotografar (${mudo})`);
    console.log('\nNao e falha do controle: e ausencia de resposta. Suba o servidor e rode de novo.');
    process.exit(97);
  }
  /* DEZESSEIS, e não duzentos. A primeira versão pedia 200 e a tela real
     devolveu 229 — quinze por cento de folga, que é folga nenhuma numa tela
     escura com poucos elementos. O que se separa aqui é uma foto de UMA cor de
     uma foto de tela; qualquer número entre 3 e 200 separa isso igualmente
     bem, e 16 não reprova a tela mais vazia do produto. */
  const serve = nLiso <= 2 && nReal > 16;
  console.log(`  ${serve ? 'serve  ' : 'FALHOU '} captura  real: ${nReal} cores · lisa: ${nLiso} cor(es)`);
  console.log(serve
    ? '\nCONTROLE NEGATIVO: a contagem acusa a foto lisa e absolve a foto de verdade. Serve.'
    : '\nCONTROLE NEGATIVO FALHOU: a contagem nao separa uma tela de um retangulo.');
  process.exit(serve ? 0 : 1);
}

const { png, rolou } = fotografa();
const n = cores(png);
console.log(`captura: ${n} cores distintas, com a pagina rolada em ${rolou}px`);
if (n <= 16) {
  console.log('\nA FOTO MENTE: uma tela de uma cor so. Nenhuma tela do Mekora e um retangulo liso.');
  process.exit(1);
}
console.log('\nA foto confere com a tela.');
