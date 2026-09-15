import assert from "node:assert/strict";
import test from "node:test";

import { destinoDoMenu } from "./menu-teclado.js";

test("setas, Home e End percorrem o menu e dão a volta", () => {
  assert.equal(destinoDoMenu("ArrowDown", -1, 4), 0);
  assert.equal(destinoDoMenu("ArrowDown", 3, 4), 0);
  assert.equal(destinoDoMenu("ArrowUp", -1, 4), 3);
  assert.equal(destinoDoMenu("ArrowUp", 0, 4), 3);
  assert.equal(destinoDoMenu("Home", 2, 4), 0);
  assert.equal(destinoDoMenu("End", 1, 4), 3);
  assert.equal(destinoDoMenu("Enter", 1, 4), null);
});
