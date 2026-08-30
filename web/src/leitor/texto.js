/* Do XHTML do capítulo aos parágrafos do Mekora.
 *
 * ESTE É O PASSO QUE DECIDE SE O SISTEMA SOBREVIVE. Um EPUB traz o CSS do
 * editor — fonte, corpo, entrelinha, cor, margem — e quase sempre traz mal:
 * `font-family: Georgia`, `font-size: 0.9em`, `color: #333`. Renderizar o HTML
 * cru faz cada livro parecer de um produto diferente, e faz o portão reprovar
 * com razão.
 *
 * Então o conteúdo é EXTRAÍDO, não embutido: o que atravessa é o texto e a
 * estrutura — parágrafo, título, citação, ênfase —, e a aparência é sempre a do
 * Mekora. É a mesma regra que a leitura já seguia com o exemplo.
 *
 * O DESLOCAMENTO DE CARACTERE é preservado por parágrafo, e é o que faz destaque
 * e nota terem onde ancorar. `página não se guarda: ela muda quando a fonte
 * muda` — o que se guarda é a posição dentro do texto, que não muda.
 */

/* O que o Mekora reconhece. O resto do HTML do editor não vira nada, e isso é
 * deliberado: `<div class="calibre3">` não é estrutura, é resíduo de conversão. */
const BLOCOS = {
  P: "paragrafo",
  H1: "titulo", H2: "titulo", H3: "subtitulo", H4: "subtitulo", H5: "subtitulo", H6: "subtitulo",
  BLOCKQUOTE: "citacao",
  LI: "item",
  FIGCAPTION: "legenda",
};

export function lerCapitulo(html, { caminho = "" } = {}) {
  const doc = new DOMParser().parseFromString(html, "application/xhtml+xml");
  const corpo = doc.querySelector("body") ?? doc.documentElement;

  /* Estilo e script do editor saem antes de qualquer leitura. Deixá-los para
   * "ignorar depois" é como um `<style>` acaba injetado numa tela. */
  corpo.querySelectorAll?.("style, script, link").forEach((n) => n.remove());

  const blocos = [];
  percorrer(corpo, blocos);

  return {
    caminho,
    blocos: blocos.filter((b) => b.texto.trim().length > 0),
  };
}

function percorrer(no, saida) {
  for (const filho of no.children ?? []) {
    const tipo = BLOCOS[filho.tagName?.toUpperCase()];
    if (tipo) {
      saida.push({ tipo, ...lerBloco(filho) });
      // Não desce: um <p> dentro de <blockquote> já foi lido, e descer
      // duplicaria o parágrafo.
      continue;
    }
    percorrer(filho, saida);
  }
}

/* O texto e as marcas saem da MESMA passada, e isso não é elegância — é
 * correção.
 *
 * A primeira versão lia o texto pelo `textContent` do bloco e as marcas
 * andando nó por nó, normalizando o espaço nos dois caminhos. Quando o espaço
 * atravessa a fronteira de um nó — `<p>a <em>\n  b</em></p>` — os dois
 * discordam: o pai colapsa `" \n  "` num espaço só, e a caminhada colapsa
 * `" "` e `"\n  "` separadamente, sobrando dois. O deslocamento sai um a mais,
 * e o destaque do usuário cai no caractere errado.
 *
 * Numa passada, o deslocamento é sempre índice DENTRO da string que a função
 * devolve. Não há duas verdades para discordarem.
 */
function lerBloco(bloco) {
  let texto = "";
  const marcas = [];

  const anda = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) {
        // Colapsa contra o que JÁ foi acumulado: se o texto termina em espaço,
        // um espaço novo no início não entra.
        let t = (filho.textContent ?? "").replace(/\s+/g, " ");
        if (texto.endsWith(" ") && t.startsWith(" ")) t = t.slice(1);
        texto += t;
      } else if (filho.nodeType === 1) {
        const tag = filho.tagName.toUpperCase();
        const de = texto.length;
        anda(filho);
        if (tag === "EM" || tag === "I") marcas.push({ de, ate: texto.length, tipo: "enfase" });
        if (tag === "STRONG" || tag === "B") marcas.push({ de, ate: texto.length, tipo: "forte" });
      }
    }
  };
  anda(bloco);
  return { texto, marcas };
}

/* Espaço de EPUB vem quebrado em qualquer lugar, porque o XHTML foi indentado
 * para ser lido por gente. Ele é colapsado dentro de `lerBloco`, contra o que já
 * foi acumulado — e é isso que faz o deslocamento de caractere significar a mesma
 * coisa na leitura e na hora de salvar a nota. */
