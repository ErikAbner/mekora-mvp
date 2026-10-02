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
const iconeInstalar = "/icones/icone-baixar.svg";

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icone } from "./Icone.jsx";
import { Busca } from "./Busca.jsx";
import { MenuDaConta } from "./MenuDaConta.jsx";
import { atividadesLocais, guardarAtividadesLocais, quemSouEu, situacao } from "../../../contrato/api.js";
import { Folha } from "./Folha.jsx";
import { gruposDeLugares } from "../menu.js";
import { useEstreito } from "../estreito.js";
import { abrirRecado } from "../recado.js";

import "./cabecalho.css";

/* A lista vem de `lugares.js`, não daqui. Ter os lugares em dois arquivos é como
 * o menu passa a oferecer um lugar que a rota não conhece, e o clique vira tela
 * branca. */
import { LUGARES, lugarDaRota, lembrarLugar, lugarDoRastro } from "../lugares.js";

function InstalarMekora() {
  const [pedido, setPedido] = useState(null);
  useEffect(() => {
    const disponivel = (event) => { event.preventDefault(); setPedido(event); };
    const instalado = () => setPedido(null);
    window.addEventListener("beforeinstallprompt", disponivel);
    window.addEventListener("appinstalled", instalado);
    return () => {
      window.removeEventListener("beforeinstallprompt", disponivel);
      window.removeEventListener("appinstalled", instalado);
    };
  }, []);
  if (!pedido) return null;
  return (
    <button
      type="button"
      className="acao"
      aria-label="Instalar o Mekora neste computador"
      title="Instalar o Mekora"
      onClick={async () => { await pedido.prompt(); await pedido.userChoice; setPedido(null); }}
    >
      <Icone src={iconeInstalar} />
    </button>
  );
}

const FINAIS = new Set(["sucesso", "erro", "interrompido"]);

function resultadoDaAtividade(item, situ) {
  const bruto = situ?.bruto ?? {};
  const falhou = (valor) => valor === "failed" || valor === "error" || valor === "interrupted";
  if (item.tipo === "conversao") {
    if (falhou(bruto.conversion_status)) return "erro";
    if (bruto.conversion_status === "done") return "sucesso";
    if (bruto.conversion_status === "not_started" && situ?.estado === "fila") return "interrompido";
  }
  if (item.tipo === "traducao") {
    if (falhou(bruto.translation_status)) return "erro";
    if (bruto.translation_status === "done") return "sucesso";
  }
  if (item.tipo === "envio") {
    if (falhou(bruto.send_status)) return "erro";
    if (bruto.send_status === "sent") return "sucesso";
  }
  if (item.tipo === "analise") {
    if (situ?.estado === "erro") return "erro";
    if (bruto.status && bruto.status !== "uploaded" && bruto.status !== "analyzing") return "sucesso";
  }
  if (item.tipo === "preparo") {
    if (situ?.estado === "erro") return "erro";
    if (situ?.estado === "pronto") return "sucesso";
  }
  return null;
}

