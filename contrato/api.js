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

/* NAO existe base de API configuravel, e a ausencia e deliberada.
 *
 * Havia `import.meta.env.VITE_API`, e ele nao funcionava: este arquivo mora fora
 * da raiz do Vite, entao a substituicao de build nunca o alcancava. O literal
 * `import.meta.env` sobrevivia ate o navegador, onde e undefined — a base virava
 * "" e o build passava verde.
 *
 * A correcao nao foi fazer a variavel funcionar. O proprio vite.config ja tinha
 * escrito a regra: "o caminho da chamada e o MESMO em dev e em producao". A
 * borda repassa `/upload` para `/upload`, e nao ha ambiente onde o caminho seja
 * outro — logo nao ha o que configurar, nem como configurar errado. */
const BASE = "";

/* AS CHAVES DOS TRABALHOS DESTA MAQUINA.
 *
 * A partir da DEC-0039, toda rota que fala de um trabalho especifico exige
 * prova: a sessao do dono, ou a chave do trabalho. Um trabalho feito SEM conta
 * — que a DEC-0018 garante existir — nao tem dono para conferir, entao a prova
 * e conhecer a chave.
 *
 * Ela fica no `localStorage`, e a diferenca em relacao a sessao e o que decide:
 * a SESSAO nunca mora aqui, porque o que o JavaScript da pagina le, o
 * JavaScript injetado numa pagina tambem le — e ela vive num cookie httpOnly.
 * A chave de um trabalho vale para UM trabalho, o proprio navegador ja a
 * conhece por te-lo criado, e sem ela o arquivo que a pessoa acabou de enviar
 * simplesmente nao abre depois de fechar a aba.
 */
const CHAVES = "mekora:chaves";

function chaves() {
  try { return JSON.parse(localStorage.getItem(CHAVES) || "{}"); } catch { return {}; }
}

export function guardarChave(id, chave) {
  if (!id || !chave) return;
  try { localStorage.setItem(CHAVES, JSON.stringify({ ...chaves(), [id]: chave })); } catch { /* sem espaco */ }
}

export function chaveDe(id) {
  return chaves()[String(id)] ?? null;
}

/* Acha o numero do trabalho no caminho para saber qual chave apresentar. Sem
 * isto, cada chamada precisaria receber a chave de quem a chama — e o lugar
 * esquecido nao daria erro de compilacao, daria um 404 na tela. */
const NO_CAMINHO = /^\/(?:jobs|analyze|batch)\/(\d+)/;

/* O que dizer quando o backend nao explicou o proprio erro. */
function frasePara(status, caminho) {
  if (status >= 500) return "O Mekora não está respondendo agora. Tente de novo em instantes.";
  if (status === 404) return "Isso não foi encontrado.";
  if (status === 401 || status === 403) return "Entre para continuar.";
  if (status === 413) return "O arquivo é grande demais.";
  if (status === 429) return "Muitos pedidos seguidos. Espere um pouco.";
  return `Não foi possível completar (${status} em ${caminho}).`;
}

async function pede(caminho, opcoes) {
  const m = NO_CAMINHO.exec(caminho);
  const chave = m ? chaveDe(m[1]) : null;
  if (chave) {
    opcoes = { ...opcoes, headers: { "X-Mekora-Chave": chave, ...(opcoes?.headers ?? {}) } };
  }
  let r;
  try {
    r = await fetch(BASE + caminho, opcoes);
  } catch (falha) {
    /* `fetch` LANCA quando nao ha resposta nenhuma: rede caida, servidor
     * inalcancavel, DNS. A mensagem nativa e "Failed to fetch", que nao diz a
     * ninguem o que fazer. */
    const e = new Error("Sem conexão com o Mekora. Verifique a internet e tente de novo.");
    e.rede = true;
    e.caminho = caminho;
    e.original = falha?.message;
    throw e;
  }

  if (!r.ok) {
    // O corpo do erro do backend vale mais que o código HTTP: ele diz o que
    // aconteceu. Engolir e mostrar "erro 500" é o que faz o usuário abrir um
    // chamado que ninguém consegue responder.
    let detalhe = "";
    try { detalhe = (await r.json())?.detail ?? ""; } catch { /* corpo nao-JSON */ }
    /* SEM DETALHE, UMA FRASE E NAO UM CODIGO.
     *
     * O fallback era `${r.status} em ${caminho}` — "500 em /upload" —, que e
     * util para quem escreve o codigo e inutil para quem esta usando o produto.
     * Ele aparecia justamente no pior caso: o backend fora do ar, quando nao ha
     * corpo de erro nenhum para explicar.
     *
     * O caminho e o codigo continuam no objeto do erro, para quem depurar. */
    const e = new Error(detalhe || frasePara(r.status, caminho));
    e.status = r.status;
    e.caminho = caminho;
    throw e;
  }
  return r.status === 204 ? null : r.json();
}

