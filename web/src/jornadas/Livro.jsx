import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { ConfiguracoesArquivo } from "../componentes/ConfiguracoesArquivo.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import { analisar, criarNota, lerNotas, lerProgresso } from "../../../contrato/api.js";
import { tamanhoLegivel } from "../../../contrato/tamanho.js";
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
  const [ajustando, setAjustando] = useState(false);
  /* "Escrever sobre o livro" — nó 895:7839. */
  const [sobreOLivro, setSobreOLivro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [recado, setRecado] = useState(null);

  /* `rodada` sobe quando algo muda de fora — renomear, por exemplo — e faz a
   * ficha buscar de novo. Sem isto o nome novo só apareceria ao recarregar a
   * página, e a tela ficaria mostrando o nome antigo depois de confirmar a
   * troca. */
  const [rodada, setRodada] = useState(0);

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
  }, [id, rodada]);

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
            {/* O ⋮ AO LADO DO TÍTULO — o nó 966:29052 o tem, e ele abre o que já
                existia como um botão de largura inteira embaixo de "Continuar
                lendo". Cinco decisões raras não merecem o mesmo peso visual da
                ação que se faz sempre. */}
            <div className="livro-pagina-titulo">
              <h1>{titulo}</h1>
              <button
                type="button"
                className="livro-pagina-mais"
                aria-label="Configurações de arquivo"
                aria-haspopup="dialog"
                onClick={() => setAjustando(true)}
              >
                <span aria-hidden="true">⋮</span>
              </button>
            </div>
            {autor && <p className="livro-pagina-autor">{autor}</p>}

            {/* OS SELOS: o que o arquivo é, e em que pé ele está. O desenho os
                põe logo abaixo do título. Cada um só aparece quando há o que
                dizer — uma fileira de "—" descreve a ausência com a ênfase da
                informação. */}
            {(() => {
              const selos = [
                livro.input_format && livro.input_format.toUpperCase(),
                tamanhoLegivel(livro.input_bytes),
                livro.page_count && `${livro.page_count} páginas`,
                livro.leitura_url ? "Preparado" : "Em preparo",
                livro.kindle_sent ? "No Kindle" : null,
              ].filter(Boolean);
              return (
                <ul className="livro-pagina-selos">
                  {selos.map((t) => <li key={t}>{t}</li>)}
                </ul>
              );
            })()}

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
                {/* NOTA SEM TRECHO NÃO VIRA CAIXA VAZIA COLORIDA. A nota escrita
                    sobre o livro não aponta para frase nenhuma, e um bloco de cor
                    sem texto dentro é uma citação de nada. */}
                {n.trecho
                  ? <blockquote style={{ background: DESTAQUES[n.cor] }}>{n.trecho}</blockquote>
                  : null}
                {n.comentario && <p className="livro-pagina-comentario">{n.comentario}</p>}
                <p className="livro-pagina-lugar">
                  {/* CAPÍTULO, e não página: a página muda quando a fonte muda,
                      e o número que se guarda é outro. */}
                  {n.fonte === "livro" ? "Sobre o livro" : `Capítulo ${(n.capitulo ?? 0) + 1}`}
                  {n.fonte === "kindle" && " · trazida do Kindle"}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ESCREVER SOBRE O LIVRO — nó 895:7839.
         *
         * Uma nota do LIVRO INTEIRO, sem trecho: o que se pensa depois de ler, e
         * que não cabe em nenhuma frase marcada. Até agora toda nota precisava
         * de um trecho para existir, e o pensamento sobre o conjunto não tinha
         * onde morar.
         *
         * GUARDA NO BOTÃO, e não ao sair do campo. No caderno o `onBlur` grava
         * porque a nota já existe e o que muda é o comentário dela; aqui o
         * gesto CRIA — e criar sem clique nenhum faria uma nota nascer de um
         * clique fora do campo. */}
        <section className="livro-pagina-secao">
          <h2>Escrever sobre o livro</h2>
          <p className="livro-pagina-nota">
            O que ficou do conjunto, e não de uma frase. Fica com o livro, junto
            das outras notas.
          </p>
          <textarea
            className="livro-pagina-escrever"
            placeholder="Escreva aqui..."
            aria-label="O que você quer dizer sobre este livro"
            value={sobreOLivro}
            onChange={(e) => { setSobreOLivro(e.target.value); setRecado(null); }}
          />
          <div className="livro-pagina-acoes">
            <Botao
              tom="primaria"
              disabled={!sobreOLivro.trim() || guardando}
              onClick={async () => {
                setGuardando(true);
                setRecado(null);
                try {
                  /* Sem trecho, e sem âncora: `de` e `ate` em zero dizem que ela
                     não aponta para lugar nenhum do texto. */
                  await criarNota(id, {
                    capitulo: 0, de: 0, ate: 0, cor: "amarelo",
                    trecho: "", comentario: sobreOLivro.trim(), fonte: "livro",
                  });
                  setSobreOLivro("");
                  setRodada((n) => n + 1);
                  setRecado("Guardado com o livro.");
                } catch (e) {
                  setRecado(e.status === 401 ? "Entre para guardar notas." : e.message);
                } finally {
                  setGuardando(false);
                }
              }}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </Botao>
            {recado && <p className="livro-pagina-nota" role="status">{recado}</p>}
          </div>
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

      <ConfiguracoesArquivo
        aberta={ajustando}
        aoFechar={() => setAjustando(false)}
        livro={livro}
        notas={notas.length}
        aoMudar={() => setRodada((n) => n + 1)}
      />
    </div>
  );
}
