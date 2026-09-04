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
export const CAPAS_DE_RESERVA = 14;

export function capaDoLivro(chave) {
  if (!chave) return 1;
  let soma = 0;
  for (let i = 0; i < chave.length; i++) soma = (soma + chave.charCodeAt(i) * (i + 1)) % 100003;
  return (soma % CAPAS_DE_RESERVA) + 1;
}
