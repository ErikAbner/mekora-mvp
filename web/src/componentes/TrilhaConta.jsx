/* A trilha lateral da Conta: quem é você, e onde dentro da conta.
 *
 * O item ativo é marcado por SUPERFÍCIE, como em todo lugar do sistema, e não
 * por matiz. É `<nav>` com `aria-current`, e não uma lista de `<div>` clicáveis:
 * a diferença aparece para quem navega por teclado ou leitor de tela.
 */
import { NavLink } from "react-router-dom";
import "./trilha-conta.css";

const PAGINAS = [
  { id: "conta", rotulo: "Conta", rota: "/conta" },
  { id: "kindle", rotulo: "Dispositivos Kindle", rota: "/conta/kindle" },
  { id: "preferencias", rotulo: "Preferências", rota: "/conta/preferencias" },
  { id: "privacidade", rotulo: "Privacidade", rota: "/conta/privacidade" },
];

export function TrilhaConta({ pessoa }) {
  return (
    <aside className="trilha">
      <div className="pessoa">
        {/* A imagem tem alternativo vazio de propósito: o nome está ao lado, em
            texto. Repetir "foto de Erik Abner" faz o leitor de tela dizer o nome
            duas vezes. */}
        <div className="pessoa-retrato" aria-hidden="true">
          {pessoa?.retrato ? <img src={pessoa.retrato} alt="" /> : <span>{iniciais(pessoa?.nome)}</span>}
        </div>
        <div className="pessoa-texto">
          <p className="pessoa-nome">{pessoa?.nome ?? "Sua conta"}</p>
          <p className="pessoa-email">{pessoa?.email ?? "Ainda sem e-mail"}</p>
        </div>
      </div>

      <nav aria-label="Conta">
        {PAGINAS.map((p) => (
          <NavLink key={p.id} to={p.rota} end className="trilha-item">
            {p.rotulo}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function iniciais(nome) {
  if (!nome) return "?";
  return nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
