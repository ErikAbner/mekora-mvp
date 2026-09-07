#!/usr/bin/env node
/* A folha de contato das catorze capas de reserva.
 *
 * Ela existe porque as capas não têm rota: aparecem só quando um livro do
 * acervo não traz capa própria, e a bancada semeia todo mundo com capa. Ver as
 * catorze lado a lado é a única forma de comparar ARRANJO — que é o que
 * distingue uma variante da outra.
 *
 * O CSS é LIDO A CADA GERAÇÃO, e isso é o ponto. A primeira versão desta folha
 * era um HTML escrito à mão com o CSS colado dentro; editei o CSS, remedi a
 * folha e li a cópia congelada — três correções pareceram não ter efeito. Ver
 * `docs/BANCADA-CEGA.md`.
 *
 *   node scripts/folha-de-capas.mjs && node scripts/medir.mjs \
 *     http://localhost:5181/_folha-capas.html 2100 850 <medida> --png=<arq>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(RAIZ, "web/src/componentes/capa-de-reserva.css"), "utf8");

/* Títulos de comprimentos diferentes DE PROPÓSITO: o título de uma capa de
 * reserva é NOME DE ARQUIVO, e não o texto curto que o desenho escolheu. O
 * corte do título deitado da 10 só apareceu com um nome de duas palavras. */
const TITULOS = [
  "Malha Urbana", "Ensaio Visual", "Estudo de Viabilidade", "Ata da reunião",
  "Briefing de Marca", "Diário 02", "Arquivo", "Apresentação Institucional",
  "Relatório de campo", "Notas de leitura", "Caderno 04", "Documentação",
  "Expedição 02", "Registro",
];

const cartoes = TITULOS.map((titulo, i) =>
  `<figure><span class="capa-de-reserva" data-capa="${i + 1}">` +
  `<span class="cr-arte" aria-hidden="true"></span>` +
  `<span class="cr-alto"><span class="cr-titulo">${titulo}</span></span>` +
  `</span><figcaption>${i + 1}</figcaption></figure>`).join("\n");

const destino = join(RAIZ, "web/publico/_folha-capas.html");
writeFileSync(destino, `<!doctype html>
<meta charset="utf-8"><title>folha de capas</title>
<style>
body { margin: 0; padding: 32px; background: #fff; font: 14px system-ui; }
.grade { display: grid; grid-template-columns: repeat(7, 252px); gap: 32px; }
figure { margin: 0; }
figcaption { margin-top: 8px; font: 12px ui-monospace, monospace; color: #666; }
${css}
</style>
<div class="grade">
${cartoes}
</div>
`);
console.log(`folha: ${destino} — ${TITULOS.length} capas, CSS de ${css.split("\n").length} linhas`);
