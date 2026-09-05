/* O Livro — "o que ficou" —, medido para comparar com o nó.
 *
 * Mesmo motivo da Mesa: o quadro marca `966:29052` (telefone) e `895:7506`
 * (computador) como INSTRUMENTO ERRADO — comparados contra captura. E o
 * `TELAS-FIGMA.md` já registra o que faltava no `895:7631`: origem do arquivo,
 * barra de leitura em porcentagem, última nota como citação, dois dos três
 * botões, os recortes, a busca e as ações por nota. Sete peças, e uma captura
 * não diz se elas voltaram com o tamanho certo.
 *
 * CONTROLE NEGATIVO: `secoes` ou `selos` vazios com a página montada é seletor
 * errado, e a resposta certa é "não medi", não "não tem".
 */
(async () => {
  await new Promise((r) => setTimeout(r, 1800));

  const px = (v) => (v && v !== "0px" ? Math.round(parseFloat(v)) : 0);
  const tipo = (el) => {
    if (!el) return null;
    const c = getComputedStyle(el);
    return { corpo: px(c.fontSize), peso: c.fontWeight, entrelinha: px(c.lineHeight), familia: c.fontFamily.split(",")[0].replace(/['"]/g, "") };
  };
  const caixa = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return { largura: Math.round(r.width), altura: Math.round(r.height), cima: Math.round(r.top + scrollY), recheio: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(px), vao: px(c.gap) };
  };
  const texto = (s) => document.querySelector(s)?.textContent.trim() ?? null;

  const pagina = document.querySelector(".livro-pagina");

  const secoes = [...document.querySelectorAll(".livro-pagina-secao")]
    .filter((s) => s.getBoundingClientRect().height > 0)
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
    .map((s) => ({ titulo: s.querySelector("h2, h3")?.textContent.trim() ?? null, tituloTipo: tipo(s.querySelector("h2, h3")), caixa: caixa(s) }));

  return {
    janela: { largura: innerWidth, altura: innerHeight },
    rota: location.pathname,
    /* O `h1` DENTRO de `.livro-pagina-titulo`, e não o contêiner: ele é um div
       com o título e o botão ⋮ dentro, e a primeira volta desta medida leu
       "Malha Urbana⋮" — que eu quase anotei como defeito de estrutura. Erro da
       medida, não do produto. */
    titulo: texto(".livro-pagina-titulo h1"),
    tituloTipo: tipo(document.querySelector(".livro-pagina-titulo h1")),
    temMaisAcoes: !!document.querySelector(".livro-pagina-mais"),
    autor: texto(".livro-pagina-autor"),
    /* AS SETE PEÇAS que o `895:7631` acusou como faltando, cada uma cobrada
       pelo que ela é na tela, e não pela classe que a desenha hoje. */
    origem: texto(".livro-pagina-origem"),
    barraDeLeitura: (() => {
      const b = document.querySelector(".livro-pagina-barra");
      if (!b) return null;
      /* A PORCENTAGEM É IRMÃ DA BARRA (`.livro-pagina-onde`), e o preenchimento
         usa `inline-size` e não `width` — a primeira volta procurou os dois no
         lugar errado e devolveu "sem porcentagem, sem preenchimento" sobre uma
         barra completa. */
      const feita = b.querySelector("span");
      const r = feita ? feita.getBoundingClientRect() : null;
      const rb = b.getBoundingClientRect();
      return {
        caixa: caixa(b),
        onde: document.querySelector(".livro-pagina-onde")?.textContent.trim().replace(/\s+/g, " ") ?? null,
        valorLido: b.getAttribute("aria-valuenow"),
        feitaLargura: r ? Math.round(r.width) : null,
        feitaFracao: r && rb.width ? +(r.width / rb.width).toFixed(3) : null,
      };
    })(),
    ultimaNota: (() => {
      const u = document.querySelector(".livro-pagina-ultima");
      return u ? { texto: u.textContent.trim().slice(0, 120), ehCitacao: !!u.querySelector("blockquote") || getComputedStyle(u).borderLeftWidth !== "0px", caixa: caixa(u) } : null;
    })(),
    botoes: [...document.querySelectorAll(".livro-pagina-acoes button, .livro-pagina-acoes a")].map((b) => ({ rotulo: (b.getAttribute("aria-label") || b.textContent).trim(), classe: b.className, caixa: caixa(b) })),
    recortes: [...document.querySelectorAll(".recortes button")].map((e) => e.textContent.trim().replace(/\s+/g, " ")),
    busca: !!document.querySelector('.livro-pagina input[type="search"], .livro-pagina-filtro input'),
    /* AS NOTAS SÃO `ul.livro-pagina-notas > li`. `.livro-pagina-nota` — singular
       — é o parágrafo de recado ("Buscando…", "Ainda em preparo"), e mirar nele
       devolveu duas "notas" sem ação nenhuma: eu estava a um passo de escrever
       "as ações por nota não existem" sobre uma tela que as tem. Terceiro
       seletor errado nesta mesma medida, e o terceiro pego pelo controle. */
    notas: [...document.querySelectorAll(".livro-pagina-notas > li")].map((n) => ({
      texto: n.textContent.trim().slice(0, 60),
      acoes: [...n.querySelectorAll("button")].map((b) => (b.getAttribute("aria-label") || b.textContent).trim()).filter(Boolean),
    })),
    selos: [...document.querySelectorAll(".livro-pagina-selos > *")].map((e) => ({ texto: e.textContent.trim(), caixa: caixa(e), raio: getComputedStyle(e).borderRadius })),
    capa: caixa(document.querySelector(".livro-pagina-capa, .livro-pagina-capa-vazia")),
    secoes,
    coluna: caixa(pagina),
    controle: {
      paginaExiste: !!pagina,
      secoesAchadas: secoes.length,
      notasAchadas: document.querySelectorAll(".livro-pagina-notas > li").length,
      botoesAchados: document.querySelectorAll(".livro-pagina-acoes button, .livro-pagina-acoes a").length,
      selosAchados: document.querySelectorAll(".livro-pagina-selos > *").length,
    },
  };
})();
