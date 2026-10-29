#!/usr/bin/env node
/* Avalia a prova de comportamento da central de atividade. */
let bruto = "";
for await (const pedaco of process.stdin) bruto += pedaco;
const medida = JSON.parse(bruto);
const esperado = [
  ["abriu", "atividade nova não abriu"],
  ["recolheu", "atividade em curso não recolheu"],
  ["persistiu", "preferência recolhida não foi guardada"],
  ["continuouRecolhido", "indicador voltou a abrir ao trocar de rota"],
  ["reabriu", "indicador compacto não reabriu"],
  ["sucessoVisivel", "conclusão não foi comunicada"],
  ["sucessoDispensado", "conclusão voltou depois de dispensada"],
  ["erroRecuperavel", "erro não oferece retorno à Mesa"],
];
const falhas = esperado.filter(([chave]) => !medida[chave]);
if (falhas.length) {
  for (const [, mensagem] of falhas) console.error(`✗ ${mensagem}`);
  process.exit(1);
}
console.log("✓ atividade global recolhe, persiste, reabre, dispensa conclusão e preserva recuperação do erro");
