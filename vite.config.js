import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// O design system e consumido por CAMINHO e nao por publicacao em registro.
// Os dois repositorios vivem lado a lado na mesma maquina, e publicar um pacote
// so para consumi-lo aqui seria cerimonia sem beneficio — enquanto os dois
// andarem juntos, o caminho e mais honesto: ele quebra alto se alguem mover o
// mekora-ds, em vez de servir uma versao velha em silencio.
const DS = resolve(import.meta.dirname, "../mekora-ds");

export default defineConfig({
  plugins: [react()],
  // A pasta publica se chama publico, como o resto do repositorio.
  publicDir: "publico",
  resolve: {
    alias: {
      "@ds/tema": resolve(DS, "packages/ui/src/styles/theme.css"),
      "@ds/variaveis": resolve(DS, "packages/theme-css/src/variables.css"),
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  server: { port: 5180 },
});