/** POST /upload — jobs.py:565. Importar. */
export async function enviarArquivo(arquivo) {
  const corpo = new FormData();
  corpo.append("file", arquivo);
  const r = await pede("/upload", { method: "POST", body: corpo });
  /* A chave e guardada AQUI, na unica volta em que ela existe. Deixar isso para
   * quem chama significaria um lugar esquecido — e o esquecimento nao daria erro
   * agora: daria um 404 depois, quando a pessoa voltasse para abrir o arquivo. */
  guardarChave(r?.upload_id, r?.endereco);
  return r;
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

/**
 * Espera a análise terminar antes de deixar converter.
 *
 * `GET /analyze/{id}` DISPARA a análise e volta na hora, com `status:
 * "analyzing"`. Chamar `converter()` em seguida falha, e o backend diz por quê:
 * *"Job deve estar analisado antes de converter (status atual: analyzing)."*
 *
 * Isso só apareceu quando a mensagem do backend chegou até a tela. Enquanto ela
 * era engolida, o arquivo ficava "em preparo" para sempre e parecia lentidão.
 *
 * A espera mora aqui porque é conhecimento sobre o CICLO DE VIDA do backend —
 * se ficasse na tela, a próxima tela que converter repetiria o mesmo erro.
 */
export async function esperarAnalise(jobId, { intervaloMs = 800, tetoMs = 5 * 60 * 1000 } = {}) {
  const limite = Date.now() + tetoMs;
  while (Date.now() < limite) {
    const bruto = await pede(`/jobs/${jobId}/status`);
    if (bruto.status !== "analyzing" && bruto.status !== "uploaded") {
      return { ...estadoDe(bruto), bruto };
    }
    await new Promise((r) => setTimeout(r, intervaloMs));
  }
  throw new Error(`a análise não terminou em ${Math.round(tetoMs / 60000)} minutos`);
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

/* ─── Entrar ────────────────────────────────────────────────────────────────
 *
 * As tres chamadas do acesso. Nenhuma delas manda ou recebe a sessao: ela vive
 * num cookie httpOnly, que o navegador anexa sozinho e o JavaScript nao le
 * (DEC-0039 §4). E por isso que nao ha nada aqui parecido com `guardarSessao`.
 */

/** POST /entrar/pedir — pede o link. Responde igual sempre, inclusive no limite.
 *
 * O caminho tem `/pedir` porque `/entrar` sozinho e a TELA. Abaixo dela, o
 * backend; nela, a caixa de e-mail. A borda separa por caminho, e nao por
 * metodo HTTP — que seria uma sutileza a mais para alguem quebrar sem ver. */
export function pedirLink(email) {
  return pede("/entrar/pedir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

/** GET /eu — quem esta logado. Nao entrar NAO e erro: e estado previsto. */
export function quemSouEu() {
  return pede("/eu");
}

/** POST /sair — encerra no servidor, e nao so apaga o cookie. */
export function sair() {
  return pede("/sair", { method: "POST" });
}

/* ─── Onde a pessoa parou ───────────────────────────────────────────────────
 *
 * Capitulo e deslocamento, e nao pagina. A pagina muda quando a fonte muda —
 * aumentar o corpo do texto faz a pagina 40 virar outro trecho —, entao voltar
 * para "a pagina 40" devolve a pessoa a um lugar que ela nao deixou.
 */

/** GET /jobs/{id}/progresso — devolve o comeco do livro se nao houver marca. */
export function lerProgresso(jobId) {
  return pede(`/jobs/${jobId}/progresso`);
}

/** PUT /jobs/{id}/progresso — sem conta, o servidor ignora em silencio. */
export function gravarProgresso(jobId, { capitulo, deslocamento, capitulos }) {
  return pede(`/jobs/${jobId}/progresso`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    /* `capitulos` so vai quando quem chama sabe. O gravador de rolagem nao
     * sabe, e mandar `null` apagaria o total que o abridor do livro registrou. */
    body: JSON.stringify({ capitulo, deslocamento, ...(capitulos ? { capitulos } : {}) }),
  });
}

/* ─── As notas ──────────────────────────────────────────────────────────────
 *
 * Ancoradas em capitulo e deslocamento — o mesmo par do progresso e da enfase do
 * autor. O trecho vai junto: se a extracao mudar, o deslocamento escorrega, e o
 * trecho e o que permite perceber isso em vez de destacar a palavra errada com
 * toda a confianca.
 */

/** GET /jobs/{id}/notas — lista vazia sem conta, e nao erro. */
/** POST /notas/importar — o `My Clippings.txt` do Kindle.
 *
 * Reimportar NAO duplica: o arquivo do Kindle cresce e nunca e limpo sozinho,
 * entao a segunda importacao traz tudo da primeira mais o que e novo. */
export function importarClippings(arquivo) {
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  return pede("/notas/importar", { method: "POST", body: corpo });
}

/** GET /notas — todas as notas da pessoa, de todos os livros. */
export function lerTodasAsNotas() {
  return pede("/notas/todas");
}

/** GET /notas/{id} — uma nota, com estudos, ligadas e o livro de onde veio. */
export function lerNota(id) {
  return pede(`/notas/${id}`);
}

export function lerNotas(jobId) {
  return pede(`/jobs/${jobId}/notas`);
}

/** POST /jobs/{id}/notas — 401 sem conta: anotar sem onde guardar perderia o
 *  que a pessoa escreveu sem avisar. */
export function criarNota(jobId, nota) {
  return pede(`/jobs/${jobId}/notas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nota),
  });
}

export function editarNota(jobId, notaId, troca) {
  return pede(`/jobs/${jobId}/notas/${notaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(troca),
  });
}

export function apagarNota(jobId, notaId) {
  return pede(`/jobs/${jobId}/notas/${notaId}`, { method: "DELETE" });
}

/* ─── Os Kindles da pessoa ──────────────────────────────────────────────────
 *
 * O destino de um envio era `KINDLE_EMAIL`, uma variável do servidor — portanto
 * UM endereço para a instalação inteira. Na máquina de quem desenvolve isso
 * funciona, porque a instalação e a pessoa são a mesma; servido na internet,
 * todo envio de todo mundo iria para o mesmo aparelho.
 */

/** GET /config/formatos — o que o Mekora aceita, dito por quem decide.
 *
 * A tela listava seis extensoes escritas a mao e elas divergiam nos DOIS
 * sentidos: ofereciam `.zip`, que o backend recusa, e escondiam ODT, RTF, TXT,
 * HTML, CB7 e CBC, que ele aceita. */
/** GET /preferencias — vazio sem conta, e a tela usa os padroes. */
/* ─── Privacidade ───────────────────────────────────────────────────────────
 *
 * A lista do que o Mekora guarda e CONTADA no banco, e nao escrita a mao: um
 * texto de politica envelhece na primeira coluna nova, e vira uma promessa que
 * ninguem confere.
 */

/* ─── O Canvas ──────────────────────────────────────────────────────────────
 *
 * "Canvas organiza. Conexoes descobre." (DEC-0030). As entidades sao as MESMAS
 * do resto do Mekora: o Canvas nao cria "nota de Canvas" nem relacao propria.
 */

/* ─── Os Estudos ────────────────────────────────────────────────────────────
 *
 * Um estudo e uma pergunta — ou uma afirmacao — com o que voce reuniu em volta
 * dela. Os livros nao sao campo: saem das notas.
 */

export function lerEstudos() {
  return pede("/estudos/meus");
}

export function criarEstudo({ nome, sobre = "" }) {
  return pede("/estudos/novo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, sobre }),
  });
}

export function mudarEstudo(id, troca) {
  return pede(`/estudos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(troca),
  });
}

export function apagarEstudo(id) {
  return pede(`/estudos/${id}`, { method: "DELETE" });
}

export function reunirNoEstudo(id, nota_id) {
  return pede(`/estudos/${id}/notas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nota_id }),
  });
}

