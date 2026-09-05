/* O corte do telefone, num lugar só.
 *
 * POR QUE ISTO EXISTE. O CSS já respondia a `max-width: 767px` em 40 pontos,
 * mas quem precisava dessa resposta em JavaScript era o Canvas — que é de
 * computador (ver `lugares.js`) e, medido a 390px em 04/09, renderizava
 * inteiro e aparecia no menu como qualquer outro lugar. A decisão morava só na
 * conversa, e o produto não a conhecia.
 *
 * O NÚMERO NÃO SE REPETE. Escrever 767 dentro do componente deixaria o produto
 * com dois cortes que ninguém garante iguais: o do CSS e o do JavaScript. Um
 * dia alguém muda um e não o outro, e o Canvas some da barra num tamanho em que
 * ele ainda abre. Aqui é o mesmo número, e é este arquivo que muda.
 */
import { useEffect, useState } from "react";

export const TELEFONE = "(max-width: 767px)";

export function useEstreito() {
  const [estreito, setEstreito] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(TELEFONE).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia?.(TELEFONE);
    if (!mq) return;
    /* Sincroniza na montagem também: entre o primeiro render e este efeito a
       janela pode ter mudado de tamanho, e aí o estado ficaria mentindo. */
    setEstreito(mq.matches);
    const ouvir = (e) => setEstreito(e.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);

  return estreito;
}
