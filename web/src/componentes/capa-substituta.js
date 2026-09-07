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
/* AS CATORZE ENTRAM NO SORTEIO — decisão do Erik em 07/09: "construir todas as
 * 14 variantes previstas".
 *
 * Até 06/09 só quatro estavam construídas, e sortear entre catorze mostraria
 * dez capas pela metade. Agora as catorze composições existem em
 * `capa-de-reserva.css`, uma a uma, lidas dos nós do conjunto `1016:31030`.
 *
 * A 12 VOLTOU, e o motivo dela ter saído era uma medida minha que mediu a coisa
 * errada: o nó põe a arte como preto em `mix-blend-mode: saturation`, e eu
 * concluí pela REGRA do blend que ela não pintaria nada — sem olhar a captura
 * do nó, que mostra um retângulo preto sólido. A nota inteira está no CSS.
 *
 * TROCAR A CAPA À MÃO fica fora da V1, também por decisão de 07/09. A escolha
 * segue sendo derivada do token: nada guardado, nada para desatualizar. */
export const CAPAS_PRONTAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function capaDoLivro(chave) {
  if (!chave) return CAPAS_PRONTAS[0];
  let soma = 0;
  for (let i = 0; i < chave.length; i++) soma = (soma + chave.charCodeAt(i) * (i + 1)) % 100003;
  return CAPAS_PRONTAS[soma % CAPAS_PRONTAS.length];
}
