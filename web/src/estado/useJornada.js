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
import { enviarArquivo, analisar, esperarAnalise, converter, acompanhar, historico, backendNoAr, enviarAoKindle, lerPreferencias } from "../../../contrato/api.js";

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

  /* Atualiza UM arquivo pelo id, sem reescrever a lista inteira. Reescrever
   * perde o que outro acompanhamento gravou no meio, e isso aparece na tela como
   * progresso que anda para trás. */
  const grava = useCallback((id, campos) => {
    setArquivos((atual) => atual.map((a) => (a.id === id ? { ...a, ...campos } : a)));
  }, []);

  const receber = useCallback(async (lista) => {
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

        /* GUIADO PARA AQUI, e é o que a preferência sempre prometeu.
         *
         * O fluxo convertia direto depois da análise, e a tela de Preparo — que
         * mostra o que foi encontrado e o que vai ser feito — nunca era vista.
         * O produto decidia sozinho e contava depois, que é exatamente o que o
         * `CLAUDE.md` chama de "IA mágica".
         *
         * `personalizado` converte direto: quem escolheu não quer ser
         * perguntado. A preferência estava guardada e sem efeito desde que
         * existe; este é o efeito. */
        if (modo !== "personalizado") {
          grava(atual, {
            estado: "fila",
            etapa: "esperando você",
            preparo: atual,
            detalhe: "Analisado. Veja o que encontrei antes de preparar.",
          });
          continue;
        }

        etapa = "conversão";
        await converter(atual);
        if (vivos.current.has(atual)) continue;
        const id = atual;
        vivos.current.add(id);
        /* O contrato devolve `progresso` como objeto {feito,total,porcento}; a
         * tela desenha uma barra com um número. Achatar aqui, e não lá, mantém o
         * contrato descrevendo o backend em vez de descrever esta tela. */
        acompanhar(id, (s) =>
          grava(id, { ...s, progresso: s.progresso?.porcento ?? null }),
        ).finally(() => vivos.current.delete(id));
      } catch (e) {
        // O erro do backend é preservado, e escrito no id VIGENTE. Trocar a
        // mensagem por "falhou" esconderia a única informação que resolve o
        // problema.
        grava(atual, { estado: "erro", etapa, motivo: e.message });
      }
    }
  }, [grava, modo]);

  const carregarEstante = useCallback(async () => {
    const h = await historico();
    setLivros(
      h.map((e) => ({
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
        noKindle: e.kindle_sent,
        /* O que a ficha mostra sobre a LEITURA, tudo vindo do servidor.
         * Antes ela completava o que não sabia com um exemplo escrito à mão:
         * "80% lido", "24 notas", uma citação inventada e a etiqueta "#Design"
         * — os mesmos, em todo livro. */
        formato: (e.input_format || "").toUpperCase() || null,
        notas: e.notas ?? 0,
        capitulo: e.capitulo,
        capitulos: e.capitulos,
        ultima_nota: e.ultima_nota ?? null,
        quadrinho: !!e.comic_mode,
        /* A capa vem PRONTA do backend, como URL. A versão anterior devolvia
         * `null` sempre, porque o `/history` não expunha nada — e montar o
         * caminho aqui faria a tela conhecer o layout do storage do servidor,
         * que é exatamente o acoplamento que o contrato existe para evitar. */
        capa: e.cover_url ?? null,
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

  return { arquivos, livros, backend, receber, carregarEstante, enviar };
}
