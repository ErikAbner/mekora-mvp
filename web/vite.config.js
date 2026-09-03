import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { COM_SUBCAMINHO, EXATAS } from "../contrato/rotas.js";

// O design system e um GERADOR, e nao parte do produto: ele e copia de terceiro
// sob MIT, e por isso ficou de fora da fusao (DEC-0038 §5). O que entra aqui e a
// SAIDA dele, commitada como artefato em web/tokens/.
//
// A versao anterior apontava para ../mekora-ds por caminho relativo, o que
// quebrava no dia em que alguem clonasse so um dos dois — e quebrava em silencio,
// servindo o ultimo build que tivesse por perto.
const TOKENS = resolve(import.meta.dirname, "tokens");

function alvo() {
  return { target: process.env.MEKORA_API ?? "http://127.0.0.1:8000", changeOrigin: true };
}

/* A MESMA tabela de proxy para o servidor de desenvolvimento e para o de
 * pre-visualizacao. Duas copias divergiriam, e a divergencia so apareceria
 * depois do build. */
function PROXY() {
  return Object.fromEntries(
    [...new Set([...COM_SUBCAMINHO, ...EXATAS])].map((r) => {
      const exata = EXATAS.includes(r);
      const abaixo = COM_SUBCAMINHO.includes(r);
      const forma = exata && abaixo ? "($|[/?])" : exata ? "($|\\?)" : "/";
      return [`^${r}${forma}`, alvo()];
    }),
  );
}

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
  server: {
    port: 5180,
    /* O backend e outro processo — Python, FastAPI — e isso e fato de runtime,
     * nao de organizacao (DEC-0038 §1). Em desenvolvimento o proxy evita CORS e,
     * mais importante, faz o caminho da chamada ser o MESMO em dev e em producao:
     * `/upload` dos dois lados. Base de API diferente por ambiente e como um bug
     * so aparece depois do deploy. */
    /* A lista nao e escrita aqui: ela e GERADA do proprio FastAPI por
     * scripts/rotas.py, e o Caddy de producao le a mesma. Escrita a mao ela
     * ficava certa em desenvolvimento e faltando em producao — e a rota nova
     * caia no SPA, voltava HTML, e o erro era `Unexpected token '<'`. */
    /* As chaves sao EXPRESSOES REGULARES, e nao prefixos soltos. Com prefixo
     * solto, `/entrar` casava tambem a TELA de entrar e a mandava para o
     * backend — que respondia com o frontend legado. E so acontecia aqui: a
     * borda de producao ja separava as duas formas, entao a tela abria no
     * servidor e nao abria na maquina de quem a escreveu. */
    /* UM PADRAO POR CAMINHO, e nao um por lista.
     *
     * `/notas` responde no caminho exato (GET, todas as notas) e abaixo dele
     * (POST /notas/importar) — entao aparecia nas DUAS listas, e virava duas
     * entradas de proxy para o mesmo caminho. O Vite servia o SPA para
     * `/notas`, sempre: o codigo recebia `<!doctype html>` onde esperava JSON.
     *
     * `/eu`, que so existe como exata, funcionava. Foi a comparacao entre os
     * dois que mostrou o padrao.
     *
     * Agora cada caminho vira um padrao so: `$` quando ele e apenas exato, `/`
     * quando so tem sub-caminho, e `($|/)` quando e as duas coisas.
     *
     * A INTERROGACAO ENTRA NO FIM, e ela custou uma tela.
     *
     * O Vite casa o padrao contra `req.url`, que inclui a QUERY STRING. Entao
     * `^/buscar$` nao casava `/buscar?q=campo`: o pedido caia no SPA, voltava
     * `<!doctype html>`, e a busca mostrava `Unexpected token '<'` dentro do
     * painel de resultados.
     *
     * Ninguem tinha visto porque nenhuma rota exata usava query ate agora —
     * `/eu`, `/health`, `/upload` sao chamadas secas. A busca e a primeira. */
    proxy: PROXY(),
  },
  /* `vite preview` serve o BUILD, e e a unica forma de medir o produto sem o
   * StrictMode desenhando duas vezes. Sem proxy proprio ele devolvia o SPA para
   * `/eu` e a tela media uma sessao que nao existia — verde por omissao. */
  preview: {
    port: 5181,
    proxy: PROXY(),
  },
});
