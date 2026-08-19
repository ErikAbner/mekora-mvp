#!/usr/bin/env node
/**
 * Verificar, sem abrir navegador
 * ==============================
 *
 * O par estático de `medir.mjs`. Ele pega a classe de defeito que não aparece
 * no console, não estoura em lugar nenhum e passa no `node --check`:
 *
 *   corte          um `return` que termina cedo porque o JavaScript inseriu
 *                  ponto e vírgula sozinho, e o resto da função virou código
 *                  morto. Três telas ficaram assim por quatro dias.
 *   sem-definicao  chamada a função que não existe — apagada por substituição
 *                  em bloco vizinha, por exemplo.
 *   duplicada      duas funções com o mesmo nome: o interpretador lê a
 *                  primeira, sobrescreve e esquece. Havia dois `vPerfil`.
 *   sem-rota       `data-a="x"` sem `case "x"` no roteador: botão que não faz
 *                  nada, e nada avisa.
 *
 * Comentário e literal de texto são apagados ANTES de procurar identificador.
 * Sem isso o verificador acusa prosa — "3 dos 14 itens (2 TXT…)" vira uma
 * chamada a `itens` — e um verificador com falso positivo é um verificador
 * que se aprende a ignorar.
 *
 *   node scripts/verificar.mjs prototipo-mesa.html [outro.html …]
 *
 * Sai com código 1 se achar alguma coisa. Roda em menos de um segundo.
 */
import { readFileSync } from 'node:fs';

/* ── o que é código, e o que é texto sobre código ─────────────────────
   A primeira versão disto era um laço de caractere com estado, e ela se
   dessincronizava: basta uma expressão regular contendo aspas — /['"]/ — para
   ele entrar em "dentro de literal" e ficar lá até o fim do arquivo. Comeu
   140k de 195k caracteres e deixou ZERO definições de função de pé, enquanto
   respondia ✓. Instrumento que erra calado é pior que instrumento nenhum.

   Substituição por expressão regular não sabe distinguir divisão de literal
   de expressão regular — nenhum lexer de uma página sabe. Mas as aspas aqui
   PROÍBEM quebra de linha, então o pior caso é uma linha mal lida, não o
   arquivo inteiro. Erro contido em vez de erro propagado. */
function separa(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, ' ')            /* comentário de bloco */
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')         /* de linha, poupando https:// */
    /* UMA passada com alternância, não três em sequência. Em sequência, a
       aspa dupla interna de '<p style="cor:var(--x)">' era substituída antes
       da simples externa, e o que sobrava não era código nem texto. Numa
       alternância, quem abre primeiro vence — que é a regra da linguagem. */
    .replace(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, '""');
}

