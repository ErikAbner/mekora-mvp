/* Entra e navega até a tela em MEKORA_TELA antes de medir.
 *
 * O portão mede num Chrome sem sessão, e as telas de conta e estante são
 * protegidas: sem isto ele mede `/entrar` e dá verde para uma tela que nem
 * abriu. Genérico porque cada tela protegida não precisa do próprio arquivo.
 */
(async () => {
  await new Promise((r) => setTimeout(r, 2500));
  const tela = window.__MEKORA_TELA__ || "/conta/preferencias";
  history.pushState({}, "", tela);
  window.dispatchEvent(new PopStateEvent("popstate"));
  await new Promise((r) => setTimeout(r, 3000));
  return { onde: location.pathname };
})()
