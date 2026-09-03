import { useCallback, useEffect, useState } from "react";
import { apagarMarcador, lerMarcadores, marcarLugar } from "../../../contrato/api.js";

/* Os marcadores de um livro, e o que se pode fazer com eles.
 *
 * São três coisas — listar, dobrar, desdobrar —, e não há editar: um marcador é
 * um lugar, e lugar não muda de ideia. O que se faz com uma dobra no lugar
 * errado é tirá-la.
 *
 * Todos ficam carregados, como as notas, e pela mesma razão: são poucas linhas
 * curtas, e a gaveta precisa mostrar o livro inteiro — quem procura o lugar
 * onde parou não sabe em que capítulo ele está.
 */
export function usarMarcadores(jobId) {
  const [marcadores, setMarcadores] = useState([]);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setMarcadores(await lerMarcadores(jobId));
    } catch {
      /* Sem marcadores a leitura continua inteira. Ler é o que a tela faz; a
       * dobra é o que ela guarda. */
      setMarcadores([]);
    }
  }, [jobId]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const dobrar = useCallback(async ({ capitulo, deslocamento, trecho }) => {
    setErro(null);
    try {
      const novo = await marcarLugar(jobId, { capitulo, deslocamento, trecho });
      /* `ja_estava` é a resposta de quem dobrou o mesmo ponto de novo. A rota é
       * idempotente, então não há nada a acrescentar à lista — e acrescentar
       * mesmo assim poria a mesma linha duas vezes na gaveta. */
      if (!novo.ja_estava) {
        setMarcadores((atual) =>
          [...atual, novo].sort(
            (a, b) => a.capitulo - b.capitulo || a.deslocamento - b.deslocamento,
          ),
        );
      }
      return novo;
    } catch (e) {
      /* 401 é o caso previsto, e não um defeito: sem conta não há onde guardar.
       * A tela diz isso em vez de perder em silêncio o que a pessoa pediu. */
      setErro(e.status === 401 ? "Entre para guardar marcadores." : e.message);
      return null;
    }
  }, [jobId]);

  const desdobrar = useCallback(async (id) => {
    const antes = marcadores;
    /* Some da tela primeiro: desdobrar é um gesto de arrumação, e esperar a
     * rede para ver a linha sair faz o clique parecer que não pegou. Se falhar,
     * a lista volta ao que era. */
    setMarcadores((atual) => atual.filter((m) => m.id !== id));
    try {
      await apagarMarcador(jobId, id);
    } catch (e) {
      setMarcadores(antes);
      setErro(e.message);
    }
  }, [jobId, marcadores]);

  return { marcadores, erro, dobrar, desdobrar, recarregar };
}
