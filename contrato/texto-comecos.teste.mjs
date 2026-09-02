/* Provas do `comecosDistintos`. */
import { comecosDistintos } from "./texto.js";

let falhas = 0;
const igual = (a, b, o) => {
  const bateu = JSON.stringify(a) === JSON.stringify(b);
  if (!bateu) { console.log(`FALHOU  ${o}\n  esperado ${JSON.stringify(b)}\n  veio     ${JSON.stringify(a)}`); falhas++; }
};

igual(
  comecosDistintos(["Uma foto é uma coisa", "Outro texto qualquer aqui"]),
  ["Uma foto é…", "Outro texto qualquer…"],
  "tres palavras quando nao ha empate"
);

/* O caso que trouxe isto: quatro notas comecando igual. */
igual(
  comecosDistintos([
    "O que separa uma estante de uma pasta",
    "O que separa um livro de um arquivo",
  ]),
  ["O que separa uma…", "O que separa um…"],
  "cresce ate desempatar, e so o necessario"
);

igual(
  comecosDistintos(["Curto", "Outro"]),
  ["Curto", "Outro"],
  "texto menor que o corte nao ganha reticencias"
);

igual(comecosDistintos([""]), ["Nota sem texto"], "texto vazio tem rotulo proprio");

/* Empate ate o teto: numera, e so os repetidos. */
const iguais = comecosDistintos([
  "a b c d e f g h i j",
  "a b c d e f g h i j",
  "z diferente",
]);
igual(iguais[2], "z diferente", "quem nao empata nao ganha numero");
igual(iguais[0].endsWith("(1)") && iguais[1].endsWith("(2)"), true, "os empatados no teto sao numerados");

/* O CASO QUE A PRIMEIRA VERSAO ERRAVA: duas empatadas nao podem alongar as
   outras. Medido no produto — a trilha saiu com frases de oito palavras em
   TODOS os itens porque quatro notas comecavam igual. */
const misto = comecosDistintos([
  "O que separa uma estante de uma pasta",
  "O que separa um livro de um arquivo",
  "A expedicao partiu de manha com o material",
]);
igual(misto[2], "A expedicao partiu…", "quem ja esta distinto em tres fica em tres");
igual(misto[0], "O que separa uma…", "so os empatados crescem, e so o necessario");

console.log(falhas ? `${falhas} falha(s).` : "8 provas passaram.");
process.exit(falhas ? 1 : 0);
