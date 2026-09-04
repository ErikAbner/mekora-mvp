/* O portão: mede a PÁGINA SERVIDA contra o sistema de tokens.
 *
 * Roda dentro do Chrome, por:
 *
 *     node scripts/medir.mjs http://localhost:5180 1440 900 scripts/portao.js
 *
 * Ele mora ao lado do instrumento que o executa, e isso deixou de ser detalhe: a
 * versão anterior vivia noutro repositório e era chamada por caminho absoluto,
 * o que quebra no dia em que alguém clonar só um dos dois — e quebra em
 * silêncio (DEC-0038 §6). Não é um teste de laboratório: ele lê o que o
 * navegador realmente compôs, que é a diferença que a Parte 1.1 do plano de
 * implementação nomeia como a primeira das cinco causas do sofrimento na
 * Vynce — "o portão media o laboratório, não a página".
 *
 * O que ele recusa, e por quê:
 *
 *   COR FORA DO SISTEMA   qualquer tinta ou superfície que não seja um dos
 *                         valores decididos. Hex solto é como a paleta volta a
 *                         crescer sem ninguém decidir.
 *   CONTRASTE ABAIXO      4,5 para texto normal, 3,0 a partir de 24px. Medido
 *                         no par que o navegador compôs, não no par que o
 *                         desenho prometeu.
 *   CORPO FORA DA ESCALA  tamanho que não é degrau. Um 19px entra sem doer e
 *                         só aparece quando alguém tenta gerar a escala.
 *   FONTE QUE NÃO DESCEU  a Zodiak declarada e não SERVIDA. O `@font-face`
 *                         tinha só `local()`: ela aparecia na máquina onde
 *                         estava instalada, e em nenhuma outra. Vinte e duas
 *                         telas conferidas contra o Figma, sessenta medidas
 *                         verdes, tudo com a tipografia certa para uma pessoa
 *                         só no mundo. Foi o verde por omissão mais caro daqui.
 *
 * O que ele NÃO julga: filete e traço decorativo. A WCAG cobra 3,0 de
 * componente de interface, não de separador, e cobrar de tudo produz uma lista
 * onde a maioria não é falha — lista assim ninguém lê duas vezes.
 */
