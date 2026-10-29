import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componente = new URL("./GavetaDeLeitura.jsx", import.meta.url);

test("a gaveta de leitura reserva o arrasto somente para a alca", async () => {
  const fonte = await readFile(componente, "utf8");

  assert.match(
    fonte,
    /<Drawer\.Root[\s\S]*?handleOnly[\s\S]*?<Drawer\.Content className="leitura-gaveta"/,
    "sem handleOnly, a Vaul captura o arrasto usado para selecionar texto",
  );
});

test("Escape fecha primeiro a ferramenta interna e preserva o livro", async () => {
  const fonte = await readFile(componente, "utf8");
  assert.match(
    fonte,
    /document\.querySelector\("\.aparencia, \.caderno, \.indice, \.paleta, \.cartao-nota-fundo\[open\]"\)/,
    "a gaveta principal não pode sair enquanto um painel interno trata o Escape",
  );
});
