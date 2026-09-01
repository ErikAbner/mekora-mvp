import { useCallback, useEffect, useState } from "react";
import {
  desligarAparelho, lerAparelhos, ligarAparelho, mudarAparelho,
} from "../../../contrato/api.js";

/* Os Kindles ligados à conta.
 *
 * Tudo aqui devolve o erro para a tela em vez de engolir: ligar um aparelho é
 * um gesto com resposta esperada — ou ele aparece na lista, ou a pessoa precisa
 * saber por quê. Silêncio aqui faria o botão parecer quebrado.
 */
export function usarAparelhos() {
  const [aparelhos, setAparelhos] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      setAparelhos(await lerAparelhos());
    } catch {
      setAparelhos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const ligar = useCallback(async (endereco, nome) => {
    setErro(null);
    try {
      const novo = await ligarAparelho({ endereco, nome });
      setAparelhos((a) => [...a, novo]);
      return true;
    } catch (e) {
      /* A mensagem do backend é a que serve: ela diz onde achar o endereço no
       * aparelho, ou que ele já está ligado. Trocar por "não deu" apagaria a
       * única parte útil. */
      setErro(e.message);
      return false;
    }
  }, []);

  const mudar = useCallback(async (id, troca) => {
    setErro(null);
    try {
      await mudarAparelho(id, troca);
      /* Recarrega em vez de remendar a lista: "tornar principal" muda DOIS
       * itens — o novo ganha, o antigo perde —, e remendar só o clicado deixaria
       * dois principais na tela até a próxima visita. */
      await recarregar();
      return true;
    } catch (e) {
      setErro(e.message);
      /* Devolve `false` para quem chamou saber que NÃO deu. A folha de editar
       * fecharia sozinha em cima de um erro, e a pessoa veria o valor antigo de
       * volta sem entender por quê. */
      return false;
    }
  }, [recarregar]);

  const desligar = useCallback(async (id) => {
    setErro(null);
    try {
      await desligarAparelho(id);
      /* Também recarrega: apagar o principal promove o próximo no servidor, e a
       * tela precisa ver quem assumiu. */
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
  }, [recarregar]);

  return { aparelhos, erro, carregando, ligar, mudar, desligar };
}
