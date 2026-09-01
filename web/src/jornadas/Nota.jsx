import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import {
  apagarNota, desligarNotas, editarNota, lerEstudos, lerNota,
  lerSugestoes, lerTodasAsNotas, ligarNotas, reunirNoEstudo,
} from "../../../contrato/api.js";
import "./nota.css";

/* Uma nota, aberta.
 *
 * A ROTA É `/nota/:id` NO SINGULAR, e o plural é a lista. Não é preferência de
 * nome: `/notas` já é o caminho da API — `/notas/todas`, `/notas/importar`,
 * `/notas/{id}` — e uma tela em `/notas/93` cairia no backend, que responderia
 * com JSON onde a pessoa espera uma página.
 *
 * É a quarta colisão entre tela e API, e a primeira de SUB-CAMINHO: as três
 * anteriores — entrar, canvas, estudos — disputavam o caminho exato.
 *
 * É onde a nota deixa de ser um item de lista e vira o assunto: o que foi
 * marcado, o que a pessoa escreveu ao lado, de que livro veio, em que estudos
 * está, e a que outras notas se liga.
 *
 * AS SUGESTÕES ESTÃO AQUI, e com as palavras ao lado. O desenho (`895:8545`)
 * prevê "Parecem próximas" e "Talvez", e o `CLAUDE.md` exige que elas venham com
 * as palavras contadas — sem isso seriam palpite apresentado como fato.
 *
 * As duas faixas são o que resolve o C16, que pedia um limiar e alertava que
 * "uma palavra em comum pode ser generoso demais num acervo grande, e calibrar
 * com onze notas seria no escuro". Com faixas, a decisão muda de natureza: um
 * corte único obriga a acertar onde a linha cai; duas faixas nomeadas só
 * precisam estar em ordem, e a pessoa lê o rótulo junto com a evidência.
 *
 * Os cortes aparecem na tela. Errar a fronteira custa um rótulo; escondê-la
 * custa a possibilidade de alguém discordar.
 */

function Trilha({ livro, estudos }) {
  /* A trilha diz de onde a nota veio, e não onde a pessoa clicou. Um caminho
   * baseado em navegação mentiria para quem chegou por link. */
  const passos = [
    { rotulo: "Notas", para: "/notas" },
    livro && { rotulo: livro.titulo, para: `/estante/${livro.id}` },
    estudos[0] && { rotulo: estudos[0].nome, para: "/estudos" },
  ].filter(Boolean);

  return (
    <nav className="trilha-nota" aria-label="Onde esta nota está">
      {passos.map((p, i) => (
        <span key={p.para + i}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          <Link to={p.para}>{p.rotulo}</Link>
        </span>
      ))}
    </nav>
  );
}