const CONTINUA_FIM = /(\+|\(|,|\{|\[|\?|:|\|\||&&|=|;|\}|>|\*\/)\s*$/;
const CONTINUA_INI = /^\s*(['"]|[A-Za-z_$][\w$]*\s*\()/;
const ABRE = /^\s*(return|const|let|var|if|for|while|function|\}|\/\*|\*|\/\/)/;

const GLOBAIS = new Set(('console document window Math Number String Object Array JSON ' +
  'setInterval clearInterval setTimeout parseInt parseFloat Boolean Date isNaN ' +
  'requestAnimationFrame encodeURIComponent alert RegExp Set Map WeakMap Promise ' +
  'getComputedStyle structuredClone queueMicrotask ' +
  'if for while switch catch return function typeof new do else await').split(' '));

const verifica = (arq) => verificaTexto(readFileSync(arq, 'utf8'));

function verificaTexto(bruto) {
  const m = bruto.match(/<script>([\s\S]*)<\/script>/);
  const js = m ? m[1] : bruto;
  const achados = [];

  /* ── corte: linha que não continua, seguida de linha que continua ── */
  const linhas = bruto.split('\n');
  for (let i = 0; i < linhas.length - 1; i++) {
    const a = linhas[i].trimEnd(), b = linhas[i + 1];
    if (!a.trim() || /^\s*(\/\/|\/\*|\*)/.test(a.trim())) continue;
    if (CONTINUA_FIM.test(a) || !CONTINUA_INI.test(b) || ABRE.test(b)) continue;
    if (/['"]$/.test(a.trim())) achados.push({ tipo: 'corte', linha: i + 1, o: a.trim().slice(0, 80) });
  }

  const limpo = separa(js);

  /* ── definição duplicada ── o interpretador fica com a última ── */
  const vistas = new Map();
  for (const d of limpo.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) {
    const n = d[1];
    if (vistas.has(n)) achados.push({ tipo: 'duplicada', nome: n });
    else vistas.set(n, true);
  }

  /* ── chamada sem definição ── */
  const definidas = new Set([...vistas.keys(),
    ...[...limpo.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)].map((x) => x[1]),
    ...[...limpo.matchAll(/(?:function\s*)?\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>/g)].map((x) => x[1])]);
  for (const u of new Set([...limpo.matchAll(/(?<![.\w$])([a-z_$][\w$]*)\s*\(/g)].map((x) => x[1]))) {
    if (!definidas.has(u) && !GLOBAIS.has(u)) achados.push({ tipo: 'sem-definicao', nome: u });
  }

  /* ── ação sem rota ── o botão existe e o roteador não sabe dele ── */
  const rotas = new Set([...js.matchAll(/case\s+"([a-z0-9-]+)"/g)].map((x) => x[1]));
  if (rotas.size) {
    for (const a of new Set([...js.matchAll(/data-a="([a-z0-9-]+)"/g)].map((x) => x[1]))) {
      if (!rotas.has(a)) achados.push({ tipo: 'sem-rota', nome: a });
    }
  }
  return achados;
}

/* ── autoteste ────────────────────────────────────────────────────────
   Este verificador já quebrou uma vez e respondeu ✓: o separador de código
   se dessincronizava e devolvia um arquivo sem nenhuma função, e os quatro
   detectores procuravam no vazio. Um instrumento que falha calado devolve o
   trabalho para a estimativa — que é como uma miniatura de 2px durou seis
   dias. Então ele prova os quatro antes de responder qualquer coisa. */
const CASOS = [
  ['corte', `function a(){\n  return '<b>'+\n  ''\n  '</b>';\n}`],
  ['duplicada', `function a(){return 1}\nfunction a(){return 2}`],
  ['sem-definicao', `function a(){ return naoExiste(1); }`],
  ['sem-rota', `<script>const h='<button data-a="fechar">x</button><button data-a="orfa">y</button>';\nswitch(a){case "fechar":break;}</script>`],
  /* e o que ele NÃO pode acusar: prosa dentro de comentário, e aspas
     aninhadas — os dois falsos positivos que ele já teve */
  [null, `/* 3 dos 14 itens (2 TXT) nao cabiam, pela ancora semantica (o topo) */\nfunction a(){return '<p style="color:var(--x)">'+esc(b)+'</p>'}\nfunction esc(x){return x}`],
];
function autoteste() {
  const falhas = [];
  for (const [espera, fonte] of CASOS) {
    const achados = verificaTexto(fonte);
    if (espera === null) {
      if (achados.length) falhas.push(`falso positivo: ${achados.map((a) => a.tipo + (a.nome ? ':' + a.nome : '')).join(', ')}`);
    } else if (!achados.some((a) => a.tipo === espera)) {
      falhas.push(`nao detectou ${espera}`);
    }
  }
  return falhas;
}

const arqs = process.argv.slice(2).filter((a) => a !== '--autoteste');
const falhas = autoteste();
if (falhas.length) {
  console.error('✗ o verificador esta quebrado — nao confie no que ele disser:');
  for (const f of falhas) console.error('    ' + f);
  process.exit(2);
}
if (process.argv.includes('--autoteste') && !arqs.length) {
  console.log('✓ autoteste: os quatro detectores respondem, e nenhum acusa prosa');
  process.exit(0);
}
if (!arqs.length) { console.error('uso: node scripts/verificar.mjs [--autoteste] <arquivo.html|.js> …'); process.exit(2); }

let total = 0;
for (const arq of arqs) {
  const achados = verifica(arq);
  total += achados.length;
  console.log(`${achados.length ? '✗' : '✓'} ${arq}` + (achados.length ? ` — ${achados.length}` : ''));
  for (const a of achados) {
    console.log(a.tipo === 'corte'
      ? `    corte na linha ${a.linha}: ${a.o}`
      : `    ${a.tipo}: ${a.nome}`);
  }
}
process.exit(total ? 1 : 0);
