/* node contrato/idiomas.teste.mjs */
import { nomeDoIdioma, paraOndeTraduzir } from "./idiomas.js";

let falhas = 0;
const caso = (nome, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) { falhas += 1; console.log(`  FALHOU ${nome}\n    esperava ${JSON.stringify(esperado)}\n    veio     ${JSON.stringify(real)}`); }
  else console.log(`  ok   ${nome}`);
};

console.log('O BACKEND FALA `por` E `eng`; a tela nao pode.');
caso("codigo conhecido vira nome", nomeDoIdioma("por"), "Português");
caso("caixa e espaco nao atrapalham", nomeDoIdioma(" ENG "), "Inglês");
caso("nulo continua nulo", nomeDoIdioma(null), null);

/* CODIGO DESCONHECIDO APARECE COMO ELE MESMO, em maiusculas — e nao como um
 * nome inventado. Melhor "NLD" que um nome errado. */
caso("codigo de fora da lista vira o proprio codigo", nomeDoIdioma("xyz"), "XYZ");

console.log("\nPARA ONDE DA PARA TRADUZIR, so com o que esta instalado.");
const pares = [
  { src: "por", tgt: "eng" },
  { src: "por", tgt: "spa" },
  { src: "eng", tgt: "por" },
  { src: "por", tgt: "eng" },   // repetido: o motor lista por pacote
];
caso("so os que saem deste idioma", paraOndeTraduzir(pares, "por").map((x) => x.codigo).sort(),
  ["eng", "spa"]);
/* A ordem e por NOME, e nao pela de instalacao: "Espanhol" antes de "Ingles",
 * embora o motor liste `eng` primeiro. Escrevi este caso ao contrario na
 * primeira vez, e ele pegou a mim e nao ao codigo — que ja estava certo. */
caso("ordenado por NOME, e nao pela ordem de instalacao",
  paraOndeTraduzir(pares, "por").map((x) => x.nome), ["Espanhol", "Inglês"]);
caso("repetido entra uma vez so", paraOndeTraduzir(pares, "por").length, 2);
caso("de um idioma sem par, nada", paraOndeTraduzir(pares, "deu"), []);

/* SEM PARES INSTALADOS, NADA — e a tela precisa disso para dizer que a traducao
 * nao esta disponivel, em vez de oferecer um botao que responde 409. */
caso("lista vazia devolve vazio", paraOndeTraduzir([], "por"), []);
caso("nao-lista devolve vazio", paraOndeTraduzir(null, "por"), []);
caso("sem idioma de origem, vazio", paraOndeTraduzir(pares, null), []);

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo passou");
process.exit(falhas ? 1 : 0);
