/* A derivação: sete estados do backend viram um estado de tela.
 *
 * POR QUE ISTO EXISTE, e por que num arquivo só.
 *
 * O backend carrega sete campos de estado ao mesmo tempo — `status`,
 * `ocr_status`, `conversion_status`, `send_status`, `translation_status`,
 * `comic_translation_status` e `comic_export_status`. A tela mostra UM.
 *
 * Espalhar essa redução pelos componentes é o que faz duas telas discordarem
 * sobre o mesmo arquivo: a fila diz "pronto" e a estante diz "convertendo",
 * porque cada uma olhou um campo diferente. Aqui a redução acontece uma vez, e
 * é a mesma para quem perguntar.
 *
 * E ela obedece a regra do produto: **estado é derivado, nunca mantido**. Não
 * existe campo de status que alguém precise atualizar — é a primeira coisa que
 * fica desatualizada, e aí o filtro mente com a culpa do usuário.
 *
 * OS VALORES SÃO LIDOS DO BACKEND, não inventados. Foram extraídos do código
 * Python em 30/08; a lista está em VALORES abaixo, e `estadosNaoCobertos()`
 * existe para que um valor novo apareça como falha de teste e não como tela em
 * branco.
 */

/* O que o backend pode emitir. Lido de backend/, não suposto — e lido de DOIS
 * lugares, porque um só não bastou.
 *
 * A primeira versão varreu atribuições e comparações no código Python e deu a
 * lista por completa. A primeira chamada ao vivo devolveu
 * `conversion_status: "not_started"`, que não estava nela: o valor não vinha de
 * atribuição nenhuma, vinha do **padrão do schema Pydantic**. Um campo que
 * ninguém escreve ainda assim chega na resposta.
 *
 * Varredura de código encontra o que é escrito. O que é omitido só aparece
 * quando alguém chama. */
export const VALORES = {
  status: ["uploaded", "analyzing", "analyzed", "converting", "converted", "sending", "done", "success", "completed", "error", "failed", "interrupted", "skipped"],
  ocr_status: ["not_needed", "needed", "done", "failed"],
  conversion_status: ["not_started", "pending", "in_progress", "done", "failed"],
  send_status: ["not_started", "pending", "in_progress", "sent", "failed"],
  translation_status: ["not_started", "in_progress", "done", "failed"],
  comic_translation_status: ["not_started", "in_progress", "done", "failed"],
  comic_export_status: ["not_started", "in_progress", "done", "failed"],
};

/** Os cinco estados que a interface conhece. Mais que isto vira ruído.
 *
 * "PRECISA" É O QUINTO, e ele entrou porque faltava mesmo — não por gosto de
 * simetria. Um PDF com senha não estava com erro (nada falhou), não estava
 * trabalhando (nada anda) e não estava na fila (a fila não vai chegar nele
 * sozinha). Ele espera uma decisão da pessoa, e sem um estado próprio a tela
 * dizia "com erro" para um arquivo que só precisava de uma senha. */
export const ESTADOS = ["precisa", "fila", "trabalhando", "pronto", "erro"];

const FALHOU = new Set(["failed", "error", "interrupted"]);
const ANDANDO = new Set(["in_progress", "analyzing", "converting", "sending"]);
/* Valores que legitimamente NÃO mexem no estado de tela. Uma sub-etapa concluída
 * — OCR, tradução, exportação — não deixa o arquivo pronto: ela só terminou a
 * parte dela. Estão nomeados aqui, e não escondidos, para que a lista sirva de
 * resposta a "e o `done` do OCR, por que não conta?". */
const NEUTRO = new Set(["uploaded", "pending", "not_started", "not_needed", "needed", "skipped", "done", "sent", "success", "completed", "converted", "analyzed"]);

