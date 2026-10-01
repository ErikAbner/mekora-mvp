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

/* Corpo, entrelinha e coluna são FAIXAS, não três palpites separados.
 *
 * A largura confortável depende do corpo. Uma coluna de 880px com corpo 18
 * passa de noventa caracteres por linha; uma de 560px com corpo 28 cai abaixo
 * de quarenta. As duas cabem na tela e as duas cansam. `limitesDaColuna` mantém
 * a escolha perto de 45–75 caracteres por linha usando o avanço medido da
 * Zodiak (aprox. 0,52em), sem fingir que existe uma medida universal. */
export const AJUSTES = [
  { id: "corpo", rotulo: "Tamanho do texto", minimo: 18, maximo: 28, passo: 2, padrao: 20, unidade: "px" },
  { id: "entrelinha", rotulo: "Espaço entre linhas", minimo: 1.45, maximo: 1.75, passo: 0.05, padrao: 1.5, unidade: "×" },
];

export function limitesDaColuna(corpo = 20) {
  const tamanho = Math.min(28, Math.max(18, Number(corpo) || 20));
  return {
    minimo: Math.max(560, Math.round((tamanho * 24) / 20) * 20),
    maximo: Math.min(880, Math.round((tamanho * 39) / 20) * 20),
  };
}

export function limitarAparencia(escolhas = {}) {
  const corpo = Math.min(28, Math.max(18, Number(escolhas.corpo) || 20));
  const entrelinha = Math.min(1.75, Math.max(1.45, Number(escolhas.entrelinha) || 1.5));
  const limites = limitesDaColuna(corpo);
  const coluna = Math.min(limites.maximo, Math.max(limites.minimo, Number(escolhas.coluna) || 680));
  return { ...escolhas, corpo, entrelinha, coluna };
}

/* Tipografia e destaques continuam escolhas categóricas: não há um meio-termo
 * útil entre serifada e sem serifa, nem entre mostrar e ocultar uma marca. */
export const GRUPOS = [
  {
    id: "fonte",
    rotulo: "Tipografia",
    padrao: "serifada",
    opcoes: [
      { id: "serifada", rotulo: "Fonte serifada", css: { "--leitura-fonte": "var(--font-sans)", "--leitura-ajuste": "1px", "--leitura-peso": "450" } },
      /* A sem-serifa é a de sistema, e não uma segunda fonte embutida: baixar
         mais um arquivo para uma preferência de leitura é peso que nem todo
         mundo quis. */
      { id: "sem-serifa", rotulo: "Fonte sem-serifa", css: { "--leitura-fonte": "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", "--leitura-ajuste": "0px", "--leitura-peso": "400" } },
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

export const PADROES = {
  ...Object.fromEntries(GRUPOS.map((g) => [g.id, g.padrao])),
  corpo: 20,
  entrelinha: 1.5,
  coluna: 680,
};

const ANTIGOS = {
  corpo: { menor: 18, medio: 20, maior: 28 },
  entrelinha: { justa: 1.45, media: 1.5, solta: 1.75 },
  coluna: { estreita: 560, media: 680, larga: 820 },
};

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
    for (const ajuste of AJUSTES) {
      const bruto = ANTIGOS[ajuste.id]?.[guardado[ajuste.id]] ?? guardado[ajuste.id];
      if (Number.isFinite(Number(bruto))) fora[ajuste.id] = Number(bruto);
    }
    const colunaAntiga = ANTIGOS.coluna[guardado.coluna] ?? guardado.coluna;
    if (Number.isFinite(Number(colunaAntiga))) fora.coluna = Number(colunaAntiga);
    return limitarAparencia(fora);
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
  const seguras = limitarAparencia({ ...PADROES, ...escolhas });
  raiz.dataset.leituraDestaques = seguras.destaques ?? PADROES.destaques;
  raiz.style.setProperty("--leitura-corpo", `${seguras.corpo}px`);
  raiz.style.setProperty("--leitura-razao", `${seguras.entrelinha}`);
  raiz.style.setProperty("--leitura-coluna", `${seguras.coluna}px`);
  for (const g of GRUPOS) {
    const o = g.opcoes.find((x) => x.id === seguras[g.id]) ?? g.opcoes.find((x) => x.id === g.padrao);
    for (const [prop, valor] of Object.entries(o.css)) raiz.style.setProperty(prop, valor);
  }
}
