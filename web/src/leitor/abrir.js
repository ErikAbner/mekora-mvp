/* Abrir um livro: do job no servidor aos blocos na tela.
 *
 * O backend serve o EPUB em `/storage/output/{id}/...`, e é só isso que ele
 * precisa fazer. A `DEC-0011 §3` chama esse backend de "o ativo a preservar" e
 * o define como pipeline de conversão — dar a ele uma segunda responsabilidade,
 * a de servir texto interpretado, é o começo de como um serviço vira dois mal
 * feitos.
 *
 * E o arquivo lido aqui é O MESMO que vai para o Kindle. Se o servidor extraísse
 * texto por outro caminho, os dois derivariam — e a divergência apareceria
 * justamente na nota que você fez na tela e não acha no aparelho.
 */
import { abrirEpub } from "./epub.js";
import { lerCapitulo } from "./texto.js";

export async function abrirLivro(url, { capitulo = 0 } = {}) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`o livro não pôde ser baixado (${r.status})`);

  const epub = await abrirEpub(await r.arrayBuffer());
  if (!epub.capitulos) throw new Error("o EPUB não tem capítulos na espinha");

  /* ABRIR NO PRIMEIRO CAPÍTULO QUE TEM TEXTO, e não no de índice zero.
   *
   * Um EPUB feito pelo Calibre — que é o que o próprio Mekora gera — começa com
   * `titlepage.xhtml`: a capa, marcada `calibre:cover`, com uma imagem e nenhuma
   * palavra. Abrir nela mostrava uma tela em branco num livro que estava
   * inteiro ali.
   *
   * Achado abrindo, no navegador, o EPUB que o produto acabara de converter. O
   * EPUB de teste escrito à mão não tinha capa, então o defeito não existia até
   * o arquivo ser real.
   *
   * A busca anda para a frente e para no primeiro com blocos. O teto existe
   * porque um livro pode legitimamente abrir com várias páginas de rosto, e
   * também porque um EPUB quebrado não pode fazer o leitor baixar tudo.
   */
  const TETO = 5;
  let indice = Math.min(capitulo, epub.capitulos - 1);
  let cap = await epub.capitulo(indice);
  let blocos = lerCapitulo(cap.html, { caminho: cap.caminho }).blocos;

  /* Só procura quando NÃO foi pedido um capítulo específico: quem pede o
   * capítulo 3 quer o 3, mesmo que ele esteja vazio. */
  if (capitulo === 0) {
    for (let i = 1; !blocos.length && i < Math.min(TETO, epub.capitulos); i++) {
      const proximo = await epub.capitulo(i);
      const lidos = lerCapitulo(proximo.html, { caminho: proximo.caminho }).blocos;
      if (lidos.length) { indice = i; cap = proximo; blocos = lidos; }
    }
  }

  return {
    titulo: epub.titulo,
    autor: epub.autor,
    capitulos: epub.capitulos,
    capitulo: indice,
    blocos,
    /* O objeto do EPUB fica disponível para os próximos capítulos, sem baixar o
     * arquivo de novo. */
    epub,
  };
}
