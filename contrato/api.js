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
    try {
      const d = (await r.json())?.detail;
      /* O 422 DO FASTAPI VEM COMO LISTA, e não como frase.
       *
       * `{"detail": [{"loc": ["body","ate"], "msg": "..."}]}`. O código antigo
       * o punha inteiro num `new Error(...)`, e a tela mostrava
       * `[object Object]` — ou, pior, nada. Aconteceu no campo "Escrever sobre
       * o livro": o servidor recusava com um motivo escrito, e a tela ficava
       * muda.
       *
       * A mensagem que interessa é a `msg`; a `loc` fala de `ate` e de `de`
       * para quem só escreveu uma frase. */
      detalhe = Array.isArray(d)
        ? d.map((x) => x?.msg).filter(Boolean).join(". ")
        : (d ?? "");
    } catch { /* corpo nao-JSON */ }
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

/** GET /jobs/{id} — jobs.py:1349. Os dados do trabalho SEM re-executar nada.
 *
 * `analisar()` acima não é isto: ela bate em `/analyze/{id}`, que DISPARA a
 * análise. Chamá-la para "só ler" tem efeito colateral — e um deles custou o
 * R-54: disparar limpa `active_operation`, o campo que diria que já há uma
 * conversão em curso. Quem quer ler lê aqui. */