/**
 * Reduz um JobStatusResponse a um estado de tela.
 *
 * A ORDEM IMPORTA, e é esta de propósito:
 *
 *  1. ERRO vence tudo. Um arquivo que falhou em qualquer etapa está com erro,
 *     mesmo que outra etapa tenha concluído — mostrar "pronto" porque a
 *     conversão terminou, quando o envio falhou, é mentir sobre o que o usuário
 *     vai encontrar no Kindle.
 *  2. TRABALHANDO vence pronto, pela mesma razão ao contrário: enquanto uma
 *     etapa anda, o arquivo não está pronto.
 *  3. PRONTO exige que o trabalho pedido tenha terminado — e o que foi pedido
 *     depende do que o arquivo é. Um documento que não pede tradução está
 *     pronto sem ela; exigir `translation_status: done` de todo mundo faria
 *     metade da estante parecer inacabada para sempre.
 */
export function estadoDe(j) {
  if (!j) return { estado: "fila", motivo: "sem resposta do backend ainda" };

  /* BLOQUEIO VEM ANTES DE TUDO, inclusive do erro.
   *
   * Um arquivo travado esperando senha tem, no banco, `ocr_status: "needed"` e
   * texto nenhum — e se a análise tivesse seguido, teria `error_message`
   * também. Deixar o erro decidir primeiro faria a tela dizer "OCR falhou" para
   * um arquivo que só precisa de uma senha, que é exatamente o que ela dizia
   * antes de este estado existir.
   *
   * `bloqueio` guarda o NOME do motivo, e a tela o traduz. Nulo é o normal. */
  if (j.bloqueio) {
    return { estado: "precisa", bloqueio: j.bloqueio };
  }

  /* Os rótulos são o que o usuário lê, então são frases e não nomes de campo.
   * "Parou em: status" não fala com ninguém; "Parou em: a análise do arquivo"
   * fala. O nome do campo continua disponível em `bruto`, para quem depura. */
  const erro = [
    ["a análise do arquivo", j.status],
    ["a conversão", j.conversion_status],
    ["o envio ao Kindle", j.send_status],
    ["a leitura do texto na imagem", j.ocr_status],
    ["a tradução", j.translation_status],
    ["a tradução do quadrinho", j.comic_translation_status],
    ["a exportação", j.comic_export_status],
  ].find(([, v]) => FALHOU.has(v));

  if (erro) {
    return {
      estado: "erro",
      etapa: erro[0],
      // A mensagem vem do backend. Inventar texto de erro aqui esconderia o que
      // realmente aconteceu atrás de uma frase genérica.
      motivo: j.error_message || j.send_error || j.comic_export_error || null,
    };
  }

  /* `ocr_status: "needed"` NÃO entra aqui, e isso foi aprendido rodando.
   *
   * A primeira versão o tratava como fase, e a primeira execução contra o
   * backend real mostrou o custo: o backend devolveu `status: "converted"` com
   * `ocr_status: "needed"`, e a tela ficou em "em preparo" para sempre.
   *
   * Lendo o Python: `ocr_status = "needed" if result["is_scanned"]`. É
   * **propriedade do documento** — este PDF é digitalizado —, não etapa em
   * andamento. Quem anda é `in_progress`, `analyzing`, `converting`, `sending`.
   * Deixá-lo governar o estado fazia todo PDF digitalizado parecer eternamente
   * ocupado se o OCR não rodasse. */
  const andando = [
    ["enviando ao Kindle", j.send_status],
    ["convertendo", j.conversion_status],
    ["traduzindo", j.translation_status],
    ["exportando", j.comic_export_status],
    ["analisando", j.status],
  ].find(([, v]) => ANDANDO.has(v));

  if (andando) {
    return {
      estado: "trabalhando",
      /* O ROTULO EM PORTUGUES, e nao o `phase`.
       *
       * `derive_phase` no backend devolve o VOCABULARIO CANONICO DE MAQUINA —
       * pending, running, completed, failed, blocked — e esta linha o punha na
       * frente do rotulo humano. A tela de Preparo mostrava "Running..." para
       * quem esperava a conversao, num produto inteiro em portugues.
       *
       * `phase` serve para decidir, nao para mostrar. Quem mostra e a lista
       * acima, que ja nomeia cada etapa na lingua do produto. */
      etapa: andando[0],
      fase: j.phase || null,
      progresso: leProgresso(j.progress),
      digitalizado: j.ocr_status === "needed" || j.ocr_status === "done",
    };
  }

  const enviado = j.send_status === "sent";
  const convertido = j.conversion_status === "done";
  if (enviado || convertido || ["done", "success", "completed", "converted"].includes(j.status)) {
    return {
      estado: "pronto",
      noKindle: enviado,
      /* Informativo, e não estado: o documento ser digitalizado muda o que a
       * tela pode dizer sobre ele, não se ele está pronto. */
      digitalizado: j.ocr_status === "needed" || j.ocr_status === "done",
      ocrFeito: j.ocr_status === "done",
    };
  }

  return { estado: "fila" };
}

