import { useCallback, useEffect, useState } from "react";
import { apagarNota, criarNota, editarNota, lerNotas } from "../../../contrato/api.js";

/* As notas de um livro, e o que se pode fazer com elas.
 *
 * Todas as notas do livro ficam carregadas, não só as do capítulo aberto. São
 * dezenas de linhas curtas, e virar o capítulo com elas já em mãos é imediato —
 * contra um pedido a cada virada, que faria o destaque aparecer um instante
 * depois do texto, piscando.
 */
export function usarNotas(jobId) {
  const [notas, setNotas] = useState([]);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setNotas(await lerNotas(jobId));
    } catch {
      /* Sem notas a leitura continua inteira. Um erro aqui não pode impedir
       * alguém de ler o livro. */
      setNotas([]);
    }
  }, [jobId]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const marcar = useCallback(async ({ capitulo, de, ate, cor, trecho, antes = "", depois = "" }) => {
    setErro(null);
    try {
      /* O TEXTO EM VOLTA VAI JUNTO. É a outra metade da âncora da `DEC-0016`, e
       * ele só existe no instante da marcação: depois, o parágrafo pode ter
       * mudado, e reconstruir o contexto a partir do texto de hoje guardaria o
       * texto errado com data de ontem. */
      const nova = await criarNota(jobId, { capitulo, de, ate, cor, trecho, antes, depois, comentario: "" });
      /* A nota entra na lista com o que o SERVIDOR devolveu, e não com o que
       * foi enviado: o `id` vem de lá, e sem ele apagar e comentar não teriam
       * em que pegar. */
      setNotas((atual) => [...atual, nova]);
      return nova;
    } catch (e) {
      setErro(e.status === 401 ? "Entre para guardar notas." : e.message);
      return null;
    }
  }, [jobId]);

  const comentar = useCallback(async (id, comentario) => {
    const antes = notas;
    /* Escreve na tela primeiro: quem digita um comentário espera vê-lo, e não
     * esperar a rede. Se falhar, volta ao que era — em vez de deixar na tela um
     * texto que não existe em lugar nenhum. */
    setNotas((atual) => atual.map((n) => (n.id === id ? { ...n, comentario } : n)));
    try {
      await editarNota(jobId, id, { comentario });
    } catch (e) {
      setNotas(antes);
      setErro(e.message);
    }
  }, [jobId, notas]);

  const trocarCor = useCallback(async (id, cor) => {
    const antes = notas;
    setNotas((atual) => atual.map((n) => (n.id === id ? { ...n, cor } : n)));
    try {
      await editarNota(jobId, id, { cor });
    } catch (e) {
      setNotas(antes);
      setErro(e.message);
    }
  }, [jobId, notas]);

  const remover = useCallback(async (id) => {
    const antes = notas;
    setNotas((atual) => atual.filter((n) => n.id !== id));
    try {
      await apagarNota(jobId, id);
    } catch (e) {
      setNotas(antes);
      setErro(e.message);
    }
  }, [jobId, notas]);

  return { notas, erro, marcar, comentar, trocarCor, remover, recarregar };
}
