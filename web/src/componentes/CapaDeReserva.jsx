import { capaDoLivro } from "./capa-substituta.js";
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
 * QUATRO ESTÃO FEITAS. As outras dez precisam da mesma leitura, uma a uma; a
 * lista de nós está no doc. Enquanto isso `capa-substituta.js` sorteia SÓ entre
 * as feitas: mostrar uma variante pela metade seria pior que repetir uma
 * inteira.
 */
export function CapaDeReserva({ titulo, autor, formato, data, chave, className = "" }) {
  return (
    <span
      className={`capa-de-reserva ${className}`.trim()}
      data-capa={capaDoLivro(chave)}
      title={titulo}
    >
      <span className="cr-arte" aria-hidden="true" />
      <span className="cr-alto">
        <span className="cr-titulo">{titulo}</span>
        {autor ? <span className="cr-credito">{autor}</span> : null}
      </span>
      <span className="cr-rodape">
        <span className="cr-formato">{formato || ""}</span>
        <span className="cr-data">{data || ""}</span>
      </span>
    </span>
  );
}
