/* O que a pessoa selecionou, em deslocamento de caractere.
 *
 * O navegador descreve uma seleção por NÓ e OFFSET DENTRO DO NÓ: "o terceiro
 * filho de texto deste `<em>`, a partir do caractere 4". A nota precisa de outra
 * coisa: o deslocamento desde o início do capítulo.
 *
 * A conversão não é uma subtração, e é aqui que se erra. Um parágrafo com
 * ênfase e destaque já aplicados tem vários nós de texto, e o offset dentro de
 * um deles não diz nada sobre a posição dele no parágrafo. É preciso somar o
 * texto de tudo que vem antes, na ordem em que aparece.
 */

/* Quantos caracteres existem dentro de `bloco` antes de chegar em (no, offset).
 *
 * `createTreeWalker` percorre os nós de texto na ordem do documento — a mesma
 * ordem em que o texto é lido —, e isso é exatamente a soma que se quer.
 * Percorrer `childNodes` recursivamente daria o mesmo resultado com mais código
 * e mais chance de errar a ordem.
 */
function deslocamentoDentro(bloco, no, offset) {
  if (no === bloco) {
    /* A seleção pode terminar no próprio bloco em vez de num nó de texto —
     * acontece ao selecionar até o fim do parágrafo. Aí o offset conta FILHOS,
     * e não caracteres. */
    let total = 0;
    for (let i = 0; i < offset && i < bloco.childNodes.length; i++) {
      total += (bloco.childNodes[i].textContent ?? "").length;
    }
    return total;
  }

  const andarilho = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT);
  let total = 0;
  let atual;
  while ((atual = andarilho.nextNode())) {
    if (atual === no) return total + offset;
    total += atual.textContent.length;
  }
  /* Nó fora do bloco: acontece quando a seleção começa antes dele. Contar tudo
   * é a resposta certa — o bloco inteiro está dentro da seleção. */
  return total;
}

function blocoDe(no) {
  const el = no.nodeType === 3 ? no.parentElement : no;
  return el?.closest?.("[data-de]") ?? null;
}

/* Lê a seleção atual. Devolve `null` quando não há nada de útil selecionado.
 *
 * O `null` cobre mais casos do que parece: seleção vazia (um clique é uma
 * seleção de tamanho zero), seleção fora do texto do livro, e seleção que só
 * pegou espaço em branco. Nenhum dos três deve virar nota.
 */
export function lerSelecao(raiz) {
  const sel = window.getSelection?.();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const faixa = sel.getRangeAt(0);
  if (!raiz?.contains(faixa.commonAncestorContainer)) return null;

  const blocoInicio = blocoDe(faixa.startContainer);
  const blocoFim = blocoDe(faixa.endContainer);
  if (!blocoInicio || !blocoFim) return null;

  const de =
    Number(blocoInicio.dataset.de || 0) +
    deslocamentoDentro(blocoInicio, faixa.startContainer, faixa.startOffset);
  const ate =
    Number(blocoFim.dataset.de || 0) +
    deslocamentoDentro(blocoFim, faixa.endContainer, faixa.endOffset);

  const trecho = faixa.toString();
  if (ate <= de || !trecho.trim()) return null;

  /* A posição na tela, para a paleta aparecer JUNTO do que foi marcado. Uma
   * paleta em canto fixo obriga a olhar para longe do texto e voltar. */
  const caixa = faixa.getBoundingClientRect();

  return {
    de,
    ate,
    trecho,
    onde: { x: caixa.left + caixa.width / 2, y: caixa.top },
  };
}

/* Recorta as notas do capítulo para UM bloco.
 *
 * A nota é guardada em deslocamento do CAPÍTULO, porque é assim que ela
 * sobrevive a mudança de extração. O bloco desenha em deslocamento próprio. Uma
 * nota que atravessa três parágrafos vira três pedaços, um por bloco — e sem
 * este recorte, ela pintaria do começo do primeiro ao fim do último, incluindo
 * o que está no meio e não foi marcado.
 */
export function notasDoBloco(notas, de, comprimento) {
  const fim = de + comprimento;
  return notas
    .filter((n) => n.de < fim && n.ate > de)
    .map((n) => ({
      id: n.id,
      cor: n.cor,
      temComentario: !!n.comentario,
      de: Math.max(0, n.de - de),
      ate: Math.min(comprimento, n.ate - de),
    }));
}
