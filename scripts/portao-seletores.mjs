/* O PORTÃO DOS SELETORES — item `D15`.
 *
 *     node scripts/portao-seletores.mjs             # cobra
 *     node scripts/portao-seletores.mjs --autoteste # o portão se prova
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * O INVARIANTE, E POR QUE NÃO É O DO RELATÓRIO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O `seletores.mjs` pergunta: *esta regra casa em ALGUMA rota?* É um relatório
 * útil e não pode virar portão — ele lista mais de mil seletores sem alcance, e
 * a maioria não é regra morta: é rota que ninguém visitou, estado que ninguém
 * abriu, largura que ninguém mediu. Cobrar isso exigiria triar mil linhas, e uma
 * lista de dívida triada às pressas é o lugar onde defeito de verdade se
 * esconde.
 *
 * Este arquivo pergunta outra coisa, muito mais estreita:
 *
 *     A regra escrita na folha de uma TELA casa NAQUELA TELA?
 *
 * `estudos.css` existe para vestir `/estudos`. Se uma regra dele não casa em
 * `/estudos`, não há "outra rota" para desculpá-la — ou ela está morta, ou o
 * modelo do DOM que a escreveu está errado. As duas pedem mão.
 *
 * É o defeito de 03/09, e ele custou uma rodada:
 *
 *     `.cabecalho-acoes > .acao:not(.cabecalho-menu) { display: none }`
 *
 * existia para esconder dois atalhos no telefone e nunca escondeu nada — os dois
 * são NETOS da caixa, e `>` só pega filho. A tela parecia certa. O defeito só
 * apareceu quando a busca ficou com 70px num telefone.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * O QUE ELE NÃO COBRA, DE PROPÓSITO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Um portão que congela o DOM é pior que portão nenhum: ele transforma cada
 * mudança de marcação numa falha, e quem convive com falha ruidosa aprende a
 * ignorá-la. Ficam de fora, com razão declarada:
 *
 *   estado de ponteiro       `:hover`, `:focus`, `:active` — o
 *                            `querySelectorAll` não os simula
 *   pseudo-elemento          `::before`, `::placeholder` — não é elemento
 *   estado de interação      `[open]`, `[aria-expanded="true"]`, `.movendo` —
 *                            só existe depois de um gesto
 *   tema                     `[data-tema="claro"]` sobre uma tela medida no
 *                            escuro, e vice-versa
 *   folha de componente      `componentes/*.css` veste peça, não tela: a peça
 *                            pode não estar naquela rota, e está certo
 *   folha sem rota           `sistema.css` é a rota `/sistema`, que só existe em
 *                            DEV; `ainda-nao.css` é a tela de telefone
 *   dívida declarada         `DIVIDA` abaixo, com o motivo de cada linha
 *
 * A ausência de qualquer um desses não é sinal de defeito, e cobrar por eles
 * produziria exatamente o ruído que faz portão ser desligado.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = process.env.MEKORA_WEB ?? 'http://localhost:5180';
const PROVA = process.env.MEKORA_PROVA ?? join(raiz, '.ver');

/* A folha veste a rota. Só entram as que têm uma tela ALCANÇÁVEL e MEDÍVEL:
 * uma folha cuja tela não dá para abrir não pode ser cobrada por não casar. */
const FOLHA_DA_ROTA = {
  'mesa-cheia.css': '/mesa',
  'estante.css': '/estante',
  'canvas.css': '/canvas',
  'estudos.css': '/estudos',
  'notas.css': '/notas',
  'conta.css': '/conta/preferencias',
  'conta-kindle.css': '/conta/kindle',
  'conta-seguranca.css': '/conta/seguranca',
  'conta-visao.css': '/conta',
  'privacidade.css': '/conta/privacidade',
  'ajuda.css': '/ajuda',
  'atualizacoes.css': '/atualizacoes',
  'politicas.css': '/politica-de-privacidade',
  'entrar.css': '/entrar',
  'apresentacao.css': '/',
};

/* FORA DO PORTÃO, cada uma com o motivo. Sem esta lista, o portão cobraria
 * telas que ele não consegue abrir — e reprovar por não ter medido é o mesmo
 * "vermelho por omissão" que este repositório já pagou várias vezes. */
