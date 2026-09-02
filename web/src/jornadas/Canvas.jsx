import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Icone } from "../componentes/Icone.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import { linkDe, usarPrevia } from "./previa.js";
import "./canvas.css";

/* O Canvas: onde as notas se ligam umas às outras.
 *
 *     Canvas organiza. Conexões descobre.  (DEC-0030)
 *
 * A superfície é de organização DELIBERADA: nada se move sozinho, nada é
 * sugerido. O que está aqui foi posto aqui.
 */

/* Antes de mover, é preciso ter certeza de que é arrasto e não clique. Quatro
 * pixels é o limiar que o protótipo já tinha calibrado — abaixo disso, tocar
 * numa nota para lê-la a arrastaria alguns pixels e o clique nunca chegaria. */
const LIMIAR = 4;

/* O TAMANHO DA NOTA, para o traço saber onde é o meio dela. A largura é fixa em
 * CSS; a altura varia com o texto, e 100 é a altura de uma nota de duas linhas
 * com rodapé — a ligação sai perto do centro em vez de exato, e é o suficiente
 * para o olho ler que as duas se falam. */
const NOTA_LARGURA = 220;
const NOTA_ALTURA = 100;

/* Folga em volta da caixa dos traços. Sem ela, uma linha na borda exata do SVG
 * perde metade da espessura no recorte. */
const FOLGA = 8;

/* O menor lado de um grupo. O mesmo número que o backend usa — um retângulo
 * menor que uma nota não agrupa nada, e um de um pixel some da tela sem deixar
 * como pegá-lo de volta. */
const LADO_MINIMO = 120;

/* O cartão da prévia. Ele fica DENTRO da nota, e não ao lado: o link é parte do
 * que foi escrito ali, e um cartão solto viraria um segundo objeto na
 * superfície que ninguém pôs.
 *
 * A imagem carrega do endereço original, e não de uma cópia nossa: guardar a
 * imagem faria o Mekora ter um arquivo de terceiro no disco, que a tela de
 * Privacidade teria de declarar e a pessoa não pediu.
 */
function Previa({ link, previa }) {
  const anfitriao = (() => {
    try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return link; }
  })();

  return (
    <a
      className="nota-previa"
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {previa?.imagem && <img src={previa.imagem} alt="" loading="lazy" />}
      <span className="nota-previa-texto">
        <span className="nota-previa-titulo">{previa?.titulo || anfitriao}</span>
        {/* O PRODUTO DIZ O QUE NÃO SABE. Sem esta linha, um endereço que recusou
            a prévia ficaria idêntico a um que ainda está carregando. */}
        <span className="nota-previa-site">
          {previa === null
            ? "Buscando a prévia…"
            : previa.recusada
              ? `${anfitriao} · sem prévia`
              : previa.site || anfitriao}
        </span>
      </span>
    </a>
  );
}

/* A data curta do rodapé — "05/08/26", como o desenho escreve. Duas casas no
 * ano porque a linha é estreita e o século não está em disputa. */