export function trabalho(jobId) {
  return pede(`/jobs/${jobId}`);
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
export async function esperarAnalise(jobId, aoMudar, { intervaloMs = 800, tetoMs = 5 * 60 * 1000 } = {}) {
  const limite = Date.now() + tetoMs;
  let ultimo = null;
  while (Date.now() < limite) {
    const bruto = await pede(`/jobs/${jobId}/status`);
    const agora = { ...estadoDe(bruto), bruto };
    /* AVISA A CADA MUDANCA, como o `acompanhar` da conversao ja fazia.
     *
     * Ela perguntava em silencio e so devolvia no fim, e a tela mostrava
     * "Analisando o arquivo..." — uma linha imovel — por todo o tempo. E esta e
     * a espera MAIS LONGA do produto: o reconhecimento de texto roda dentro da
     * analise, nao da conversao, e um PDF digitalizado de trezentas paginas fica
     * minutos aqui. */
    const chave = `${agora.estado}:${agora.progresso?.passo ?? ""}:${agora.progresso?.recado ?? ""}`;
    if (chave !== ultimo) { ultimo = chave; aoMudar?.(agora); }
    if (bruto.status !== "analyzing" && bruto.status !== "uploaded") {
      return agora;
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

/** PATCH /eu — como voce quer ser chamado. O e-mail NAO se muda por aqui: ele E
 *  a conta, e troca-lo e trocar de identidade. String vazia apaga o nome. */
export function mudarPerfil({ nome }) {
  return pede("/eu", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
}

/**
 * PUT /eu/retrato — manda a imagem. O servidor reescreve como PNG quadrado.
 *
 * SEM `Content-Type` A MAO. O `FormData` monta o `multipart/form-data` com a
 * fronteira que ele mesmo sorteou, e escrever o cabecalho por cima apaga essa
 * fronteira — o servidor recebe um corpo que nao sabe separar e responde 422.
 * O mesmo cuidado do `/notas/importar`.
 */
export function porRetrato(arquivo) {
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  return pede("/eu/retrato", { method: "PUT", body: corpo });
}

/** DELETE /eu/retrato — tira, e apaga o arquivo do disco junto. */
export function tirarRetrato() {
  return pede("/eu/retrato", { method: "DELETE" });
}

/* O ENDERECO DO RETRATO E FIXO, e nao vem do servidor: a rota nao tem parametro
 * nenhum — ela responde a quem o biscoito diz que e. Com `/retrato/{id}` haveria
 * como varrer numeros e recolher a cara de todo mundo.
 *
 * A `versao` existe para o navegador nao mostrar o rosto antigo depois da troca:
 * o endereco e sempre o mesmo, e sem ela a imagem em cache fica ate alguem
 * recarregar a mao. */
export function enderecoDoRetrato(versao) {
  return versao ? `/eu/retrato?v=${versao}` : "/eu/retrato";
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

/** PUT /jobs/{id}/estado-leitura — declara "to_read" | "reading" | "read".
 *
 * NAO TOCA NO PROGRESSO. Ela escreve uma coluna e nenhuma outra: capitulo,
 * deslocamento, capitulos e fracao ficam onde estavam, inclusive quando a linha
 * nasce agora para um livro que ninguem abriu.
 *
 * `null` DESFAZ a declaracao e devolve o estado a derivado da fracao — nao e o
 * mesmo que declarar "to_read".
 */
export function declararEstadoDeLeitura(jobId, estado) {
  return pede(`/jobs/${jobId}/estado-leitura`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
}

/** PUT /jobs/{id}/progresso — sem conta, o servidor ignora em silencio. */
export function gravarProgresso(jobId, { capitulo, deslocamento, capitulos, fracao }) {
  return pede(`/jobs/${jobId}/progresso`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    /* `capitulos` so vai quando quem chama sabe. O gravador de rolagem nao
     * sabe, e mandar `null` apagaria o total que o abridor do livro registrou.
     *
     * `fracao` segue a mesma regra, e ela e o numero que a ficha da estante
     * mostra: o servidor nao consegue derivar porcentagem porque nao conhece a
     * extensao do livro — o EPUB e aberto aqui. Quem sabe, manda. */
    body: JSON.stringify({
      capitulo,
      deslocamento,
      ...(capitulos ? { capitulos } : {}),
      ...(typeof fracao === "number" ? { fracao } : {}),
    }),
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

/* ─── A nota, sem falar de livro ─────────────────────────────────────────────
 *
 * As duas de cima ficam sob `/jobs/{id}/`, e a nota escrita no Canvas e a trazida
 * do Kindle tem `job_id` NULO. A tela chamava com `job_id ?? 0`, o filtro nao
 * casava com NULL, e o servidor respondia 404: editar ou apagar uma nota do
 * Canvas pela pagina dela era impossivel. Medido em 03/09.
 *
 * A identidade da nota e o id dela. O trabalho nunca foi necessario para acha-la.
 */

/** PATCH /notas/{id} — comentario, cor, estado e a marca de revisar. */
export function mudarNota(notaId, troca) {
  return pede(`/notas/${notaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(troca),
  });
}

/** DELETE /notas/{id} — com ou sem livro. */
export function apagarNotaPorId(notaId) {
  return pede(`/notas/${notaId}`, { method: "DELETE" });
}

/** POST /notas/{a}/dispensar/{b} — a pessoa recusou a sugestao, e ela nao volta.
 *
 * O par e normalizado no servidor: dispensar A→B vale para B→A tambem, senao a
 * sugestao recusada voltaria pelo outro lado. */
export function dispensarSugestao(notaId, outraId) {
  return pede(`/notas/${notaId}/dispensar/${outraId}`, { method: "POST" });
}

/** DELETE /notas/{a}/dispensar/{b} — devolve a sugestao. Sem isto, dispensar
 *  seria silencioso E permanente. */
export function desfazerDispensa(notaId, outraId) {
  return pede(`/notas/${notaId}/dispensar/${outraId}`, { method: "DELETE" });
}

/* ─── Os marcadores ─────────────────────────────────────────────────────────
 *
 * A dobra de pagina: o lugar para onde se quer voltar. Mesma ancora das notas e
 * do progresso — capitulo e deslocamento —, e nada mais: sem cor, sem
 * comentario, sem trecho selecionado. O que a lista mostra e o texto que estava
 * naquele ponto, guardado junto, porque "capitulo 4, caractere 8112" nao diz
 * nada sobre o lugar que se quis guardar.
 *
 * Nao e uma nota com um campo a mais, e a razao esta em
 * `backend/app/models/marcador.py`: a nota aparece no Canvas, nos Estudos e em
 * /notas, e uma dobra de pagina nao pertence a nenhuma dessas telas.
 */

/** GET /jobs/{id}/marcadores — lista vazia sem conta, e nao erro. */
export function lerMarcadores(jobId) {
  return pede(`/jobs/${jobId}/marcadores`);
}

/** POST /jobs/{id}/marcadores — idempotente: dobrar o mesmo lugar duas vezes
 *  devolve a dobra que ja existe, com `ja_estava`, em vez de 409. */
export function marcarLugar(jobId, { capitulo, deslocamento, trecho = "" }) {
  return pede(`/jobs/${jobId}/marcadores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capitulo, deslocamento, trecho }),
  });
}

export function apagarMarcador(jobId, marcadorId) {
  return pede(`/jobs/${jobId}/marcadores/${marcadorId}`, { method: "DELETE" });
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

/**
 * GET /notas/agrupadas — os assuntos que apareceram no acervo sem ninguem
 * organizar. E a secao "Voce ligou" do no 895:8849.
 *
 * NAO E `lerSugestoes` COM OUTRO NOME. Aquela responde "o que se parece com
 * ESTA nota" e vive na pagina de uma nota; esta varre o acervo inteiro e
 * responde "que fios existem no que eu ja marquei".
 */
export function lerAgrupadas() {
  return pede("/notas/agrupadas");
}

/**
 * POST /notas/agrupadas/ignorar — para de sugerir este grupo.
 *
 * O grupo e identificado pelas NOTAS que o formam, e nao por um id: grupos nao
 * existem como registro, nascem de uma varredura do acervo.
 *
 * A consequencia disso e escolhida e e a certa: um grupo ignorado que ganha uma
 * nota nova VOLTA a aparecer. Ignorar nao e "nunca mais me fale disso"; e "com
 * estas notas, ja entendi".
 */
export function ignorarGrupo(notas) {
  return pede("/notas/agrupadas/ignorar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notas }),
  });
}

/** DELETE /notas/agrupadas/ignorados — volta a mostrar todos. Sem isto, ignorar
 *  seria irreversivel — e ignorar nao e apagar. */
export function ouvirGruposDeNovo() {
  return pede("/notas/agrupadas/ignorados", { method: "DELETE" });
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

/* `largura` e opcional: arrastar manda so x e y, esticar manda os tres. A rota e
 * a mesma porque do ponto de vista de quem usa e o mesmo gesto — mexer no
 * cartao. */
/* `grupo_id` tem TRES estados e os tres importam: ausente nao mexe no vinculo,
 * `null` tira da seçao, e um numero poe nela. Por isso o corpo e montado campo a
 * campo — um objeto com `grupo_id: undefined` vira JSON sem a chave, que e o
 * "ausente" certo, mas depender disso por acidente seria fragil. */
function corpoDoMovimento(x, y, largura, grupo) {
  const corpo = { x, y };
  if (largura !== undefined) corpo.largura = largura;
  if (grupo !== undefined) corpo.grupo_id = grupo;
  return JSON.stringify(corpo);
}

export function moverNoCanvas(id, x, y, largura, grupo) {
  return pede(`/canvas/nos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: corpoDoMovimento(x, y, largura, grupo),
  });
}

/* A FOTO VAI COMO `FormData`, e nao como JSON com base64: base64 cresce um terco
 * e obriga o servidor a decodificar uma string enorme na memoria antes de saber
 * se aquilo e imagem. O `Content-Type` fica por conta do navegador — escrito a
 * mao, falta o `boundary` e o servidor nao consegue separar os campos. */
export function porMidiaNoCanvas(arquivo, x, y, legenda = "") {
  const pacote = new FormData();
  pacote.append("arquivo", arquivo);
  pacote.append("x", String(x));
  pacote.append("y", String(y));
  pacote.append("legenda", legenda);
  return pede("/canvas/midia", { method: "POST", body: pacote });
}

/* O LIVRO NA SUPERFICIE. Referencia e nao copia: o que vai e volta e a POSICAO,
 * e o livro continua sendo da estante. Tirar daqui nao apaga nada. */
/* A seçao volta com o MESMO id — ver `apagado_em` em models/canvas.py. */
export function voltarGrupo(id) {
  return pede(`/canvas/grupos/${id}/voltar`, { method: "POST" });
}

export function porLivroNoCanvas(job_id, x, y) {
  return pede("/canvas/livros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id, x, y }),
  });
}

export function moverLivroNoCanvas(id, x, y, largura, grupo) {
  return pede(`/canvas/livros/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: corpoDoMovimento(x, y, largura, grupo),
  });
}

export function tirarLivroDoCanvas(id) {
  return pede(`/canvas/livros/${id}`, { method: "DELETE" });
}

/** Tira da superficie SEM apagar a nota — o item 5 do contrato. */
export function tirarDoCanvas(id) {
  return pede(`/canvas/nos/${id}`, { method: "DELETE" });
}

/* A PONTA E `(tipo, id)`, e a chave composta do Canvas ja e exatamente isso —
 * `nota:12`, `livro:3`. Por isso a funcao recebe as chaves inteiras: quem chama
 * nao precisa desmontar nada, e nao ha como trocar o tipo de lugar. */
/* A tela de Nota liga NOTA a NOTA, e continua falando em ids — ela nao conhece o
 * Canvas nem chaves compostas. Este atalho traduz, e e o unico lugar que precisa
 * saber que a ponta tem tipo. */
export function ligarNotas(a, b) {
  return ligar(`nota:${a}`, `nota:${b}`);
}

export function ligar(chaveA, chaveB) {
  const [de_tipo, de_id] = chaveA.split(":");
  const [para_tipo, para_id] = chaveB.split(":");
  return pede("/canvas/ligacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ de_tipo, de_id: Number(de_id), para_tipo, para_id: Number(para_id) }),
  });
}

export function desligarNotas(id) {
  return pede(`/canvas/ligacoes/${id}`, { method: "DELETE" });
}

/** GET /sessoes — os navegadores em que voce entrou.
 *
 * Sem conta devolve lista vazia, e nao erro: o mesmo criterio do `/eu`. */
export function lerSessoes() {
  return pede("/sessoes");
}

/** POST /sessoes/{id}/encerrar — derruba UM navegador. */
export function encerrarSessao(id) {
  return pede(`/sessoes/${id}/encerrar`, { method: "POST" });
}

/** POST /sessoes/encerrar-outras — sai de todos os outros, e mantem este.
 *
 * Devolve quantos cairam: "pronto" sem numero nao deixa a pessoa saber se havia
 * alguma coisa la. */
export function encerrarOutrasSessoes() {
  return pede("/sessoes/encerrar-outras", { method: "POST" });
}

/** GET /notas/{id}/sugestoes — que outras notas parecem falar do mesmo assunto.
 *
 * Devolve duas faixas — `proximas` e `talvez` — e os `cortes` que as separam,
 * porque limiar escondido e limiar em que ninguem pode discordar. Cada sugestao
 * traz as PALAVRAS em comum, e nao so quantas. */
export function lerSugestoes(notaId) {
  return pede(`/notas/${notaId}/sugestoes`);
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

export function ligarAparelho({ endereco, nome = "", modelo = null }) {
  return pede("/aparelhos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endereco, nome, modelo }),
  });
}

/** GET /aparelhos/modelos — os Kindles que o produto conhece, com a tela de
 *  cada um ja escrita.
 *
 *  A LISTA VEM DO SERVIDOR, e nao daqui: e ela que decide o perfil do conversor
 *  de quadrinhos, e uma segunda copia na tela e como as duas passam a discordar
 *  sobre a resolucao de um aparelho. */
export function modelosDeKindle() {
  return pede("/aparelhos/modelos");
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

/* ---------------------------------------------------------------------------
 * A busca do cabeçalho — nó 941:23107.
 * ------------------------------------------------------------------------- */

/** GET /buscar — busca.py. Livros, notas e estudos, em grupos separados. */
export function buscarNoMekora(termo) {
  return pede(`/buscar?q=${encodeURIComponent(termo)}`);
}

/* ---------------------------------------------------------------------------
 * Configurações de arquivo — nó 941:23118.
 * ------------------------------------------------------------------------- */

/** POST /jobs/{id}/metadata — jobs.py. "Renomear": só o nome do arquivo final. */
export function renomearArquivo(jobId, final_filename) {
  return pede(`/jobs/${jobId}/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ final_filename }),
  });
}

/**
 * GET /metrics/costuma-levar — quanto cada etapa costuma demorar, MEDIDO.
 *
 * E o "01:10" do no 895:8029, que ficou de fora porque era previsao: nem o
 * Calibre nem o ocrmypdf estimam nada. O que mudou e que agora ha historico — a
 * mediana das execucoes que terminaram nao preve, conta o que aconteceu nesta
 * maquina, com estes arquivos.
 *
 * Devolve `{}` enquanto nao houver medidas suficientes, e a tela cala.
 */
export function quantoCostumaLevar() {
  return pede("/metrics/costuma-levar");
}

/* ─── Traducao ──────────────────────────────────────────────────────────────
 *
 * A TELA PERGUNTA AO SERVIDOR O QUE EXISTE, e nao oferece uma lista escrita a
 * mao. A traducao roda local, por pacote de idioma instalado na maquina — e
 * numa instalacao sem o motor, ou sem o par baixado, oferecer "portugues para
 * ingles" e prometer o que responde 409.
 */

/** GET /translation/engines — quais motores existem, e se estao instalados. */
export function motoresDeTraducao() {
  return pede("/translation/engines");
}

/** GET /translation/engines/pairs — os pares REALMENTE instalados, por motor.
 *  Codigos ISO 639-2 de tres letras: por, eng, spa. */
export function paresDeTraducao() {
  return pede("/translation/engines/pairs");
}

/** POST /jobs/{id}/metadata — de que idioma para qual. O `translate` nao recebe
 *  os idiomas: ele os LE do trabalho, entao eles sao gravados antes. */
export function escolherIdiomas(jobId, { source_language, target_language }) {
  return pede(`/jobs/${jobId}/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ translation_enabled: true, source_language, target_language }),
  });
}

/** POST /jobs/{id}/translate — dispara a traducao. Gera um SEGUNDO arquivo; o
 *  original fica intacto, e e dele que a conversao parte se ninguem pedir. */
export function traduzir(jobId) {
  return pede(`/jobs/${jobId}/translate`, { method: "POST" });
}

/**
 * POST /jobs/{id}/senha — a senha do PDF, usada uma vez para tirar a protecao.
 *
 * A SENHA NAO E GUARDADA em lugar nenhum: ela abre o arquivo, o arquivo e
 * regravado sem protecao, e a variavel morre com a requisicao. Nem banco, nem
 * log, nem metrica.
 *
 * 403 quer dizer "essa senha nao abre", e nao "voce nao pode": a requisicao
 * esta bem formada e o servidor a entendeu — o que faltou foi a credencial.
 */
export function destravarComSenha(jobId, senha) {
  return pede(`/jobs/${jobId}/senha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senha }),
  });
}

/** POST /jobs/{id}/duplicate — jobs.py. "Refazer a preparação": mesmo arquivo,
 *  do começo. `metadata_only` é o único modo que existe, e é o que o desenho
 *  descreve — "Nada é enviado de novo". */
export function refazerPreparo(jobId) {
  return pede(`/jobs/${jobId}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "metadata_only" }),
  });
}