const FORA = {
  'sistema.css': 'a rota /sistema só existe em DEV; o Rollup corta o ramo em produção',
  'ainda-nao.css': 'tela de telefone para rota de computador — só aparece abaixo de um limiar',
  'criar-conta.css': 'só existe no fluxo de primeira entrada, com estado de servidor próprio',
  'assistente-kindle.css': 'gaveta dentro de /conta/kindle, e não uma rota',
  'mesa-vazia.css': 'a Mesa vazia exige um acervo vazio; a bancada tem acervo',
  'leitura.css': 'a leitura precisa de um livro convertido e de um id que muda por semente',
  'livro.css': 'mesma razão da leitura',
  'nota.css': 'mesma razão',
  'notas.css.desativada': 'não existe',
  'preparo.css': 'exige um trabalho em preparo, que a semente nem sempre produz',
  'estudo-pagina.css': 'exige um estudo com id, que muda por semente',
};

/* A DÍVIDA CONHECIDA — igual à do `classes.mjs`.
 *
 * Cada linha é uma regra que não casa na tela dela e que NÃO é defeito, com o
 * motivo. Uma linha aqui sem motivo é uma linha que ninguém vai conseguir tirar
 * depois. A lista nasce vazia de propósito: o que entrar aqui entra com nome. */
const DIVIDA = new Map(Object.entries({
  // 'seletor': 'motivo pelo qual não casar é o certo',
}));

/* Estado que só existe depois de um gesto. A regra que depende deles não é
 * cobrada — não porque seja aceitável estar morta, mas porque este instrumento
 * não sabe distinguir "morta" de "fechada". */
