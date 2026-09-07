/* A arte das capas de reserva — desenhada por livro, e sempre a mesma.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUE ISTO EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * As catorze composições do conjunto `1016:31030` foram construídas em 07/09, e
 * a construção expôs uma coisa que quatro não mostravam: NOVE delas têm uma
 * área de arte, e as nove estavam usando a mesma trama de meio-tom. Na grade da
 * Estante, o que as separava era só onde a mancha ficava.
 *
 * O quadro põe uma fotografia diferente em cada uma. Elas são conteúdo de
 * exemplo do designer — o Mekora não tem fotografia nenhuma, e um livro sem
 * capa é justamente aquele de que não se sabe nada.
 *
 * O Erik decidiu, em 07/09:
 *
 *   "Escolho arte gerada deterministicamente por livro, derivada de um token
 *   estável. Não manter as nove com a mesma trama. Não usar as nove fotografias
 *   do Figma — são conteúdo de mockup e não devem virar imagens permanentes que
 *   se repetem entre livros diferentes. Preservar os 14 layouts. Não usar IA,
 *   serviço externo ou geração runtime não determinística. Não armazenar uma
 *   imagem se ela puder ser reconstruída deterministicamente. Preservar a
 *   linguagem específica de cada uma das nove variantes."
 *
 * E o limite, dito com todas as letras: *"não quero simplesmente transformar as
 * nove em versões da grade geométrica da variante 5"*.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * A LINGUAGEM DE CADA UMA VEM DO QUADRO, E NÃO DE MIM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * As nove artes do desenho não são todas iguais. Lidas uma a uma, elas usam
 * TRÊS TÉCNICAS, e cada gerador daqui fica dentro da técnica da sua:
 *
 *   hachura diagonal   2, 3, 6, 7  — a foto tramada por linhas a 45°
 *   meio-tom de pontos 4           — grade de pontos de raio variável
 *   massa contínua     8, 9, 10, 11 — fotografia em preto e branco, sem trama
 *
 * Dentro da técnica, cada variante ganha o SEU gerador: a 3 repete o mesmo
 * campo em três janelas porque é o que o nó faz; a 11 desenha verticais porque
 * o nó põe um prédio; a 9 desenha um motivo só porque a área dela é um selo de
 * 55% da largura, com papel em volta. Nove geradores, nenhum é a grade da 5.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DETERMINISMO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A semente sai do TOKEN do trabalho — o mesmo que já escolhe a variante em
 * `capa-substituta.js`. Ele é aleatório de origem (`secrets.token_urlsafe(16)`)
 * e não muda nunca, então: mesmo livro, mesma arte, em qualquer aparelho, sem
 * guardar um byte. Livros diferentes, artes diferentes.
 *
 * Nada aqui chama `Math.random`, `Date`, rede ou modelo. O gerador é um
 * `mulberry32` — quatro linhas, período longo o bastante para algumas centenas
 * de formas, e igual em todo navegador porque só usa inteiros de 32 bits.
 *
 * E NADA É ARMAZENADO. A arte se reconstrói de uma string; guardar o SVG seria
 * guardar o que a função devolve.
 */

/* A paleta é a das capas, e são três valores — `capa-de-reserva.css` os declara
 * como variáveis para que a pessoa possa trocá-los um dia. Aqui eles entram
 * cravados porque o SVG vai por `data:` e não enxerga o CSS do documento; os
 * dois lugares citam o mesmo conjunto `1016:31030`. */
const TINTA = "#111111";
const CINZA = "#d9d9d9";

/* ── A SEMENTE ───────────────────────────────────────────────────────────────
 *
 * FNV-1a de 32 bits. Escolhido por ser curto e por espalhar bem chaves que
 * diferem num caractere só — que é o caso de dois tokens vizinhos. A soma
 * simples de códigos que `capaDoLivro` usa basta para catorze baldes; para
 * semear centenas de formas ela daria artes parecidas em chaves parecidas. */
