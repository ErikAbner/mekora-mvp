/* A Mesa, medida para ser comparada com o nó — e não com uma miniatura.
 *
 * POR QUE ESTA MEDIDA. O quadro (`scripts/quadro.mjs`) marca as cinco Mesas
 * como INSTRUMENTO ERRADO: elas foram "comparadas" contra captura. Numa
 * miniatura de 1024 de lado maior, 20px e 24px são o mesmo pixel — foi assim
 * que inventei uma regra de fundo preto lendo uma capa de 68px. O que a
 * comparação precisa é do que o navegador COMPÔS, em número.
 *
 * O QUE ELA COLHE, e cada campo saiu de uma divergência já paga noutra tela:
 *
 *   ordem das seções   o desenho põe a área de soltar NO TOPO; a tela a tinha
 *                      como "Adicionar mais" no fim (`895:9736`). Ordem é
 *                      conteúdo, e some numa lista de propriedades.
 *   recortes           rótulo, número, e se o número vem ANTES ou DEPOIS —
 *                      `895:9348` errava exatamente isso.
 *   ações por cartão   pausar, repetir, remover, ⋮. Faltar uma é o defeito que
 *                      só aparece lendo o nó.
 *   tipografia         corpo, peso, entrelinha e família de cada título. A
 *                      Zodiak já esteve declarada e não servida por 22 telas.
 *   geometria          largura da coluna, recheio e distância entre seções.
 *
 * CONTROLE NEGATIVO: `secoes` vazio significa seletor errado, e não Mesa vazia
 * — a Mesa vazia tem seção. Quem lê isto reprova por indeterminação, e não por
 * defeito.
 */
(async () => {
  await new Promise((r) => setTimeout(r, 1600));

  const px = (v) => (v && v !== "0px" ? Math.round(parseFloat(v)) : 0);
  const tipo = (el) => {
    if (!el) return null;
    const c = getComputedStyle(el);
    return {
      corpo: px(c.fontSize),
      peso: c.fontWeight,
      entrelinha: px(c.lineHeight),
      familia: c.fontFamily.split(",")[0].replace(/['"]/g, ""),
      caixa: c.textTransform,
      espacamento: c.letterSpacing,
    };
  };
  const caixa = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      largura: Math.round(r.width),
      altura: Math.round(r.height),
      cima: Math.round(r.top + scrollY),
      recheio: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(px),
      vao: px(c.gap),
    };
  };

  const raiz = document.querySelector("main") || document.body;

  /* AS SEÇÕES NA ORDEM EM QUE A PESSOA AS VÊ, e não na ordem do DOM: `order` do
     flex e `grid-row` reordenam sem tocar no markup, e a ordem que o desenho
     cobra é a de cima para baixo. */
  const secoes = [...raiz.querySelectorAll("section, [data-secao]")]
    .filter((s) => s.getBoundingClientRect().height > 0)
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
    .map((s) => {
      const t = s.querySelector("h1, h2, h3");
      return {
        classe: s.className || null,
        titulo: t ? t.textContent.trim() : null,
        tituloTipo: tipo(t),
        caixa: caixa(s),
      };
    });

  /* Os recortes: rótulo E número separados, para a ordem entre eles aparecer. */
  /* `nav.recortes > button`, e não `.recorte`: a primeira versão desta medida
     mirava o singular e devolveu lista vazia numa tela que TEM os recortes.
     Zero de seletor errado é idêntico a zero de defeito — e eu quase escrevi
     "faltam os recortes" sobre uma tela certa. */
  const recortes = [...document.querySelectorAll('.recortes button, [role="tab"]')].map((e) => {
    const txt = e.textContent.trim().replace(/\s+/g, " ");
    return {
      texto: txt,
      numeroAntes: /^\d/.test(txt),
      marcado: e.getAttribute("aria-selected") === "true" || e.getAttribute("aria-pressed") === "true" || /(^|\s)(ativo|marcado|selecionado)(\s|$)/.test(e.className),
      tipo: tipo(e),
    };
  });

  const cartoes = [...document.querySelectorAll(".arquivo-preparo, .lista > li")]
    .filter((c) => c.getBoundingClientRect().height > 0)
    .map((c) => ({
      titulo: (c.querySelector(".arquivo-nome, h3, h4") || {}).textContent?.trim() ?? null,
      estado: (c.querySelector(".arquivo-estado") || {}).textContent?.trim() ?? null,
      acoes: [...c.querySelectorAll("button")].map((b) => (b.getAttribute("aria-label") || b.textContent).trim()).filter(Boolean),
      caixa: caixa(c),
    }));

  /* A área de soltar, e ONDE ela está: topo ou fim. */
  const soltar = document.querySelector(".soltar, [data-soltar], .area-de-soltar");

  return {
    janela: { largura: innerWidth, altura: innerHeight },
    rota: location.pathname,
    estado: document.querySelector(".mesa-vazia") ? "vazia" : cartoes.length ? "cheia" : "indefinido",
    coluna: caixa(raiz),
    secoes,
    recortes,
    cartoes,
    soltar: soltar ? { caixa: caixa(soltar), titulo: soltar.querySelector("h1,h2,h3")?.textContent.trim() ?? null, ondeNaPagina: Math.round(soltar.getBoundingClientRect().top + scrollY) } : null,
    textos: [...raiz.querySelectorAll("h1, h2, h3, p")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ tag: e.tagName, texto: e.textContent.trim().slice(0, 90), tipo: tipo(e) })),
    /* CONTROLE: cada lista tem de provar que sabe achar antes de a ausência
       valer como resposta. `recortesAchados: 0` numa Mesa cheia é seletor
       errado, e não recorte faltando — foi o que aconteceu na primeira volta. */
    controle: {
      secoesAchadas: secoes.length,
      recortesAchados: recortes.length,
      cartoesAchados: cartoes.length,
      navRecortesExiste: !!document.querySelector(".recortes"),
      listaExiste: !!document.querySelector(".lista"),
    },
  };
})();
