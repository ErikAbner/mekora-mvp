import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import {
  apagarNotaPorId, criarEstudo, desfazerDispensa, desligarNotas, dispensarSugestao,
  lerEstudos, lerNota, lerSugestoes, lerTodasAsNotas, ligarNotas, mudarNota,
  reunirNoEstudo, tirarDoEstudo,
} from "../../../contrato/api.js";
import { paraRevisar } from "./Notas.jsx";
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
  const [copiado, setCopiado] = useState(null);
  /* A última dispensada, para o desfazer. `null` é "não há o que desfazer". */
  const [dispensada, setDispensada] = useState(null);
  const [texto, setTexto] = useState("");
  const [outras, setOutras] = useState([]);
  const [estudos, setEstudos] = useState([]);
  const [procura, setProcura] = useState("");
  const [ligando, setLigando] = useState(false);
  /* As sugestões vêm numa busca própria, e não junto da nota: elas percorrem o
   * acervo inteiro, e prender a abertura da nota a isso faria a tela esperar por
   * um cálculo que ela mostra no fim da página. */
  const [sugestoes, setSugestoes] = useState(null);
  const [montando, setMontando] = useState(false);

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
        <blockquote className="nota-trecho" data-clarity-mask="true" style={{ background: DESTAQUES[nota.cor] }}>
          {nota.trecho}
        </blockquote>

        {/* DE ONDE ELA VEIO — e "de lugar nenhum" e "de um lugar que não existe
            mais" são coisas diferentes.
            
            A `DEC-0021 §15` manda que a nota sobreviva ao livro apagado, com a
            origem MARCADA como removida. Sem esta linha dizer isso, a nota que
            perdeu o livro fica igual à nota escrita no Canvas, que nunca teve um
            — e a pessoa lê "sem livro" sobre um trecho que ela marcou lendo. */}
        <p className="nota-de-onde">
          {nota.origem_removida_em
            ? `${nota.origem || "O livro desta nota"} · removido da estante`
            : nota.fonte === "solta"
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
                  /* PELA ROTA DA NOTA, e não pela do trabalho: `job_id ?? 0`
                     não casava com as notas de `job_id` NULO — as do Canvas e as
                     do Kindle —, e o servidor respondia 404. Editar uma nota do
                     Canvas por esta página era impossível até 03/09. */
                  await mudarNota(nota.id, { comentario: texto });
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

        {/* O RECADO DO COPIAR fica junto das ações, e some sozinho. */}
        {copiado && <p className="npag-copiado" role="status">{copiado}</p>}

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
          {/* COPIAR COM ORIGEM — nó `895:8848`.
              
              "Com origem" é a coisa toda: um trecho colado sem de onde veio vira
              uma frase órfã no documento de alguém, e reencontrar a fonte depois
              é trabalho que ninguém faz. Vai a citação, o livro e o capítulo — e
              o que a pessoa escreveu ao lado, quando escreveu, porque é dela.
              
              A nota do Kindle não tem livro daqui, e a `origem` dela é o título
              que o Kindle escreveu; a nota solta do Canvas não tem nenhum dos
              dois, e aí a origem é essa: escrita aqui. Nenhum dos três casos
              inventa procedência.
              
              E o produto DIZ quando não conseguiu, como a paleta da leitura já
              fazia: `clipboard.write` é recusado por permissão, por documento
              sem foco, por navegador antigo. */}
          <Botao
            tom="secundaria"
            onClick={async () => {
              const de = nota.livro
                ? `${nota.livro.titulo}, capítulo ${(nota.capitulo ?? 0) + 1}`
                : nota.origem
                  ? `${nota.origem} · trazida do Kindle`
                  : "escrita no Canvas, sem livro";
              const texto = [
                nota.trecho ? `“${nota.trecho}”` : null,
                `— ${de}`,
                nota.comentario ? `\n${nota.comentario}` : null,
              ].filter(Boolean).join("\n");
              try {
                await navigator.clipboard.writeText(texto);
                setCopiado("Copiado com a origem.");
              } catch {
                setCopiado("O navegador não deixou copiar. Use Ctrl+C.");
              }
              setTimeout(() => setCopiado(null), 2500);
            }}
          >
            Copiar com origem
          </Botao>
          {/* REVISAR DEPOIS — `895:8659`, e ele só entrou com o piso que faltava.
              
              Marcar é EXPLÍCITO, porque é intenção, e intenção não se deduz:
              adivinhar o que alguém quer reler é a "IA mágica" que o `CLAUDE.md`
              proíbe. Limpar é DERIVADO: a nota sai da lista quando é editada
              depois da marca. Assim o estado nunca envelhece — a condição de
              saída é um fato, e não uma tarefa que alguém tem de lembrar.
              
              E existe VISTA: o recorte "Para revisar", em `/notas`. Sem os dois,
              a marca seria promessa que o produto não cumpre — a pessoa marca e
              nunca mais vê. */}
          <Botao
            tom="secundaria"
            onClick={async () => {
              const marcada = paraRevisar(nota);
              await mudarNota(nota.id, { revisar: !marcada });
              buscar();
            }}
          >
            {paraRevisar(nota) ? "Não revisar depois" : "Revisar depois"}
          </Botao>
          <Botao
            tom="secundaria"
            onClick={async () => {
              await apagarNotaPorId(nota.id);
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
            {/* O CHIP TIRA TAMBÉM — e até 03/09 ele só somava.
                
                `if (nosEstudos.has(e.id)) return;` fazia o chip de um estudo em
                que a nota JÁ ESTÁ aceitar o clique e não responder, que é o
                defeito que o `CLAUDE.md` nomeia: botão que não responde ensina a
                não clicar. E não havia outro caminho — a rota
                `DELETE /estudos/{id}/notas/{id}` existia sem nada que a
                chamasse.
                
                O QUADRO PÕE "Remover dos estudos" COMO AÇÃO SEPARADA, na linha
                das ações da nota, e aqui ele não serve: a mesma nota pode estar
                em vários estudos — a linha logo acima diz isso —, e uma ação só
                teria de tirar de todos sem dizer quais, ou abrir um escolhedor
                que o quadro não tem. O chip já mostra de quais ela é; tirar é o
                mesmo gesto no mesmo lugar. A divergência está no DESVIOS.md, com
                as palavras do quadro no `title`. */}
            {estudos.map((e) => {
              const dentro = nosEstudos.has(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`chip${dentro ? " dentro" : ""}`}
                  aria-pressed={dentro ? "true" : "false"}
                  title={dentro ? "Remover dos estudos" : `Reunir em ${e.nome}`}
                  onClick={async () => {
                    if (dentro) await tirarDoEstudo(e.id, nota.id);
                    else await reunirNoEstudo(e.id, nota.id);
                    buscar();
                  }}
                >
                  {e.nome}
                </button>
              );
            })}
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

          <Botao tom="secundaria" onClick={() => setLigando(true)}>
            Ligar a outra nota
          </Botao>
        </section>

        {/* LIGAR VIROU FOLHA — nó 941:23108 (A-24).
            Ela era uma seção fixa da página, sempre aberta com a lista inteira
            de notas embaixo da nota que se está lendo. O desenho a põe por
            cima, e por uma razão que a tela mostra: ligar é raro e a página é
            para LER a nota, não para escolher entre quarenta outras. */}
        <Folha
          aberta={ligando}
          titulo="Ligar esta nota a qual?"
          aoFechar={() => { setLigando(false); setProcura(""); }}
        >
          <input
            type="search"
            className="nota-procura"
            placeholder="Buscar entre as suas notas"
            aria-label="Buscar entre as suas notas"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
          />
          <ul className="nota-candidatas nota-candidatas-folha">
            {candidatas.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={async () => {
                    await ligarNotas(nota.id, o.id);
                    setLigando(false);
                    setProcura("");
                    buscar();
                  }}
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
        </Folha>

        {/* AS SUGESTÕES, em faixas nomeadas e com a evidência ao lado.
            Cada uma diz quantas palavras as duas notas dividem e QUAIS — é o que
            permite discordar, e é o que o CLAUDE.md exige de qualquer coisa que
            o produto proponha por conta própria. */}
        {/* "TALVEZ UM ESTUDO" — a TERCEIRA faixa do nó 895:8545, que o cabeçalho
            do `sugestoes_service` já nomeava e que não existia em tela nenhuma.
            As outras duas propõem uma LIGAÇÃO entre duas notas; esta propõe algo
            diferente: que um grupo inteiro vire uma gaveta.

            A condição é aritmética, e está escrita para poder ser discordada:
            três ou mais notas na faixa "parecem próximas", e esta nota fora de
            qualquer estudo. Três é o menor número em que "um assunto" é mais
            provável que "uma coincidência entre duas frases" — abaixo disso, a
            ligação entre duas já diz tudo o que há para dizer.

            O produto NÃO CRIA o estudo sozinho, e não escreve a pergunta: ele
            leva a pessoa até o formulário com as notas já escolhidas. A pergunta
            do centro é o estudo inteiro, e é a única coisa aqui que ninguém pode
            escrever no lugar dela. */}
        {sugestoes?.proximas?.length >= 3 && !nota.estudos.length && (
          <section className="nota-secao nota-talvez-estudo">
            <h2>Talvez um estudo</h2>
            <p className="nota-aviso">
              Esta nota e mais <span className="dado">{sugestoes.proximas.length}</span>{" "}
              dividem assunto, e nenhuma delas está em estudo nenhum. Um estudo é
              uma pergunta no centro e o que você juntou em volta — a pergunta é
              sua, o resto já está aqui.
            </p>
            <Botao
              tom="secundaria"
              disabled={montando}
              onClick={async () => {
                setMontando(true);
                try {
                  /* O NOME NASCE DO TRECHO, e é editável na hora seguinte: um
                     estudo sem nome não aparece na lista, e pedir o nome antes
                     de existir alguma coisa é a pergunta na hora errada. */
                  const semente = (nota.trecho || nota.comentario || "Notas parecidas").slice(0, 60);
                  const novo = await criarEstudo({ nome: semente, sobre: "" });
                  for (const n of [nota, ...sugestoes.proximas]) {
                    await reunirNoEstudo(novo.id, n.id).catch(() => {});
                  }
                  navegar(`/estudo/${novo.id}`);
                } catch (e) {
                  setErro(e.message);
                  setMontando(false);
                }
              }}
            >
              {montando ? "Montando…" : `Juntar as ${sugestoes.proximas.length + 1} num estudo`}
            </Botao>
          </section>
        )}

        {/* O AVISO COM DESFAZER — o padrão que o Canvas já usa para o que não
            se pode reconstruir sozinho. Ele diz O QUE saiu, e não "pronto". */}
        {dispensada && (
          <p className="nota-dispensada" role="status">
            Dispensada: “{dispensada.trecho.slice(0, 60)}
            {dispensada.trecho.length > 60 ? "…" : ""}”.{" "}
            <button
              type="button"
              onClick={async () => {
                await desfazerDispensa(nota.id, dispensada.id);
                setDispensada(null);
                lerSugestoes(id).then(setSugestoes).catch(() => {});
              }}
            >
              Desfazer
            </button>
          </p>
        )}

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
                        {/* DUAS AÇÕES, e não um cartão que liga ao ser tocado.
                          
                          O nó `895:8780` põe as duas lado a lado —
                          "Confirmar a ligação" e "Ir para nota" —, e a diferença
                          não é de arranjo: até 03/09 o cartão INTEIRO era um
                          botão que ligava no primeiro clique. Não havia como ler
                          a candidata antes de afirmar que ela se liga, e ligar é
                          o ato de quem diz que duas notas se falam. O produto
                          fazia a pessoa dizer isso sobre um trecho de duas
                          linhas que ela não podia abrir.
                          
                          "Confirmar" é o verbo do quadro, e ele está certo aqui:
                          a sugestão já foi feita pelo sistema; o que falta é o
                          aceite. */}
                        <div className="candidata">
                          <span className="marca-cor" style={{ background: DESTAQUES[sug.cor] }} />
                          <div className="candidata-corpo">
                            <span className="candidata-texto">{sug.trecho}</span>
                            {/* A CONTAGEM FICA AO LADO, que é o que o
                                `CLAUDE.md` exige de toda sugestão: ela precisa
                                poder ser discordada, e para isso a pessoa tem de
                                ver com base em quê. */}
                            <span className="candidata-origem">
                              {sug.quantas} em comum: {sug.palavras.join(", ")}
                            </span>
                          </div>
                        </div>
                        <div className="candidata-acoes">
                          <Botao
                            tom="secundaria"
                            onClick={async () => {
                              await ligarNotas(nota.id, sug.id);
                              buscar();
                              lerSugestoes(id).then(setSugestoes).catch(() => {});
                            }}
                          >
                            Confirmar a ligação
                          </Botao>
                          {/* IR PARA NOTA é navegação, e não ato: ela abre a
                              candidata para ser lida, e não liga nada. */}
                          <Link to={`/nota/${sug.id}`} className="candidata-ir">
                            Ir para nota
                          </Link>
                          {/* DISPENSAR — a norma pedia e a tela não tinha.
                              
                              O `SISTEMA.md` declara a relação "dispensada" como
                              forma vigente: *"uma sugestão que volta na próxima
                              visita deixa de ser sugestão e vira insistência"*.
                              Aqui as candidatas voltavam para sempre, e a única
                              saída era LIGAR — o oposto do que a pessoa quis
                              dizer.
                              
                              É texto, e não caixa: dispensar não tem a mesma
                              altura que confirmar. E vem com desfazer no mesmo
                              instante, abaixo — sem ele o gesto seria silencioso
                              E permanente, e um clique errado mataria a sugestão
                              sem ninguém saber. */}
                          <button
                            type="button"
                            className="candidata-dispensar"
                            onClick={async () => {
                              await dispensarSugestao(nota.id, sug.id);
                              setDispensada({ id: sug.id, trecho: sug.trecho });
                              lerSugestoes(id).then(setSugestoes).catch(() => {});
                            }}
                          >
                            Dispensar
                          </button>
                        </div>
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