export function sementeDe(chave) {
  let h = 0x811c9dc5;
  const s = String(chave ?? "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  /* O `>>> 0` importa: sem ele a semente vem negativa e o gerador devolve a
   * mesma sequência para pares de chaves diferentes. */
  return h >>> 0;
}

/* mulberry32 — o gerador. Determinístico, sem estado global, e sem depender de
 * `Math.random` em lugar nenhum. */
function dado(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (r, a, b) => a + r() * (b - a);
const inteiro = (r, a, b) => Math.floor(entre(r, a, b + 1));
/* UMA CASA DECIMAL, e não duas. O SVG vai por `data:` dentro de um atributo
 * `style`, e cada caractere é pago duas vezes: uma no HTML e outra na
 * codificação por porcento. Medido: a variante 4 saía com 50 kB. Um décimo de
 * pixel numa capa de 252 é invisível. */
const n = (v) => Math.round(v * 10) / 10;

/* ── O CAMPO DE DENSIDADE ────────────────────────────────────────────────────
 *
 * O que faz uma hachura parecer imagem, e não papel pautado, é a densidade
 * VARIAR — é isso que desenha a mancha. O campo é a soma de duas ou três
 * manchas suaves, colocadas pelo dado.
 *
 * Suave de propósito: ruído por célula daria granulado, e granulado lê como
 * defeito de impressão. Aqui o que se quer é o borrão de um meio-tom. */
function campoDe(r, quantas = 3) {
  const focos = [];
  for (let i = 0; i < quantas; i++) {
    focos.push({
      x: entre(r, 0.1, 0.9),
      y: entre(r, 0.1, 0.9),
      /* Focos MENORES e mais fortes que a primeira versão. Com raio até 0,55 e
         três deles somando, o campo saturava e a hachura saía uniforme — parecia
         tecido, e não mancha. Medido na folha de contato: a 2 e a 7 vinham sem
         forma nenhuma. */
      raio: entre(r, 0.16, 0.42),
      peso: entre(r, 0.7, 1.15),
    });
  }
  /* Devolve 0..1 para um ponto em coordenadas relativas. */
  return (x, y) => {
    let soma = 0;
    for (const f of focos) {
      const d = Math.hypot(x - f.x, y - f.y) / f.raio;
      if (d < 1) soma += f.peso * (1 - d) * (1 - d);
    }
    return Math.min(1, soma);
  };
}

/* ═══ FAMÍLIA A · HACHURA DIAGONAL — variantes 2, 3, 6 e 7 ═══════════════════
 *
 * A técnica do quadro nas quatro: a imagem existe como linhas paralelas a 45°,
 * e o que desenha a forma é a ESPESSURA de cada linha. Aqui é a mesma coisa,
 * com a espessura saindo do campo.
 *
 * O corte é por linha inteira e não por segmento: segmentar daria a fidelidade
 * de uma foto tramada e um SVG de milhares de nós. Uma linha por passo, com
 * espessura própria, dá a mancha em cerca de oitenta elementos.
 */
function hachura(r, L, A, { angulo = 45, passo = 6, cruzada = false, forca = 1 } = {}) {
  const campo = campoDe(r, 3);
  /* NA CRUZADA, A SEGUNDA PASSADA TEM CAMPO PRÓPRIO.
   *
   * Com o mesmo campo nas duas direções, a segunda preenche exatamente os
   * vazios da primeira e o resultado é uniforme — a 7 saía como tecido, sem
   * forma nenhuma. Com dois campos há região de uma direção só, de outra só, e
   * de ambas, que é o que dá a massa escura do nó. */
  const campo2 = cruzada ? campoDe(r, 3) : null;
  const partes = [];
  const rad = (angulo * Math.PI) / 180;
  /* O comprimento da diagonal cobre o retângulo em qualquer ângulo. */
  const diag = Math.hypot(L, A);
  const quantas = Math.ceil(diag / passo);
  const meio = { x: L / 2, y: A / 2 };

  const traca = (giro, qual) => {
    const cos = Math.cos(giro), sen = Math.sin(giro);
    const f = qual === 2 && campo2 ? campo2 : campo;
    for (let i = -quantas; i <= quantas; i++) {
      const off = i * passo;
      /* O ponto médio da linha, para amostrar o campo. */
      const mx = meio.x + off * -sen;
      const my = meio.y + off * cos;
      if (mx < -L || mx > 2 * L || my < -A || my > 2 * A) continue;
      const d = f(mx / L, my / A);
      /* O PISO DE 0,4 É A TRAMA DE FUNDO, e ele some na cruzada.
       *
       * Nas três de uma direção só, a linha fina em toda parte é o que o quadro
       * mostra: a foto tramada tem trama no claro também. Na cruzada, duas
       * passadas com piso desenham uma GRADE — a 7 saía como papel milimetrado.
       * Sem piso, a densidade baixa fica vazia e a massa ganha borda. */
      const piso = cruzada ? 0 : 0.4;
      /* O EXPOENTE ABRE OU FECHA A MANCHA. Ao quadrado, a densidade cai rápido
         e sobra borda dura — bom quando há piso, porque a trama de fundo segura
         o resto. Sem piso, o mesmo expoente deixou a 7 quase vazia: um feixe
         fino num campo de nada. 1,3 espalha o bastante para a massa existir e
         ainda deixa o claro claro. */
      const esp = piso + Math.pow(d, cruzada ? 1.3 : 2) * (passo * 0.85) * forca;
      if (esp < 0.35) continue;
      const x1 = mx - cos * diag, y1 = my - sen * diag;
      const x2 = mx + cos * diag, y2 = my + sen * diag;
      partes.push(
        `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke-width="${n(esp)}"/>`
      );
      if (partes.length > 400) break;
    }
  };

  traca(rad, 1);
  if (cruzada) traca(rad + Math.PI / 2, 2);
  /* O `stroke` FICA AQUI, e não no `<g>` do documento. Posto lá em cima ele
     contornava também as massas da 8 à 11 — polígonos e retângulos ganhavam um
     fio que não é deles, e a silhueta aparecia com contorno. */
  return `<g stroke="${TINTA}" fill="none">${partes.join("")}</g>`;
}

/* ═══ FAMÍLIA B · MEIO-TOM DE PONTOS — variante 4 ════════════════════════════
 *
 * O nó da 4 é uma grade de pontos de raio variável — meio-tom clássico, não
 * hachura. A grade é regular; o que varia é o raio, pelo campo.
 *
 * A 1 também usa pontos, e não colide: lá o raio cresce de cima para baixo,
 * numa rampa, e é um SVG fixo lido do quadro. Aqui a mancha é do livro.
 */
function meioTom(r, L, A, { passo = 9 } = {}) {
  /* QUATRO FOCOS, e não três. A coluna da 4 é alta e estreita — 210×594 —, e
     três manchas deixavam dois terços dela em papel. */
  const campo = campoDe(r, 4);
  const partes = [];
  for (let y = passo / 2; y < A; y += passo) {
    for (let x = passo / 2; x < L; x += passo) {
      const d = campo(x / L, y / A);
      const raio = 0.3 + Math.pow(d, 1.4) * (passo * 0.6);
      if (raio < 0.5) continue;
      partes.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(raio)}"/>`);
      if (partes.length > 1400) break;
    }
  }
  return partes.join("");
}

/* ═══ FAMÍLIA C · MASSA CONTÍNUA — variantes 8, 9, 10 e 11 ═══════════════════
 *
 * As quatro em que o quadro mostra fotografia em preto e branco, sem trama.
 * Fotografia não se gera; o que dá para gerar no mesmo peso visual é MASSA —
 * formas grandes, contraste alto, pouca coisa.
 *
 * Cada uma tem o seu arranjo, e é aqui que a decisão do Erik de "preservar a
 * linguagem específica" é cobrada: quatro massas iguais seriam a mesma capa
 * quatro vezes, que é o defeito que este arquivo existe para desfazer.
 */

/* 8 · silhueta larga. A área é grande e retangular, sob um título alto. Uma
 * paisagem abstrata: dois ou três planos que se cortam, no espírito de uma
 * fotografia de estúdio recortada. */
function silhueta(r, L, A) {
  const partes = [`<rect width="${n(L)}" height="${n(A)}" fill="${CINZA}"/>`];
  const planos = inteiro(r, 2, 3);
  for (let i = 0; i < planos; i++) {
    const base = A * entre(r, 0.45, 0.95);
    const pontos = [];
    const passos = inteiro(r, 3, 5);
    for (let k = 0; k <= passos; k++) {
      const x = (L * k) / passos;
      const y = base - A * entre(r, 0, 0.34);
      pontos.push(`${n(x)},${n(y)}`);
    }
    pontos.push(`${n(L)},${n(A)}`, `0,${n(A)}`);
    const tom = i === planos - 1 ? TINTA : CINZA;
    const opac = i === planos - 1 ? 1 : entre(r, 0.55, 0.85);
    partes.push(`<polygon points="${pontos.join(" ")}" fill="${tom}" opacity="${n(opac)}"/>`);
  }
  return partes.join("");
}

/* 9 · o selo. A área mede 55% da largura da capa e flutua no meio de muito
 * papel — é a mais silenciosa das catorze. Uma forma só, grande, centrada, com
 * um corte. Mais que isso vira ruído num espaço que existe para respirar. */
function selo(r, L, A) {
  const partes = [`<rect width="${n(L)}" height="${n(A)}" fill="${CINZA}"/>`];
  const cx = L / 2, cy = A / 2;
  const raio = Math.min(L, A) * entre(r, 0.3, 0.42);
  const forma = inteiro(r, 0, 2);
  if (forma === 0) {
    partes.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(raio)}" fill="${TINTA}"/>`);
  } else if (forma === 1) {
    const l = raio * 1.7;
    partes.push(`<rect x="${n(cx - l / 2)}" y="${n(cy - l / 2)}" width="${n(l)}" height="${n(l)}" fill="${TINTA}"/>`);
  } else {
    const l = raio * 1.5;
    partes.push(
      `<polygon points="${n(cx)},${n(cy - l)} ${n(cx + l)},${n(cy)} ${n(cx)},${n(cy + l)} ${n(cx - l)},${n(cy)}" fill="${TINTA}"/>`
    );
  }
  /* O corte: uma faixa de papel atravessando a forma. Ele é DESCENTRADO de
     propósito — a primeira versão sorteava a altura em torno do meio e, quando
     caía no centro do losango, partia a forma em duas setas simétricas, que
     lêem como sinal e não como arte. Agora ele fica no terço de cima ou no de
     baixo, e nunca na faixa do meio. */
  const paraCima = r() > 0.5;
  const y = cy + A * (paraCima ? entre(r, -0.32, -0.14) : entre(r, 0.14, 0.32));
  const esp = A * entre(r, 0.04, 0.09);
  partes.push(`<rect x="0" y="${n(y - esp / 2)}" width="${n(L)}" height="${n(esp)}" fill="${CINZA}"/>`);
  return partes.join("");
}

