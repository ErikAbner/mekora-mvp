import assert from "node:assert/strict";
import test from "node:test";

import { lerSelecao } from "./selecao.js";

function texto(conteudo) {
  return { nodeType: 3, textContent: conteudo, parentElement: null };
}

function elemento({ dataset = {}, filhos = [], pai = null } = {}) {
  const el = {
    nodeType: 1,
    dataset,
    childNodes: filhos,
    parentElement: pai,
    get textContent() {
      return this.childNodes.map((filho) => filho.textContent ?? "").join("");
    },
    closest(seletor) {
      let atual = this;
      const campo = seletor === "[data-de]" ? "de" : seletor === "[data-capitulo]" ? "capitulo" : null;
      while (atual && campo) {
        if (atual.dataset?.[campo] !== undefined) return atual;
        atual = atual.parentElement;
      }
      return null;
    },
    contains(no) {
      let atual = no;
      while (atual) {
        if (atual === this) return true;
        atual = atual.parentElement;
      }
      return false;
    },
  };
  for (const filho of filhos) filho.parentElement = el;
  return el;
}

function textosDe(raiz) {
  const fora = [];
  const andar = (no) => {
    if (no.nodeType === 3) fora.push(no);
    else for (const filho of no.childNodes ?? []) andar(filho);
  };
  andar(raiz);
  return fora;
}

test("a selecao vira ancora, capitulo e posicao mesmo com enfase aninhada", () => {
  const antes = texto("Antes ");
  const palavra = texto("palavra");
  const enfase = elemento({ filhos: [palavra] });
  const depois = texto(" depois");
  const bloco = elemento({ dataset: { de: "100" }, filhos: [antes, enfase, depois] });
  const capitulo = elemento({ dataset: { capitulo: "2" }, filhos: [bloco] });
  const raiz = elemento({ filhos: [capitulo] });

  const faixa = {
    commonAncestorContainer: bloco,
    startContainer: palavra,
    startOffset: 1,
    endContainer: depois,
    endOffset: 4,
    toString: () => "alavra dep",
    getBoundingClientRect: () => ({ left: 100, width: 100, top: 220, bottom: 240 }),
  };

  const janelaAnterior = global.window;
  const documentoAnterior = global.document;
  const filtroAnterior = global.NodeFilter;
  global.window = { getSelection: () => ({ isCollapsed: false, rangeCount: 1, getRangeAt: () => faixa }) };
  global.NodeFilter = { SHOW_TEXT: 4 };
  global.document = {
    createTreeWalker(alvo) {
      const nos = textosDe(alvo);
      let indice = 0;
      return { nextNode: () => nos[indice++] ?? null };
    },
  };

  try {
    assert.deepEqual(lerSelecao(raiz), {
      de: 107,
      ate: 117,
      trecho: "alavra dep",
      antes: "Antes p",
      depois: "ois",
      capitulo: 2,
      onde: { x: 150, y: 220, yBaixo: 240 },
    });
  } finally {
    global.window = janelaAnterior;
    global.document = documentoAnterior;
    global.NodeFilter = filtroAnterior;
  }
});