/**
 * POST /jobs/{id}/operations/{op}/cancel — jobs.py. O "Cancelar" do 895:8029.
 *
 * É COOPERATIVO, e a tela precisa dizer isso. O backend grava um pedido de
 * cancelamento e a etapa o lê entre um passo e outro; processos externos —
 * Calibre, ocrmypdf, o tradutor — não são interrompidos no meio. Quem clica
 * espera o fim do passo corrente, não um corte imediato.
 *
 * O `op` vem do próprio progresso (`operation_id`), e não de um estado guardado
 * na tela: se a operação trocar entre uma pergunta e outra, cancelar a antiga
 * responderia 409 — "Esta operação não está mais ativa para o job."
 */
export function cancelarOperacao(jobId, operacao) {
  return pede(`/jobs/${jobId}/operations/${encodeURIComponent(operacao)}/cancel`, {
    method: "POST",
  });
}

/** DELETE /jobs/{id} — jobs.py. "Remover da estante". Não dá para desfazer. */
export function removerDaEstante(jobId) {
  return pede(`/jobs/${jobId}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------------------
 * Os grupos do Canvas — nó 895:6938.
 * ------------------------------------------------------------------------- */

/** POST /canvas/grupos — canvas.py. Uma área nomeada na superfície. */
export function criarGrupo(g) {
  return pede("/canvas/grupos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(g),
  });
}

/** PATCH /canvas/grupos/{id} — mover, renomear e redimensionar são o mesmo
 *  pedido porque são o mesmo objeto. */
export function mudarGrupo(id, troca) {
  return pede(`/canvas/grupos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(troca),
  });
}

