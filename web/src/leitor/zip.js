/* Leitor de ZIP, sem dependência.
 *
 * O EPUB é um zip, e o navegador já sabe descomprimir: `DecompressionStream`
 * existe em todo navegador moderno. O que ele não faz é ler o FORMATO do zip —
 * o índice, os cabeçalhos, onde cada arquivo começa. São umas oitenta linhas, e
 * escrevê-las custa menos que trazer uma biblioteca que traz opinião junto.
 *
 * O formato, na ordem em que é lido:
 *
 *   1. No FIM do arquivo está o `End of Central Directory` — assinatura
 *      `PK\x05\x06`. Ele diz onde o índice começa e quantas entradas tem.
 *      Fica no fim porque zip nasceu para ser gravado em disquete, em partes.
 *   2. O índice — `PK\x01\x02` por entrada — tem nome, método e o deslocamento
 *      do arquivo dentro do zip.
 *   3. Em cada deslocamento há um cabeçalho local, `PK\x03\x04`, cujo tamanho
 *      varia. Ele é lido de novo porque os campos de nome e extra podem diferir
 *      do índice, e confiar no índice para pular bytes é o erro clássico.
 */

const ASSINATURA_FIM = 0x06054b50;
const ASSINATURA_INDICE = 0x02014b50;
const ASSINATURA_LOCAL = 0x04034b50;

export async function abrirZip(dados) {
  const buf = dados instanceof ArrayBuffer ? dados : await dados.arrayBuffer();
  const v = new DataView(buf);
  const fim = acharFim(v);
  if (!fim) throw new Error("não parece um arquivo zip: o índice não foi encontrado");

  const entradas = new Map();
  let p = fim.inicioIndice;

  for (let i = 0; i < fim.quantas; i++) {
    if (v.getUint32(p, true) !== ASSINATURA_INDICE) break;
    const metodo = v.getUint16(p + 10, true);
    const comprimido = v.getUint32(p + 20, true);
    const cru = v.getUint32(p + 24, true);
    const tamNome = v.getUint16(p + 28, true);
    const tamExtra = v.getUint16(p + 30, true);
    const tamComentario = v.getUint16(p + 32, true);
    const desloc = v.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(new Uint8Array(buf, p + 46, tamNome));
    entradas.set(nome, { metodo, comprimido, cru, desloc });
    p += 46 + tamNome + tamExtra + tamComentario;
  }

  const bytes = async (nome) => {
    const e = entradas.get(nome);
    if (!e) throw new Error(`o zip não tem "${nome}"`);
    if (v.getUint32(e.desloc, true) !== ASSINATURA_LOCAL) {
      throw new Error(`cabeçalho local inválido para "${nome}"`);
    }
    /* O tamanho do cabeçalho local é LIDO, não deduzido do índice: os campos de
     * nome e extra podem diferir entre os dois, e somar o do índice é o erro que
     * faz o arquivo sair deslocado por alguns bytes — e deflate falha com uma
     * mensagem que não diz nada sobre a causa. */
    const tamNome = v.getUint16(e.desloc + 26, true);
    const tamExtra = v.getUint16(e.desloc + 28, true);
    const inicio = e.desloc + 30 + tamNome + tamExtra;
    const fatia = new Uint8Array(buf, inicio, e.comprimido);

    if (e.metodo === 0) return fatia;              // guardado, sem compressão
    if (e.metodo !== 8) throw new Error(`método de compressão ${e.metodo} não suportado em "${nome}"`);

    const fluxo = new Blob([fatia]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
  };

  return {
    nomes: () => [...entradas.keys()],
    tem: (n) => entradas.has(n),
    bytes,
    texto: async (n) => new TextDecoder().decode(await bytes(n)),
  };
}

/* O `End of Central Directory` fica no fim, mas pode ter um comentário depois —
 * até 64 KB. Por isso ele é procurado de trás para frente, e não lido de uma
 * posição fixa. */
function acharFim(v) {
  const limite = Math.max(0, v.byteLength - 22 - 0xffff);
  for (let p = v.byteLength - 22; p >= limite; p--) {
    if (v.getUint32(p, true) === ASSINATURA_FIM) {
      return { quantas: v.getUint16(p + 10, true), inicioIndice: v.getUint32(p + 16, true) };
    }
  }
  return null;
}