(async () => {
  const TINTA = {
    '#151515': 'text/strong',
    '#535353': 'text/primary',
    '#6a6a6a': 'text/secondary',
    '#f3f3f3': 'text/on-inverse',
    '#2f7d55': 'estado/ok',
    '#976519': 'estado/atencao',
    '#b23b2a': 'estado/perigo',
    // A tinta das capas de reserva. Ver a nota na tabela de superficies: a capa
    // e conteudo, nao cromo, e o par papel/tinta dela foi conferido — #101010
    // sobre #f4f2ec da 17,3:1, e o inverso o mesmo.
    '#101010': 'capa-reserva/tinta',
    '#111111': 'capa-reserva/tinta (do no)',
    '#f4f2ec': 'capa-reserva/papel (sobre tinta)',
    // ESCURO. A primeira versão só conhecia o claro e reprovava a tela inteira
    // no escuro, acusando valores que ERAM do sistema — só não estavam na lista
    // dela. Mesma falha que o instrumento de token teve no mesmo dia: medida que
    // não conhece o alvo mede o alvo errado, e mede com confiança.
    '#eeeeee': 'text/strong (escuro)',
    '#b3b3b3': 'text/secondary (escuro)',
    '#8e8e8e': 'text/terciaria (escuro)',
    '#3a9b69': 'estado/ok (escuro)',
    '#bb7d1f': 'estado/atencao (escuro)',
    '#d86858': 'estado/perigo (escuro)',
    // SEPIA — a terceira paleta. Ela entra aqui pela mesma razao que a do escuro
    // entrou: um tema que o produto TEM e que o portao nao conhece faz a medida
    // acusar valores decididos, e "medida que nao conhece o alvo mede o alvo
    // errado, e mede com confianca" ja esta escrito duas linhas acima.
    //
    // Os pares foram conferidos antes de entrar: #3b3025 sobre #f4ecd8 da 9,4:1,
    // e #6b5b47 da 4,9:1 — acima dos 4,5 da WCAG para corpo.
    '#3b3025': 'text/strong (sepia)',
    '#6b5b47': 'text/secondary (sepia)',
    '#8a7658': 'border/controle (sepia)'
  };
  const SUP = {
    '#f9f9f9': 'surface/base',
    '#f3f3f3': 'surface/sunken',
    '#ebebeb': 'surface/deep',
    '#161616': 'surface/inverse',
    '#d7f285': 'nota/verde',
    '#f28587': 'nota/rosa',
    '#f2e685': 'nota/amarelo',
    '#85bcf2': 'nota/azul',
    '#efffbf': 'capa/verde',
    '#ffbfc0': 'capa/rosa',
    '#fff8bf': 'capa/amarelo',
    '#bfdfff': 'capa/azul',
    // AS CAPAS DE RESERVA SAO SUPERFICIE PROPRIA, decidido pelo Erik em 04/09.
    //
    // O conjunto `1016:31030` do Figma desenha capas para arquivos que nao
    // trazem capa. Elas vieram com papel, tinta e trama que nao eram token
    // nenhum, e o portao reprovou — com razao, porque hex solto e como a paleta
    // volta a crescer sem ninguem decidir.
    //
    // A decisao foi a segunda saida das duas que estavam na mesa: capa de livro
    // NAO E CROMO DE INTERFACE. Ela e conteudo com regra propria, como a nota
    // colorida logo acima, e por isso entra como familia e nao como excecao.
    //
    // O ERIK DISSE QUE OS VALORES AINDA NAO FORAM REFINADOS. Estao aqui porque
    // uma cor sem token e invisivel para toda medida; quando ele refinar, muda
    // aqui e em `capa-de-reserva.css`, que e o unico lugar que as usa.
    '#f4f2ec': 'capa-reserva/papel',
    '#101010': 'capa-reserva/tinta',
    '#111111': 'capa-reserva/tinta (do no)',
    '#d9d9d9': 'capa-reserva/trama',
    // escuro: o fundo reusa surface/inverse, e os degraus sobem a partir dele
    '#1c1c1c': 'surface/sunken (escuro)',
    '#232323': 'surface/deep (escuro)',
    '#666666': 'border/subtle (escuro)',
    // destaque no escuro: mesmo matiz, saturacao baixa, escuro o bastante para
    // receber a tinta clara. Ver base.css para a razao.
    '#61722f': 'nota/verde (escuro)',
    '#746c2f': 'nota/amarelo (escuro)',
    '#a34344': 'nota/rosa (escuro)',
    '#406f9e': 'nota/azul (escuro)',
    // sepia: o matiz entra no PAPEL, e nao nos elementos — botao, borda e texto
    // seguem sendo tinta sobre papel. O sepia troca o papel, nao a tinta.
    '#f4ecd8': 'surface/base (sepia)',
    '#ece2ca': 'surface/sunken (sepia)',
    '#e4d8bc': 'surface/deep (sepia)',
    '#f7f1e1': 'surface/popover (sepia)',
    '#c9b998': 'border/subtle (sepia)',
    '#4a3d2f': 'degrau/primaria (sepia)',
    // as notas descem em luminancia e sobem em saturacao, para nao sumirem no
    // papel bege — elas sao CONTEUDO, e precisam continuar distinguiveis
    '#d8e6a8': 'nota/verde (sepia)',
    '#efe0a0': 'nota/amarelo (sepia)',
    '#f0c4c0': 'nota/rosa (sepia)',
    '#b9d3ea': 'nota/azul (sepia)'
  };
  /* 56 ENTROU (A-12). O desenho mobile pede 56 para o título de abertura da
   * leitura, e a escala ia 48 → 64: o degrau que faltava é justamente o do meio,
   * e a cauda da escala anda de 8 em 8 (32, 40, 48, [56], 64). Acrescentá-lo
   * torna a sequência regular em vez de abrir uma exceção. */
  const CORPOS = [14, 16, 18, 20, 22, 24, 28, 32, 40, 48, 56, 64];

  const hex = (c) => {
    const m = c.match(
      /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/
    );
    if (!m) return null;
    if (m[4] !== undefined && +m[4] === 0) return 'transparente';
    return (
      '#' +
      [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('')
    );
  };
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255);
    const f = (v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const raz = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  // A superfície de um texto é a do primeiro ancestral com fundo opaco. Não
  // resolve sobreposição nem gradiente — e por isso o que ela devolve serve
  // para RECUSAR, nunca para autorizar em silêncio.
  const fundoDe = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const h = hex(getComputedStyle(n).backgroundColor);
      if (h && h !== 'transparente') return h;
      n = n.parentElement;
    }
    return hex(getComputedStyle(document.body).backgroundColor) || '#ffffff';
  };

  const corFora = [],
    contraste = [],
    corpoFora = [],
    escondidoDeQuemOuve = [];
  let medidos = 0;

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;

    /* ORNAMENTO NÃO É TEXTO, E A ESCALA GOVERNA TEXTO.
     *
     * O portão já não julga filete nem traço decorativo, com a razão escrita: a
     * WCAG cobra 3,0 de componente de interface, não de separador. `aria-hidden`
     * é a mesma distinção dita pelo próprio HTML — o elemento declara que não é
     * conteúdo, e um leitor de tela não o anuncia.
     *
     * O caso que trouxe isto: a marca do rodapé, em 230px. Ela é grafismo, e
     * limitá-la aos 64px da escala descaracterizaria o desenho para satisfazer
     * uma regra que existe para texto que se lê.
     *
     * ISTO NÃO É PORTA DOS FUNDOS. Pôr `aria-hidden` em texto de verdade é um
     * defeito MAIOR que corpo fora da escala — ele some para quem usa leitor de
     * tela —, e nenhum instrumento que mede a página consegue distinguir os dois
     * casos. Quem escrever o atributo está afirmando que aquilo é ornamento.
     */
    const texto = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ');
    if (!texto) continue;

    /* TEXTO ESCONDIDO DE QUEM OUVE É CONTADO, e não só pulado.
     *
     * Pular era certo e era metade. Em 03/09 a gaveta de Conta entrou sobre a
     * `vaul`, que usa o `Dialog` do Radix por baixo e NÃO repassa o
     * `modal={false}`: o Radix marcou a página inteira com `aria-hidden`, o
     * cabeçalho sumiu para leitor de tela, e o portão passou — medindo 14 nós
     * numa tela que tinha 49.
     *
     * Ele não errou nenhuma regra. Ele mediu um terço da tela e disse que estava
     * tudo bem, que é a forma mais cara de verde por omissão.
     *
     * Ornamento de verdade quase nunca tem TEXTO: ícone é máscara, ilustração é
     * imagem, marca é SVG. Texto atrás de `aria-hidden` é conteúdo que
     * desapareceu para quem ouve — ou uma biblioteca escondendo o que não
     * devia. */
    if (el.closest('[aria-hidden="true"]')) {
      escondidoDeQuemOuve.push(texto.slice(0, 40));
      continue;
    }

    medidos++;
    const tinta = hex(cs.color),
      fundo = fundoDe(el);
    const corpo = Math.round(parseFloat(cs.fontSize));
    const peso = parseInt(cs.fontWeight) || 400;
    const amostra = texto.slice(0, 32);

    if (tinta && tinta !== 'transparente' && !TINTA[tinta] && !SUP[tinta])
      corFora.push({ valor: tinta, papel: 'tinta', texto: amostra });
    if (fundo && !SUP[fundo] && !TINTA[fundo] && fundo !== '#ffffff')
      corFora.push({ valor: fundo, papel: 'superficie', texto: amostra });
    if (!CORPOS.includes(corpo))
      corpoFora.push({
        corpo,
        texto: amostra,
        degrau_mais_perto: CORPOS.reduce((a, b) =>
          Math.abs(b - corpo) < Math.abs(a - corpo) ? b : a
        )
      });

    if (tinta && tinta !== 'transparente' && fundo) {
      const r = raz(tinta, fundo);
      const grande = corpo >= 24 || (corpo >= 19 && peso >= 700);
      const minimo = grande ? 3.0 : 4.5;
      if (r < minimo)
        contraste.push({
          tinta,
          fundo,
          razao: +r.toFixed(2),
          pede: minimo,
          corpo,
          texto: amostra
        });
    }
  }

  // A cegueira fechada: buscar cada SVG referenciado e ler a tinta de dentro.
  // Icone deve herdar cor por `currentColor` sobre mascara — tinta cravada e
  // decisao tomada dentro de um arquivo, longe de qualquer regra.
  const fontes = new Set();
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    for (const v of [
      el.getAttribute?.('src'),
      cs.maskImage,
      cs.webkitMaskImage,
      cs.backgroundImage
    ]) {
      const m = String(v || '').match(
        /url\(["']?([^"')]+\.svg)["']?\)|^([^"')\s]+\.svg)$/
      );
      if (m) fontes.add(m[1] || m[2]);
    }
  }
  const tintaEmAsset = [];
  for (const f of fontes) {
    try {
      const txt = await (await fetch(f)).text();
      const cravadas = [
        ...new Set(
          [...txt.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,8})"/g)].map((m) =>
            m[1].toLowerCase()
          )
        )
      ];
      const forasteiras = cravadas.filter((h) => !TINTA[h] && !SUP[h]);
      // Icone e sistema; ilustracao e arte. Cobrar a paleta de uma ilustracao
      // faria o portao reprovar todo desenho que tem mais de duas cores, e ai
      // ele vira ruido — a mesma licao do filete, que a primeira versao do
      // instrumento de contraste aprendeu acusando 93 falhas em 196 pares.
      const nome = f.split('/').pop();
      const eIcone = /^icone[-.]/.test(nome);
      if (cravadas.length)
        tintaEmAsset.push({
          asset: nome,
          papel: eIcone ? 'icone' : 'arte',
          cravadas,
          fora_do_sistema: eIcone ? forasteiras : [],
          nota: eIcone
            ? 'icone deve herdar cor por currentColor sobre mascara'
            : 'arte nao e julgada pela paleta do sistema — so relatada'
        });
    } catch {
      /* asset que nao busca nao acusa */
    }
  }

  const unico = (a, chave) => {
    const visto = {};
    const fora = [];
    for (const x of a) {
      const k = chave(x);
      if (!visto[k]) {
        visto[k] = 1;
        fora.push(x);
      }
    }
    return fora;
  };

  /* ACENTO PERDIDO NO CAMINHO.
   *
   * Já aconteceu duas vezes neste repositório: uma frase escrita dentro de um
   * heredoc chega ao arquivo sem acento e vai para a tela do usuário assim. O
   * `CLAUDE.md` até nomeia a armadilha, e nomear não impediu.
   *
   * A lista é só de palavras INEQUÍVOCAS. `esta`, `e`, `ja` e `sao` ficam de
   * fora de propósito: "esta casa", "e também", "São Paulo" são texto correto, e
   * um detector que acusa texto certo é lido uma vez e ignorado depois.
   */
  const SEM_ACENTO = /\b(nao|voce|tambem|atencao|informacao|conversao|operacao|possivel|disponivel|ultimo|proximo|pagina|codigo|automatico|preparacao|instrucao|traducao|selecao|conexao|reuniao|versao|preferencia|preferencias|ligacao|ligacoes|sessao|sessoes|memoria|estao|sao|conteudo|titulo|numero|area|areas|capitulo|inicio|so|ja)\b/i;

  /* NOME DE CÓDIGO NA TELA.
   *
   * A tela de Privacidade listava `preferencias`, `no_canvas` e
   * `grupos_do_canvas` — as chaves do inventário do backend, mostradas cruas
   * para quem lê. O underline é a assinatura: nenhuma palavra escrita para uma
   * pessoa tem `_` no meio.
   *
   * O portão não via porque a checagem de acento é por palavra conhecida, e
   * `no_canvas` não está em dicionário nenhum. Esta vê a FORMA.
   *
   * AS BORDAS EXCLUEM ENDEREÇO. `erik_mekora@kindle.com` é um e-mail que a
   * pessoa cadastrou, e sublinhado dentro de e-mail, URL ou nome de arquivo é
   * legítimo — a primeira versão desta checagem reprovou a tela de Kindle por
   * causa dele. O que se procura é a palavra SOZINHA com underline no meio. */
  const NOME_DE_CODIGO = /(?<![\w@./-])[a-z]+_[a-z_]+(?![\w@./-])/;
  const codigoNaTela = [];

  /* O TEXTO DO LIVRO NÃO É INTERFACE, e o portão não o julga.
   *
   * Ele reprovou a tela de leitura por "capitulo nao terminar" — palavras do
   * ARQUIVO que a pessoa enviou, não do produto. Um livro em inglês reprovaria
   * inteiro, e um livro com erro de digitação do autor viraria defeito nosso.
   *
   * A regra é de escrita do produto, e vale onde o produto escreve. `.prosa` é
   * a coluna onde o conteúdo do usuário é renderizado; o resto da tela — botões,
   * avisos, navegação — continua sendo medido. */
  const CONTEUDO_DE_QUEM_USA = ".prosa, .estudo-notas, .nota-trecho, blockquote.destaque";

  const semAcento = [];
  for (const n of document.querySelectorAll("body *")) {
    if (n.children.length) continue;
    if (n.closest(CONTEUDO_DE_QUEM_USA)) continue;
    const t = (n.textContent || "").trim();
    if (!t) continue;
    const m = SEM_ACENTO.exec(t);
    if (m) semAcento.push({ palavra: m[0], trecho: t.slice(0, 70) });
    const c = NOME_DE_CODIGO.exec(t);
    if (c) codigoNaTela.push({ palavra: c[0], trecho: t.slice(0, 70) });
  }

  /* TINTA DE LINK DO NAVEGADOR — a que o portão não via.
   *
   * Um `<a>` sem `color` declarado herda a cor de link do NAVEGADOR: azul
   * (#0000EE) antes de visitar, ROXO (#551A8B) depois. Nenhuma das duas é do
   * sistema, e a regra aqui é que cor é objetivo.
   *
   * O portão media só nó de TEXTO, e por isso passou verde por meses sobre dois
   * ícones roxos no cabeçalho: `Icone` é uma MÁSCARA pintada por `currentColor`,
   * e uma máscara não tem texto para medir. O Erik viu numa captura de tela.
   *
   * Aqui a conferência é sobre o ELEMENTO, e não sobre o texto dele: todo `<a>`
   * visível cuja tinta computada é uma das duas do navegador. É barato e não
   * tem falso positivo — ninguém escolhe #551A8B de propósito.
   */
  const TINTA_DO_NAVEGADOR = { '#0000ee': 'link não visitado', '#551a8b': 'link visitado' };
  const linkSemTinta = [];
  for (const a of document.querySelectorAll('a')) {
    const cs = getComputedStyle(a);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const h = hex(cs.color);
    const qual = h && TINTA_DO_NAVEGADOR[h.toLowerCase()];
    if (!qual) continue;
    linkSemTinta.push({
      valor: h,
      qual,
      onde: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 60) || a.className,
      nota: 'link sem `color` declarado herda a tinta do navegador — e o ícone dentro dele a herda também',
    });
  }

  /* A FONTE TEM DE TER DESCIDO DO SERVIDOR.
   *
   * Não basta `document.fonts.check`: ele responde `true` quando a fonte está
   * INSTALADA na máquina, que é exatamente o engano que se quer pegar. A
   * pergunta certa é se o arquivo veio pela rede, e quem sabe disso é o
   * `PerformanceResourceTiming` — se o navegador buscou o `.woff2`, ele buscou
   * porque precisava.
   *
   * As duas conferências juntas: a face está declarada E o arquivo desceu. Uma
   * sem a outra é meia resposta.
   */
  const FAMILIA = 'Zodiak Variable';
  const baixouFonte = performance
    .getEntriesByType('resource')
    .some((e) => /\/fontes\/[^/]+\.woff2$/.test(e.name) && e.transferSize !== 0);
  const declarada = [...document.fonts].some((f) => f.family.includes(FAMILIA));
  const usaFamilia = getComputedStyle(document.body).fontFamily.includes(FAMILIA);
  const fonteNaoDesceu =
    usaFamilia && (!declarada || !baixouFonte)
      ? {
          familia: FAMILIA,
          face_declarada: declarada,
          arquivo_desceu: baixouFonte,
          nota: baixouFonte
            ? 'a família está no `font-family` mas não há `@font-face` para ela'
            : 'nenhum `.woff2` veio pela rede — quem não tiver a fonte instalada vê outra',
        }
      : null;

  return {
    url: location.pathname,
    nos_com_texto: medidos,
    fonte_nao_desceu: fonteNaoDesceu,
    link_com_tinta_do_navegador: unico(linkSemTinta, (x) => x.valor + x.onde),
    cor_fora_do_sistema: unico(corFora, (x) => x.valor + x.papel),
    contraste_abaixo: unico(contraste, (x) => x.tinta + x.fundo + x.corpo),
    corpo_fora_da_escala: unico(corpoFora, (x) => x.corpo),
    assets_conferidos: fontes.size,
    tinta_cravada_em_asset: tintaEmAsset,
    texto_sem_acento: unico(semAcento, (x) => x.palavra + x.trecho),
    nome_de_codigo_na_tela: unico(codigoNaTela, (x) => x.palavra),

    /* TELA EM BRANCO NÃO PASSA.
     *
     * `/estante/37` mediu ZERO nós e o portão respondeu `passou: true` — sem cor
     * fora do sistema, sem contraste abaixo, sem corpo fora da escala. Todas as
     * afirmações eram verdadeiras sobre o nada.
     *
     * A tela tinha quebrado com `ReferenceError` e o React não montou. É a forma
     * mais pura do verde por omissão, e a sexta vez que ele aparece hoje.
     *
     * Cinco é o piso: até o cabeçalho sozinho tem quatro links e um botão. Menos
     * que isso não é uma tela — é uma tela que não carregou.
     */
    tela_vazia: medidos < 5 ? { nos: medidos, nota: 'a tela não carregou' } : null,

    /* PROPORÇÃO, E NÃO CONTAGEM — e o primeiro número que escrevi estava errado.
     *
     * Pus teto de três, medi, e as telas honestas deram cinco a oito: o "×" do
     * botão de fechar que tem `aria-label`, os títulos desenhados DENTRO das
     * capas, os números "1" e "2" ao lado de cabeçalhos de verdade. Texto atrás
     * de `aria-hidden` é comum e é legítimo neste produto.
     *
     * O que NÃO é legítimo é a página inteira sumir. A separação entre os dois
     * casos é gritante: com a `vaul` escondendo tudo deram 14 medidos para 35
     * escondidos — 71%. A apresentação dá 8 escondidos para 141 medidos — 5%.
     *
     * Daí a regra: mais de um terço da tela escondida, e a partir de oito para
     * não disparar em tela pequena onde três ornamentos já seriam um terço. */
    texto_escondido_de_quem_ouve: (() => {
      const escondidos = escondidoDeQuemOuve.length;
      const total = medidos + escondidos;
      const parte = total ? escondidos / total : 0;
      if (escondidos < 8 || parte <= 0.35) return null;
      return {
        quantos: escondidos,
        de: total,
        porcento: Math.round(parte * 100),
        amostra: unico(escondidoDeQuemOuve.slice(0, 6), (x) => x),
        nota: 'a maior parte da tela está atrás de aria-hidden: some para leitor de tela, e o portão deixa de medi-la',
      };
    })(),

    passou:
      medidos >= 5 &&
      (escondidoDeQuemOuve.length < 8 ||
        escondidoDeQuemOuve.length / (medidos + escondidoDeQuemOuve.length) <= 0.35) &&
      fonteNaoDesceu === null &&
      linkSemTinta.length === 0 &&
      codigoNaTela.length === 0 &&
      corFora.length === 0 &&
      contraste.length === 0 &&
      corpoFora.length === 0 &&
      semAcento.length === 0 &&
      tintaEmAsset.every((a) => a.fora_do_sistema.length === 0),
    nota: 'Filete e traço decorativo não são julgados: a WCAG cobra 3,0 de componente de interface, não de separador.'
  };
})();
