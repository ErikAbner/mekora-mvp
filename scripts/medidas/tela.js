/* A ESTRUTURA DE QUALQUER TELA, sem saber o nome das classes dela.
 *
 * POR QUE ISTO EXISTE. Cada conferência estava começando com um `grep` pelas
 * classes da tela, e errando: `.recorte` no singular, `.conta-secao` numa tela
 * que não a tem, `.livro-pagina-nota` que é recado e não nota. Três seletores
 * errados em três telas, cada um custando uma volta — e um deles quase virou
 * "a peça não existe" num relatório.
 *
 * Esta medida não pergunta por nome. Ela colhe:
 *
 *   COLUNA      a largura de conteúdo real — o elemento mais largo que ainda
 *               tem texto dentro, subindo a partir dos parágrafos.
 *   BLOCOS      todo elemento com fundo ou borda PRÓPRIOS e altura de verdade:
 *               é o que o desenho chama de cartão, faixa, painel ou caixa.
 *   TITULOS     h1..h4 com corpo, entrelinha, peso e o texto.
 *   ACOES       botões e links de aparência de botão, com recheio e altura.
 *   CAMPOS      entradas de formulário.
 *
 * CONTROLE NEGATIVO embutido: `nos` conta os elementos com texto da tela. Se
 * vier baixo demais para a tela pedida, ela não montou — e "não achei blocos"
 * seria cegueira, não resposta.
 */
(async () => {
  document.documentElement.setAttribute("data-tema", "claro");
  await new Promise((r) => setTimeout(r, 2400));

  const px = (v) => (v && v !== "0px" ? Math.round(parseFloat(v)) : 0);
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const nome = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "");

  /* Um bloco é um elemento que se distingue do fundo por conta própria. Fundo
     transparente e sem borda é estrutura invisível, e não peça de desenho. */
  const proprio = (c) => {
    const temFundo = c.backgroundColor && c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent";
    const temBorda = ["Top", "Right", "Bottom", "Left"].some((l) => px(c["border" + l + "Width"]) > 0);
    return temFundo || temBorda;
  };

  const todos = [...document.querySelectorAll("body *")].filter(vis);

  const blocos = todos
    .filter((e) => { const c = getComputedStyle(e); return proprio(c) && e.getBoundingClientRect().height > 24; })
    .map((e) => {
      const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
      return {
        o: nome(e),
        larg: Math.round(r.width), alt: Math.round(r.height),
        y: Math.round(r.top + scrollY),
        recheio: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(px),
        vao: px(c.gap),
        fundo: c.backgroundColor,
        borda: ["Top", "Right", "Bottom", "Left"].map((l) => px(c["border" + l + "Width"])).join("/"),
        raio: px(c.borderTopLeftRadius),
      };
    })
    .sort((a, b) => a.y - b.y)
    .slice(0, 24);

  const titulos = [...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).map((e) => {
    const c = getComputedStyle(e);
    return { tag: e.tagName.toLowerCase(), texto: e.textContent.trim().slice(0, 48),
             corpo: px(c.fontSize), entre: px(c.lineHeight), peso: c.fontWeight,
             larg: Math.round(e.getBoundingClientRect().width) };
  });

  const acoes = [...document.querySelectorAll("button, a[class*=botao], .botao")].filter(vis).map((e) => {
    const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    return { rotulo: (e.getAttribute("aria-label") || e.textContent).trim().slice(0, 34),
             alt: Math.round(r.height), recheio: [px(c.paddingTop), px(c.paddingRight)].join("/"),
             fundo: c.backgroundColor, borda: px(c.borderTopWidth) };
  }).slice(0, 20);

  /* A COLUNA: o elemento mais largo entre os que contêm parágrafo, ignorando os
     que sangram a tela inteira. É a medida que o nó chama de `w-[1222px]`. */
  const paras = [...document.querySelectorAll("p, li")].filter(vis);
  const larguras = paras.map((p) => {
    let e = p, melhor = p.getBoundingClientRect().width;
    for (let i = 0; i < 4 && e.parentElement; i++) {
      e = e.parentElement;
      const w = e.getBoundingClientRect().width;
      if (w < innerWidth - 8) melhor = Math.max(melhor, w);
    }
    return Math.round(melhor);
  });
  const coluna = larguras.length ? Math.max(...larguras) : null;

  return {
    janela: innerWidth,
    coluna,
    titulos,
    blocos,
    acoes,
    campos: [...document.querySelectorAll("input, textarea, select")].filter(vis).length,
    controle: { nos: todos.filter((e) => e.textContent.trim()).length, paragrafos: paras.length },
  };
})();
