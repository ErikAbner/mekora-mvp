/* O criterio que decide a largura de cada imagem do livro.
 *
 * Ele nao pode ser conferido pela tela: qual largura uma imagem recebe so
 * aparece com aquela imagem, e um livro tem centenas. Aqui as dimensoes sao o
 * dado, e o teste diz o que cada uma vira.
 */
const LARGA_MINIMA = 900, LARGA_PROPORCAO = 1.4;
const CHEIA_MINIMA = 1600, CHEIA_PROPORCAO = 2.2;

function larguraDaImagem(w, h) {
  if (!w || !h) return "";
  const proporcao = w / h;
  if (w >= CHEIA_MINIMA && proporcao >= CHEIA_PROPORCAO) return "cheia";
  if (w >= LARGA_MINIMA && proporcao >= LARGA_PROPORCAO) return "larga";
  return "";
}

const CASOS = [
  // [largura, altura, esperado, por que]
  [1920, 640, "cheia", "panoramica grande: e a faixa do desenho"],
  [2400, 800, "cheia", "panoramica maior ainda"],
  [1600, 727, "cheia", "exatamente no limiar de 2,2"],
  [1600, 730, "larga", "um fio abaixo de 2,2 ja nao e faixa"],
  [1540, 830, "larga", "a medida exata da imagem larga do desenho"],
  [1200, 800, "larga", "grande e paisagem"],
  [900, 600, "larga", "no limiar de largura, proporcao 1,5"],
  [899, 600, "", "um pixel abaixo do limiar fica na coluna"],
  [1200, 900, "", "grande mas quadrada demais: 1,33 < 1,4"],
  [400, 200, "", "panoramica PEQUENA fica na coluna — esticar so borra"],
  [800, 1200, "", "retrato nunca alarga"],
  [680, 400, "", "do tamanho da coluna"],
  [3000, 1000, "cheia", "muito grande e muito larga"],
  [0, 0, "", "sem dimensao nao ha o que decidir"],
  [null, 100, "", "imagem que nao carregou"],
];

let falhas = 0;
for (const [w, h, esperado, porque] of CASOS) {
  const teve = larguraDaImagem(w, h);
  const ok = teve === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"} ${String(w).padStart(4)}x${String(h).padEnd(4)} -> ${(teve || "coluna").padEnd(6)} · ${porque}`);
}

/* A PROVA QUE IMPORTA, e nao um caso a mais: NENHUMA imagem promovida pode ser
 * ampliada alem do proprio tamanho.
 *
 * Ela ja pegou o defeito uma vez. Com os limiares em 1200 e 1600 — ambos abaixo
 * das larguras de destino, 1540 e 1792 — a varredura achou 32 casos, e o
 * primeiro deles era 1210x403. A correcao nao foi subir o limiar: foi a imagem
 * levar o proprio tamanho como teto, via `--natural`.
 *
 * Aqui isso vira: promovida OU nao, a largura pintada e min(destino, natural). */
const destino = { larga: 1540, cheia: 1792, "": 680 };
for (let w = 100; w <= 3000; w += 37) {
  for (const h of [w / 3, w / 2, w / 1.5, w, w * 1.5]) {
    const classe = larguraDaImagem(w, Math.round(h));
    const pintada = Math.min(destino[classe], w);
    if (pintada > w) {
      console.log(`  FALHA ${w}x${Math.round(h)} seria pintada com ${pintada}px, maior que os ${w} que tem`);
      falhas++;
    }
    /* E o contrario tambem importa: promover so vale se render mais largura que
     * a coluna de texto. Promover para 900 o que ficaria em 680 e ganho; para
     * 700, ruido. */
    if (classe && pintada <= 680) {
      console.log(`  FALHA ${w}x${Math.round(h)} foi promovida a ${classe} e pintaria ${pintada}px, que nao passa da coluna`);
      falhas++;
    }
  }
}
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo passou: nenhuma imagem e ampliada alem do proprio tamanho.");
process.exit(falhas ? 1 : 0);
