import { useCallback, useEffect, useState } from "react";
import {
  apagarEstudo, criarEstudo, lerEstudo, lerPaginaDeEstudos, mudarEstudo, reunirNoEstudo, tirarDoEstudo,
} from "../../../contrato/api.js";

/* Os estudos da pessoa.
 *
 * Toda mudança recarrega em vez de remendar a lista: um estudo carrega as notas
 * dentro dele e os livros derivados delas, e remendar exigiria recalcular os
 * livros no navegador — uma segunda implementação da mesma regra, que
 * divergiria da do servidor no primeiro caso incomum.
 */
export function usarEstudos(estudoId = null) {
  const [estudos, setEstudos] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [proximo, setProximo] = useState(null);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState("");
  const [notaIdsReunidas, setNotaIdsReunidas] = useState([]);

  const recarregar = useCallback(async ({ procura = busca, acumular = false } = {}) => {
    setCarregando(true);
    try {
      if (estudoId) {
        const estudo = await lerEstudo(estudoId);
        setEstudos([estudo]);
        setTotal(1);
        setProximo(null);
        setNotaIdsReunidas(estudo.notas.map((n) => n.id));
        return;
      }
      const pagina = await lerPaginaDeEstudos({ limite: 24, cursor: acumular ? proximo : null, busca: procura });
      setBusca(procura);
      setEstudos((atuais) => acumular ? [...atuais, ...pagina.itens] : pagina.itens);
      setTotal(pagina.total);
      setProximo(pagina.proximo);
      setNotaIdsReunidas(pagina.nota_ids_reunidas || []);
    } catch {
      if (!acumular) setEstudos([]);
    } finally {
      setCarregando(false);
    }
  }, [busca, estudoId, proximo]);

  useEffect(() => {
    recarregar({ procura: "", acumular: false });
    // A continuação muda depois de cada resposta; ela não é motivo para
    // recarregar automaticamente a primeira página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudoId]);

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
    estudos, erro, carregando, recarregar, total, notaIdsReunidas, temMais: Boolean(proximo),
    buscar: (procura) => recarregar({ procura, acumular: false }),
    carregarMais: () => proximo ? recarregar({ procura: busca, acumular: true }) : Promise.resolve(),
    criar: (o) => comErro(() => criarEstudo(o)),
    mudar: (id, t) => comErro(() => mudarEstudo(id, t)),
    apagar: (id) => comErro(() => apagarEstudo(id)),
    reunir: (id, nota) => comErro(() => reunirNoEstudo(id, nota)),
    tirar: (id, nota) => comErro(() => tirarDoEstudo(id, nota)),
  };
}
