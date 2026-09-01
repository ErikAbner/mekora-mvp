import { useCallback, useEffect, useState } from "react";
import {
  apagarGrupo, criarGrupo, desligarNotas, lerCanvas, ligarNotas, moverNoCanvas,
  mudarGrupo, porNoCanvas, tirarDoCanvas,
} from "../../../contrato/api.js";

/* A superfície do Canvas.
 *
 * MOVER GRAVA DEPOIS QUE O ARRASTO ACABA, e não durante. Arrastar produz dezenas
 * de posições por segundo, e gravar cada uma mandaria centenas de pedidos para
 * registrar lugares por onde a nota só passou. O que interessa é onde ela ficou.
 *
 * A posição na tela é do componente enquanto o dedo está apertado; aqui só entra
 * o que foi solto.
 */
export function usarCanvas() {
  const [nos, setNos] = useState([]);
  const [ligacoes, setLigacoes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const d = await lerCanvas();
      setNos(d.nos ?? []);
      setLigacoes(d.ligacoes ?? []);
      setGrupos(d.grupos ?? []);
    } catch {
      setNos([]);
      setLigacoes([]);
      setGrupos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const trazer = useCallback(async (o) => {
    setErro(null);
    try {
      await porNoCanvas(o);
      /* Recarrega em vez de remendar: trazer uma nota que já estava na
       * superfície não cria nada, e remendar a lista duplicaria o retângulo na
       * tela até a próxima visita. */
      await recarregar();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    }
  }, [recarregar]);

  const mover = useCallback(async (id, x, y) => {
    setNos((atual) => atual.map((n) => (n.id === id ? { ...n, x, y } : n)));
    try {
      await moverNoCanvas(id, x, y);
    } catch (e) {
      setErro(e.message);
      await recarregar();
    }
  }, [recarregar]);

  const tirar = useCallback(async (id) => {
    const antes = nos;
    setNos((atual) => atual.filter((n) => n.id !== id));
    try {
      await tirarDoCanvas(id);
      /* As ligações da nota tirada somem junto no servidor, por CASCADE. Sem
       * recarregar, elas continuariam desenhadas para lugar nenhum. */
      await recarregar();
    } catch (e) {
      setNos(antes);
      setErro(e.message);
    }
  }, [nos, recarregar]);

  const ligar = useCallback(async (a, b) => {
    setErro(null);
    try {
      await ligarNotas(a, b);
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
  }, [recarregar]);

  const desligar = useCallback(async (id) => {
    setLigacoes((atual) => atual.filter((l) => l.id !== id));
    try {
      await desligarNotas(id);
    } catch (e) {
      setErro(e.message);
      await recarregar();
    }
  }, [recarregar]);

  /* OS GRUPOS. Mover e redimensionar seguem a mesma regra do nó: a tela move o
   * retângulo enquanto o dedo está apertado, e só o que foi SOLTO chega aqui.
   * Gravar durante o arrasto mandaria centenas de pedidos para registrar
   * lugares por onde a área só passou. */
  const agrupar = useCallback(async (g) => {
    setErro(null);
    try {
      const novo = await criarGrupo(g);
      setGrupos((atual) => [...atual, novo]);
      return novo;
    } catch (e) {
      setErro(e.message);
      return null;
    }
  }, []);

  const mudarArea = useCallback(async (id, troca) => {
    const antes = grupos;
    setGrupos((atual) => atual.map((g) => (g.id === id ? { ...g, ...troca } : g)));
    try {
      await mudarGrupo(id, troca);
    } catch (e) {
      setGrupos(antes);
      setErro(e.message);
    }
  }, [grupos]);

  const desagrupar = useCallback(async (id) => {
    const antes = grupos;
    setGrupos((atual) => atual.filter((g) => g.id !== id));
    try {
      await apagarGrupo(id);
    } catch (e) {
      setGrupos(antes);
      setErro(e.message);
    }
  }, [grupos]);

  return {
    nos, ligacoes, grupos, erro, carregando,
    trazer, mover, tirar, ligar, desligar, recarregar,
    agrupar, mudarArea, desagrupar,
  };
}
