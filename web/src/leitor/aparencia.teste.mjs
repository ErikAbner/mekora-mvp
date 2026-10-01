import assert from "node:assert/strict";
import test from "node:test";

import { aplicarAparencia, lerAparencia, limitarAparencia, limitesDaColuna } from "./aparencia.js";

test("a largura acompanha o corpo dentro de uma faixa de leitura confortável", () => {
  assert.deepEqual(limitesDaColuna(18), { minimo: 560, maximo: 700 });
  assert.deepEqual(limitesDaColuna(28), { minimo: 680, maximo: 880 });

  assert.equal(limitarAparencia({ corpo: 18, coluna: 880 }).coluna, 700);
  assert.equal(limitarAparencia({ corpo: 28, coluna: 560 }).coluna, 680);
});

test("preferências antigas de três opções migram para os controles graduais", () => {
  const anterior = global.localStorage;
  global.localStorage = {
    getItem: () => JSON.stringify({ corpo: "maior", entrelinha: "solta", coluna: "larga" }),
  };
  try {
    const aparencia = lerAparencia();
    assert.equal(aparencia.corpo, 28);
    assert.equal(aparencia.entrelinha, 1.75);
    assert.equal(aparencia.coluna, 820);
  } finally {
    global.localStorage = anterior;
  }
});

test("a aplicação escreve apenas valores já limitados na raiz", () => {
  const anterior = global.document;
  const valores = new Map();
  global.document = {
    documentElement: {
      dataset: {},
      style: { setProperty: (nome, valor) => valores.set(nome, valor) },
    },
  };
  try {
    aplicarAparencia({ corpo: 12, entrelinha: 4, coluna: 2000, fonte: "serifada", destaques: "mostrar" });
    assert.equal(valores.get("--leitura-corpo"), "18px");
    assert.equal(valores.get("--leitura-razao"), "1.75");
    assert.equal(valores.get("--leitura-coluna"), "700px");
  } finally {
    global.document = anterior;
  }
});
