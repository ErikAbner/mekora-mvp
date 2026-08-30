/* Mede layout real dos protótipos num Chrome de verdade, por CDP.
 *
 * Por que isto existe: o painel de navegador embutido em editores com agente
 * renderiza a página e tira captura, mas não compõe layout para medição —
 * innerWidth devolve 0 e todo getBoundingClientRect() sai degenerado. Duas
 * rodadas fecharam com "não verifiquei renderizado" por causa disso, e foi
 * assim que 96 miniaturas de página passaram seis dias com 2 pixels de largura
 * sem ninguém ver. Captura serve para julgar composição; número só vale medido.
 *
 * Sem dependência: Node 18+ já tem fetch e WebSocket globais.
 *
 *   node scripts/medir.mjs <url> [largura] [altura] [setup.js] <medida.js> [--png=arq] [--gesto=arq]
 *
 * setup.js  roda antes da medida (põe o protótipo no estado que interessa)
 * medida.js é uma expressão avaliada na página; o valor volta como JSON
 * --gesto=  arquivo avaliado na página que devolve pontos [{x,y},...]; o Chrome
 *           anda por eles com o botão apertado, entre o setup e a medida
 *
 * Exemplo:
 *   python3 -m http.server 8765 -d . &
 *   node scripts/medir.mjs http://localhost:8765/prototipo-mesa.html 1440 900 \
 *     scripts/medidas/progresso.js
 */
