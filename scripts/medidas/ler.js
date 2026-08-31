/* Abre um livro e marca um trecho, para a captura mostrar a leitura com nota. */
(async () => {
  await new Promise((r) => setTimeout(r, 1200));
  history.pushState({}, "", "/leitura/9");
  window.dispatchEvent(new PopStateEvent("popstate"));
  await new Promise((r) => setTimeout(r, 3500));

  const bloco = document.querySelector(".prosa .bloco");
  if (bloco?.firstChild) {
    const faixa = document.createRange();
    faixa.setStart(bloco.firstChild, 0);
    faixa.setEnd(bloco.firstChild, Math.min(40, bloco.firstChild.length));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(faixa);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));
    document.querySelector('[aria-label="Marcar de amarelo"]')?.click();
    await new Promise((r) => setTimeout(r, 1200));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));
  return { onde: location.pathname, blocos: document.querySelectorAll(".prosa .bloco").length };
})()
