/* Exercita o ciclo completo da central de atividade num perfil descartável.
 * A medida usa os mesmos eventos públicos que o contrato da API emite; não
 * alcança estado interno do React nem depende de classes de uma jornada. */
(async () => {
  const chave = "mekora:atividades";
  const recolhido = "mekora:atividades-recolhido";
  const esperar = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
  const emitir = (itens) => {
    localStorage.setItem(chave, JSON.stringify(itens));
    window.dispatchEvent(new CustomEvent("mekora:atividades"));
  };
  const item = (resultado = null) => ({
    id: 999998,
    tipo: "conversao",
    iniciadoEm: new Date().toISOString(),
    resultado,
    progresso: resultado ? 100 : 37,
  });

  localStorage.removeItem(recolhido);
  emitir([item()]);
  await esperar();
  const abriu = Boolean(document.querySelector(".lote-global"));
  document.querySelector(".lote-global-fechar")?.click();
  await esperar();
  const recolheu = Boolean(document.querySelector(".lote-global-recolhido"));
  const persistiu = localStorage.getItem(recolhido) === "1";

  document.querySelector('.lugar[href="/estante"]')?.click();
  await esperar(450);
  const continuouRecolhido = location.pathname === "/estante" && Boolean(document.querySelector(".lote-global-recolhido"));
  document.querySelector(".lote-global-recolhido")?.click();
  await esperar();
  const reabriu = Boolean(document.querySelector(".lote-global"));

  emitir([item("sucesso")]);
  await esperar();
  const sucessoVisivel = Boolean(document.querySelector(".lote-global.terminou"));
  document.querySelector(".lote-global-fechar")?.click();
  await esperar();
  const sucessoDispensado = !document.querySelector(".lote-global, .lote-global-recolhido")
    && JSON.parse(localStorage.getItem(chave) || "[]").length === 0;

  emitir([item("erro")]);
  await esperar();
  const erro = document.querySelector(".lote-global.tem-erro");
  const erroRecuperavel = Boolean(erro?.querySelector('a[href="/mesa"]'));

  localStorage.removeItem(chave);
  localStorage.removeItem(recolhido);
  window.dispatchEvent(new CustomEvent("mekora:atividades"));

  return { abriu, recolheu, persistiu, continuouRecolhido, reabriu, sucessoVisivel, sucessoDispensado, erroRecuperavel };
})()
