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

  const cap = await epub.capitulo(Math.min(capitulo, epub.capitulos - 1));
  const { blocos } = lerCapitulo(cap.html, { caminho: cap.caminho });

  return {
    titulo: epub.titulo,
    autor: epub.autor,
    capitulos: epub.capitulos,
    capitulo,
    blocos,
    /* O objeto do EPUB fica disponível para os próximos capítulos, sem baixar o
     * arquivo de novo. */
    epub,
  };
}
