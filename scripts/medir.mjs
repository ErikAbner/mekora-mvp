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
 *   node scripts/medir.mjs <url> [largura] [altura] [setup.js] <medida.js> [--png=arq] [--gesto=arq] [--mouse=seletor] [--dentro=seletor] [--sessao=token] [--espera=ms]
 *
 * setup.js  roda antes da medida (põe o protótipo no estado que interessa)
 * --espera= quanto esperar DEPOIS do setup, em milissegundos (padrão 400). Um
 *           setup que só clica cabe nos 400; um que espera resposta do
 *           servidor, não.
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

/* --depois=<url> navega DE NOVO depois do setup, e espera montar.
 *
 * Existe porque medir tela protegida tem duas etapas que nao cabem numa
 * navegacao so: primeiro a sessao passa a existir, depois a tela abre. O
 * `portao-logado.sh` ja descrevia uma flag `--tela` com esta funcao — e ela
 * nunca foi implementada, entao o script media o destino do redirecionamento
 * de /entrar/<token>, e nao a tela que o argumento pedia.
 *
 * Fazer isso pelo `history.pushState` de dentro do setup nao serve: o React
 * Router nao reage, e a medida sai da tela errada relatando "cabe". Verde por
 * omissao, de novo. Navegacao de verdade, e a guarda de montagem roda outra
 * vez sobre a pagina nova. */
const depois = (bruto.find(x => x.startsWith('--depois=')) || '').slice(9) || null;
/* --gesto=<arquivo.js> e avaliado na pagina e deve devolver uma lista de
   pontos [{x,y},...]; o Chrome anda por eles com o botao apertado. Existe
   porque arrasto nao se mede com expressao: dispatchEvent sintetico nao gera
   captura de ponteiro, e captura e exatamente onde o arrasto quebra. */
const gesto = (bruto.find(x => x.startsWith('--gesto=')) || '').slice(8) || null;
/* --dentro=<seletor> CLICA e espera, depois de `--depois` e antes da medida.
 *
 * POR QUE ISTO EXISTE: duas telas do produto so se alcancam por dentro —
 * `/nota/:id` e `/estudo/:id` nao tem URL fixa, porque o id e de um registro que
 * a semente cria com numero diferente a cada rodada. A auditoria mede por URL, e
 * por isso as duas ficaram fora dela por semanas: elas passavam no portao
 * quando alguem as media a mao, e nada as media sozinho.
 *
 * O clique e do ROTEADOR, e nao uma navegacao nova: `location.href` derruba a
 * sessao de medida ("Inspected target navigated or closed"). Sair pelo roteador
 * e navegacao no mesmo documento, e o contexto sobrevive — a mesma licao que a
 * bancada ja tinha pago.
 */
const dentro = (bruto.find(x => x.startsWith('--dentro=')) || '').slice(9) || null;

/* --mouse=<seletor> LEVA O PONTEIRO até o centro do elemento, sem apertar.
 *
 * POR QUE ISTO EXISTE: `:hover` é um estado que nenhuma medida daqui alcançava.
 * `--gesto` sempre aperta o botão — ele foi feito para arrasto —, e apertar num
 * cartão da Estante o SELECIONA, que é outro estado. Sem isto, a única forma de
 * "medir" o hover era ler a folha de estilo e acreditar, e foi assim que o R-01
 * atravessou três rodadas: o Erik via a tela, eu lia a regra, e nós dois
 * estávamos falando de coisas diferentes.
 *
 * `dispatchEvent` sintético não serve: `:hover` do CSS responde ao ponteiro
 * real do navegador, não a um evento fabricado em JavaScript. Por isso é CDP. */
const passaOMouse = (bruto.find(x => x.startsWith('--mouse=')) || '').slice(8) || null;
/* --sessao=<token> POE O BISCOITO direto, em vez de abrir um link de entrada.
 *
 * O link e de uso unico e tem teto — 20 por origem por hora desde 03/09 —, e a
 * auditoria pede 66 medidas. Ela morria no vigesimo, e as demais mediam a tela
 * de "Criar conta" ate o `--depois` recusar. Com o token, uma sessao serve a
 * rodada inteira e nenhum teto e tocado.
 *
 * O token vem do `scripts/sessao-de-prova.sh`, que escreve a sessao no banco de
 * PROVA com o mesmo resumo sha256 que o servidor confere.
 */
const sessao = (bruto.find(x => x.startsWith('--sessao=')) || '').slice(9) || null;

/* --teclas=<texto> DIGITA, depois do gesto. `\n` vale por Enter e `\t` por Tab.
 *
 * Existe porque `dispatchEvent(new KeyboardEvent(...))` nao escreve nada: o
 * React ate recebe o `keydown`, mas o campo nao muda de valor e o `blur` que
 * confirma nunca acontece. Foi assim que renomear uma secao "falhou" tres
 * medidas seguidas com o produto inteiro: o clique sintetico nao dava foco, e o
 * Enter sintetico nao disparava o blur. Com `Input.dispatchKeyEvent` o texto
 * entra como se alguem tivesse batido nas teclas. */
