/* A jornada do marcador, contra o produto rodando.
 *
 * Cada passo afirma o EFEITO, e não a ausência de erro: o que o SERVIDOR passou
 * a ter, para onde a página rolou, quantas linhas a gaveta mostra. Um clique
 * que não faz nada também não estoura.
 *
 *   node scripts/medir.mjs "http://localhost:5180/entrar/$K" 1440 1000 \
 *     scripts/bancada/marcadores.js --depois=http://localhost:5180/leitura/$LIVRO
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
  const doServidor = () => fetch(`/jobs/${job}/marcadores`, { credentials: 'include' }).then(r => r.json());
  const gaveta = () => document.querySelector('.marcadores');
  const botaoCromo = () => [...document.querySelectorAll('.cromo button')]
    .find(b => /^Marcadores/.test(b.getAttribute('aria-label') || ''));
  const linhas = () => [...document.querySelectorAll('.marcadores-lista li')];

  /* O livro é aberto e lido no NAVEGADOR, e a rolagem contínua carrega em
     janela. Esperar o texto existir é esperar o assunto da medida. */
  await esperar(6000);

  await passo('a leitura abriu com texto de verdade', async () => {
    const blocos = document.querySelectorAll('.prosa [data-de], [data-capitulo] [data-de]').length;
    const aviso = document.querySelector('.leitura-aviso')?.textContent || '';
    return { ok: blocos > 5 && !/exemplo/i.test(aviso), medida: `${blocos} blocos, aviso: ${aviso || 'nenhum'}` };
  });

  await passo('o botão de marcadores não está mais desligado', async () => {
    const b = botaoCromo();
    return { ok: Boolean(b) && !b.disabled, medida: b ? `aria-label: ${b.getAttribute('aria-label')}, disabled: ${b.disabled}` : 'sem botão' };
  });

  await passo('a gaveta abre', async () => {
    botaoCromo().click();
    await esperar(500);
    return { ok: Boolean(gaveta()), medida: gaveta() ? 'gaveta na tela' : 'não abriu' };
  });

  await passo('a gaveta começa vazia, e diz isso', async () => {
    const servidor = await doServidor();
    const aviso = gaveta()?.querySelector('.indice-aviso')?.textContent || '';
    return { ok: servidor.length === 0 && /Nenhum marcador/i.test(aviso), medida: `${servidor.length} no servidor; aviso: "${aviso.trim().slice(0, 40)}…"` };
  });

  /* ROLA ANTES DE DOBRAR. Marcar no topo do primeiro capítulo provaria o caso
     em que deslocamento é zero — que é justamente o que passaria mesmo se o
     cálculo do lugar estivesse quebrado. */
  await passo('rolar para DENTRO de um capítulo', async () => {
    /* Não basta rolar: o lugar precisa cair no MEIO de um capítulo, e não na
       emenda entre dois. Com o deslocamento em zero, o passo da volta passaria
       sem provar nada — o começo do capítulo é onde a página já está. */
    window.scrollTo({ top: Math.round(document.documentElement.scrollHeight * 0.35) + 900, behavior: 'instant' });
    await esperar(1400);
    return { ok: window.scrollY > 200, medida: `scrollY ${Math.round(window.scrollY)}` };
  });

  let dobrado = null;

  await passo('marcar onde estou', async () => {
    const b = gaveta().querySelector('.marcadores-acao button');
    b.click();
    await esperar(900);
    const servidor = await doServidor();
    dobrado = servidor[0];
    return {
      /* O deslocamento tem de ser MAIOR QUE ZERO: zero é o começo do capítulo, e
         é o valor que sairia de um cálculo quebrado. */
      ok: servidor.length === 1 && Boolean(dobrado?.trecho) && dobrado.deslocamento > 0,
      medida: dobrado ? `cap ${dobrado.capitulo}, desl ${dobrado.deslocamento}, trecho "${dobrado.trecho.slice(0, 40)}…"` : 'nada no servidor',
    };
  });

  await passo('a linha aparece na gaveta, com o trecho', async () => {
    const l = linhas();
    const texto = l[0]?.querySelector('.marcadores-trecho')?.textContent || '';
    return { ok: l.length === 1 && texto.length > 4, medida: `${l.length} linha(s); "${texto.trim().slice(0, 40)}…"` };
  });

  await passo('o trecho guardado é o texto que está naquele ponto', async () => {
    /* A prova de que a âncora e o texto saíram do mesmo lugar: o trecho do
       servidor tem de aparecer no capítulo onde o marcador diz estar. */
    const secao = document.querySelector(`[data-capitulo="${dobrado.capitulo}"]`);
    const dentro = (secao?.textContent || '').includes(dobrado.trecho.slice(0, 30));
    return { ok: dentro, medida: dentro ? 'o trecho está no capítulo do marcador' : 'o trecho não foi achado no capítulo' };
  });

  await passo('marcar o mesmo lugar de novo não duplica', async () => {
    const b = gaveta().querySelector('.marcadores-acao button');
    const desligado = b.disabled;
    /* O botão fica desligado quando o lugar já está marcado — então a prova é
       pela rota, que é quem tem de ser idempotente. */
    const r = await fetch(`/jobs/${job}/marcadores`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capitulo: dobrado.capitulo, deslocamento: dobrado.deslocamento, trecho: 'de novo' }),
    }).then(x => x.json());
    const servidor = await doServidor();
    return { ok: r.ja_estava === true && servidor.length === 1, medida: `ja_estava: ${r.ja_estava}, total: ${servidor.length}, botão desligado: ${desligado}` };
  });

  await passo('sair do lugar e voltar por ele', async () => {
    botaoCromo().click();               /* fecha a gaveta */
    await esperar(300);
    window.scrollTo({ top: 0, behavior: 'instant' });
    await esperar(600);
    const longe = Math.round(window.scrollY);
    botaoCromo().click();               /* abre de novo */
    await esperar(500);
    const secaoAntes = document.querySelector(`[data-capitulo="${dobrado.capitulo}"]`);
    const topoAntes = secaoAntes ? Math.round(secaoAntes.getBoundingClientRect().top) : null;
    linhas()[0].querySelector('button').click();
    await esperar(1500);
    const secaoDepois = document.querySelector(`[data-capitulo="${dobrado.capitulo}"]`);
    const topoDepois = secaoDepois ? Math.round(secaoDepois.getBoundingClientRect().top) : null;
    const voltou = Math.round(window.scrollY);
    /* A PROVA É A PÁGINA TER SE MEXIDO: o marcador está no meio de um capítulo,
       então voltar a ele obriga a descer. Ficar em zero é não ter ido. */
    return {
      ok: longe === 0 && voltou > 200,
      medida: `saiu para ${longe}, voltou para ${voltou}; topo do capítulo ${dobrado.capitulo}: ${topoAntes} -> ${topoDepois}`,
    };
  });

  await passo('tirar o marcador', async () => {
    botaoCromo().click();
    await esperar(500);
    const tirar = gaveta().querySelector('.marcadores-tirar');
    tirar.click();
    await esperar(900);
    const servidor = await doServidor();
    return { ok: servidor.length === 0 && linhas().length === 0, medida: `${servidor.length} no servidor, ${linhas().length} na tela` };
  });

  /* O PROGRESSO USA O MESMO CÁLCULO DE LUGAR, e ele estava errado: a
     `<section class="capitulo">` é `display: contents` e não tem caixa, então
     "a última seção que começa acima da linha" devolvia SEMPRE a última
     carregada. Medido antes do conserto: capítulo 5 em cinco posições de
     rolagem diferentes, deslocamento zero em todas.

     O marcador acabou de provar o cálculo pela tela; este passo prova que o
     progresso, que passa pela mesma função, foi junto. */
  await passo('o progresso grava o capítulo em que a pessoa está', async () => {
    botaoCromo().click();               /* fecha a gaveta */
    await esperar(300);
    window.scrollTo({ top: Math.round(document.documentElement.scrollHeight * 0.35) + 900, behavior: 'instant' });
    await esperar(1800);                /* o gravador espera 900ms parado */
    const p = await fetch(`/jobs/${job}/progresso`, { credentials: 'include' }).then(r => r.json());
    const naTela = (() => {
      const linha = window.innerHeight * 0.2;
      let cap = null;
      for (const s of document.querySelectorAll('[data-capitulo]')) {
        const primeiro = s.querySelector('[data-de]');
        if (!primeiro || primeiro.getBoundingClientRect().top > linha) break;
        cap = Number(s.dataset.capitulo);
      }
      return cap;
    })();
    return { ok: p.capitulo === naTela, medida: `servidor: cap ${p.capitulo}, desl ${p.deslocamento}; na tela: cap ${naTela}` };
  });

  return { passos, verdes: passos.filter(p => p.ok).length, de: passos.length };
})()
