/* Confere se os tokens GERADOS carregam valores do sistema, ou do template.
 *
 * POR QUE ESTE INSTRUMENTO EXISTE, e por que o portão não bastava.
 *
 * O portão mede a página SERVIDA — o que foi renderizado. Uma variável declarada
 * e não usada não aparece nele, e por isso ele aprovou sete telas seguidas
 * enquanto `web/tokens/` carregava **542 declarações com valor do template**.
 *
 * Elas não explodem porque ninguém as usa. Explodem no dia em que alguém usar,
 * e o exemplo já existe: o `Button` do design system lê
 * `--interactive-primary-fill-hover`, que ficou em `#004e75` — um azul. O botão
 * seria preto parado e **azul ao passar o mouse**. Defeito que sobrevive a
 * revisão porque só aparece na interação.
 *
 *     node scripts/tokens.mjs
 *     node scripts/tokens.mjs --usadas      # só as que o código realmente usa
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = ["web/tokens/theme.css", "web/tokens/variables.css"];

/* O sistema, decidido em 29/08 e registrado na DEC-0037. Qualquer outro valor é
 * herança do produto de onde o template veio. */
const SISTEMA = new Set([
  "#151515", "#535353", "#6a6a6a", "#b1b1b1",              // tinta e traço
  "#f9f9f9", "#f3f3f3", "#ebebeb", "#161616",              // superfície
  "#2f7d55", "#976519", "#b23b2a",                          // estado
  "#d7f285", "#f28587", "#f2e685", "#85bcf2",              // nota
  "#efffbf", "#ffbfc0", "#fff8bf", "#bfdfff",              // capa
]);

function todosArquivos(dir, ext, saida = []) {
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n === "dist" || n.startsWith(".")) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) todosArquivos(p, ext, saida);
    else if (ext.some((e) => n.endsWith(e))) saida.push(p);
  }
  return saida;
}

/* Quais variáveis o produto realmente consome. Só elas podem quebrar hoje; as
 * outras são risco guardado, e a diferença entre as duas coisas importa. */
function variaveisUsadas() {
  const usadas = new Set();
  for (const f of todosArquivos(join(raiz, "web/src"), [".css", ".jsx", ".js"])) {
    for (const m of readFileSync(f, "utf8").matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      usadas.add(m[1]);
    }
  }
  return usadas;
}

const soUsadas = process.argv.includes("--usadas");
const usadas = variaveisUsadas();

let total = 0, fora = 0;
const porCor = {};
const usadasFora = [];

/* O MODO importa, e a primeira versão não distinguia.
 *
 * Ela acusou `--background: #000000` como quebra de hoje. O valor é real e está
 * errado — o escuro do sistema é `surface/inverse #161616`, não preto puro —,
 * mas ele vive no bloco do tema ESCURO, e dizer só o nome fazia parecer que a
 * tela clara estava preta. Medida que não diz onde manda procurar no lugar
 * errado. */
function modoDoBloco(css, indice) {
  const antes = css.slice(0, indice);
  const abre = antes.lastIndexOf("{");
  const seletor = antes.slice(antes.lastIndexOf("}", abre) + 1, abre).trim();
  if (/dark|escuro/i.test(seletor)) return "escuro";
  if (/light|claro|:root/i.test(seletor)) return "claro";
  return seletor.slice(0, 40) || "?";
}

for (const arq of TOKENS) {
  const css = readFileSync(join(raiz, arq), "utf8");
  for (const m of css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    const [, nome, valor] = m;
    const modo = modoDoBloco(css, m.index);
    const v = valor.toLowerCase();
    if (soUsadas && !usadas.has(nome)) continue;
    total++;
    if (SISTEMA.has(v)) continue;
    fora++;
    (porCor[v] ??= []).push(nome);
    if (usadas.has(nome)) usadasFora.push({ nome, v, modo });
  }
}

console.log(`\n${total} cores declaradas${soUsadas ? " e usadas" : ""}, ${fora} fora do sistema.\n`);

if (usadasFora.length) {
  const claro = usadasFora.filter((u) => u.modo === "claro");
  const escuro = usadasFora.filter((u) => u.modo === "escuro");
  if (claro.length) {
    console.log("QUEBRA AGORA — o produto USA, no tema CLARO, valor que não é do sistema:");
    claro.forEach((u) => console.log(`   ${u.nome}: ${u.v}`));
    console.log();
  }
  if (escuro.length) {
    console.log("QUEBRA QUANDO O ESCURO EXISTIR — o tema escuro ficou com os valores do template:");
    escuro.forEach((u) => console.log(`   ${u.nome}: ${u.v}`));
    console.log();
  }
  console.log();
}

const ordenado = Object.entries(porCor).sort((a, b) => b[1].length - a[1].length);
if (ordenado.length) {
  console.log("RISCO GUARDADO — declaradas com valor do template, ainda sem uso:");
  for (const [cor, nomes] of ordenado.slice(0, 12)) {
    console.log(`   ${cor}  ${String(nomes.length).padStart(3)}x   ex: ${nomes[0]}`);
  }
  if (ordenado.length > 12) console.log(`   … e mais ${ordenado.length - 12} cores`);
}

const claroFora = usadasFora.filter((u) => u.modo === "claro").length;
console.log(
  claroFora
    ? "\nFALHA: o tema CLARO consome valor que não é do sistema.\n"
    : "\nok no tema claro: tudo que o produto consome ali é do sistema.\n" +
      (usadasFora.length ? "   O tema ESCURO ainda é do template — ver acima.\n" : ""),
);
process.exit(claroFora ? 1 : 0);
