/* Estante — grade. O fim da jornada: o arquivo virou livro.
 *
 * Vem do nó 895:7315. Aqui a jornada fecha: o que entrou pela Mesa aparece como
 * objeto na estante, com autor, contagem de notas e o ponto onde a leitura
 * parou.
 *
 * Duas regras do sistema aparecem juntas nesta tela:
 *
 * O FILTRO É NOMEADO, e não um eixo repetido. "Tudo · Com nota · No Kindle ·
 * Quadrinhos" são recortes que a grade não mostra sozinha — um recorte não pode
 * repetir o eixo da vista.
 *
 * A TAG É PÍLULA, e por regra: `--rp` é de dado — tag, chip, trilho,
 * interruptor. Pílula e círculo são os 5% que quebram a retidão, e funcionam por
 * serem raros.
 */
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import "./estante.css";

const marcador = "/icones/marcador-notas.svg";
const RECORTES = ["Tudo", "Com nota", "No Kindle", "Quadrinhos"];

function Livro({ titulo, autor, notas, capa }) {
  return (
    <li className="livro">
      <div className="capa-caixa">
        {notas > 0 && (
          <span
            className="marcador"
            style={{ maskImage: `url(${marcador})`, WebkitMaskImage: `url(${marcador})` }}
          >
            <span className="marcador-numero dado">{notas}</span>
          </span>
        )}
        <img src={capa} alt={`Capa de ${titulo}`} className="capa" />
      </div>
      <div className="livro-texto">
        <h3>{titulo}</h3>
        <p>{autor}</p>
      </div>
    </li>
  );
}

export function Estante({ livros = [], selecionado, aoAbrir }) {
  return (
    <div className="mesa">
      <Cabecalho lugar="estante" />

      <section className="estante">
        <div className="estante-grade">
          {/* Recorte nomeado, nao eixo repetido. */}
          <nav className="recortes" aria-label="Recortes da estante">
            {RECORTES.map((r, i) => (
              <button key={r} type="button" aria-pressed={i === 0}>
                {r}
              </button>
            ))}
          </nav>

          <ul className="grade">
            {livros.map((l) => (
              <Livro key={l.chave} {...l} />
            ))}
          </ul>
        </div>

        <aside className="ficha" aria-label="Livro selecionado">
          <nav className="recortes vista" aria-label="Modo de vista">
            <button type="button" aria-pressed={true}>Capas</button>
            <button type="button" aria-pressed={false}>Estante em 3D</button>
          </nav>

          {selecionado && (
            <article className="ficha-caixa">
              <header>
                <h2>{selecionado.titulo}</h2>
                <p className="ficha-meta">
                  {selecionado.autor} · {selecionado.formato} ·{" "}
                  <span className="dado">{selecionado.lido}%</span> lido
                </p>
              </header>

              {/* O progresso e derivado da leitura, nunca um campo mantido. */}
              <div
                className="progresso"
                role="progressbar"
                aria-valuenow={selecionado.lido}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${selecionado.titulo}: ${selecionado.lido}% lido`}
              >
                <div className="progresso-feito" style={{ inlineSize: `${selecionado.lido}%` }} />
              </div>

              <div className="ficha-notas">
                <h3>
                  <span className="dado">{selecionado.notas}</span> notas
                </h3>
                {/* O filete marca a citacao; o chao marca o conteudo. */}
                <blockquote>{selecionado.amostra}</blockquote>
                <p className="etiquetas">
                  {selecionado.etiquetas.map((e) => (
                    <span key={e} className="etiqueta">{e}</span>
                  ))}
                </p>
              </div>

              <div className="ficha-acoes">
                <button type="button" className="primaria" onClick={() => aoAbrir?.(selecionado)}>Continuar</button>
                <button type="button" className="secundaria">Notas</button>
              </div>
            </article>
          )}
        </aside>
      </section>
    </div>
  );
}