export function CentroDeAtividade() {
  const [itens, setItens] = useState(() => atividadesLocais());
  const [semConexao, setSemConexao] = useState(false);
  const [expandido, setExpandido] = useState(() => {
    try { return localStorage.getItem("mekora:atividades-recolhido") !== "1"; }
    catch { return true; }
  });

  useEffect(() => {
    let vivo = true;
    let timer;
    const atualizar = async () => {
      const salvos = atividadesLocais();
      if (!salvos.length) {
        if (vivo) { setItens([]); setSemConexao(false); }
        return;
      }
      const pendentes = salvos.filter((item) => !FINAIS.has(item.resultado));
      if (!pendentes.length) {
        if (vivo) { setItens(salvos); setSemConexao(false); }
        return;
      }
      const respostas = await Promise.all(pendentes.map(async (item) => {
        try { return [item, await situacao(item.id)]; }
        catch { return [item, null]; }
      }));
      if (!vivo) return;
      const porChave = new Map(respostas.map(([item, situ]) => [`${item.id}:${item.tipo}`, situ]));
      const agora = new Date().toISOString();
      const novos = salvos.map((item) => {
        if (FINAIS.has(item.resultado)) return item;
        const situ = porChave.get(`${item.id}:${item.tipo}`);
        if (!situ) return item;
        const resultado = resultadoDaAtividade(item, situ);
        const acompanhamento = {
          progresso: typeof situ?.progresso?.porcento === "number" ? situ.progresso.porcento : null,
          etapa: situ?.etapa ?? null,
          recado: situ?.progresso?.recado ?? null,
        };
        return resultado
          ? { ...item, ...acompanhamento, resultado, terminadoEm: agora }
          : { ...item, ...acompanhamento };
      });
      guardarAtividadesLocais(novos, false);
      setItens(novos);
      setSemConexao(respostas.some(([, situ]) => !situ));
      if (novos.some((item) => !FINAIS.has(item.resultado))) {
        timer = window.setTimeout(atualizar, 1800);
      }
    };
    const mudou = () => {
      // Uma nova preparação merece atenção mesmo quando a pessoa havia
      // recolhido o andamento anterior.
      setExpandido(true);
      try { localStorage.removeItem("mekora:atividades-recolhido"); } catch {}
      if (timer) window.clearTimeout(timer);
      atualizar();
    };
    window.addEventListener("mekora:atividades", mudou);
    window.addEventListener("storage", mudou);
    atualizar();
    return () => {
      vivo = false;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("mekora:atividades", mudou);
      window.removeEventListener("storage", mudou);
    };
  }, []);

  if (!itens.length) return null;

  const ativos = itens.filter((item) => !FINAIS.has(item.resultado)).length;
  const sucessos = itens.filter((item) => item.resultado === "sucesso").length;
  const erros = itens.filter((item) => item.resultado === "erro").length;
  const interrompidos = itens.filter((item) => item.resultado === "interrompido").length;
  const terminou = ativos === 0;
  const ativoContavel = itens.find((item) => !FINAIS.has(item.resultado) && typeof item.progresso === "number");
  const percentual = ativoContavel?.progresso ?? null;
  const titulo = ativos
    ? `${ativos} ${ativos === 1 ? "arquivo em andamento" : "arquivos em andamento"}`
    : erros
      ? `${erros} ${erros === 1 ? "arquivo precisa" : "arquivos precisam"} de atenção`
      : `${sucessos} ${sucessos === 1 ? "arquivo concluído" : "arquivos concluídos"}`;
  const detalhes = [
    sucessos ? `${sucessos} ${sucessos === 1 ? "concluído" : "concluídos"}` : null,
    erros ? `${erros} com erro` : null,
    interrompidos ? `${interrompidos} ${interrompidos === 1 ? "interrompido" : "interrompidos"}` : null,
    percentual != null ? `${percentual}% no arquivo atual` : null,
    semConexao ? "sem conexão" : null,
  ].filter(Boolean).join(" · ");

  const fecharAndamento = () => {
    /* Fechar um recibo terminado precisa FECHAR de verdade. A implementação
     * anterior apenas trocava a faixa grande por outro cartão flutuante; ao
     * navegar ele continuava ocupando a leitura e parecia ter voltado. Durante
     * um trabalho em curso preservamos um indicador mínimo, porque é a única
     * forma de o resultado continuar acessível fora da Mesa. */
    const restantes = itens.filter((item) => !FINAIS.has(item.resultado));
    if (restantes.length !== itens.length) {
      guardarAtividadesLocais(restantes, false);
      setItens(restantes);
    }
    if (restantes.length) {
      setExpandido(false);
      try { localStorage.setItem("mekora:atividades-recolhido", "1"); } catch {}
    } else {
      try {
        localStorage.removeItem("mekora:atividades-recolhido");
      } catch {}
    }
  };

  if (!expandido) {
    return (
      <button type="button" className={`lote-global-recolhido${erros ? " tem-erro" : terminou ? " terminou" : ""}`}
        onClick={() => { setExpandido(true); try { localStorage.removeItem("mekora:atividades-recolhido"); } catch {} }}
        aria-expanded="false" aria-label={`${titulo}. Mostrar andamento`}>
        <strong>{ativos || itens.length}</strong>
        <span>{ativos ? (percentual != null ? `${percentual}% · Ver andamento` : "Em preparo · Ver andamento") : "Ver resultado"}</span>
      </button>
    );
  }

  return (
    <div className={`lote-global${erros ? " tem-erro" : terminou ? " terminou" : ""}`} role="status" aria-live="polite">
      <Link className="lote-global-conteudo" to="/mesa" aria-label={`${titulo}. ${detalhes}. Ver na Mesa`}>
        <span className="lote-global-topo"><strong>{titulo}</strong></span>
        <span
          className={`lote-global-barra${ativos && percentual == null ? " indeterminada" : ""}`}
          role="progressbar"
          aria-label={percentual != null ? `${percentual}% no arquivo atual` : titulo}
          aria-valuemin={percentual != null ? 0 : undefined}
          aria-valuemax={percentual != null ? 100 : undefined}
          aria-valuenow={percentual ?? undefined}
        ><span style={percentual != null ? { inlineSize: `${percentual}%` } : undefined} /></span>
        <span className="lote-global-detalhe">{detalhes ? `${detalhes} · ` : ""}Ver na Mesa</span>
      </Link>
      <button
        type="button"
        className="lote-global-fechar"
        onClick={fecharAndamento}
        aria-label={terminou ? "Dispensar este aviso" : "Recolher andamento"}
        title={terminou ? "Dispensar" : "Recolher"}
      >×</button>
    </div>
  );
}

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
  return (
    <header className="cabecalho">
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
          <InstalarMekora />
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
