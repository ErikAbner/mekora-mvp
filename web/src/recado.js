/* Abrir a caixa de recado de qualquer lugar.
 *
 * POR QUE UM EVENTO, E NÃO UMA PROPRIEDADE
 * ========================================
 * A folha é UMA no produto inteiro, e mora no `App`. Quem a abre são o rodapé —
 * que está dentro de cada jornada — e o hambúrguer do telefone. Passar um
 * `aoAbrirRecado` até lá atravessaria vinte e duas telas que não têm nada a ver
 * com recado, e cada tela nova teria de lembrar de repassar. A que esquecesse
 * ficaria com um "Deixar um recado" que não abre nada, e isso não faz barulho.
 *
 * Um contexto do React resolveria também, e custaria um provedor mais um
 * `useContext` em cada ponta. O evento é a mesma coisa em três linhas, e o
 * navegador já o tem.
 *
 * A DESVANTAGEM, ESCRITA: quem lê o `Rodape.jsx` não vê quem escuta. É por isso
 * que o nome do evento está numa constante exportada e não solto em texto — quem
 * procurar `RECADO_PEDIDO` acha as duas pontas.
 */
export const RECADO_PEDIDO = "mekora:recado";

/** Pede a folha de recado. Ninguém precisa saber onde ela mora. */
export function abrirRecado() {
  window.dispatchEvent(new CustomEvent(RECADO_PEDIDO));
}