export function Nota() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [nota, setNota] = useState(null);
  const [erro, setErro] = useState(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [outras, setOutras] = useState([]);
  const [estudos, setEstudos] = useState([]);
  const [procura, setProcura] = useState("");
  /* As sugestões vêm numa busca própria, e não junto da nota: elas percorrem o
   * acervo inteiro, e prender a abertura da nota a isso faria a tela esperar por
   * um cálculo que ela mostra no fim da página. */
  const [sugestoes, setSugestoes] = useState(null);

  const buscar = useCallback(async () => {
    try {
      const n = await lerNota(id);
      setNota(n);
      setTexto(n.comentario ?? "");
    } catch (e) {
      setErro(e.message);
    }
  }, [id]);

  useEffect(() => { buscar(); }, [buscar]);

  useEffect(() => {
    let vivo = true;
    lerSugestoes(id)
      .then((r) => vivo && setSugestoes(r))
      /* Falhar aqui não é motivo para a nota não abrir: a sugestão é um extra,
         e a seção some em silêncio. */
      .catch(() => vivo && setSugestoes(null));
    return () => { vivo = false; };
  }, [id]);

  useEffect(() => {
    let vivo = true;
    lerTodasAsNotas().then((n) => vivo && setOutras(n)).catch(() => {});
    lerEstudos().then((e) => vivo && setEstudos(e)).catch(() => {});
    return () => { vivo = false; };
  }, [id]);

  if (erro) {
    return (
      <div className="mesa">
        <Cabecalho lugar="notas" />
        <main className="nota-pagina"><p className="npag-erro" role="alert">{erro}</p></main>
      </div>
    );
  }

  if (!nota) {
    return (
      <div className="mesa">
        <Cabecalho lugar="notas" />
        <main className="nota-pagina"><p className="nota-aviso">Buscando…</p></main>
      </div>
    );
  }

  const ligadas = new Set(nota.ligadas.map((l) => l.id));
  const nosEstudos = new Set(nota.estudos.map((e) => e.id));

  const candidatas = outras
    .filter((o) => o.id !== nota.id && !ligadas.has(o.id))
    .filter((o) => !procura.trim() || o.trecho.toLowerCase().includes(procura.trim().toLowerCase()))
    .slice(0, 8);

  return (
    <div className="mesa">
      <Cabecalho lugar="notas" />

      <main className="nota-pagina">
        <Trilha livro={nota.livro} estudos={nota.estudos} />

        {/* O CHÃO marca o que foi lido. É a coisa mais importante da tela, e
            recebe o tratamento de conteúdo — não de citação. */}
        <blockquote className="nota-trecho" style={{ background: DESTAQUES[nota.cor] }}>
          {nota.trecho}
        </blockquote>

        <p className="nota-de-onde">
          {nota.fonte === "solta"
            ? "Escrita no Canvas, sem livro"
            : nota.fonte === "kindle"
              ? `Trazida do Kindle · ${nota.origem}`
              : `Capítulo ${(nota.capitulo ?? 0) + 1}${nota.livro ? ` · ${nota.livro.titulo}` : ""}`}
        </p>

        {/* O filete marca a fala SOBRE a fala. */}
        {escrevendo ? (
          <div className="nota-escrever">
            <label htmlFor="comentario">O que você escreveu ao lado</label>
            <textarea
              id="comentario"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="nota-escrever-acoes">
              <Botao
                tom="primaria"
                onClick={async () => {
                  await editarNota(nota.job_id ?? 0, nota.id, { comentario: texto });
                  setEscrevendo(false);
                  buscar();
                }}
              >
                Guardar
              </Botao>
              <Botao tom="secundaria" onClick={() => { setTexto(nota.comentario ?? ""); setEscrevendo(false); }}>
                Deixar como estava
              </Botao>
            </div>
          </div>
        ) : (
          nota.comentario && <p className="npag-escrita">{nota.comentario}</p>
        )}

        <div className="npag-acoes">
          {nota.livro && (
            <Botao tom="secundaria" onClick={() => navegar(`/leitura/${nota.livro.id}`)}>
              Abrir no livro
            </Botao>
          )}
          {!escrevendo && (
            <Botao tom="secundaria" onClick={() => setEscrevendo(true)}>
              {nota.comentario ? "Editar o que escrevi" : "Escrever ao lado"}
            </Botao>
          )}
          <Botao
            tom="secundaria"
            onClick={async () => {
              await apagarNota(nota.job_id ?? 0, nota.id);
              navegar("/notas");
            }}
          >
            Apagar nota
          </Botao>
        </div>

        <section className="nota-secao">
          <h2>Estudos</h2>
          <p className="nota-aviso">
            A mesma nota pode estar em mais de um — ela não escolhe um assunto.
          </p>
          <div className="nota-chips">
            {estudos.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`chip${nosEstudos.has(e.id) ? " dentro" : ""}`}
                aria-pressed={nosEstudos.has(e.id) ? "true" : "false"}
                onClick={async () => {
                  if (nosEstudos.has(e.id)) return;
                  await reunirNoEstudo(e.id, nota.id);
                  buscar();
                }}
              >
                {e.nome}
              </button>
            ))}
            {!estudos.length && (
              <p className="nota-aviso">
                Nenhum estudo ainda. <Link to="/estudos">Começar um</Link>.
              </p>
            )}
          </div>
        </section>

        <section className="nota-secao">
          <h2>
            Ligadas <span className="dado">{nota.ligadas.length}</span>
          </h2>
          {!nota.ligadas.length && (
            <p className="nota-aviso">
              Nenhuma ainda. Ligar duas notas é dizer que elas se falam — e quem
              diz é você, não o produto.
            </p>
          )}
          <ul className="nota-ligadas">
            {nota.ligadas.map((l) => (
              <li key={l.ligacao_id}>
                <Link to={`/nota/${l.id}`}>
                  <span className="marca-cor" style={{ background: DESTAQUES[l.cor] }} />
                  <span>{l.trecho}</span>
                </Link>
                <button
                  type="button"
                  onClick={async () => { await desligarNotas(l.ligacao_id); buscar(); }}
                >
                  Desfazer
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="nota-secao">
          <h2>Ligar esta nota a qual?</h2>
          <input
            type="search"
            className="nota-procura"
            placeholder="Buscar entre as suas notas"
            aria-label="Buscar entre as suas notas"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
          />
          <ul className="nota-candidatas">
            {candidatas.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={async () => { await ligarNotas(nota.id, o.id); buscar(); }}
                >
                  <span className="marca-cor" style={{ background: DESTAQUES[o.cor] }} />
                  <span className="candidata-texto">{o.trecho}</span>
                  <span className="candidata-origem">
                    {o.fonte === "solta" ? "escrita no Canvas" : o.origem || "de um livro seu"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!candidatas.length && (
            <p className="nota-aviso">
              {procura.trim() ? "Nenhuma nota com esse texto." : "Não há outras notas para ligar ainda."}
            </p>
          )}
        </section>

        {/* AS SUGESTÕES, em faixas nomeadas e com a evidência ao lado.
            Cada uma diz quantas palavras as duas notas dividem e QUAIS — é o que
            permite discordar, e é o que o CLAUDE.md exige de qualquer coisa que
            o produto proponha por conta própria. */}
        {sugestoes && (sugestoes.proximas?.length || sugestoes.talvez?.length) ? (
          <>
            {[
              ["proximas", "Parecem próximas", sugestoes.cortes?.proximas],
              ["talvez", "Talvez", sugestoes.cortes?.talvez],
            ].map(([chave, titulo, corte]) =>
              sugestoes[chave]?.length ? (
                <section className="nota-secao nota-sugestoes" key={chave}>
                  <h2>{titulo}</h2>
                  {/* O CORTE APARECE. Limiar escondido é limiar em que ninguém
                      pode discordar — e este é o do C16, que ficou aberto
                      justamente por não haver como calibrá-lo às cegas. */}
                  <p className="nota-aviso">
                    A partir de {corte} {corte === 1 ? "palavra" : "palavras"} de assunto em comum.
                  </p>
                  <ul className="nota-candidatas">
                    {sugestoes[chave].map((sug) => (
                      <li key={sug.id}>
                        <button
                          type="button"
                          onClick={async () => {
                            await ligarNotas(nota.id, sug.id);
                            buscar();
                            lerSugestoes(id).then(setSugestoes).catch(() => {});
                          }}
                        >
                          <span className="marca-cor" style={{ background: DESTAQUES[sug.cor] }} />
                          <span className="candidata-texto">{sug.trecho}</span>
                          <span className="candidata-origem">
                            {sug.quantas} em comum: {sug.palavras.join(", ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