const teclas = bruto.find(x => x.startsWith('--teclas=')) !== undefined
  ? (bruto.find(x => x.startsWith('--teclas=')) || '').slice(9)
  : null;
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

  /* --escuro emula a preferência de tema do sistema operacional.
   *
   * Sem isto o portão só media o tema claro, e o escuro passava a existir sem
   * nunca ter sido medido — que é como um tema nasce com preto puro e branco
   * puro sem ninguém ver. Ele já nasceu assim uma vez: o gerador entregou
   * `#000000` e `#ffffff`, os dois valores que a regra de cor rejeita na
   * primeira linha. */
  if (process.argv.includes('--escuro')) {
    await manda('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'dark' }],
    });
  }
  if (sessao) {
    /* ANTES DA PRIMEIRA NAVEGACAO, e o comentario ja dizia isso quando o codigo
     * fazia o contrario: o bloco morava DEPOIS do `Page.navigate`, entao a
     * primeira pagina — que e a medida quando nao ha `--depois` — carregava sem
     * biscoito nenhum. A tela vinha "Criar conta no Mekora" e a sessao estava
     * boa; `curl` com o mesmo token respondia `entrou: true`.
     *
     * `url` E NAO `domain`: com `domain: 'localhost'` o Chrome responde
     * `success` e o biscoito nao acompanha o pedido. Com `url` ele deriva
     * dominio, porta e esquema do endereco de verdade. */
    const posto = await manda('Network.setCookie', {
      name: 'mekora_sessao', value: sessao,
      url, path: '/', httpOnly: true, sameSite: 'Lax',
    });
    if (!posto.success) throw new Error('--sessao: o navegador recusou o biscoito');
  }

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

  if (arqSetup) {
    /* 400ms BASTAM PARA UM CLIQUE, e não para um ida-e-volta ao servidor.
     * O setup que abre a paleta da Leitura media bem — ela aparece no mesmo
     * quadro. O que clica em "Adicionar nota" media a tela ANTES de a nota
     * voltar do backend, e eu li "o cartão não abre" de uma tela que ainda
     * estava esperando. `--espera=` diz quanto tempo dar. */
    await avalia(readFileSync(arqSetup, 'utf8'));
    const pedida = (bruto.find((a) => a.startsWith('--espera=')) || '').split('=')[1];
    await espera(Math.min(30000, Math.max(0, +pedida || 400)));
  }

  if (depois) {
    const nav2 = await manda('Page.navigate', { url: depois });
    if (nav2.errorText) throw new Error(`a segunda página não carregou: ${nav2.errorText} — ${depois}`);
    await espera(2000);
    const montou = await avalia('({p:location.pathname,n:document.body?document.body.querySelectorAll("*").length:0})');
    if (montou.n < 5) {
      throw new Error(`a segunda página respondeu mas não montou (${montou.n} nós) — ${depois}`);
    }
    /* CHEGOU ONDE PEDIU? Uma tela protegida sem sessao redireciona para
     * /entrar, que monta bem e mede bem — e a medida sai de outra tela sem
     * ninguem ver. */
    const pedido = new URL(depois).pathname;
    if (montou.p !== pedido) {
      throw new Error(`pediu ${pedido} e parou em ${montou.p} — a sessão não valeu, ou a rota não existe`);
    }
  }
  if (dentro) {
    /* O SELETOR TEM DE ACHAR ALGUEM. Um clique em nada mede a tela anterior e
     * diz que passou — o pior verde possivel, porque parece cobertura. */
    /* ESPERA O ALVO APARECER, ate seis segundos.
     *
     * A lista que o seletor procura vem de um pedido ao servidor, e a primeira
     * versao olhava uma vez so — logo depois da navegacao. Ela achava quando a
     * medida vinha de `--depois` (que ja espera 2s) e nao achava quando a rota
     * era a primeira do comando. Um instrumento que depende de qual flag veio
     * antes mede coisas diferentes pelo mesmo motivo. */
    for (let i = 0; i < 12; i++) {
      const tem = await avalia(`Boolean(document.querySelector(${JSON.stringify(dentro)}))`);
      if (tem) break;
      await espera(500);
    }

    const antes = await avalia(`(() => {
      /* O CAMINHO E LIDO ANTES DO CLIQUE. Lido depois, o roteador ja mudou a
       * rota e a conferencia "mudou de tela?" compara o destino consigo mesmo —
       * que foi exatamente o que a primeira versao fez, e ela acusou uma
       * navegacao que tinha funcionado. */
      const de = location.pathname;
      const el = document.querySelector(${JSON.stringify(dentro)});
      if (el) el.click();
      return { achou: Boolean(el), de };
    })()`);
    if (!antes.achou) throw new Error(`--dentro nao achou "${dentro}" em ${antes.de}`);
    await espera(3000);
    const chegou = await avalia('({p:location.pathname,n:document.body?document.body.querySelectorAll("*").length:0})');
    if (chegou.p === antes.de) {
      throw new Error(`--dentro clicou em "${dentro}" e a rota nao mudou: continua em ${chegou.p}`);
    }
    if (chegou.n < 5) throw new Error(`--dentro chegou em ${chegou.p} e a tela nao montou (${chegou.n} nos)`);
    /* O caminho alcancado vai para a saida: sem ele o relatorio diz "/notas" e
     * mede outra coisa. */
    process.env.MEKORA_ROTA_MEDIDA = chegou.p;
  }

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

  if (passaOMouse) {
    /* O ALVO E PROCURADO ATE APARECER, e nao uma vez so.
     *
     * A busca acontecia num instante fixo depois do setup, e a tela que ainda
     * estava montando devolvia null — o erro dizia "nao achei na tela", que le
     * como seletor errado. Em 07/09 a bancada foi recriada com mais dados e a
     * Estante passou dos 400ms: a r01 virou "nao consegui medir", e o seletor
     * achava cinco elementos quando medido a mao.
     *
     * E o mesmo controle negativo da busca que o CLAUDE.md exige, aplicado ao
     * instrumento: antes de dizer que nao ha, tentar de novo. Cinco segundos e
     * o teto; passou disso, a ausencia e de verdade. */
    let onde = null;
    for (let i = 0; i < 25 && !onde; i++) {
      onde = await avalia(`(() => { const e = document.querySelector(${JSON.stringify(passaOMouse)});
        if (!e) return null; const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
      if (!onde) await espera(200);
    }
    if (!onde) throw new Error(`--mouse: nao achei "${passaOMouse}" na tela depois de 5s`);
    await manda('Input.dispatchMouseEvent',
      { type: 'mouseMoved', x: onde.x, y: onde.y, button: 'none', buttons: 0, pointerType: 'mouse' });
    /* Um quadro para a transição começar, e o resto dela para terminar: 160ms
       é a duração do hover no sistema, e medir no meio mede um valor que não é
       nem o de repouso nem o de destino. */
    await espera(400);
  }

  if (teclas) {
    /* `keyDown` com `text` escreve; `keyUp` fecha. Sem `text`, o campo recebe a
       tecla e nao recebe o caractere, e a medida diz que digitar nao escreve. */
    const especiais = {
      '\n': { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
      '\t': { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, text: '\t' },
    };
    for (const ch of teclas) {
      const e = especiais[ch];
      if (e) {
        await manda('Input.dispatchKeyEvent', { type: 'keyDown', ...e });
        await manda('Input.dispatchKeyEvent', { type: 'keyUp', key: e.key, code: e.code, windowsVirtualKeyCode: e.windowsVirtualKeyCode });
      } else {
        /* `keyDown` COM `text` JA INSERE o caractere. Mandar `char` depois
           insere de novo: a primeira medida saiu "EEssttuuddoo ddaa jjoorrnnaaddaa"
           e o defeito era do instrumento, nao do campo. */
        await manda('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
        await manda('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
      }
      await espera(24);
    }
    await espera(400);
  }
  console.log(JSON.stringify(await avalia(readFileSync(arqMedida, 'utf8')), null, 2));
  if (png) {
    await espera(500);
    /* `--vista` CAPTURA SÓ A JANELA, sem `captureBeyondViewport`.
     *
     * O padrão estende a captura além da viewport para pegar a página inteira, e
     * isso REDIMENSIONA a área de composição por baixo. Numa página que só
     * empilha conteúdo, tudo bem. No Canvas, não: ele desenha em função do
     * tamanho da janela, e a captura estendida saiu com "Nada aqui ainda"
     * enquanto a medida, meio segundo antes, via três notas visíveis e nenhum
     * recado de vazio. Medido em 05/09, e por nove segundos seguidos: 3 notas o
     * tempo todo. A tela estava certa e a FOTO mentia.
     *
     * Cheguei a registrar um item (R-55) dizendo que a bancada não entregava as
     * notas. Entregava. O instrumento é que não sabia fotografar esta tela. */
    const soAVista = bruto.includes('--vista');
    const alt2 = soAVista ? +alt : await avalia('Math.min(document.documentElement.scrollHeight,12000)');
    /* O RECORTE É EM COORDENADA DE PÁGINA, e não de janela — mesmo com
     * `captureBeyondViewport: false`. Com a página rolada, `y: 0` aponta para
     * o topo do documento, que já não está composto: a foto sai PRETA. Custou
     * duas capturas em branco (Estudos, e o painel de aparência da Leitura,
     * que rola sozinha até onde a pessoa parou) antes de eu medir o `scrollY`
     * em vez de olhar a imagem e supor. */
    const rolagem = soAVista
      ? await avalia('({x: Math.round(scrollX), y: Math.round(scrollY)})')
      : { x: 0, y: 0 };
    const r = await manda('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: !soAVista,
        clip: { x: rolagem.x, y: rolagem.y, width: +larg, height: alt2, scale: 1 } });
    writeFileSync(png, Buffer.from(r.data, 'base64'));
    console.error(`captura: ${png} (${larg}×${alt2})`);
  }
} finally {
  try { ws?.close(); } catch { /* já fechado */ }
  chrome.kill();
}
