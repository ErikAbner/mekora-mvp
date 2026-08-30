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
import { enviarArquivo, analisar, esperarAnalise, converter, acompanhar, historico, backendNoAr } from "../../../contrato/api.js";

export function useJornada() {
  const [arquivos, setArquivos] = useState([]);
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

      try {
        const up = await enviarArquivo(f);
        grava(atual, { id: up.upload_id, estado: "trabalhando", etapa: "analisando" });
        atual = up.upload_id;

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
        grava(atual, { estado: "erro", etapa: "envio", motivo: e.message });
      }
    }
  }, [grava]);

  const carregarEstante = useCallback(async () => {
    const h = await historico();
    setLivros(
      h.map((e) => ({
        chave: e.upload_id,
        titulo: e.final_title || e.original_filename,
        autor: e.final_author || "",
        noKindle: e.kindle_sent,
        // Capa vem do backend quando existe. Inventar caminho aqui daria 404
        // silencioso, e a tela decide o que mostrar quando não há.
        capa: null,
      })),
    );
  }, []);

  return { arquivos, livros, backend, receber, carregarEstante };
}
