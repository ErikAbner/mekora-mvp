/* O cabeçalho: navegação à esquerda, busca e ações à direita.
 *
 * Quatro categorias de interação que não se misturam — Navegação, Ferramenta,
 * Menu de objeto, Barra flutuante. Aqui vivem as duas primeiras, e é por isso
 * que elas ficam em caixas separadas com um vão entre as duas: se estivessem na
 * mesma caixa, o olho leria como uma lista só.
 *
 * O item ativo é marcado por SUPERFÍCIE, não por matiz. É a regra do sistema —
 * as camadas vêm do fundo, não da borda —, e a medição que a sustenta: o acento
 * que marcava seleção estava a 11,9 de distância perceptual do estado de perigo,
 * abaixo do limiar de ~15 em que duas cores se confundem.
 */
// Assets do Figma, servidos de `publico/`. Caminho e nao import: o import ES
// so vale para asset dentro de src/, que o Vite processa e versiona.
const iconeBuscar = "/icones/icone-buscar.svg";
const iconeAtalho = "/icones/icone-atalho.svg";
const iconeConta = "/icones/icone-conta.svg";

import { NavLink, useLocation } from "react-router-dom";
import { Icone } from "./Icone.jsx";

import "./cabecalho.css";

/* A lista vem de `lugares.js`, não daqui. Ter os lugares em dois arquivos é como
 * o menu passa a oferecer um lugar que a rota não conhece, e o clique vira tela
 * branca. */
import { LUGARES, lugarDaRota } from "../lugares.js";

export function Cabecalho() {
  const { pathname } = useLocation();
  const aqui = lugarDaRota(pathname);
  return (
    <header className="cabecalho">
      <nav className="cabecalho-lugares" aria-label="Lugares do Mekora">
        {LUGARES.map((l) => (
          <NavLink
            key={l.id}
            to={l.rota}
            end={l.rota === "/"}
            className="lugar"
            /* O lugar ainda não construído continua clicável e leva a uma tela
               que DIZ isso. Desabilitar o botão esconderia que ele existe. */
            aria-current={aqui?.id === l.id ? "page" : undefined}
          >
            <Icone src={l.icone} />
            <span>{l.rotulo}</span>
          </NavLink>
        ))}
      </nav>

      <div className="cabecalho-acoes">
        <button type="button" className="busca">
          <Icone src={iconeBuscar} />
          <span>Buscar em Mekora</span>
        </button>
        <button type="button" className="acao" aria-label="Atalhos">
          <Icone src={iconeAtalho} />
        </button>
        <button type="button" className="acao" aria-label="Conta">
          <Icone src={iconeConta} />
        </button>
      </div>
    </header>
  );
}
