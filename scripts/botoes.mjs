/* Acha botão que não faz nada.
 *
 *     node scripts/botoes.mjs
 *
 * POR QUE ISTO EXISTE
 * ===================
 * É a classe de defeito que mais apareceu neste produto, e sempre do mesmo
 * jeito: um `<button>` desenhado, montado, medido e verde — sem `onClick`.
 * Ele parece ativo, aceita o clique e não responde, e quem usa aprende a não
 * clicar. O portão não vê: um botão morto tem a mesma cor, o mesmo corpo e o
 * mesmo contraste de um botão vivo.
 *
 * A lista dos que já foram achados na mão, um a um:
 *
 *   os quatro recortes da estante (Tudo / Com nota / No Kindle / Quadrinhos)
 *   o alternador Capas / Estante em 3D
 *   "Notas" na ficha da estante
 *   "Marcadores", "Buscar no livro" e "Conta" no cromo da leitura
 *   a busca do cabeçalho, que ao menos vinha `disabled` e dizia por quê
 *
 * Cada um desses ficou meses na tela. Este arquivo é para o próximo não ficar.
 *
 * O QUE CONTA COMO VIVO
 * =====================
 * `onClick`, `onPointerDown`, `type="submit"`, ou `disabled` — o desligado é
 * honesto: ele diz que não faz nada, e a regra do produto pede que diga por quê
 * no `title`.
 *
 * O QUE ELE NÃO ACUSA
 * ===================
 * Botão dentro de um componente que recebe o gesto por `props` — o `<Botao>` do
 * design system, por exemplo, é atravessado por `{...resto}`. Por isso a
 * conferência é sobre o USO, e não sobre a definição: `<Botao>` sem `onClick`
 * no lugar onde ele aparece é o que interessa.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const alvo = join(raiz, 'web', 'src');

/* Ele é chamado com props e não com um gesto: quem o usa passa `aoFechar`,
 * `aoSalvar`, e o botão de dentro é do componente. Conferi-lo aqui acusaria o
 * uso certo. */
const ATRAVESSA = new Set(['Folha', 'Escolha', 'Campo', 'Soltar', 'TrilhaLinhas', 'TrazerDoKindle']);

const VIVO = /\bonClick\s*=|\bonPointerDown\s*=|\bonMouseDown\s*=|\btype\s*=\s*["'{]?submit|\bdisabled\b|\{\.\.\./;

function arquivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return arquivos(p);
    return n.endsWith('.jsx') ? [p] : [];
  });
}

/* Acha o fim da tag de abertura contando chaves: `onClick={() => f({a:1})}`
 * tem `>` dentro de uma arrow function, e cortar no primeiro `>` partiria a
 * tag no meio — e faria a conferência ler metade dos atributos. */
function abertura(texto, i) {
  let chaves = 0;
  let aspas = null;
  for (let k = i; k < texto.length; k++) {
    const c = texto[k];
    if (aspas) { if (c === aspas) aspas = null; continue; }
    if (c === '"' || c === "'" || c === '`') { aspas = c; continue; }
    if (c === '{') chaves++;
    else if (c === '}') chaves--;
    else if (c === '>' && chaves === 0) return texto.slice(i, k + 1);
  }
  return texto.slice(i);
}

const mortos = [];

/* OS COMENTÁRIOS SAEM ANTES DA CONFERÊNCIA.
 *
 * Este repositório explica os defeitos no próprio código, e as explicações
 * citam o que estava errado: "`<Botao>` sem `onClick`", "`<button>` e não
 * `<li onClick>`". A primeira versão desta conferência acusou três comentários
 * — dois deles descrevendo defeitos JÁ CORRIGIDOS.
 *
 * Trocar `<button>` por outra grafia nos comentários seria consertar o texto
 * para o instrumento; o instrumento é que aprende a não ler comentário.
 *
 * As linhas são preservadas para o número da linha continuar certo. */
function semComentarios(texto) {
  return texto
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (t) => t.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, (t) => ' '.repeat(t.length));
}

for (const arquivo of arquivos(alvo)) {
  const texto = semComentarios(readFileSync(arquivo, 'utf8'));
  const re = /<(button|Botao)\b/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    if (ATRAVESSA.has(m[1])) continue;
    const tag = abertura(texto, m.index);
    if (VIVO.test(tag)) continue;
    const linha = texto.slice(0, m.index).split('\n').length;
    mortos.push({
      onde: `${relative(raiz, arquivo)}:${linha}`,
      trecho: tag.replace(/\s+/g, ' ').slice(0, 90),
    });
  }
}

if (!mortos.length) {
  console.log('nenhum botão sem gesto.');
  process.exit(0);
}

console.error(`${mortos.length} botão(ões) sem gesto — clicam e não fazem nada:\n`);
for (const b of mortos) console.error(`  ${b.onde}\n    ${b.trecho}\n`);
console.error('Dê um `onClick`, ou marque `disabled` com o motivo no `title`.');
process.exit(1);
