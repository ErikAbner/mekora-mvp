(async () => {
  const P = (u, c) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(c) }).then(r => r.ok ? r.json() : null);
  /* A CENA CABE NA JANELA onde a bancada precisa pegar as coisas. Livros na
     faixa de cima, uma secao ao lado deles, notas a partir de y=520. A versao
     anterior punha livro em x=4400 e secao em y=-40: as fases de livro e de
     secao mediam o chao, e o numero saia mesmo assim. */
  const livrosVisiveis = [];
  const historico = await fetch('/history', { credentials: 'include' }).then(r => r.json());
  for (const [k, e] of historico.slice(0, 6).entries()) {
    const l = await P('/canvas/livros', { job_id: e.upload_id, x: k < 3 ? k * 250 : 1500 + (k - 3) * 300, y: 140 });
    if (l) livrosVisiveis.push(l);
  }
  const secoes = [];
  for (let i = 0; i < 6; i++) {
    /* DUAS seções à vista, e não uma: a matriz de desfazer precisa provar a
       TROCA de seção (A -> B), e com uma só o caso não tem para onde ir. */
    const perto = i < 2;
    secoes.push(await P('/canvas/grupos', {
      nome: `Se\u00e7\u00e3o de carga ${i}`,
      x: perto ? 800 : 2600 + i * 700,
      y: perto ? 140 + i * 480 : 1900,
      largura: 600, altura: 420,
    }));
  }
  const notas = [];
  for (let i = 0; i < 100; i++) {
    notas.push(await P('/canvas/nos', { texto: `Anota\u00e7\u00e3o de carga n\u00famero ${i}, com texto suficiente para o cart\u00e3o ter altura de verdade e o layout custar o que custa.`, x: (i % 10) * 430, y: 700 + Math.floor(i / 10) * 320 }));
  }
  /* Tres notas DENTRO da secao visivel: sem elas, a fase que mede "a secao leva
     o conteudo" arrasta um retangulo vazio e passa. */
  const dentroDaSecao = [];
  for (const [k, pos] of [[0, { x: 840, y: 210 }], [1, { x: 840, y: 380 }], [2, { x: 1140, y: 210 }]]) {
    const n = await P('/canvas/nos', { texto: `Anota\u00e7\u00e3o dentro da se\u00e7\u00e3o ${k}.`, ...pos });
    notas.push(n); dentroDaSecao.push(n);
  }
  /* PERTENCIMENTO E EXPLICITO (Model E): estar por cima do retangulo nao faz de
     ninguem membro. Sem este PATCH a fase "a secao leva o conteudo" arrasta uma
     area que, corretamente, nao leva nada — e o verde nao diz nada. */
  const secaoVisivel = secoes[0];
  for (const n of dentroDaSecao) {
    await fetch(`/canvas/nos/${n.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ x: n.x, y: n.y, grupo_id: secaoVisivel.id }) });
  }
  let fios = 0;
  for (let i = 0; i + 5 < notas.length && fios < 20; i += 5) {
    const r = await P('/canvas/ligacoes', { de_tipo: 'nota', de_id: notas[i].nota_id ?? notas[i].id, para_tipo: 'nota', para_id: notas[i + 5].nota_id ?? notas[i + 5].id });
    if (r) fios += 1;
  }
  for (const [k, l] of livrosVisiveis.entries()) {
    const n = notas[k * 7];
    if (!n) break;
    const r = await P('/canvas/ligacoes', { de_tipo: 'nota', de_id: n.nota_id ?? n.id, para_tipo: 'livro', para_id: l.job_id ?? l.id });
    if (r) fios += 1;
  }
  return { notas: notas.filter(Boolean).length, livros: livrosVisiveis.length, secoes: secoes.filter(Boolean).length, fios };
})()
