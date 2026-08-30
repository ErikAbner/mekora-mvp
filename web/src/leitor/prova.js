/* Prova o leitor DENTRO do navegador, que é onde ele roda.
 *
 *     node scripts/medir.mjs http://localhost:5180 1440 900 web/src/leitor/prova.js
 *
 * A primeira versão deste teste rodava no Node e quebrou em `DOMParser is not
 * defined`. A saída fácil seria injetar um analisador só para o teste — e aí o
 * teste passaria a exercitar um caminho que a produção nunca percorre. Testar no
 * navegador custa uma linha a mais e mede o que existe.
 */
(async () => {
  const { lerCapitulo } = await import("/src/leitor/texto.js");
  const { abrirZip } = await import("/src/leitor/zip.js");

  const falhas = [];
  const caso = (nome, real, esperado) => {
    const ok = JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) falhas.push({ nome, esperava: esperado, veio: real });
    return ok;
  };

  const xhtml = (corpo, cabeca = "") =>
    `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head>${cabeca}</head><body>${corpo}</body></html>`;

  // O CSS do editor não atravessa: renderizá-lo faria cada livro parecer de um
  // produto diferente, e o portão reprovaria com razão.
  caso(
    "estilo e link do editor removidos",
    lerCapitulo(xhtml("<p>Uma linha.</p>", '<style>p{font-family:Georgia;color:#333}</style><link rel="stylesheet" href="e.css"/>')).blocos,
    [{ tipo: "paragrafo", texto: "Uma linha.", marcas: [] }],
  );

  // A estrutura que o Mekora reconhece atravessa; `<div class="calibre3">` não
  // é estrutura, é resíduo de conversão.
  caso(
    "titulo, paragrafo e citacao",
    lerCapitulo(xhtml('<div class="calibre3"><h2>Capítulo um</h2><p>Corpo.</p></div><blockquote>Uma citação.</blockquote>')).blocos.map((b) => b.tipo),
    ["titulo", "paragrafo", "citacao"],
  );

  // A ênfase vira DESLOCAMENTO, no mesmo sistema de coordenadas do destaque do
  // usuário — os dois passam a viver juntos.
  const enf = lerCapitulo(xhtml("<p>Um <em>Jeep Willys</em> azul.</p>")).blocos[0];
  caso("texto sem as marcas de HTML", enf.texto, "Um Jeep Willys azul.");
  // 'Jeep Willys' tem 11 caracteres: de 3 vai ate 14, e nao 15. A primeira versao
  // deste teste errou a conta e quase me fez 'consertar' codigo que estava certo.
  caso("enfase por deslocamento", enf.marcas, [{ de: 3, ate: 14, tipo: "enfase" }]);

  // O espaco que ATRAVESSA a fronteira de um no: o caso que a normalizacao em
  // dois caminhos errava, e que a passada unica resolve.
  const fronteira = lerCapitulo(xhtml('<p>a <em>\n  b</em></p>')).blocos[0];
  caso("espaco na fronteira: texto", fronteira.texto, "a b");
  caso("espaco na fronteira: marca", fronteira.marcas, [{ de: 2, ate: 3, tipo: "enfase" }]);

  // Espaço de EPUB vem quebrado porque o XHTML foi indentado para gente ler.
  caso(
    "espaco normalizado",
    lerCapitulo(xhtml("<p>\n   Uma    linha\n   quebrada.\n</p>")).blocos[0].texto,
    " Uma linha quebrada. ",
  );

  // Bloco vazio não vira parágrafo em branco na tela.
  caso("bloco vazio some", lerCapitulo(xhtml("<p></p><p>  </p><p>Só esta.</p>")).blocos.length, 1);

  // O ZIP: um arquivo montado aqui, com um item guardado sem compressão. Prova
  // que o índice, o cabeçalho local e o deslocamento são lidos certo.
  const zipOk = await (async () => {
    const nome = "a.txt", conteudo = new TextEncoder().encode("ola");
    const n = new TextEncoder().encode(nome);
    const p = [];
    const u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
    const u16 = (v) => [v & 255, (v >> 8) & 255];
    const local = [...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
                   ...u32(0), ...u32(conteudo.length), ...u32(conteudo.length), ...u16(n.length), ...u16(0)];
    p.push(...local, ...n, ...conteudo);
    const inicioIndice = p.length;
    p.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
           ...u32(0), ...u32(conteudo.length), ...u32(conteudo.length),
           ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...n);
    p.push(...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(1), ...u16(1),
           ...u32(p.length - inicioIndice), ...u32(inicioIndice), ...u16(0));
    const z = await abrirZip(new Uint8Array(p).buffer);
    return { nomes: z.nomes(), texto: await z.texto("a.txt") };
  })();
  caso("zip: indice lido", zipOk.nomes, ["a.txt"]);
  caso("zip: conteudo extraido", zipOk.texto, "ola");

  return { total: 9, falhas: falhas.length, detalhe: falhas };
})()
