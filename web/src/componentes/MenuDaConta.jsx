/* O menu da conta — o que o botão de pessoa abre.
 *
 * POR QUE ELE EXISTE: o Erik apontou que clicar na conta "vai automaticamente
 * inves de abrir um dropdown e a partir dele decide pra qual configuração /
 * tela você quer ir". Estava certo: o botão navegava direto para `/conta`, e
 * daí a pessoa tinha de achar a trilha lateral para chegar em Privacidade ou
 * nos aparelhos.
 *
 * NÃO ESTÁ NO FIGMA ATUAL, e é preciso dizer isso. Há um menu suspenso na
 * página `Exploração` (`55:2563`), e ele é da fase ANTERIOR do desenho: Satoshi,
 * cantos de 24px, cinza `#636363`. Copiá-lo traria de volta uma linguagem que a
 * DEC-0038 aposentou. Então a MECÂNICA é a que o Erik pediu e a APARÊNCIA é a de
 * hoje — filete de 1px, sem raio, degrau de superfície, Zodiak.
 *
 * As telas vêm de `TrilhaConta`, e não de uma segunda lista aqui: duas listas é
 * como uma delas fica sem a tela que alguém acrescentar depois.
 */
import { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Icone } from "./Icone.jsx";
import { PAGINAS } from "./TrilhaConta.jsx";
import { sair as sairNoServidor } from "../../../contrato/api.js";
import "./menu-da-conta.css";

export function MenuDaConta({ aberto, aoFechar }) {
  const navegar = useNavigate();
  const caixa = useRef(null);

  /* `Esc` fecha, e o clique fora fecha. Um menu que só fecha clicando de novo no
   * botão que o abriu é um menu que fica aberto por acidente — a pessoa clica em
   * outro lugar, nada acontece, e ela clica de novo. */
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => { if (e.key === "Escape") aoFechar?.(); };
    const fora = (e) => { if (!caixa.current?.contains(e.target)) aoFechar?.(); };
    document.addEventListener("keydown", tecla);
    /* `pointerdown` e não `click`: o clique do botão que abre chegaria aqui
     * ainda na mesma volta e fecharia o menu no instante em que ele abre. */
    document.addEventListener("pointerdown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", fora);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="menu-conta" ref={caixa} role="menu" aria-label="Sua conta">
      <ul className="menu-conta-lista">
        {PAGINAS.map((p) => (
          <li key={p.id}>
            <NavLink to={p.rota} className="menu-conta-item" role="menuitem" onClick={aoFechar}>
              <Icone src={p.icone} />
              <span>{p.rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      {/* SAIR FICA SEPARADO POR UM FIO, e é o último. Ele é a única linha daqui
          que não leva a uma tela — leva para fora —, e uma linha dessas no meio
          das outras é onde a mão erra. */}
      <button
        type="button"
        className="menu-conta-sair"
        role="menuitem"
        onClick={async () => {
          aoFechar?.();
          await sairNoServidor();
          /* RECARREGA, e não só troca de rota. A pessoa vive num estado do
             `usePessoa`, que mora no `App`; daqui não há como avisá-lo sem
             atravessar o cabeçalho de vinte e duas telas. Recarregar na
             apresentação é uma ida ao servidor e resolve o estado inteiro de uma
             vez — e sair é justamente o gesto em que uma volta limpa é o que se
             quer. */
          navegar("/", { replace: true });
          window.location.reload();
        }}
      >
        Sair desta conta
      </button>
    </div>
  );
}
