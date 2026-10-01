/* A jornada ligada ao backend de verdade.
 *
 * Antes disto o App.jsx carregava uma lista de exemplo. Exemplo prova layout e
 * não prova nada além disso: o estado que a tela mostrava vinha escrito à mão, e
 * escrito à mão ele nunca discorda de si mesmo. É por isso que a fila parecia
 * certa mesmo antes de existir backend.
 *
 * Tudo que sai daqui é DERIVADO da resposta do servidor, pelo contrato. Nenhuma
 * tela reduz estado por conta própria — é assim que duas telas passam a
 * discordar sobre o mesmo arquivo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { enviarArquivo, analisar, esperarAnalise, converter, acompanhar, historico, situacao, backendNoAr, enviarAoKindle, lerPreferencias, destravarComSenha, prepararLote } from "../../../contrato/api.js";
import { estadoDe } from "../../../contrato/estado.js";

export function useJornada() {
  const [arquivos, setArquivos] = useState([]);

  /* O MODO DE PREPARO. Lido uma vez, e não a cada arquivo: mudar a preferência
   * no meio de um lote faria metade dele seguir uma regra e metade outra. */
  const [modo, setModo] = useState("guiado");
  useEffect(() => {
    let vivo = true;
    lerPreferencias()
      .then((r) => vivo && r?.escolhas?.modo && setModo(r.escolhas.modo))
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [livros, setLivros] = useState([]);
  const [backend, setBackend] = useState("perguntando");
  const vivos = useRef(new Set());

  useEffect(() => {
    backendNoAr().then((ok) => setBackend(ok ? "no ar" : "fora do ar"));
  }, []);

  /* A FILA SOBREVIVE A UM RECARREGAMENTO — e não sobrevivia.
   *
   * `arquivos` nascia `[]` e só era preenchido por `receber`, ou seja, por um
   * arquivo solto NESTA aba. Recarregar a Mesa no meio de uma conversão de dez
   * minutos apagava a fila inteira da tela: o trabalho continuava no servidor, e
   * a pessoa via "A mesa está limpa".
   *
   * O nó 895:9348 mostra uma Mesa com fila de três, um deles com erro. Nada
   * disso era alcançável recarregando a página — e é assim que se chega numa
   * tela, não soltando um arquivo de novo a cada visita.
   *
   * `/history` já devolve todos os trabalhos da pessoa, com as colunas de
   * estado. O que entra na Mesa é o que AINDA NÃO ESTÁ PRONTO: pronto é livro, e
   * livro mora na estante. Quem decide isso é o `estadoDe` do contrato, o mesmo
   * que decide para os arquivos desta sessão — duas derivações seriam duas
   * telas discordando sobre o mesmo arquivo.
   */
  useEffect(() => {
    let vivo = true;
    let timer;
    const restaurados = new Set();

    const retomar = async () => {
      const ids = [...restaurados];
      if (!vivo || !ids.length) return;
      const respostas = await Promise.all(ids.map(async (id) => {
        try { return [id, await situacao(id)]; }
        catch { return [id, null]; }
      }));
      if (!vivo) return;
      for (const [id, estado] of respostas) {
        if (!estado) continue;
        setArquivos((atual) => atual.map((arquivo) => arquivo.id === id ? {
          ...arquivo,
          ...estado,
          andamento: estado.progresso ?? null,
          progresso: estado.progresso?.porcento ?? null,
        } : arquivo));
        if (estado.estado === "pronto" || estado.estado === "erro") {
          restaurados.delete(id);
          vivos.current.delete(id);
        }
      }
      if (restaurados.size) timer = window.setTimeout(retomar, 1200);
    };

    historico()
      .then((h) => {
        if (!vivo) return;
        const emCurso = h
          .map((e) => ({ bruto: e, estado: estadoDe(e) }))
          .filter(({ estado }) => estado.estado !== "pronto")
          .map(({ bruto, estado }) => ({
            id: bruto.upload_id,
            /* O TÍTULO NÃO EXISTE NUM ARQUIVO TRAVADO: sem a senha não dá para
               ler nada dele, nem o título. Sobra o nome do arquivo, que é o que
               a pessoa reconhece. */
            nome: bruto.final_title || bruto.original_filename,
            preparo: bruto.upload_id,
            ...estado,
            andamento: estado.progresso ?? null,
            progresso: estado.progresso?.porcento ?? null,
          }));
        if (!emCurso.length) return;
        /* Junta em vez de substituir: um arquivo solto agora está na lista com
           id provisório e ainda não existe no servidor, e sobrescrever apagaria
           justamente o que a pessoa acabou de fazer. */
        setArquivos((atual) => {
          const jaTem = new Set(atual.map((a) => a.id));
          return [...emCurso.filter((a) => !jaTem.has(a.id)), ...atual];
        });

        /* REABRIR A MESA RETOMA O ACOMPANHAMENTO.
         *
         * O histórico restaura os cartões, mas é apenas uma fotografia. Sem
         * este polling, uma conversão continuava no servidor enquanto o cartão
         * ficava eternamente em "convertendo" depois de atualizar a janela. */
        for (const bruto of h) {
          const estado = estadoDe(bruto);
          const subetapaAtiva = [
            bruto.conversion_status,
            bruto.send_status,
            bruto.translation_status,
            bruto.comic_translation_status,
            bruto.comic_export_status,
          ].some((valor) => valor === "pending" || valor === "in_progress");
          if (estado.estado !== "trabalhando" && !bruto.active_operation && !subetapaAtiva) continue;
          restaurados.add(bruto.upload_id);
          vivos.current.add(bruto.upload_id);
        }
        if (restaurados.size) retomar();
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (timer) window.clearTimeout(timer);
      for (const id of restaurados) vivos.current.delete(id);
    };
  }, []);

  /* Atualiza UM arquivo pelo id, sem reescrever a lista inteira. Reescrever
   * perde o que outro acompanhamento gravou no meio, e isso aparece na tela como
   * progresso que anda para trás. */
  const grava = useCallback((id, campos) => {
    setArquivos((atual) => atual.map((a) => (a.id === id ? { ...a, ...campos } : a)));
  }, []);

  const receber = useCallback(async (lista, { aoCriar } = {}) => {
    for (const f of Array.from(lista)) {
      // Entra na tela ANTES de subir. Arquivo grande demora, e uma lista que só
      // aparece depois do upload faz o usuário achar que o clique não pegou.
      const provisorio = `local:${f.name}:${f.size}`;
      setArquivos((a) => [...a, { id: provisorio, nome: f.name, estado: "fila" }]);

      /* O id MUDA no meio: entra provisório e vira o do servidor assim que o
       * upload volta. A primeira versão guardava só o provisório, e o `catch`
       * escrevia nele — num id que já não existia. Resultado: o backend
       * respondia `status: "error"` e a tela ficava em "em preparo" para
       * sempre, sem erro nenhum aparecer.
       *
       * Achado rodando contra o backend de verdade, e não teria aparecido com a
       * lista de exemplo: dado escrito à mão nunca falha no meio. */
      let atual = provisorio;

      /* ONDE ESTAMOS AGORA, para o erro dizer a verdade.
       *
       * O `catch` gravava `etapa: "envio"` em qualquer falha, e a tela mostrava
       * "Parou em: envio." para um arquivo recusado no UPLOAD por formato não
       * suportado — que nunca chegou perto do envio ao Kindle.
       *
       * A mensagem do backend estava certa e visível; o rótulo ao lado dela
       * contava outra história. Duas frases sobre o mesmo erro, discordando —
       * e a errada é a que a pessoa lê primeiro, porque é a curta. */
      let etapa = "envio do arquivo";

      try {
        const up = await enviarArquivo(f);
        grava(atual, { id: up.upload_id, estado: "trabalhando", etapa: "analisando" });
        atual = up.upload_id;

        /* UM ARQUIVO ABRE O PREPARO IMEDIATAMENTE. A própria tela acompanha a
         * análise, então não há motivo para esconder a configuração atrás da
         * Mesa e de um segundo clique. Em lote a Mesa continua sendo o lugar
         * certo, porque ela mostra o andamento de todos. */
        if (aoCriar?.(atual, modo) === true) continue;

        etapa = "análise";
        const analise = await analisar(atual);
        grava(atual, {
          paginas: analise.page_count ?? null,
          digitalizado: analise.is_scanned ?? null,
          titulo: analise.detected_title || analise.original_filename,
          autor: analise.detected_author || "",
        });

        /* A análise é assíncrona: o `analisar` acima só a dispara. Converter
         * antes dela terminar falha, e o backend recusa com a razão escrita. */
        const pronta = await esperarAnalise(atual);
        if (pronta.estado === "erro") { grava(atual, pronta); continue; }

        /* TODO ARQUIVO ANALISADO PARA AQUI. "Personalizado" não pode significar
         * converter sem mostrar título, autor e tradução: isso tornava o modo
         * mais configurável justamente o que menos deixava configurar. */
        grava(atual, {
          estado: "fila",
          etapa: "esperando você",
          preparo: atual,
          detalhe: "Analisado. Confira as opções antes de preparar.",
        });
      } catch (e) {
        // O erro do backend é preservado, e escrito no id VIGENTE. Trocar a
        // mensagem por "falhou" esconderia a única informação que resolve o
        // problema.
        grava(atual, { estado: "erro", etapa, motivo: e.message });
      }
    }
  }, [grava, modo]);

  const refazerErros = useCallback(async (ids) => {
    /* RETENTATIVA EM FILA, NÃO EM PARALELO.
     *
     * Dois PDFs grandes relançados juntos abriam dois Calibres ao mesmo tempo.
     * Além de disputar CPU e memória, ambos podiam atingir o limite de tempo
     * juntos. O preparo em lote já era sequencial; a retentativa agora obedece
     * à mesma regra e só começa o próximo quando o atual terminar. */
    for (const id of Array.from(new Set(ids))) {
      grava(id, { estado: "trabalhando", etapa: "convertendo", motivo: null, detalhe: null, andamento: null, progresso: null });
      try {
        await converter(id);
        if (vivos.current.has(id)) continue;
        vivos.current.add(id);
        await acompanhar(id, (s) =>
          grava(id, { ...s, andamento: s.progresso ?? null, progresso: s.progresso?.porcento ?? null }),
          { intervaloMs: 1200, tetoMs: 12 * 60 * 60 * 1000 },
        ).finally(() => vivos.current.delete(id));
      } catch (e) {
        grava(id, { estado: "erro", etapa: "a conversão", motivo: e.message });
      }
    }
  }, [grava]);

  const prepararEmLote = useCallback(async (ids, presetId) => {
    const unicos = Array.from(new Set(ids)).filter((id) => Number.isInteger(id));
    const resultado = await prepararLote(unicos, presetId);
    const aceitos = new Set(
      (resultado?.item_results ?? [])
        .filter((item) => item.status === "success")
        .map((item) => item.job_id),
    );
    for (const id of aceitos) {
      grava(id, { estado: "fila", etapa: "aguardando o lote", motivo: null, detalhe: "Preparação agendada." });
      if (vivos.current.has(id)) continue;
      vivos.current.add(id);
      acompanhar(id, (s) => grava(id, { ...s, andamento: s.progresso ?? null, progresso: s.progresso?.porcento ?? null }), {
        intervaloMs: 1000,
        tetoMs: 12 * 60 * 60 * 1000,
      }).finally(() => vivos.current.delete(id));
    }
    return resultado;
  }, [grava]);

  const carregarEstante = useCallback(async () => {
    const h = await historico();
    setLivros(
      /* A ESTANTE É SÓ O ACERVO PRONTO. Decisão do Erik em 07/09: "Estante
       * contém apenas livros prontos. Tudo que ainda está em
       * análise/preparo/conversão pertence à Mesa."
       *
       * Ela SUBSTITUI a decisão de 04/09, que dizia o contrário — "a estante
       * mostra ARQUIVOS, e um arquivo em preparo é um dos arquivos da pessoa" —
       * e o registro das duas está em `docs/DECISOES-2026-09-07.md`. A regra
       * nova é a que vale; a antiga fica escrita para não voltar por engano.
       *
       * O FILTRO É O MESMO DA MESA, INVERTIDO: lá `estado !== "pronto"`, aqui
       * `=== "pronto"`. As duas telas passam a ser complementares e nenhum
       * arquivo cai no vão — inclusive os de erro e os travados esperando
       * senha, que não são livro e ficam na Mesa. */
      h.filter((e) => estadoDe(e).estado === "pronto").map((e) => ({
        chave: e.upload_id,
        endereco: e.endereco,
        /* O endereço para ABRIR o livro vem pronto do backend: o arquivo se
         * chama `{slug}.epub`, derivado do título, e montá-lo aqui faria a tela
         * conhecer o layout do storage do servidor.
         *
         * `null` enquanto a conversão não terminou — e a distinção importa: uma
         * URL que existe mas não responde faz o leitor abrir vazio, em vez de
         * dizer que o livro ainda está sendo preparado. */
        leituraUrl: e.leitura_url ?? null,
        titulo: e.final_title || e.original_filename,
        autor: e.final_author || "",
        /* O ESTADO VIAJA COM O CARTÃO mesmo agora que só entra "pronto": a
         * ficha o mostra, e um cartão que não sabe o próprio estado precisaria
         * perguntar de novo. */
        estado: estadoDe(e).estado,
        noKindle: e.kindle_sent,
        /* O que a ficha mostra sobre a LEITURA, tudo vindo do servidor.
         * Antes ela completava o que não sabia com um exemplo escrito à mão:
         * "80% lido", "24 notas", uma citação inventada e a etiqueta "#Design"
         * — os mesmos, em todo livro. */
        formato: (e.input_format || "").toUpperCase() || null,
        notas: e.notas ?? 0,
        capitulo: e.capitulo,
        capitulos: e.capitulos,
        /* QUANTO DO LIVRO JA FOI LIDO, de 0 a 1. Sem esta linha o campo chega do
         * servidor, morre no mapeamento e a ficha volta ao "capitulo N de M" —
         * o que aconteceu na primeira medida, com o /history ja devolvendo
         * 0,8963 e a tela mostrando "no ultimo capitulo". */
        fracao: typeof e.fracao === "number" ? e.fracao : null,
        /* O QUE A PESSOA DECLAROU sobre o livro, ou nulo. Nulo não é "a ler":
         * é "ninguém disse", e aí o estado sai da fração. Quem decide é o
         * `estadoDeLeitura` do contrato, e só ele. */
        estadoLeitura: e.estado_leitura ?? null,
        ordemLeitura: Number.isInteger(e.ordem_leitura) ? e.ordem_leitura : null,
        ultima_nota: e.ultima_nota ?? null,
        /* Quando a leitura foi mexida pela última vez, e quando o arquivo mudou
           de estado pela última vez. A Mesa precisa das duas: uma escolhe o
           livro do cartão "Continue", a outra ordena "Ficaram prontos". */
        lidoEm: e.lido_em ?? null,
        mexidoEm: e.updated_at ?? null,
        quadrinho: !!e.comic_mode,
        /* A capa vem PRONTA do backend, como URL. A versão anterior devolvia
         * `null` sempre, porque o `/history` não expunha nada — e montar o
         * caminho aqui faria a tela conhecer o layout do storage do servidor,
         * que é exatamente o acoplamento que o contrato existe para evitar. */
        capa: e.cover_url ?? null,
        /* O NUMERO DE PAGINAS serve a dois lugares: a vista de pé deriva dele a
         * espessura da lombada, e a ficha o mostra como dado do arquivo. Sem
         * ele o livro aparece com a lombada minima, e a tela diz que a
         * espessura e desconhecida — em vez de inventar.
         *
         * OS DADOS DO ARQUIVO, que a ficha da direita passou a mostrar.
         *
         * A ficha dizia só o que a LEITURA sabe — progresso, notas, última nota.
         * Clicar num livro seleciona, e a seleção existe para mostrar "os dados
         * daquele arquivo": o que ele é, o que a conversão fez com ele, e
         * quando ele chegou. Isso já estava na tela do livro; o que faltava era
         * chegar até aqui.
         *
         * `is_scanned` é OPCIONAL de propósito e a comparação é estrita:
         * "não sei" é resposta legítima, e diferente de "não é". */
        paginas: e.page_count ?? null,
        digitalizado: e.is_scanned === true ? true : e.is_scanned === false ? false : null,
        ocr: !!e.ocr_used,
        traduzido: e.translation_enabled
          ? { de: e.source_language || null, para: e.target_language || null }
          : null,
        mangaRtl: !!e.manga_rtl,
        chegouEm: e.created_at ?? null,
      })),
    );
  }, []);

  /* Enviar ao Kindle. É a promessa central do produto — "prepara documentos
   * para o Kindle" — e até 30/08 o contrato tinha a chamada e nenhuma tela a
   * usava: dava para converter e nunca mandar.
   *
   * O estado fica no livro, e não numa variável solta ao lado: com mais de um
   * envio em curso, uma variável só faria o segundo apagar o primeiro. */
  const enviar = useCallback(async (chave) => {
    const marca = (campos) =>
      setLivros((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));

    marca({ envio: "enviando", envioErro: null });
    try {
      await enviarAoKindle(chave);
      /* O `send_status` de verdade vem do backend, e o envio por e-mail é
       * assíncrono: o SMTP aceita agora e a Amazon processa depois. Recarregar
       * a estante lê o estado real em vez de a tela decidir sozinha que deu
       * certo — que é como uma tela passa a mentir sobre o que está no
       * aparelho. */
      await carregarEstante();
      marca({ envio: null });
    } catch (e) {
      marca({ envio: "erro", envioErro: e.message });
    }
  }, [carregarEstante]);

  /* A SENHA DE UM PDF PROTEGIDO. Vai uma vez para o servidor, que abre o
   * arquivo, regrava sem proteção e esquece — e aqui ela nem é guardada: passa
   * direto para o contrato e o que fica na tela é o resultado.
   *
   * Depois de destravar, a análise recomeça no servidor. O que a tela faz é
   * voltar o arquivo para "fila" e acompanhar de novo, como se ele tivesse
   * acabado de chegar — que é o que ele é agora. */
  const destravar = useCallback(async (id, senha) => {
    await destravarComSenha(id, senha);
    grava(id, { estado: "fila", etapa: "analisando", bloqueio: null, motivo: null });
    const pronto = await esperarAnalise(id);
    grava(id, { ...pronto, andamento: pronto.progresso ?? null, progresso: pronto.progresso?.porcento ?? null, preparo: id });
  }, [grava]);

  return { arquivos, livros, backend, receber, refazerErros, prepararEmLote, carregarEstante, enviar, destravar };
}
