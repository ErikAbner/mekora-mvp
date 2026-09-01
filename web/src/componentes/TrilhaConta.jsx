/* A trilha lateral da Conta: quem é você, e onde dentro da conta.
 *
 * A NAVEGAÇÃO É A `TrilhaLinhas` — o `LineSidebar` que o Erik trouxe e disse
 * ser "a maior parte das navegações do projeto". Ela nasceu na estante em 3D e
 * esta é a segunda: cinco lugares numa coluna, que é exatamente a forma para a
 * qual o componente existe.
 *
 * O item ativo continua marcado por SUPERFÍCIE e por `aria-current`, e cada
 * item continua sendo um `<button>` de verdade — a diferença aparece para quem
 * navega por teclado ou leitor de tela.
 *
 * O ROTEAMENTO FICA AQUI, e não dentro do componente: `TrilhaLinhas` avisa qual
 * item foi escolhido e não conhece rota nenhuma. Um componente de navegação que
 * importasse o roteador só serviria a projetos com aquele roteador.
 */
import { useLocation, useNavigate } from "react-router-dom";
import { Botao } from "./Botao.jsx";
import { TrilhaLinhas } from "./TrilhaLinhas.jsx";
import "./trilha-conta.css";

const PAGINAS = [
  { id: "conta", rotulo: "Conta", rota: "/conta" },
  { id: "kindle", rotulo: "Dispositivos Kindle", rota: "/conta/kindle" },
  { id: "seguranca", rotulo: "Segurança", rota: "/conta/seguranca" },
  { id: "preferencias", rotulo: "Preferências", rota: "/conta/preferencias" },
  { id: "privacidade", rotulo: "Privacidade", rota: "/conta/privacidade" },
];

export function TrilhaConta({ pessoa, aoSair }) {
  const navegar = useNavigate();
  const { pathname } = useLocation();

  /* O MAIS LONGO QUE CASA, e não o primeiro: `/conta` é prefixo de todos os
   * outros, e a busca ingênua marcaria "Conta" estando em `/conta/kindle`. */
  const onde = PAGINAS.reduce(
    (melhor, p, i) =>
      pathname === p.rota || pathname.startsWith(`${p.rota}/`)
        ? (melhor === null || p.rota.length > PAGINAS[melhor].rota.length ? i : melhor)
        : melhor,
    null,
  );

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

      <TrilhaLinhas
        rotulo="Conta"
        itens={PAGINAS.map((p) => p.rotulo)}
        ativo={onde}
        aoEscolher={(i) => navegar(PAGINAS[i].rota)}
      />

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
