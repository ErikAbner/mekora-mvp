#!/usr/bin/env node
/* Portão único para a bancada de pior caso.
 *
 * Ele não cria os dados: recebe uma bancada isolada já semeada e transforma
 * as medições existentes em um resultado binário, com orçamento por jornada.
 * A execução completa vive em `scripts/portao-caos.sh`.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(fileURLToPath(new URL("..", import.meta.url)));
const base = process.env.MEKORA_WEB || "http://localhost:5180";
const sessao = process.env.MEKORA_SESSAO || "";
const livro = process.env.MEKORA_LIVRO_EXTREMO || "";
const estudo = process.env.MEKORA_ESTUDO_EXTREMO || "";

export const CENARIOS = [
  { nome: "Estante", rota: "/estante", maxNos: 1500, maxAltura: 18000, minimo: (viewport) => viewport.largura <= 639 ? 20 : viewport.largura <= 1023 ? 36 : 60 },
  { nome: "Notas", rota: "/notas", maxNos: 1500, maxAltura: 26000 },
  { nome: "Estudos", rota: "/estudos", maxNos: 1500, maxAltura: 26000 },
  { nome: "Mesa", rota: "/mesa", maxNos: 1200, maxAltura: 20000 },
  { nome: "Canvas", rota: "/canvas", maxNos: 40000, maxAltura: 3000 },
  { nome: "Livro extremo", rota: () => `/estante/${livro}`, maxNos: 3000, maxAltura: 26000 },
  { nome: "Estudo extremo", rota: () => `/estudo/${estudo}`, maxNos: 3000, maxAltura: 26000 },
];

export const VIEWPORTS = [
  { nome: "desktop", largura: 1440, altura: 1000 },
  { nome: "tablet", largura: 768, altura: 1024 },
  /* Equivalente de reflow a 200% numa janela de 1440px: a página recebe
   * aproximadamente 720 CSS px. É o que importa para corte e sobreposição. */
  { nome: "zoom-200", largura: 720, altura: 900 },
  { nome: "telefone", largura: 390, altura: 844 },
];

export function avaliar(cenario, viewport, medida) {
  const falhas = [];
  const nos = medida?.custo?.nos ?? Infinity;
  const altura = medida?.documento?.altura ?? Infinity;
  const overflow = medida?.documento?.overflow_horizontal ?? Infinity;
  const semNome = medida?.acessibilidade?.botoes_sem_nome ?? Infinity;
  const semAlt = medida?.acessibilidade?.imagens_sem_alt ?? Infinity;
  const alvosPequenos = medida?.acessibilidade?.alvos_menores_que_24 ?? Infinity;
  const transbordam = medida?.transbordam?.length ?? Infinity;
  const navegacao = medida?.navegacao;

  if (medida?.rota !== (typeof cenario.rota === "function" ? cenario.rota() : cenario.rota))
    falhas.push(`rota incorreta: ${medida?.rota || "ausente"}`);
  if (nos > cenario.maxNos) falhas.push(`${nos} nós > orçamento ${cenario.maxNos}`);
  if (altura > cenario.maxAltura) falhas.push(`${altura}px de altura > orçamento ${cenario.maxAltura}px`);
  if (overflow > 1) falhas.push(`${overflow}px de overflow horizontal`);
  if (transbordam) falhas.push(`${transbordam} elementos fora da viewport`);
  if (semNome) falhas.push(`${semNome} ações sem nome acessível`);
  if (semAlt) falhas.push(`${semAlt} imagens sem alt`);
  if (alvosPequenos) {
    const amostra = (medida?.acessibilidade?.amostra_alvos_menores_que_24 || [])
      .map((alvo) => `${alvo.tag}.${alvo.classe || "sem-classe"} (${alvo.largura}×${alvo.altura})`)
      .join(", ");
    falhas.push(`${alvosPequenos} alvos menores que 24px${amostra ? `: ${amostra}` : ""}`);
  }
  if (cenario.minimo) {
    const esperado = cenario.minimo(viewport);
    const recebido = medida?.conteudo?.livros_renderizados ?? 0;
    if (recebido < esperado) falhas.push(`conteúdo incompleto: ${recebido}/${esperado} livros renderizados`);
  }
  if (cenario.nome === "Estante") {
    const capas = medida?.capas;
    if (!capas || capas.total === 0) falhas.push("contrato de capas não foi medido");
    if (capas?.invalidas) {
      const amostra = (capas.amostra_invalidas || [])
        .map((capa) => `#${capa.indice + 1} ${JSON.stringify(capa)}`)
        .join("; ");
      falhas.push(`${capas.invalidas} capas violam proporção, recorte ou separação de metadados${amostra ? `: ${amostra}` : ""}`);
    }
  }
  if (cenario.nome === "Estudos") {
    const grupos = medida?.grupos_canvas_em_estudos;
    if (!grupos || grupos.total < 4) falhas.push(`grupos do Canvas ausentes ou incompletos: ${grupos?.total ?? 0}`);
    if (grupos?.invalidos) {
      falhas.push(`${grupos.invalidos} grupos perderam identidade, membros, contagem ou ação: ${JSON.stringify(grupos.amostra_invalidos || [])}`);
    }
    if (!grupos?.tem_paginacao) falhas.push("muitos grupos do Canvas não oferecem carregamento progressivo");
  }
  if (!navegacao) falhas.push("navegação global ausente");
  if (navegacao && cenario.nome !== "Canvas") {
    if (!/rgba?\(0, 0, 0, 0\)|transparent/.test(navegacao.fundo))
      falhas.push(`cabeçalho criou fundo ${navegacao.fundo}`);
    if (navegacao.bordas.some((valor) => valor > 0))
      falhas.push(`cabeçalho criou borda ${navegacao.bordas.join("/")}`);
    if (!["sticky", "relative"].includes(navegacao.posicao))
      falhas.push(`cabeçalho saiu do fluxo: ${navegacao.posicao}`);
    if (navegacao.sobreposicao_com_conteudo > 1)
      falhas.push(`cabeçalho cobre ${navegacao.sobreposicao_com_conteudo}px do conteúdo`);
  }

  return {
    passou: falhas.length === 0,
    cenario: cenario.nome,
    viewport: viewport.nome,
    nos,
    altura,
    navegacao,
    falhas,
  };
}

