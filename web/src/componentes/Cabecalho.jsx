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

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icone } from "./Icone.jsx";
import { Busca } from "./Busca.jsx";
import { MenuDaConta } from "./MenuDaConta.jsx";
import { quemSouEu } from "../../../contrato/api.js";
import { Folha } from "./Folha.jsx";
import { gruposDeLugares } from "../menu.js";
import { useEstreito } from "../estreito.js";
import { abrirRecado } from "../recado.js";

import "./cabecalho.css";

/* A lista vem de `lugares.js`, não daqui. Ter os lugares em dois arquivos é como
 * o menu passa a oferecer um lugar que a rota não conhece, e o clique vira tela
 * branca. */
import { LUGARES, lugarDaRota, lembrarLugar, lugarDoRastro } from "../lugares.js";

export function Cabecalho() {
  /* A PESSOA VEM DO SERVIDOR AQUI, e não por propriedade.
   *
   * O cabeçalho está em vinte e duas telas, e nenhuma delas passa a pessoa —
   * atravessar todas com uma propriedade nova faria a tela que esquecesse ficar
   * com um menu sem nome e sem retrato, sem erro nenhum. `quemSouEu` já é o que
   * o `usePessoa` chama; a resposta é a mesma e o navegador a guarda. */
  const [pessoa, setPessoa] = useState(null);
  useEffect(() => {
    let vivo = true;
    quemSouEu().then((r) => { if (vivo) setPessoa(r?.pessoa ?? null); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const { pathname } = useLocation();

  /* O LUGAR ATIVO É O RASTRO, e não a rota.
   *
   * Ver `lugares.js`: o cabeçalho é quase um caminho de migalhas. No `895:10599`
   * a tela de Conta está aberta e o cabeçalho marca ESTANTE — a pessoa não saiu
   * da Estante, o conteúdo foi sobreposto.
   *
   * Quando a rota É um dos quatro lugares, ela manda e vira o rastro. Quando não
   * é — Conta, Ajuda, Preparo, um livro —, o que fica marcado é de onde a pessoa
   * veio. E quem abriu o endereço direto não recebe marca nenhuma, porque não
   * percorreu caminho nenhum. */
  const daRota = lugarDaRota(pathname);
  useEffect(() => { lembrarLugar(pathname); }, [pathname]);
  const aqui = daRota ?? lugarDoRastro();
  const [menuAberto, setMenuAberto] = useState(false);
  /* O CANVAS NÃO APARECE NO TELEFONE. Ver `menu.js` e `SoNoComputador.jsx`: ele
     é de computador, e a barra de baixo do telefone é justamente o lugar onde
     um item que não leva a lugar nenhum mais custa. */
  const estreito = useEstreito();
  const lugares = LUGARES.filter((l) => !(estreito && l.soNoComputador));
  const [menuConta, setMenuConta] = useState(false);
  const botaoConta = useRef(null);
  const [recolhido, setRecolhido] = useState(false);

  useEffect(() => {
    let anterior = window.scrollY;
    let quadro = 0;
    const rolar = () => {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        const agora = window.scrollY;
        if (agora < 48 || menuConta || menuAberto) setRecolhido(false);
        else if (agora > anterior + 5) setRecolhido(true);
        else if (agora < anterior - 5) setRecolhido(false);
        anterior = agora;
        quadro = 0;
      });
    };
    window.addEventListener("scroll", rolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", rolar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [menuConta, menuAberto]);
  return (
    <header className={`cabecalho${recolhido ? " recolhido" : ""}`}>
      <nav className="cabecalho-lugares" aria-label="Lugares do Mekora">
        {lugares.map((l) => (
          /* `Link`, E NÃO `NavLink`. O `NavLink` marca sozinho conforme a rota
             CASA com o `to` dele, e ignora um `aria-current` vindo de fora — foi
             assim que a gaveta de Conta apareceu sem lugar nenhum marcado, com o
             rastro guardado e sem efeito.
             Quem marca aqui é o rastro, e não a rota. Ver acima. */
          <Link
            key={l.id}
            to={l.rota}
            className="lugar"
            /* O lugar ainda não construído continua clicável e leva a uma tela
               que DIZ isso. Desabilitar o botão esconderia que ele existe. */
            aria-current={aqui?.id === l.id ? "page" : undefined}
          >
            <Icone src={l.icone} />
            <span>{l.rotulo}</span>
          </Link>
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
          {/* CONTA ABRE UM MENU, e não navega.
              O Erik apontou: clicar levava direto para `/conta`, e daí a pessoa
              tinha de achar a trilha lateral para chegar em Privacidade ou nos
              aparelhos. O botão agora oferece as telas. */}
          <button
            ref={botaoConta}
            type="button"
            className={`acao${menuConta ? " ativo" : ""}`}
            aria-label="Sua conta"
            aria-haspopup="menu"
            aria-expanded={menuConta}
            /* O menu fecha no próprio gatilho. Sem impedir que o clique inicial
               chegue ao ouvinte de “fora”, o pointerdown fechava e o click
               seguinte abria outra vez no mesmo gesto. */
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMenuConta((v) => !v)}
          >
            <Icone src={iconeConta} />
          </button>
        </div>

        <MenuDaConta
          suspenso
          aberto={menuConta}
          pessoa={pessoa}
          aoFechar={() => setMenuConta(false)}
          aoDevolverFoco={() => botaoConta.current?.focus()}
        />

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
        {gruposDeLugares(estreito).map((g) => (
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
