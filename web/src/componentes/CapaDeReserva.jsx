import { capaDoLivro } from "./capa-substituta.js";
import "./capa-de-reserva.css";

/* A capa de quem não tem capa — uma peça, nos três lugares que precisavam dela.
 *
 * Havia TRÊS implementações do mesmo estado, escritas separadas e divergentes:
 * `.capa-vazia` na Estante, `.livro-capa-vazia` no Canvas e
 * `.livro-pagina-capa-vazia` na ficha do Livro. As três punham o título em
 * 16px centrado, sem fundo, sem variante — e nenhuma tinha quadro por trás,
 * porque ninguém sabia que o conjunto `1016:31030` existia.
 *
 * Nenhuma das três chegava a aparecer: `cover_url` nunca era nulo, mesmo sem
 * arquivo em disco. Elas eram três respostas diferentes para uma pergunta que
 * o produto nunca fazia.
 *
 * O QUE ESTÁ AQUI E O QUE NÃO ESTÁ
 * ================================
 * Está: a escolha estável da variante, a proporção 420/594 do conjunto, o
 * papel `#f4f2ec` e o título.
 *
 * NÃO está: a arte das catorze. Ela é meio-tom e marca geométrica, e a lombada
 * é uma peça própria de 58×594 — reconstruir isso de olho numa captura de 68
 * pixels seria exatamente o que o Erik chama de "não seguiu o Figma". Cada
 * variante tem nó próprio em `docs/TELAS-FIGMA.md`; a arte entra por lá, uma
 * regra de CSS por `[data-capa]`, sem tocar neste arquivo.
 *
 * Até lá vale a regra que ele deu em 04/09: sem borda ou lateral, cor sólida.
 */
export function CapaDeReserva({ titulo, chave, className = "" }) {
  return (
    <span
      className={`capa-de-reserva ${className}`.trim()}
      data-capa={capaDoLivro(chave)}
      title={titulo}
    >
      <span className="capa-de-reserva-titulo">{titulo}</span>
    </span>
  );
}