function medir(cenario, viewport) {
  const rota = typeof cenario.rota === "function" ? cenario.rota() : cenario.rota;
  const args = [
    "scripts/medir.mjs",
    `${base}${rota}`,
    String(viewport.largura),
    String(viewport.altura),
    "scripts/medidas/pior-caso.js",
    `--sessao=${sessao}`,
    "--espera=4000",
  ];
  const saida = execFileSync(process.execPath, args, {
    cwd: raiz,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout: 45000,
  });
  return JSON.parse(saida);
}

function autoteste() {
  const cenario = { nome: "Teste", rota: "/teste", maxNos: 100, maxAltura: 500 };
  const viewport = { nome: "tablet" };
  const baseMedida = {
    rota: "/teste",
    custo: { nos: 80 },
    documento: { altura: 420, overflow_horizontal: 0 },
    acessibilidade: { botoes_sem_nome: 0, imagens_sem_alt: 0, alvos_menores_que_24: 0 },
    transbordam: [],
    navegacao: { altura: 100, fundo: "rgba(0, 0, 0, 0)", posicao: "sticky", bordas: [0, 0, 0, 0], sobreposicao_com_conteudo: 0 },
  };
  const casos = [
    [baseMedida, true],
    [{ ...baseMedida, custo: { nos: 101 } }, false],
    [{ ...baseMedida, documento: { altura: 501, overflow_horizontal: 0 } }, false],
    [{ ...baseMedida, documento: { altura: 420, overflow_horizontal: 2 } }, false],
    [{ ...baseMedida, acessibilidade: { botoes_sem_nome: 1, imagens_sem_alt: 0 } }, false],
    [{ ...baseMedida, acessibilidade: { botoes_sem_nome: 0, imagens_sem_alt: 0, alvos_menores_que_24: 1 } }, false],
    [{ ...baseMedida, transbordam: [{}] }, false],
  ];
  const erros = casos.filter(([medida, esperado]) => avaliar(cenario, viewport, medida).passou !== esperado);
  if (erros.length) throw new Error(`${erros.length} controles do portão não responderam`);
  console.log("✓ autoteste: orçamento, overflow e acessibilidade respondem");
}

if (process.argv.includes("--autoteste")) {
  autoteste();
} else {
  if (!sessao || !livro || !estudo) {
    console.error("Use scripts/portao-caos.sh para preparar sessão, acervo extremo e IDs.");
    process.exit(2);
  }
  const resultados = [];
  for (const viewport of VIEWPORTS) {
    for (const cenario of CENARIOS) {
      try {
        const medida = medir(cenario, viewport);
        resultados.push(avaliar(cenario, viewport, medida));
      } catch (erro) {
        resultados.push({
          passou: false,
          cenario: cenario.nome,
          viewport: viewport.nome,
          falhas: [`não mediu: ${erro.message}`],
        });
      }
    }
  }
  /* O mesmo componente não pode mudar o eixo vertical entre rotas. Canvas é a
   * exceção deliberada: nele o plano ocupa a janela e o cabeçalho flutua. */
  for (const viewport of VIEWPORTS) {
    const doViewport = resultados.filter((r) => r.viewport === viewport.nome && r.cenario !== "Canvas" && r.navegacao);
    const alturas = doViewport.map((r) => r.navegacao.altura);
    if (alturas.length && Math.max(...alturas) - Math.min(...alturas) > 1) {
      const faixa = `${Math.min(...alturas)}–${Math.max(...alturas)}px`;
      for (const resultado of doViewport) {
        resultado.passou = false;
        resultado.falhas.push(`cabeçalho muda de altura entre rotas: ${faixa}`);
      }
    }
  }
  for (const resultado of resultados) {
    const marca = resultado.passou ? "✓" : "✗";
    const medida = resultado.nos ? ` · ${resultado.nos} nós · ${resultado.altura}px` : "";
    console.log(`${marca} ${resultado.viewport.padEnd(9)} ${resultado.cenario}${medida}`);
    for (const falha of resultado.falhas) console.log(`    ${falha}`);
  }
  const falhas = resultados.filter((resultado) => !resultado.passou);
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} cenários passaram.`);
  if (falhas.length) process.exit(1);
}
