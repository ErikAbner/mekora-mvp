import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("a falha global protege os dados e oferece duas saídas", () => {
  const fonte = ler("./componentes/LimiteDeErro.jsx");
  assert.match(fonte, /Seus livros e seu progresso continuam guardados/);
  assert.match(fonte, />Recarregar</);
  assert.match(fonte, />Voltar para a Mesa</);
});

test("a estante vazia explica o estado e leva ao começo da jornada", () => {
  const fonte = ler("./jornadas/Estante.jsx");
  assert.match(fonte, /Sua estante ainda está vazia/);
  assert.match(fonte, /Ela guarda o que você preparou/);
  assert.match(fonte, />Preparar um documento</);
});

test("busca distingue instrução, espera, vazio e falha", () => {
  const fonte = ler("./componentes/Busca.jsx");
  assert.match(fonte, /Escreva ao menos duas letras/);
  assert.match(fonte, /Procurando…/);
  assert.match(fonte, /Nada com esse texto/);
  assert.match(fonte, /role="alert"/);
});

test("erros de conta dizem consequência e próxima ação", () => {
  const conta = ler("./jornadas/ContaVisao.jsx");
  const seguranca = ler("./jornadas/ContaSeguranca.jsx");
  assert.match(conta, /Seus dados não foram alterados; recarregue/);
  assert.match(seguranca, /Nenhuma sessão foi encerrada; recarregue/);
});

test("a fila vazia não finge que os outros arquivos sumiram", () => {
  const fonte = ler("./jornadas/MesaCheia.jsx");
  assert.match(fonte, /Nenhum arquivo neste recorte\. Os outros continuam na fila/);
  assert.match(fonte, /Tentar arquivo novamente/);
  assert.match(fonte, /Tentar \$\{c\.erro\} arquivos novamente/);
});

test("a conversão concluída não esconde perdas que foram medidas", () => {
  const fonte = ler("./jornadas/Preparo.jsx");
  assert.match(fonte, /Pronto, com pontos para conferir/);
  assert.match(fonte, /página não abriu e não entrou/);
  assert.match(fonte, /sem texto pesquisável/);
  assert.match(fonte, /quality_manifest/);
  assert.match(fonte, /Abrir página/);
  assert.match(fonte, /\/storage\/pages\//);
  assert.match(fonte, /sem inventar uma nota de confiança/);
});
