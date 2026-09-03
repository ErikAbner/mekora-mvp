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
  const { abrirEpub } = await import("/src/leitor/epub.js");

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

  // A EPÍGRAFE É DECLARADA, e não adivinhada. O nó 895:10472 tem um bloco escuro
  // sangrando até as bordas, e ele é uma epígrafe — `epub:type="epigraph"` no
  // EPUB 3. Uma regra de forma ("a primeira citação curta") erraria em qualquer
  // livro que abra citando uma fonte.
  caso(
    "citacao com epub:type=epigraph vira epigrafe",
    lerCapitulo(xhtml('<blockquote epub:type="epigraph">Somos influenciados.</blockquote>')).blocos.map((b) => b.tipo),
    ["epigrafe"],
  );
  caso(
    "citacao sem o papel continua citacao",
    lerCapitulo(xhtml("<blockquote>Uma citação qualquer.</blockquote>")).blocos.map((b) => b.tipo),
    ["citacao"],
  );
  caso(
    "epub:type com mais de um papel ainda pega",
    lerCapitulo(xhtml('<blockquote epub:type="bodymatter epigraph">Duas.</blockquote>')).blocos.map((b) => b.tipo),
    ["epigrafe"],
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

  // A IMAGEM É UM BLOCO PRÓPRIO, e o caminho dela é relativo ao CAPÍTULO — não
  // à raiz do EPUB. Um capítulo em `OEBPS/texto/` que pede `../figuras/mapa.png`
  // está falando de `OEBPS/figuras/mapa.png`.
  caso(
    "imagem vira bloco, com caminho resolvido a partir do capitulo",
    lerCapitulo(
      xhtml('<p>Antes.</p><figure><img src="../figuras/mapa.png" alt="Mapa"/><figcaption>A legenda</figcaption></figure><p>Depois.</p>'),
      { caminho: "OEBPS/texto/cap1.xhtml" },
    ).blocos.map((b) => (b.tipo === "imagem" ? `${b.tipo}:${b.dentro}:${b.alt}` : b.tipo)),
    ["paragrafo", "imagem:OEBPS/figuras/mapa.png:Mapa", "legenda", "paragrafo"],
  );

  // IMAGEM SEM TEXTO NÃO É BLOCO VAZIO. O filtro que descarta o `<p></p>` de
  // conversão chamava `b.texto.trim()` — verdade para todo bloco, até a imagem
  // existir. Uma figura entre dois parágrafos derrubava o capítulo inteiro com
  // `Cannot read properties of undefined`.
  caso(
    "figura no meio do texto nao derruba o capitulo",
    lerCapitulo(xhtml('<p>Um.</p><p></p><img src="a.png" alt=""/><p>Dois.</p>'), { caminho: "cap.xhtml" }).blocos.map((b) => b.tipo),
    ["paragrafo", "imagem", "paragrafo"],
  );

  // `alt=""` num EPUB quer dizer "decorativa, não anuncie". Inventar uma
  // descrição faria o leitor de tela narrar enfeite.
  caso(
    "alt vazio e preservado",
    lerCapitulo(xhtml('<p>x</p><img src="a.png" alt=""/>'), { caminho: "cap.xhtml" }).blocos.find((b) => b.tipo === "imagem").alt,
    "",
  );

  // Endereço absoluto não vira bloco: o EPUB é lido offline, e uma imagem
  // remota faria a leitura depender de um servidor de terceiro.
  caso(
    "imagem com endereco externo e ignorada",
    lerCapitulo(xhtml('<p>x</p><img src="https://exemplo.com/a.png" alt="fora"/>'), { caminho: "cap.xhtml" }).blocos.map((b) => b.tipo),
    ["paragrafo"],
  );

  // ─── O recorte das notas ──────────────────────────────────────────────────
  //
  // A nota é guardada em deslocamento do CAPÍTULO, porque é assim que ela
  // sobrevive a uma mudança de extração. O bloco desenha em deslocamento
  // PRÓPRIO. Sem recortar, uma nota que atravessa três parágrafos pintaria do
  // começo do primeiro ao fim do último — incluindo o que está no meio e não
  // foi marcado.
  const { notasDoBloco } = await import("/src/leitor/selecao.js");

  caso(
    "nota inteiramente dentro do bloco",
    notasDoBloco([{ id: 1, cor: "azul", de: 110, ate: 120 }], 100, 50),
    [{ id: 1, cor: "azul", temComentario: false, de: 10, ate: 20 }],
  );

  caso(
    "nota que comeca antes do bloco e um recorte, nao um deslocamento negativo",
    notasDoBloco([{ id: 2, cor: "rosa", de: 80, ate: 115 }], 100, 50),
    [{ id: 2, cor: "rosa", temComentario: false, de: 0, ate: 15 }],
  );

  caso(
    "nota que passa do fim do bloco para no fim",
    notasDoBloco([{ id: 3, cor: "verde", de: 140, ate: 300 }], 100, 50),
    [{ id: 3, cor: "verde", temComentario: false, de: 40, ate: 50 }],
  );

  caso(
    "nota que engloba o bloco inteiro cobre o bloco inteiro",
    notasDoBloco([{ id: 4, cor: "amarelo", de: 0, ate: 999 }], 100, 50),
    [{ id: 4, cor: "amarelo", temComentario: false, de: 0, ate: 50 }],
  );

  // Nota que termina exatamente onde o bloco começa não toca nele. Sem o `>`
  // estrito, ela apareceria como um destaque de largura zero.
  caso(
    "nota que termina onde o bloco comeca nao entra",
    notasDoBloco([{ id: 5, cor: "azul", de: 50, ate: 100 }], 100, 50),
    [],
  );

  caso(
    "nota de outro trecho do capitulo nao entra",
    notasDoBloco([{ id: 6, cor: "azul", de: 500, ate: 520 }], 100, 50),
    [],
  );

  /* ---- O SUMÁRIO DO LIVRO ------------------------------------------------
   *
   * Um EPUB de verdade, montado aqui: container, OPF com espinha, dois
   * capítulos, e o índice nos DOIS formatos que existem no mundo — o `nav` de
   * EPUB 3 e o `toc.ncx` de EPUB 2. Ler só um deixaria metade dos livros sem
   * índice, e a metade que ficaria de fora é a dos arquivos antigos.
   *
   * O zip é montado sem compressão, como o de cima: o que está sob teste é o
   * sumário, e não o `inflate`.
   */
  const zipar = (arquivos) => {
    const cod = new TextEncoder();
    const u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
    const u16 = (v) => [v & 255, (v >> 8) & 255];
    const p = [], indice = [];
    for (const [nome, texto] of Object.entries(arquivos)) {
      const n = cod.encode(nome), c = cod.encode(texto), onde = p.length;
      p.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
             ...u32(0), ...u32(c.length), ...u32(c.length), ...u16(n.length), ...u16(0), ...n, ...c);
      indice.push([n, c.length, onde]);
    }
    const inicio = p.length;
    for (const [n, tam, onde] of indice) {
      p.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
             ...u32(0), ...u32(tam), ...u32(tam),
             ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(onde), ...n);
    }
    p.push(...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(indice.length), ...u16(indice.length),
           ...u32(p.length - inicio), ...u32(inicio), ...u16(0));
    return new Uint8Array(p).buffer;
  };

  const CONTAINER = `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container:1.0"><rootfiles><rootfile full-path="OEBPS/livro.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
  const CAP = (t) => `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p>${t}</p></body></html>`;

  const opf = (manifestoExtra, espinhaAttr = "") => `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Livro de prova</dc:title></metadata>
      <manifest>
        <item id="c1" href="texto/um.xhtml" media-type="application/xhtml+xml"/>
        <item id="c2" href="texto/dois.xhtml" media-type="application/xhtml+xml"/>
        ${manifestoExtra}
      </manifest>
      <spine ${espinhaAttr}><itemref idref="c1"/><itemref idref="c2"/></spine>
    </package>`;

  // EPUB 3: o `nav`, com um item aninhado para provar o nível.
  const comNav = await abrirEpub(zipar({
    "META-INF/container.xml": CONTAINER,
    "OEBPS/livro.opf": opf('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'),
    "OEBPS/nav.xhtml": `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body>
      <nav epub:type="toc"><ol>
        <li><a href="texto/um.xhtml">A partida</a>
          <ol><li><a href="texto/um.xhtml#meio">O porto</a></li></ol>
        </li>
        <li><a href="texto/dois.xhtml">O regresso</a></li>
        <li><a href="fora-da-espinha.xhtml">Página que não é capítulo</a></li>
      </ol></nav></body></html>`,
    "OEBPS/texto/um.xhtml": CAP("Um."),
    "OEBPS/texto/dois.xhtml": CAP("Dois."),
  }));

  caso("sumario: nav de EPUB 3", await comNav.sumario(), [
    { titulo: "A partida", capitulo: 0, nivel: 0 },
    { titulo: "O porto", capitulo: 0, nivel: 1 },
    { titulo: "O regresso", capitulo: 1, nivel: 0 },
  ]);

  // EPUB 2: o `toc.ncx`, com href RELATIVO ao arquivo que o escreveu — que é
  // onde o caminho ingênuo erra.
  const comNcx = await abrirEpub(zipar({
    "META-INF/container.xml": CONTAINER,
    "OEBPS/livro.opf": opf('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>', 'toc="ncx"'),
    "OEBPS/toc.ncx": `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap>
      <navPoint><navLabel><text>A partida</text></navLabel><content src="texto/um.xhtml"/></navPoint>
      <navPoint><navLabel><text>O regresso</text></navLabel><content src="./texto/dois.xhtml"/></navPoint>
    </navMap></ncx>`,
    "OEBPS/texto/um.xhtml": CAP("Um."),
    "OEBPS/texto/dois.xhtml": CAP("Dois."),
  }));

  caso("sumario: toc.ncx de EPUB 2", await comNcx.sumario(), [
    { titulo: "A partida", capitulo: 0, nivel: 0 },
    { titulo: "O regresso", capitulo: 1, nivel: 0 },
  ]);

  // Sem sumário nenhum: lista vazia, e NÃO um erro. Um EPUB pode legitimamente
  // não trazer índice, e a tela diz isso em vez de inventar uma lista.
  const semNada = await abrirEpub(zipar({
    "META-INF/container.xml": CONTAINER,
    "OEBPS/livro.opf": opf(""),
    "OEBPS/texto/um.xhtml": CAP("Um."),
    "OEBPS/texto/dois.xhtml": CAP("Dois."),
  }));
  caso("sumario: livro sem indice devolve lista vazia", await semNada.sumario(), []);

  /* ── A ESCADA DA ÂNCORA — `DEC-0016` ──────────────────────────────────────
   *
   * Cinco degraus e um estado. Cada caso aqui é uma forma diferente de o texto
   * ter mudado desde que a nota foi feita, e o que se afirma não é "não
   * estourou": é POR QUAL degrau ela resolveu. Um teste que só olhasse a posição
   * daria verde com a nota certa achada pelo motivo errado — e o motivo é o que
   * a tela mostra para a pessoa.
   */
  const { reancorar, procurarNoLivro } = await import("/src/leitor/ancora.js");

  const A = "O verme que primeiro roeu as frias carnes.";
  const B = "Ele disse que nao, e depois disse que nao de novo.";
  const capitulo = (...textos) => textos.map((t) => ({ tipo: "paragrafo", texto: t }));

  /* 1 · exata — o texto nao mudou. */
  caso(
    "ancora: degrau 1, o texto no lugar",
    reancorar({ de: 2, ate: 7, trecho: "verme", antes: "O ", depois: " que" }, capitulo(A)),
    { de: 2, ate: 7, degrau: "exata" },
  );

  /* 2 · contexto — o paragrafo cresceu na frente, e a citacao aparece DUAS
     vezes. So o texto em volta separa a certa da errada: sem ele, o degrau 3
     casaria a primeira ocorrencia, que nao e a marcada. */
  caso(
    "ancora: degrau 2, o texto em volta desempata",
    reancorar(
      { de: 4, ate: 7, trecho: "nao", antes: "disse que ", depois: " de novo" },
      capitulo(`Uma frase nova antes. ${B}`),
    ),
    /* 60 e nao 62: o prefixo tem 22 caracteres e a segunda ocorrencia de "nao"
       comeca em 38 dentro de B. Conferido a mao — a primeira versao deste caso
       esperava 62 e o codigo estava certo. */
    { de: 60, ate: 63, degrau: "contexto" },
  );

  /* 3 · citacao — o paragrafo mudou e nao ha contexto guardado (nota antiga,
     de antes das colunas `antes`/`depois`). Ela resolve pela citacao dentro do
     mesmo paragrafo. */
  caso(
    "ancora: degrau 3, so a citacao, no mesmo paragrafo",
    reancorar({ de: 0, ate: 5, trecho: "verme", antes: "", depois: "" }, capitulo(`Vinte anos antes. ${A}`)),
    { de: 20, ate: 25, degrau: "citacao" },
  );

  /* 4 · capitulo — o trecho mudou de paragrafo. */
  caso(
    "ancora: degrau 4, o trecho mudou de paragrafo",
    reancorar({ de: 3, ate: 8, trecho: "verme", antes: "", depois: "" }, capitulo("Um paragrafo curto.", A)),
    { de: 21, ate: 26, degrau: "capitulo" },
  );

  /* perdida — o trecho nao existe mais neste texto, e a posicao devolvida e a
     GUARDADA: quem desenha nao deve usa-la, e quem depura merece ve-la. */
  caso(
    "ancora: perdida quando o trecho sumiu",
    reancorar({ de: 10, ate: 20, trecho: "uma frase que nao esta la", antes: "", depois: "" }, capitulo(A)),
    { de: 10, ate: 20, degrau: "perdida" },
  );

  /* A NOTA SEM TRECHO nao e uma nota perdida: e a nota do livro inteiro, que
     nao aponta para lugar nenhum de proposito. */
  caso(
    "ancora: nota sem trecho nao vira perdida",
    reancorar({ de: 0, ate: 0, trecho: "", antes: "", depois: "" }, capitulo(A)),
    { de: 0, ate: 0, degrau: "exata" },
  );

  /* A ocorrencia mais PERTO da dica, e nao a primeira do texto: o deslocamento
     guardado deixou de mandar, mas continua sabendo por onde a nota andava. */
  caso(
    "ancora: entre duas iguais, ganha a mais perto da dica",
    reancorar({ de: 40, ate: 43, trecho: "nao", antes: "", depois: "" }, capitulo(B)),
    /* As duas ocorrencias de "nao" estao em 14 e 38, e a dica e 40: ganha a de
       38, por dois caracteres de distancia contra vinte e seis. */
    { de: 38, ate: 41, degrau: "citacao" },
  );

  /* 5 · livro — sob demanda, e ele pula o capitulo da propria nota, que os
     degraus de cima ja tentaram. */
  const paginas = [capitulo("Nada aqui."), capitulo("Nem aqui."), capitulo(A)];
  caso(
    "ancora: degrau 5 acha no livro inteiro",
    await procurarNoLivro({ capitulo: 0, trecho: "verme" }, 3, async (i) => paginas[i]),
    { capitulo: 2, de: 2, ate: 7 },
  );
  caso(
    "ancora: degrau 5 devolve null quando nao ha",
    await procurarNoLivro({ capitulo: 0, trecho: "girafa" }, 3, async (i) => paginas[i]),
    null,
  );

  return { total: 31, falhas: falhas.length, detalhe: falhas };
})()