/* 10 · as faixas. A arte sangra no topo, de borda a borda, e é a única da
 * família assim — 65,7% da altura sem recheio nenhum. Faixas horizontais de
 * altura variável, do papel ao preto: um horizonte. */
function faixas(r, L, A) {
  const partes = [`<rect width="${n(L)}" height="${n(A)}" fill="${CINZA}"/>`];
  let y = 0;
  let escuro = r() > 0.5;
  while (y < A) {
    const h = A * entre(r, 0.04, 0.19);
    if (escuro) {
      partes.push(`<rect x="0" y="${n(y)}" width="${n(L)}" height="${n(Math.min(h, A - y))}" fill="${TINTA}"/>`);
    }
    y += h;
    /* A alternância não é estrita: duas claras seguidas abrem o campo e é o que
       dá o horizonte em vez de um código de barras. */
    escuro = r() > 0.42;
  }
  return partes.join("");
}

/* 11 · as verticais. O quadro põe um prédio visto de baixo, e a leitura dele é
 * uma pauta de verticais. Colunas de larguras diferentes encostadas na base,
 * com alturas que sobem e descem. */
function verticais(r, L, A) {
  const partes = [`<rect width="${n(L)}" height="${n(A)}" fill="${CINZA}"/>`];
  let x = 0;
  while (x < L) {
    const w = L * entre(r, 0.03, 0.11);
    const h = A * entre(r, 0.25, 1);
    if (r() > 0.28) {
      partes.push(`<rect x="${n(x)}" y="${n(A - h)}" width="${n(Math.min(w, L - x))}" height="${n(h)}" fill="${TINTA}"/>`);
    }
    x += w;
  }
  return partes.join("");
}

