/* O tamanho de um arquivo em palavras de gente.
 *
 * A prova aqui não é "devolve uma string": é se a string é a MESMA que o sistema
 * operacional de quem usa mostra para o mesmo arquivo. Um produto que dissesse
 * 12,1 MB onde o Finder diz 11,5 pareceria estar medindo outra coisa — e por
 * isso a base é 1024, e não 1000.
 *
 * A segunda prova é a vírgula. O desenho escreve "11.5 MB", com ponto, que é a
 * notação inglesa; o produto é em português.
 *
 *     node contrato/tamanho.teste.mjs
 */
import { tamanhoLegivel } from "./tamanho.js";

const CASOS = [
  ["a vírgula, e não o ponto do desenho", 12058624, "11,5 MB"],
  ["byte não tem fração", 742, "742 B"],
  ["acima de 100 a casa decimal não informa", 537000000, "512 MB"],
  ["o degrau de baixo, com uma casa", 1536, "1,5 KB"],
  ["gigabyte também", 3221225472, "3,0 GB"],
  // Desconhecido é `null`, e não "0 B": trabalho anterior à coluna não sabe o
  // próprio tamanho, e zero seria o produto afirmando que o arquivo é vazio.
  ["desconhecido não vira zero", null, null],
  ["negativo não vira nada", -5, null],
  ["zero é zero, e isso é diferente de não saber", 0, "0 B"],
];

let falhas = 0;
console.log("  o tamanho em palavras de gente:");
for (const [nome, bytes, esperado] of CASOS) {
  const veio = tamanhoLegivel(bytes);
  const ok = veio === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"} ${nome}: ${JSON.stringify(veio)}${ok ? "" : ` (esperava ${JSON.stringify(esperado)})`}`);
}

console.log(falhas ? `\n  ${falhas} falha(s).` : "\n  todas passaram.");
process.exit(falhas ? 1 : 0);
