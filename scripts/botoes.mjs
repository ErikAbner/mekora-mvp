/* Acha botão que não faz nada — e botão que se desliga sem dizer por quê.
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
 * honesto: ele diz que não faz nada.
 *
 * A SEGUNDA CLASSE: DESLIGADO SEM RAZÃO
 * =====================================
 * `disabled` sozinho é meia-honestidade. Ele diz "não dá", e não diz o que
 * falta — quem usa fica olhando um botão apagado sem saber se o defeito é do
 * produto ou dele. A regra deste repositório sempre foi pôr o motivo no
 * `title`; o que não havia era quem cobrasse.
 *
 * A varredura de fumaça achou cinco em quatro telas — "Quadrinhos 0" na
 * Estante, "Do Kindle 0" e "Para revisar 0" em Notas, "Guardar" na Conta,
 * "Receber o link" em Entrar. Consertar os cinco tapa cinco buracos; cobrar
 * aqui fecha a classe, e é o irmão exato do botão sem gesto: os dois são
 * afordância que promete uma coisa e entrega outra.
 *
 * A razão pode vir de dois jeitos, e o segundo é o preferido:
 *
 *     <Botao disabled title="Nenhum quadrinho na estante">   explícito
 *     <Botao porque={vazio && "Nenhum quadrinho na estante"}> o primitivo
 *
 * O `porque` do `componentes/Botao.jsx` desliga E explica com o mesmo valor, e
 * por construção não deixa esquecer metade.
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

const VIVO = /\bonClick\s*=|\bonPointerDown\s*=|\bonMouseDown\s*=|\btype\s*=\s*["'{]?submit|\bdisabled\b|\bporque\b|\{\.\.\./;

/* Desligado, de qualquer das duas grafias. */
const DESLIGA = /\bdisabled\b|\bporque\s*=/;

/* E a razão, que pode estar no `title`, no `porque`, ou vir de fora por
 * espalhamento — `{...resto}` pode carregar um `title`, e acusar aí seria
 * acusar o uso certo do componente que atravessa props. */
const RAZAO = /\btitle\s*=|\bporque\s*=|\baria-label\s*=|\{\.\.\./;

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
const mudos = [];

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
 * As linhas são preservadas para o número da linha continuar certo.
 *
 * UM PADRÃO SÓ, e a primeira versão tinha dois — este arquivo é a prova do
 * estrago. Havia uma alternativa dedicada ao comentário de JSX, o que vem
 * entre chaves, e ela começava na CHAVE e só parava numa fechada bem adiante:
 * no `Estante.jsx` a chave do CORPO DA FUNÇÃO casou com uma fechada sessenta
 * linhas abaixo, e as linhas 194 a 253 saíam em branco. Dentro delas havia um
 * botão desligado sem razão — e a conferência dizia verde.
 *
 * Verde por omissão, que é o defeito que este repositório mais paga: o
 * instrumento some com o pedaço e depois diz que não há nada ali. Achado
 * medindo pelo outro lado: a mesma tela, lida no DOM servido, mostrava um
 * "Quadrinhos 0" apagado e mudo que a leitura do JSX jurava não existir.
 *
 * O padrão de bloco cru dá conta dos dois casos, porque o comentário de JSX é
 * um bloco cru entre chaves; o que sobra de chave está balanceado e não
 * atrapalha a contagem da `abertura`. */
function semComentarios(texto) {
  return texto
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
    const linha = texto.slice(0, m.index).split('\n').length;
    const onde = `${relative(raiz, arquivo)}:${linha}`;
    const trecho = tag.replace(/\s+/g, ' ').slice(0, 90);
    if (DESLIGA.test(tag) && !RAZAO.test(tag)) mudos.push({ onde, trecho });
    if (VIVO.test(tag)) continue;
    mortos.push({ onde, trecho });
  }
}

if (!mortos.length && !mudos.length) {
  console.log('nenhum botão sem gesto, nenhum desligado sem razão.');
  process.exit(0);
}

if (mortos.length) {
  console.error(`${mortos.length} botão(ões) sem gesto — clicam e não fazem nada:\n`);
  for (const b of mortos) console.error(`  ${b.onde}\n    ${b.trecho}\n`);
  console.error('Dê um `onClick`, ou desligue com `porque="o que falta"`.\n');
}

if (mudos.length) {
  console.error(`${mudos.length} botão(ões) desligado(s) sem razão — apagam e não dizem por quê:\n`);
  for (const b of mudos) console.error(`  ${b.onde}\n    ${b.trecho}\n`);
  console.error('Troque `disabled={x}` por `porque={x && "o que falta"}`.');
}
process.exit(1);