/* ═══ OS NOVE GERADORES ══════════════════════════════════════════════════════
 *
 * A chave é o número da variante. As cinco que faltam — 1, 5, 12, 13 e 14 — não
 * entram: a 1 e a 5 têm arte própria em SVG lido do nó, e a 12, a 13 e a 14 são
 * massa sólida desenhada em CSS. Elas já eram distintas entre si.
 *
 * A proporção de cada área saiu de `capa-de-reserva.css`, que a mediu no nó. Um
 * quadro alto e um quadro largo com o mesmo gerador dão desenhos diferentes, e
 * é assim que deve ser: a arte se acomoda à composição.
 */
const GERADORES = {
  /* 2 · hachura larga, metade de baixo da capa. Passo médio, 45°. */
  2: (r, L, A) => hachura(r, L, A, { angulo: 45, passo: entre(r, 5, 8) }),

  /* 3 · a MESMA hachura repetida em três janelas — é o que o nó faz, e a
     repetição É a linguagem desta capa. O corte em três é do CSS; aqui o campo
     é um só, e cada ladrilho mostra um pedaço dele. */
  3: (r, L, A) => hachura(r, L, A, { angulo: 45, passo: entre(r, 4, 6), forca: 1.1 }),

  /* 4 · meio-tom de pontos, coluna alta e estreita. */
  4: (r, L, A) => meioTom(r, L, A, { passo: entre(r, 4.5, 6.5) }),

  /* 6 · hachura no ângulo OPOSTO e com passo mais largo, para não ler como a 2
     numa grade em que as duas podem estar lado a lado. */
  6: (r, L, A) => hachura(r, L, A, { angulo: -45, passo: entre(r, 7, 11) }),

  /* 7 · hachura CRUZADA: a arte da 7 ocupa quase a capa inteira e é a mais
     escura das quatro no quadro. Dois ângulos sobrepostos dão essa massa. */
  7: (r, L, A) => hachura(r, L, A, { angulo: 45, passo: entre(r, 5, 7), cruzada: true, forca: 1.6 }),

  8: (r, L, A) => silhueta(r, L, A),
  9: (r, L, A) => selo(r, L, A),
  10: (r, L, A) => faixas(r, L, A),
  11: (r, L, A) => verticais(r, L, A),
};

