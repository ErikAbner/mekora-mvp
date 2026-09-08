/* Cruza o alcance dos seletores em TODAS as rotas, e acusa quem não casa em
 * nenhuma.
 *
 *     scripts/prova.sh
 *     node scripts/seletores.mjs
 *
 * Uma regra que não casa numa rota não é notícia — `.canvas-nota` não existe na
 * Mesa, e é assim que tem de ser. Notícia é a regra que não casa em rota
 * NENHUMA: ou é código morto, ou é um modelo errado do DOM escrito com
 * confiança, e foi o segundo caso que deixou os dois atalhos do cabeçalho na
 * tela do telefone por meses.
 *
 * ESTE É UM RELATÓRIO, E NÃO UM PORTÃO — ainda.
 * ============================================
 * Ele sai com código 0 mesmo achando. A razão é honesta: o pacote tem centenas
 * de seletores, e uma parte dos que não casam hoje descreve estado que estas
 * rotas não alcançam — erro de rede, lista vazia, folha que só abre com dado que
 * a semente não tem. Transformar isso em portão sem triar cada um primeiro
 * ensinaria a ignorá-lo, que é a única forma de um portão morrer.
 *
 * O caminho para virar portão está escrito em `docs/ABERTO.md`: triar a lista
 * uma vez, guardar o resto como dívida conhecida — igual ao que o
 * `scripts/classes.mjs` faz — e então cobrar.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = process.env.MEKORA_WEB ?? 'http://localhost:5180';
const PROVA = process.env.MEKORA_PROVA ?? join(raiz, '.ver');

/* A MESMA LISTA DA `auditoria.sh`, e a diferença era metade do relatório.
 *
 * Este arquivo media OITO rotas e listava 1211 seletores sem alcance — e a
 * maioria não era regra morta, era rota que ninguém visitou. `/leitura`,
 * `/preparo`, `/ajuda` e a apresentação ficavam de fora, e as regras delas
 * apareciam na lista como se fossem lixo.
 *
 * Um instrumento que não visita a tela não pode dizer que a regra dela não
 * casa. É a lei da casa aplicada a si mesmo: antes de reportar ausência, provar
 * que a busca sabe achar. */
const PUBLICAS = ['/', '/entrar', '/ajuda', '/atualizacoes', '/politica-de-privacidade', '/termos-de-uso'];
const PRIVADAS = [
  '/mesa', '/estante', '/canvas', '/estudos', '/notas',
  '/conta', '/conta/kindle', '/conta/seguranca', '/conta/preferencias', '/conta/privacidade',
];
const ROTAS = [...PUBLICAS, ...PRIVADAS];

/* OS ESTADOS QUE SÓ EXISTEM DEPOIS DE UM CLIQUE.
 *
 * Uma regra como `.cabecalho-acoes:has(.busca-painel)` só casa com a busca
 * ABERTA, e nenhuma visita a encontra: ela aparecia na lista de mortas por
 * definição. O formato é `rota|seletor a clicar|nome`. */
const ESTADOS = [
  ['/estante', '[aria-label="Buscar em Mekora"]', 'busca aberta'],
  ['/estudos', '.estudos-topo button', 'folha aberta'],
];

/* AS TELAS SEM URL FIXA, alcançadas por um clique — o mesmo `DE_DENTRO` da
 * `auditoria.sh`.
 *
 * `/livro/:id`, `/preparo/:id`, `/nota/:id`, `/estudo/:id` e `/leitura/:id`
 * nascem com id diferente a cada semente, e por isso ficavam fora. A conta era
 * grande: `leitura.css` sozinho tem 48 regras `brand-`, `utility-`, `cromo-` e
 * `amostra-`, e todas apareciam como "não casaram em estado nenhum" porque
 * ninguém abria a leitura. */
const DE_DENTRO = [
  ['/estante', 'a[href^="/livro/"]', '/livro/:id'],
  ['/notas', 'a[href^="/nota/"]', '/nota/:id'],
  ['/estudos', 'a[href^="/estudo/"]', '/estudo/:id'],
  ['/estudos', 'a[href^="/leitura/"]', '/leitura/:id'],
  ['/mesa', 'a[href^="/preparo/"]', '/preparo/:id'],
];

const LARGURAS = [1440, 390];