export function tirarDoEstudo(id, nota_id) {
  return pede(`/estudos/${id}/notas/${nota_id}`, { method: "DELETE" });
}

export function lerCanvas() {
  return pede("/canvas/superficie");
}

/** Traz uma nota que ja existe (nota_id) ou cria uma solta (texto). */
export function porNoCanvas(o) {
  return pede("/canvas/nos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(o),
  });
}

export function moverNoCanvas(id, x, y) {
  return pede(`/canvas/nos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x, y }),
  });
}

/** Tira da superficie SEM apagar a nota — o item 5 do contrato. */
export function tirarDoCanvas(id) {
  return pede(`/canvas/nos/${id}`, { method: "DELETE" });
}

export function ligarNotas(de_id, para_id) {
  return pede("/canvas/ligacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ de_id, para_id }),
  });
}

export function desligarNotas(id) {
  return pede(`/canvas/ligacoes/${id}`, { method: "DELETE" });
}

export function lerPrivacidade() {
  return pede("/privacidade");
}

export function levarMeusDados() {
  return pede("/privacidade/levar");
}

/** POST /privacidade/apagar — exige o e-mail digitado. Nao ha volta. */
export function apagarMinhaConta(email) {
  return pede("/privacidade/apagar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function lerPreferencias() {
  return pede("/preferencias");
}

/** PUT /preferencias — grava so o que vai, e nao substitui o conjunto.
 *
 * Um PUT que apagasse as chaves ausentes faria uma versao antiga da tela, que
 * nao conhece uma opcao nova, apagar a escolha da pessoa sem ninguem pedir. */
export function gravarPreferencias(escolhas) {
  return pede("/preferencias", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ escolhas }),
  });
}

export function lerFormatos() {
  return pede("/config/formatos");
}

export function lerAparelhos() {
  return pede("/aparelhos");
}

export function ligarAparelho({ endereco, nome = "" }) {
  return pede("/aparelhos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endereco, nome }),
  });
}

export function mudarAparelho(id, troca) {
  return pede(`/aparelhos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(troca),
  });
}

export function desligarAparelho(id) {
  return pede(`/aparelhos/${id}`, { method: "DELETE" });
}
