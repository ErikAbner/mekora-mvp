import { useCallback, useEffect, useState } from "react";
import {
  apagarEstudo, criarEstudo, lerEstudos, mudarEstudo, reunirNoEstudo, tirarDoEstudo,
} from "../../../contrato/api.js";

/* Os estudos da pessoa.
 *
 * Toda mudança recarrega em vez de remendar a lista: um estudo carrega as notas
 * dentro dele e os livros derivados delas, e remendar exigiria recalcular os
 * livros no navegador — uma segunda implementação da mesma regra, que
 * divergiria da do servidor no primeiro caso incomum.
 */
export function usarEstudos() {
  const [estudos, setEstudos] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      setEstudos(await lerEstudos());
    } catch {
      setEstudos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const comErro = useCallback(async (fn) => {
    setErro(null);
    try {
      await fn();
      await recarregar();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    }
  }, [recarregar]);

  return {
    estudos, erro, carregando, recarregar,
    criar: (o) => comErro(() => criarEstudo(o)),
    mudar: (id, t) => comErro(() => mudarEstudo(id, t)),
    apagar: (id) => comErro(() => apagarEstudo(id)),
    reunir: (id, nota) => comErro(() => reunirNoEstudo(id, nota)),
    tirar: (id, nota) => comErro(() => tirarDoEstudo(id, nota)),
  };
}
