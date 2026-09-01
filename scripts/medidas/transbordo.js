/* Quem passa da borda direita da janela, e por quanto.
 *
 * Escrito para o C9: as telas nunca tinham sido medidas a 390px, e a primeira
 * passada achou 524px de rolagem horizontal em nove delas — todas pelo mesmo
 * cabecalho, que nao tinha media query nenhuma.
 *
 * DUAS PODAS IMPORTAM. Quem rola dentro de um pai com overflow nao transborda a
 * PAGINA: o pai contem, e sem essa poda a lista enche de filho de carrossel. E o
 * relatorio diz ROTA e NUMERO DE NOS, porque uma tela que nao carregou devolve
 * "cabe" — foi exatamente o que oito telas protegidas fizeram enquanto a Mesa,
 * com o mesmo cabecalho, transbordava 524px.
 */
(() => {
  const L = window.innerWidth;
  const culpados = [...document.querySelectorAll('body *')]
    .map((e) => {
      const r = e.getBoundingClientRect();
      return { e, dir: Math.round(r.right), larg: Math.round(r.width) };
    })
    .filter((x) => x.dir > L + 1 && x.larg > 0)
    .filter((x) => {
      let n = x.e.parentElement;
      while (n && n !== document.body) {
        const o = getComputedStyle(n).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden') return false;
        n = n.parentElement;
      }
      return true;
    })
    .map((x) => ({
      quem: (x.e.className || '').toString().trim().split(/\s+/)[0] || x.e.tagName,
      texto: (x.e.textContent || '').trim().slice(0, 40),
      passa: x.dir - L,
    }));

  const vistos = new Set();
  return {
    /* ONDE A MEDIDA ACONTECEU. Sem isto, tela que nao carregou devolve "cabe". */
    rota: location.pathname,
    nos: document.querySelectorAll('body *').length,
    cabecalho: !!document.querySelector('.cabecalho-lugares'),
    largura: L,
    rolagem_horizontal:
      document.documentElement.scrollWidth > L
        ? document.documentElement.scrollWidth - L
        : 0,
    transbordam: culpados
      .filter((c) => {
        const k = c.quem + c.passa;
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      })
      .slice(0, 6),
  };
})()