/** DELETE /canvas/grupos/{id} — some o retângulo; as notas em cima dele ficam. */
export function apagarGrupo(id) {
  return pede(`/canvas/grupos/${id}`, { method: "DELETE" });
}

/** GET /canvas/previa — canvas.py. O título, a descrição e a imagem de um
 *  endereço posto no Canvas. Devolve `{ recusada }` quando não dá para montar a
 *  prévia — e isso não é erro: a nota continua válida com o link dentro. */
export function previaDoLink(url) {
  return pede(`/canvas/previa?url=${encodeURIComponent(url)}`);
}

/* O RECADO. Não é uma rota de trabalho: ela não pede chave nem sessão, e é
 * pública de propósito — quem converteu sem conta (DEC-0018) é justamente quem
 * tem a primeira impressão, e exigir cadastro para reclamar garante que só quem
 * já gostou reclame. */

/** O teto do texto, o mesmo do modelo em `app/models/recado.py`.
 *
 * Ele mora aqui porque a tela precisa dizer quantos caracteres faltam ANTES de
 * mandar. Um número diferente dos dois lados corta a frase de alguém sem aviso —
 * e é o backend que ganha, calado, depois de a pessoa já ter escrito. */
export const LIMITE_DO_RECADO = 2000;

/** POST /recados — recados.py:47. */
export function mandarRecado({ texto, humor, onde, email }) {
  return pede("/recados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, humor, onde, email: email || null }),
  });
}
