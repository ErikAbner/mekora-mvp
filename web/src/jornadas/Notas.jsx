import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { TrazerDoKindle } from "../componentes/TrazerDoKindle.jsx";
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
 * Por pergunta. Três deles dependiam de um marcador que não existia no modelo, e
 * um recorte que não filtra é um botão que responde ao clique com nada.
 *
 * "PARA REVISAR" ENTROU EM 03/09, com a marca que faltava — e ela é derivada:
 * a nota sai da lista quando é editada depois de marcada. Ver `revisar_desde`.
 * "Ideias" continua fora: separar ideia de nota ainda não tem o que marcar.
 *
 * DOIS EIXOS, E ELES NÃO SE MISTURAM
 * ==================================
 * ORIGEM   Do livro · Do Kindle · Escritas aqui — exclusivos entre si, porque
 *          uma nota vem de um lugar só.
 * ESTADO   Sem ligação · Para revisar — outro eixo. Uma nota pode ser "Do livro"
 *          E "Sem ligação" ao mesmo tempo.
 *
 * A SELEÇÃO É ÚNICA, um recorte por vez, e isso não é limitação: é o precedente
 * da Estante, e evita a pergunta que dois eixos combináveis criam — "clicar nos
 * dois soma ou troca?". Quem quiser o cruzamento tem a busca.
 *
 * "SOLTAS" VIROU "ESCRITAS AQUI". "Solta" nomeia a nota pelo que ela NÃO tem, e
 * uma nota escrita no Canvas não é deficiente: é um pensamento que não veio de
 * livro. Os dois nomes de origem passaram a ser positivos e paralelos, e
 * "escrita aqui" é palavra que o produto já falava, no rodapé do cartão.
 */

/* A NOTA ESTÁ PARA REVISAR quando foi marcada e NÃO foi editada depois.
 *
 * O critério mora aqui e no servidor pela mesma conta — as duas datas —, e não
 * num campo `para_revisar` que alguém teria de manter. Corrigir uma vírgula
 * limpa a marca, e isso é aceito: a alternativa é o campo que envelhece, e
 * marcar de novo é a correção. */
export const paraRevisar = (n) =>
  Boolean(n.revisar_desde) && !(n.atualizada_em > n.revisar_desde);

const RECORTES = [
  { id: "todas", rotulo: "Todas", cabe: () => true },
  { id: "livros", rotulo: "Do livro", cabe: (n) => n.fonte === "leitura" || !!n.job_id },
  { id: "kindle", rotulo: "Do Kindle", cabe: (n) => n.fonte === "kindle" },
  { id: "escritas-aqui", rotulo: "Escritas aqui", cabe: (n) => n.fonte === "solta" },
  { id: "sem-ligacao", rotulo: "Sem ligação", cabe: (n) => !n.ligadas },
  { id: "revisar", rotulo: "Para revisar", cabe: paraRevisar },
  { id: "escritas", rotulo: "Com comentário", cabe: (n) => !!n.comentario },
];

function ondeVeio(n) {
  /* A ORIGEM REMOVIDA VEM PRIMEIRO: "de lugar nenhum" e "de um lugar que não
     existe mais" são coisas diferentes, e a `DEC-0021 §15` manda dizer qual. */
  if (n.origem_removida_em) return `${n.origem || "um livro"} · removido da estante`;
  if (n.fonte === "solta") return "escrita no Canvas";
  if (n.fonte === "kindle") return n.origem ? `Kindle · ${n.origem}` : "do Kindle";
  return n.origem || "de um livro seu";
}

export function Notas({ notas = [], carregando, aoApagar, aoImportar }) {
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
          <div className="notas-acoes">
            {/* A importação do Kindle mora aqui, e não na estante: o botão que
                eu tinha posto lá não existe no 895:7315. */}
            <TrazerDoKindle aoTrazer={aoImportar} />
            <Botao
              tom="secundaria"
              aria-pressed={porLivro ? "true" : "false"}
              onClick={() => setPorLivro((v) => !v)}
            >
              {porLivro ? "Ver em lista" : "Agrupar por origem"}
            </Botao>
          </div>
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
                title={quantas === 0 && r.id !== "todas" ? `Nenhuma nota em ${r.rotulo.toLowerCase()}` : null}
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
