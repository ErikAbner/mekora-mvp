/* A conta do quanto foi lido.
 *
 * Ela nao pode ser conferida pela tela: a porcentagem so aparece com aquele
 * livro, naquela posicao, e um livro tem centenas de posicoes. Aqui a extensao e
 * a posicao sao o dado, e o teste diz o que sai.
 */
import { fracaoLida, quantoLido } from "./progresso.js";

const CASOS = [
  // [marca, esperado, por que]
  [{ capitulo: 0, deslocamento: 0, extensao: [100, 100, 100] }, "não começou", "abriu e nao rolou"],
  [{ capitulo: 1, deslocamento: 0, extensao: [100, 100, 100] }, "33% lido", "comeco do segundo de tres iguais"],
  [{ capitulo: 1, deslocamento: 0.5, extensao: [100, 100, 100] }, "50% lido", "metade do segundo"],
  [{ capitulo: 2, deslocamento: 1, extensao: [100, 100, 100] }, "lido", "fim do ultimo"],

  /* O CASO QUE DERRUBA "capitulo N de M": prefacio curto seguido de livro longo.
   * Pela contagem de capitulos, terminar o prefacio seria 33% — pela extensao, e
   * 2%. E a diferenca entre um numero e um numero certo. */
  [{ capitulo: 1, deslocamento: 0, extensao: [20, 500, 480] }, "2% lido", "prefacio curto nao vale um terco"],
  [{ capitulo: 2, deslocamento: 0, extensao: [20, 500, 480] }, "52% lido", "depois do capitulo longo"],

  /* Nunca 100% antes do fim: 99,6% arredondado para cima diria "lido" com
   * paginas pela frente. */
  [{ capitulo: 2, deslocamento: 0.99, extensao: [100, 100, 100] }, "99% lido", "quase no fim NAO e lido"],

  // Ausencia nao e zero.
  [{ capitulo: 0, deslocamento: 0 }, null, "sem extensao nao ha o que dizer"],
  [{ capitulo: 0, deslocamento: 0, extensao: [] }, null, "livro sem capitulo"],
  [{ capitulo: 0, deslocamento: 0, extensao: [0, 0] }, null, "extensao toda zero"],
  [undefined, null, "sem marca nenhuma"],

  // Entradas fora da faixa nao quebram nem mentem.
  /* 75%, e nao 50%: preso no ULTIMO capitulo, o primeiro ja conta inteiro. Eu
     tinha escrito 50 aqui e o codigo estava certo — o caso e que estava errado,
     e vale guardar justamente por isso. */
  [{ capitulo: 99, deslocamento: 0.5, extensao: [100, 100] }, "75% lido", "capitulo alem do fim e preso no ultimo, com o anterior inteiro"],
  [{ capitulo: -3, deslocamento: 0, extensao: [100, 100] }, "não começou", "capitulo negativo"],
  [{ capitulo: 0, deslocamento: 2.5, extensao: [100, 100] }, "50% lido", "deslocamento acima de 1, preso"],
  [{ capitulo: 0, deslocamento: -1, extensao: [100, 100] }, "não começou", "deslocamento negativo"],
];

let falhas = 0;
for (const [marca, esperado, porque] of CASOS) {
  const teve = quantoLido(marca);
  const ok = teve === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"} ${String(esperado).padEnd(12)} · ${porque}${ok ? "" : `  (veio ${teve})`}`);
}

/* A PROVA QUE IMPORTA: a fracao nunca anda para tras enquanto a leitura anda
 * para a frente. E a propriedade que um numero de progresso precisa ter, e ela
 * nao aparece em nenhum caso isolado — so varrendo. */
const extensao = [37, 500, 12, 900, 240, 65];
let anterior = -1;
for (let cap = 0; cap < extensao.length; cap++) {
  for (let d = 0; d <= 1.0001; d += 0.05) {
    const f = fracaoLida({ capitulo: cap, deslocamento: d, extensao });
    if (f < anterior - 1e-9) {
      console.log(`  FALHA progresso voltou: cap ${cap} desl ${d.toFixed(2)} deu ${f.toFixed(4)}, antes era ${anterior.toFixed(4)}`);
      falhas++;
    }
    anterior = f;
  }
}

/* E nunca passa de 1, nem fica abaixo de 0. */
for (const cap of [-5, 0, 3, 99]) {
  for (const d of [-2, 0, 0.5, 1, 7]) {
    const f = fracaoLida({ capitulo: cap, deslocamento: d, extensao });
    if (f < 0 || f > 1) { console.log(`  FALHA fora de [0,1]: ${f}`); falhas++; }
  }
}

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo passou: o progresso nunca volta, nunca sai de [0,1], e nunca diz 'lido' antes do fim.");
process.exit(falhas ? 1 : 0);
