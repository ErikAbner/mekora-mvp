/* Diagnostico neutro para a bancada extrema. Mede custo, transbordo e sinais
 * de colapso sem depender das classes de uma tela especifica. */
(async () => {
  const inicio = performance.now();

  /* A primeira rota da rodada também é a primeira consulta pesada ao banco.
   * Esperar apenas um DOM "estável" aprovava ou reprovava o esqueleto antes
   * de a API devolver a Estante. As demais larguras passavam porque o banco já
   * estava aquecido. Aqui a prova espera o sinal que veio medir, com teto: uma
   * API realmente travada continua terminando com zero livros e reprova. */
  if (location.pathname === "/estante") {
    for (let i = 0; i < 120; i++) {
      const livros = document.querySelectorAll(".estante-grade .grade > .livro").length;
      const vazioReal = document.querySelector(".estante-vazia");
      if (livros > 0 || vazioReal) break;
      await new Promise((resolve) => setTimeout(resolve, 125));
    }
  }

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
  const pequenosAA = botoes.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width < 24 || r.height < 24;
  });

  const memoria = performance.memory ? {
    usada_mb: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
    total_mb: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
  } : null;

  const cabecalho = document.querySelector(".cabecalho");
  let navegacao = null;
  if (cabecalho) {
    const r = cabecalho.getBoundingClientRect();
    const estilo = getComputedStyle(cabecalho);
    const irmaos = [...(cabecalho.parentElement?.children || [])]
      .filter((el) => el !== cabecalho && visivel(el))
      .filter((el) => !["absolute", "fixed"].includes(getComputedStyle(el).position))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r: caixa }) => caixa.bottom > 0)
      .sort((a, b) => a.r.top - b.r.top);
    const seguinte = irmaos[0]?.r || null;
    navegacao = {
      altura: Math.round(r.height),
      topo: Math.round(r.top),
      fundo: estilo.backgroundColor,
      posicao: estilo.position,
      bordas: [estilo.borderTopWidth, estilo.borderRightWidth, estilo.borderBottomWidth, estilo.borderLeftWidth]
        .map((valor) => Math.round(parseFloat(valor) || 0)),
      sobreposicao_com_conteudo: seguinte ? Math.max(0, Math.round(r.bottom - seguinte.top)) : 0,
      conteudo_topo: seguinte ? Math.round(seguinte.top) : null,
    };
  }

  /* A capa é uma área editorial inviolável. Este contrato mede o resultado
   * composto, não apenas a intenção do CSS: proporção, recorte, título
   * recuperável e qualquer interseção real de metadados com a imagem. */
  const sobrepoe = (a, b) => (
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
  );
  const capas = [...document.querySelectorAll(".estante-grade .grade > .livro")]
    .filter(visivel)
    .map((livro, indice) => {
      const caixa = livro.querySelector(".capa-caixa");
      const capa = livro.querySelector(".capa");
      const titulo = livro.querySelector(".livro-texto h3");
      const metadados = [...livro.querySelectorAll(".livro-meta, .livro-notas")].filter(visivel);
      if (!caixa || !capa || !titulo) return { indice, estrutura_incompleta: true };
      const rc = caixa.getBoundingClientRect();
      const ri = capa.getBoundingClientRect();
      const estilo = getComputedStyle(capa);
      const proporcao = ri.height ? ri.width / ri.height : 0;
      const proporcaoEsperada = 420 / 594;
      const linha = parseFloat(getComputedStyle(titulo).lineHeight) || 0;
      return {
        indice,
        tipo: capa.tagName.toLowerCase(),
        largura: Math.round(ri.width),
        altura: Math.round(ri.height),
        desvio_proporcao: Number(Math.abs(proporcao - proporcaoEsperada).toFixed(4)),
        recorte: estilo.objectFit || null,
        overflow: estilo.overflow,
        metadado_sobre_capa: metadados.some((el) => sobrepoe(rc, el.getBoundingClientRect())),
        metadado_dentro_capa: metadados.some((el) => caixa.contains(el)),
        titulo_inteiro_disponivel: titulo.getAttribute("title") === (titulo.textContent || "").trim(),
        titulo_mais_de_duas_linhas: linha > 0 && titulo.getBoundingClientRect().height > linha * 2 + parseFloat(getComputedStyle(titulo).paddingBottom || 0) + 2,
      };
    });
  const capasInvalidas = capas.filter((capa) => (
    capa.estrutura_incompleta
    || capa.desvio_proporcao > 0.015
    || (capa.tipo === "img" && capa.recorte !== "cover")
    || capa.metadado_sobre_capa
    || capa.metadado_dentro_capa
    || !capa.titulo_inteiro_disponivel
    || capa.titulo_mais_de_duas_linhas
  ));

  const notasSoltas = new Set(
    [...document.querySelectorAll("[data-solta-nota]")].map((el) => String(el.dataset.soltaNota)),
  );
  const gruposCanvas = [...document.querySelectorAll(".estudos-canvas-grupo")].map((grupo) => {
    const notas = [...grupo.querySelectorAll("[data-canvas-nota]")].map((el) => String(el.dataset.canvasNota));
    const livros = Number(grupo.dataset.totalLivros || 0);
    const totalNotas = Number(grupo.dataset.totalNotas || 0);
    const dito = Number((grupo.querySelector(":scope > header > .dado")?.textContent || "").match(/\d+/)?.[0] || -1);
    return {
      id: grupo.dataset.canvasGrupo || null,
      titulo: (grupo.querySelector("h3")?.textContent || "").trim(),
      notas,
      livros,
      total_dito: dito,
      total_real: totalNotas + livros,
      repetidas_com_fora_de_estudo: notas.filter((id) => notasSoltas.has(id)),
      pode_criar_estudo: Boolean(grupo.querySelector(".estudos-canvas-acoes button")),
      volta_ao_canvas: Boolean(grupo.querySelector('.estudos-canvas-acoes a[href="/canvas"]')),
    };
  });
  const gruposCanvasInvalidos = gruposCanvas.filter((grupo) => (
    !grupo.id
    || !grupo.titulo
    || grupo.total_real === 0
    || grupo.total_dito !== grupo.total_real
    || grupo.repetidas_com_fora_de_estudo.length > 0
    || (grupo.notas.length > 0 && !grupo.pode_criar_estudo)
    || !grupo.volta_ao_canvas
  ));

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
    navegacao,
    conteudo: {
      maior_texto: maiores,
      blocos_sem_corte: semCorte.length,
      /* Sinal de que a API terminou de preencher a Estante. Sem isto, uma tela
       * vazia e rápida podia ser aprovada antes de os 360 livros chegarem. */
      livros_renderizados: document.querySelectorAll(".estante-grade .grade > .livro").length,
    },
    capas: {
      total: capas.length,
      invalidas: capasInvalidas.length,
      amostra_invalidas: capasInvalidas.slice(0, 8),
      placeholders: capas.filter((capa) => capa.tipo !== "img").length,
    },
    grupos_canvas_em_estudos: {
      total: gruposCanvas.length,
      invalidos: gruposCanvasInvalidos.length,
      amostra_invalidos: gruposCanvasInvalidos.slice(0, 8),
      tem_paginacao: Boolean(document.querySelector(".estudos-canvas-mais")),
    },
    acessibilidade: {
      alvos_menores_que_44: pequenos.length,
      /* 24px é o mínimo AA para tamanho de alvo; 44px continua no relatório
       * como meta confortável, mas não reprova links de texto legítimos. */
      alvos_menores_que_24: pequenosAA.length,
      amostra_alvos_menores_que_24: pequenosAA.slice(0, 8).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          classe: typeof el.className === "string" ? el.className : "",
          largura: Math.round(r.width),
          altura: Math.round(r.height),
          texto: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 70),
        };
      }),
      botoes_sem_nome: botoes.filter((el) => !(el.getAttribute("aria-label") || el.textContent || "").trim()).length,
      imagens_sem_alt: [...document.images].filter((img) => !img.hasAttribute("alt")).length,
    },
    transbordam: fora,
  };
})()
