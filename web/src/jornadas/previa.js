/* O link dentro de uma nota, e a prévia dele — nó `895:6938`.
 *
 * O desenho traz, entre os cartões do Canvas, um com miniatura de página
 * externa. O endereço vem de dentro do texto que a pessoa escreveu: ela cola um
 * link numa nota solta, e o cartão vira a prévia daquele endereço.
 */
import { useEffect, useState } from "react";
import { previaDoLink } from "../../../contrato/api.js";

/* O PRIMEIRO endereço do texto, e não todos.
 *
 * Uma nota com três links viraria três cartões empilhados dentro de um
 * retângulo de 220px — e o que a pessoa colou primeiro é o assunto da nota. Os
 * outros continuam sendo texto, e clicáveis como texto.
 *
 * A expressão para no primeiro caractere que não pode fazer parte de um
 * endereço. Pontuação final entra nessa conta: "veja https://x.com/a." tem um
 * ponto que é da frase, não do link.
 */
const ENDERECO = /https?:\/\/[^\s<>"')\]]+/i;

export function linkDe(texto) {
  const achado = ENDERECO.exec(texto ?? "");
  if (!achado) return null;
  return achado[0].replace(/[.,;:!?]+$/, "");
}

/* A prévia de um endereço, buscada uma vez.
 *
 * `null` é "ainda não sei" e um objeto com `recusada` é "não deu, e o motivo é
 * este" — a distinção importa: a primeira mostra que está buscando, e a segunda
 * diz por que não há cartão. Sem ela, o cartão ficaria em branco para sempre e
 * ninguém saberia se era lentidão ou recusa.
 */
export function usarPrevia(url) {
  const [previa, setPrevia] = useState(null);

  useEffect(() => {
    if (!url) { setPrevia(null); return; }
    let vivo = true;
    previaDoLink(url)
      .then((p) => vivo && setPrevia(p))
      .catch((e) => vivo && setPrevia({ endereco: url, recusada: e.message }))
    return () => { vivo = false; };
  }, [url]);

  return previa;
}
