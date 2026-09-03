(async () => {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  await esperar(5500);
  const longas = [];
  new PerformanceObserver((l) => l.getEntries().forEach(e => longas.push(+e.duration.toFixed(0)))).observe({ entryTypes: ['longtask'] });
  const o = (x, y, extra = {}) => ({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, ...extra });
  const medir = async (nome, fazer) => {
    const q = []; let u = performance.now(); let vivo = true;
    const d0 = window.__canvas.desenhos, l0 = longas.length;
    const conta = (t) => { q.push(t - u); u = t; if (vivo) requestAnimationFrame(conta); };
    requestAnimationFrame(conta);
    await fazer();
    vivo = false; await esperar(150);
    const s = q.slice(2).sort((a, b) => a - b);
    if (!s.length) return { fase: nome, erro: 'nenhum quadro medido' };
    return { fase: nome, mediana: +s[Math.floor(s.length / 2)].toFixed(1), p90: +s[Math.floor(s.length * 0.9)].toFixed(1),
             pior: +s[s.length - 1].toFixed(1), desenhos: window.__canvas.desenhos - d0, longas: longas.length - l0 };
  };
  /* `ondeOuve` existe por causa da PEGA de ligacao: ela trata `pointermove` e
     `pointerup` nela mesma, com captura de ponteiro. Um arrasto despachado na
     janela nunca a alcanca, e o fio parece quebrado estando inteiro. */
  const arrastar = async (el, x0, y0, dx, dy, passos = 30, extra = {}, ondeOuve = window) => {
    el.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0, extra)));
    for (let i = 1; i <= passos; i++) { ondeOuve.dispatchEvent(new PointerEvent('pointermove', o(x0 + dx * i / passos, y0 + dy * i / passos))); await new Promise(k => requestAnimationFrame(k)); }
    ondeOuve.dispatchEvent(new PointerEvent('pointerup', o(x0 + dx, y0 + dy)));
  };
  const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  /* UMA FASE SO VALE SE ACERTAR O QUE ELA DIZ QUE PEGA. A primeira versao pegou
     uma secao que estava POR BAIXO do cabecalho do app: os eventos iam para o
     elemento certo, as coordenadas caiam no `nav`, e o gesto virava laco. O
     numero saia (31 desenhos) e descrevia outra coisa. */
  const acerta = (el, x, y) => { const a = document.elementFromPoint(x, y); return Boolean(a && (el.contains(a) || a === el)); };
  const primeiroVisivel = (sel, dx, dy) => {
    for (const el of document.querySelectorAll(sel)) {
      const c = el.getBoundingClientRect();
      const x = c.left + dx(c), y = c.top + dy(c);
      if (x > 8 && y > 8 && x < innerWidth - 8 && y < innerHeight - 8 && acerta(el, x, y)) return { el, x, y };
    }
    return null;
  };
  const r = [{ objetos: window.__canvas.objetos, tracos: window.__canvas.tracos, nos: window.__canvas.nosNoDom(), porTipo: { ...window.__canvas.porTipo } }];

  for (let k = 0; k < 3; k++) {
    const p = primeiroVisivel('.nota-canvas', () => 150, () => 20);
    if (!p) { r.push({ fase: `arrastar nota #${k + 1}`, erro: 'nenhuma nota alcancavel' }); break; }
    r.push(await medir(`arrastar nota #${k + 1}`, () => arrastar(p.el, p.x, p.y, (k % 2 ? -1 : 1) * 190, 70)));
    esc(); await esperar(700);
  }
  const pl = primeiroVisivel('.livro-canvas', () => 40, () => 30);
  if (pl) { r.push(await medir('arrastar livro', () => arrastar(pl.el, pl.x, pl.y, -220, 90))); esc(); await esperar(600); }
  else r.push({ fase: 'arrastar livro', erro: 'nenhum livro alcancavel' });
  const ps = primeiroVisivel('.canvas-secao-faixa', () => 120, (c) => c.height / 2);
  if (ps) { r.push(await medir('arrastar secao', () => arrastar(ps.el, ps.x, ps.y, 180, 120))); esc(); await esperar(700); }
  else r.push({ fase: 'arrastar secao', erro: 'nenhuma faixa de secao alcancavel' });
  const tres = [];
  for (const el of document.querySelectorAll('.nota-canvas')) {
    const c = el.getBoundingClientRect(); const x = c.left + 60, y = c.top + 20;
    if (x > 8 && y > 8 && x < innerWidth - 8 && y < innerHeight - 8 && acerta(el, x, y)) tres.push({ el, x, y });
    if (tres.length === 3) break;
  }
  if (tres.length < 3) r.push({ fase: 'arrastar tres', erro: `so ${tres.length} notas alcancaveis` });
  else {
    for (const [i, t] of tres.entries()) {
      t.el.dispatchEvent(new PointerEvent('pointerdown', o(t.x, t.y, { shiftKey: i > 0 })));
      window.dispatchEvent(new PointerEvent('pointerup', o(t.x, t.y, { shiftKey: i > 0 }))); await esperar(140);
    }
    const m = await medir('arrastar tres', () => arrastar(tres[0].el, tres[0].x, tres[0].y, 210, 70));
    m.escolhidos = window.__canvas.escolhidos;
    r.push(m);
  }
  esc(); await esperar(500);
  {
    /* UM PAR AINDA NAO LIGADO. O endpoint e idempotente: repetir um par que ja
       existe devolve 201 sem criar nada, e a fase relataria `tracos_novos 0`
       como se puxar fio nao funcionasse. */
    const estado = await fetch('/canvas/superficie', { credentials: 'include' }).then(x => x.json());
    const ligados = new Set(estado.ligacoes.filter(l => l.de_tipo === 'nota' && l.para_tipo === 'nota').flatMap(l => [`${l.de_id}|${l.para_id}`, `${l.para_id}|${l.de_id}`]));
    const cartoes = [...document.querySelectorAll('.nota-canvas')].filter(e => { const c = e.getBoundingClientRect(); return c.top > 8 && c.left > 8 && c.right < innerWidth - 8 && c.bottom < innerHeight - 8; });
    let de = null, para = null;
    for (const a of cartoes) { for (const b of cartoes) {
      if (a === b || ligados.has(`${a.dataset.nota}|${b.dataset.nota}`)) continue;
      const ca = a.getBoundingClientRect(), cb = b.getBoundingClientRect();
      if (Math.abs(ca.left - cb.left) < 220) continue;
      const pega = a.querySelector('.nota-pega-direita') || a.querySelector('.nota-pega');
      const cp = pega?.getBoundingClientRect();
      if (!cp || !acerta(pega, cp.left + cp.width / 2, cp.top + cp.height / 2)) continue;
      de = { el: pega, x: cp.left + cp.width / 2, y: cp.top + cp.height / 2 }; para = cb; break;
    } if (de) break; }
    if (!de) r.push({ fase: 'puxar fio', erro: 'nenhum par visivel ainda nao ligado, com pega ao alcance' });
    else {
      const t0 = window.__canvas.tracos;
      const m = await medir('puxar fio', () => arrastar(de.el, de.x, de.y, para.left + 80 - de.x, para.top + 40 - de.y, 30, {}, de.el));
      await esperar(700); m.tracos_novos = window.__canvas.tracos - t0; r.push(m);
    }
  }
  esc(); await esperar(400);
  esc(); await esperar(400);
  { const m = document.querySelector('.canvas-mundo').getBoundingClientRect();
    r.push(await medir('laco', () => arrastar(document.querySelector('.canvas-mundo'), m.left + 30, m.top + 180, m.width - 90, 460))); }
  esc(); await esperar(500);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
  await esperar(100);
  { const m = document.querySelector('.canvas-mundo').getBoundingClientRect();
    r.push(await medir('espaco deslocando', () => arrastar(document.querySelector('.canvas-mundo'), m.left + 400, m.top + 300, 420, 210))); }
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true })); await esperar(400);
  // criar ligacao: pegar a alca de fio de um cartao e soltar em outro
  const abrirBusca = document.querySelector('.canvas-procura button');
  if (!abrirBusca) r.push({ fase: 'busca', erro: 'botao de procurar nao encontrado' });
  else {
    abrirBusca.click(); await esperar(300);
    const busca = document.querySelector('.canvas-procura input[type="search"]');
    if (!busca) r.push({ fase: 'busca', erro: 'o campo nao abriu depois do clique' });
    else {
      const setar = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const antes = window.__canvas.desenhos;
      const m = await medir('busca', async () => {
        for (const n of [1, 2, 3, 4, 5]) { setar.call(busca, 'carga'.slice(0, n)); busca.dispatchEvent(new Event('input', { bubbles: true })); await esperar(90); }
      });
      m.achados = document.querySelectorAll('.canvas-achados li').length;
      m.desenhos_conferidos = window.__canvas.desenhos - antes;
      r.push(m);
    }
  }
  esc(); await esperar(300);
  r.push(await medir('zoom por degraus', async () => {
    const menos = [...document.querySelectorAll('.canvas-zoom button')].find(b => /afast/i.test(b.getAttribute('aria-label') || ''));
    for (let i = 0; i < 8; i++) { menos.click(); await esperar(70); }
  }));
  return { medidas: r, todas_as_longas: longas };
})()
