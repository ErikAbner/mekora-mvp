/* Cada coisa da lista `TAPAR` tem de estar tapada NAS DUAS gravadoras.
 *
 * O PostHog recebe a lista pronta na configuração. A Clarity NÃO TEM comando de
 * máscara: ela lê `data-clarity-mask` no elemento. Eu tinha escrito um
 * `clarity("mask", …)` que não existe — a chamada entra na fila, o script de
 * verdade a ignora, e NADA ACUSA. A gravação sairia com o livro de alguém
 * dentro, embaixo de uma tela de privacidade prometendo que não sai.
 *
 * Este arquivo é o que acusa. Ele lê o JSX e exige o atributo em cada classe da
 * lista.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const fonte = [];
for (const pasta of ["src/jornadas", "src/componentes", "src"]) {
  const dir = join(raiz, pasta);
  for (const arq of readdirSync(dir)) {
    if (arq.endsWith(".jsx")) fonte.push(readFileSync(join(dir, arq), "utf8"));
  }
}
const todo = fonte.join("\n");

const medir = readFileSync(join(raiz, "src/medir.js"), "utf8");
const bloco = medir.match(/export const TAPAR = \[([\s\S]*?)\];/)[1];
const classes = [...bloco.matchAll(/"\.([\w-]+)"/g)].map((m) => m[1]);

let falhas = 0;
for (const classe of classes) {
  /* A classe aparece no JSX, e o elemento que a leva tem o atributo por perto.
   * "Por perto" é a mesma abertura de tag: 300 caracteres cobrem qualquer uma
   * destas e não alcançam a tag seguinte. */
  const usos = [...todo.matchAll(new RegExp(`className=(?:"${classe}"|\\{[^}]*${classe}[^}]*\\})`, "g"))];
  if (!usos.length) {
    console.log(`FALHOU  .${classe} está em TAPAR e não aparece em JSX nenhum`);
    falhas++;
    continue;
  }
  const tapado = usos.some((u) => {
    const trecho = todo.slice(Math.max(0, u.index - 300), u.index + 300);
    return trecho.includes("data-clarity-mask");
  });
  if (!tapado) {
    console.log(
      `FALHOU  .${classe} está em TAPAR e nenhum elemento com ela tem ` +
        `data-clarity-mask — a Clarity vai gravar o conteúdo`
    );
    falhas++;
  }
}

/* E a chamada que não existe não pode voltar — no CÓDIGO. Ela é citada de
 * propósito no comentário do `TAPAR`, para quem for mexer ali saber por que ela
 * não está lá; procurar no arquivo inteiro acusaria a própria explicação. */
const semComentario = medir.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
if (/clarity\(\s*["']mask["']/.test(semComentario)) {
  console.log('FALHOU  `clarity("mask", …)` não existe na API da Clarity e não acusa nada');
  falhas++;
}

console.log(falhas ? `${falhas} falha(s).` : `${classes.length} classes tapadas nas duas gravadoras.`);
process.exit(falhas ? 1 : 0);
