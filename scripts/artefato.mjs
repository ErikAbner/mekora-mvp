/* Monta o artefato publicável a partir do protótipo, e verifica o RESULTADO.
 *
 * Por que isto existe como script, e não como uma sequência de comandos: a
 * emenda que apagou 346 regras de CSS saiu em quatro artefatos publicados
 * enquanto eu media o arquivo-fonte, que estava correto. Fonte e artefato são
 * dois arquivos. Verificar um não é verificar o outro, e o que vai para o
 * navegador de outra pessoa é o segundo.
 *
 *   node scripts/artefato.mjs [entrada.html] [saida.html]
 *
 * O que ele faz, e por quê:
 *  1. embute capas/*.jpg e capas/*.png como data: URI — o artefato roda sem
 *     servidor e sem nenhum pedido a outro domínio, que a política do
 *     visualizador bloqueia;
 *  2. troca position:fixed por absolute nas camadas que se prendiam à janela —
 *     dentro do quadro do artefato, "a janela" não é a janela;
 *  3. entrega <title>, <meta charset> e o corpo, sem <html>/<head>/<body>,
 *     porque o publicador põe o esqueleto;
 *  4. roda o verificador NO ARQUIVO GERADO.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const entrada = process.argv[2] || join(raiz, 'prototipo-mesa.html');
const saida = process.argv[3] || join(raiz, 'artefato-mekora.html');

let s = readFileSync(entrada, 'utf8');
let embutidas = 0;

/* ── 1 · capas ───────────────────────────────────────────────────── */
const dirCapas = join(raiz, 'capas');
const mapa = {};
if (existsSync(dirCapas)) {
  for (const arq of readdirSync(dirCapas)) {
    const tipo = arq.endsWith('.png') ? 'image/png'
      : arq.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
    mapa[arq] = `data:${tipo};base64,${readFileSync(join(dirCapas, arq)).toString('base64')}`;
  }
}
/* as citadas por caminho literal */
for (const arq of Object.keys(mapa)) {
  const alvo = `capas/${arq}`;
  if (!s.includes(alvo)) continue;
  s = s.split(alvo).join(mapa[arq]);
  embutidas++;
}
/* capa(n) e lomb(n) montam o caminho em tempo de execução — não há string
   literal para trocar. As duas passam a ler uma tabela embutida e mantêm a
   assinatura: nada mais no protótipo sabe da diferença.
   Sem expressão regular montada por concatenação: a primeira versão fazia
   isso, o "d" barrado virava um "d" comum ao atravessar a aspa simples, e a
   tabela saía vazia sem reclamar — 26 imagens a menos, e nenhum erro na tela. */
for (const [pre, fn, ext] of [['capa', 'capa', 'jpg'], ['lombada', 'lomb', 'png']]) {
  const linha = 'const ' + fn + '=n=>"capas/' + pre + '-"+n+".' + ext + '";';
  if (!s.includes(linha)) {
    console.error(`não achei a linha de ${fn}() para embutir`);
    process.exit(1);
  }
  const tabela = {};
  for (const arq of Object.keys(mapa)) {
    if (!arq.startsWith(pre + '-') || !arq.endsWith('.' + ext)) continue;
    tabela[arq.slice(pre.length + 1, -(ext.length + 1))] = mapa[arq];
  }
  const quantas = Object.keys(tabela).length;
  if (!quantas) {
    console.error(`nenhuma imagem casou com ${pre}-NN.${ext} em capas/`);
    process.exit(1);
  }
  embutidas += quantas;
  const NOME = fn.toUpperCase();
  s = s.replace(linha, `const ${NOME}=${JSON.stringify(tabela)};`
    + `const ${fn}=n=>${NOME}[n]||"";`);
}
/* Um caminho relativo que sobra vira imagem quebrada no artefato, e imagem
   quebrada passa despercebida numa tela cheia de texto. */
const sobraram = [...new Set([...s.matchAll(/["'(]((?:\.\/)?capas\/[^"')]+)/g)].map(m => m[1]))];
if (sobraram.length) {
  console.error(`caminhos de capa não embutidos: ${sobraram.join(', ')}`);
  process.exit(1);
}

/* ── 2 · o que se prendia à janela passa a se prender ao quadro ──── */
for (const sel of ['#ctl', '#notasbt', '#notas', '.veu', '.dockL', '.paparencia']) {
  const re = new RegExp(sel.replace(/[.#]/g, '\\$&') + '\\{[^}]*?position:fixed', 'g');
  s = s.replace(re, (m) => m.replace('position:fixed', 'position:absolute'));
}
s = s.replace('#app{position:fixed;inset:0;',
  '#app{position:relative;height:100vh;min-height:760px;');
if (s.includes('#app{position:fixed')) {
  console.error('#app continua preso à janela — o artefato ficaria fora do quadro');
  process.exit(1);
}

/* ── 3 · só o miolo ──────────────────────────────────────────────── */
const titulo = (s.match(/<title>([\s\S]*?)<\/title>/) || [, 'Mekora'])[1];
const estilo = (s.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const corpo = (s.match(/<body>([\s\S]*)<\/body>/) || [, ''])[1];
if (!estilo || !corpo) {
  console.error(`não achei <style> ou <body> em ${entrada}`);
  process.exit(1);
}
writeFileSync(saida, `<title>${titulo}</title>\n<meta charset="utf-8">\n${estilo}\n${corpo}\n`);

/* ── 4 · verificar o que vai sair, e não o que entrou ─────────────── */
try {
  execFileSync(process.execPath, [join(raiz, 'scripts', 'verificar.mjs'), saida], { stdio: 'inherit' });
} catch {
  console.error('o artefato NÃO passou no verificador — não publique este arquivo');
  process.exit(1);
}
const mb = (readFileSync(saida).length / 1024 / 1024).toFixed(2);
console.log(`${saida}\n  ${embutidas} imagens embutidas · ${mb} MB`);
if (+mb > 16) {
  console.error('acima de 16 MB: o visualizador recusa');
  process.exit(1);
}
