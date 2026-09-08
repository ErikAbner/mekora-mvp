/* Nada do que a `DEC-0040` classifica pode sair pelas gravadoras — e são TRÊS
 * caminhos para fora, não dois.
 *
 *   PostHog · session_recording   recebe a lista de seletores na configuração
 *   PostHog · autocapture         OUTRO sistema, OUTRA configuração
 *   Clarity                       não tem comando; lê `data-clarity-mask`
 *
 * Cada um deles já deixou passar alguma coisa, e nenhum acusou:
 *
 * 1. Eu tinha escrito um `clarity("mask", …)` que não existe na API dela. A
 *    chamada entra na fila, o script de verdade a ignora, e NADA acusa. A
 *    gravação sairia com o livro de alguém dentro, embaixo de uma tela de
 *    privacidade prometendo que não sai.
 *
 * 2. O autocapture do `posthog-js` nasce com `maskAllText:!1` — medido no
 *    pacote instalado, não de memória —, e `autocapture: true` aceita esse
 *    padrão. O `maskTextSelector` do `session_recording` NÃO o alcança. Clicar
 *    num livro da estante enviava o texto do cartão: título e autor.
 *
 * 3. Este arquivo mesmo, quando o `TAPAR` virou `[...A, ...B]`: o padrão antigo
 *    lia o corpo da constante, achava dois spreads e nenhum seletor literal, e
 *    imprimiu "0 classes tapadas" com saída zero. Verde por omissão no
 *    instrumento que existe para impedir vazamento.
 *
 * Por isso ele se prova:
 *
 *     node web/src/medir.teste.mjs               # confere o repositório
 *     node web/src/medir.teste.mjs --autoteste   # confere a si mesmo
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ─────────────────────────────────────────────────────────────────────────────
 * A CONFERÊNCIA, sobre texto e não sobre disco — é o que deixa o autoteste
 * envenenar sem tocar em arquivo nenhum.
 * ────────────────────────────────────────────────────────────────────────── */
function listasDe(medir, falhas) {
  const uma = (nome) => {
    const m = medir.match(new RegExp(`export const ${nome} = \\[([\\s\\S]*?)\\];`));
    if (!m) {
      falhas.push(`não achei a lista ${nome} no medir.js`);
      return [];
    }
    return [...m[1].matchAll(/"\.([\w-]+)"/g)].map((x) => x[1]);
  };
  return [...uma("TAPAR_CONTEUDO"), ...uma("TAPAR_ACERVO")];
}

