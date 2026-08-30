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
const iconeMesa = "/icones/icone-mesa.svg";
const iconeEstante = "/icones/icone-estante.svg";
const iconeCanvas = "/icones/icone-canvas.svg";
const iconeEstudos = "/icones/icone-estudos.svg";
const iconeBuscar = "/icones/icone-buscar.svg";
const iconeAtalho = "/icones/icone-atalho.svg";
const iconeConta = "/icones/icone-conta.svg";

import { Icone } from "./Icone.jsx";

import "./cabecalho.css";

const LUGARES = [
  { id: "mesa", rotulo: "Mesa", icone: iconeMesa },
  { id: "estante", rotulo: "Estante", icone: iconeEstante },
  { id: "canvas", rotulo: "Canvas", icone: iconeCanvas },
  { id: "estudos", rotulo: "Estudos", icone: iconeEstudos },
];

export function Cabecalho({ lugar = "mesa", aoIr }) {
  return (
    <header className="cabecalho">
      <nav className="cabecalho-lugares" aria-label="Lugares do Mekora">
        {LUGARES.map((l) => (
          <button
            key={l.id}
            type="button"
            className="lugar"
            aria-current={l.id === lugar ? "page" : undefined}
            onClick={() => aoIr?.(l.id)}
          >
            <Icone src={l.icone} />
            <span>{l.rotulo}</span>
          </button>
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
