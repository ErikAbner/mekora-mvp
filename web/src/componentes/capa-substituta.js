/* Qual das catorze capas de reserva cabe a um livro — e por que é sempre a mesma.
 *
 * O conjunto `1016:31030` do Figma tem catorze capas de 420×594, para o caso do
 * arquivo que não traz capa própria. Elas estão mapeadas em
 * `docs/TELAS-FIGMA.md`.
 *
 * A ESCOLHA TEM DE SER ESTÁVEL. Sortear a cada renderização daria ao mesmo
 * livro uma capa diferente a cada visita — e capa é o que a pessoa usa para
 * achar o livro na grade sem ler o título. Um acervo que se reembaralha não é
 * uma estante.
 *
 * Então a variante sai do TOKEN do trabalho, que não muda: mesmo livro, mesma
 * capa, em qualquer aparelho e sem guardar nada. O token é aleatório de origem
 * (`secrets.token_urlsafe(16)`), então somar os códigos já espalha bem — não
 * precisa de função de espalhamento de verdade para catorze baldes.
 */
/* SÓ AS QUE ESTÃO CONSTRUÍDAS ENTRAM NO SORTEIO.
 *
 * O conjunto tem catorze, e catorze são catorze COMPOSIÇÕES diferentes — não um
 * esqueleto com a arte trocada. Enquanto as outras dez não forem lidas nó a nó,
 * sortear entre catorze mostraria dez capas pela metade. Repetir uma capa
 * inteira é melhor que estrear uma incompleta.
 *
 * Acrescentar aqui é o último passo de cada variante nova, depois do CSS. */
export const CAPAS_PRONTAS = [1, 2, 12];
/* A 3 tem CSS escrito e NÃO entra: medida na tela, a largura do contêiner
   colapsa para ~28px e o título de 32px sai com 2,17px. É a única das quatro
   com duas colunas e título deitado, e a mistura de `container-type` com
   `writing-mode` vertical pede passada própria. Melhor repetir uma capa
   inteira que estrear uma quebrada. */

export function capaDoLivro(chave) {
  if (!chave) return CAPAS_PRONTAS[0];
  let soma = 0;
  for (let i = 0; i < chave.length; i++) soma = (soma + chave.charCodeAt(i) * (i + 1)) % 100003;
  return CAPAS_PRONTAS[soma % CAPAS_PRONTAS.length];
}
