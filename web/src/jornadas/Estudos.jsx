import { useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { achatar } from "../../../contrato/texto.js";
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
/* `resumido` é a lista; o inteiro é a página do estudo.
 *
 * Nos nós 900:56142 e 895:8849 o estudo na LISTA é um cartão: rótulo, pergunta,
 * "N livros · N notas" e a fileira de capas. As notas não estão lá — elas são o
 * conteúdo do estudo, e a lista é o índice dele.
 *
 * A tela mostrava tudo, e três estudos de vinte notas viravam uma rolagem onde
 * nenhum deles se lia. O changelog já dizia que isso tinha sido resolvido pelo
 * título virar link, e não tinha: o link foi acrescentado e as notas ficaram. */
export function Estudo({ estudo, notasDisponiveis, aoMudar, aoApagar, aoReunir, aoTirar, semLink = false, resumido = false }) {
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
          <> · de <span className="dado">{estudo.livros.length}</span>{" "}
          {estudo.livros.length === 1 ? "livro" : "livros"}</>
        )}
      </p>

      {/* LIVROS — a faixa de capas do nó 966:29743.
          Ela dizia " · de Malha Urbana, Sequência Noturna" em texto cinza: para
          quem tem quarenta livros na estante, o nome sozinho não diz de qual se
          trata. A capa diz de relance, e leva de volta ao livro.

          O livro sem arquivo — nota trazida do Kindle, que guarda só o título —
          entra com a caixa vazia e o nome dentro. Sumir com ele porque não há
          arquivo seria o produto negar o que a própria nota diz. */}
      {estudo.livros.length > 0 && (
        <div className="estudo-livros">
          <h3>Livros</h3>
          <ul>
            {estudo.livros.map((l) => (
              <li key={l.id ?? l.titulo}>
                {l.id ? (
                  <Link to={`/estante/${l.id}`} title={`Ver ${l.titulo} na estante`}>
                    {l.capa
                      ? <img src={l.capa} alt="" aria-hidden="true" loading="lazy" />
                      : <span className="estudo-livro-vazio">{l.titulo}</span>}
                    <span className="estudo-livro-nome">{l.titulo}</span>
                  </Link>
                ) : (
                  <span className="estudo-livro-fora">
                    <span className="estudo-livro-vazio">{l.titulo}</span>
                    <span className="estudo-livro-nome">{l.titulo}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!resumido && estudo.notas.length > 0 && (
        <ul className="estudo-notas">
          {estudo.notas.map((n) => (
            <li key={n.id}>
              {/* A CAPA DO LIVRO ao lado do trecho — o nó 966:31095 a tem.
                  Numa lista de trinta trechos de quatro livros, a capa é o que
                  separa um do outro de relance; o nome em texto cinza obriga a
                  ler. Nota escrita solta não tem livro, e aí não tem capa: a
                  linha simplesmente não a mostra. */}
              <div className="estudo-nota-corpo">
                {n.capa && (
                  <img className="estudo-nota-capa" src={n.capa} alt="" aria-hidden="true" loading="lazy" />
                )}
                <blockquote style={{ background: DESTAQUES[n.cor] }}>{n.trecho}</blockquote>
              </div>
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

      {!resumido && !estudo.notas.length && (
        <p className="estudo-vazio">
          Nenhuma nota reunida ainda. Um estudo é a pergunta mais o que você
          juntou em volta dela.
        </p>
      )}

      {/* Na lista o cartão termina nas capas: as ações são do estudo aberto, e
          três fileiras de botões numa lista de dez estudos é ruído sobre o que a
          lista existe para mostrar. */}
      {!resumido && (
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
      )}

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

/* AS TRÊS COLUNAS DA VISTA "LEITURA" — nó 895:8849: A ler, Lendo, Lido.
 *
 * O estado sai da FRAÇÃO LIDA, que é o que o servidor guarda. Nulo não é zero:
 * livro sem progresso nenhum é livro que ninguém abriu, e é isso que "A ler"
 * quer dizer — não "está em 0%".
 *
 * O CORTE DE "LIDO" É 0,98 E NÃO 1. A fração vem da rolagem do navegador, e a
 * última tela de um EPUB quase nunca fecha em 1,0 exato: sobra o rodapé do
 * arquivo, a margem final, o bloco que não chega ao fim do visor. Exigir 1
 * deixaria livro terminado eternamente em "Lendo", e é o tipo de erro que a
 * pessoa não tem como corrigir.
 */
const COLUNAS = [
  { id: "aler", rotulo: "A ler", cabe: (l) => typeof l.fracao !== "number" || l.fracao <= 0 },
  { id: "lendo", rotulo: "Lendo", cabe: (l) => typeof l.fracao === "number" && l.fracao > 0 && l.fracao < 0.98 },
  { id: "lido", rotulo: "Lido", cabe: (l) => typeof l.fracao === "number" && l.fracao >= 0.98 },
];

/* OS RECORTES DOS ESTUDOS — o nó 966:31095 os tem, e a tela não tinha.
 *
 * "Fechado" não quer dizer apagado: fechar um estudo é dizer que a pergunta foi
 * respondida, e o que se respondeu continua valendo a releitura. Por isso o
 * recorte, e não um filtro que some com eles. */
/* Quantas notas soltas a tela mostra antes de mandar para as Notas. Vinte é o
 * que cabe numa rolagem sem virar uma segunda tela de Notas dentro dos Estudos. */
const LIMITE_DAS_SOLTAS = 20;

const RECORTES = [
  { id: "abertos", rotulo: "Abertos", cabe: (e) => !e.fechado },
  { id: "respondidos", rotulo: "Respondidos", cabe: (e) => e.fechado },
  { id: "tudo", rotulo: "Tudo", cabe: () => true },
];

export function Estudos({ estudos = [], notas = [], livros = [], erro, aoCriar, aoMudar, aoApagar, aoReunir, aoTirar }) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [sobre, setSobre] = useState("");
  const [recorte, setRecorte] = useState("abertos");
  /* A BUSCA DO TOPO — nós 900:56142 e 895:8849, logo abaixo do subtítulo. Ela
     procura no nome do estudo, na pergunta e no TEXTO DAS NOTAS reunidas: o
     desenho escreve "Buscar em livros, notas e contextos", e é isso que torna a
     busca útil aqui — quem procura raramente lembra em qual gaveta pôs. */
  const [procura, setProcura] = useState("");
  /* AS DUAS VISTAS DO NÓ — "Lista" e "Leitura". A primeira são os estudos; a
     segunda é o acervo repartido por onde a leitura está. As duas respondem
     perguntas diferentes sobre o mesmo material, e por isso não são duas telas:
     "o que eu estou juntando" e "o que eu estou lendo". */
  const [vista, setVista] = useState("lista");

  /* AS NOTAS QUE NÃO ESTÃO EM ESTUDO NENHUM — a seção "Fora de estudo" do
   * 966:31095, e a que fecha o gesto: sem ela não há de onde puxar. Um estudo
   * se monta a partir do que sobrou solto, e a tela não mostrava esse resto em
   * lugar nenhum.
   *
   * A conta é feita AQUI e não no servidor: as duas listas já chegam inteiras
   * para desenhar os estudos, e uma rota nova só para subtrair uma da outra
   * seria uma ida à rede para uma diferença de conjuntos. */
  const reunidas = new Set(estudos.flatMap((e) => (e.notas ?? []).map((n) => n.id)));
  const soltas = notas.filter((n) => !reunidas.has(n.id));

  /* AS ANOTAÇÕES ESCRITAS E NÃO LEVADAS — o cartão cinza do desenho, "4
     anotações escritas e ainda não levadas". É um subconjunto do "Fora de
     estudo": as que têm COMENTÁRIO, ou seja, aquelas em que a pessoa parou para
     escrever alguma coisa e mesmo assim não as levou para lugar nenhum. Marcar
     um trecho é barato; escrever sobre ele não é. */
  const escritasESoltas = soltas.filter((n) => n.comentario);

  const alvo = achatar(procura.trim());
  const visiveis = estudos
    .filter(RECORTES.find((r) => r.id === recorte)?.cabe ?? (() => true))
    .filter((e) =>
      !alvo ||
      achatar(
        [e.nome, e.sobre, ...(e.notas ?? []).map((n) => `${n.trecho ?? ""} ${n.comentario ?? ""}`),
         ...(e.livros ?? []).map((l) => l.titulo)].join(" "),
      ).includes(alvo),
    );

  return (
    <div className="mesa">
      <Cabecalho lugar="estudos" />

      <section className="estudos">
        <header className="estudos-topo">
          <div>
            <h1>Estudos</h1>
            {/* A FRASE É A DO DESENHO (900:56142). A que estava aqui explicava a
                mecânica — "cada um tem uma pergunta no centro" —, e a do desenho
                diz por que a área existe: uma nota pode ficar de fora, e isso
                não é um defeito da arrumação. */}
            <p className="estudos-sobre">
              Livros e notas reunidos em volta de uma mesma coisa. Uma nota pode
              ficar de fora — nem toda ideia entra numa gaveta.
            </p>
          </div>
          <Botao tom="primaria" onClick={() => { setNome(""); setSobre(""); setCriando(true); }}>
            Começar um estudo
          </Botao>
        </header>

        {erro && <p className="estudos-erro" role="alert">{erro}</p>}

        {estudos.length > 0 && (
          <Campo
            tipo="search"
            rotulo="Buscar nos estudos"
            rotuloOculto
            placeholder="Buscar em livros, notas e contextos"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
          />
        )}

        {/* O QUE FICOU PELA METADE — o cartão cinza do desenho. Ele não é um
            aviso: é o lembrete de que escrever e arquivar são gestos
            diferentes, e que o segundo é sempre da pessoa. */}
        {escritasESoltas.length > 0 && (
          <aside className="estudos-metade">
            <p className="estudos-metade-marca">
              O que ficou pela metade <span className="dado">{escritasESoltas.length}</span>
            </p>
            <h2>
              {escritasESoltas.length === 1
                ? "1 anotação escrita e ainda não levada"
                : `${escritasESoltas.length} anotações escritas e ainda não levadas`}
            </h2>
            <p>
              Elas estão no livro. Levar é um gesto seu, e é o que faz esta área
              valer.
            </p>
          </aside>
        )}

        {/* A contagem ao lado de cada recorte vem da MESMA lista que ele filtra:
            um recorte vazio se anuncia antes de ser clicado, em vez de levar a
            uma tela em branco sem explicação. */}
        {estudos.length > 0 && (
          <nav className="estudos-recortes" aria-label="Recortes dos estudos">
            {RECORTES.map((r) => {
              const quantos = estudos.filter(r.cabe).length;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={r.id === recorte ? "true" : "false"}
                  disabled={quantos === 0 && r.id !== recorte}
                  onClick={() => setRecorte(r.id)}
                >
                  {r.rotulo} <span className="dado">{quantos}</span>
                </button>
              );
            })}
          </nav>
        )}

        {!estudos.length && (
          <p className="estudos-vazio">
            Nenhum estudo ainda. Um estudo começa com uma pergunta que você quer
            responder — ou com uma afirmação que quer sustentar.
          </p>
        )}

        {estudos.length > 0 && !visiveis.length && (
          <p className="estudos-vazio">
            Nenhum estudo neste recorte. Os outros continuam nos seus.
          </p>
        )}

        {/* O ALTERNADOR LISTA / LEITURA — nós 900:56142 e 895:8849. Mesma forma
            dos outros alternadores do sistema: uma caixa, dois botões, o ativo
            em tinta cheia. */}
        {livros.length > 0 && (
          <nav className="estudos-vistas" aria-label="Como ver os estudos">
            {[["lista", "Lista"], ["leitura", "Leitura"]].map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === vista ? "true" : "false"}
                onClick={() => setVista(id)}
              >
                {rotulo}
              </button>
            ))}
          </nav>
        )}

        {vista === "leitura" && (
          <div className="estudos-quadro">
            {COLUNAS.map(({ id, rotulo, cabe }) => {
              const dela = livros.filter(cabe);
              return (
                <section key={id} className="estudos-coluna">
                  <h2>
                    {rotulo} <span className="dado">{dela.length}</span>
                  </h2>
                  {!dela.length && <p className="estudos-vazio">Nenhum aqui.</p>}
                  <ul>
                    {dela.map((l) => (
                      <li key={l.chave}>
                        <Link to={`/estante/${l.chave}`}>
                          {l.capa
                            ? <img src={l.capa} alt="" aria-hidden="true" loading="lazy" />
                            : <span className="estudos-livro-vazio">{l.titulo}</span>}
                          <span className="estudos-livro-texto">
                            <span className="estudos-livro-nome">{l.titulo}</span>
                            {l.autor && <span className="estudos-livro-autor">{l.autor}</span>}
                            {/* A porcentagem e a barra só existem em quem está
                                sendo lido: no "A ler" elas seriam zero em toda
                                linha, e zero repetido não informa. */}
                            {id === "lendo" && (
                              <>
                                <span className="estudos-livro-onde">
                                  <span className="dado">{Math.round(l.fracao * 100)}%</span> lido
                                </span>
                                <span className="estudos-livro-barra">
                                  <span style={{ inlineSize: `${Math.round(l.fracao * 100)}%` }} />
                                </span>
                              </>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <div className="estudos-lista" hidden={vista !== "lista"}>
          {visiveis.map((e) => (
            <Estudo
              key={e.id}
              estudo={e}
              notasDisponiveis={notas}
              aoMudar={aoMudar}
              aoApagar={aoApagar}
              aoReunir={aoReunir}
              aoTirar={aoTirar}
              resumido
            />
          ))}
        </div>

        {/* FORA DE ESTUDO — o que sobrou solto, e de onde um estudo se monta.
            O nó 966:31095 tem esta seção, e sem ela a tela mostra o que já foi
            reunido e esconde o material. */}
        {soltas.length > 0 && (
          <section className="estudos-soltas">
            <h2>
              Fora de estudo <span className="dado">{soltas.length}</span>
            </h2>
            <p className="estudos-sobre">
              Notas que você marcou e ainda não levou para lugar nenhum. Um
              estudo começa aqui.
            </p>
            <ul>
              {soltas.slice(0, LIMITE_DAS_SOLTAS).map((n) => (
                <li key={n.id}>
                  <blockquote style={{ background: DESTAQUES[n.cor] }}>{n.trecho}</blockquote>
                  <p className="estudos-solta-origem">
                    {n.origem || (n.fonte === "solta" ? "escrita no Canvas" : "de um livro seu")}
                  </p>
                </li>
              ))}
            </ul>
            {soltas.length > LIMITE_DAS_SOLTAS && (
              /* O TETO É DITO, e não escondido. Uma lista cortada em silêncio
                 faz a pessoa achar que só há vinte notas soltas. */
              <p className="estudos-sobre">
                Mostrando {LIMITE_DAS_SOLTAS} de <span className="dado">{soltas.length}</span>.
                As outras estão em <Link to="/notas">Notas</Link>.
              </p>
            )}
          </section>
        )}
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
