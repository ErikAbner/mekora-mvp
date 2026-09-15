/* Como a pessoa quer ler: corpo, fonte, entrelinha, coluna, destaques.
 *
 * O nó `973:32215` traz um painel de Aparência na leitura, com seis grupos. Ele
 * é o que torna editável o que o desenho fixa — e foi a condição do Erik para
 * aceitar a medida de coluna: "desde que seja editável, tá tudo bem".
 *
 * MORA NO NAVEGADOR, e não na conta. Ler com letra maior é preferência do
 * APARELHO, não da pessoa: o mesmo leitor quer corpo grande no telefone e a
 * medida cheia no monitor, e amarrar isso à conta faria uma escolha atravessar o
 * outro aparelho sem ser pedida.
 *
 * Cada valor vira uma variável de CSS na raiz, e a folha de estilo da leitura
 * lê dela. Nenhum componente precisa saber que a preferência existe.
 */

const CHAVE = "mekora:aparencia";

/* Os degraus saem da escala do sistema — [14,16,18,20,22,24,28,32,…] —, e não
 * de multiplicadores: "1,2x de 20" dá 24, que existe; "1,15x" daria 23, que não.
 *
 * "MAIOR" USA O TAMANHO DO `h1` DA PROSA, que é 32px — o maior corpo que a
 * ferramenta já usa em texto corrido. A primeira versão parou em 24 e criava um
 * degrau intermediário só para esta tela; o Erik pediu o contrário: reusar o que
 * existe em vez de inventar mais um. */
export const GRUPOS = [
  {
    id: "corpo",
    rotulo: "Tamanho",
    padrao: "medio",
    opcoes: [
      { id: "menor", rotulo: "Menor", css: { "--leitura-corpo": "18px" } },
      { id: "medio", rotulo: "Padrão", css: { "--leitura-corpo": "20px" } },
      /* 32px é o `font-size` de `.prosa .titulo`. Amarrar os dois por variável
         seria mais bonito e pior: o título precisa continuar MAIOR que o corpo,
         e igualá-los apagaria a hierarquia da página inteira. O valor é o mesmo
         de propósito, e o comentário é o vínculo. */
      { id: "maior", rotulo: "Maior", css: { "--leitura-corpo": "32px" } },
    ],
  },
  {
    id: "fonte",
    rotulo: "Tipografia",
    padrao: "serifada",
    opcoes: [
      { id: "serifada", rotulo: "Fonte serifada", css: { "--leitura-fonte": "var(--font-sans)" } },
      /* A sem-serifa é a de sistema, e não uma segunda fonte embutida: baixar
         mais um arquivo para uma preferência de leitura é peso que nem todo
         mundo quis. */
      { id: "sem-serifa", rotulo: "Fonte sem-serifa", css: { "--leitura-fonte": "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" } },
    ],
  },
  {
    id: "entrelinha",
    rotulo: "Entrelinha",
    padrao: "media",
    opcoes: [
      { id: "justa", rotulo: "Justa", css: { "--leitura-razao": "1.4" } },
      { id: "media", rotulo: "Padrão", css: { "--leitura-razao": "1.5" } },
      { id: "solta", rotulo: "Solta", css: { "--leitura-razao": "1.75" } },
    ],
  },
  {
    id: "coluna",
    rotulo: "Coluna",
    padrao: "media",
    /* ESTA É A QUE O ERIK PEDIU PARA SER EDITÁVEL. A medida do desenho — 680 no
     * monitor, 358 no telefone — dá cerca de 34 caracteres por linha no
     * telefone, abaixo da faixa confortável de 45 a 75. "Larga" recupera isso
     * para quem quiser, sem tirar de quem prefere a medida do desenho. */
    opcoes: [
      { id: "estreita", rotulo: "Estreita", css: { "--leitura-coluna": "560px" } },
      { id: "media", rotulo: "Padrão", css: { "--leitura-coluna": "680px" } },
      { id: "larga", rotulo: "Larga", css: { "--leitura-coluna": "820px" } },
    ],
  },
  {
    id: "destaques",
    rotulo: "Seus destaques",
    padrao: "mostrar",
    opcoes: [
      { id: "mostrar", rotulo: "Mostrar", css: { "--leitura-destaque": "1" } },
      /* Ocultar não apaga: a nota continua lá, e volta a aparecer quando a
         pessoa quiser. Ler sem as próprias marcas é um modo de reler. */
      { id: "ocultar", rotulo: "Ocultar", css: { "--leitura-destaque": "0" } },
    ],
  },
];

export const PADROES = Object.fromEntries(GRUPOS.map((g) => [g.id, g.padrao]));

export function lerAparencia() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    /* Só valores que EXISTEM entram. Um id salvo por uma versão anterior, ou
     * escrito à mão, cairia como classe sem estilo e a tela ficaria sem corpo
     * nenhum. */
    const fora = { ...PADROES };
    for (const g of GRUPOS) {
      if (g.opcoes.some((o) => o.id === guardado[g.id])) fora[g.id] = guardado[g.id];
    }
    return fora;
  } catch {
    return { ...PADROES };
  }
}

export function gravarAparencia(escolhas) {
  try { localStorage.setItem(CHAVE, JSON.stringify(escolhas)); } catch { /* sem espaço */ }
}

/** Aplica as escolhas como variáveis de CSS na raiz. */
export function aplicarAparencia(escolhas) {
  const raiz = document.documentElement;
  raiz.dataset.leituraDestaques = escolhas.destaques ?? PADROES.destaques;
  for (const g of GRUPOS) {
    const o = g.opcoes.find((x) => x.id === escolhas[g.id]) ?? g.opcoes.find((x) => x.id === g.padrao);
    for (const [prop, valor] of Object.entries(o.css)) raiz.style.setProperty(prop, valor);
  }
}
