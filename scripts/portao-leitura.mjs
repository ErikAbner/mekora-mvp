#!/usr/bin/env node
let bruto = "";
for await (const pedaco of process.stdin) bruto += pedaco;
const medida = JSON.parse(bruto);
const esperado = [
  ["aparenciaAbriu", "o painel de aparência não abriu"],
  ["ajustesAplicaram", "corpo, entrelinha, largura ou fonte não foram aplicados"],
  ["ajustesPersistiram", "os ajustes não permaneceram no aparelho"],
  ["escapeFecha", "Escape não fechou o painel"],
  ["buscaAceitouTexto", "a busca não aceitou digitação"],
  ["buscaRespondeu", "a busca não devolveu resultado nem estado vazio"],
  ["mouseAbriuPaleta", "seleção por mouse não abriu as quatro cores"],
  ["toqueAbriuPaleta", "seleção por toque não abriu a paleta"],
  ["tecladoAbriuPaleta", "seleção por teclado não abriu a paleta"],
  ["destaqueFoiCriado", "a cor não criou um destaque visível"],
  ["notasAbriram", "o caderno de notas não abriu"],
  ["notaApareceu", "o destaque criado não apareceu no caderno"],
];
const falhas = esperado.filter(([chave]) => !medida[chave]);
if (falhas.length) {
  for (const [, mensagem] of falhas) console.error(`✗ ${mensagem}`);
  console.error(JSON.stringify(medida, null, 2));
  process.exit(1);
}
console.log("✓ leitura responde a aparência, busca, seleção, destaque e notas por mouse, teclado e toque");
