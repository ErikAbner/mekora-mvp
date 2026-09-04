import { capaDoLivro } from "./capa-substituta.js";
import "./capa-de-reserva.css";

/* A capa de quem não tem capa — uma peça, nos três lugares que precisavam dela.
 *
 * Havia TRÊS implementações do mesmo estado, escritas separadas e divergentes:
 * `.capa-vazia` na Estante, `.livro-capa-vazia` no Canvas e
 * `.livro-pagina-capa-vazia` na ficha do Livro. As três punham o título em 16px
 * centrado, sem fundo, sem variante — e nenhuma chegava a aparecer, porque
 * `cover_url` nunca era nulo. Três respostas para uma pergunta que o produto
 * não fazia.
 *
 * O DESENHO, LIDO POR DADO DE NÓ EM 04/09
 * =======================================
 * Conjunto `1016:31030`. Duas variantes lidas — a 1 (`1016:31028`) e a 2
 * (`1016:31018`) —, e o esqueleto é o mesmo nas duas:
 *
 *   420×594, papel `#f4f2ec`, coluna, `justify-content: space-between`
 *   cabeçalho   recheio 32px em cima e nos lados
 *               título    Zodiak Black 32px, `#111`
 *               crédito   Zodiak Regular 10px  — estilo `Capa/Credito`
 *   arte        entre os dois, é o que muda de variante para variante
 *   rodapé      recheio 32/16, uma linha de 232px
 *               formato à esquerda, data à direita
 *
 * O que difere entre as duas: a arte (vetor na 1, foto sobre `#d9d9d9` na 2) e
 * o rodapé (faixa preta com texto claro na 1, papel com texto preto na 2). A
 * arte de cada uma tem nó próprio, listado em `docs/TELAS-FIGMA.md`, e entra
 * como regra `[data-capa]` sem tocar neste arquivo.
 *
 * O QUE EU ERREI AQUI, E O QUE ISSO ENSINA
 * ========================================
 * A primeira versão deste componente pintava seis variantes de preto inteiro,
 * escolhidas de olho numa captura do conjunto com 68 pixels por capa. A 2
 * estava na lista, e o fundo dela é papel: o preto é só a faixa do rodapé, e na
 * 2 nem isso. Escrevi no comentário do próprio arquivo que chutar a arte a
 * partir de miniatura "é como as telas ficaram erradas da primeira vez", e
 * chutei duas regras abaixo. Miniatura não é dado de nó, mesmo quando parece
 * óbvio — principalmente quando parece óbvio.
 */
export function CapaDeReserva({ titulo, autor, formato, data, chave, className = "" }) {
  return (
    <span
      className={`capa-de-reserva ${className}`.trim()}
      data-capa={capaDoLivro(chave)}
      title={titulo}
    >
      <span className="capa-de-reserva-alto">
        <span className="capa-de-reserva-titulo">{titulo}</span>
        {autor ? <span className="capa-de-reserva-credito">{autor}</span> : null}
      </span>
      {formato || data ? (
        <span className="capa-de-reserva-rodape">
          <span className="capa-de-reserva-formato">{formato || ""}</span>
          <span className="capa-de-reserva-data">{data || ""}</span>
        </span>
      ) : null}
    </span>
  );
}