function dataCurta(iso) {
  if (!iso) return null;
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function Nota({ no, aoMover, aoTirar, aoLigar, ligando, escolhida, escala = 1 }) {
  const quando = dataCurta(no.criada_em);
  const caixa = useRef(null);
  const arrasto = useRef(null);
  const [posicao, setPosicao] = useState(null);

  /* O endereço vem do TEXTO da nota. A pessoa cola um link numa nota solta, e o
   * cartão vira a prévia daquele endereço — é o que o 895:6938 mostra. */
  const link = linkDe(no.texto);
  const previa = usarPrevia(link);

  /* O NÓ NÃO SAI DO LUGAR NO DOM DURANTE O ARRASTO.
   *
   * O `CLAUDE.md` já pagou esta: mover o nó libera a captura de ponteiro no
   * primeiro pixel — `lostpointercapture` — e o arrasto morre. O que se move é
   * o `transform`, que não mexe na árvore.
   *
   * A posição só vai para o servidor ao SOLTAR. */
  const comecar = (e) => {
    if (e.button !== 0 || ligando) return;
    caixa.current?.setPointerCapture(e.pointerId);
    arrasto.current = { x0: e.clientX, y0: e.clientY, mexeu: false };
  };

  const andar = (e) => {
    const a = arrasto.current;
    if (!a) return;
    /* O DESLOCAMENTO DO DEDO É EM PIXELS DE TELA; a nota vive em coordenadas do
     * PLANO. Com zoom em 50%, mover o dedo 100px precisa mover a nota 200 no
     * plano — sem dividir pela escala, a nota anda mais devagar que o dedo e
     * escapa de baixo dele. */
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (!a.mexeu && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < LIMIAR) return;
    a.mexeu = true;
    setPosicao({ dx, dy });
  };

  const soltar = (e) => {
    const a = arrasto.current;
    arrasto.current = null;
    caixa.current?.releasePointerCapture?.(e.pointerId);
    if (!a) return;
    if (a.mexeu) {
      aoMover(no.id, no.x + (e.clientX - a.x0) / escala, no.y + (e.clientY - a.y0) / escala);
    }
    setPosicao(null);
  };

  const estilo = {
    left: no.x,
    top: no.y,
    transform: posicao ? `translate(${posicao.dx}px, ${posicao.dy}px)` : undefined,
    /* Enquanto arrasta, a nota sobe: passar por baixo de outra faria parecer
       que ela sumiu. */
    zIndex: posicao ? 10 : undefined,
  };

  return (
    <article
      ref={caixa}
      className={`nota-canvas${posicao ? " movendo" : ""}${escolhida ? " escolhida" : ""}`}
      style={estilo}
      onPointerDown={comecar}
      onPointerMove={andar}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onClick={() => ligando && aoLigar(no.nota_id)}
    >
      {/* A COR DA NOTA VIRA UMA MARCA, e não o papel inteiro.
          
          O nó 895:6938 mostra cartões BRANCOS, com filete fino e uma sombra
          quase nada — o mesmo cartão para todos. Aqui cada um era uma folha
          amarela, azul ou verde, e com quatro cores no mesmo espaço a cor deixa
          de significar o que ela significa na leitura: ali ela é a marca que a
          pessoa escolheu para o trecho, e aqui virava a identidade do objeto.
          
          A marca guarda a informação e devolve o cartão ao sistema. */}
      {no.cor && (
        <span
          className="nota-marca"
          style={{ background: DESTAQUES[no.cor] ?? DESTAQUES.amarelo }}
          aria-hidden="true"
        />
      )}
      <p className="nota-texto">{no.texto}</p>
      {no.comentario && <p className="nota-comentario">{no.comentario}</p>}

      {/* A PRÉVIA DO LINK — nó 895:6938. Só aparece quando há um endereço no
          texto da nota, e o Mekora precisa IR ATÉ ELE para montá-la: essa
          informação não está aqui, está no site. A Política de privacidade diz
          isso com todas as letras. */}
      {link && <Previa link={link} previa={previa} />}

      {/* O RODAPÉ DO DESENHO É ORIGEM E DATA — "Erik · 05/08/26" —, e não uma
          fileira de botões.
          
          "Tirar" estava na cara de TODO cartão, e o `CLAUDE.md` já nomeia o que
          isso faz: *"botão repetido cinco vezes vira textura e some como coisa
          clicável"*. Num canvas de vinte notas eram vinte botões idênticos
          competindo com o texto que a pessoa escreveu.
          
          Ele passou a aparecer só no cartão sob o ponteiro, ou com o foco do
          teclado dentro dele — quem chega de teclado precisa alcançá-lo, e
          `:hover` sozinho o esconderia para sempre. */}
      <footer>
        <span className="nota-origem">
          {no.fonte === "solta" ? "escrita aqui" : no.origem || "do seu livro"}
        </span>
        {quando && <span className="nota-quando">{quando}</span>}
        <span className="nota-acoes">
          {no.job_id && (
            <Link to={`/leitura/${no.job_id}`} className="nota-abrir">
              Abrir no livro
            </Link>
          )}
          {/* TIRAR não apaga: a nota continua na estante e no caderno. O rótulo
              diz "tirar" e não "apagar" por isso. */}
          <button type="button" onClick={(e) => { e.stopPropagation(); aoTirar(no.id); }}>
            Tirar
          </button>
        </span>
      </footer>
    </article>
  );
}


/* UM GRUPO — nó 895:6938.
 *
 * O desenho mostra cartões dentro de uma área tracejada com título: *"Design &
 * Tecnologia"*. É um agrupamento ESPACIAL, e é o que o distingue de um Estudo:
 * o Estudo é uma lista reunida por assunto e existe fora do Canvas; o grupo é
 * um pedaço de chão com nome, e uma nota pertence a ele por estar em cima dele.
 *
 * ELE FICA ATRÁS DAS NOTAS e não captura o ponteiro no meio: arrastar dentro da
 * área move a NOTA, ou o chão, e nunca o retângulo por baixo. O que pega o
 * retângulo é a barra do título — a mesma regra de uma janela.
 */
function Grupo({ grupo, aoMudar, aoApagar, escala }) {
  const arrasto = useRef(null);
  const [desloca, setDesloca] = useState(null);
  const [medindo, setMedindo] = useState(null);
  const [editando, setEditando] = useState(false);

  const pegar = (e, qual) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrasto.current = { qual, x0: e.clientX, y0: e.clientY };
  };

  const andar = (e) => {
    const a = arrasto.current;
    if (!a) return;
    /* Dividido pela escala pelo mesmo motivo da nota: o dedo anda em pixels de
     * tela, e a área vive em coordenadas do plano. */
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (a.qual === "mover") setDesloca({ dx, dy });
    else setMedindo({ dx, dy });
  };

  const soltar = (e) => {
    const a = arrasto.current;
    arrasto.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setDesloca(null);
    setMedindo(null);
    if (!a) return;
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (Math.hypot(dx, dy) < LIMIAR) return;
    if (a.qual === "mover") aoMudar(grupo.id, { x: grupo.x + dx, y: grupo.y + dy });
    else aoMudar(grupo.id, {
      largura: Math.max(LADO_MINIMO, grupo.largura + dx),
      altura: Math.max(LADO_MINIMO, grupo.altura + dy),
    });
  };

  const estilo = {
    left: grupo.x,
    top: grupo.y,
    width: Math.max(LADO_MINIMO, grupo.largura + (medindo?.dx ?? 0)),
    height: Math.max(LADO_MINIMO, grupo.altura + (medindo?.dy ?? 0)),
    transform: desloca ? `translate(${desloca.dx}px, ${desloca.dy}px)` : undefined,
  };

  return (
    <section className="canvas-grupo" style={estilo} aria-label={grupo.nome || "Grupo sem nome"}>
      <header
        className="canvas-grupo-titulo"
        onPointerDown={(e) => pegar(e, "mover")}
        onPointerMove={andar}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        {editando ? (
          <input
            type="text"
            defaultValue={grupo.nome}
            aria-label="Nome do grupo"
            autoFocus
            maxLength={120}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => { setEditando(false); if (e.target.value !== grupo.nome) aoMudar(grupo.id, { nome: e.target.value }); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditando(false); }}
          />
        ) : (
          <button
            type="button"
            className="canvas-grupo-nome"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setEditando(true)}
          >
            {/* Grupo sem nome DIZ que não tem nome, e o rótulo é o convite para
                dar um. Um retângulo com o título em branco parece defeito. */}
            {grupo.nome || "Dar um nome"}
          </button>
        )}
        <button
          type="button"
          className="canvas-grupo-tirar"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => aoApagar(grupo.id)}
        >
          Desfazer grupo
        </button>
      </header>

      {/* O canto que redimensiona. `aria-hidden` porque o teclado não arrasta —
          o tamanho por teclado não existe ainda, e fingir um alvo focável que
          não responde é pior que não oferecer. */}
      <span
        className="canvas-grupo-canto"
        aria-hidden="true"
        onPointerDown={(e) => pegar(e, "medir")}
        onPointerMove={andar}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      />
    </section>
  );
}

