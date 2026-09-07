/* O arrasto do quadro de leitura: um cartão de "A ler" até a coluna "Lido".
 *
 * ELE FAZ TUDO SOZINHO — liga a vista, rola até o quadro e devolve os pontos —
 * porque o `medir()` das provas não tem setup separado, e o arquivo de gesto é
 * avaliado na página e pode ser assíncrono.
 *
 * A ROLAGEM NÃO É DETALHE. `--gesto` dispara em coordenadas de VIEWPORT: um
 * quadro abaixo da dobra recebe o clique no `<html>`, e o arrasto parece
 * quebrado quando o que está errado é a mira. Foi o primeiro falso negativo
 * desta prova.
 *
 * `{VENENO}` é trocado pelo controle negativo antes de o gesto rodar — aqui, e
 * não na medida, porque o veneno precisa estar de pé ANTES do arrasto. */
(async () => {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 40; i++) {
    const b = [...document.querySelectorAll('button')].find((x) => /^Leitura$/i.test(x.textContent.trim()));
    if (b) { b.click(); break; }
    await espera(100);
  }
  await espera(600);
  const quadro = document.querySelector('.estudos-quadro');
  if (!quadro) return [];
  quadro.scrollIntoView({ block: 'start', behavior: 'instant' });
  await espera(300);

  {VENENO}

  const col = (id) => document.querySelector(`.estudos-coluna[data-coluna="${id}"]`);
  const conta = (id) => document.querySelectorAll(`.estudos-coluna[data-coluna="${id}"] li`).length;
  /* A ORIGEM É A PRIMEIRA COLUNA QUE TIVER CARTÃO e não for o destino.
     
     Cravar "A ler" fazia a prova depender do estado acumulado da bancada: cada
     rodada move um livro para "Lido" e escreve o progresso de verdade, então
     "A ler" esvazia. Uma prova que só funciona na primeira vez não é prova. */
  const origem = ['to_read', 'reading'].find((id) => conta(id) > 0);
  const de = origem && col(origem).querySelector('li');
  const para = col('read');
  if (!de || !para) return [];
  /* A CONTAGEM DE ANTES fica na página: o `medir()` mede uma vez só, e sem o
     antes a medida não sabe distinguir "chegou agora" de "já estava lá". */
  window.__antesDoArrasto = { origem, to_read: conta('to_read'), reading: conta('reading'), read: conta('read') };
  const a = de.getBoundingClientRect(), b = para.getBoundingClientRect();
  const x0 = Math.round(a.x + a.width / 2), y0 = Math.round(a.y + 20);
  const x1 = Math.round(b.x + b.width / 2), y1 = Math.round(b.y + 90);
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    pts.push({ x: Math.round(x0 + (x1 - x0) * i / 14), y: Math.round(y0 + (y1 - y0) * i / 14) });
  }
  return pts;
})()
