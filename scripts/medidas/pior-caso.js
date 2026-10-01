/* Diagnostico neutro para a bancada extrema. Mede custo, transbordo e sinais
 * de colapso sem depender das classes de uma tela especifica. */
(async () => {
  const inicio = performance.now();
  let estaveis = 0;
  let anterior = -1;
  for (let i = 0; i < 80 && estaveis < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 125));
    const atual = document.querySelectorAll("body *").length;
    estaveis = atual === anterior ? estaveis + 1 : 0;
    anterior = atual;
  }

  const largura = innerWidth;
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden";
  };
  const textos = [...document.querySelectorAll("h1,h2,h3,p,blockquote,a,button")]
    .filter(visivel)
    .map((el) => ({ el, texto: (el.textContent || "").trim() }))
    .filter((item) => item.texto);
  const semCorte = textos.filter(({ el }) => {
    const estilo = getComputedStyle(el);
    return estilo.overflow === "visible" && estilo.textOverflow !== "ellipsis";
  });
  const maiores = textos
    .sort((a, b) => b.texto.length - a.texto.length)
    .slice(0, 5)
    .map(({ el, texto }) => ({
      tag: el.tagName.toLowerCase(),
      classe: typeof el.className === "string" ? el.className.split(/\s+/)[0] : "",
      caracteres: texto.length,
      altura: Math.round(el.getBoundingClientRect().height),
      amostra: texto.slice(0, 90),
    }));

  const fora = [...document.querySelectorAll("body *")]
    .filter(visivel)
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right > largura + 1 || r.left < -1)
    .filter(({ el }) => {
      let pai = el.parentElement;
      while (pai && pai !== document.body) {
        const overflow = getComputedStyle(pai).overflowX;
        if (["auto", "scroll", "hidden", "clip"].includes(overflow)) return false;
        pai = pai.parentElement;
      }
      return true;
    })
    .slice(0, 12)
    .map(({ el, r }) => ({
      tag: el.tagName.toLowerCase(),
      classe: typeof el.className === "string" ? el.className.split(/\s+/)[0] : "",
      esquerda: Math.round(r.left), direita: Math.round(r.right),
      texto: (el.textContent || "").trim().slice(0, 70),
    }));

  const botoes = [...document.querySelectorAll("button,a")].filter(visivel);
  const pequenos = botoes.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width < 44 || r.height < 44;
  });

  const memoria = performance.memory ? {
    usada_mb: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
    total_mb: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
  } : null;

  return {
    rota: location.pathname,
    janela: { largura: innerWidth, altura: innerHeight },
    documento: {
      largura: document.documentElement.scrollWidth,
      altura: document.documentElement.scrollHeight,
      overflow_horizontal: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    },
    custo: {
      nos: document.querySelectorAll("body *").length,
      textos: textos.length,
      controles: botoes.length,
      imagens: document.images.length,
      tempo_ate_estabilizar_ms: Math.round(performance.now() - inicio),
      memoria,
    },
    conteudo: {
      maior_texto: maiores,
      blocos_sem_corte: semCorte.length,
    },
    acessibilidade: {
      alvos_menores_que_44: pequenos.length,
      botoes_sem_nome: botoes.filter((el) => !(el.getAttribute("aria-label") || el.textContent || "").trim()).length,
      imagens_sem_alt: [...document.images].filter((img) => !img.hasAttribute("alt")).length,
    },
    transbordam: fora,
  };
})()
