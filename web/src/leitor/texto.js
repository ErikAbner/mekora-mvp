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
  ASIDE: "nota-fonte",
  LI: "item",
  FIGCAPTION: "legenda",
};

/* O caminho de uma imagem dentro do EPUB é relativo ao CAPÍTULO que a cita, e
 * não à raiz do arquivo. Um capítulo em `OEBPS/texto/cap1.xhtml` que pede
 * `../imagens/mapa.png` está falando de `OEBPS/imagens/mapa.png`.
 *
 * Resolver isso a mão parece simples e não é: `..` no meio, `.` redundante,
 * barras duplicadas. Fazer com `URL` e uma base falsa entrega o algoritmo pronto
 * — o mesmo que o navegador usa — e o `pathname` volta sem a base.
 */
function resolverCaminho(src, doCapitulo) {
  if (!src || /^(https?:|data:|blob:)/i.test(src)) return null;
  const base = doCapitulo.includes("/") ? doCapitulo.replace(/\/[^/]*$/, "/") : "";
  try {
    return new URL(src, `mekora:/${base}`).pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

/* Guardado no módulo porque `percorrer` desce recursivamente e passar o caminho
 * por todos os níveis só para chegar na imagem seria ruído em cada chamada.
 * É seguro porque a leitura é síncrona do começo ao fim. */
let caminhoDoCapitulo = "";

export function lerCapitulo(html, { caminho = "" } = {}) {
  /* `epub:type` VIRA `data-epub-type` ANTES DE ANALISAR, e o motivo não é
   * conveniência: em XML, um prefixo sem `xmlns:epub` declarado não é atributo
   * desconhecido, é ERRO — e o analisador descarta o DOCUMENTO INTEIRO, não o
   * atributo. Um capítulo que esqueceu a declaração viraria um capítulo em
   * branco, sem erro em lugar nenhum.
   *
   * O `epub.js` faz a mesma troca pelo mesmo motivo, na leitura do sumário. */
  const doc = new DOMParser().parseFromString(html.replace(/epub:type/g, "data-epub-type"), "application/xhtml+xml");
  const corpo = doc.querySelector("body") ?? doc.documentElement;

  /* Estilo e script do editor saem antes de qualquer leitura. Deixá-los para
   * "ignorar depois" é como um `<style>` acaba injetado numa tela. */
  corpo.querySelectorAll?.("style, script, link").forEach((n) => n.remove());

  caminhoDoCapitulo = caminho;
  const blocos = [];
  percorrer(corpo, blocos);

  return {
    caminho,
    /* IMAGEM SEM TEXTO NÃO É BLOCO VAZIO. Este filtro existe para descartar o
     * `<p></p>` que sobra de conversão, e assumia que todo bloco tinha `texto`
     * — o que era verdade até a imagem existir. Uma figura entre dois
     * parágrafos era lida como vazia e derrubava a leitura do capítulo inteiro
     * com `Cannot read properties of undefined`. */
    blocos: blocos.filter((b) => b.tipo === "imagem" || (b.texto ?? "").trim().length > 0),
  };
}

function percorrer(no, saida) {
  for (const filho of no.children ?? []) {
    const marca = filho.tagName?.toUpperCase();
    const ancora = filho.getAttribute?.("id") || null;

    /* A IMAGEM É UM BLOCO, e não um detalhe dentro do parágrafo. Num EPUB ela
     * costuma vir sozinha entre dois textos — mapa, gravura, quadro —, e tratá-la
     * como parte de um bloco de texto faria o deslocamento do destaque contar
     * caracteres que não existem.
     *
     * O `alt` é preservado como está, inclusive vazio: `alt=""` num EPUB quer
     * dizer "decorativa, não anuncie", e inventar uma descrição no lugar faria o
     * leitor de tela narrar enfeite. */
    if (marca === "IMG" || marca === "IMAGE") {
      const src = filho.getAttribute("src") || filho.getAttribute("xlink:href") || filho.getAttribute("href");
      const dentro = resolverCaminho(src, caminhoDoCapitulo);
      if (dentro) saida.push({ tipo: "imagem", dentro, alt: filho.getAttribute("alt") ?? "", ...(ancora ? { ancora } : {}) });
      continue;
    }

    const tipo = BLOCOS[marca];
    if (tipo) {
      /* IMAGEM DENTRO DE BLOCO DE TEXTO — e é assim que quase todo EPUB a
       * escreve: `<p><img/></p>`.
       *
       * Aqui o bloco era lido e a descida parava, então a imagem sumia; e como
       * o parágrafo ficava sem texto, o filtro de blocos vazios apagava o resto.
       * Resultado: NENHUMA figura de livro aparecia na leitura, sem erro em
       * lugar nenhum — porque não havia erro, havia um bloco a menos.
       *
       * As imagens saem como blocos próprios, na ordem, e o texto do bloco
       * continua sendo um bloco só. A alternativa — descer sempre — duplicaria
       * o parágrafo que já foi lido, que é o que o comentário antigo evitava. */
      const dentroDele = filho.querySelectorAll?.("img, image") ?? [];
      if (dentroDele.length) {
        /* Preserva a ordem real do XHTML. Antes todas as imagens eram emitidas
         * primeiro e o texto inteiro depois, mesmo em `texto, imagem, texto`.
         * Isso invertia justamente os exemplos que o parágrafo explicava. */
        let ancoraUsada = false;
        let inicioNo = filho;
        let inicioOffset = 0;
        const emitirTexto = (fragmento) => {
          const conteudo = lerBloco(fragmento);
          if ((conteudo.texto ?? "").trim()) {
            saida.push({ tipo, ...conteudo, ...(!ancoraUsada && ancora ? { ancora } : {}) });
            ancoraUsada = true;
          }
        };
        for (const img of dentroDele) {
          const trecho = filho.ownerDocument.createRange();
          trecho.setStart(inicioNo, inicioOffset);
          trecho.setEndBefore(img);
          emitirTexto(trecho.cloneContents());
          const src =
            img.getAttribute("src") ||
            img.getAttribute("xlink:href") ||
            img.getAttribute("href");
          const dentro = resolverCaminho(src, caminhoDoCapitulo);
          if (dentro) {
            saida.push({ tipo: "imagem", dentro, alt: img.getAttribute("alt") ?? "", ...(!ancoraUsada && ancora ? { ancora } : {}) });
            ancoraUsada = true;
          }
          inicioNo = img.parentNode;
          inicioOffset = Array.from(inicioNo.childNodes).indexOf(img) + 1;
        }
        const restante = filho.ownerDocument.createRange();
        restante.setStart(inicioNo, inicioOffset);
        restante.setEnd(filho, filho.childNodes.length);
        emitirTexto(restante.cloneContents());
        continue;
      }

      /* A EPÍGRAFE, e ela é DECLARADA pelo livro — não adivinhada.
       *
       * O nó 895:10472 tem um bloco escuro sangrando até as bordas, em caixa
       * alta, com a frase de abertura do capítulo. É uma epígrafe, e ela existe
       * no EPUB 3 como `epub:type="epigraph"`.
       *
       * A alternativa seria uma regra de forma — "a primeira citação curta do
       * capítulo" —, e ela erra em qualquer livro que abra citando uma fonte.
       * Livro que não declara não ganha o bloco escuro, e ganha a citação com
       * filete, que é o que ele pediu. */
      const papel = filho.getAttribute?.("data-epub-type") || "";
      const qual = tipo === "citacao" && /\bepigraph\b/.test(papel)
        ? "epigrafe"
        : tipo === "paragrafo" && /\bcontributors?\b/.test(papel)
          ? "autoria"
          : tipo;
      saida.push({ tipo: qual, ...lerBloco(filho), ...(ancora ? { ancora } : {}) });
      // Não desce: um <p> dentro de <blockquote> já foi lido, e descer
      // duplicaria o parágrafo.
      continue;
    }
    /* Um destino do sumário costuma estar num invólucro (`section`/`div`) e
     * não no parágrafo. Nesse caso ele pertence ao primeiro bloco produzido
     * pelo invólucro: é ali que a navegação deve pousar. */
    const inicio = saida.length;
    percorrer(filho, saida);
    if (ancora && saida.length > inicio && !saida[inicio].ancora) {
      saida[inicio] = { ...saida[inicio], ancora };
    }
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
