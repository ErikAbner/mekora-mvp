/* A escada da âncora contra o produto rodando — `DEC-0016`.
 *
 * A prova unitária (`web/src/leitor/prova.js`) mede a função. Esta mede o que a
 * pessoa vê: a nota é gravada com o deslocamento MENTINDO, como ficaria depois
 * de a extração mudar, e o que se afirma é onde o `<mark>` caiu no texto e o que
 * o caderno diz sobre isso.
 *
 * Sem esta camada, a escada podia estar certa e a tela continuar desenhando pelo
 * deslocamento guardado — que é exatamente o defeito.
 *
 *   node scripts/medir.mjs "http://localhost:5180/entrar/$K" 1440 1000 \
 *     scripts/bancada/ancora.js --depois=http://localhost:5180/leitura/$LIVRO
 */
(async () => {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const passos = [];
  let n = 0;
  const passo = async (oque, fazer) => {
    n += 1;
    try { const m = await fazer(); passos.push({ n, oque, ok: m.ok, medida: m.medida }); }
    catch (e) { passos.push({ n, oque, ok: false, medida: `estourou: ${e.message}` }); }
    await esperar(200);
  };

  const job = Number(location.pathname.split('/').pop());
  const notas = () => fetch(`/jobs/${job}/notas`, { credentials: 'include' }).then(r => r.json());
  const criar = (corpo) => fetch(`/jobs/${job}/notas`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cor: 'amarelo', comentario: '', ...corpo }),
  }).then(r => r.json());
  const apagar = (id) => fetch(`/jobs/${job}/notas/${id}`, { method: 'DELETE', credentials: 'include' });
  const botaoCromo = (rotulo) => [...document.querySelectorAll('.cromo button')]
    .find(b => new RegExp(`^${rotulo}`).test(b.getAttribute('aria-label') || ''));
  const marcas = () => [...document.querySelectorAll('.prosa mark')];
  /* REMONTAR SEM RECARREGAR. As notas entram pela API, e o React só as busca ao
     montar — mas `location.reload()` derruba a sessão de medida junto com o
     documento ("Inspected target navigated or closed"). Sair pelo roteador e
     voltar é navegação no MESMO documento: o leitor remonta, refaz o pedido das
     notas, e o contexto de medida sobrevive. */
  const remontar = async () => {
    document.querySelector('.cromo-link')?.click();
    await esperar(1500);
    history.back();
    await esperar(9000);
  };

  await esperar(6500);

  /* O CAPÍTULO E A FRASE SAEM DO TEXTO QUE ESTÁ NA TELA, e não de um livro
     escolhido a dedo: a prova precisa valer para o acervo que existe. */
  let alvo = null;

  await passo('achar uma frase repetida no capítulo', async () => {
    const secoes = [...document.querySelectorAll('[data-capitulo]')];
    for (const s of secoes) {
      const blocos = [...s.querySelectorAll('[data-de]')];
      for (const b of blocos) {
        const texto = b.textContent || '';
        /* Uma palavra que aparece DUAS vezes no mesmo parágrafo é o caso em que
           a citação sozinha é ambígua — e é ele que o degrau 2 existe para
           resolver. */
        const palavras = texto.match(/\b[a-zA-Zà-úÀ-Ú]{5,}\b/g) || [];
        const conta = {};
        for (const p of palavras) conta[p] = (conta[p] || 0) + 1;
        const repetida = Object.keys(conta).find(p => conta[p] >= 2);
        if (!repetida) continue;
        const primeira = texto.indexOf(repetida);
        const segunda = texto.indexOf(repetida, primeira + 1);
        alvo = {
          capitulo: Number(s.dataset.capitulo),
          base: Number(b.dataset.de || 0),
          texto, palavra: repetida,
          primeira, segunda,
        };
        return { ok: true, medida: `cap ${alvo.capitulo}, "${repetida}" em ${primeira} e ${segunda}` };
      }
    }
    return { ok: false, medida: 'nenhum parágrafo com palavra repetida na janela' };
  });

  let comContexto = null, semContexto = null, perdida = null, antesDaProva = 0;

  await passo('gravar três notas com o deslocamento MENTINDO', async () => {
    antesDaProva = (await notas()).length;
    const { texto, base, palavra, primeira, segunda } = alvo;
    /* A SEGUNDA ocorrência é a marcada, e o deslocamento aponta para longe das
       duas: é o que sobra depois de a extração mudar. */
    comContexto = await criar({
      capitulo: alvo.capitulo,
      de: base + 3, ate: base + 3 + palavra.length,
      trecho: palavra,
      antes: texto.slice(Math.max(0, segunda - 40), segunda),
      depois: texto.slice(segunda + palavra.length, segunda + palavra.length + 40),
    });
    /* A MESMA nota sem contexto: ela só pode resolver pela citação, e cai na
       ocorrência mais perto da dica. */
    semContexto = await criar({
      capitulo: alvo.capitulo,
      de: base + primeira + 1, ate: base + primeira + 1 + palavra.length,
      trecho: palavra, antes: '', depois: '',
    });
    perdida = await criar({
      capitulo: alvo.capitulo,
      de: base, ate: base + 10,
      trecho: 'esta frase nao existe em livro nenhum deste acervo',
      antes: '', depois: '',
    });
    const todas = await notas();
    return {
      ok: Boolean(comContexto.id && semContexto.id && perdida.id),
      medida: `${todas.length} notas no servidor, e havia ${antesDaProva}`,
    };
  });

  await passo('a tela desenha as notas nos lugares CERTOS, e não no guardado', async () => {
    await remontar();
    const { palavra, primeira, segunda, texto } = alvo;
    const bloco = [...document.querySelectorAll('.prosa [data-de]')]
      .find(b => (b.textContent || '').includes(texto.slice(0, 30)));
    if (!bloco) return { ok: false, medida: 'o parágrafo da prova não está na tela' };

    /* ONDE CADA MARCA COMEÇA, andando pelos filhos do parágrafo e somando o
       texto que passou. Ler só o primeiro `<mark>` daria a resposta de uma nota
       para a pergunta de outra — o parágrafo tem duas, e foi assim que a
       primeira versão desta medida ficou vermelha com o produto certo. */
    let acumulado = 0;
    const posicoes = [];
    for (const filho of bloco.childNodes) {
      const t = filho.textContent || '';
      if (filho.nodeName === 'MARK') posicoes.push({ de: acumulado, texto: t });
      acumulado += t.length;
    }

    /* A de contexto tem de cair na SEGUNDA ocorrência — a que ela marcou — e a
       sem contexto na PRIMEIRA, que é a mais perto da dica dela. Nenhuma das
       duas pode cair no deslocamento guardado, que aponta para outro lugar. */
    const noSegundo = posicoes.some((m) => m.texto === palavra && Math.abs(m.de - segunda) <= 2);
    const noPrimeiro = posicoes.some((m) => m.texto === palavra && Math.abs(m.de - primeira) <= 2);
    return {
      ok: noSegundo && noPrimeiro,
      medida: `marcas em ${JSON.stringify(posicoes.map((m) => m.de))}; esperadas ${primeira} e ${segunda}`,
    };
  });

  await passo('o caderno diz POR QUAL degrau reencontrou', async () => {
    botaoCromo('Notas').click();
    await esperar(700);
    const linhas = [...document.querySelectorAll('.caderno li')];
    const degraus = linhas.map(li => (li.querySelector('.nota-degrau')?.textContent || '').trim()).filter(Boolean);
    const temContexto = degraus.some(d => /texto em volta/i.test(d));
    const temCitacao = degraus.some(d => /pela citação/i.test(d));
    return {
      ok: temContexto && temCitacao,
      medida: degraus.map(d => d.slice(0, 46)).join(' | ') || 'nenhuma linha de degrau',
    };
  });

  await passo('a nota perdida não pinta nada, e a tela diz que perdeu', async () => {
    const linhas = [...document.querySelectorAll('.caderno li')];
    const perdidaNaTela = linhas.some(li => /não existe mais neste texto/i.test(li.textContent || ''));
    const pintadas = marcas().map(m => m.textContent);
    const naoPintou = !pintadas.some(t => /esta frase nao existe/i.test(t));
    return { ok: perdidaNaTela && naoPintou, medida: `dito: ${perdidaNaTela}; sem pintar: ${naoPintou}` };
  });

  await passo('o degrau 5 é oferecido, e diz que não achou', async () => {
    const botao = [...document.querySelectorAll('.caderno .nota-procurar')][0];
    if (!botao) return { ok: false, medida: 'não ofereceu procurar no livro' };
    botao.click();
    /* Ele abre o livro inteiro, um capítulo por vez: espera o que for preciso. */
    for (let i = 0; i < 40; i++) {
      await esperar(1000);
      if (/não está mais lá/i.test(document.querySelector('.caderno')?.textContent || '')) break;
    }
    const disse = /não está mais lá/i.test(document.querySelector('.caderno')?.textContent || '');
    return { ok: disse, medida: disse ? 'procurou o livro e disse que não achou' : 'não respondeu' };
  });

  await passo('limpar as notas da prova', async () => {
    /* Contra o que HAVIA ANTES, e não contra zero: a conta de medida nasce com
       acervo semeado, e exigir zero aqui reprovaria a limpeza por causa das
       notas de outra pessoa da prova. */
    for (const id of [comContexto?.id, semContexto?.id, perdida?.id]) if (id) await apagar(id);
    const todas = await notas();
    return { ok: todas.length === antesDaProva, medida: `${todas.length} notas, e havia ${antesDaProva} antes` };
  });

  return { passos, verdes: passos.filter(p => p.ok).length, de: passos.length };
})()
