import assert from "node:assert/strict";
import {
  autorNaLombada,
  corPrincipalDosPixels,
  paletaDaLombada,
  tituloNaLombada,
  varianteDaLombada,
} from "./lombada-do-livro.js";

assert.equal(
  tituloNaLombada("Ruined by Design: How Designers Destroyed the World, and What We Can Do to Fix It"),
  "Ruined by Design",
);
assert.equal(tituloNaLombada("Título curto"), "Título curto");
assert.match(tituloNaLombada("Uma sequência muito extensa sem qualquer subtítulo para ajudar", 30), /…$/);

assert.equal(autorNaLombada("Mike Monteiro"), "Mike Monteiro");
assert.equal(
  autorNaLombada("Maria Fernanda de Albuquerque Nascimento", 28),
  "Maria F. A. Nascimento",
);

const pixels = new Uint8ClampedArray([
  202, 25, 20, 255,
  199, 28, 18, 255,
  20, 40, 210, 255,
  0, 0, 0, 0,
]);
assert.deepEqual(corPrincipalDosPixels(pixels), [201, 27, 19]);
assert.deepEqual(paletaDaLombada([245, 230, 50]), { fundo: "rgb(245 230 50)", tinta: "#101010" });
assert.deepEqual(paletaDaLombada([18, 30, 60]), { fundo: "rgb(18 30 60)", tinta: "#f4f2ec" });
assert.equal(varianteDaLombada("livro-estavel"), varianteDaLombada("livro-estavel"));

console.log("Lombadas: abreviação, cor dominante, contraste e variante estável conferidos.");
