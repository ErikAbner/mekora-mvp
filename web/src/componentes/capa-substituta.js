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
export const CAPAS_PRONTAS = [1, 2, 3, 4];
/* A 12 SAIU DO SORTEIO em 04/09, e o motivo é uma medida minha que mediu a
   coisa errada. O nó `1016:30788` põe a arte como um bloco preto em
   `mix-blend-mode: saturation`. A minha sonda perguntou se a arte tinha
   TAMANHO — 210×238, respondeu que sim — e nunca perguntou se ela PINTAVA.
   Preto em mistura de saturação sobre papel quase neutro não muda nada: na
   folha de contato a 12 sai como papel liso com um título.
   No quadro o bloco deve assentar sobre alguma coisa que ele dessatura, e eu
   não sei sobre o quê. Descobrir é uma leitura de nó; chutar é o que já me
   custou a regra do fundo preto. Volta quando souber. */

export function capaDoLivro(chave) {
  if (!chave) return CAPAS_PRONTAS[0];
  let soma = 0;
  for (let i = 0; i < chave.length; i++) soma = (soma + chave.charCodeAt(i) * (i + 1)) % 100003;
  return CAPAS_PRONTAS[soma % CAPAS_PRONTAS.length];
}
