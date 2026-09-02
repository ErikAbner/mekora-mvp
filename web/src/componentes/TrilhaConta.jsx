/* A trilha lateral da Conta: quem é você, e onde dentro da conta.
 *
 * A `TrilhaLinhas` SAIU DAQUI, e eu a tinha posto por conta própria.
 *
 * O Erik disse que o `LineSidebar` é "a maior parte das navegações do projeto",
 * e eu li isso como "todas". O nó `966:25321` mostra outra coisa para a Conta:
 * uma lista com ÍCONE em cada item, e o item ativo como uma barra de tinta
 * cheia com o rótulo em branco — que é a marcação de superfície do resto do
 * sistema, e não o traço que cresce.
 *
 * A trilha de linhas continua na estante em 3D, onde o `895:7506` a mostra.
 *
 * O item ativo é marcado por SUPERFÍCIE e por `aria-current`, e é `<nav>` com
 * `NavLink`: a diferença aparece para quem navega por teclado ou leitor de tela.
 */
import { NavLink } from "react-router-dom";
import { Botao } from "./Botao.jsx";
import { Icone } from "./Icone.jsx";
import "./trilha-conta.css";

const PAGINAS = [
  { id: "conta", rotulo: "Conta", rota: "/conta", icone: "/icones/icone-conta.svg" },
  { id: "kindle", rotulo: "Dispositivos Kindle", rota: "/conta/kindle", icone: "/icones/icone-aparelho.svg" },
  /* SEGURANÇA NÃO ESTÁ NO 966:25321, e fica.
   *
   * O desenho lista quatro: Conta, Dispositivos Kindle, Preferências,
   * Privacidade. Segurança — as sessões abertas, e o botão de encerrar as
   * outras — é tela que existe e funciona, e tirá-la do menu esconderia o único
   * caminho até ela. O desenho é anterior a ela. */
  { id: "seguranca", rotulo: "Segurança", rota: "/conta/seguranca", icone: "/icones/icone-estante.svg" },
  { id: "preferencias", rotulo: "Preferências", rota: "/conta/preferencias", icone: "/icones/icone-preferencias.svg" },
  { id: "privacidade", rotulo: "Privacidade", rota: "/conta/privacidade", icone: "/icones/icone-privacidade.svg" },
];

export function TrilhaConta({ pessoa, aoSair }) {
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
            <Icone src={p.icone} tamanho={20} />
            <span>{p.rotulo}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sair fica no fim da trilha, separado por filete e longe da navegação.
          Junto dos itens ele viraria mais um lugar para onde ir — e é o
          contrário disso.

          `perigo` seria exagero: sair não destrói nada, e um botão vermelho
          para uma ação reversível gasta o alarme que a exclusão vai precisar. */}
      {aoSair && (
        <div className="trilha-sair">
          <Botao onClick={aoSair}>Sair desta conta</Botao>
          <p>
            Você sai deste navegador. Para voltar, peça outro link — não há
            senha para lembrar.
          </p>
        </div>
      )}
    </aside>
  );
}

function iniciais(nome) {
  if (!nome) return "?";
  return nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