export function Canvas({ nos = [], ligacoes = [], grupos = [], notas = [], erro, aoTrazer, aoMover, aoTirar, aoLigar, aoDesligar, aoAgrupar, aoMudarArea, aoDesagrupar }) {
  const [ligando, setLigando] = useState(false);
  const [primeira, setPrimeira] = useState(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [trazendo, setTrazendo] = useState(false);

  const naSuperficie = new Set(nos.map((n) => n.nota_id));
  const deFora = notas.filter((n) => !naSuperficie.has(n.id));

  const posicaoDe = useCallback(
    (notaId) => nos.find((n) => n.nota_id === notaId),
    [nos],
  );

  /* A CAIXA DOS TRAÇOS: onde cada linha começa e acaba, e o retângulo que
   * contém todas. `null` quando não há nenhuma ligação desenhável — e aí não há
   * SVG na árvore, em vez de um elemento vazio de tamanho indefinido. */
  const tracos = useMemo(() => {
    const linhas = [];
    for (const l of ligacoes) {
      const a = nos.find((n) => n.nota_id === l.de_id);
      const b = nos.find((n) => n.nota_id === l.para_id);
      if (!a || !b) continue;
      const x1 = a.x + NOTA_LARGURA / 2;
      const y1 = a.y + NOTA_ALTURA / 2;
      const x2 = b.x + NOTA_LARGURA / 2;
      const y2 = b.y + NOTA_ALTURA / 2;
      /* A CURVA DO DESENHO, e não um segmento reto.
       *
       * O nó 895:6938 liga os cartões com uma curva que SAI E CHEGA NA
       * HORIZONTAL, e isso não é enfeite: com reta, duas notas quase alinhadas
       * produzem uma diagonal de um grau que parece um erro de renderização, e
       * quatro ligações saindo de uma nota viram um leque ilegível.
       *
       * A curva é uma Bézier cúbica com as duas alças horizontais, a metade da
       * distância — a mesma forma dos diagramas de nó de todo editor visual,
       * pela mesma razão. */
      const alca = Math.max(40, Math.abs(x2 - x1) / 2);
      linhas.push({
        id: l.id,
        d: `M ${x1} ${y1} C ${x1 + alca} ${y1}, ${x2 - alca} ${y2}, ${x2} ${y2}`,
        /* O MEIO DA CURVA, e não o meio da reta: é onde o ponto de desfazer
           mora, e ele tem de cair EM CIMA do traço. Numa Bézier com alças
           horizontais, t=0,5 dá exatamente isto. */
        mx: (x1 + 3 * (x1 + alca) + 3 * (x2 - alca) + x2) / 8,
        my: (y1 + 3 * y1 + 3 * y2 + y2) / 8,
      });
    }
    if (!linhas.length) return null;

    const xs = linhas.flatMap((l) => [l.x1, l.x2]);
    const ys = linhas.flatMap((l) => [l.y1, l.y2]);
    const x = Math.min(...xs) - FOLGA;
    const y = Math.min(...ys) - FOLGA;
    return {
      x, y,
      largura: Math.max(...xs) - x + FOLGA,
      altura: Math.max(...ys) - y + FOLGA,
      linhas,
    };
  }, [ligacoes, nos]);

  /* O CENTRO DO QUE ESTÁ SENDO VISTO, em coordenadas do plano. É onde o grupo
   * novo nasce — a origem do plano pode estar a mil pixels daqui. */
  const mundo = useRef(null);
  const criarAqui = () => {
    const caixa = mundo.current?.getBoundingClientRect();
    const meio = caixa
      ? {
          x: (caixa.width / 2 - camera.x) / camera.escala - 240,
          y: (caixa.height / 2 - camera.y) / camera.escala - 160,
        }
      : { x: 0, y: 0 };
    aoAgrupar?.({ nome: "", x: meio.x, y: meio.y, largura: 480, altura: 320 });
  };

  const escolher = (notaId) => {
    if (primeira === null) { setPrimeira(notaId); return; }
    if (primeira !== notaId) aoLigar(primeira, notaId);
    setPrimeira(null);
    setLigando(false);
  };

  /* A CÂMERA. O Canvas é uma superfície SEM FIM, e o que a tela mostra é um
   * recorte dela — `deslocamento` diz onde esse recorte está, `escala` diz de
   * quão longe se olha.
   *
   * A primeira versão era uma caixa de 560px com `overflow: auto`: uma nota
   * arrastada para fora do quadro sumia, e não havia como ir atrás dela. O nó
   * `895:6938` mostra o contrário — chão pontilhado que continua para todo lado,
   * e um controle de zoom no canto.
   *
   * O PLANO É QUE SE MOVE, e não a rolagem: `transform` não mexe na árvore, roda
   * na placa de vídeo, e é o que permite arrastar mil notas sem engasgo. */
  const [camera, setCamera] = useState({ x: 0, y: 0, escala: 1 });
  const arrastandoChao = useRef(null);

  const ESCALA_MIN = 0.25;
  const ESCALA_MAX = 2;
  const aproximar = (passo) =>
    setCamera((c) => ({ ...c, escala: Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, +(c.escala + passo).toFixed(2))) }));

  /* ARRASTAR O CHÃO leva a câmera junto. Só o chão: começar o arrasto sobre uma
   * nota move a nota, e é o que a pessoa espera dos dois gestos. */
  const chaoDesce = (e) => {
    if (e.target.closest(".canvas-nota")) return;
    arrastandoChao.current = { x0: e.clientX, y0: e.clientY, cx: camera.x, cy: camera.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const chaoMove = (e) => {
    const a = arrastandoChao.current;
    if (!a) return;
    setCamera((c) => ({ ...c, x: a.cx + (e.clientX - a.x0), y: a.cy + (e.clientY - a.y0) }));
  };
  const chaoSobe = () => { arrastandoChao.current = null; };

  return (
    <div className="mesa">
      <Cabecalho lugar="canvas" />

      <section className="canvas">
        {/* A BARRA DE FERRAMENTAS, FLUTUANDO À ESQUERDA — nó 895:6938.
         *
         * O que havia aqui era um título "Canvas", um parágrafo explicando o que
         * ele é, e quatro botões largos numa fileira. Nada disso está no
         * desenho, e o motivo é o que a tela é: no desenho o canvas É a página,
         * de borda a borda, e as ferramentas flutuam sobre ele numa coluna
         * estreita.
         *
         * O título dizia "Canvas" a três centímetros do item "Canvas" marcado no
         * menu, e o parágrafo explicava a área toda vez que alguém a abre — a
         * milésima vez inclusive. Numa tela de trabalho, o que ocupa o alto é o
         * trabalho.
         *
         * OS RÓTULOS NÃO SUMIRAM: cada botão tem `aria-label` e título, e o nome
         * aparece ao passar o ponteiro. Ícone sem nome é adivinhação, e é o
         * defeito mais comum de barra de ferramenta. */}
        <nav className="canvas-ferramentas" aria-label="Ferramentas do Canvas">
          <button
            type="button"
            title="Escrever uma nota"
            aria-label="Escrever uma nota"
            onClick={() => { setTexto(""); setEscrevendo(true); }}
          >
            <Icone src="/icones/icone-nota-nova.svg" />
          </button>
          <button
            type="button"
            title={deFora.length ? `Trazer nota (${deFora.length} fora do Canvas)` : "Nenhuma nota fora do Canvas"}
            aria-label={deFora.length ? `Trazer nota — ${deFora.length} fora do Canvas` : "Nenhuma nota fora do Canvas"}
            onClick={() => setTrazendo(true)}
            disabled={!deFora.length}
          >
            <Icone src="/icones/icone-caderno.svg" />
            {/* O NÚMERO FICA. Ele é o que diz se vale abrir a folha — sem ele o
                botão desabilitado e o botão com dezenove notas atrás parecem a
                mesma coisa. */}
            {deFora.length > 0 && <span className="canvas-conta">{deFora.length}</span>}
          </button>
          {/* CRIAR UM GRUPO. Ele nasce no meio do que está sendo visto, e não
              na origem do plano: numa superfície sem fim, a origem pode estar
              a mil pixels de distância, e o retângulo apareceria fora da tela. */}
          <button
            type="button"
            title="Agrupar uma área"
            aria-label="Agrupar uma área"
            onClick={criarAqui}
          >
            <Icone src="/icones/icone-estudos.svg" />
          </button>
          <button
            type="button"
            title={ligando ? "Escolhendo as notas para ligar" : "Ligar duas notas"}
            aria-label={ligando ? "Escolhendo as notas para ligar" : "Ligar duas notas"}
            aria-pressed={ligando ? "true" : "false"}
            onClick={() => { setLigando((v) => !v); setPrimeira(null); }}
            disabled={nos.length < 2}
          >
            <Icone src="/icones/icone-estante.svg" />
          </button>
        </nav>

        {erro && <p className="canvas-erro" role="alert">{erro}</p>}

        {ligando && (
          <p className="canvas-instrucao" role="status">
            {primeira === null
              ? "Toque na primeira nota."
              : "Agora na segunda. Tocar na mesma cancela."}
          </p>
        )}

        {/* O MUNDO é a janela; o PLANO é a superfície, e ela não tem borda.
            Duas camadas porque só assim o zoom e o arrasto valem para tudo o que
            está dentro sem cada nota precisar saber da câmera. */}
        <div
          ref={mundo}
          className="canvas-mundo"
          /* O chão pontilhado anda com a câmera: as duas variáveis são lidas
             pelo `background-position` e pelo `background-size` em canvas.css. */
          style={{
            "--camera-x": `${camera.x}px`,
            "--camera-y": `${camera.y}px`,
            "--escala": camera.escala,
          }}
          onPointerDown={chaoDesce}
          onPointerMove={chaoMove}
          onPointerUp={chaoSobe}
          onPointerCancel={chaoSobe}
        >
          <div
            className="canvas-plano"
            style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.escala})` }}
          >
          {!nos.length && (
            <p className="canvas-vazio">
              Nada aqui ainda. Traga uma nota que você já marcou, ou escreva uma
              solta — as duas viram a mesma coisa depois de estarem na superfície.
            </p>
          )}

          {/* OS TRAÇOS FICAM ATRÁS, num SVG que cobre a superfície inteira.
              Desenhá-los como bordas entre elementos exigiria que cada nota
              soubesse das outras; assim, a ligação é desenhada por quem sabe
              onde as duas estão. */}
          {/* OS GRUPOS FICAM NO FUNDO: eles são o chão, e as notas estão em
              cima. Vêm antes no DOM, e é isso que os põe atrás. */}
          {grupos.map((g) => (
            <Grupo
              key={g.id}
              grupo={g}
              aoMudar={aoMudarArea}
              aoApagar={aoDesagrupar}
              escala={camera.escala}
            />
          ))}

          {/* OS TRAÇOS TÊM CAIXA PRÓPRIA, medida a partir das ligações.
              A versão anterior era `inset: 0` com 100% de largura e altura — e o
              plano é uma superfície SEM FIM, então "100%" não quer dizer nada:
              o SVG media 0×0 e as linhas só apareciam porque o navegador não as
              recortava. Funcionava por sorte, e qualquer `overflow` num
              ancestral apagaria todas as ligações de uma vez, sem erro nenhum.

              Agora a caixa é o retângulo que contém as pontas, e o `viewBox` põe
              o sistema de coordenadas do SVG em cima do sistema do plano — a
              linha usa as mesmas posições que as notas. */}
          {tracos && (
            <svg
              className="canvas-tracos"
              aria-hidden="true"
              style={{ left: tracos.x, top: tracos.y, width: tracos.largura, height: tracos.altura }}
              viewBox={`${tracos.x} ${tracos.y} ${tracos.largura} ${tracos.altura}`}
            >
              {tracos.linhas.map((l) => (
                <g key={l.id}>
                  <path d={l.d} className="traco" fill="none" />
                  {/* DESFAZER MORA NA PRÓPRIA LIGAÇÃO.
                  
                      Havia uma lista "Ligações N" abaixo do canvas, com um
                      "Desfazer" por linha — e ela não está no desenho, por um
                      motivo que se vê usando: para desfazer a ligação entre
                      duas notas que estão na tela, a pessoa rolava para fora do
                      canvas, procurava a linha certa entre trinta parecidas
                      ("A expedição partiu de manhã, c… — Uma foto é obser…") e
                      clicava. A ligação está ali, desenhada.
                      
                      O ponto é o círculo que o desenho põe na junta. Ele só
                      ganha o × sob o ponteiro; parado, é a junta. */}
                  <g
                    className="traco-junta"
                    transform={`translate(${l.mx} ${l.my})`}
                    role="button"
                    tabIndex={0}
                    aria-label="Desfazer esta ligação"
                    onClick={() => aoDesligar(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aoDesligar(l.id); }
                    }}
                  >
                    <circle r="9" className="traco-alvo" />
                    <circle r="4" className="traco-ponto" />
                    <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" className="traco-x" />
                  </g>
                </g>
              ))}
            </svg>
          )}

          {nos.map((no) => (
            <Nota
              key={no.id}
              no={no}
              aoMover={aoMover}
              aoTirar={aoTirar}
              aoLigar={escolher}
              ligando={ligando}
              escolhida={primeira === no.nota_id}
              escala={camera.escala}
            />
          ))}
          </div>

          {/* O CONTROLE DE ZOOM, do canto do desenho. Ele mostra a porcentagem
              porque "menos" e "mais" sem número não deixam voltar ao tamanho
              original — e voltar é a coisa mais pedida depois de se perder. */}
          <div className="canvas-zoom">
            <button type="button" aria-label="Aproximar" onClick={() => aproximar(0.1)}>+</button>
            <button
              type="button"
              className="canvas-zoom-valor"
              onClick={() => setCamera({ x: 0, y: 0, escala: 1 })}
              title="Voltar ao começo"
            >
              {Math.round(camera.escala * 100)}%
            </button>
            <button type="button" aria-label="Afastar" onClick={() => aproximar(-0.1)}>−</button>
          </div>
        </div>

        {/* A LISTA "LIGAÇÕES N" SAIU. Ela não está no desenho, e o custo dela
            aparecia usando: para desfazer a ligação entre duas notas visíveis na
            tela, era preciso rolar para fora do canvas e achar a linha certa
            entre trinta parecidas. O ponto na junta da curva faz o mesmo gesto
            onde a ligação está. */}
      </section>

      <Folha
        aberta={escrevendo}
        titulo="Escrever uma nota"
        aoFechar={() => setEscrevendo(false)}
        acoes={
          <Botao
            tom="primaria"
            disabled={!texto.trim()}
            onClick={async () => {
              if (await aoTrazer({ texto: texto.trim(), x: 40, y: 40 })) setEscrevendo(false);
            }}
          >
            Pôr na superfície
          </Botao>
        }
      >
        <p>
          Uma nota que nasce aqui, sem livro. Ela vale o mesmo que as outras: dá
          para ligar, mover e encontrar depois.
        </p>
        <Campo
          rotulo="A nota"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
        />
      </Folha>

      <Folha
        aberta={trazendo}
        titulo="Trazer uma nota"
        aoFechar={() => setTrazendo(false)}
      >
        <p>As notas que você já tem e que ainda não estão na superfície.</p>
        <ul className="trazer-lista">
          {deFora.map((n, i) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={async () => {
                  /* Espalha em diagonal: empilhar tudo em 40,40 esconderia
                     todas menos a última, e a pessoa acharia que só uma veio. */
                  await aoTrazer({ nota_id: n.id, x: 40 + (i % 5) * 40, y: 40 + (i % 5) * 30 });
                  setTrazendo(false);
                }}
              >
                <span className="trazer-marca" style={{ background: DESTAQUES[n.cor] }} />
                <span className="trazer-texto">{n.trecho}</span>
                <span className="trazer-origem">
                  {n.fonte === "kindle" ? `Kindle · ${n.origem}` : n.origem || "do seu livro"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Folha>
    
      {/* SEM RODAPÉ AQUI. O Canvas é uma superfície SEM FIM, e um rodapé com
          links institucionais logo abaixo dela diz que o plano acabou ali — o
          contrário do que a tela é. Nenhuma outra tela de trabalho contínuo tem
          um: a Leitura também não tem. */}
    </div>
  );
}