/* O backend devolve `progress` como dicionário livre. Ler campo por campo aqui,
 * com padrão, é o que evita `undefined%` na tela quando a forma mudar.
 *
 * DUAS COISAS DIFERENTES MORAVAM NUM `NULL` SÓ.
 *
 * A versão anterior devolvia `null` quando não havia total — e com isso a tela
 * perdia também o NOME DA ETAPA, o RECADO do servidor, a HORA DE INÍCIO e o
 * IDENTIFICADOR DA OPERAÇÃO. Só que "não dá para contar" e "não há operação
 * nenhuma" são estados distintos: a conversão por Calibre é um processo externo
 * que anda sem contar páginas, e continua sendo uma operação viva, com nome,
 * relógio e botão de cancelar.
 *
 * Perder o identificador é o que doía: `POST /jobs/{id}/operations/{op}/cancel`
 * exige o `op`, e sem ele a tela de preparo não tinha como oferecer "Cancelar" —
 * que é um dos dois botões que o nó 895:8029 desenha.
 *
 * Agora `null` significa só uma coisa: não há operação. O resto vem preenchido,
 * e o que não dá para contar vem como `null` no campo do número — não no objeto
 * inteiro. */
function leProgresso(p) {
  if (!p || typeof p !== "object") return null;
  const feito = Number(p.done ?? p.current ?? p.completed);
  const total = Number(p.total ?? p.of ?? p.count);
  const contavel = Number.isFinite(feito) && Number.isFinite(total) && total > 0;
  const texto = (v) => (typeof v === "string" && v ? v : null);
  return {
    operacao: texto(p.operation_id),
    passo: texto(p.stage),
    recado: texto(p.message),
    comeco: texto(p.started_at),
    feito: contavel ? feito : null,
    total: contavel ? total : null,
    porcento: contavel ? Math.round((feito / total) * 100) : null,
  };
}

/**
 * Todo valor que o backend pode emitir é RECONHECIDO pela derivação?
 *
 * A primeira versão perguntava outra coisa — "esse valor muda o resultado?" — e
 * por isso acusou `ocr_status="done"`, `translation_status="done"` e
 * `comic_export_status="done"`. Os três estavam certos: sub-etapa concluída não
 * deixa o arquivo pronto, ela só terminou a parte dela. O estrito demais era a
 * pergunta, não a derivação.
 *
 * A pergunta certa é se o valor **cai em algum balde nomeado**. Assim um estado
 * novo acrescentado no Python aparece como falha aqui, em vez de virar tela que
 * mostra "fila" para sempre sem erro nenhum — e verde por omissão é pior que
 * vermelho, coisa que já custou três rodadas neste projeto.
 */
export function estadosNaoCobertos() {
  const orfaos = [];
  for (const [campo, lista] of Object.entries(VALORES)) {
    for (const v of lista) {
      if (!FALHOU.has(v) && !ANDANDO.has(v) && !NEUTRO.has(v)) {
        orfaos.push(`${campo}="${v}" nao esta em FALHOU, ANDANDO nem NEUTRO`);
      }
    }
  }
  return orfaos;
}

