/* Abre o caderno de notas antes de medir.
 *
 * O portão mede o que está NA TELA. Com o caderno fechado ele media sete nós e
 * dava verde sem ter olhado para a maior parte da interface de notas — o
 * mesmo tipo de verde por omissão que já custou três rodadas neste repositório.
 */
(async () => {
  await new Promise((r) => setTimeout(r, 3500));
  document.querySelector('[aria-label^="Notas"]')?.click();
  await new Promise((r) => setTimeout(r, 900));
  return { caderno: !!document.querySelector(".caderno") };
})()
