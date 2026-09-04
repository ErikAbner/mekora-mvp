/* CONEXÕES · as duas ações da candidata — nó `895:8780`.
 *
 * O que se afirma aqui não é "os botões apareceram": é que cada um faz UMA
 * coisa, e só ela. Até 03/09 o cartão inteiro era um botão que ligava no
 * primeiro clique, e não havia como ler a candidata antes de afirmar que ela se
 * liga.
 *
 *   node scripts/medir.mjs "http://localhost:5180/entrar/$K" 1440 1000 \
 *     scripts/bancada/conexoes.js --depois="http://localhost:5180/notas"
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

  const nota = () => Number(location.pathname.split('/').pop());
  const doServidor = () => fetch(`/notas/${nota()}`, { credentials: 'include' }).then(r => r.json());
  /* SÓ AS DA SUGESTÃO. A folha "Ligar esta nota a qual?" usa a mesma classe de
     lista, e a primeira versão desta medida pegou as 12 notas DELA — dizendo
     "12 candidatas" e reprovando os passos seguintes por não achar botão
     nenhum. Mediu a lista errada e reprovou o produto certo. */
  const candidatas = () => [...document.querySelectorAll('.nota-sugestoes .nota-candidatas li')];
  const botao = (li, rotulo) => [...li.querySelectorAll('button, a')]
    .find(b => new RegExp(rotulo, 'i').test((b.textContent || '').trim()));

  await esperar(3000);

  /* PELO ROTEADOR. `location.href` derruba a medida — lição já escrita na
     LEIA.md da bancada. */
  await passo('abrir uma nota que tem candidatas', async () => {
    for (const link of [...document.querySelectorAll('a[href^="/nota/"]')].slice(0, 6)) {
      link.click();
      await esperar(3000);
      if (candidatas().length) return { ok: true, medida: `${location.pathname}, ${candidatas().length} candidatas` };
      history.back();
      await esperar(2500);
    }
    return { ok: false, medida: 'nenhuma nota do acervo tem sugestão' };
  });

  await passo('a candidata mostra a contagem que sustenta a sugestão', async () => {
    const origem = candidatas()[0]?.querySelector('.candidata-origem')?.textContent || '';
    /* O `CLAUDE.md` exige que sugestão possa ser discordada: a contagem e as
       palavras ficam ao lado, e o corte da faixa aparece escrito. */
    const corte = document.querySelector('.nota-sugestoes .nota-aviso')?.textContent || '';
    return {
      ok: /\d+ em comum:/.test(origem) && /A partir de \d+/.test(corte),
      medida: `"${origem.trim().slice(0, 46)}" · "${corte.trim().slice(0, 40)}"`,
    };
  });

  await passo('as duas ações existem, e são de categorias diferentes', async () => {
    const li = candidatas()[0];
    const confirmar = botao(li, 'Confirmar a ligação');
    const ir = botao(li, 'Ir para nota');
    return {
      ok: Boolean(confirmar) && confirmar.tagName === 'BUTTON' && Boolean(ir) && ir.tagName === 'A',
      medida: `confirmar: <${confirmar?.tagName}>, ir: <${ir?.tagName} href=${ir?.getAttribute('href')}>`,
    };
  });

  await passo('o cartão NÃO liga ao ser tocado', async () => {
    /* O defeito de antes, medido pelo avesso: clicar no corpo da candidata não
       pode criar ligação nenhuma. */
    const antes = (await doServidor()).ligadas.length;
    candidatas()[0].querySelector('.candidata-corpo').click();
    await esperar(900);
    const depois = (await doServidor()).ligadas.length;
    return { ok: antes === depois, medida: `ligadas ${antes} -> ${depois}` };
  });

  let alvo = null;

  await passo('"Ir para nota" leva à candidata SEM ligar', async () => {
    const li = candidatas()[0];
    const ir = botao(li, 'Ir para nota');
    alvo = Number(ir.getAttribute('href').split('/').pop());
    const daqui = nota();
    const antes = (await doServidor()).ligadas.length;
    ir.click();
    await esperar(3000);
    const chegou = nota() === alvo;
    /* A contagem é lida na nota de ORIGEM, e por isso a volta vem antes. */
    history.back();
    await esperar(3000);
    const depois = (await doServidor()).ligadas.length;
    return {
      ok: chegou && antes === depois && nota() === daqui,
      medida: `${daqui} -> ${alvo} -> ${nota()}; ligadas ${antes} -> ${depois}`,
    };
  });

  await passo('"Confirmar a ligação" liga, e liga UMA', async () => {
    const antes = (await doServidor()).ligadas;
    const li = candidatas()[0];
    botao(li, 'Confirmar a ligação').click();
    await esperar(1500);
    const depois = (await doServidor()).ligadas;
    const nova = depois.find(l => !antes.some(a => a.ligacao_id === l.ligacao_id));
    return {
      ok: depois.length === antes.length + 1 && Boolean(nova),
      medida: `ligadas ${antes.length} -> ${depois.length}, nova com a nota ${nova?.id}`,
    };
  });

  await passo('a candidata ligada sai da lista de sugestões', async () => {
    /* Sugerir o que a pessoa já ligou é pedir que ela faça de novo o que fez. */
    const ainda = candidatas().some(li => {
      const ir = li.querySelector('.candidata-ir');
      return ir && Number(ir.getAttribute('href').split('/').pop()) === alvo;
    });
    return { ok: !ainda, medida: ainda ? `a nota ${alvo} continua sugerida` : `a nota ${alvo} saiu das sugestões` };
  });

  await passo('e ela aparece em "Ligadas", com o desfazer', async () => {
    const secao = [...document.querySelectorAll('.nota-secao')]
      .find(s => /^Ligadas/.test((s.querySelector('h2')?.textContent || '').trim()));
    const linhas = [...(secao?.querySelectorAll('.nota-ligadas li') || [])];
    const temDesfazer = linhas.some(li => /Desfazer/i.test(li.textContent || ''));
    return { ok: linhas.length > 0 && temDesfazer, medida: `${linhas.length} em "Ligadas", desfazer: ${temDesfazer}` };
  });

  return { passos, verdes: passos.filter(p => p.ok).length, de: passos.length };
})()
