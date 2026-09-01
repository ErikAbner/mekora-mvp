/* Comparar texto do jeito que uma pessoa espera.
 *
 * POR QUE ISTO EXISTE COMO ARQUIVO: a mesma função apareceu três vezes em dois
 * dias — na busca da Ajuda, no filtro de notas de um livro e na busca dos
 * Estudos —, e as três eram cópias. Cópia de regra de comparação é como duas
 * telas passam a discordar sobre o que "achou": basta uma delas ganhar o corte
 * de acento e a outra não.
 *
 * A regra é uma só: quem digita "pagina" tem de achar "Página", e quem digita
 * "OCR" tem de achar "ocr". Acento e caixa não são o que a pessoa lembra.
 *
 * O QUE ISTO NÃO FAZ: radical, plural, sinônimo. "notas" não acha "nota", e
 * isso é limitação conhecida — preferível a uma regra de português escrita à
 * mão que erra em metade dos verbos.
 */
export function achatar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** O texto contém o que se procura, pela regra acima? Busca vazia acha tudo. */
export function contem(texto, procura) {
  const alvo = achatar(procura).trim();
  return !alvo || achatar(texto).includes(alvo);
}
