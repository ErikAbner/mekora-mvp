import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { DESTAQUES } from "./Leitura.jsx";
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

function Nota({ no, aoMover, aoTirar, aoLigar, ligando, escolhida, escala = 1 }) {
  const caixa = useRef(null);
  const arrasto = useRef(null);
  const [posicao, setPosicao] = useState(null);

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
    background: DESTAQUES[no.cor] ?? DESTAQUES.amarelo,
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
      <p className="nota-texto">{no.texto}</p>
      {no.comentario && <p className="nota-comentario">{no.comentario}</p>}

      <footer>
        {/* A ORIGEM FICA, e leva de volta. O item 6 do contrato pede "manter a
            origem da nota, e abri-la" — sem isso a nota vira texto sem
            procedência, e voltar ao livro exigiria procurá-la. */}
        <span className="nota-origem">
          {no.fonte === "solta" ? "escrita aqui" : no.origem || "do seu livro"}
        </span>
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
      </footer>
    </article>
  );
}

export function Canvas({ nos = [], ligacoes = [], notas = [], erro, aoTrazer, aoMover, aoTirar, aoLigar, aoDesligar }) {
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
        <header className="canvas-topo">
          <div>
            <h1>Canvas</h1>
            <p className="canvas-sobre">
              O espaço onde as notas se ligam umas às outras. Nada se move
              sozinho: o que está aqui foi posto por você.
            </p>
          </div>

          <div className="canvas-acoes">
            <Botao tom="secundaria" onClick={() => { setTexto(""); setEscrevendo(true); }}>
              Escrever uma nota
            </Botao>
            <Botao tom="secundaria" onClick={() => setTrazendo(true)} disabled={!deFora.length}>
              Trazer nota {deFora.length > 0 && <span className="dado">{deFora.length}</span>}
            </Botao>
            <Botao
              tom={ligando ? "primaria" : "secundaria"}
              aria-pressed={ligando ? "true" : "false"}
              onClick={() => { setLigando((v) => !v); setPrimeira(null); }}
              disabled={nos.length < 2}
            >
              {ligando ? "Escolhendo…" : "Ligar duas"}
            </Botao>
          </div>
        </header>

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
          className="canvas-mundo"
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
          <svg className="canvas-tracos" aria-hidden="true">
            {ligacoes.map((l) => {
              const a = posicaoDe(l.de_id);
              const b = posicaoDe(l.para_id);
              if (!a || !b) return null;
              return (
                <line
                  key={l.id}
                  x1={a.x + 110} y1={a.y + 50}
                  x2={b.x + 110} y2={b.y + 50}
                  className="traco"
                />
              );
            })}
          </svg>

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

        {ligacoes.length > 0 && (
          <div className="canvas-ligacoes">
            <h2>Ligações <span className="dado">{ligacoes.length}</span></h2>
            <ul>
              {ligacoes.map((l) => {
                const a = posicaoDe(l.de_id);
                const b = posicaoDe(l.para_id);
                return (
                  <li key={l.id}>
                    <span>
                      {(a?.texto ?? "").slice(0, 30)}… — {(b?.texto ?? "").slice(0, 30)}…
                    </span>
                    <button type="button" onClick={() => aoDesligar(l.id)}>Desfazer</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
    
      <Rodape />
    </div>
  );
}
