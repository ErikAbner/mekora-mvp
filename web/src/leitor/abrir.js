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
    /* A EXTENSÃO DO LIVRO, em bytes por capítulo, vinda do índice do zip. É o
     * que transforma "capítulo 2 de 3" em porcentagem — e ela não custa I/O: o
     * índice já foi lido inteiro ao abrir o arquivo. */
    extensao: epub.extensao,
    blocos: await comImagens(epub, blocos),
    /* O objeto do EPUB fica disponível para os próximos capítulos, sem baixar o
     * arquivo de novo. */
    epub,
  };
}

/* Troca o caminho de cada imagem por uma URL que o navegador consegue mostrar.
 *
 * Uma imagem que não abre NÃO vira bloco: um `<img>` quebrado no meio do texto
 * é pior que a ausência dele, porque o ícone de imagem faltando parece defeito
 * do produto e não do arquivo. EPUB de conversão tem referência solta com
 * frequência.
 */
async function comImagens(epub, blocos) {
  const fora = [];
  for (const b of blocos) {
    if (b.tipo !== "imagem") { fora.push(b); continue; }
    try {
      fora.push({ ...b, src: await epub.imagem(b.dentro) });
    } catch {
      /* silêncio deliberado: o capítulo continua legível sem ela */
    }
  }
  return fora;
}

/* Abre OUTRO capítulo do livro já carregado.
 *
 * LIBERA AS IMAGENS DO CAPÍTULO ANTERIOR. Cada `blob:` é uma referência que o
 * navegador segura até alguém devolvê-la — e num livro ilustrado, virar
 * cinquenta páginas sem isso deixa cinquenta capítulos de imagens na memória.
 * O vazamento não aparece em teste curto: aparece em quem lê por uma hora.
 */
export async function irParaCapitulo(livro, indice) {
  const i = Math.max(0, Math.min(indice, livro.capitulos - 1));
  if (i === livro.capitulo) return livro;

  const cap = await livro.epub.capitulo(i);
  const { blocos } = lerCapitulo(cap.html, { caminho: cap.caminho });
  const novos = await comImagens(livro.epub, blocos);

  for (const b of livro.blocos) {
    if (b.src?.startsWith("blob:")) URL.revokeObjectURL(b.src);
  }

  return { ...livro, capitulo: i, blocos: novos };
}


/* UM CAPÍTULO, sem trocar o livro.
 *
 * `irParaCapitulo` substitui os blocos e revoga as imagens do anterior — é o que
 * a leitura de um capítulo por vez precisava. A rolagem contínua precisa do
 * contrário: acrescentar sem tirar, porque os capítulos anteriores continuam na
 * tela, acima.
 *
 * Devolve `null` para índice fora do livro, e quem chama trata isso como "não há
 * mais" — que é a condição de parada da janela.
 */
export async function blocosDoCapitulo(livro, indice) {
  if (!livro?.epub) return null;
  if (indice < 0 || indice >= livro.capitulos) return null;
  const cap = await livro.epub.capitulo(indice);
  const { blocos } = lerCapitulo(cap.html, { caminho: cap.caminho });
  return comImagens(livro.epub, blocos);
}
