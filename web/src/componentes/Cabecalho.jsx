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
/* DÚVIDAS, e não notas. O botão ao lado da busca é o "?" do desenho
 * (`941:23107`), e ele leva a quem não sabe usar a ferramenta — não a um atalho
 * para as notas.
 *
 * O erro tinha DUAS metades, e a segunda é a que o fez durar: os ARQUIVOS
 * estavam trocados. `icone-estante.svg` desenhava um "?" e `icone-atalho.svg`
 * desenhava um livro aberto. Eu li os nomes e não abri nenhum dos dois, então a
 * Estante ganhou uma interrogação e o cabeçalho ganhou um livro. Os arquivos
 * foram renomeados para o que eles DESENHAM. */
const iconeDuvidas = "/icones/icone-duvidas.svg";
const iconeConta = "/icones/icone-conta.svg";
const iconeMenu = "/icones/icone-menu.svg";

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icone } from "./Icone.jsx";
import { Busca } from "./Busca.jsx";
import { Folha } from "./Folha.jsx";
import { gruposDeLugares } from "../menu.js";
import { abrirRecado } from "../recado.js";

import "./cabecalho.css";

/* A lista vem de `lugares.js`, não daqui. Ter os lugares em dois arquivos é como
 * o menu passa a oferecer um lugar que a rota não conhece, e o clique vira tela
 * branca. */
import { LUGARES, lugarDaRota } from "../lugares.js";

export function Cabecalho() {
  const { pathname } = useLocation();
  const aqui = lugarDaRota(pathname);
  const [menuAberto, setMenuAberto] = useState(false);
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
        {/* A BUSCA EXISTE AGORA. O botão desligado ficou aqui por meses com o
            motivo escrito — "não há rota de busca no backend" —, e a rota é o
            `busca.py`. O nó 941:23107 é o painel que ela abre. */}
        <Busca />
        {/* OS DOIS ATALHOS NUMA CAIXA PRÓPRIA, e não soltos ao lado da busca.
            No `900:52331` a direita é uma caixa com 12px de recheio, e dentro
            dela há 56px entre a busca e os dois atalhos — que por sua vez têm
            16px entre si (`900:52339`). Eu tinha 16px nos dois lugares, e o
            resultado é a busca e os atalhos lidos como uma coisa só. */}
        <div className="cabecalho-atalhos">
          <NavLink to="/ajuda" className="acao" aria-label="Dúvidas">
            <Icone src={iconeDuvidas} />
          </NavLink>
          <NavLink to="/conta" className="acao" aria-label="Conta">
            <Icone src={iconeConta} />
          </NavLink>
        </div>

        {/* O HAMBÚRGUER DO TELEFONE — nó 964:24606, ao lado da busca.
         *
         * Ele existia no desenho e não tinha painel desenhado em lugar nenhum do
         * arquivo, então ficou meses na lista de pendências. A decisão foi
         * tomada em 02/09: o que ele abre é o que NÃO CABE na barra de baixo.
         *
         * A barra tem os quatro lugares principais. Sobram as Notas, a Conta e
         * suas quatro telas, a Ajuda, as Atualizações e os dois documentos — que
         * no computador se alcança pelos dois ícones aqui do lado e pelo rodapé.
         * No telefone o rodapé fica no fim de uma página que pode ter três
         * telas de altura, e os dois ícones não cabem junto da busca.
         *
         * Nada foi inventado: a lista é a mesma do rodapé, de `menu.js`.
         *
         * ELE SÓ EXISTE ABAIXO DE 768 (regra em `cabecalho.css`): no computador
         * os mesmos lugares já estão à vista, e um menu que repete o que está na
         * tela é onde a pessoa começa a duvidar de qual dos dois vale. */}
        <button
          type="button"
          className="acao cabecalho-menu"
          aria-label="Mais lugares do Mekora"
          aria-expanded={menuAberto ? "true" : "false"}
          onClick={() => setMenuAberto(true)}
        >
          <Icone src={iconeMenu} />
        </button>
      </div>

      <Folha
        aberta={menuAberto}
        titulo="Ir para"
        aoFechar={() => setMenuAberto(false)}
      >
        {gruposDeLugares().map((g) => (
          <nav key={g.titulo} className="menu-grupo" aria-label={g.titulo}>
            <h3>{g.titulo}</h3>
            <ul>
              {g.itens.map((i) => (
                <li key={i.rota || i.acao}>
                  {i.rota ? (
                    <NavLink
                      to={i.rota}
                      end={i.rota === "/"}
                      onClick={() => setMenuAberto(false)}
                    >
                      {i.rotulo}
                    </NavLink>
                  ) : (
                    /* Fecha ESTE menu antes de abrir a folha de recado: duas
                       `<dialog>` modais abertas empilham o foco preso, e a de
                       baixo fica alcançável por leitor de tela sem estar
                       visível. */
                    <button
                      type="button"
                      className="menu-acao"
                      onClick={() => {
                        setMenuAberto(false);
                        abrirRecado();
                      }}
                    >
                      {i.rotulo}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Folha>
    </header>
  );
}
