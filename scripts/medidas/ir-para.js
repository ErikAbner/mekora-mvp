/* Entra, SEMEIA o que a tela mostra, navega até ela e espera o conteúdo.
 *
 * O DEFEITO QUE ISTO CONSERTA, E ELE ERA DO MÉTODO
 * ================================================
 * O portão precisa de sessão para alcançar tela protegida, e o link do e-mail
 * serve uma vez — então cada medida pedia um link para uma pessoa NOVA. E
 * pessoa nova tem estante vazia, Canvas vazio, nenhuma nota.
 *
 * Resultado: as telas com conteúdo vinham sendo medidas VAZIAS, e passavam. O
 * Canvas deu verde com contraste 3,42 — abaixo dos 4,5 de AA — porque não havia
 * nota nenhuma na tela quando o portão olhou. Ele mediu 19 nós; a tela cheia
 * tem 32.
 *
 * Verde por omissão pela quarta vez neste repositório, e desta vez no
 * instrumento: o portão respondeu com honestidade sobre o que viu, e o que ele
 * viu era metade da tela.
 *
 * A saída é o setup CRIAR o que vai ser medido, pela API, com a sessão que
 * acabou de abrir. Assim a medida não depende do estado do banco nem de qual
 * pessoa entrou.
 */
(async () => {
  const tela = window.__MEKORA_TELA__ || "/nota/1";
  await new Promise((r) => setTimeout(r, 1200));

  const post = (u, corpo) =>
    fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    }).then((r) => (r.ok ? r.json() : null));

  /* As quatro cores, para o portão ver os quatro pastéis: medir só o amarelo
   * deixaria os outros três passarem sem serem olhados. */
  const CORES = ["amarelo", "verde", "rosa", "azul"];
  const notas = [];
  for (let i = 0; i < CORES.length; i++) {
    const n = await post("/canvas/nos", {
      texto: `Nota de medida ${i + 1}, com texto suficiente para o portão ter o que ler.`,
      cor: CORES[i],
      x: 40 + i * 240,
      y: 40 + (i % 2) * 160,
    });
    if (n) notas.push(n);
  }
  if (notas.length >= 2) {
    await post("/canvas/ligacoes", { de_id: notas[0].nota_id, para_id: notas[1].nota_id });
  }

  /* Um aparelho e um livro, para as telas de conta e estante não ficarem vazias
   * quando forem o alvo. Falha em silêncio se já existirem. */
  await post("/aparelhos", { endereco: "medida@kindle.com", nome: "Medida" });

  /* Um estudo com nota dentro, para a tela de Estudos não ser medida vazia —
   * que foi exatamente o defeito que este arquivo existe para não repetir. */
  const estudo = await post("/estudos/novo", {
    nome: "Estudo de medida",
    sobre: "Uma pergunta no centro, para o portão ter o que ler.",
  });
  if (estudo && notas.length) {
    await post(`/estudos/${estudo.id}/notas`, { nota_id: notas[0].nota_id });
  }

  /* UMA TELA COM `:id` PRECISA DE UM ID QUE ESTA PESSOA TENHA.
   *
   * `/estante/9` media 6 nós — a tela de erro. Cada medida entra com uma conta
   * nova, e conta nova não é dona do livro 9: o backend responde 404, como
   * deve, e o portão media a mensagem de erro achando que media a ficha.
   *
   * É o mesmo defeito que fez o Canvas passar com 19 nós, aparecendo num
   * segundo lugar. Então o setup CRIA um livro e troca o `:id` pelo dele. */
  let destino = tela;

  /* A tela de UMA nota precisa do id de uma nota desta pessoa. As notas foram
   * semeadas acima, então basta usar a primeira. */
  if (/^\/nota\//.test(tela) && notas.length) {
    destino = `/nota/${notas[0].nota_id}`;
  } else if (tela.includes(":id") || /\/(estante|leitura)\/\d+/.test(tela)) {
    const pdf = new Blob(
      ["%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>"],
      { type: "application/pdf" },
    );
    const corpo = new FormData();
    corpo.append("file", new File([pdf], "medida.pdf", { type: "application/pdf" }));
    const enviado = await fetch("/upload", { method: "POST", body: corpo }).then((r) =>
      r.ok ? r.json() : null,
    );
    if (enviado) destino = tela.replace(/(:id|\d+)$/, enviado.upload_id);
  }

  history.pushState({}, "", destino);
  window.dispatchEvent(new PopStateEvent("popstate"));

  /* Espera por CONTEÚDO, e não por relógio: o número de elementos com texto
   * para de crescer, e só aí a medida acontece. */
  const conta = () =>
    [...document.querySelectorAll("body *")].filter((el) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
    ).length;

  let anterior = -1;
  let estavel = 0;
  for (let i = 0; i < 40 && estavel < 3; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const agora = conta();
    estavel = agora === anterior ? estavel + 1 : 0;
    anterior = agora;
  }

  return { onde: location.pathname, nos_com_texto: anterior, semeadas: notas.length, pedido: tela };
})()
