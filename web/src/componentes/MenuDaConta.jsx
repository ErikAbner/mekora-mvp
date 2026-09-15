/* O menu da conta — `900:53555`, que o desenho chama de "Menu-popup".
 *
 * ELE É O MESMO NOS DOIS LUGARES, e essa foi a descoberta ao ler o `895:10599`:
 * a trilha lateral da tela de Conta e o menu que o botão do cabeçalho abre são
 * o MESMO componente do desenho, com o mesmo nome. Eu tinha construído dois — a
 * `TrilhaConta`, com uma medida, e um menu novo com outra.
 *
 * POR QUE O MENU EXISTE: o Erik apontou que clicar na conta "vai automaticamente
 * inves de abrir um dropdown e a partir dele decide pra qual configuração / tela
 * você quer ir". Estava certo — o botão ia direto para `/conta`, e dali a pessoa
 * tinha de achar a trilha para chegar em Privacidade ou nos aparelhos.
 *
 * `suspenso` é a única diferença entre os dois usos: pendurado no cabeçalho ele
 * ganha moldura, recheio e a animação de abrir; na tela de Conta ele é coluna,
 * e a moldura ali seria uma caixa dentro de outra.
 */
import { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Icone } from "./Icone.jsx";
import { destinoDoMenu } from "./menu-teclado.js";
import { sair as sairNoServidor } from "../../../contrato/api.js";
import "./menu-da-conta.css";

/* AS TELAS DA CONTA, numa lista só — usada pelos dois. */
export const PAGINAS = [
  { id: "conta", rotulo: "Conta", rota: "/conta", icone: "/icones/icone-conta.svg" },
  { id: "kindle", rotulo: "Dispositivos Kindle", rota: "/conta/kindle", icone: "/icones/icone-aparelho.svg" },
  /* SEGURANÇA NÃO ESTÁ NO DESENHO, e fica.
   *
   * O `900:53555` lista quatro: Conta, Dispositivos Kindle, Preferências,
   * Privacidade. Segurança — as sessões abertas, e o botão de encerrar as
   * outras — é tela que existe e funciona, e tirá-la do menu esconderia o único
   * caminho até ela. O desenho é anterior a ela. */
  { id: "seguranca", rotulo: "Segurança", rota: "/conta/seguranca", icone: "/icones/icone-estante.svg" },
  { id: "preferencias", rotulo: "Preferências", rota: "/conta/preferencias", icone: "/icones/icone-preferencias.svg" },
  { id: "privacidade", rotulo: "Privacidade", rota: "/conta/privacidade", icone: "/icones/icone-privacidade.svg" },
];

/* O popup é uma porta para a conta e para o produto. A navegação detalhada
 * continua na lateral das telas de configuração; repetir as cinco páginas no
 * cabeçalho transformava o menu numa segunda sidebar. */
const GRUPOS_SUSPENSOS = [
  {
    titulo: "Conta",
    itens: [
      { id: "perfil", rotulo: "Perfil e conta", rota: "/conta", icone: "/icones/icone-conta.svg" },
    ],
  },
  {
    titulo: "Produto",
    itens: [
      { id: "atualizacoes", rotulo: "Atualizações", rota: "/atualizacoes", icone: "/icones/icone-caderno.svg" },
      { id: "ajuda", rotulo: "Ajuda e recursos", rota: "/ajuda", icone: "/icones/icone-duvidas.svg" },
    ],
  },
];

export function iniciais(nome) {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function MenuDaConta({ pessoa, suspenso = false, aberto = true, aoFechar, aoDevolverFoco }) {
  const caixa = useRef(null);
  const navegar = useNavigate();

  /* `Esc` fecha e o clique fora fecha — só quando ele está suspenso. Coluna fixa
   * não fecha. */
  useEffect(() => {
    if (!suspenso || !aberto) return undefined;
    const itens = () => [...(caixa.current?.querySelectorAll('[role="menuitem"]') ?? [])]
      .filter((item) => !item.disabled && item.tabIndex >= 0);
    const quadro = requestAnimationFrame(() => itens()[0]?.focus());
    const tecla = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        aoFechar?.();
        requestAnimationFrame(() => aoDevolverFoco?.());
        return;
      }
      const todos = itens();
      const destino = destinoDoMenu(e.key, todos.indexOf(document.activeElement), todos.length);
      if (destino === null) return;
      e.preventDefault();
      todos[destino]?.focus();
    };
    /* `pointerdown` e não `click`: o clique do botão que abre chegaria aqui
     * ainda na mesma volta e fecharia o menu no instante em que ele abre. */
    const fora = (e) => { if (!caixa.current?.contains(e.target)) aoFechar?.(); };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", fora);
    };
  }, [suspenso, aberto, aoFechar, aoDevolverFoco]);

  if (suspenso && !aberto) return null;

  async function sair() {
    aoFechar?.();
    await sairNoServidor();
    /* RECARREGA, e não só troca de rota. A pessoa vive num estado do
     * `usePessoa`, que mora no `App`; daqui não há como avisá-lo sem atravessar
     * o cabeçalho de vinte e duas telas. Sair é justamente o gesto em que uma
     * volta limpa é o que se quer. */
    navegar("/", { replace: true });
    window.location.reload();
  }

  return (
    <div
      className={`menu-conta${suspenso ? " suspenso" : ""}`}
      ref={caixa}
      role={suspenso ? "menu" : undefined}
      aria-label={suspenso ? "Sua conta" : undefined}
    >
      <div className="menu-conta-pessoa">
        {/* Alternativo vazio de propósito: o nome está ao lado, em texto.
            Repetir "foto de Erik" faz o leitor de tela dizer o nome duas vezes. */}
        <div className="menu-conta-retrato" aria-hidden="true">
          {pessoa?.retrato ? <img src={pessoa.retrato} alt="" /> : <span>{iniciais(pessoa?.nome)}</span>}
        </div>
        <div className="menu-conta-quem">
          <p className="menu-conta-nome">{pessoa?.nome ?? "Sua conta"}</p>
          <p className="menu-conta-email">{pessoa?.email ?? ""}</p>
        </div>
      </div>

      {suspenso ? (
        <div className="menu-conta-grupos">
          {GRUPOS_SUSPENSOS.map((grupo) => (
            <section className="menu-conta-grupo" key={grupo.titulo} aria-label={grupo.titulo}>
              <p className="menu-conta-grupo-titulo">{grupo.titulo}</p>
              <ul className="menu-conta-lista">
                {grupo.itens.map((p) => (
                  <li key={p.id}>
                    <NavLink
                      to={p.rota}
                      end
                      className="menu-conta-item"
                      role="menuitem"
                      onClick={aoFechar}
                    >
                      <Icone src={p.icone} />
                      <span>{p.rotulo}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="menu-conta-lista">
          {PAGINAS.map((p) => (
            <li key={p.id}>
              <NavLink to={p.rota} end className="menu-conta-item">
                <Icone src={p.icone} />
                <span>{p.rotulo}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="menu-conta-sair" role={suspenso ? "menuitem" : undefined} onClick={sair}>
        {suspenso ? "Sair" : "Sair desta conta"}
      </button>
    </div>
  );
}
