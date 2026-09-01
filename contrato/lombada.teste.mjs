/* A espessura da lombada.
 *
 * O teste que importa nao e "a funcao devolve um numero": e se o numero bate com
 * livro de verdade. A colheita registrou que o ecossistema so tem espessura
 * constante ou fator solto sem unidade — entao a prova aqui e contra a regua.
 */
import { espessuraMm, espessuraPx, MINIMO_PX, MAXIMO_MM } from "./lombada.js";

/* Livros reais, medidos pela contagem de paginas da edicao brasileira comum. A
 * tolerancia e de 20%: papel varia entre 0,08 e 0,12 mm por folha, e a conta usa
 * 0,1 — ela nao tem como acertar na casa do milimetro, e nao precisa. */
const REAIS = [
  ["um livro de bolso, 200 paginas", 200, 12],
  ["um romance comum, 300 paginas", 300, 17],
  ["um manual grosso, 600 paginas", 600, 32],
  ["um dicionario, 1500 paginas", 1500, 60],   // bate no teto
];

let falhas = 0;
console.log("  contra a regua:");
for (const [nome, paginas, esperadoMm] of REAIS) {
  const mm = espessuraMm(paginas);
  const ok = Math.abs(mm - esperadoMm) <= esperadoMm * 0.2;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"} ${nome}: ${mm.toFixed(1)} mm (esperado ~${esperadoMm})`);
}

console.log("\n  ausencia nao e zero:");
for (const [entrada, porque] of [[0, "zero paginas"], [null, "sem contagem"], [undefined, "campo ausente"], [-5, "negativo"], ["abc", "lixo"], [NaN, "NaN"]]) {
  const mm = espessuraMm(entrada);
  const px = espessuraPx(entrada, 297);
  const ok = mm === null && px === null;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"} ${porque} → null`);
}

console.log("\n  a escala e da capa, e nao um fator solto:");
/* A MESMA CONTA na miniatura e na vista grande. E o que a linha do hubcrm nao
 * fazia: `pages / 35` da o mesmo pixel em qualquer tamanho de capa, e por isso
 * uma miniatura ganhava lombada de livro grande. */
const dobrou = espessuraPx(300, 594) / espessuraPx(300, 297);
const ok = Math.abs(dobrou - 2) < 0.06;
if (!ok) falhas++;
console.log(`  ${ok ? "ok  " : "FALHA"} capa com o dobro da altura da lombada ${dobrou.toFixed(2)}x mais grossa`);

console.log("\n  varredura:");
let anterior = -1, quebras = 0;
for (let p = 1; p <= 3000; p++) {
  const mm = espessuraMm(p);
  /* Nunca encolhe quando o livro cresce. */
  if (mm < anterior - 1e-9) { quebras++; }
  anterior = mm;
  if (mm > MAXIMO_MM + 1e-9) quebras++;
  const px = espessuraPx(p, 297);
  if (px < MINIMO_PX) quebras++;
  /* E nunca vira um numero que nao cabe na tela. */
  if (px > 400) quebras++;
}
if (quebras) falhas += quebras;
console.log(`  ${quebras ? "FALHA" : "ok  "} 1 a 3000 paginas: ${quebras || "nenhuma"} quebra de monotonia, teto ou minimo`);

/* O CASO QUE A LINHA DO hubcrm ERRA, e que motivou escrever esta. Ela devolve
 * pixels sem unidade, com teto em 22: um livro de 1000 paginas e um de 800 saem
 * IGUAIS, e os dois saem mais finos que um de 300 deveria ser numa capa grande. */
const hub = (p) => Math.max(4, Math.min(22, Math.round(p / 35)));
const empatam = hub(800) === hub(1000) && hub(1000) === hub(2000);
console.log(`\n  ${empatam ? "ok  " : "FALHA"} a linha do hubcrm empata 800, 1000 e 2000 paginas em ${hub(1000)}px`);
const nosso = [800, 1000, 2000].map((p) => espessuraPx(p, 297));
const distintos = new Set(nosso).size >= 2;
if (!distintos) falhas++;
console.log(`  ${distintos ? "ok  " : "FALHA"} a conta daqui os separa: ${nosso.join(", ")} px`);

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo passou: a espessura tem unidade, acompanha a escala da capa e bate com a regua.");
process.exit(falhas ? 1 : 0);
