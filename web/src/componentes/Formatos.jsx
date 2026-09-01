/* A lista de formatos que o produto aceita.
 *
 * Ela aparece em dois lugares — dentro da área de soltar e no meio da
 * Apresentação — e em nenhum dos dois pode ser escrita à mão. A LISTA VEM DE
 * QUEM DECIDE: escrita no cliente, ela divergia do backend nos dois sentidos, e
 * nenhuma das metades aparecia testando. Oferecer a mais dá erro depois do
 * upload; esconder de menos não dá erro nenhum — a pessoa simplesmente não
 * tenta.
 *
 * Duas cópias do fetch seriam duas chances de uma delas parar de buscar sem
 * ninguém ver, porque as duas continuariam mostrando a lista de espera.
 */
import { useEffect, useState } from "react";
import { lerFormatos } from "../../../contrato/api.js";
import "./formatos.css";

/* Enquanto a lista de verdade não chega, estes quatro. São os mais comuns e
 * todos aceitos — o objetivo é a caixa não nascer vazia, e não descrever o que
 * o produto suporta. Quem descreve isso é o servidor. */
const ENQUANTO_CHEGA = [".pdf", ".epub", ".docx", ".cbz"];

export function useFormatos() {
  const [formatos, setFormatos] = useState(ENQUANTO_CHEGA);
  useEffect(() => {
    let vivo = true;
    lerFormatos()
      .then((f) => vivo && f?.todos?.length && setFormatos(f.todos))
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return formatos;
}

export function Formatos() {
  const formatos = useFormatos();
  return (
    <ul className="formatos">
      {formatos.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}