export function conferir(medir, jsx) {
  const falhas = [];
  const classes = listasDe(medir, falhas);

  /* UMA LISTA VAZIA NÃO É UMA LISTA LIMPA. Sem isto, apagar os seletores — ou
   * escrevê-los de um jeito que o padrão não casa — passaria como sucesso, que
   * foi exatamente o defeito 3 lá de cima. */
  if (classes.length < 8) {
    falhas.push(`li ${classes.length} seletor(es) nas duas listas, e elas têm mais que isso`);
    return { falhas, classes };
  }

  for (const classe of classes) {
    /* A CLASSE PODE VIR ACOMPANHADA. `className="nota-trecho trecho-citado"` é
     * o caso real, e o padrão que exigia a classe sozinha entre aspas não
     * casava com ele — acusava um vazamento que não existia. */
    const usos = [...jsx.matchAll(
      new RegExp(`className=(?:"[^"]*\\b${classe}\\b[^"]*"|\\{[^}]*${classe}[^}]*\\})`, "g")
    )];
    if (!usos.length) {
      falhas.push(`.${classe} está na lista e não aparece em JSX nenhum`);
      continue;
    }
    /* O atributo está na MESMA abertura de tag: 300 caracteres cobrem qualquer
     * uma destas e não alcançam a tag seguinte. */
    const tapado = usos.some((u) => {
      const trecho = jsx.slice(Math.max(0, u.index - 300), u.index + 300);
      return trecho.includes("data-clarity-mask");
    });
    if (!tapado) {
      falhas.push(
        `.${classe} está na lista e nenhum elemento com ela tem ` +
          `data-clarity-mask — a Clarity vai gravar isso`
      );
    }
  }

  /* A chamada que não existe não pode voltar — no CÓDIGO. Ela é citada de
   * propósito nos comentários, para quem for mexer ali saber por que não está
   * lá; procurar no arquivo inteiro acusaria a própria explicação. */
  const semComentario = medir.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  if (/clarity\(\s*["']mask["']/.test(semComentario)) {
    falhas.push('`clarity("mask", …)` não existe na API da Clarity e não acusa nada');
  }

  /* A MÁSCARA DO AUTOCAPTURE — o caminho 2, que o `maskTextSelector` não cobre. */
  if (!/autocapture:\s*\{[^}]*maskAllText:\s*true/.test(semComentario)) {
    falhas.push("o autocapture do PostHog não mascara o texto — o título do livro sai no clique");
  }
  if (!/autocapture:\s*\{[^}]*maskAllElementAttributes:\s*true/.test(semComentario)) {
    falhas.push("o autocapture do PostHog não mascara os atributos — `alt` e `title` saem no clique");
  }

  return { falhas, classes };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTÁ NO DISCO
 * ────────────────────────────────────────────────────────────────────────── */
function doRepositorio() {
  const fonte = [];
  for (const pasta of ["src/jornadas", "src/componentes", "src"]) {
    const dir = join(raiz, pasta);
    for (const arq of readdirSync(dir)) {
      if (arq.endsWith(".jsx")) fonte.push(readFileSync(join(dir, arq), "utf8"));
    }
  }
  return { medir: readFileSync(join(raiz, "src/medir.js"), "utf8"), jsx: fonte.join("\n") };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * O AUTOTESTE — cada verificação, envenenada uma vez, e só ela.
 *
 * Verde sem a prova de que o instrumento sabe ficar vermelho não conta. Este
 * arquivo já passou verde estando cego uma vez; a partir daqui, dizer que ele
 * funciona custa um comando.
 * ────────────────────────────────────────────────────────────────────────── */
function autoteste() {
  const { medir, jsx } = doRepositorio();
  const limpo = conferir(medir, jsx);
  let mal = 0;
  const ok = (t) => console.log(`  \x1b[32mserve\x1b[0m   ${t}`);
  const nao = (t) => { console.log(`  \x1b[31mFALHOU\x1b[0m  ${t}`); mal++; };

  if (limpo.falhas.length) {
    nao(`sem veneno o repositório já reprova: ${limpo.falhas[0]}`);
  } else {
    ok(`sem veneno  →  passa  (${limpo.classes.length} seletores)`);
  }

  const venenos = [
    ["marca tirada de um contêiner",
     (m, j) => [m, j.replace(/ data-clarity-mask="true"/g, "")],
     "data-clarity-mask"],
    ["autocapture volta a `true`",
     (m, j) => [m.replace(/autocapture: \{[^}]*\}/, "autocapture: true"), j],
     "não mascara o texto"],
    ["só o texto mascarado, atributo não",
     (m, j) => [m.replace(/autocapture: \{[^}]*\}/, "autocapture: { maskAllText: true }"), j],
     "não mascara os atributos"],
    ["a lista do acervo esvaziada",
     (m, j) => [m.replace(/export const TAPAR_ACERVO = \[[\s\S]*?\];/, "export const TAPAR_ACERVO = [];"), j],
     "seletor(es) nas duas listas"],
    ["a lista renomeada — o padrão deixa de casar",
     (m, j) => [m.replace("export const TAPAR_CONTEUDO", "export const TAPAR_CONTEUDOS"), j],
     "não achei a lista TAPAR_CONTEUDO"],
    ['o `clarity("mask")` que não existe, de volta',
     (m, j) => [m.replace("window.clarity?.(\"event\", nome);", "clarity(\"mask\", \".prosa\");"), j],
     "não existe na API da Clarity"],
  ];

  for (const [nome, envenenar, esperado] of venenos) {
    const [m, j] = envenenar(medir, jsx);
    const { falhas } = conferir(m, j);
    if (!falhas.length) nao(`${nome}: PASSOU envenenado — a verificação não olha para isto`);
    else if (falhas.some((f) => f.includes(esperado))) ok(`${nome}  →  reprovou em "${esperado}"`);
    else nao(`${nome}: reprovou por OUTRO motivo — ${falhas[0]}`);
  }

  console.log(mal
    ? `\n\x1b[31m${mal} verificação(ões) não serve(m).\x1b[0m`
    : "\n\x1b[32mAUTOTESTE: cada verificação reprova o defeito dela, e só ele.\x1b[0m");
  return mal;
}

if (process.argv.includes("--autoteste")) {
  process.exit(autoteste());
}

const { medir, jsx } = doRepositorio();
const { falhas, classes } = conferir(medir, jsx);
for (const f of falhas) console.log(`FALHOU  ${f}`);
console.log(falhas.length
  ? `${falhas.length} falha(s).`
  : `${classes.length} seletores tapados nas duas gravadoras, e o autocapture não manda texto.`);
process.exit(falhas.length ? 1 : 0);
