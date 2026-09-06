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
/* Quantos caracteres de cada lado entram na âncora. O mesmo número do servidor
 * (`CONTEXTO`, em `api/notas.py`), e ele corta lá também — o cliente escolhe,
 * e o servidor não confia. */
const CONTEXTO = 120;

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

  /* O TEXTO EM VOLTA — a outra metade da âncora, pela `DEC-0016`.
   *
   * Sem ele, reancorar uma nota só pode casar a citação, e a citação sozinha é
   * ambígua: "ele disse que não" aparece quatro vezes num capítulo, e casar a
   * primeira gruda a nota na ocorrência errada com toda a confiança. Com o que
   * vinha antes e depois, a ocorrência certa se distingue das outras três.
   *
   * Lido do PARÁGRAFO, e não do capítulo, e nos dois blocos das pontas quando a
   * seleção atravessa mais de um: é o texto colado ao trecho que desambigua.
   * Uma seleção no começo do parágrafo tem `antes` vazio, e está certo — não há
   * o que guardar ali. */
  const inicio = Number(blocoInicio.dataset.de || 0);
  const fim = Number(blocoFim.dataset.de || 0);
  const antes = (blocoInicio.textContent || "").slice(Math.max(0, de - inicio - CONTEXTO), de - inicio);
  const depois = (blocoFim.textContent || "").slice(ate - fim, ate - fim + CONTEXTO);

  /* O CAPÍTULO SAI DO TEXTO SELECIONADO, e não do estado da tela.
   *
   * A leitura é rolagem contínua: há várias `<section class="capitulo">` na
   * página ao mesmo tempo, e o capítulo que a tela guarda é só o que foi ABERTO
   * primeiro. Marcar um trecho de outro capítulo gravava a nota no de entrada —
   * e o desenho filtra as notas por `n.capitulo === indice`, então a marca não
   * aparecia em capítulo nenhum: nem no que foi lido, nem no que foi gravado.
   * O deslocamento ia junto no erro, porque ele é contado a partir do começo do
   * capítulo, e o capítulo era outro.
   *
   * A mesma armadilha já tinha sido paga uma vez, três linhas ao lado, para o
   * PROGRESSO — está escrito lá: "usá-lo faria toda a leitura ser gravada como
   * se fosse no capítulo de entrada". A marcação ficou para trás.
   *
   * `null` quando não há seção — o texto de exemplo e a prova desenham a prosa
   * sem envelope de capítulo, e ali quem sabe o capítulo é quem chamou. */
  const secao = blocoInicio.closest?.("[data-capitulo]");
  const capitulo = secao ? Number(secao.dataset.capitulo) : null;

  /* A posição na tela, para a paleta aparecer JUNTO do que foi marcado. Uma
   * paleta em canto fixo obriga a olhar para longe do texto e voltar. */
  const caixa = faixa.getBoundingClientRect();

  return {
    de,
    ate,
    trecho,
    antes,
    depois,
    capitulo,
    /* AS DUAS BORDAS, e não só a de cima. A paleta é desenhada ACIMA do
       trecho, e um trecho perto do topo da janela empurrava o painel para fora
       da tela — medido: com a seleção a 108px do topo, as cores e metade dos
       botões ficavam cortados. Quem desenha decide para que lado abrir, e para
       isso precisa saber onde o trecho termina. */
    onde: { x: caixa.left + caixa.width / 2, y: caixa.top, yBaixo: caixa.bottom },
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
