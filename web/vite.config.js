import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// O design system e um GERADOR, e nao parte do produto: ele e copia de terceiro
// sob MIT, e por isso ficou de fora da fusao (DEC-0038 §5). O que entra aqui e a
// SAIDA dele, commitada como artefato em web/tokens/.
//
// A versao anterior apontava para ../mekora-ds por caminho relativo, o que
// quebrava no dia em que alguem clonasse so um dos dois — e quebrava em silencio,
// servindo o ultimo build que tivesse por perto.
const TOKENS = resolve(import.meta.dirname, "tokens");

export default defineConfig({
  plugins: [react()],
  // A pasta publica se chama publico, como o resto do repositorio.
  publicDir: "publico",
  resolve: {
    alias: {
      "@ds/tema": resolve(TOKENS, "theme.css"),
      "@ds/variaveis": resolve(TOKENS, "variables.css"),
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  server: { port: 5180 },
});
