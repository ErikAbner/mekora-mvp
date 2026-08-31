import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import "./notas.css";

/* Todas as notas, num lugar só.
 *
 * Elas já existiam em três lugares — dentro do livro, no Canvas, dentro de um
 * estudo — e em nenhum deles dava para ver o conjunto. Uma nota que se lembra
 * de ter escrito e não se lembra em qual livro era inencontrável.
 *
 * OS RECORTES SÃO OS QUE TÊM DADO POR TRÁS.
 * O protótipo desenha seis: Todas, De livros, Soltas, Para revisar, Ideias e
 * Por pergunta. Três deles — "Para revisar", "Ideias" e a distinção que separa
 * ideia de nota — dependem de um marcador que não existe no modelo, e um
 * recorte que não filtra é um botão que responde ao clique com nada. Eles ficam
 * de fora até haver o que marcar; os que ficam, filtram de verdade.
 */
const RECORTES = [
  { id: "todas", rotulo: "Todas", cabe: () => true },
  { id: "livros", rotulo: "De livros", cabe: (n) => n.fonte === "leitura" || !!n.job_id },
  { id: "kindle", rotulo: "Do Kindle", cabe: (n) => n.fonte === "kindle" },
  { id: "soltas", rotulo: "Soltas", cabe: (n) => n.fonte === "solta" },
  { id: "escritas", rotulo: "Com comentário", cabe: (n) => !!n.comentario },
];

function ondeVeio(n) {
  if (n.fonte === "solta") return "escrita no Canvas";
  if (n.fonte === "kindle") return n.origem ? `Kindle · ${n.origem}` : "do Kindle";
  return n.origem || "de um livro seu";
}

export function Notas({ notas = [], carregando, aoApagar }) {
  const [recorte, setRecorte] = useState("todas");
  const [porLivro, setPorLivro] = useState(true);

  const regra = RECORTES.find((r) => r.id === recorte) ?? RECORTES[0];
  const mostradas = useMemo(() => notas.filter(regra.cabe), [notas, regra]);

  /* AGRUPAR POR ORIGEM é o arranjo que a nota pede: ela pertence a um livro, e
   * ler quinze notas seguidas de livros diferentes é ler quinze assuntos
   * embaralhados. A lista corrida continua disponível — quem procura uma nota
   * específica não quer navegar por livro. */
  const grupos = useMemo(() => {
    if (!porLivro) return [["", mostradas]];
    const mapa = new Map();
    for (const n of mostradas) {
      const chave = ondeVeio(n);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(n);
    }
    return [...mapa.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [mostradas, porLivro]);

  return (
    <div className="mesa">
      <Cabecalho lugar="notas" />

      <section className="notas-lugar">
        <header className="notas-topo">
          <div>
            <h1>Notas</h1>
            <p className="notas-sobre">
              Tudo que você marcou lendo, trouxe do Kindle ou escreveu solto.
            </p>
          </div>
          <Botao
            tom="secundaria"
            aria-pressed={porLivro ? "true" : "false"}
            onClick={() => setPorLivro((v) => !v)}
          >
            {porLivro ? "Ver em lista" : "Agrupar por origem"}
          </Botao>
        </header>

        <nav className="notas-recortes" aria-label="Recortes das notas">
          {RECORTES.map((r) => {
            const quantas = notas.filter(r.cabe).length;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === recorte ? "true" : "false"}
                onClick={() => setRecorte(r.id)}
                disabled={quantas === 0 && r.id !== "todas"}
              >
                {r.rotulo} <span className="dado">{quantas}</span>
              </button>
            );
          })}
        </nav>

        {carregando && <p className="notas-vazio">Buscando…</p>}

        {!carregando && !notas.length && (
          <p className="notas-vazio">
            Nenhuma nota ainda. Marque um trecho enquanto lê, traga o
            <strong> My Clippings.txt</strong> do seu Kindle pela estante, ou
            escreva uma solta no Canvas.
          </p>
        )}

        {!carregando && notas.length > 0 && !mostradas.length && (
          <p className="notas-vazio">Nenhuma nota neste recorte.</p>
        )}

        <div className="notas-grupos">
          {grupos.map(([origem, doGrupo]) => (
            <section key={origem || "todas"} className="notas-grupo">
              {origem && (
                <h2>
                  {origem} <span className="dado">{doGrupo.length}</span>
                </h2>
              )}
              <ul>
                {doGrupo.map((n) => (
                  <li key={n.id}>
                    {/* O CHÃO marca o conteúdo — a nota é o que a pessoa marcou.
                        O comentário dela vem depois, com filete, porque é fala
                        sobre a fala. É a mesma regra da leitura. */}
                    {/* O TRECHO LEVA À NOTA. A lista mostra o que foi marcado;
                        a tela dela mostra o resto — estudos, ligadas, e de onde
                        veio. */}
                    <Link to={`/nota/${n.id}`} className="nota-link">
                      <blockquote style={{ background: DESTAQUES[n.cor] }}>{n.trecho}</blockquote>
                    </Link>
                    {n.comentario && <p className="nota-escrita">{n.comentario}</p>}
                    <div className="nota-pe">
                      {!porLivro && <span className="nota-origem">{ondeVeio(n)}</span>}
                      {n.job_id && <Link to={`/leitura/${n.job_id}`}>Abrir no livro</Link>}
                      {aoApagar && (
                        <button type="button" onClick={() => aoApagar(n)}>Apagar</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