import { spawn } from 'node:child_process';
import { setTimeout as espera } from 'node:timers/promises';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function achaChrome() {
  const cache = join(homedir(), '.cache/puppeteer/chrome');
  if (existsSync(cache)) {
    for (const v of readdirSync(cache)) {
      const p = join(cache, v, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
      if (existsSync(p)) return p;
      const l = join(cache, v, 'chrome-linux64/chrome');
      if (existsSync(l)) return l;
      const w = join(cache, v, 'chrome-win64/chrome.exe');
      if (existsSync(w)) return w;
    }
  }
  const fixos = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
    /* Windows: o repo e trabalhado das duas maquinas, e o instrumento
       precisa rodar nas duas — senao a medida volta a ser aritmetica */
    join(process.env['PROGRAMFILES'] || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/Application/msedge.exe'),
  ].filter(Boolean);
  const achado = fixos.find(existsSync);
  if (!achado) throw new Error('nenhum Chrome encontrado — instale um ou aponte CHROME=');
  return achado;
}

/* --png=<arquivo> guarda a composicao junto da medida. Numero diz se a caixa
   tem o tamanho certo; captura diz se a tela quer ser olhada. Sao perguntas
   diferentes, e ate agora so uma delas tinha instrumento. */
const bruto = process.argv.slice(2);
const png = (bruto.find(x => x.startsWith('--png=')) || '').slice(6) || null;
/* --gesto=<arquivo.js> e avaliado na pagina e deve devolver uma lista de
   pontos [{x,y},...]; o Chrome anda por eles com o botao apertado. Existe
   porque arrasto nao se mede com expressao: dispatchEvent sintetico nao gera
   captura de ponteiro, e captura e exatamente onde o arrasto quebra. */
const gesto = (bruto.find(x => x.startsWith('--gesto=')) || '').slice(8) || null;
const [url, larg = '1440', alt = '900', a4, a5] = bruto.filter(x => !x.startsWith('--'));
const arqMedida = a5 || a4;
const arqSetup = a5 ? a4 : null;
if (!url || !arqMedida) {
  console.error('uso: node scripts/medir.mjs <url> [largura] [altura] [setup.js] <medida.js> [--png=] [--gesto=]');
  process.exit(2);
}

const porta = 9333 + Math.floor(process.pid % 500);
const chrome = spawn(process.env.CHROME || achaChrome(), [
  '--headless=new', `--remote-debugging-port=${porta}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  `--window-size=${larg},${alt}`, `--user-data-dir=/tmp/medir-${porta}-${Date.now()}`,
  '--disk-cache-size=1', '--media-cache-size=1', 'about:blank',
], { stdio: 'ignore' });

let ws, seq = 0;
const abertas = new Map();
const manda = (metodo, params = {}) => new Promise((ok, falha) => {
  const id = ++seq;
  abertas.set(id, { ok, falha });
  ws.send(JSON.stringify({ id, method: metodo, params }));
});

try {
  let alvos;
  for (let i = 0; i < 60 && !alvos?.length; i++) {
    try { alvos = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json(); } catch { /* subindo */ }
    if (!alvos?.length) await espera(200);
  }
  const aba = alvos.find(t => t.type === 'page');
  ws = new WebSocket(aba.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    const p = m.id && abertas.get(m.id);
    if (!p) return;
    abertas.delete(m.id);
    m.error ? p.falha(new Error(m.error.message)) : p.ok(m.result);
  });

  await manda('Page.enable');
  await manda('Runtime.enable');
  /* Uma captura veio de uma copia em cache: a medida na mesma sessao mostrava
     a barra nova e a imagem mostrava a antiga. Captura velha apresentada como
     atual e o pior defeito que este instrumento pode ter — ele existe para
     dizer o que esta na tela agora. */
  await manda('Network.enable');
  await manda('Network.setCacheDisabled', { cacheDisabled: true });
  await manda('Emulation.setDeviceMetricsOverride',
    { width: +larg, height: +alt, deviceScaleFactor: 1, mobile: false });
  const nav = await manda('Page.navigate', { url });
  if (nav.errorText) throw new Error(`a página não carregou: ${nav.errorText} — ${url}`);
  await espera(1500);

  const avalia = async (expr) => {
    const r = await manda('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'erro na página');
    return r.result.value;
  };

  /* Página vazia mede como página quebrada. Com o servidor no ar mas parado,
     `smoke` devolvia "162 telas → 0, pinta is not defined" e isso lê como
     defeito no protótipo — eu quase fui atrás de um que não existia. Medida
     sobre nada não é medida: é para falhar, não para reportar. */
  /* A guarda media a presença de `#app`, que era o raiz do protótipo. Isso a
     fazia recusar qualquer outra página — o mekora-web monta em `#raiz` e ela
     parou tudo dizendo "#app ausente", que descreve o instrumento e não a
     página. A intenção continua a mesma; o que muda é o que ela conta: nós
     RENDERIZADOS, e não um id específico. Um app que montou tem dezenas; um
     que não montou tem o contêiner vazio e mais nada. */
  const carregou = await avalia('({t:document.title,n:document.body?document.body.querySelectorAll("*").length:0})');
  if (carregou.n < 5) {
    throw new Error(`a página respondeu mas não montou (título "${carregou.t}", ${carregou.n} nós renderizados) — ${url}`);
  }

  if (arqSetup) { await avalia(readFileSync(arqSetup, 'utf8')); await espera(400); }
  if (gesto) {
    const pts = await avalia(readFileSync(gesto, 'utf8'));
    if (!Array.isArray(pts) || pts.length < 2)
      throw new Error('--gesto precisa devolver ao menos dois pontos {x,y}');
    const bota = (type, pt) => manda('Input.dispatchMouseEvent',
      { type, x: Math.round(pt.x), y: Math.round(pt.y), button: 'left',
        buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' });
    await manda('Input.dispatchMouseEvent',
      { type: 'mouseMoved', x: Math.round(pts[0].x), y: Math.round(pts[0].y),
        button: 'none', buttons: 0, pointerType: 'mouse' });
    await bota('mousePressed', pts[0]);
    /* passos intermediarios: um arrasto de um quadro so nao e arrasto, e e
       exatamente o que esconde limiar mal posto e captura perdida. */
    for (let i = 1; i < pts.length; i++) { await bota('mouseMoved', pts[i]); await espera(24); }
    await bota('mouseReleased', pts[pts.length - 1]);
    await espera(260);
  }
  console.log(JSON.stringify(await avalia(readFileSync(arqMedida, 'utf8')), null, 2));
  if (png) {
    await espera(500);
    const alt2 = await avalia('Math.min(document.documentElement.scrollHeight,12000)');
    const r = await manda('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: +larg, height: alt2, scale: 1 } });
    writeFileSync(png, Buffer.from(r.data, 'base64'));
    console.error(`captura: ${png} (${larg}×${alt2})`);
  }
} finally {
  try { ws?.close(); } catch { /* já fechado */ }
  chrome.kill();
}
