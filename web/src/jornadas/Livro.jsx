import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import { analisar, lerNotas, lerProgresso } from "../../../contrato/api.js";
import "./livro.css";

/* A ficha de um livro, inteira.
 *
 * A estante mostra um resumo ao lado da grade; aqui cabe o que não cabe lá: as
 * notas todas, e o que a conversão fez com o arquivo.
 *
 * "ESTE ARQUIVO" É HONESTIDADE, NÃO DETALHE TÉCNICO. O Mekora transforma o que
 * a pessoa envia — reconhece texto de página escaneada, converte formato,
 * às vezes traduz. Ela precisa poder saber o que aconteceu com o documento
 * dela, e a única forma de saber é o produto contar.
 */

/* Cada linha só aparece quando há o que dizer. Uma ficha-arquivo com seis "—" descreve
 * a ausência de informação com a mesma ênfase da informação. */
function Linha({ rotulo, children }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="ficha-arquivo-linha">
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Livro() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [livro, setLivro] = useState(null);
  const [notas, setNotas] = useState([]);
  const [onde, setOnde] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      analisar(id),
      lerNotas(id).catch(() => []),
      lerProgresso(id).catch(() => null),
    ])
      .then(([l, n, p]) => {
        if (!vivo) return;
        setLivro(l);
        setNotas(n);
        setOnde(p);
      })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [id]);

  if (erro) {
    return (
      <div className="mesa">
        <Cabecalho lugar="estante" />
        <main className="livro-pagina"><p className="livro-pagina-erro" role="alert">{erro}</p></main>
      </div>
    );
  }

  if (!livro) {
    return (
      <div className="mesa">
        <Cabecalho lugar="estante" />
        <main className="livro-pagina"><p className="livro-pagina-nota">Buscando…</p></main>
      </div>
    );
  }

  const titulo = livro.final_title || livro.detected_title || livro.original_filename;
  const autor = livro.final_author || livro.detected_author || "";
  const capa = (livro.thumbnails ?? [])[0];

  return (
    <div className="mesa">
      <Cabecalho lugar="estante" />

      <main className="livro-pagina">
        <Link to="/estante" className="livro-pagina-volta">← Estante</Link>

        <header className="livro-pagina-topo">
          <div className="livro-pagina-capa">
            {capa ? (
              <img src={capa} alt={`Primeira página de ${titulo}`} />
            ) : (
              /* Livro sem capa não vira buraco: a caixa fica, com o título
                 dentro. Uma lacuna parece defeito de carregamento. */
              <span className="livro-pagina-capa-vazia">{titulo}</span>
            )}
          </div>

          <div className="livro-pagina-identidade">
            <h1>{titulo}</h1>
            {autor && <p className="livro-pagina-autor">{autor}</p>}

            {onde?.capitulos > 0 && (
              <p className="livro-pagina-onde">
                Você está no capítulo <span className="dado">{onde.capitulo + 1}</span> de{" "}
                <span className="dado">{onde.capitulos}</span>
              </p>
            )}

            <div className="livro-pagina-acoes">
              <Botao
                tom="primaria"
                disabled={!livro.leitura_url}
                onClick={() =>
                  navegar(`/leitura/${id}`, { state: { url: livro.leitura_url, titulo } })
                }
              >
                {onde?.capitulos > 0 ? "Continuar lendo" : "Começar a ler"}
              </Botao>
              {!livro.leitura_url && (
                <p className="livro-pagina-nota">Ainda em preparo. O texto abre quando a conversão terminar.</p>
              )}
            </div>
          </div>
        </header>

        <section className="livro-pagina-secao">
          <h2>
            O que ficou <span className="dado">{notas.length}</span>
          </h2>
          {!notas.length && (
            <p className="livro-pagina-nota">
              Nada marcado neste livro ainda. Selecione um trecho durante a
              leitura para guardar aqui.
            </p>
          )}
          <ul className="livro-pagina-notas">
            {notas.map((n) => (
              <li key={n.id}>
                <blockquote style={{ background: DESTAQUES[n.cor] }}>{n.trecho}</blockquote>
                {n.comentario && <p className="livro-pagina-comentario">{n.comentario}</p>}
                <p className="livro-pagina-lugar">
                  {/* CAPÍTULO, e não página: a página muda quando a fonte muda,
                      e o número que se guarda é outro. */}
                  Capítulo {(n.capitulo ?? 0) + 1}
                  {n.fonte === "kindle" && " · trazida do Kindle"}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="livro-pagina-secao">
          <h2>Este arquivo</h2>
          <p className="livro-pagina-nota">
            O que o Mekora fez com o documento que você enviou.
          </p>
          <dl className="ficha-arquivo">
            <Linha rotulo="Formato de origem">
              {livro.input_format ? livro.input_format.toUpperCase() : null}
            </Linha>
            <Linha rotulo="Páginas">
              {livro.page_count ? <span className="dado">{livro.page_count}</span> : null}
            </Linha>
            <Linha rotulo="Documento digitalizado">
              {/* `is_scanned` é `Optional` de propósito: "não sei" é resposta
                  legítima, e diferente de "não é". Por isso a comparação é
                  estrita — `!livro.is_scanned` trataria as duas como iguais. */}
              {livro.is_scanned === true
                ? "Sim — o texto foi reconhecido por OCR"
                : livro.is_scanned === false
                  ? "Não — o texto já estava no arquivo"
                  : null}
            </Linha>
            <Linha rotulo="Texto reconhecido">
              {livro.ocr_used ? "Sim, por OCR" : null}
            </Linha>
            <Linha rotulo="Traduzido">
              {livro.translation_enabled
                ? `De ${livro.source_language || "?"} para ${livro.target_language || "?"}`
                : null}
            </Linha>
            <Linha rotulo="Quadrinho">
              {livro.comic_mode ? (livro.manga_rtl ? "Sim, lido da direita para a esquerda" : "Sim") : null}
            </Linha>
            <Linha rotulo="No seu Kindle">
              {livro.kindle_sent ? "Enviado" : "Ainda não enviado"}
            </Linha>
            <Linha rotulo="Chegou aqui em">
              {livro.created_at ? new Date(livro.created_at).toLocaleDateString("pt-BR", {
                day: "numeric", month: "long", year: "numeric",
              }) : null}
            </Linha>
          </dl>
        </section>
      </main>
    </div>
  );
}
