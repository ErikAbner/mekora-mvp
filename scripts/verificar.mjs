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
    /* data: URI e conteúdo, não código. E o alfabeto do base64 inclui a barra:
       um payload com "//" fazia a remoção de comentário de linha comer o resto
       da linha. No artefato, isso apagou as duas definições que vinham logo
       depois da tabela de capas, e o verificador acusou função inexistente
       num arquivo correto. Sai primeiro, antes de tudo. */
    .replace(/data:[a-zA-Z0-9/+.-]+;base64,[A-Za-z0-9+/=]+/g, 'DATA')
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

  /* ── CSS engolido ── uma chave aberta dentro de um seletor ──
     `.a{.a{` faz o parser do navegador descartar TODAS as regras seguintes, e
     ele nao se recupera. Aconteceu numa emenda minha: 225 de 398 regras
     sumiram, o veu das folhas foi junto, e a pagina continuou renderizando —
     entao o smoke passou e a tela estava destruida. */
  const est = bruto.match(/<style>([\s\S]*?)<\/style>/);
  if (est) {
    const css = est[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
    let prof = 0, linha = 1;
    for (let i = 0; i < css.length; i++) {
      const c = css[i];
      if (c === String.fromCharCode(10)) linha++;
      else if (c === '{') {
        prof++;
        /* 3 e sempre erro: o maximo legitimo e @media > regra > declaracoes */
        if (prof > 2) { achados.push({ tipo: 'css-engolido', nome: 'chave dentro de seletor, linha ~' + linha }); break; }
      } else if (c === '}') {
        /* Math.max escondia justamente o defeito que eu cometi duas vezes: uma
           chave a mais no nivel zero e uma declaracao orfa fora de regra, e o
           navegador descarta a regra seguinte tentando se recuperar. */
        if (prof === 0) {
          achados.push({ tipo: 'css-orfao', nome: 'chave fechando fora de regra, linha ~' + linha });
          break;
        }
        prof--;
      }
    }
    if (prof !== 0) achados.push({ tipo: 'css-engolido', nome: 'chaves desbalanceadas: sobra ' + prof });
  }

  /* ── classe que já existia ── duas regras-base longe uma da outra ──
     Uma classe nova num arquivo grande herda o que já estava escrito com aquele
     nome, e a tela renderiza sem erro: `.pend` era um emblema inline-flex, e a
     faixa que reusou o nome virou duas colunas em silêncio. Terceira vez. */
  if (est) {
    const css = est[1].replace(/\/\*[\s\S]*?\*\//g, ' ').split(String.fromCharCode(10));
    const base = new Map();
    /* o corpo da regra, que pode continuar nas linhas seguintes */
    const props = (n) => {
      let t = '';
      for (let i = n; i < css.length && i < n + 12; i++) { t += css[i]; if (css[i].indexOf('}') > -1) break; }
      return new Set([...t.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]));
    };
    css.forEach((l, n) => {
      const m = /^\.([A-Za-z][\w-]*)\{/.exec(l);
      if (m) (base.get(m[1]) || base.set(m[1], []).get(m[1])).push(n);
    });
    for (const [nome, ns] of base) {
      if (ns.length < 2 || Math.max(...ns) - Math.min(...ns) <= 150) continue;
      /* Distância sozinha não acusa: `.txtE` mora em dois lugares de propósito,
         tipografia numa seção e espaçamento noutra, sem nada em comum. O que
         denuncia reúso de nome é DISPUTAR A MESMA PROPRIEDADE de longe. */
      const conjuntos = ns.map(props);
      const briga = [...conjuntos[0]].filter((p) => conjuntos.slice(1).some((c) => c.has(p)));
      if (briga.length)
        achados.push({ tipo: 'classe-colidida',
          nome: nome + ' (linhas ~' + ns.map((n) => n + 1).join(', ') + '; disputam ' + briga.slice(0, 3).join(', ') + ')' });
    }
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
  ['css-engolido', `<style>.a{color:red}
.b{.b{color:blue}
.c{color:green}</style><script>1</script>`],
  /* e o que ele NÃO pode acusar: prosa dentro de comentário, e aspas
     aninhadas — os dois falsos positivos que ele já teve */
  [null, `/* 3 dos 14 itens (2 TXT) nao cabiam, pela ancora semantica (o topo) */\nfunction a(){return '<p style="color:var(--x)">'+esc(b)+'</p>'}\nfunction esc(x){return x}`],
  /* nem um data: URI com "//" dentro pode apagar o que vem depois dele */
  [null, `const T={"01":"data:image/png;base64,iVBOR//w0KGgoAAAA+/x=="};
const capa=n=>T[n]||"";
function a(){return capa(1)}`],
  /* classe nova reusando nome que ja existia, longe no arquivo */
  ['classe-colidida', '<style>.pend{display:inline-flex}'+String.fromCharCode(10)+
    '.x{color:red}'.split(',').join('')+String.fromCharCode(10).repeat(200)+'.pend{display:block}</style>'+
    '<script>1</script>'],
  /* e variantes que moram juntas nao podem ser acusadas */
  [null, ['<style>.a{display:flex}','.a{color:red}','.a.-b{display:block}</style>'].join(String.fromCharCode(10))+'<script>1</script>'],
  /* a declaracao orfa: sobrou de uma edicao por linha, e o navegador come a
     regra seguinte tentando se recuperar */
  ['css-orfao', `<style>.a{color:red}
  padding-bottom:8px}
.b{color:blue}</style><script>1</script>`],
  /* e um CSS legitimo com media query aninhada nao pode ser acusado */
  [null, `<style>@media(max-width:700px){.a{color:red}.b{color:blue}}
@container (max-width:600px){.c{color:green}}</style><script>1</script>`],
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
  console.log('✓ autoteste: os sete detectores respondem, e nenhum acusa prosa');
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
