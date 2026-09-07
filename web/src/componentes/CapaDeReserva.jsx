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
 * QUATRO ESTÃO FEITAS. As outras dez precisam da mesma leitura, uma a uma; a
 * lista de nós está no doc. Enquanto isso `capa-substituta.js` sorteia SÓ entre
 * as feitas: mostrar uma variante pela metade seria pior que repetir uma
 * inteira.
 */
/* O CRÉDITO, O FORMATO E A DATA NÃO SÃO DESENHADOS, E A RAZÃO É UM CONFLITO.
 *
 * O desenho põe os três em 10px — numa capa de 420px de largura. O produto
 * nunca mostra uma capa de 420: são 252 na grade a 1440 e 159 nas duas colunas
 * a 390. Proporcionalmente, os 10px viram 6px no computador e 3,7px no
 * telefone, e o degrau mais baixo da escala tipográfica é 14.
 *
 * Escondê-los com `display: none` não resolveu: o portão lê o corpo computado e
 * continuou acusando "PDF" em 3,689px — texto que ninguém vê e que o leitor de
 * tela anuncia. Dar piso de 14px resolveria a medida e quebraria a proporção do
 * desenho em todos os tamanhos, que é trocar um defeito visível por um
 * silencioso.
 *
 * Então eles saem, e em 07/09 isto deixou de ser conflito: o produto NÃO TEM
 * lugar que mostre uma capa de 420. São 252 na grade a 1440 e 159 nas duas
 * colunas a 390 — e os dois números vêm do desenho, não de uma escolha minha.
 * Um texto de 10px numa capa que nunca é desenhada em 420 nunca vai caber na
 * escala; subir os três para 14 quebraria a proporção em todos os tamanhos que
 * existem, para consertar um que não existe.
 *
 * A capa mostra só o título nos tamanhos que o produto usa. Ele sobrevive
 * porque tem piso próprio e porque é o que identifica o livro. Se um dia
 * houver uma tela que mostre a capa inteira — uma ficha, uma impressão —, as
 * peças e o CSS dos três continuam escritos e voltam sem serem reinventados. */
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
      style={arte ? { "--arte": arte } : undefined}
    >
      <span className="cr-arte" aria-hidden="true" />
      <span className="cr-alto">
        <span className="cr-titulo">{titulo}</span>
      </span>
    </span>
  );
}
