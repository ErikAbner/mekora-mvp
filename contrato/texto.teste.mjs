/* node contrato/texto.teste.mjs */
import { achatar, contem } from "./texto.js";

let falhas = 0;
const caso = (nome, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) { falhas += 1; console.log(`  FALHOU ${nome}\n    esperava ${JSON.stringify(esperado)}\n    veio     ${JSON.stringify(real)}`); }
  else console.log(`  ok   ${nome}`);
};

console.log("ACENTO E CAIXA nao sao o que a pessoa lembra.");
caso("acento sai", achatar("Página"), "pagina");
caso("caixa cai", achatar("OCR"), "ocr");
caso("os dois juntos", achatar("Relatório de Pesquisa"), "relatorio de pesquisa");
caso("cedilha", achatar("Apresentação"), "apresentacao");
caso("nulo vira vazio", achatar(null), "");
caso("numero vira texto", achatar(12), "12");

console.log("\nCONTEM aplica a regra dos dois lados.");
caso("sem acento acha com acento", contem("A página seguinte", "pagina"), true);
caso("com acento acha sem acento", contem("A pagina seguinte", "página"), true);
caso("busca vazia acha tudo", contem("qualquer coisa", ""), true);
caso("so espaco tambem", contem("qualquer coisa", "   "), true);
caso("o que nao esta la nao aparece", contem("Malha Urbana", "kindle"), false);

/* A LIMITACAO E CONHECIDA, e fica escrita como prova: sem radical, sem plural.
 * Quem mudar isso vai ver este caso falhar e decidir de proposito. */
console.log("\nO QUE ELA NAO FAZ, dito como prova.");
caso("plural nao acha singular", contem("uma nota", "notas"), false);

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo passou");
process.exit(falhas ? 1 : 0);
