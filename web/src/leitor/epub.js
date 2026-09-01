/* O EPUB, do arquivo aos capítulos.
 *
 * O caminho é sempre o mesmo, e cada passo existe por uma razão:
 *
 *   META-INF/container.xml   →  onde está o OPF. Sempre neste caminho fixo; é a
 *                               única coisa que se pode assumir num EPUB.
 *   o OPF                    →  manifesto (o que existe) e espinha (em que
 *                               ORDEM se lê). Os dois são necessários: o
 *                               manifesto tem capa, css e imagens que não são
 *                               capítulo, e a espinha é o livro.
 *   cada item da espinha     →  um XHTML.
 *
 * POR QUE NÃO `epub.js`. Ele existe e funciona, e traz opinião própria de
 * renderização — colunas, paginação, iframe com CSS do editor. Isso lutaria com
 * o design system em cada tela. Aqui o EPUB é lido como CONTEÚDO, e quem desenha
 * é o Mekora.
 */
import { abrirZip } from "./zip.js";

const CONTAINER = "META-INF/container.xml";

export async function abrirEpub(dados) {
  const zip = await abrirZip(dados);

  if (!zip.tem(CONTAINER)) {
    throw new Error("não é um EPUB: falta META-INF/container.xml");
  }

  const doc = xml(await zip.texto(CONTAINER));
  const caminhoOpf = doc.querySelector("rootfile")?.getAttribute("full-path");
  if (!caminhoOpf) throw new Error("o container não aponta para nenhum OPF");

  const base = caminhoOpf.includes("/") ? caminhoOpf.replace(/\/[^/]*$/, "/") : "";
  const opf = xml(await zip.texto(caminhoOpf));

  /* O manifesto é um índice por id. A espinha referencia por idref, então sem
   * este mapa não dá para saber qual arquivo é o capítulo 1. */
  const manifesto = new Map();
  for (const item of opf.querySelectorAll("manifest > item")) {
    manifesto.set(item.getAttribute("id"), {
      caminho: base + item.getAttribute("href"),
      tipo: item.getAttribute("media-type"),
      propriedades: item.getAttribute("properties") ?? "",
    });
  }

  /* A ESPINHA é o livro; o manifesto é o pacote. Um EPUB tem capa, folha de
   * estilo, fonte embutida e sumário no manifesto, e nada disso é capítulo. */
  /* O manifesto indexado por CAMINHO, para responder "que tipo é este
   * arquivo?" — que é a pergunta que a imagem faz, tendo só o caminho. */
  const porCaminho = new Map([...manifesto.values()].map((i) => [i.caminho, i.tipo]));

  const PELA_EXTENSAO = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    svg: "image/svg+xml", webp: "image/webp", avif: "image/avif",
  };

  const tipoDe = (caminho) =>
    porCaminho.get(caminho) ??
    PELA_EXTENSAO[caminho.split(".").pop()?.toLowerCase()] ??
    "application/octet-stream";

  const espinha = [...opf.querySelectorAll("spine > itemref")]
    .map((r) => manifesto.get(r.getAttribute("idref")))
    .filter((i) => i && /xhtml|html/.test(i.tipo ?? ""));

  const meta = (nome) =>
    opf.querySelector(`metadata > ${nome}, metadata > dc\\:${nome}`)?.textContent?.trim() ?? "";

  return {
    titulo: meta("title") || "Sem título",
    autor: meta("creator") || "",
    idioma: meta("language") || "",
    capitulos: espinha.length,
    /* A EXTENSÃO DE CADA CAPÍTULO, EM BYTES, e o total.
     *
     * É o que faltava para o progresso ser porcentagem em vez de "capítulo 2 de
     * 3" — e a ficha da estante mostrava esse "2 de 3" porque o produto não
     * sabia mais que isso. A colheita de 31/08 registrou a peça como coisa a
     * escrever, e recomendou o `epubcfi.js` para âncora; a porcentagem, porém,
     * não precisa de CFI. Precisa de extensão, e a extensão já estava aqui.
     *
     * BYTES DO XHTML, e não caracteres de texto. Contar caracteres exigiria
     * abrir e parsear todos os capítulos na abertura, que é justamente o que o
     * leitor evita para não travar a aba num livro de oitocentas páginas. O byte
     * do XHTML carrega marcação junto, então a medida é aproximada — e ela é
     * honesta porque a marcação se distribui de forma parecida ao longo de um
     * livro. Um capítulo com uma tabela enorme distorce; um livro inteiro, não.
     *
     * O índice do zip já traz esse número, então isto não lê nem descomprime
     * nada: é soma sobre um `Map` que já existe. */
    extensao: espinha.map((i) => zip.tamanho(i.caminho)),
    /* O capítulo é lido sob demanda. Ler o livro inteiro na abertura é como um
     * livro de 800 páginas trava a aba antes de mostrar a primeira linha. */
    capitulo: async (i) => {
      const item = espinha[i];
      if (!item) throw new Error(`o livro não tem capítulo ${i}`);
      return { caminho: item.caminho, html: await zip.texto(item.caminho) };
    },
    /* Uma imagem do EPUB vira URL utilizável. `blob:` e não `data:` porque o
     * segundo carrega os bytes dentro do HTML e infla a página. */
    imagem: async (caminho) => {
      const bytes = await zip.bytes(caminho);
      /* O TIPO É OBRIGATÓRIO, e a falta dele não dá erro nenhum.
       *
       * `new Blob([bytes])` produz um blob sem tipo. A URL funciona, o `fetch`
       * devolve 200, os bytes estão todos lá — e o `<img>` não desenha nada,
       * porque o navegador não decodifica um conteúdo que não sabe identificar.
       * Uma imagem 4x4 aparecia como 0x0 sem uma linha de erro em lugar nenhum.
       *
       * O tipo vem do MANIFESTO do próprio EPUB, que é quem sabe. A extensão é
       * só o plano B: arquivo de conversão às vezes traz `.jpg` guardando PNG,
       * e nesse caso o manifesto está certo e o nome está errado. */
      return URL.createObjectURL(new Blob([bytes], { type: tipoDe(caminho) }));
    },
    zip,
  };
}

function xml(texto) {
  const d = new DOMParser().parseFromString(texto, "application/xml");
  const erro = d.querySelector("parsererror");
  if (erro) throw new Error("XML inválido no EPUB: " + erro.textContent.slice(0, 120));
  return d;
}
