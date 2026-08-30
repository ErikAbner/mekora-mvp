/* Prova a derivação contra os casos que importam.
 *
 * Não é teste de cobertura: é a lista de discordâncias possíveis entre a fila e
 * a estante, cada uma escrita como um caso. Se duas telas divergirem sobre o
 * mesmo arquivo um dia, é porque um destes deixou de valer.
 *
 *     node contrato/estado.teste.mjs
 */
import { estadoDe, estadosNaoCobertos, VALORES } from "./estado.js";

let falhas = 0;
const caso = (nome, j, esperado) => {
  const r = estadoDe(j);
  const ok = r.estado === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"} ${nome}  ->  ${r.estado}${ok ? "" : ` (esperava ${esperado})`}`);
};

console.log("\nERRO vence tudo — mostrar 'pronto' porque a conversão terminou,");
console.log("quando o ENVIO falhou, é mentir sobre o que está no Kindle.");
caso("conversao pronta e envio falhado", { conversion_status: "done", send_status: "failed" }, "erro");
caso("tudo pronto menos a traducao", { status: "done", conversion_status: "done", translation_status: "failed" }, "erro");
caso("interrompido", { status: "interrupted" }, "erro");

console.log("\nTRABALHANDO vence pronto: enquanto uma etapa anda, nao esta pronto.");
caso("convertido mas enviando", { status: "converted", conversion_status: "done", send_status: "in_progress" }, "trabalhando");
caso("OCR pedido", { status: "analyzed", ocr_status: "needed" }, "trabalhando");

console.log("\nPRONTO exige o trabalho PEDIDO, e nao todo trabalho possivel.");
caso("documento sem traducao", { status: "done", conversion_status: "done", translation_status: "not_started" }, "pronto");
caso("enviado ao Kindle", { conversion_status: "done", send_status: "sent" }, "pronto");

console.log("\nFILA e o estado de quem ainda nao comecou — e o de quem terminou");
console.log("uma sub-etapa: OCR pronto com conversao pendente ainda espera.");
caso("recem enviado", { status: "uploaded", conversion_status: "pending" }, "fila");
caso("OCR pronto, conversao pendente", { ocr_status: "done", conversion_status: "pending" }, "fila");
caso("sem resposta ainda", null, "fila");

console.log("\nO motivo do erro vem do BACKEND, nunca inventado aqui.");
const e = estadoDe({ send_status: "failed", send_error: "SMTP recusou o anexo" });
const temMotivo = e.motivo === "SMTP recusou o anexo" && e.etapa === "envio";
if (!temMotivo) falhas++;
console.log(`  ${temMotivo ? "ok  " : "FALHA"} etapa e motivo preservados  ->  ${e.etapa} / ${e.motivo}`);

console.log("\nTODO valor que o backend emite cai em balde nomeado.");
const orfaos = estadosNaoCobertos();
if (orfaos.length) { falhas++; orfaos.forEach((o) => console.log("  FALHA", o)); }
else console.log(`  ok   ${Object.values(VALORES).flat().length} valores, nenhum orfao`);

console.log(falhas ? `\n${falhas} falha(s)\n` : "\ntudo passou\n");
process.exit(falhas ? 1 : 0);
