/* A ÂNCORA DA NOTA, e os cinco degraus por que ela resolve.
 *
 * A `DEC-0016` fixa a norma: a posição de uma nota é guardada e restaurada por
 * âncora semântica — nunca por pixel, percentual de rolagem ou altura de
 * documento. A forma vigente é **a citação mais o texto em volta**, com o
 * deslocamento REBAIXADO A DICA DE BUSCA.
 *
 * O produto guardava a citação e o contexto e usava só o deslocamento. Enquanto
 * a extração não muda, os dois concordam e nada aparece. Quando ela muda — e ela
 * muda, porque `texto.js` ainda vai aprender a ler EPUB melhor —, todo
 * deslocamento antigo passa a apontar alguns caracteres para o lado, e a nota
 * destaca a palavra errada COM TODA A CONFIANÇA. Uma nota deslocada e uma nota
 * certa ficam indistinguíveis, que é o pior defeito possível numa marcação: ela
 * não erra visivelmente, ela mente.
 *
 * A escada:
 *
 *   1  exata      onde ela disse que estava
 *   2  contexto   o mesmo parágrafo, casando com o texto em volta
 *   3  citação    o mesmo parágrafo, só a citação
 *   4  capítulo   qualquer parágrafo do mesmo capítulo
 *   5  livro      qualquer parágrafo do livro inteiro
 *      perdida    o trecho não existe mais neste texto
 *
 * DEGRAU NÃO É DETALHE INTERNO. A norma pede que a tela DIGA por qual degrau
 * reencontrou — "o parágrafo mudou; o trecho foi reencontrado pelo texto em
 * volta" —, e que diga quando perdeu, mostrando a citação guardada em vez de
 * apontar para o lugar errado. Por isso ele sai daqui junto da posição, e não
 * fica escondido.
 *
 * O QUE ISTO NÃO FAZ: gravar a posição nova de volta no servidor. O
 * deslocamento guardado é dica de busca, e uma dica que se reescreve sozinha a
 * cada abertura passa a afirmar o que ela só suspeita — e o erro de uma corrida
 * viraria o dado da próxima. A resolução vale para a sessão que a fez.
 *
 * Os degraus 1 a 4 vivem no capítulo, que está em memória. O 5 percorre o livro
 * e por isso é PEDIDO, e não automático: abrir oitenta capítulos para desenhar
 * uma nota travaria a leitura por causa de uma marcação.
 */

export const DEGRAUS = ["exata", "contexto", "citacao", "capitulo", "livro", "perdida"];

/* O que a tela diz sobre cada degrau. Fica aqui e não na tela porque é a NORMA
 * que escolheu as palavras, e uma frase por degrau escrita em cada lugar que a
 * mostra é uma frase que diverge. */
export const EXPLICACAO = {
  exata: null,
  contexto: "O parágrafo mudou; o trecho foi reencontrado pelo texto em volta.",
  citacao: "O parágrafo mudou; o trecho foi reencontrado pela citação.",
  capitulo: "O trecho mudou de parágrafo; foi reencontrado no mesmo capítulo.",
  livro: "O trecho mudou de capítulo; foi reencontrado no livro.",
  perdida: "Este trecho não existe mais neste texto.",
};

/* O texto do capítulo como uma linha só.
 *
 * A concatenação é SEM SEPARADOR, e isso não é economia: é o que faz o
 * deslocamento guardado continuar querendo dizer a mesma coisa. `comDeslocamentos`
 * soma o comprimento de cada bloco para dar o `de` do seguinte, então juntar os
 * textos sem nada no meio reproduz exatamente o sistema de coordenadas em que a
 * nota foi gravada. Um `\n` entre blocos deslocaria tudo em um caractere por
 * parágrafo — e a nota do fim do capítulo erraria por trinta.
 */
export function textoInteiro(blocos) {
  return (blocos ?? []).map((b) => b.texto ?? "").join("");
}

/* O bloco que contém um deslocamento: o último que começa em ou antes dele.
 * A mesma regra do `irPara` e do `trechoEm`, e ela precisa ser a mesma — três
 * regras para "que parágrafo é este" dariam três respostas no mesmo texto. */
function blocoEm(blocos, deslocamento) {
  let alvo = null;
  let base = 0;
  let acumulado = 0;
  for (const b of blocos ?? []) {
    /* O `de` vem pronto quando os blocos passaram por `comDeslocamentos`, e é
     * ele que manda: recontar por cima de uma contagem que já existe é a receita
     * para as duas discordarem no dia em que uma delas mudar. */
    const comeco = typeof b.de === "number" ? b.de : acumulado;
    if (comeco <= deslocamento) {
      alvo = b;
      base = comeco;
    } else break;
    acumulado = comeco + (b.texto ?? "").length;
  }
  return alvo ? { texto: alvo.texto ?? "", base } : null;
}

