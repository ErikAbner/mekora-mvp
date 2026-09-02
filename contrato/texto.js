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

/* O COMEÇO DE UM TEXTO, CORTADO ATÉ FICAR DISTINTO.
 *
 * A trilha do Livro e a dos Estudos listam as notas da pessoa pelas primeiras
 * palavras — é o que o `895:7631` e o `895:8849` mostram. Três palavras bastam
 * quase sempre, e "quase" foi o problema: na primeira medida a trilha saiu com
 * "O que separa…" quatro vezes e "Uma foto é…" duas. Quatro entradas idênticas
 * numa lista de atalhos é pior que lista nenhuma — a pessoa não tem como
 * escolher, e clicar em qualquer uma parece um defeito.
 *
 * Então o corte não é fixo: ele CRESCE até os rótulos ficarem distintos. Quem
 * empata ganha mais uma palavra, e só quem empata — os outros continuam curtos.
 *
 * O TETO EXISTE porque duas notas podem começar iguais por muitas palavras, e
 * uma trilha com uma frase inteira em cada linha deixa de ser trilha. Batendo no
 * teto, o desempate é o número — feio, e honesto: diz que são duas coisas
 * diferentes que começam igual.
 */
const MINIMO_DE_PALAVRAS = 3;
const MAXIMO_DE_PALAVRAS = 8;

export function comecosDistintos(textos, vazio = "Nota sem texto") {
  const palavras = textos.map((t) =>
    String(t ?? "").trim().replace(/\s+/g, " ").split(" ").filter(Boolean)
  );

  const corta = (ps, n) =>
    ps.length === 0 ? vazio : ps.slice(0, n).join(" ") + (ps.length > n ? "…" : "");

  /* SÓ QUEM EMPATA CRESCE.
   *
   * A primeira versão aumentava o corte de TODO MUNDO até ninguém empatar, e o
   * efeito era o oposto do que se quer: duas notas parecidas faziam a lista
   * inteira virar frases de oito palavras. Aqui o crescimento é por GRUPO de
   * empatados — quem já está distinto em três palavras fica em três. */
  const rotulos = palavras.map((ps) => corta(ps, MINIMO_DE_PALAVRAS));

  for (let n = MINIMO_DE_PALAVRAS; n < MAXIMO_DE_PALAVRAS; n += 1) {
    const conta = new Map();
    rotulos.forEach((r) => conta.set(r, (conta.get(r) ?? 0) + 1));
    const empatados = rotulos
      .map((r, k) => (conta.get(r) > 1 ? k : -1))
      .filter((k) => k >= 0);
    if (!empatados.length) break;
    for (const k of empatados) rotulos[k] = corta(palavras[k], n + 1);
  }

  /* Ainda empatado no teto — dois textos que começam iguais por oito palavras.
   * O desempate é o número: feio, e honesto. Diz que são duas coisas diferentes
   * que começam igual, em vez de fingir que são a mesma. */
  const vistos = new Map();
  const total = new Map();
  rotulos.forEach((r) => total.set(r, (total.get(r) ?? 0) + 1));
  return rotulos.map((r) => {
    if (total.get(r) === 1) return r;
    const quantos = (vistos.get(r) ?? 0) + 1;
    vistos.set(r, quantos);
    return `${r} (${quantos})`;
  });
}
