/* O que é medido, quando, e o que NUNCA sai daqui.
 *
 * TRÊS FERRAMENTAS, TRÊS PERGUNTAS DIFERENTES
 * ===========================================
 *   PostHog   o que a pessoa fez — clique, funil, onde desistiu, rage click,
 *             e a gravação da sessão
 *   Clarity   o mesmo de graça e sem teto, como rede de segurança para quando a
 *             faixa gratuita do PostHog acabar
 *   Cloudflare  quantas visitas houve DE VERDADE
 *
 * A terceira existe por causa de uma coisa que as outras duas não resolvem:
 * bloqueador de anúncio derruba PostHog e Clarity, e em público técnico isso
 * passa de 30%. O Cloudflare mede na borda, não é bloqueável, e é o denominador
 * honesto contra o qual os outros dois se comparam.
 *
 * POR QUE O CLOUDFLARE NÃO ESPERA O CONSENTIMENTO, E OS OUTROS DOIS ESPERAM
 * ========================================================================
 * Ele não põe cookie, não guarda identificador e não monta perfil: conta pedido
 * na borda. E a Cloudflare JÁ VÊ todos os pedidos — ela é a borda do Mekora.
 * Ligá-lo não acrescenta destinatário nenhum, e a base legal é interesse
 * legítimo, declarada na tela de privacidade.
 *
 * PostHog e Clarity são o contrário disso: identificador próprio, propósito
 * próprio, e gravação de tela. Base legal é CONSENTIMENTO, e sem o "sim" nem o
 * script desce. Não é o script escondido esperando: ele não é buscado.
 *
 * O QUE É MASCARADO, E ISSO NÃO É CONFIGURÁVEL
 * ============================================
 * A tela de Leitura mostra o DOCUMENTO PESSOAL de alguém. Gravar aquilo é
 * gravar o livro da pessoa. As duas gravadoras recebem a mesma lista de
 * seletores para tapar, e ela vive numa constante só — não em duas telas de
 * configuração de dois fornecedores, onde uma delas fica para trás.
 */

/* OS IDENTIFICADORES FICAM NO CÓDIGO, e isso é deliberado.
 *
 * Os três são PÚBLICOS: eles vão para o navegador de todo visitante de qualquer
 * jeito, e não abrem nada — a chave que lê e escreve no PostHog é a `phs_`, que
 * é outra e não mora aqui nem em lugar nenhum deste repositório.
 *
 * A alternativa era variável de ambiente, e ela falha de um jeito específico: o
 * `web/Dockerfile` copia só `web/` e `contrato/`, e o `.dockerignore` exclui
 * `.env`. Uma variável esquecida na subida não dá erro — dá um produto que
 * simplesmente não mede, e ninguém descobre até querer olhar um número que não
 * existe. Identificador público no código não tem como ser esquecido.
 *
 * O QUE IMPEDE DESENVOLVIMENTO DE POLUIR A MEDIÇÃO não é a falta da chave: é o
 * `medindo()` abaixo. */
const POSTHOG = "phc_Aft9fpfGspCYwmK5boqGPEDrN3EsQuAHAbYtTTYbTXRy";
const POSTHOG_CASA = "https://eu.i.posthog.com";
const CLARITY = "yc4131luem";

/* SÓ MEDE O QUE ESTÁ NO AR DE VERDADE.
 *
 * `import.meta.env.PROD` sozinho não basta: `npm run build` seguido de `vite
 * preview` é produção, e é a máquina de quem desenvolve. O endereço é o que
 * separa — a medição só vale no domínio onde as pessoas estão. */
export function medindo() {
  if (!import.meta.env.PROD) return false;
  const h = location.hostname;
  return h !== "localhost" && h !== "127.0.0.1" && !h.endsWith(".local");
}

