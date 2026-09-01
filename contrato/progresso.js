/* Quanto do livro já foi lido, em porcentagem.
 *
 * A ficha da estante mostrava "capítulo 2 de 3" porque era tudo o que o produto
 * sabia — e o desenho pede "80% lido" com barra. A colheita no GitHub de 31/08
 * registrou isto como peça a escrever, depois de ler o que existia:
 *
 *   "quem faz 3D de verdade usa Three.js; quem faz CSS faz retângulo decorativo
 *    com espessura constante (…) As duas metades do requisito existem em
 *    contextos incompatíveis. Esta peça se escreve."
 *
 * O que faltava não era biblioteca: era a EXTENSÃO do livro. Ela está no índice
 * do zip do EPUB, em bytes por capítulo, e o índice já é lido inteiro na
 * abertura — a conta não custa I/O nenhum.
 *
 * "capítulo 2 de 3" NÃO É 66%. Um capítulo de trinta páginas e um de duas contam
 * igual nessa conta, e é por isso que ela não serve: num livro com prefácio
 * curto, terminar o prefácio marcaria um terço lido.
 */

/** Onde a leitura está, de 0 a 1.
 *
 * `capitulo` é o índice na espinha, `deslocamento` é a fração já rolada DENTRO
 * dele (0 a 1), e `extensao` é o array de bytes por capítulo.
 *
 * Devolve `null` quando não dá para saber — e `null` não é zero. Zero afirma
 * "no começo"; `null` diz "não sei", e a tela mostra coisas diferentes para cada
 * um.
 */
export function fracaoLida({ capitulo = 0, deslocamento = 0, extensao } = {}) {
  if (!Array.isArray(extensao) || !extensao.length) return null;

  const total = extensao.reduce((s, n) => s + (Number(n) || 0), 0);
  if (total <= 0) return null;

  const i = Math.max(0, Math.min(Math.floor(capitulo) || 0, extensao.length - 1));
  const antes = extensao.slice(0, i).reduce((s, n) => s + (Number(n) || 0), 0);

  /* O deslocamento vem da rolagem e pode chegar levemente fora de [0,1] —
   * elástico de fim de página em iOS, arredondamento de `scrollTop`. Preso aqui,
   * e não na tela, porque a tela não deveria saber disso. */
  const dentro = Math.max(0, Math.min(1, Number(deslocamento) || 0));
  const atual = (Number(extensao[i]) || 0) * dentro;

  return Math.max(0, Math.min(1, (antes + atual) / total));
}

/** A mesma coisa em texto, do jeito que a ficha mostra.
 *
 * ARREDONDA PARA BAIXO, e nunca chega a 100% antes do fim. `Math.round` faria
 * 99,6% virar "100% lido" com dez páginas pela frente — e a pessoa que abre um
 * livro marcado como terminado e encontra um capítulo inteiro aprende a não
 * confiar no número.
 *
 * E não mostra "0% lido": quem abriu e não rolou não leu nada, e a frase certa
 * para isso é "não começou".
 */
export function quantoLido(marca) {
  const f = fracaoLida(marca);
  if (f === null) return null;
  if (f >= 1) return "lido";
  const pct = Math.floor(f * 100);
  return pct <= 0 ? "não começou" : `${pct}% lido`;
}
