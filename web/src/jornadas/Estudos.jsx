import { useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import "./estudos.css";

/* Os Estudos: os recortes que você monta a partir do que leu.
 *
 * Um estudo é um CENTRO — uma pergunta ou uma afirmação — e as notas reunidas
 * em volta dele. Os livros não são campo: saem das notas, e por isso nunca
 * ficam desatualizados.
 */

/* EXPORTADO para a pagina de um estudo so. Reusar o mesmo componente e o que
 * impede as duas telas de divergirem: uma acao acrescentada aqui aparece nas
 * duas, e nao em uma delas ate alguem notar. */
export function Estudo({ estudo, notasDisponiveis, aoMudar, aoApagar, aoReunir, aoTirar, semLink = false }) {
  const [reunindo, setReunindo] = useState(false);
  const dentro = new Set(estudo.notas.map((n) => n.id));
  const deFora = notasDisponiveis.filter((n) => !dentro.has(n.id));

  return (
    <article className={`estudo${estudo.fechado ? " fechado" : ""}`}>
      <header>
        <div>
          <h2>
            {/* Na lista o titulo leva ao estudo sozinho; na pagina dele, o
                `semLink` tira o link para o titulo nao apontar para onde a
                pessoa ja esta. */}
            {semLink ? estudo.nome : <Link to={`/estudo/${estudo.id}`}>{estudo.nome}</Link>}
          </h2>
          {/* O CENTRO em destaque, e não como legenda. É ele que o estudo é;
              o nome é só como se chama. */}
          {estudo.sobre && <p className="estudo-sobre">{estudo.sobre}</p>}
        </div>
        {estudo.fechado && <span className="estudo-selo">respondido</span>}
      </header>

      <p className="estudo-resumo">
        <span className="dado">{estudo.notas.length}</span>{" "}
        {estudo.notas.length === 1 ? "nota" : "notas"}
        {estudo.livros.length > 0 && (
          <> · de {estudo.livros.join(", ")}</>
        )}
      </p>

      {estudo.notas.length > 0 && (
        <ul className="estudo-notas">
          {estudo.notas.map((n) => (
            <li key={n.id}>
              <blockquote style={{ background: DESTAQUES[n.cor] }}>{n.trecho}</blockquote>
              {n.comentario && <p className="estudo-comentario">{n.comentario}</p>}
              <div className="estudo-nota-acoes">
                <span className="estudo-origem">
                  {n.fonte === "kindle" ? `Kindle · ${n.origem}` : n.origem || "do seu livro"}
                </span>
                {n.job_id && <Link to={`/leitura/${n.job_id}`}>Abrir no livro</Link>}
                <button type="button" onClick={() => aoTirar(estudo.id, n.id)}>Tirar daqui</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!estudo.notas.length && (
        <p className="estudo-vazio">
          Nenhuma nota reunida ainda. Um estudo é a pergunta mais o que você
          juntou em volta dela.
        </p>
      )}

      <footer className="estudo-acoes">
        <Botao tom="secundaria" onClick={() => setReunindo(true)} disabled={!deFora.length}>
          Reunir nota {deFora.length > 0 && <span className="dado">{deFora.length}</span>}
        </Botao>
        {/* FECHAR NÃO ARQUIVA: o estudo continua inteiro e visível. Fechar diz
            que a pergunta foi respondida, não que ela deixou de interessar — e
            continuar lendo o livro não a reabre. */}
        <Botao tom="secundaria" onClick={() => aoMudar(estudo.id, { fechado: !estudo.fechado })}>
          {estudo.fechado ? "Reabrir" : "Marcar respondido"}
        </Botao>
        <Botao tom="secundaria" onClick={() => aoApagar(estudo.id)}>Apagar o estudo</Botao>
      </footer>

      <Folha
        aberta={reunindo}
        titulo={`Reunir em "${estudo.nome}"`}
        aoFechar={() => setReunindo(false)}
      >
        <p>
          As notas que você tem e que ainda não estão neste estudo. A mesma nota
          pode estar em mais de um.
        </p>
        <ul className="reunir-lista">
          {deFora.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={async () => {
                  await aoReunir(estudo.id, n.id);
                  setReunindo(false);
                }}
              >
                <span className="reunir-marca" style={{ background: DESTAQUES[n.cor] }} />
                <span className="reunir-texto">{n.trecho}</span>
                <span className="reunir-origem">
                  {n.fonte === "kindle" ? `Kindle · ${n.origem}` : n.origem || "do seu livro"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Folha>
    </article>
  );
}

export function Estudos({ estudos = [], notas = [], erro, aoCriar, aoMudar, aoApagar, aoReunir, aoTirar }) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [sobre, setSobre] = useState("");

  return (
    <div className="mesa">
      <Cabecalho lugar="estudos" />

      <section className="estudos">
        <header className="estudos-topo">
          <div>
            <h1>Estudos</h1>
            <p className="estudos-sobre">
              Os recortes que você monta a partir do que leu. Cada um tem uma
              pergunta no centro, e as notas que você juntou em volta dela.
            </p>
          </div>
          <Botao tom="primaria" onClick={() => { setNome(""); setSobre(""); setCriando(true); }}>
            Começar um estudo
          </Botao>
        </header>

        {erro && <p className="estudos-erro" role="alert">{erro}</p>}

        {!estudos.length && (
          <p className="estudos-vazio">
            Nenhum estudo ainda. Um estudo começa com uma pergunta que você quer
            responder — ou com uma afirmação que quer sustentar.
          </p>
        )}

        <div className="estudos-lista">
          {estudos.map((e) => (
            <Estudo
              key={e.id}
              estudo={e}
              notasDisponiveis={notas}
              aoMudar={aoMudar}
              aoApagar={aoApagar}
              aoReunir={aoReunir}
              aoTirar={aoTirar}
            />
          ))}
        </div>
      </section>

      <Folha
        aberta={criando}
        titulo="Começar um estudo"
        aoFechar={() => setCriando(false)}
        acoes={
          <Botao
            tom="primaria"
            disabled={!nome.trim()}
            onClick={async () => {
              if (await aoCriar({ nome: nome.trim(), sobre: sobre.trim() })) setCriando(false);
            }}
          >
            Começar
          </Botao>
        }
      >
        <Campo
          rotulo="Como se chama"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
        {/* O CENTRO PODE SER PERGUNTA OU AFIRMAÇÃO, e a ajuda diz isso: exigir
            pergunta faria o centro do estudo ser gramaticalmente diferente de
            tudo o que mora dentro dele — as notas são quase todas afirmações. */}
        <Campo
          rotulo="O que está no centro"
          ajuda="Uma pergunta que você quer responder, ou uma afirmação que quer sustentar."
          value={sobre}
          onChange={(e) => setSobre(e.target.value)}
        />
      </Folha>
    
      <Rodape />
    </div>
  );
}