/* O QUE NUNCA É GRAVADO. Um seletor a mais aqui custa nada; um a menos custa o
 * livro de alguém numa gravação.
 *
 * AS DUAS GRAVADORAS TAPAM DE JEITOS DIFERENTES, e descobrir isso custou um
 * defeito que quase passou:
 *
 *   PostHog  aceita uma LISTA DE SELETORES na configuração — é a constante
 *            abaixo, entregue no `init`.
 *   Clarity  NÃO TEM comando de máscara. O `clarity("mask", …)` que eu tinha
 *            escrito não existe na API dela: a chamada entra na fila, o script
 *            de verdade a ignora, e nada acusa. A gravação sairia com o livro
 *            de alguém dentro, embaixo de uma tela de privacidade dizendo que
 *            não sai. Ela tapa por ATRIBUTO no elemento: `data-clarity-mask`.
 *
 * Então cada elemento desta lista leva o atributo no próprio JSX, e
 * `web/src/medir.teste.mjs` recusa uma classe daqui que não o tenha. As duas
 * formas, uma lista só. */
export const TAPAR = [
  ".prosa",           // o texto do livro, na Leitura
  ".nota-trecho",     // o trecho que a pessoa marcou
  ".estudo-notas",    // as notas reunidas num estudo
  ".recado-corpo",    // o que a pessoa escreveu na caixa de recado
  "[data-pessoal]",   // a saída para o que vier depois
];

const CHAVE = "mekora-medicao";

/** O que a pessoa respondeu: `"sim"`, `"nao"`, ou `null` se ainda não respondeu. */
export function respostaSobreMedicao() {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "sim" || v === "nao" ? v : null;
  } catch {
    /* Modo privado. Sem lugar para guardar a resposta, e perguntar de novo a
     * cada abertura é pior que não medir: fica sem medição. */
    return "nao";
  }
}

export function responderSobreMedicao(resposta) {
  try {
    localStorage.setItem(CHAVE, resposta);
  } catch {
    /* Vale para esta aba, e só. */
  }
  if (resposta === "sim") ligarMedicao();
}

let ligado = false;

/** Busca e liga as duas gravadoras. Só é chamada depois de um "sim". */
export function ligarMedicao() {
  if (ligado || !medindo() || respostaSobreMedicao() !== "sim") return;
  ligado = true;

  /* DEPOIS DA PRIMEIRA PINTURA, e não durante. São cerca de 90 KB entre as
   * duas, e nenhum deles ajuda a desenhar a tela. `requestIdleCallback` espera o
   * navegador ficar à toa; o `setTimeout` é para o Safari, que não o tem. */
  const daqui_a_pouco = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  daqui_a_pouco(() => {
    if (POSTHOG) subirPostHog();
    if (CLARITY) subirClarity();
  });
}

function subirPostHog() {
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG, {
        api_host: POSTHOG_CASA,
        /* `capture_pageview` manual: o roteador é do navegador, e o automático
         * do PostHog só vê a primeira tela. */
        capture_pageview: false,
        capture_dead_clicks: true,
        autocapture: true,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: TAPAR.join(", "),
        },
        /* O IP não é guardado: ele identifica, e nada do que se quer saber
         * depende dele. A região vem do Cloudflare, que já a tem. */
        ip: false,
        persistence: "localStorage",
      });
      window.__posthog = posthog;
      posthog.capture("$pageview");
    })
    .catch(() => {
      /* Bloqueador de anúncio. É esperado e é por isso que o Cloudflare existe
       * ao lado — falhar aqui não pode aparecer como erro para ninguém. */
    });
}

function subirClarity() {
  /* O trecho é o da própria Clarity, e ele é escrito assim porque é assim que
   * ela documenta. O que muda é a máscara: os seletores de `TAPAR` são
   * declarados ANTES de a fila ser consumida, para nenhum quadro escapar. */
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY);
  /* Nenhuma chamada de máscara aqui, e é de propósito: a Clarity tapa por
   * `data-clarity-mask` no elemento, e o atributo está no JSX de cada um deles.
   * Ver o comentário do `TAPAR`. */
}

/** Um acontecimento nomeado. Não faz nada sem "sim" — quem chama não precisa
 *  saber disso, e é essa a graça: nenhuma tela tem `if` de consentimento. */
export function medir(nome, dados) {
  window.__posthog?.capture(nome, dados);
  window.clarity?.("event", nome);
}

/** A troca de tela, chamada pelo roteador. */
export function medirTela(caminho) {
  window.__posthog?.capture("$pageview", { $current_url: caminho });
}
