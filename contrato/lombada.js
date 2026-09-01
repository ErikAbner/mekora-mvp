/* A espessura da lombada, derivada do livro — e não escolhida.
 *
 * A colheita no GitHub de 31/08 procurou isto pronto e não achou:
 *
 *   "quem faz 3D de verdade usa Three.js; quem faz CSS faz retângulo decorativo
 *    com espessura constante e texto de 7px; quem calcula espessura de lombada a
 *    sério está fazendo capa de impressão, em LaTeX ou InDesign, em 2D. (…) As
 *    duas metades do requisito — espessura derivada e tipografia legível em
 *    superfície rotacionada — existem em contextos incompatíveis. Esta peça se
 *    escreve."
 *
 * A única linha reaproveitável que ela isolou foi a do `hubcrm`:
 * `Math.max(4, Math.min(22, Math.round(pages / 35)))` — e o próprio documento já
 * dizia que ela seria trocada por uma conta a partir da extensão real. Ela é um
 * número por outro: 35 páginas por pixel não sai de lugar nenhum, e o resultado
 * não tem unidade — dá o mesmo pixel numa estante grande e numa miniatura.
 *
 * A CONTA AQUI TEM UNIDADE, e é a da gráfica.
 *
 *   1. Duas páginas por folha. Um livro de 300 páginas tem 150 folhas.
 *   2. Papel de miolo comum tem cerca de 0,1 mm por folha (75–90 g/m²).
 *   3. Logo: 300 páginas ≈ 15 mm de miolo, que é a espessura real desse livro.
 *   4. As capas somam ~2 mm.
 *
 * E o milímetro vira pixel pela ESCALA DA CAPA na tela, e não por um fator solto:
 * a capa da estante tem proporção 420×594, que é √2 — o formato A. Um A5 tem
 * 210 mm de altura, então uma capa desenhada com H pixels de altura está numa
 * escala de H/210 pixels por milímetro.
 *
 * O resultado é que a mesma conta serve para a miniatura da estante e para uma
 * vista grande, sem constante nova: a espessura acompanha a altura, como
 * aconteceria com o livro de verdade.
 */

/** Milímetros por folha de miolo. Papel comum de livro. */
export const MM_POR_FOLHA = 0.1;
/** As duas capas, em milímetros. */
export const MM_DAS_CAPAS = 2;
/** Altura de um A5, em milímetros — a proporção 420×594 da capa é a do formato A. */
export const ALTURA_A5_MM = 210;

/* Uma lombada de menos de 2px não se lê como lombada: vira a borda da capa. E
 * acima de 60mm o livro deixa de ser livro — dicionário e bíblia de estudo
 * chegam lá, e numa estante lado a lado eles esmagariam os vizinhos. Os dois
 * limites são de LEGIBILIDADE, e por isso ficam em unidades diferentes: o de
 * baixo em pixels, porque é sobre enxergar; o de cima em milímetros, porque é
 * sobre o objeto. */
export const MINIMO_PX = 2;
export const MAXIMO_MM = 60;

/** A espessura em milímetros, a partir do número de páginas. */
export function espessuraMm(paginas) {
  const n = Number(paginas);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAXIMO_MM, (n / 2) * MM_POR_FOLHA + MM_DAS_CAPAS);
}

/** A espessura em pixels, para uma capa desenhada com `alturaPx` de altura.
 *
 * Devolve `null` quando não há páginas — e `null` não é "fino". Livro sem
 * contagem de páginas não ganha uma lombada de chute: a vista 3D o mostra com a
 * espessura declarada como desconhecida, e a tela diz isso.
 */
export function espessuraPx(paginas, alturaPx) {
  const mm = espessuraMm(paginas);
  const h = Number(alturaPx);
  if (mm === null || !Number.isFinite(h) || h <= 0) return null;
  return Math.max(MINIMO_PX, Math.round(mm * (h / ALTURA_A5_MM)));
}
