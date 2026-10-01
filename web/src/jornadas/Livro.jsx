import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { ConfiguracoesArquivo } from "../componentes/ConfiguracoesArquivo.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Icone } from "../componentes/Icone.jsx";
import { achatar } from "../../../contrato/texto.js";
import { estadoDe } from "../../../contrato/estado.js";
import { analisar, apagarNota, criarNota, editarNota, enviarAoKindle, lerNotas, lerProgresso } from "../../../contrato/api.js";
import { tamanhoLegivel } from "../../../contrato/tamanho.js";
import "./livro.css";
import { CapaDeReserva } from "../componentes/CapaDeReserva.jsx";

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

/* O QUE UMA NOTA É, pelo que ela tem.
 *
 * O nó 895:7631 recorta "O que ficou" em marcadores, anotações e rascunho, e o
 * modelo não guarda um TIPO: guarda trecho, comentário e fonte. Os dois
 * primeiros recortes saem daí sem inventar campo — trecho sozinho é marca,
 * trecho com comentário é anotação, e sem trecho é o que se escreveu sobre o
 * livro. "Rascunho" não sai: não há estado de nota no modelo, e um recorte que
 * devolve sempre zero não é filtro, é promessa.
 */
const ehRascunho = (n) => n.estado === "rascunho";
const ehSobreOLivro = (n) => !n.trecho && !ehRascunho(n);
const ehMarcador = (n) => Boolean(n.trecho) && !n.comentario && !ehRascunho(n);
const ehAnotacao = (n) => Boolean(n.trecho) && Boolean(n.comentario) && !ehRascunho(n);

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
  /* O RECORTE E A BUSCA DE "O QUE FICOU" — nó 895:7631. A lista de notas de um
     livro lido chega a dezenas, e o desenho põe as duas coisas acima dela: os
     recortes por tipo e um campo de busca. Sem eles, achar uma nota é rolar. */
  const [recorte, setRecorte] = useState("tudo");
  const [procura, setProcura] = useState("");
  const [limiteNotas, setLimiteNotas] = useState(40);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [copiada, setCopiada] = useState(null);
  const [notaEditando, setNotaEditando] = useState(null);
  const [comentarioEditado, setComentarioEditado] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [tituloAberto, setTituloAberto] = useState(false);
  const [tituloTemCorte, setTituloTemCorte] = useState(false);
  const tituloRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      analisar(id),
      lerNotas(id).catch(() => []),
      lerProgresso(id).catch(() => null),
    ])
      .then(([l, n, p]) => {
        if (!vivo) return;
        /* UM TRABALHO QUE NÃO ESTÁ PRONTO NÃO MORA AQUI, e esta linha é o par
         * do filtro da Estante.
         *
         * Desde 07/09 a grade só lista livro pronto. Sem isto, um endereço
         * antigo — um favorito, uma aba aberta desde ontem, o botão de voltar —
         * abriria a ficha de um arquivo ainda em conversão: capa de reserva,
         * "Ainda em preparo", e nada para ler. O lugar dele é o preparo, e o
         * `substituir` tira a ficha do histórico para que voltar não caia de
         * novo na mesma tela.
         *
         * O ramo de erro e o de bloqueio vêm juntos de propósito: `estadoDe`
         * responde "pronto" só quando o trabalho pedido terminou, e as outras
         * quatro respostas — fila, trabalhando, erro, precisa — são todas Mesa. */
        if (estadoDe(l).estado !== "pronto") {
          navegar(`/preparo/${id}`, { replace: true });
          return;
        }
        setLivro(l);
        setNotas(n);
        setOnde(p);
      })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [id, rodada]);

  useEffect(() => { setLimiteNotas(40); }, [recorte, procura, id]);

  const titulo = livro?.final_title || livro?.detected_title || livro?.original_filename || "";
  const autor = livro?.final_author || livro?.detected_author || "";

  /* TÍTULO EXTREMO É MEDIDO, NÃO ADIVINHADO PELO NÚMERO DE CARACTERES.
   *
   * Cento e vinte letras podem caber em duas linhas no computador e ocupar oito
   * no telefone; um nome curto com uma palavra sem espaços pode fazer o inverso.
   * A versão anterior usava `titulo.length > 180`, por isso o mesmo livro podia
   * ganhar ou perder o controle de expansão sem relação com o espaço real.
   *
   * O `ResizeObserver` refaz a conta quando a coluna muda. Enquanto o título
   * está aberto preservamos o último resultado — medir uma caixa sem o limite
   * responderia apenas que ela cabe em si mesma. */
  useEffect(() => {
    const elemento = tituloRef.current;
    if (!elemento || tituloAberto) return undefined;
    const medirCorte = () => setTituloTemCorte(elemento.scrollHeight > elemento.clientHeight + 1);
    medirCorte();
    const observador = typeof ResizeObserver === "function" ? new ResizeObserver(medirCorte) : null;
    observador?.observe(elemento);
    window.addEventListener("resize", medirCorte);
    return () => {
      observador?.disconnect();
      window.removeEventListener("resize", medirCorte);
    };
  }, [titulo, tituloAberto]);

  useEffect(() => {
    setTituloAberto(false);
    setTituloTemCorte(false);
  }, [id]);

  if (erro) {
    return (
      <div className="mesa">
        <Cabecalho lugar="estante" />
        <main className="livro-pagina" data-clarity-mask="true"><p className="livro-pagina-erro" role="alert">{erro}</p></main>
      </div>
    );
  }

  if (!livro) {
    return (
      <div className="mesa">
        <Cabecalho lugar="estante" />
        <main className="livro-pagina" data-clarity-mask="true"><p className="livro-pagina-nota">Buscando…</p></main>
      </div>
    );
  }

  /* A lista que a tela mostra: o recorte primeiro, a busca depois. As duas
     coisas são o mesmo filtro em cascata, e derivadas — não há uma segunda
     lista guardada para discordar da primeira. */
  const alvo = achatar(procura.trim());
  const visiveis = notas
    .filter((n) =>
      recorte === "marcadores" ? ehMarcador(n)
      : recorte === "anotacoes" ? ehAnotacao(n)
      : recorte === "sobre" ? ehSobreOLivro(n)
      : recorte === "rascunho" ? ehRascunho(n)
      : true,
    )
    .filter((n) => !alvo || achatar(`${n.trecho ?? ""} ${n.comentario ?? ""}`).includes(alvo));
  const notasNaPagina = visiveis.slice(0, limiteNotas);
  const capa = livro.cover_url || (livro.thumbnails ?? [])[0];

  return (
    <div className="mesa">
      <Cabecalho lugar="estante" />

      <main className="livro-pagina" data-clarity-mask="true">
        <div className="livro-pagina-corpo">
        <header className="livro-pagina-topo" id="livro-inicio">
          <div className="livro-pagina-capa">
            {capa ? (
              <img src={capa} alt={`Primeira página de ${titulo}`} />
            ) : (
              /* Livro sem capa não vira buraco: a caixa fica, com o título
                 dentro. Uma lacuna parece defeito de carregamento. */
              <CapaDeReserva className="livro-pagina-capa-vazia" titulo={titulo} autor={autor} formato={(livro.input_format || "").toUpperCase() || null} chave={id} />
            )}
          </div>

          <div className="livro-pagina-identidade">
            {/* O ⋮ AO LADO DO TÍTULO — o nó 966:29052 o tem, e ele abre o que já
                existia como um botão de largura inteira embaixo de "Continuar
                lendo". Cinco decisões raras não merecem o mesmo peso visual da
                ação que se faz sempre. */}
            <div className="livro-pagina-titulo">
              <h1
                ref={tituloRef}
                className={!tituloAberto ? "livro-pagina-titulo-recolhido" : undefined}
              >
                {titulo}
              </h1>
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
            {tituloTemCorte && (
              <button
                type="button"
                className="livro-pagina-titulo-alternar"
                aria-expanded={tituloAberto ? "true" : "false"}
                onClick={() => setTituloAberto((v) => !v)}
              >
                {tituloAberto ? "Recolher título" : "Mostrar título completo"}
              </button>
            )}
            {/* OS SELOS: o que o arquivo é, e em que pé ele está. O desenho os
                põe logo abaixo do título. Cada um só aparece quando há o que
                dizer — uma fileira de "—" descreve a ausência com a ênfase da
                informação. */}
            <div className="livro-pagina-dados">
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

            {/* DE ONDE ESTE LIVRO VEIO — "Origem · Relatório de pesquisa,
                expedição 02.pdf", no nó 895:7631. O nome do arquivo enviado
                desaparecia assim que o título era detectado, e é ele que
                responde "qual dos meus PDFs virou este livro". */}
            {livro.original_filename && livro.original_filename !== titulo && (
              <p className="livro-pagina-origem">
                Origem · <span className="livro-pagina-origem-nome">{livro.original_filename}</span>
              </p>
            )}
            </div>

            {/* A BARRA DE LEITURA — o desenho mostra "Epub · 80% lido" com uma
                barra cheia abaixo do autor. A tela dizia só "capítulo 2 de 6",
                que é o número mais pobre dos dois: capítulos têm tamanhos
                diferentes, e o segundo de seis pode ser 12% ou 40% do livro.

                A fração continua podendo faltar — leitura registrada antes de
                ela existir —, e aí a frase do capítulo é o que sobra. Nulo não
                é zero. */}
            {/* O AUTOR MORA AQUI, e não debaixo do título. No nó 895:7700 ele
                divide um bloco de 16 de vão com "Epub · 80% lido" e a barra:
                quem escreveu e onde você parou são a mesma pergunta — de quem é
                este livro e quanto dele já é seu.

                O BLOCO EXISTE MESMO SEM LEITURA. Pôr o autor dentro do ramo da
                barra o faria sumir em todo livro ainda não aberto — e é
                justamente aí que saber de quem é o livro mais importa. */}
            <div className="livro-pagina-leitura">
              {autor && <p className="livro-pagina-autor">{autor}</p>}
            {typeof onde?.fracao === "number" ? (
              <>
                <p className="livro-pagina-onde">
                  {(livro.leitura_url ? "EPUB" : livro.input_format?.toUpperCase()) || "Arquivo"} ·{" "}
                  <span className="dado">{Math.round(onde.fracao * 100)}%</span> lido
                </p>
                <div
                  className="livro-pagina-barra"
                  role="progressbar"
                  aria-valuenow={Math.round(onde.fracao * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Quanto do livro já foi lido"
                >
                  <span style={{ inlineSize: `${Math.round(onde.fracao * 100)}%` }} />
                </div>
              </>
            ) : onde?.capitulos > 0 ? (
              <p className="livro-pagina-onde">
                Você está no capítulo <span className="dado">{onde.capitulo + 1}</span> de{" "}
                <span className="dado">{onde.capitulos}</span>
              </p>
            ) : null}
            </div>

            {/* A ÚLTIMA COISA MARCADA, logo abaixo — a citação com filete do
                desenho. É o que faz a ficha lembrar do livro em vez de só
                descrevê-lo. */}
            {notas.find((n) => n.trecho)?.trecho && (
              <blockquote className="livro-pagina-ultima">
                {notas.find((n) => n.trecho).trecho}
              </blockquote>
            )}

            <div className="livro-pagina-acoes">
              <Botao
                tom="primaria"
                porque={!livro.leitura_url ? "Este livro ainda não tem texto para ler aqui" : null}
                onClick={() =>
                  navegar(`/leitura/${id}`, { state: { url: livro.leitura_url, titulo } })
                }
              >
                {onde?.capitulos > 0 ? "Continuar lendo" : "Ler"}
              </Botao>

              {/* ENVIAR AO KINDLE e VER O PREPARO, os outros dois botões do
                  desenho. O envio existia só na estante, e "ver o preparo" em
                  lugar nenhum — a tela que conta o que foi feito com o arquivo
                  não tinha como levar até ela. */}
              <Botao
                tom="secundaria"
                porque={!livro.leitura_url ? "Este livro ainda não tem arquivo preparado" : enviado ? "Já enviado ao Kindle" : enviando ? "Enviando…" : null}
                onClick={async () => {
                  setEnviando(true);
                  try {
                    await enviarAoKindle(id);
                    setEnviado(true);
                  } catch (e) {
                    setErro(e.message);
                  } finally {
                    setEnviando(false);
                  }
                }}
              >
                {enviando ? "Enviando…" : enviado || livro.kindle_sent ? "No Kindle" : "Enviar ao Kindle"}
              </Botao>

              <Link to={`/preparo/${id}`} className="livro-pagina-preparo">Ver o preparo</Link>

            </div>

            {livro.paginas_sem_texto > 0 && !livro.is_scanned && (
              <aside className="livro-pagina-aviso">
                <p>
                  <Icone src="/icones/icone-defeito.svg" />
                  <span>
                    <span className="dado">{livro.paginas_sem_texto}</span>{" "}
                    {livro.paginas_sem_texto === 1
                      ? "página ficou sem texto."
                      : "páginas ficaram sem texto."}
                  </span>
                </p>
                <Link to={`/preparo/${id}`} className="botao secundaria">Ver as páginas</Link>
              </aside>
            )}
          </div>
        </header>

        <section className="livro-pagina-secao" id="livro-o-que-ficou">
          <nav className="livro-pagina-indice" aria-label="Nesta página">
            <a href="#livro-inicio"><span aria-hidden="true" />Início</a>
            <a href="#livro-o-que-ficou" aria-current="location"><span aria-hidden="true" />O que ficou</a>
            {notas.slice(0, 3).map((n) => (
              <a key={n.id} href={`#nota-${n.id}`} title={n.comentario || n.trecho || "Nota"}>
                <span aria-hidden="true" />{n.comentario || n.trecho || "Nota"}
              </a>
            ))}
            <a href="#livro-escrever"><span aria-hidden="true" />Escreva sobre o livro</a>
          </nav>
          <div className="livro-pagina-o-que-ficou-conteudo">
          <h2>O que ficou</h2>
          {!notas.length && (
            <p className="livro-pagina-nota">
              Nada marcado neste livro ainda. Selecione um trecho durante a
              leitura para guardar aqui.
            </p>
          )}

          {/* Os três recortes seguem o frame 895:7631. Rascunhos só acrescentam
              um quarto recorte quando realmente existem; assim a função já
              disponível não desaparece, mas também não altera o estado comum. */}
          {notas.length > 0 && (
            <div className="livro-pagina-filtro">
              <nav className="recortes soltos" aria-label="Recortes das notas">
                {[
                  ["marcadores", "marcados", notas.filter(ehMarcador).length],
                  ["anotacoes", "anotações", notas.filter(ehAnotacao).length],
                  ["sobre", "com nota", notas.filter(ehSobreOLivro).length],
                  ...(notas.some(ehRascunho) ? [["rascunho", "rascunhos", notas.filter(ehRascunho).length]] : []),
                ].map(([chave, rotulo, quantos]) => (
                  <button
                    key={chave}
                    type="button"
                    aria-pressed={chave === recorte ? "true" : "false"}
                    disabled={quantos === 0 && chave !== recorte}
                    title={quantos === 0 && chave !== recorte ? `Nenhuma nota em ${rotulo.toLowerCase()}` : null}
                    onClick={() => setRecorte((atual) => atual === chave ? "tudo" : chave)}
                  >
                    <span className="dado">{quantos}</span> {rotulo}
                  </button>
                ))}
              </nav>
              <div className="livro-pagina-busca">
                <Campo
                  tipo="search"
                  rotulo="Buscar nas notas deste livro"
                  rotuloOculto
                  placeholder="Buscar em livros, notas e contexto"
                  value={procura}
                  onChange={(e) => setProcura(e.target.value)}
                />
              </div>
            </div>
          )}

          {notas.length > 0 && !visiveis.length && (
            <p className="livro-pagina-nota" role="status">
              Nenhuma nota deste livro combina com o que você procurou.
            </p>
          )}

          <ul className="livro-pagina-notas">
            {notasNaPagina.map((n) => (
              <li key={n.id} id={`nota-${n.id}`} data-cor={n.cor}>
                <button
                  type="button"
                  className="livro-pagina-apagar-nota"
                  aria-label="Apagar nota"
                  onClick={async () => {
                    const frase = n.trecho || n.comentario || "esta nota";
                    if (!window.confirm(`Apagar “${frase.slice(0, 60)}”? Não dá para desfazer.`)) return;
                    try {
                      await apagarNota(id, n.id);
                      setNotas((tudo) => tudo.filter((x) => x.id !== n.id));
                    } catch (e) {
                      setRecado(e.message);
                    }
                  }}
                >
                  <Icone src="/icones/icone-remover.svg" />
                </button>
                {/* NOTA SEM TRECHO NÃO VIRA CAIXA VAZIA COLORIDA. A nota escrita
                    sobre o livro não aponta para frase nenhuma, e um bloco de cor
                    sem texto dentro é uma citação de nada. */}
                {n.trecho
                  ? <blockquote className="trecho-citado" data-cor={n.cor}>{n.trecho}</blockquote>
                  : null}
                {notaEditando === n.id ? (
                  <div className="livro-pagina-edicao-nota">
                    <textarea
                      aria-label="Texto da nota"
                      value={comentarioEditado}
                      onChange={(e) => setComentarioEditado(e.target.value)}
                    />
                    <div>
                      <Botao
                        tom="primaria"
                        porque={salvandoNota ? "Guardando…" : null}
                        onClick={async () => {
                          setSalvandoNota(true);
                          try {
                            const nova = await editarNota(id, n.id, { comentario: comentarioEditado.trim() });
                            setNotas((tudo) => tudo.map((x) => x.id === n.id ? { ...x, comentario: nova.comentario } : x));
                            setNotaEditando(null);
                          } catch (e) {
                            setRecado(e.message);
                          } finally {
                            setSalvandoNota(false);
                          }
                        }}
                      >Guardar</Botao>
                      <button type="button" onClick={() => setNotaEditando(null)}>Cancelar</button>
                      <button
                        type="button"
                        onClick={async () => {
                          const virar = ehRascunho(n) ? "" : "rascunho";
                          try {
                            const nova = await editarNota(id, n.id, { estado: virar });
                            setNotas((tudo) => tudo.map((x) => x.id === n.id ? { ...x, estado: nova.estado } : x));
                          } catch (e) {
                            setRecado(e.message);
                          }
                        }}
                      >
                        {ehRascunho(n) ? "Finalizar rascunho" : "Marcar como rascunho"}
                      </button>
                    </div>
                  </div>
                ) : n.comentario ? <p className="livro-pagina-comentario">{n.comentario}</p> : null}
                <p className="livro-pagina-lugar">
                  {/* CAPÍTULO, e não página: a página muda quando a fonte muda,
                      e o número que se guarda é outro. */}
                  {n.fonte === "livro" ? "Sobre o livro" : `Capítulo ${(n.capitulo ?? 0) + 1}`}
                  {n.fonte === "kindle" && " · trazida do Kindle"}
                </p>

                {/* AS AÇÕES DE CADA NOTA — o desenho põe "Copiar com origem" e
                    a lixeira em toda linha. "Copiar com origem" é o que separa
                    uma nota de um recorte solto: o que vai para a área de
                    transferência traz o livro e o capítulo junto, e é por isso
                    que ela pode ser colada em qualquer lugar sem virar frase
                    órfã. */}
                {/* A MARCA DE RASCUNHO, dita na própria nota. Ela muda o que a
                    nota pode fazer — não vai para estudo nenhum —, então a linha
                    diz isso em vez de deixar a pessoa descobrir num 409. */}
                {ehRascunho(n) && (
                  <p className="livro-pagina-rascunho">
                    Rascunho — não vai para os estudos enquanto estiver assim.
                  </p>
                )}

                <div className="livro-pagina-acoes-nota">
                  <button
                    type="button"
                    onClick={() => {
                      setNotaEditando(n.id);
                      setComentarioEditado(n.comentario || "");
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const onde_ =
                        n.fonte === "livro"
                          ? titulo
                          : `${titulo}, capítulo ${(n.capitulo ?? 0) + 1}`;
                      const texto = [n.trecho && `“${n.trecho}”`, n.comentario, `— ${onde_}`]
                        .filter(Boolean)
                        .join("\n");
                      try {
                        await navigator.clipboard.writeText(texto);
                        setCopiada(n.id);
                      } catch {
                        /* Sem permissão de área de transferência a cópia não
                           acontece, e a tela não pode dizer que aconteceu. */
                        setCopiada(null);
                        setRecado("O navegador não deixou copiar. Selecione o texto e copie na mão.");
                      }
                    }}
                  >
                    {copiada === n.id ? "Copiado" : "Copiar com origem"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {notasNaPagina.length < visiveis.length && (
            <div className="livro-pagina-carregar-mais">
              <p>
                Mostrando <span className="dado">{notasNaPagina.length}</span> de <span className="dado">{visiveis.length}</span> notas.
              </p>
              <Botao tom="secundaria" onClick={() => setLimiteNotas((n) => n + 40)}>
                Mostrar mais notas
              </Botao>
            </div>
          )}
          </div>
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
        <section className="livro-pagina-secao livro-pagina-escrever-secao" id="livro-escrever">
          <header className="livro-pagina-escrever-cabecalho">
            <div className="livro-pagina-escrever-conteudo">
              <h2>Escrever sobre o livro</h2>
              <p className="livro-pagina-nota">
                O que ficou do conjunto, e não de uma frase. Fica com o livro, junto
                das outras notas.
              </p>
            </div>
            <img
              className="livro-pagina-escrever-ilustracao"
              src="/icones/ilustracao-escrever-livro.svg"
              alt=""
              aria-hidden="true"
            />
          </header>
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
                porque={!sobreOLivro.trim() ? "Escreva alguma coisa antes de guardar" : guardando ? "Guardando…" : null}
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

        </div>
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
