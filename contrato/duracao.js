/* Um tempo em segundos, dito como uma pessoa diz.
 *
 * "costuma levar 128,4 s" não é português. O que se diz é "cerca de 2 minutos",
 * e é isso que a tela precisa — o número exato não muda nada para quem espera.
 *
 * ARREDONDA PARA CIMA no meio-minuto, e isso é escolha: quem esperou dois
 * minutos e dez segundos ouvindo "cerca de 2 minutos" acha que o produto errou;
 * quem esperou o mesmo ouvindo "cerca de 3" acha que foi rápido. Errar para o
 * lado da paciência é o lado barato.
 */
export function comoSeDiz(segundos) {
  if (typeof segundos !== "number" || !Number.isFinite(segundos) || segundos < 0) return null;
  if (segundos < 10) return "poucos segundos";
  if (segundos < 90) return `cerca de ${Math.round(segundos / 5) * 5} segundos`;
  const minutos = Math.ceil(segundos / 60);
  if (minutos < 60) return `cerca de ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.round(segundos / 3600);
  return `cerca de ${horas} ${horas === 1 ? "hora" : "horas"}`;
}
