/* A Estante — grade, medida contra o nó `895:7315`.
 *
 * A ficha da direita só diz a verdade sobre um livro PRONTO e COM NOTAS: no nó
 * ela traz barra de leitura, "24 notas", uma citação e uma etiqueta. Medida
 * sobre o primeiro cartão da bancada — que é o trabalho em `analyzed` do R-51 —
 * ela mostra "0 notas" e nenhuma barra, e eu leria isso como peça faltando.
 * Por isso ela CLICA no primeiro cartão que tenha nota antes de medir.
 *
 * CONTROLE NEGATIVO em cada lista: `cartoes` vazio, `recortes` vazio ou ficha
 * ausente é seletor errado, e não tela vazia — a bancada semeia seis livros.
 */
(async () => {
  document.documentElement.setAttribute("data-tema", "claro");
  await new Promise((r) => setTimeout(r, 1800));

  const px = (v) => (v && v !== "0px" ? Math.round(parseFloat(v)) : 0);
  const tipo = (e) => {
    if (!e) return null;
    const c = getComputedStyle(e);
    return { corpo: px(c.fontSize), entre: px(c.lineHeight), peso: c.fontWeight, cor: c.color, alinha: c.textAlign };
  };
  const cx = (e) => {
    if (!e) return null;
    const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    return { larg: Math.round(r.width), alt: Math.round(r.height), vao: px(c.gap),
             recheio: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(px),
             borda: c.borderTopWidth === "0px" ? null : `${px(c.borderTopWidth)}px ${c.borderTopColor}` };
  };

  /* Abre a ficha de um livro que tenha o que mostrar. */
  const comNota = [...document.querySelectorAll(".livro")].find((l) => {
    const m = l.querySelector(".livro-notas");
    return m && parseInt(m.textContent, 10) > 0;
  });
  (comNota || document.querySelector(".livro"))?.querySelector("a, button, img")?.click();
  await new Promise((r) => setTimeout(r, 900));

  const grade = document.querySelector(".grade");
  const cartao = document.querySelector(".livro");
  const ficha = document.querySelector(".ficha, .ficha-caixa, [class*=ficha]");

  return {
    janela: { larg: innerWidth },
    recortes: {
      caixa: cx(document.querySelector(".estante-grade > .recortes, .recortes")),
      itens: [...document.querySelectorAll(".recortes button")].map((b) => ({
        texto: b.textContent.trim().replace(/\s+/g, " "),
        temNumero: /\d/.test(b.textContent),
        marcado: b.getAttribute("aria-pressed") === "true",
        caixa: cx(b), tipo: tipo(b),
      })),
    },
    grade: { ...cx(grade), colunas: grade ? getComputedStyle(grade).gridTemplateColumns.split(" ").length : 0,
             vaoLinha: grade ? px(getComputedStyle(grade).rowGap) : 0,
             vaoColuna: grade ? px(getComputedStyle(grade).columnGap) : 0 },
    cartao: cartao ? {
      caixa: cx(cartao),
      capa: cx(cartao.querySelector(".capa, img.capa, .capa-de-reserva")),
      razao: (() => { const c = cartao.querySelector(".capa, img.capa, .capa-de-reserva"); if (!c) return null;
                      const r = c.getBoundingClientRect(); return r.height ? +(r.width / r.height).toFixed(3) : null; })(),
      titulo: tipo(cartao.querySelector("h3")),
      autor: tipo(cartao.querySelector("p")),
      temMarcador: !!cartao.querySelector(".livro-notas"),
    } : null,
    ficha: ficha ? {
      caixa: cx(ficha),
      titulo: tipo(ficha.querySelector("h2, h3")),
      temBarra: !!ficha.querySelector("[role=progressbar], [class*=barra]"),
      temCitacao: !!ficha.querySelector("blockquote, [class*=citacao]"),
      temEtiqueta: !!ficha.querySelector("[class*=etiqueta], [class*=selo], [class*=tag]"),
      botoes: [...ficha.querySelectorAll("a.botao, button.botao, .botao")].map((b) => ({ rotulo: b.textContent.trim(), caixa: cx(b) })),
      texto: ficha.textContent.trim().replace(/\s+/g, " ").slice(0, 200),
    } : null,
    alternador: [...document.querySelectorAll(".recortes.vista button, [class*=vista] button")].map((b) => b.textContent.trim()),
    controle: {
      cartoes: document.querySelectorAll(".livro").length,
      recortes: document.querySelectorAll(".recortes button").length,
      fichaExiste: !!ficha,
      clicou: !!comNota,
    },
  };
})();
