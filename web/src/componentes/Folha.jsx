/* Folha — o diálogo que abre por cima.
 *
 * Chama-se folha e não modal porque é o nome que o produto usa: "o movimento
 * explica de onde uma tela veio, no canvas e nas **folhas que abrem por cima**".
 *
 * USA `<dialog>` NATIVO, e isso não é preferência. Ele traz de graça quatro
 * coisas que uma `<div>` com `position: fixed` não traz e que quase ninguém
 * implementa inteiras:
 *
 *   1. o foco fica preso dentro enquanto está aberta
 *   2. `Esc` fecha
 *   3. o resto da página fica inerte para leitor de tela
 *   4. o foco volta para onde estava quando fecha
 *
 * Reimplementar isso à mão é possível e é onde mora a maioria dos diálogos
 * quebrados que existem.
 */
import { useEffect, useRef } from "react";
import { Botao } from "./Botao.jsx";
import "./folha.css";

export function Folha({ aberta, titulo, aoFechar, children, acoes, ampla = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);

  /* `Esc` já fecha sozinho — o `close` avisa o pai para o estado não ficar
   * dizendo "aberta" com a folha fechada. */
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const fechou = () => aoFechar?.();
    d.addEventListener("close", fechou);
    return () => d.removeEventListener("close", fechou);
  }, [aoFechar]);

  return (
    <dialog ref={ref} className={`folha${ampla ? " ampla" : ""}`} aria-label={titulo}>
      <div className="folha-caixa">
        <header className="folha-topo">
          <h2>{titulo}</h2>
          {/* O X do canto vem do desenho — 941:23118 e 941:23108 o têm os dois.
              Ele NÃO substitui o "Fechar" do rodapé: são gestos diferentes.
              O X é sair sem fazer nada e fica onde a mão já está; o rodapé é o
              fim da leitura, e quem chegou lá rolando não volta ao topo. */}
          <button
            type="button"
            className="folha-x"
            aria-label="Fechar"
            onClick={() => ref.current?.close()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="folha-conteudo">{children}</div>
        <footer className="folha-acoes">
          {acoes}
          <Botao tom="secundaria" onClick={() => ref.current?.close()}>Fechar</Botao>
        </footer>
      </div>
    </dialog>
  );
}
