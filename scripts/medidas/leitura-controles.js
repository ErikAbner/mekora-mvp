/* Prova funcional dos controles centrais do leitor num livro real. Exercita
 * estado público e DOM composto; não alcança estado interno do React. */
(async () => {
  const esperar = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
  const botao = (rotulo) => [...document.querySelectorAll("button")]
    .find((el) => (el.getAttribute("aria-label") || "").startsWith(rotulo));
  const definir = (el, valor) => {
    const prototipo = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototipo, "value").set.call(el, String(valor));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const selecionar = () => {
    const bloco = [...document.querySelectorAll(".prosa [data-de]")]
      .find((el) => (el.textContent || "").trim().length > 80 && el.getClientRects().length);
    if (!bloco) return null;
    const walker = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT);
    let no;
    while ((no = walker.nextNode()) && (no.textContent || "").trim().length < 50) { /* procura */ }
    if (!no) return null;
    const inicio = Math.min(5, no.textContent.length - 2);
    const fim = Math.min(inicio + 35, no.textContent.length);
    const range = document.createRange();
    range.setStart(no, inicio);
    range.setEnd(no, fim);
    const selecao = getSelection();
    selecao.removeAllRanges();
    selecao.addRange(range);
    return { bloco, trecho: selecao.toString() };
  };

  const resultado = {};
  await esperar(900);

  const aparencia = botao("Aparência da leitura");
  aparencia?.click();
  await esperar();
  resultado.aparenciaAbriu = Boolean(document.querySelector(".aparencia")) && aparencia?.getAttribute("aria-pressed") === "true";

  const corpo = document.querySelector("#aparencia-corpo");
  if (corpo) {
    definir(corpo, 28);
    await esperar();
  }
  const entrelinha = document.querySelector("#aparencia-entrelinha");
  if (entrelinha) {
    definir(entrelinha, 1.75);
    await esperar();
  }
  const coluna = document.querySelector("#aparencia-coluna");
  if (coluna) {
    definir(coluna, coluna.max);
    await esperar();
  }
  const semSerifa = [...document.querySelectorAll(".aparencia-opcoes button")]
    .find((el) => /Fonte sem-serifa/.test(el.textContent || ""));
  semSerifa?.click();
  await esperar();
  const raiz = getComputedStyle(document.documentElement);
  resultado.ajustesAplicaram = raiz.getPropertyValue("--leitura-corpo").trim() === "28px"
    && raiz.getPropertyValue("--leitura-razao").trim() === "1.75"
    && parseFloat(raiz.getPropertyValue("--leitura-coluna")) >= 680
    && /system-ui/.test(raiz.getPropertyValue("--leitura-fonte"));
  resultado.ajustesPersistiram = /"corpo":28/.test(localStorage.getItem("mekora:aparencia") || "");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await esperar();
  resultado.escapeFecha = !document.querySelector(".aparencia");

  const busca = botao("Buscar no livro");
  busca?.click();
  await esperar();
  resultado.buscaBotaoExiste = Boolean(busca);
  resultado.buscaPressionada = busca?.getAttribute("aria-pressed") === "true";
  const campoBusca = document.querySelector('input[aria-label="Procurar no texto do livro"]');
  const termo = (document.querySelector(".prosa p")?.textContent || "texto").trim().slice(0, 4);
  if (campoBusca) {
    definir(campoBusca, termo);
    campoBusca.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await esperar(1200);
  }
  resultado.buscaAceitouTexto = campoBusca?.value === termo;
  resultado.buscaRespondeu = Boolean(document.querySelector(".busca-livro-lista, .busca-livro .indice-aviso"));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await esperar();

  const mouse = selecionar();
  resultado.mouseSelecionou = Boolean(mouse?.trecho);
  mouse?.bloco.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
  await esperar();
  resultado.mouseAbriuPaleta = Boolean(document.querySelector(".paleta")) && document.querySelectorAll(".paleta-cor").length === 4;
  document.querySelector(".paleta-cancelar")?.click();
  await esperar();

  const toque = selecionar();
  resultado.toqueSelecionou = Boolean(toque?.trecho);
  toque?.bloco.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
  await esperar();
  resultado.toqueAbriuPaleta = Boolean(document.querySelector(".paleta"));
  document.querySelector(".paleta-cancelar")?.click();
  await esperar();

  const teclado = selecionar();
  resultado.tecladoSelecionou = Boolean(teclado?.trecho);
  document.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", shiftKey: true, bubbles: true }));
  await esperar();
  const antes = document.querySelectorAll("mark[data-destaque]").length;
  resultado.tecladoAbriuPaleta = Boolean(document.querySelector(".paleta"));
  document.querySelector(".paleta-cor")?.click();
  await esperar(1800);
  resultado.destaqueFoiCriado = document.querySelectorAll("mark[data-destaque]").length > antes;

  botao("Notas")?.click();
  await esperar();
  resultado.notasAbriram = Boolean(document.querySelector(".caderno"));
  resultado.notaApareceu = Boolean(document.querySelector(".caderno li"));

  return resultado;
})()
