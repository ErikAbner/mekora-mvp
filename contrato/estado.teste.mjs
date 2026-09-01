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
caso("analisando", { status: "analyzing" }, "trabalhando");

console.log("\nPRONTO exige o trabalho PEDIDO, e nao todo trabalho possivel.");
caso("documento sem traducao", { status: "done", conversion_status: "done", translation_status: "not_started" }, "pronto");
caso("enviado ao Kindle", { conversion_status: "done", send_status: "sent" }, "pronto");

console.log("\nFILA e o estado de quem ainda nao comecou — e o de quem terminou");
console.log("uma sub-etapa: OCR pronto com conversao pendente ainda espera.");
caso("recem enviado", { status: "uploaded", conversion_status: "pending" }, "fila");
caso("OCR pronto, conversao pendente", { ocr_status: "done", conversion_status: "pending" }, "fila");
// Aprendido rodando: ocr_status "needed" e propriedade do documento, nao fase.
// Trata-lo como fase deixava todo PDF digitalizado em "em preparo" para sempre.
caso("digitalizado e ja convertido", { status: "converted", ocr_status: "needed" }, "pronto");
caso("digitalizado, nada comecou", { status: "uploaded", ocr_status: "needed" }, "fila");
caso("sem resposta ainda", null, "fila");

console.log("\nO motivo do erro vem do BACKEND, nunca inventado aqui.");
const e = estadoDe({ send_status: "failed", send_error: "SMTP recusou o anexo" });
const temMotivo = e.motivo === "SMTP recusou o anexo" && e.etapa === "o envio ao Kindle";
if (!temMotivo) falhas++;
console.log(`  ${temMotivo ? "ok  " : "FALHA"} etapa e motivo preservados  ->  ${e.etapa} / ${e.motivo}`);

console.log("\nUma resposta REAL do backend, capturada em 30/08. O ocrmypdf nao");
console.log("estava instalado, e a falha de verdade virou o melhor caso de teste.");
const real = {
  upload_id: 1, status: "error", ocr_status: "needed",
  conversion_status: "not_started", send_status: "not_started",
  translation_status: "not_started", comic_translation_status: "not_started",
  error_message: "Erro na análise do PDF: No module named 'ocrmypdf'",
  send_error: null, comic_export_status: "not_started", comic_export_error: null,
  flow_mode: "advanced", active_operation: null, progress: null, phase: "failed",
};
const r = estadoDe(real);
const certo = r.estado === "erro" && /análise/.test(r.etapa) && /ocrmypdf/.test(r.motivo ?? "");
if (!certo) falhas++;
console.log(`  ${certo ? "ok  " : "FALHA"} resposta real -> ${r.estado} / ${r.etapa} / ${r.motivo}`);

console.log("\nTODO valor que o backend emite cai em balde nomeado.");
const orfaos = estadosNaoCobertos();
if (orfaos.length) { falhas++; orfaos.forEach((o) => console.log("  FALHA", o)); }
else console.log(`  ok   ${Object.values(VALORES).flat().length} valores, nenhum orfao`);

console.log(falhas ? `\n${falhas} falha(s)\n` : "\ntudo passou\n");
process.exit(falhas ? 1 : 0);

/* ─── O progresso, que agora carrega mais que a porcentagem ─────────────────
 *
 * `leProgresso` devolvia `null` sempre que a etapa nao contava passos, e junto
 * com o numero levava embora o `operation_id` — que e o unico jeito de cancelar
 * a operacao. O botao "Cancelar" do no 895:8029 nao tinha como existir.
 */
{
  const andando = (progress) =>
    estadoDe({ status: "converting", conversion_status: "in_progress", progress });

  const contavel = andando({
    operation_id: "op-1", stage: "ocr", current: 42, total: 96,
    message: "Reconhecendo", started_at: "2026-09-01T10:00:00Z",
  }).progresso;
  iguais(contavel.porcento, 44, "porcentagem arredondada");
  iguais(contavel.feito, 42, "paginas feitas");
  iguais(contavel.total, 96, "paginas ao todo");
  iguais(contavel.operacao, "op-1", "identificador da operacao");
  iguais(contavel.passo, "ocr", "nome da etapa do servidor");
  iguais(contavel.recado, "Reconhecendo", "recado do servidor");

  /* O CASO QUE FALTAVA: o Calibre e processo externo e reporta `total: None`.
     A operacao existe, tem nome e da para cancelar — so nao da para contar. */
  const solto = andando({
    operation_id: "op-2", stage: "convert", current: 0, total: null,
    message: "Convertendo via Calibre (sem estimativa)",
  }).progresso;
  iguais(solto === null, false, "etapa sem total ainda devolve objeto");
  iguais(solto.porcento, null, "sem total, sem porcentagem");
  iguais(solto.total, null, "sem total");
  iguais(solto.operacao, "op-2", "da para cancelar mesmo sem contagem");
  iguais(solto.passo, "convert", "a etapa continua nomeada");

  /* `null` passa a significar UMA coisa so: nao ha operacao. */
  iguais(andando(null).progresso, null, "sem progresso, sem objeto");
  iguais(andando("nao e objeto").progresso, null, "progresso invalido vira null");
}
