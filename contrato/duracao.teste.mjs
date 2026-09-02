/* node contrato/duracao.teste.mjs */
import { comoSeDiz } from "./duracao.js";

let falhas = 0;
const caso = (nome, real, esperado) => {
  const ok = real === esperado;
  if (!ok) { falhas += 1; console.log(`  FALHOU ${nome}: esperava ${JSON.stringify(esperado)}, veio ${JSON.stringify(real)}`); }
  else console.log(`  ok   ${nome}`);
};

console.log('"COSTUMA LEVAR 128,4 s" NAO E PORTUGUES.');
caso("segundos pequenos nao viram numero", comoSeDiz(3), "poucos segundos");
caso("dezenas de segundos arredondam a cinco", comoSeDiz(37), "cerca de 35 segundos");
caso("um minuto e meio ainda e segundos", comoSeDiz(88), "cerca de 90 segundos");
caso("acima disso vira minuto", comoSeDiz(128.4), "cerca de 3 minutos");
caso("singular quando e um", comoSeDiz(95), "cerca de 2 minutos");
caso("hora quando passa de sessenta minutos", comoSeDiz(7200), "cerca de 2 horas");

/* ARREDONDA PARA CIMA no minuto, e e escolha: quem esperou 2min10 ouvindo "cerca
 * de 2 minutos" acha que o produto errou; ouvindo "cerca de 3" acha que foi
 * rapido. Errar para o lado da paciencia e o lado barato. */
caso("dois minutos e dez viram tres", comoSeDiz(130), "cerca de 3 minutos");

console.log("\nO QUE NAO E TEMPO NAO VIRA FRASE.");
caso("nulo", comoSeDiz(null), null);
caso("texto", comoSeDiz("120"), null);
caso("negativo", comoSeDiz(-5), null);
caso("infinito", comoSeDiz(Infinity), null);

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo passou");
process.exit(falhas ? 1 : 0);
