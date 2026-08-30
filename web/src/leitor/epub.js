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
      return URL.createObjectURL(new Blob([bytes]));
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
