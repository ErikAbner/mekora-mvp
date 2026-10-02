import { capaDoLivro } from "./capa-substituta.js";
import { arteDaCapa } from "./arte-de-capa.js";
import "./capa-de-reserva.css";

/* A capa de quem não tem capa — uma peça, nos três lugares que precisavam dela.
 *
 * Havia TRÊS implementações do mesmo estado, divergentes: `.capa-vazia` na
 * Estante, `.livro-capa-vazia` no Canvas e `.livro-pagina-capa-vazia` na ficha.
 * Nenhuma chegava a aparecer, porque `cover_url` nunca era nulo.
 *
 * O DESENHO — conjunto `1016:31030`, lido por dado de nó
 * =====================================================
 * Catorze capas de 420×594 e catorze lombadas de 58×594. Os ids estão em
 * `docs/TELAS-FIGMA.md`.
 *
 * E A DESCOBERTA QUE MUDA O TAMANHO DO TRABALHO: as catorze não são um
 * esqueleto com a arte trocada. São catorze COMPOSIÇÕES diferentes. Quatro
 * lidas, quatro arranjos:
 *
 *   1   título em cima, arte embaixo, rodapé em faixa preta
 *   2   título em cima, foto grande, rodapé em papel
 *   3   duas colunas — três ladrilhos à esquerda, título DEITADO à direita
 *   12  tudo centrado, bloco preto em `mix-blend-saturation`, quatro campos
 *
 * Então o DOM aqui tem todas as peças e o arranjo é por variante, no CSS. Uma
 * marcação só, catorze layouts — que é o que permite trocar de capa sem trocar
 * de componente.
 *
 * AS CATORZE ESTÃO CONSTRUÍDAS. `capa-substituta.js` distribui os livros entre
 * elas por uma chave estável, e `arte-de-capa.js` preenche somente as áreas que
 * no mockup eram fotografias.
 */
/* A CAPA É UMA IMAGEM COMPOSTA, NÃO UMA SEGUNDA FICHA DO LIVRO.
 *
 * O conjunto do Figma usa autor, formato e data como parte da composição. A
 * primeira implementação recebia esses dados, mas os descartava no DOM; por
 * isso várias variantes ficavam visualmente vazias ou mudavam de equilíbrio.
 * Eles voltam aqui e são posicionados variante a variante no CSS.
 *
 * Como o cartão já anuncia título e autor em texto acessível logo abaixo, o
 * interior da capa é decorativo para tecnologia assistiva. A raiz recebe um
 * único nome, e as letras muito pequenas da miniatura não são lidas duas vezes.
 * Em capas estreitas o CSS esconde os metadados, mas preserva o título. */
export function CapaDeReserva({ titulo, autor, formato, data, chave, className = "" }) {
  const variante = capaDoLivro(chave);
  /* A ARTE É DESENHADA POR LIVRO — ver `arte-de-capa.js`.
   *
   * Nove das catorze têm área de arte, e até 07/09 as nove usavam a mesma trama
   * de meio-tom: na grade da Estante, o que as separava era só onde a mancha
   * ficava. Agora cada livro tem a sua, derivada do token, e a técnica de cada
   * variante é a que o quadro mostra — hachura na 2, 3, 6 e 7; pontos na 4;
   * massa na 8, 9, 10 e 11.
   *
   * `null` para as cinco que não têm área gerada: a 1 e a 5 têm arte própria
   * lida do nó, e a 12, 13 e 14 são massa sólida em CSS.
   *
   * A arte NÃO É GUARDADA em lugar nenhum. Ela se reconstrói da chave, e o
   * `--arte` só existe enquanto o cartão está na tela. */
  const arte = arteDaCapa(variante, chave);
  return (
    <span
      className={`capa-de-reserva ${className}`.trim()}
      data-capa={variante}
      title={titulo}
      role="img"
      aria-label={`Capa criada para ${titulo}`}
      style={arte ? { "--arte": arte } : undefined}
    >
      <span className="cr-arte" aria-hidden="true" />
      <span className="cr-alto" aria-hidden="true">
        <span className="cr-titulo">{titulo}</span>
        {autor ? <span className="cr-credito">{autor}</span> : null}
      </span>
      <span className="cr-rodape" aria-hidden="true">
        {autor ? <span className="cr-rodape-autor">{autor}</span> : null}
        {formato ? <span className="cr-formato">{formato}</span> : null}
        {data ? <span className="cr-data">{data}</span> : null}
      </span>
    </span>
  );
}