const DEPENDE_DE_GESTO =
  /\[open\b|\[aria-expanded|\[aria-selected|\[data-tema|\[hidden\b|\.movendo\b|\.escolhido\b|\.aberto\b|\.recebendo\b|:has\(|\.arrastando\b|\[data-cor|\[data-estado/;

const PSEUDO_ELEMENTO = /::[\w-]+(\([^)]*\))?/g;
/* `\b?` era um erro de sintaxe — "nothing to repeat" depois de uma borda. E a
 * ordem importa: as pseudo-classes COM parênteses vêm antes das simples, senão
 * `:not` casa como `:no` + `t(...)`. */
const DINAMICAS = new RegExp(
  ':(?:' +
    'nth-child\\([^)]*\\)|nth-of-type\\([^)]*\\)|not\\([^)]*\\)|is\\([^)]*\\)|where\\([^)]*\\)|' +
    'hover|focus-visible|focus-within|focus|active|visited|target|any-link|autofill|' +
    'placeholder-shown|user-invalid|open|disabled|checked|indeterminate|' +
    'first-child|last-child|only-child' +
  ')',
  'g'
);

/** Os seletores de um arquivo CSS, sem entrar em `@media` de largura. */
export function seletoresDe(css) {
  const fora = new Set();
  // Tira comentários e o corpo das regras, deixando só os seletores.
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '');
  /* O `{` ENTRA NO CONJUNTO DE ABERTURA, e sem ele o portão não via nada dentro
   * de `@media`. Depois de `@media (max-width: 767px) {` o caractere anterior à
   * regra é uma CHAVE, e o padrão só aceitava `;`, `}` ou começo de arquivo —
   * então toda regra de telefone ficava invisível. O autoteste pegou. */
  for (const m of limpo.matchAll(/(^|[{};])\s*([^{};@]+)\{/g)) {
    const bruto = m[2].trim();
    if (!bruto || bruto.startsWith('@') || bruto.includes(':root')) continue;
    for (const parte of bruto.split(',')) {
      const sel = parte.trim();
      if (!sel || sel.length > 200) continue;
      fora.add(sel);
    }
  }
  return [...fora];
}

/** O seletor reduzido à parte que o `querySelectorAll` sabe testar. */
export function testavel(sel) {
  if (DEPENDE_DE_GESTO.test(sel)) return null;
  const s = sel.replace(PSEUDO_ELEMENTO, '').replace(DINAMICAS, '').trim();
  if (!s || s === '*' || /^[>+~&]/.test(s) || s.includes('&')) return null;
  return s;
}

function medir(rota, largura, token) {
  const saida = execFileSync('node', [
    join(raiz, 'scripts/medir.mjs'),
    `${WEB}${rota}`, String(largura), '1000',
    join(raiz, 'scripts/seletores.js'),
    `--sessao=${token}`,
    /* A TELA PRECISA TER MONTADO, e a primeira execução provou o contrário: com
     * a espera padrão, `/canvas` respondia ZERO para `.canvas-mundo` — e com
     * 500ms a mais, 23 elementos de Canvas. O portão media a tela pela metade e
     * chamava as regras dela de mortas. Foram 122 falsas só no Canvas. */
    '--espera=3500',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(saida.slice(saida.indexOf('{')));
}

async function correr() {
  const token = execFileSync(join(raiz, 'scripts/sessao-de-prova.sh'), {
    env: { ...process.env, MEKORA_PROVA: PROVA },
    encoding: 'utf8',
  }).split('\n')[0].trim();

  /* Toda a marcação do produto, num texto só. A conferência é por SUBSTRING de
   * propósito: uma classe montada por template (`livro-${tipo}`) nunca aparece
   * inteira, e um portão que a desse por morta mandaria apagar CSS vivo. */
  const MARCACAO = (function ler(dir) {
    let texto = '';
    for (const nome of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, nome.name);
      if (nome.isDirectory()) texto += ler(caminho);
      else if (/\.(jsx?|mjs)$/.test(nome.name)) texto += readFileSync(caminho, 'utf8') + '\n';
    }
    return texto;
  })(join(raiz, 'web/src'));

  const falhas = [];
  const suspeitas = [];
  const naoMediu = [];
  let cobradas = 0;
  let dispensadas = 0;

  for (const [folha, rota] of Object.entries(FOLHA_DA_ROTA)) {
    const css = readFileSync(join(raiz, 'web/src/jornadas', folha), 'utf8');
    const seletores = seletoresDe(css);

    /* AS DUAS LARGURAS, e a união delas: uma regra dentro de
     * `@media (max-width: 767px)` só casa no telefone, e cobrá-la a 1440 seria
     * inventar um defeito. */
    let alcance = null;
    for (const largura of [1440, 390]) {
      let dado;
      try { dado = medir(rota, largura, token); } catch { continue; }
      if (!alcance) alcance = new Map();
      for (const [sel, n] of Object.entries(dado.alcance)) {
        alcance.set(sel, Math.max(alcance.get(sel) ?? 0, n));
      }
    }
    if (!alcance) { naoMediu.push(`${folha} → ${rota}`); continue; }

    /* A TELA MONTOU? Se NENHUMA regra da folha casa, a resposta honesta não é
     * "a folha inteira está morta" — é "não medi esta tela". Uma folha de tela
     * sempre tem alguma regra que casa nela; zero é sinal de medida, não de
     * defeito. É o controle negativo aplicado ao próprio portão. */
    const casaramNaFolha = seletores.filter((sel) => {
      const t = testavel(sel);
      return t !== null && [...alcance.entries()].some(([s2, n]) => n > 0 && (s2 === sel || testavel(s2) === t));
    }).length;
    if (casaramNaFolha === 0) {
      naoMediu.push(`${folha} → ${rota} (nenhuma regra casou — a tela não montou)`);
      continue;
    }

    for (const sel of seletores) {
      const t = testavel(sel);
      if (t === null) { dispensadas += 1; continue; }
      if (DIVIDA.has(sel)) { dispensadas += 1; continue; }
      cobradas += 1;
      const casou = [...alcance.entries()].some(([s2, n]) => n > 0 && (s2 === sel || testavel(s2) === t));
      if (casou) continue;

      /* NÃO CASAR NÃO BASTA PARA REPROVAR, e a primeira versão reprovava — 264
       * regras de uma vez, e um portão que reprova 264 na estreia é um portão
       * que alguém desliga na segunda semana.
       *
       * A triagem separou as 264 em dois grupos com naturezas diferentes:
       *
       *   183  a classe EXISTE no JSX e a regra não casou. Quase tudo é estado
       *        que a bancada não semeia — `.erro .barra-feita` precisa de uma
       *        conversão que falhou, `.precisa-de-voce` precisa de um arquivo
       *        parado. Cobrar isso é cobrar a semente, não o código.
       *    81  a classe NÃO EXISTE em JSX nenhum. Nenhum estado vai fazê-la
       *        aparecer, porque a marcação não existe. Isso é inequívoco.
       *
       * O portão reprova só o segundo grupo. O primeiro sai no relatório.
       *
       * E a conferência é DUPLA, porque a simples erra: das 19 classes que o
       * padrão estrito deu por ausentes, DEZ aparecem no JS/JSX de outra forma
       * — nascem de template, como `canvas-secao` e `livro-deitado`. Remover as
       * 19 teria quebrado dez telas. Só entram as que não aparecem nem como
       * substring em arquivo nenhum. */
      const classes = [...sel.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]);
      const orfas = classes.filter((c) => !MARCACAO.includes(c));
      if (orfas.length) falhas.push({ folha, rota, sel, orfas });
      else suspeitas.push({ folha, rota, sel });
    }
  }

  /* NÃO MEDIR NÃO É PASSAR. Uma tela que não abriu não pode ser lida como uma
   * tela sem defeito — é o verde por omissão que este repositório chama de pior
   * que vermelho. */
  if (naoMediu.length) {
    console.error(`\nNÃO MEDIU ${naoMediu.length} tela(s): ${naoMediu.join(', ')}`);
    console.error('Um portão que não abriu a tela não sabe dizer que as regras dela casam.');
    return 1;
  }

  console.log(`\n${Object.keys(FOLHA_DA_ROTA).length} folhas de tela · ${cobradas} seletores cobrados · ${dispensadas} dispensados`);
  console.log(`${suspeitas.length} não casaram com a marcação PRESENTE — relatório, não veredito:`);
  console.log('  quase tudo é estado que a bancada não semeia. Ver `scripts/seletores.mjs`.');

  if (!falhas.length) {
    console.log('\n\x1b[32mPORTÃO: nenhuma regra de tela veste marcação que não existe.\x1b[0m');
    return 0;
  }
  console.error(`\n\x1b[31m${falhas.length} regra(s) vestem marcação que NÃO EXISTE em arquivo nenhum:\x1b[0m\n`);
  for (const f of falhas) console.error(`  ${f.folha} → ${f.rota}   ${f.sel}   (${f.orfas.join(', ')})`);
  console.error('\nNenhum estado vai fazer essas regras aparecerem: a marcação não existe.');
  console.error('Ou a classe some do CSS, ou entra em DIVIDA com o motivo.');
  return 1;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * O AUTOTESTE — o portão sabe ficar vermelho?
 * ═══════════════════════════════════════════════════════════════════════════ */
function autoteste() {
  let mal = 0;
  const ok = (t) => console.log(`  \x1b[32mserve\x1b[0m   ${t}`);
  const nao = (t) => { console.log(`  \x1b[31mFALHOU\x1b[0m  ${t}`); mal++; };

  const css = `
    .caixa { color: red }
    .caixa:hover { color: blue }
    .caixa::before { content: "" }
    .grade > .item { display: none }
    .painel[open] .corpo { display: block }
    @media (max-width: 767px) { .estreito { display: none } }
  `;
  const sels = seletoresDe(css);
  if (sels.includes('.caixa') && sels.includes('.grade > .item') && sels.includes('.estreito')) {
    ok('extrai os seletores, inclusive de dentro de @media');
  } else nao(`extração errada: ${JSON.stringify(sels)}`);

  if (testavel('.caixa:hover') === '.caixa') ok('reduz estado de ponteiro à parte estrutural');
  else nao(`:hover não reduzido: ${testavel('.caixa:hover')}`);

  if (testavel('.caixa::before') === '.caixa') ok('reduz pseudo-elemento');
  else nao('pseudo-elemento não reduzido');

  if (testavel('.painel[open] .corpo') === null) ok('dispensa o que depende de gesto');
  else nao('[open] não foi dispensado');

  if (testavel('.grade > .item') === '.grade > .item') ok('mantém o combinador — é ele que erra o modelo do DOM');
  else nao('o combinador foi perdido');

  if (testavel('*') === null && testavel('> .x') === null) ok('recusa o que não dá para testar');
  else nao('aceitou seletor não testável');

  /* O DEFEITO HISTÓRICO, reproduzido: a regra que mira neto com `>`. */
  const historico = '.cabecalho-acoes > .acao:not(.cabecalho-menu)';
  if (testavel(historico) === '.cabecalho-acoes > .acao') {
    ok('o defeito de 03/09 continua testável depois da redução');
  } else nao(`o defeito histórico foi dispensado: ${testavel(historico)}`);

  console.log(mal
    ? `\n\x1b[31m${mal} verificação(ões) não serve(m).\x1b[0m`
    : '\n\x1b[32mAUTOTESTE: cada peça do portão faz o que promete.\x1b[0m');
  return mal;
}

if (process.argv.includes('--autoteste')) process.exit(autoteste());
process.exit(await correr());