/* UMA SESSÃO PARA A RODADA INTEIRA, escrita direto no banco.
 *
 * Este arquivo pedia um LINK POR MEDIDA ao `entrar-como-dono.sh`. Com as 8
 * rotas antigas em 2 larguras já eram 16 pedidos; com a lista da `auditoria.sh`
 * são 38, contra um teto de 20 por origem por hora (`LINKS_POR_ORIGEM`, desde
 * 03/09). Medido em 08/09: **38 de 38 medidas falharam** — o ajudante devolvia
 * "não saiu link", e o instrumento anunciava "0 seletores não casaram" com
 * saída zero.
 *
 * É o mesmo conserto que a `auditoria.sh` e o `provas.mjs` já tinham feito, e a
 * mesma razão: o teto está certo, o instrumento é que pedia demais. */
const TOKEN = execFileSync(join(raiz, 'scripts/sessao-de-prova.sh'), {
  env: { ...process.env, MEKORA_PROVA: PROVA },
  encoding: 'utf8',
}).split('\n')[0].trim();

const alcance = new Map();
let regras = 0;
const visitadas = [];

function medirEstado(rota, largura, dentro, nome) {
  const argumentos = [
    join(raiz, 'scripts/medir.mjs'),
    `${WEB}${rota}`, String(largura), '1000',
    join(raiz, 'scripts/seletores.js'),
    `--sessao=${TOKEN}`,
  ];
  if (dentro) argumentos.push(`--dentro=${dentro}`);
  return execFileSync('node', argumentos, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

const paraMedir = [
  ...ROTAS.map((r) => [r, null, r]),
  ...ESTADOS.map(([r, sel, nome]) => [r, sel, `${r} (${nome})`]),
  ...DE_DENTRO.map(([r, sel, nome]) => [r, sel, nome]),
];

for (const largura of LARGURAS) {
  for (const [rota, dentro, nome] of paraMedir) {
    let saida;
    try {
      saida = medirEstado(rota, largura, dentro, nome);
    } catch {
      console.log(`  ${nome} @ ${largura}: não mediu`);
      continue;
    }
    const dado = JSON.parse(saida.slice(saida.indexOf('{')));
    regras = Math.max(regras, dado.regras);
    visitadas.push(`${nome} @ ${largura}`);
    for (const [sel, quantos] of Object.entries(dado.alcance)) {
      alcance.set(sel, Math.max(alcance.get(sel) ?? 0, quantos));
    }
    process.stdout.write(`  ${nome} @ ${largura}: ${Object.keys(dado.alcance).length} seletores\n`);
  }
}

const mortos = [...alcance.entries()].filter(([, q]) => q === 0).map(([s]) => s).sort();

console.log(`\n${visitadas.length} estados medidos, ${regras} regras, ${alcance.size} seletores distintos.`);
console.log(`${mortos.length} não casaram em estado nenhum:\n`);
for (const s of mortos) console.log(`  ${s}`);
console.log('\nRELATÓRIO, não portão. Cada linha é uma pergunta, não um veredito:');
console.log('código morto, ou modelo errado do DOM? A segunda é a que morde.');

/* NÃO MEDIR NÃO É "NADA MORREU" — e este arquivo já anunciou o contrário.
 *
 * Em 08/09, com o ajudante de sessão quebrado, as 38 medidas falharam UMA A UMA
 * e a saída foi:
 *
 *     0 estados medidos, 0 regras, 0 seletores distintos.
 *     0 não casaram em estado nenhum:
 *
 * ...com código de saída ZERO. Um relatório vazio parecendo um relatório limpo.
 * Se este arquivo tivesse virado portão naquele estado, ele passaria para sempre
 * sem olhar para nada — que é o "verde por omissão" que o `CLAUDE.md` chama de
 * pior que vermelho.
 *
 * Enquanto ele for relatório, o veredito é só este: mediu, ou não mediu. */
const ESPERADOS = paraMedir.length * LARGURAS.length;
if (visitadas.length < ESPERADOS * 0.75) {
  console.error(
    `\nNÃO MEDIU O BASTANTE: ${visitadas.length} de ${ESPERADOS} estados. ` +
    'Um relatório que não visitou as telas não sabe dizer que as regras delas morreram.'
  );
  process.exit(1);
}
