/* Entra e vai para a tela dos aparelhos.
 *
 * O portão mede a página servida num Chrome sem sessão, e `/conta/kindle` é
 * protegida — sem isto ele mede `/entrar` e dá verde para uma tela que nem
 * abriu.
 */
(async () => {
  await new Promise((r) => setTimeout(r, 2500));
  history.pushState({}, "", "/conta/kindle");
  window.dispatchEvent(new PopStateEvent("popstate"));
  await new Promise((r) => setTimeout(r, 2500));
  return { onde: location.pathname, aparelhos: document.querySelectorAll(".aparelho").length };
})()