/* As proporções de cada área, medidas em `capa-de-reserva.css` contra o nó. O
 * SVG é desenhado nelas e depois esticado pelo `background-size`; usar a
 * proporção certa é o que impede a hachura de sair oval. */
/* A 4 É DESENHADA EM METADE DA ESCALA, e o resto na do nó.
 *
 * O SVG é vetorial e sai esticado pelo `background-size: cover`, então a
 * resolução do `viewBox` não muda o desenho — muda o comprimento de cada
 * coordenada escrita. Com o passo RELATIVO igual, a 4 tem o mesmo número de
 * pontos nas duas escalas; o que encolhe é o texto de cada um, e o data URI
 * caiu de 38 para 32 kB.
 *
 * E 32 kB É O TETO DA FAMÍLIA, com o meio-tom: as de hachura ficam em 13 a 20,
 * e as de massa abaixo de 2. É mais do que eu queria e menos do que um PNG da
 * mesma capa — e não custa requisição nenhuma, porque a arte viaja no atributo
 * `style` da própria capa. Reduzir mais exigiria menos pontos, e menos pontos
 * é outro desenho: o nó da 4 é um meio-tom fino. */
const FORMATO = {
  2: [356, 425], 3: [178, 594], 4: [105, 297], 6: [356, 348], 7: [300, 520],
  8: [356, 402], 9: [232, 258], 10: [420, 390], 11: [356, 252],
};

/**
 * A arte de uma capa de reserva, como `url(data:image/svg+xml,…)` — ou `null`
 * para as cinco variantes que não têm área gerada.
 *
 * @param {number} variante  1 a 14
 * @param {string} chave     o token do trabalho; o mesmo que escolhe a variante
 */
export function arteDaCapa(variante, chave) {
  const gera = GERADORES[variante];
  if (!gera) return null;
  const [L, A] = FORMATO[variante];
  const r = dado(sementeDe(`${chave}·${variante}`));
  const corpo = gera(r, L, A);
  /* A TINTA VAI NO `<g>` PAI, e não em cada elemento. Mil e quatrocentos
     `fill="#111111"` são 25 kB de repetição — o mesmo desenho, com herança,
     cabe em menos de metade. Só o `fill`: o traço é da hachura, e ela declara
     o dela num `<g>` próprio. */
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${A}" ` +
    `width="${L}" height="${A}" preserveAspectRatio="xMidYMid slice">` +
    `<g fill="${TINTA}">${corpo}</g></svg>`;
  /* `encodeURIComponent` e não base64: o SVG é texto, e a codificação por
     porcento deixa o data URI legível no inspetor — o que importa quando a
     pergunta for "por que esta capa está assim". */
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** As variantes que recebem arte gerada. Fica exportado para a prova cobrar. */
export const VARIANTES_GERADAS = Object.keys(GERADORES).map(Number);
