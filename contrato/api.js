/* O contrato com o backend, num lugar só.
 *
 * A DEC-0038 fundiu os repositórios justamente por isto: acrescentar um campo no
 * Python e exibi-lo na tela passa a ser UM commit, e este arquivo é onde os dois
 * lados se encontram. Antes eram dois repositórios sem nada que provasse que
 * batiam.
 *
 * As rotas foram LIDAS do backend em 30/08, não supostas. Cada uma abaixo existe
 * em backend/app/api/jobs.py, e o número da linha está junto para que a próxima
 * pessoa confira em vez de acreditar.
 *
 * As três primeiras são exatamente os verbos que a DEC-0011 §6 exige para o
 * frontend legado se aposentar: importar com validação, acompanhar a conversão
 * até o fim, e enviar ao Kindle.
 */
import { estadoDe } from "./estado.js";

const BASE = import.meta?.env?.VITE_API ?? "";

async function pede(caminho, opcoes) {
  const r = await fetch(BASE + caminho, opcoes);
  if (!r.ok) {
    // O corpo do erro do backend vale mais que o código HTTP: ele diz o que
    // aconteceu. Engolir e mostrar "erro 500" é o que faz o usuário abrir um
    // chamado que ninguém consegue responder.
    let detalhe = "";
    try { detalhe = (await r.json())?.detail ?? ""; } catch { /* corpo nao-JSON */ }
    const e = new Error(detalhe || `${r.status} em ${caminho}`);
    e.status = r.status;
    e.caminho = caminho;
    throw e;
  }
  return r.status === 204 ? null : r.json();
}

/** POST /upload — jobs.py:565. Importar. */
export function enviarArquivo(arquivo) {
  const corpo = new FormData();
  corpo.append("file", arquivo);
  return pede("/upload", { method: "POST", body: corpo });
}

/** GET /analyze/{upload_id} — jobs.py:653. Validar: páginas, se é digitalizado, o que foi detectado. */
export function analisar(uploadId) {
  return pede(`/analyze/${uploadId}`);
}

/** GET /jobs/{id}/status — jobs.py:827. A resposta leve, feita para polling. */
export async function situacao(jobId) {
  const bruto = await pede(`/jobs/${jobId}/status`);
  // Devolve o bruto JUNTO com o derivado. Quem precisar de um campo específico
  // tem acesso; quem só quer saber o estado não precisa reduzir de novo — e
  // reduzir de novo é como duas telas passam a discordar sobre o mesmo arquivo.
  return { ...estadoDe(bruto), bruto };
}

/** POST /jobs/{id}/convert — jobs.py:891. */
export function converter(jobId, opcoes = {}) {
  return pede(`/jobs/${jobId}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opcoes),
  });
}

/** POST /jobs/{id}/send — jobs.py:1201. Enviar ao Kindle. */
export function enviarAoKindle(jobId) {
  return pede(`/jobs/${jobId}/send`, { method: "POST" });
}

/** GET /history — jobs.py:688. A estante. */
export function historico() {
  return pede("/history");
}

/** GET /health — health.py:6. Serve para dizer "o backend não está no ar" em vez
 *  de deixar a tela vazia parecendo que não há nada. */
export async function backendNoAr() {
  try { await pede("/health"); return true; } catch { return false; }
}

/**
 * Acompanha até o fim, e para sozinho.
 *
 * Polling sem fim é como um erro vira consumo de bateria: se a conversão morreu
 * no servidor, o cliente pergunta para sempre. Aqui ele para em três casos —
 * pronto, erro, ou o teto de tentativas — e o teto é relatado, não silencioso.
 */
export async function acompanhar(jobId, aoMudar, { intervaloMs = 1500, tetoMs = 30 * 60 * 1000 } = {}) {
  const limite = Date.now() + tetoMs;
  let ultimo = null;
  while (Date.now() < limite) {
    const s = await situacao(jobId);
    const chave = `${s.estado}:${s.etapa ?? ""}:${s.progresso?.porcento ?? ""}`;
    if (chave !== ultimo) { ultimo = chave; aoMudar?.(s); }
    if (s.estado === "pronto" || s.estado === "erro") return s;
    await new Promise((r) => setTimeout(r, intervaloMs));
  }
  return { estado: "erro", etapa: "acompanhamento", motivo: `parei de perguntar depois de ${Math.round(tetoMs / 60000)} minutos` };
}
