import { useCallback, useEffect, useState } from "react";
import { enderecoDoRetrato, quemSouEu, sair as sairNoServidor } from "../../../contrato/api.js";

/* Quem está usando o Mekora agora.
 *
 * Devolve três estados, e o terceiro é o que costuma ser esquecido:
 *
 *   carregando  — ainda não se sabe. Enquanto isso a tela NÃO pode decidir
 *                 nada, porque tratar "não sei" como "não entrou" faz a
 *                 interface piscar de deslogada para logada a cada abertura.
 *   pessoa      — entrou, e este é o e-mail dela.
 *   null        — não entrou. Estado normal do produto: a DEC-0018 garante
 *                 que converter acontece sem conta.
 *
 * Não há token nenhum aqui. A sessão vive num cookie httpOnly e o navegador a
 * anexa sozinha; guardá-la em JavaScript seria entregá-la a qualquer script
 * injetado na página.
 */
export function usePessoa() {
  const [pessoa, setPessoa] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const conferir = useCallback(async () => {
    try {
      const r = await quemSouEu();
      /* NOME E RETRATO VÊM DO SERVIDOR, e o nome não é mais derivado do
         e-mail. A trilha da conta mostrava `email.split("@")[0]` — um nome
         inventado — enquanto a tela de privacidade dizia ao lado que não havia
         nome nenhum.

         `retrato` é o ENDEREÇO, montado só quando o servidor diz que existe:
         um `<img>` apontando para uma rota que responde 404 desenha o ícone de
         imagem quebrada, que é pior que a inicial. */
      setPessoa(
        r?.entrou
          ? {
              email: r.email,
              nome: r.nome || null,
              retrato: r.tem_retrato ? enderecoDoRetrato() : null,
              desde: r.desde,
            }
          : null,
      );
    } catch {
      /* Backend fora do ar não é o mesmo que não estar logado, mas para a tela
       * dá no mesmo: sem servidor não há estante para mostrar. */
      setPessoa(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { conferir(); }, [conferir]);

  const sair = useCallback(async () => {
    await sairNoServidor();
    setPessoa(null);
  }, []);

  return { pessoa, carregando, sair, conferir };
}