/* ─── O ESTADO DE LEITURA, e por que ele não é o progresso ───────────────────
 *
 * O Erik, 07/09: *"estado de leitura e progresso de leitura são conceitos
 * diferentes. O drag-and-drop altera o estado. A leitura efetiva altera o
 * progresso."*
 *
 * São mesmo. **Terminei este livro** é uma declaração da pessoa; **parei no
 * capítulo 7, caractere 2.140** é um fato medido pelo leitor enquanto ela rola.
 * A primeira versão do arrasto do quadro de Estudos escrevia o segundo para
 * representar o primeiro — soltar em "Lido" punha a marca no último capítulo —
 * e apagava, em silêncio, onde a pessoa tinha parado.
 *
 * UMA FONTE, COM PADRÃO DERIVADO. Esta função é o único lugar em que a
 * precedência existe, e ela é curta:
 *
 *   declarou   o que ela disse vale, e ponto
 *   não disse  o estado sai da fração, como sempre saiu
 *
 * Isso não é ter duas verdades. Duas verdades seria guardar o estado E
 * continuar derivando sem dizer qual manda — e é exatamente o que esta função
 * existe para impedir: a Estante, o quadro, a ficha e a prova leem daqui.
 */
export const ESTADOS_DE_LEITURA = ["to_read", "reading", "read"];

/* O CORTE DE "LIDO" É 0,98 E NÃO 1, e o número é antigo: a fração vem da
 * rolagem do navegador, e a última tela de um EPUB quase nunca fecha em 1,0
 * exato — sobra o rodapé do arquivo, a margem final, o bloco que não chega ao
 * fim do visor. Exigir 1 deixaria livro terminado eternamente em "Lendo". */
export const FRACAO_DE_LIDO = 0.98;

/**
 * Em que coluna o livro está: `to_read`, `reading` ou `read`.
 *
 * @param {{fracao?: number|null, estado_leitura?: string|null, estadoLeitura?: string|null}} livro
 */
export function estadoDeLeitura(livro) {
  if (!livro) return "to_read";
  /* Os dois nomes porque a mesma pergunta é feita dos dois lados: o servidor
   * responde `estado_leitura` e o mapeamento da tela guarda `estadoLeitura`.
   * Aceitar um só faria a função dar a resposta certa numa tela e a errada na
   * outra, que é o pior defeito possível para um lugar que existe justamente
   * para ser o único. */
  const declarado = livro.estado_leitura ?? livro.estadoLeitura ?? null;
  if (declarado && ESTADOS_DE_LEITURA.includes(declarado)) return declarado;

  const f = livro.fracao;
  /* NULO NÃO É ZERO. Livro sem fração é livro que ninguém abriu, e é isso que
   * "a ler" quer dizer — não "está em 0%". */
  if (typeof f !== "number" || f <= 0) return "to_read";
  return f < FRACAO_DE_LIDO ? "reading" : "read";
}

/**
 * A declaração e o progresso discordam?
 *
 * Serve à interface, e não ao modelo: o Erik pediu que marcar "Lido" com
 * progresso incompleto pudesse *"oferecer uma ação adicional para concluir o
 * progresso"*, **explicitamente**, em vez de o quadro mexer no histórico por
 * conta. Esta função diz quando essa ação faz sentido; quem a oferece é a tela.
 *
 * Divergir NÃO é erro nem estado inválido: é o caso normal de quem terminou o
 * livro no papel, ou desistiu e quer tirá-lo da fila sem apagar onde parou.
 */
export function leituraDivergeDaDeclaracao(livro) {
  const declarado = livro?.estado_leitura ?? livro?.estadoLeitura ?? null;
  if (!declarado) return null;
  const f = typeof livro?.fracao === "number" ? livro.fracao : null;
  if (declarado === "read" && (f === null || f < FRACAO_DE_LIDO)) {
    return { declarado, fracao: f, falta: "concluir" };
  }
  if (declarado === "to_read" && f !== null && f > 0) {
    return { declarado, fracao: f, falta: "zerar" };
  }
  return null;
}
