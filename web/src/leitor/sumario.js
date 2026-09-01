/* O sumário do livro, lido uma vez e compartilhado pelos painéis.
 *
 * Dois deles precisam dele: o Índice (941:23112), que lista as partes, e as
 * Notas e destaques (941:23111), que escreve "Capítulo 2 - título do cap. 2" ao
 * pé de cada nota. Cada um lendo por conta própria abriria o mesmo arquivo do
 * zip duas vezes, e — pior — poderia divergir: dois títulos diferentes para o
 * mesmo capítulo, um em cada painel.
 */
import { useEffect, useState } from "react";
import { fracaoLida } from "../../../contrato/progresso.js";

export function usarSumario(livro) {
  /* `null` é "ainda não sei", e `[]` é "o livro não tem sumário". A distinção
   * importa: a primeira mostra "Lendo o sumário…" e a segunda diz que o livro
   * não traz índice. Um só valor faria a tela afirmar a ausência antes de ter
   * olhado. */
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let vivo = true;
    setItens(null);
    setErro(null);
    Promise.resolve(livro?.sumario?.() ?? [])
      .then((l) => vivo && setItens(l))
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [livro]);

  return { itens, erro };
}

/* O TÍTULO DE UM CAPÍTULO, quando o livro deu um.
 *
 * Um capítulo pode ter mais de uma entrada no sumário — o capítulo e as seções
 * dentro dele. O título do capítulo é a entrada de menor nível que aponta para
 * ele: a de nível 1 é uma parte de dentro, e usá-la nomearia o capítulo pelo
 * seu terceiro subtítulo.
 */
export function tituloDoCapitulo(itens, indice) {
  if (!itens?.length) return null;
  const candidatos = itens.filter((i) => i.capitulo === indice);
  if (!candidatos.length) return null;
  return candidatos.reduce((a, b) => (b.nivel < a.nivel ? b : a)).titulo;
}

/* ONDE O CAPÍTULO COMEÇA, em por cento do livro.
 *
 * É o número da coluna da direita no 941:23112, que no desenho aparece como
 * "20", "30", "40". O produto não tem PÁGINAS — o EPUB não tem —, e a única
 * medida de posição que ele conhece de verdade é a extensão em bytes, que já
 * sustenta a porcentagem da estante. Inventar um número de página seria pôr na
 * tela um dado que ninguém calculou.
 *
 * Devolve `null` quando não dá para saber, e a linha então não mostra número —
 * em vez de mostrar zero, que afirmaria "no começo".
 */
export function ondeComeca(extensao, indice) {
  const f = fracaoLida({ capitulo: indice, deslocamento: 0, extensao });
  return f === null ? null : Math.round(f * 100);
}
