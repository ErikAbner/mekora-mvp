(async () => {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const quadro = () => new Promise(k => requestAnimationFrame(k));
  await esperar(5500);
  const o = (x, y, extra = {}) => ({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, ...extra });
  const S = () => fetch('/canvas/superficie', { credentials: 'include' }).then(r => r.json());
  const tecla = (key, extra = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
  const desfazer = async () => { tecla('z', { metaKey: true }); await esperar(1300); };
  const refazer = async () => { tecla('z', { metaKey: true, shiftKey: true }); await esperar(1300); };
  const acerta = (el, x, y) => { const a = document.elementFromPoint(x, y); return Boolean(a && (el.contains(a) || a === el)); };
  const naJanela = (sel = '.nota-canvas') => [...document.querySelectorAll(sel)].filter(e => { const c = e.getBoundingClientRect(); return c.top > 70 && c.left > 8 && c.right < innerWidth - 8 && c.bottom < innerHeight - 8; });
  const arrastar = async (el, x0, y0, dx, dy, ondeOuve = window) => {
    el.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0))); await esperar(60);
    for (let i = 1; i <= 16; i++) { ondeOuve.dispatchEvent(new PointerEvent('pointermove', o(x0 + dx * i / 16, y0 + dy * i / 16))); await quadro(); }
    ondeOuve.dispatchEvent(new PointerEvent('pointerup', o(x0 + dx, y0 + dy))); await esperar(700);
  };
  const escolher = async (el, junta = false) => { const c = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', o(c.left + 60, c.top + 20, { shiftKey: junta })));
    window.dispatchEvent(new PointerEvent('pointerup', o(c.left + 60, c.top + 20, { shiftKey: junta }))); await esperar(300); };
  const rede = [];
  const fetchOriginal = window.fetch;
  window.fetch = async (...a) => { const u = typeof a[0] === 'string' ? a[0] : a[0]?.url; const r = await fetchOriginal(...a);
    if (a[1]?.method && /canvas/.test(u || '')) rede.push(`${a[1].method} ${u.replace('/canvas/','')} ${a[1].body || ''} [${r.status}]`); return r; };
  const linhas = [];
  const caso = async (nome, fazer) => {
    try { const r = await fazer(); linhas.push({ op: nome, ...r }); }
    catch (e) { linhas.push({ op: nome, desfaz: false, refaz: false, nota: `estourou: ${e.message}` }); }
    tecla('Escape'); await esperar(250);
  };

  await caso('mover', async () => {
    const el = naJanela()[0]; const id = Number(el.dataset.no);
    const antes = (await S()).nos.find(n => n.id === id);
    const c = el.getBoundingClientRect();
    await arrastar(el, c.left + 100, c.top + 20, 150, 70);
    const meio = (await S()).nos.find(n => n.id === id);
    await desfazer();
    const dps = (await S()).nos.find(n => n.id === id);
    await refazer();
    const rf = (await S()).nos.find(n => n.id === id);
    return { desfaz: dps.x === antes.x && dps.y === antes.y, refaz: rf.x === meio.x && rf.y === meio.y, nota: `${antes.x},${antes.y} -> ${meio.x},${meio.y} -> ${dps.x},${dps.y}` };
  });

  await caso('esticar', async () => {
    const el = naJanela()[0]; const id = Number(el.dataset.no);
    const antes = (await S()).nos.find(n => n.id === id).largura || 375;
    const c = el.getBoundingClientRect();
    await arrastar(el, c.right - 3, c.top + c.height / 2, 90, 0);
    const meio = (await S()).nos.find(n => n.id === id).largura || 375;
    await desfazer();
    const dps = (await S()).nos.find(n => n.id === id).largura || 375;
    await refazer();
    const rf = (await S()).nos.find(n => n.id === id).largura || 375;
    return { desfaz: dps === antes, refaz: rf === meio, nota: `${antes} -> ${Math.round(meio)} -> ${dps}` };
  });

  await caso('mover varios', async () => {
    const tres = naJanela().slice(0, 3);
    for (const [i, e] of tres.entries()) await escolher(e, i > 0);
    const ids = tres.map(e => Number(e.dataset.no));
    const antes = (await S()).nos.filter(n => ids.includes(n.id)).map(n => n.x);
    const c = tres[0].getBoundingClientRect();
    await arrastar(tres[0], c.left + 100, c.top + 20, 140, 60);
    const meio = (await S()).nos.filter(n => ids.includes(n.id)).map(n => n.x);
    await desfazer();
    const dps = (await S()).nos.filter(n => ids.includes(n.id)).map(n => n.x);
    return { desfaz: dps.every((v, i) => v === antes[i]), refaz: null, nota: `${antes.length} cartoes; mudaram ${meio.filter((v, i) => v !== antes[i]).length}` };
  });

  await caso('criar nota', async () => {
    const antes = (await S()).nos.length;
    [...document.querySelectorAll('.canvas-ferramentas button')].find(b => b.getAttribute('aria-label') === 'Nova nota').click();
    await esperar(700);
    const folha = [...document.querySelectorAll('.folha')].find(f => /Escrever uma nota/i.test(f.textContent || '') && f.querySelector('input, textarea'));
    const campo = folha.querySelector('textarea') || folha.querySelector('input');
    const proto = campo.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(campo, 'Nota para a matriz de desfazer');
    campo.dispatchEvent(new Event('input', { bubbles: true })); await esperar(250);
    [...folha.querySelectorAll('button')].find(b => /p[oô]r na superf/i.test(b.textContent || '')).click();
    await esperar(1400);
    const meio = (await S()).nos.length;
    await desfazer();
    const dps = (await S()).nos.length;
    return { desfaz: dps === antes, refaz: null, nota: `${antes} -> ${meio} -> ${dps}` };
  });

  await caso('duplicar', async () => {
    await escolher(naJanela()[0]);
    const antes = (await S()).nos.length;
    const b = [...document.querySelectorAll('.canvas-barra-escolha button')].find(x => /duplicar/i.test(x.textContent || ''));
    b.click(); await esperar(1300);
    const meio = (await S()).nos.length;
    await desfazer();
    const dps = (await S()).nos.length;
    return { desfaz: dps === antes, refaz: null, nota: `${antes} -> ${meio} -> ${dps}` };
  });

  await caso('tirar (Delete)', async () => {
    const el = naJanela()[0]; const id = Number(el.dataset.no);
    await escolher(el);
    const antes = (await S()).nos.length;
    tecla('Delete'); await esperar(1300);
    const meio = (await S()).nos.length;
    await desfazer();
    const dps = (await S()).nos;
    return { desfaz: dps.length === antes, refaz: null, nota: `${antes} -> ${meio} -> ${dps.length}` };
  });

  await caso('tirar livro', async () => {
    const el = naJanela('.livro-canvas')[0] || document.querySelector('.livro-canvas');
    if (!el) return { desfaz: null, refaz: null, nota: 'sem livro alcancavel' };
    await escolher(el);
    const antes = (await S()).livros.length;
    tecla('Delete'); await esperar(1300);
    const meio = (await S()).livros.length;
    await desfazer();
    const dps = (await S()).livros.length;
    return { desfaz: dps === antes, refaz: null, nota: `${antes} -> ${meio} -> ${dps}` };
  });

  await caso('criar secao', async () => {
    const dois = naJanela().slice(0, 2);
    for (const [i, e] of dois.entries()) await escolher(e, i > 0);
    const antes = (await S()).grupos.length;
    const b = [...document.querySelectorAll('.canvas-barra-escolha button')].find(x => /criar se/i.test(x.textContent || ''));
    if (!b) return { desfaz: null, refaz: null, nota: 'sem botao Criar seção' };
    b.click(); await esperar(1400);
    const meio = (await S()).grupos.length;
    await desfazer();
    const dps = (await S()).grupos.length;
    return { desfaz: dps === antes, refaz: null, nota: `${antes} -> ${meio} -> ${dps}` };
  });

  await caso('trocar de secao (A -> B)', async () => {
    const s = await S();
    /* MEMBRO DE SECAO VIVA. Uma nota pode carregar o `grupo_id` de uma secao
       DISSOLVIDA — o vinculo fica de proposito, para `voltar` poder devolve-lo —,
       e desfazer sobre ela volta corretamente SEM secao. Escolher uma dessas
       aqui faria a matriz reprovar o comportamento certo. */
    const vivas = new Set(s.grupos.map(g => g.id));
    const membro = s.nos.find(n => vivas.has(n.grupo_id) && document.querySelector(`[data-no="${n.id}"]`));
    if (!membro) return { desfaz: null, refaz: null, nota: 'nenhum membro no DOM' };
    const el = document.querySelector(`[data-no="${membro.id}"]`);
    const outra = [...document.querySelectorAll('.canvas-secao')]
      .map(e => ({ id: Number(e.dataset.secao), r: e.getBoundingClientRect() }))
      .find(x => x.id !== membro.grupo_id && x.r.top > 70 && x.r.height > 150 && x.r.left > 8 && x.r.right < innerWidth - 8);
    if (!outra) return { desfaz: null, refaz: null, nota: 'nao ha segunda secao alcancavel' };
    const c = el.getBoundingClientRect();
    await arrastar(el, c.left + 100, c.top + 20,
      outra.r.left + outra.r.width / 2 - (c.left + c.width / 2),
      outra.r.top + outra.r.height / 2 - (c.top + c.height / 2));
    const meio = (await S()).nos.find(n => n.id === membro.id).grupo_id;
    const marca = rede.length;
    await desfazer();
    const um = (await S()).nos.find(n => n.id === membro.id).grupo_id;
    return { desfaz: um === membro.grupo_id, refaz: null,
             nota: `grupo ${membro.grupo_id} -> ${meio} -> ${um}; no desfazer a rede viu: ${rede.slice(marca).join(' ; ') || '(nada)'}` };
  });

  await caso('sair de uma secao', async () => {
    const s = await S();
    /* MEMBRO DE SECAO VIVA. Uma nota pode carregar o `grupo_id` de uma secao
       DISSOLVIDA — o vinculo fica de proposito, para `voltar` poder devolve-lo —,
       e desfazer sobre ela volta corretamente SEM secao. Escolher uma dessas
       aqui faria a matriz reprovar o comportamento certo. */
    const vivas = new Set(s.grupos.map(g => g.id));
    const membro = s.nos.find(n => vivas.has(n.grupo_id) && document.querySelector(`[data-no="${n.id}"]`));
    if (!membro) return { desfaz: null, refaz: null, nota: 'nenhum membro no DOM' };
    const el = document.querySelector(`[data-no="${membro.id}"]`);
    const c = el.getBoundingClientRect();
    const areas = [...document.querySelectorAll('.canvas-secao')].map(e => e.getBoundingClientRect());
    let destino = null;
    for (let y = 120; y < innerHeight - 120 && !destino; y += 30)
      for (let x = 60; x < innerWidth - 60; x += 30)
        if (!areas.some(r => x > r.left - 40 && x < r.right + 40 && y > r.top - 40 && y < r.bottom + 40)) { destino = { x, y }; break; }
    if (!destino) return { desfaz: null, refaz: null, nota: 'sem chao livre' };
    await arrastar(el, c.left + 100, c.top + 20, destino.x - (c.left + c.width / 2), destino.y - (c.top + c.height / 2));
    const meio = (await S()).nos.find(n => n.id === membro.id).grupo_id;
    await desfazer();
    const dps = (await S()).nos.find(n => n.id === membro.id).grupo_id;
    return { desfaz: dps === membro.grupo_id, refaz: null, nota: `grupo ${membro.grupo_id} -> ${meio} -> ${dps}` };
  });

  await caso('criar ligacao', async () => {
    const estado = await S();
    const ligados = new Set(estado.ligacoes.flatMap(l => [`${l.de_id}|${l.para_id}`, `${l.para_id}|${l.de_id}`]));
    const cartoes = naJanela();
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
    if (!de) return { desfaz: null, refaz: null, nota: 'sem par nao ligado ao alcance' };
    const antes = estado.ligacoes.length;
    await arrastar(de.el, de.x, de.y, para.left + 80 - de.x, para.top + 40 - de.y, de.el);
    const meio = (await S()).ligacoes.length;
    await desfazer();
    const dps = (await S()).ligacoes.length;
    await refazer();
    const rf = (await S()).ligacoes.length;
    return { desfaz: dps === antes, refaz: rf === meio, nota: `${antes} -> ${meio} -> ${dps} -> ${rf}` };
  });

  await caso('colar', async () => {
    const antes = (await S()).nos.length;
    const dt = new DataTransfer(); dt.setData('text/plain', 'Colado na matriz de desfazer');
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await esperar(1400);
    const meio = (await S()).nos.length;
    await desfazer();
    const dps = (await S()).nos.length;
    return { desfaz: dps === antes, refaz: null, nota: `${antes} -> ${meio} -> ${dps}` };
  });

  return linhas;
})()