/* A ocorrência mais PERTO da dica, e não a primeira.
 *
 * O deslocamento guardado deixou de mandar, mas continua sabendo de alguma
 * coisa: ele diz por onde a nota andava. Com quatro ocorrências da mesma frase
 * num capítulo, a primeira do texto é uma escolha arbitrária; a mais perto de
 * onde a nota estava é a única que usa o que se sabe.
 */
function maisPerto(texto, alvo, dica) {
  if (!alvo) return -1;
  let onde = texto.indexOf(alvo);
  let melhor = -1;
  let menor = Infinity;
  while (onde !== -1) {
    const distancia = Math.abs(onde - dica);
    if (distancia < menor) {
      menor = distancia;
      melhor = onde;
    }
    onde = texto.indexOf(alvo, onde + 1);
  }
  return melhor;
}

/* Resolve uma nota contra os blocos de UM capítulo.
 *
 * Devolve `{ de, ate, degrau }`. Em `perdida`, `de` e `ate` voltam iguais aos
 * guardados — quem desenha não deve usá-los, e quem os lê para depurar merece
 * ver o que estava lá.
 */
export function reancorar(nota, blocos) {
  const guardada = { de: nota.de, ate: nota.ate };
  const trecho = nota.trecho ?? "";

  /* NOTA SEM TRECHO NÃO TEM O QUE REANCORAR. É a nota do livro inteiro — o
   * "Escrever sobre o livro" do nó 895:7839 —, e ela não aponta para lugar
   * nenhum de propósito. Chamá-la de perdida seria dizer que sumiu algo que
   * nunca esteve lá. */
  if (!trecho.trim()) return { ...guardada, degrau: "exata" };

  const inteiro = textoInteiro(blocos);

  /* 1 · EXATA — onde ela disse que estava. */
  if (inteiro.slice(nota.de, nota.ate) === trecho) {
    return { ...guardada, degrau: "exata" };
  }

  const bloco = blocoEm(blocos, nota.de);

  if (bloco) {
    const antes = nota.antes ?? "";
    const depois = nota.depois ?? "";

    /* 2 · CONTEXTO — o mesmo parágrafo, casando com o texto em volta.
     *
     * Só vale com contexto guardado: a nota antiga não tem, e cair aqui com as
     * duas pontas vazias casaria a citação sozinha e chamaria isso de contexto —
     * um degrau que mente sobre a própria certeza. */
    if (antes || depois) {
      const alvo = `${antes}${trecho}${depois}`;
      const onde = maisPerto(bloco.texto, alvo, nota.de - bloco.base);
      if (onde !== -1) {
        const de = bloco.base + onde + antes.length;
        return { de, ate: de + trecho.length, degrau: "contexto" };
      }
    }

    /* 3 · CITAÇÃO — o mesmo parágrafo, só a citação. */
    const onde = maisPerto(bloco.texto, trecho, nota.de - bloco.base);
    if (onde !== -1) {
      const de = bloco.base + onde;
      return { de, ate: de + trecho.length, degrau: "citacao" };
    }
  }

  /* 4 · CAPÍTULO — qualquer parágrafo do mesmo capítulo. */
  const noCapitulo = maisPerto(inteiro, trecho, nota.de);
  if (noCapitulo !== -1) {
    return { de: noCapitulo, ate: noCapitulo + trecho.length, degrau: "capitulo" };
  }

  /* 5 · LIVRO é do `procurarNoLivro`, e ele custa rede: o capítulo acabou. */
  return { ...guardada, degrau: "perdida" };
}

/* O degrau 5, sob demanda: procurar a citação no livro inteiro.
 *
 * `abrirCapitulo(indice)` devolve os blocos daquele capítulo — é a mesma porta
 * que a busca dentro do livro usa. Devolve `{ capitulo, de, ate }` ou `null`.
 *
 * ELE NÃO RODA SOZINHO. Uma nota perdida é rara, e abrir o livro inteiro para
 * desenhar uma marcação é o tipo de custo que se paga sem perceber até a leitura
 * ficar lenta em todo livro por causa de uma nota em cem.
 */
export async function procurarNoLivro(nota, capitulos, abrirCapitulo) {
  const trecho = (nota.trecho ?? "").trim();
  if (!trecho) return null;

  for (let i = 0; i < capitulos; i++) {
    /* O capítulo dela já foi tentado pelos degraus de cima. */
    if (i === nota.capitulo) continue;
    const blocos = await abrirCapitulo(i);
    if (!blocos) continue;
    const inteiro = textoInteiro(blocos);
    const onde = inteiro.indexOf(nota.trecho);
    if (onde !== -1) {
      return { capitulo: i, de: onde, ate: onde + nota.trecho.length };
    }
  }
  return null;
}
