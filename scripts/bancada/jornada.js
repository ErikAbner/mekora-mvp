(async () => {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const quadro = () => new Promise(k => requestAnimationFrame(k));
  await esperar(5500);
  const o = (x, y, extra = {}) => ({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, ...extra });
  const passos = [];
  let n = 0;
  const passo = async (oque, fazer) => {
    n += 1;
    try { const m = await fazer(); passos.push({ n, oque, ok: m.ok, medida: m.medida }); }
    catch (e) { passos.push({ n, oque, ok: false, medida: `estourou: ${e.message}` }); }
    await esperar(160);
  };
  const S = () => window.__canvas;
  const naJanela = (sel = '.nota-canvas') => [...document.querySelectorAll(sel)].filter(e => { const c = e.getBoundingClientRect(); return c.top > 8 && c.left > 8 && c.right < innerWidth - 8 && c.bottom < innerHeight - 8; });
  const acerta = (el, x, y) => { const a = document.elementFromPoint(x, y); return Boolean(a && (el.contains(a) || a === el)); };
  const arrastar = async (el, x0, y0, dx, dy, alvoDeEvento = window) => {
    el.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0)));
    await esperar(60);
    for (let i = 1; i <= 16; i++) { alvoDeEvento.dispatchEvent(new PointerEvent('pointermove', o(x0 + dx * i / 16, y0 + dy * i / 16))); await quadro(); }
    alvoDeEvento.dispatchEvent(new PointerEvent('pointerup', o(x0 + dx, y0 + dy)));
    await esperar(500);
  };
  const clicar = async (el) => { const c = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', o(c.left + 10, c.top + 10)));
    window.dispatchEvent(new PointerEvent('pointerup', o(c.left + 10, c.top + 10)));
    el.click(); await esperar(300); };
  const tecla = (key, extra = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
  const superficie = () => fetch('/canvas/superficie', { credentials: 'include' }).then(r => r.json());
  const botaoDoca = (rot) => [...document.querySelectorAll('.canvas-ferramentas button')].find(b => (b.getAttribute('aria-label') || '') === rot);
  const botaoBarra = (rot) => [...document.querySelectorAll('.canvas-barra-escolha button')].find(b => new RegExp(rot, 'i').test(b.textContent || ''));

  let notaNova = null, secaoId = null, livroChave = null, ligacaoId = null, secaoComMembros = null;

  await passo('abrir a superficie com conteudo', async () => ({ ok: S().objetos > 20, medida: `${S().objetos} objetos, ${S().tracos} tracos` }));

  await passo('nova nota pela doca', async () => {
    const antes = (await superficie()).nos.length;
    botaoDoca('Nova nota').click(); await esperar(700);
    const folha = [...document.querySelectorAll('.folha')].find(f => /Escrever uma nota/i.test(f.textContent || '') && f.querySelector('input, textarea'));
    if (!folha) return { ok: false, medida: `folha nao abriu; folhas na tela: ${[...document.querySelectorAll('.folha')].map(f => (f.textContent || '').trim().slice(0, 24)).join(' | ')}` };
    const campo = folha.querySelector('textarea') || folha.querySelector('input');
    const proto = campo.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
    const setar = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set;
    setar.call(campo, 'Nota da jornada, escrita pela doca.');
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await esperar(200);
    const guardar = [...folha.querySelectorAll('button')].find(b => /p[oô]r na superf/i.test(b.textContent || ''));
    if (!guardar) return { ok: false, medida: 'sem botao "Pôr na superfície"' };
    guardar.click();
    await esperar(1200);
    const depois = (await superficie()).nos;
    notaNova = depois.find(x => x.texto === 'Nota da jornada, escrita pela doca.');
    return { ok: depois.length === antes + 1 && Boolean(notaNova), medida: `${antes} -> ${depois.length}` };
  });

  await passo('a nota nova aparece na tela', async () => {
    const el = document.querySelector(`[data-no="${notaNova?.id}"]`);
    return { ok: Boolean(el), medida: el ? 'cartao no DOM' : 'nao desenhou' };
  });

  await passo('arrastar a nota nova', async () => {
    const el = document.querySelector(`[data-no="${notaNova.id}"]`);
    el.scrollIntoView?.();
    const antes = { x: notaNova.x, y: notaNova.y };
    const c = el.getBoundingClientRect();
    await arrastar(el, c.left + 100, c.top + 20, 160, 90);
    const agora = (await superficie()).nos.find(x => x.id === notaNova.id);
    notaNova = agora;
    return { ok: agora.x !== antes.x || agora.y !== antes.y, medida: `${antes.x},${antes.y} -> ${agora.x},${agora.y}` };
  });

  await passo('escolher um cartao', async () => {
    const el = naJanela()[0]; const c = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', o(c.left + 60, c.top + 20)));
    window.dispatchEvent(new PointerEvent('pointerup', o(c.left + 60, c.top + 20)));
    await esperar(300);
    return { ok: S().escolhidos === 1 && Boolean(document.querySelector('.canvas-barra-escolha')), medida: `escolhidos ${S().escolhidos}` };
  });

  await passo('juntar um segundo com shift', async () => {
    const el = naJanela()[1]; const c = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', o(c.left + 60, c.top + 20, { shiftKey: true })));
    window.dispatchEvent(new PointerEvent('pointerup', o(c.left + 60, c.top + 20, { shiftKey: true })));
    await esperar(300);
    return { ok: S().escolhidos === 2, medida: `escolhidos ${S().escolhidos}` };
  });

  await passo('arrastar os dois juntos', async () => {
    const dois = naJanela().slice(0, 2);
    const p0 = dois.map(e => e.getBoundingClientRect().left);
    const c = dois[0].getBoundingClientRect();
    /* PARA O MEIO DA VISTA, de proposito: a secao criada a partir destes dois
       nasce em volta deles, e uma secao encostada no topo fica com a faixa por
       BAIXO do cabecalho do app — o passo seguinte mediria o chao. */
    const dx = Math.round(innerWidth * 0.45 - (c.left + 100));
    const dy = Math.round(innerHeight * 0.52 - (c.top + 20));
    await arrastar(dois[0], c.left + 100, c.top + 20, dx, dy);
    const p1 = dois.map(e => e.getBoundingClientRect().left);
    const andaram = dois.map((_, i) => Math.round(p1[i] - p0[i]));
    /* O ARRASTADO ENCOSTA NA MALHA e o companheiro anda o passo cru: os dois
       nunca batem no pixel, e exigir igualdade reprova o comportamento certo.
       Uma celula da malha (24) e a folga que a regra permite. */
    return { ok: andaram.every(v => Math.abs(v) > 40) && Math.abs(andaram[0] - andaram[1]) <= 24, medida: `andaram ${andaram.join(', ')}` };
  });

  await passo('criar secao a partir da escolha', async () => {
    const antes = (await superficie()).grupos;
    const b = botaoBarra('criar se');
    if (!b) return { ok: false, medida: 'botao Criar seção ausente' };
    b.click(); await esperar(1400);
    const g = (await superficie()).grupos;
    const ids = new Set(antes.map(x => x.id));
    secaoId = g.find(x => !ids.has(x.id))?.id ?? null;
    return { ok: g.length === antes.length + 1 && secaoId !== null, medida: `${antes.length} -> ${g.length}, nova ${secaoId}` };
  });

  await passo('a secao nasceu com os dois dentro', async () => {
    const nos = (await superficie()).nos.filter(x => x.grupo_id === secaoId);
    return { ok: nos.length === 2, medida: `${nos.length} membros` };
  });

  await passo('o nome da secao abre para editar', async () => {
    /* O COMMIT DO NOME NAO CABE AQUI, e dizer que cabe seria mentira: `blur` so
       acontece depois de um foco DE VERDADE, e `dispatchEvent` nao da foco. O
       caminho inteiro — clicar, digitar, Enter, gravar — esta provado com mouse
       e teclado reais em `--gesto` + `--teclas`; o que esta fase mede e o que
       ela consegue medir: o campo abre com o nome atual inteiro selecionado. */
    /* Numa SECAO COM NOME, senao a afirmacao "abre com o nome selecionado" e
       verdadeira sobre a string vazia — verde por omissao. */
    const sec = [...document.querySelectorAll('.canvas-secao.com-nome')].find(e => e.querySelector('.canvas-secao-nome')?.textContent?.trim());
    if (!sec) return { ok: false, medida: 'nenhuma secao com nome na tela' };
    sec.querySelector('.canvas-secao-nome').click(); await esperar(450);
    const campo = sec.querySelector('input');
    if (!campo) return { ok: false, medida: 'o campo de nome nao abriu' };
    const tudoSelecionado = campo.value.length > 0 && campo.selectionStart === 0 && campo.selectionEnd === campo.value.length;
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await esperar(300);
    return { ok: tudoSelecionado, medida: `selecao ${campo.selectionStart}-${campo.selectionEnd} de "${campo.value}"` };
  });

  await passo('arrastar a secao leva o conteudo', async () => {
    /* A SECAO QUE TEM MEMBROS DE FATO, e cuja faixa esta ao alcance. A secao
       recem-criada serve para provar que ela NASCE com os dois dentro (passo 9);
       para provar que ela LEVA, o que importa e haver membros e faixa — e a
       da fixture tem os dois, com pertencimento gravado por PATCH. */
    const s = await superficie();
    let faixa = null, alvo = null;
    for (const el of document.querySelectorAll('.canvas-secao')) {
      const id = Number(el.dataset.secao);
      if (!s.nos.some(x => x.grupo_id === id)) continue;
      const f = el.querySelector('.canvas-secao-faixa');
      const r = f?.getBoundingClientRect();
      if (r && r.width > 40 && r.top > 70 && r.left > 8 && r.bottom < innerHeight - 8 && acerta(f, r.left + 60, r.top + r.height / 2)) { faixa = f; alvo = id; break; }
    }
    if (!faixa) return { ok: false, medida: 'nenhuma secao com membros e faixa ao alcance' };
    const membros = s.nos.filter(x => x.grupo_id === alvo).map(x => x.id);
    const els = membros.map(id => document.querySelector(`[data-no="${id}"]`)).filter(Boolean);
    if (!els.length) return { ok: false, medida: `secao ${alvo} tem ${membros.length} membros e nenhum no DOM` };
    const p0 = els.map(e => e.getBoundingClientRect().left);
    const cf = faixa.getBoundingClientRect();
    await arrastar(faixa, cf.left + 60, cf.top + cf.height / 2, 120, 80);
    const p1 = els.map(e => e.getBoundingClientRect().left);
    const andaram = els.map((_, i) => Math.round(p1[i] - p0[i]));
    secaoComMembros = alvo;
    return { ok: andaram.every(v => Math.abs(v) > 90), medida: `secao ${alvo}, membros andaram ${andaram.join(', ')}` };
  });

  await passo('tirar um cartao da secao pelo gesto', async () => {
    const alvo = secaoComMembros ?? secaoId;
    const membros = (await superficie()).nos.filter(x => x.grupo_id === alvo);
    if (!membros.length) return { ok: false, medida: `a secao ${alvo} esta vazia` };
    const el = document.querySelector(`[data-no="${membros[0].id}"]`);
    const c = el.getBoundingClientRect();
    /* PARA FORA DE VERDADE: um destino escolhido no escuro pode cair dentro da
       propria secao (que acabou de andar) ou dentro de outra, e ai o vinculo
       muda em vez de sumir — o numero diria "falhou" sobre um acerto. */
    const areas = [...document.querySelectorAll('.canvas-secao')].map(e => e.getBoundingClientRect());
    let destino = null;
    for (let y = 120; y < innerHeight - 120 && !destino; y += 30)
      for (let x = 60; x < innerWidth - 60; x += 30)
        if (!areas.some(r => x > r.left - 30 && x < r.right + 30 && y > r.top - 30 && y < r.bottom + 30)) { destino = { x, y }; break; }
    if (!destino) return { ok: false, medida: 'nao ha chao livre de secao na vista' };
    /* QUEM DECIDE E O CENTRO do cartao — e a mesma regra da contencao. Levar o
       PONTO DE PEGA para fora nao basta: o centro pode continuar dentro, e o
       vinculo (corretamente) fica. */
    const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    await arrastar(el, c.left + 100, c.top + 20, destino.x - cx, destino.y - cy);
    const agora = (await superficie()).nos.find(x => x.id === membros[0].id);
    const depois = el.getBoundingClientRect();
    const centro = { x: Math.round(depois.left + depois.width / 2), y: Math.round(depois.top + depois.height / 2) };
    const dentroDeQual = [...document.querySelectorAll('.canvas-secao')].filter(e => { const r = e.getBoundingClientRect();
      return centro.x > r.left && centro.x < r.right && centro.y > r.top && centro.y < r.bottom; }).map(e => e.dataset.secao);
    return { ok: agora.grupo_id === null,
             medida: `grupo_id ${agora.grupo_id}; centro ${centro.x},${centro.y}; caiu dentro de [${dentroDeQual.join(',')}]; alvo ${destino.x},${destino.y}` };
  });

  await passo('tirar um livro e traze-lo de volta', async () => {
    const antes = (await superficie()).livros.length;
    const livroEl = naJanela('.livro-canvas')[0] || document.querySelector('.livro-canvas');
    if (!livroEl) return { ok: false, medida: 'nenhum livro na superficie' };
    livroEl.querySelector('.nota-menu-botao')?.click(); await esperar(400);
    const tirar = [...livroEl.querySelectorAll('.nota-menu-lista button')].find(b => /tirar/i.test(b.textContent || ''));
    if (!tirar) return { ok: false, medida: 'sem "Tirar" no menu do livro' };
    tirar.click(); await esperar(1200);
    const meio = (await superficie()).livros.length;
    if (meio !== antes - 1) return { ok: false, medida: `tirar nao tirou: ${antes} -> ${meio}` };
    botaoDoca('Trazer da estante').click(); await esperar(900);
    const painel = [...document.querySelectorAll('.folha')].find(f => /Trazer para a superf/i.test(f.textContent || ''));
    if (!painel) return { ok: false, medida: 'a folha de trazer nao abriu' };
    const listas = painel.querySelectorAll('ul.trazer-lista');
    if (!listas.length) return { ok: false, medida: 'a folha abriu sem lista nenhuma' };
    const item = listas[0].querySelector('button');
    if (!item) return { ok: false, medida: 'a primeira lista veio vazia' };
    item.click(); await esperar(1400);
    const depois = (await superficie()).livros.length;
    livroChave = (await superficie()).livros.slice(-1)[0];
    return { ok: depois === antes, medida: `${antes} -> ${meio} -> ${depois}` };
  });

  await passo('ligar nota a livro pela pega', async () => {
    const estado = await superficie();
    const antes = estado.ligacoes.length;
    const livroEl = naJanela('.livro-canvas')[0] || document.querySelector('.livro-canvas');
    if (!livroEl) return { ok: false, medida: 'o livro nao esta na tela' };
    const jobDoLivro = estado.livros.find(l => String(l.id) === livroEl.dataset.livro)?.job_id;
    /* UM PAR AINDA NAO LIGADO. A fixture ja liga nota->livro, e o endpoint e
       idempotente: repetir um par existente devolve 201 sem criar nada, e a
       contagem nao muda — o teste acusaria um defeito que nao existe. */
    const ligados = new Set(estado.ligacoes.filter(l => l.para_tipo === 'livro' && l.para_id === jobDoLivro).map(l => String(l.de_id)));
    const nota = naJanela().find(e => !ligados.has(e.dataset.nota));
    if (!nota) return { ok: false, medida: 'toda nota visivel ja esta ligada a este livro' };
    const pega = nota.querySelector('.nota-pega-direita') || nota.querySelector('.nota-pega');
    const cp = pega.getBoundingClientRect(), cl = livroEl.getBoundingClientRect();
    pega.dispatchEvent(new PointerEvent('pointerdown', o(cp.left + cp.width / 2, cp.top + cp.height / 2)));
    for (let i = 1; i <= 12; i++) {
      pega.dispatchEvent(new PointerEvent('pointermove', o(cp.left + (cl.left + 60 - cp.left) * i / 12, cp.top + (cl.top + 60 - cp.top) * i / 12)));
      await quadro();
    }
    pega.dispatchEvent(new PointerEvent('pointerup', o(cl.left + 60, cl.top + 60)));
    await esperar(1200);
    const depois = (await superficie()).ligacoes;
    ligacaoId = depois[depois.length - 1]?.id;
    return { ok: depois.length === antes + 1, medida: `${antes} -> ${depois.length}` };
  });

  await passo('escolher a ligacao', async () => {
    tecla('Escape'); await esperar(300);
    const g = [...document.querySelectorAll('.canvas-tracos g[data-liga]')].find(x => { const c = x.getBoundingClientRect(); return c.width > 20 && c.top > 8 && c.left > 8 && c.bottom < innerHeight - 8; });
    if (!g) return { ok: false, medida: 'nenhum traco alcancavel' };
    const alvo = g.querySelector('path:last-of-type') || g;
    const c = alvo.getBoundingClientRect();
    const x = c.left + c.width / 2, y = c.top + c.height / 2;
    alvo.dispatchEvent(new PointerEvent('pointerdown', o(x, y)));
    window.dispatchEvent(new PointerEvent('pointerup', o(x, y)));
    alvo.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
    await esperar(500);
    return { ok: S().escolhidos >= 1, medida: `escolhidos ${S().escolhidos}, chave ${[...(window.__canvas.chaves || [])].join('/')}` };
  });

  await passo('desfazer a ligacao', async () => {
    const antes = (await superficie()).ligacoes.length;
    const b = botaoBarra('desfazer|remover|desligar|largar');
    if (b) b.click(); else return { ok: false, medida: 'sem acao de desfazer ligacao na barra' };
    await esperar(1000);
    const depois = (await superficie()).ligacoes.length;
    return { ok: depois === antes - 1, medida: `${antes} -> ${depois}` };
  });

  await passo('desfazer com ctrl+z devolve a ligacao', async () => {
    const antes = (await superficie()).ligacoes.length;
    tecla('z', { metaKey: true }); await esperar(1200);
    const depois = (await superficie()).ligacoes.length;
    return { ok: depois === antes + 1, medida: `${antes} -> ${depois}` };
  });

  await passo('refazer tira de novo', async () => {
    const antes = (await superficie()).ligacoes.length;
    tecla('z', { metaKey: true, shiftKey: true }); await esperar(1200);
    const depois = (await superficie()).ligacoes.length;
    return { ok: depois === antes - 1, medida: `${antes} -> ${depois}` };
  });

  await passo('duplicar um cartao', async () => {
    tecla('Escape'); await esperar(200);
    const el = naJanela()[0]; const c = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', o(c.left + 60, c.top + 20)));
    window.dispatchEvent(new PointerEvent('pointerup', o(c.left + 60, c.top + 20)));
    await esperar(300);
    const antes = (await superficie()).nos.length;
    const b = botaoBarra('duplicar');
    if (!b) return { ok: false, medida: 'sem botao Duplicar' };
    b.click(); await esperar(1200);
    const depois = (await superficie()).nos.length;
    return { ok: depois === antes + 1, medida: `${antes} -> ${depois}` };
  });

  await passo('procurar na superficie', async () => {
    tecla('Escape'); await esperar(200);
    const abrir = document.querySelector('.canvas-procura button');
    abrir.click(); await esperar(400);
    const campo = document.querySelector('.canvas-procura input[type="search"]');
    const setar = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setar.call(campo, 'carga'); campo.dispatchEvent(new Event('input', { bubbles: true }));
    await esperar(700);
    const achados = document.querySelectorAll('.canvas-achados li').length;
    return { ok: achados > 0, medida: `${achados} achados` };
  });

  await passo('ir ate um achado move a camera', async () => {
    const antes = sessionStorage.getItem('mekora-canvas-camera');
    const primeiro = document.querySelector('.canvas-achados li button');
    if (!primeiro) return { ok: false, medida: 'sem achado para abrir' };
    primeiro.click(); await esperar(1200);
    return { ok: sessionStorage.getItem('mekora-canvas-camera') !== antes, medida: 'camera mudou' };
  });

  await passo('afastar ate a silhueta', async () => {
    tecla('Escape'); await esperar(200);
    const menos = [...document.querySelectorAll('.canvas-zoom button')].find(b => /afast/i.test(b.getAttribute('aria-label') || ''));
    for (let i = 0; i < 10; i++) { menos.click(); await esperar(70); }
    const nivel = document.querySelector('.canvas-plano').dataset.detalhe;
    return { ok: nivel === 'silhueta', medida: `detalhe ${nivel}` };
  });

  await passo('nenhum controle microscopico na silhueta', async () => {
    const menu = document.querySelector('.nota-menu-botao');
    const c = menu?.getBoundingClientRect();
    const doca = document.querySelector('.canvas-ferramentas button').getBoundingClientRect();
    return { ok: (!c || c.width === 0) && doca.width > 40, medida: `menu ${c ? Math.round(c.width) : 0}px, doca ${Math.round(doca.width)}px` };
  });

  await passo('voltar a 100%', async () => {
    /* NAO HA BOTAO "100%": o do meio mostra o zoom atual e o que ele faz e
       ENQUADRAR TUDO. Voltar a 1 e por passos de +10%. */
    const mais = [...document.querySelectorAll('.canvas-zoom button')].find(b => /aproxim/i.test(b.getAttribute('aria-label') || ''));
    const escala = () => +getComputedStyle(document.querySelector('.canvas-mundo')).getPropertyValue('--escala');
    for (let i = 0; i < 30 && escala() < 0.99; i++) { mais.click(); await esperar(70); }
    return { ok: Math.abs(escala() - 1) < 0.06, medida: `escala ${escala().toFixed(2)}` };
  });

  await passo('laco escolhe varios', async () => {
    const m = document.querySelector('.canvas-mundo').getBoundingClientRect();
    await arrastar(document.querySelector('.canvas-mundo'), m.left + 20, m.top + 120, m.width - 60, 500);
    return { ok: S().escolhidos > 2, medida: `escolhidos ${S().escolhidos}` };
  });

  await passo('escape larga a escolha', async () => { tecla('Escape'); await esperar(300);
    return { ok: S().escolhidos === 0, medida: `escolhidos ${S().escolhidos}` }; });

  await passo('esticar um cartao pela borda', async () => {
    const el = naJanela()[0];
    const antes = (await superficie()).nos.find(x => String(x.id) === el.dataset.no);
    const c = el.getBoundingClientRect();
    await arrastar(el, c.right - 3, c.top + c.height / 2, 90, 0);
    const depois = (await superficie()).nos.find(x => x.id === antes.id);
    return { ok: (depois.largura || 375) !== (antes.largura || 375), medida: `${antes.largura || 375} -> ${depois.largura || 375}` };
  });

  await passo('enquadrar a superficie', async () => {
    const plano = document.querySelector('.canvas-plano');
    const antes = getComputedStyle(plano).transform;
    const b = document.querySelector('.canvas-zoom-valor');
    if (!b) return { ok: false, medida: 'sem botao Enquadrar tudo' };
    b.click(); await esperar(1200);
    const depois = getComputedStyle(plano).transform;
    const dentro = [...document.querySelectorAll('.nota-canvas')].filter(e => { const c = e.getBoundingClientRect(); return c.right > 0 && c.left < innerWidth && c.bottom > 0 && c.top < innerHeight; }).length;
    return { ok: depois !== antes && dentro > 40, medida: `${dentro} cartoes na vista` };
  });

  await passo('dissolver a secao', async () => {
    const el = document.querySelector(`[data-secao="${secaoId}"] .canvas-secao-dissolver`);
    if (!el) return { ok: false, medida: 'botao Dissolver nao alcancavel' };
    const antesNos = (await superficie()).nos.length;
    el.click(); await esperar(1200);
    const s = await superficie();
    return { ok: !s.grupos.some(g => g.id === secaoId) && s.nos.length === antesNos, medida: `grupos ${s.grupos.length}, nos ${s.nos.length}` };
  });

  await passo('desfazer traz a secao de volta', async () => {
    tecla('z', { metaKey: true }); await esperar(1400);
    const s = await superficie();
    return { ok: s.grupos.some(g => g.id === secaoId), medida: `secao ${secaoId} ${s.grupos.some(g => g.id === secaoId) ? 'de volta' : 'ausente'}` };
  });

  await passo('tudo sobrevive ao servidor', async () => {
    const s = await superficie();
    const naTela = { nos: S().objetos, tracos: S().tracos };
    return { ok: s.nos.length + s.livros.length + s.grupos.length === naTela.nos, medida: `servidor ${s.nos.length}+${s.livros.length}+${s.grupos.length} = tela ${naTela.nos}` };
  });

  return { total: passos.length, verdes: passos.filter(p => p.ok).length, passos };
})()
