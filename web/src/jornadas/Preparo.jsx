import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { acompanhar, analisar, converter, esperarAnalise } from "../../../contrato/api.js";
import "./preparo.css";

/* O preparo-pagina: o que o Mekora encontrou, e o que vai fazer.
 *
 * ESTA TELA É O CONTRÁRIO DE "IA MÁGICA".
 *
 * O `CLAUDE.md` proíbe "a IA descobriu" e "o Mekora sabe". A saída que ele
 * nomeia é dizer o que se viu, com o número ao lado, para poder ser discordado.
 * É isso aqui: não "otimizamos seu arquivo", mas "as 96 páginas são
 * digitalizações — sem reconhecimento, o Kindle não busca palavras nem ajusta o
 * tamanho da letra".
 *
 * E ela existe ANTES da conversão, não depois. Um relatório do que já foi feito
 * é uma nota fiscal; isto é uma proposta, e por isso tem dois botões.
 */

/* Cada achado tem três partes: o que é, por que importa, e o número que
 * sustenta. Sem o número vira opinião do produto sobre o arquivo de alguém. */
function achados(job) {
  const fora = [];
  const paginas = job.page_count;

  if (job.is_scanned === true) {
    fora.push({
      titulo: "Texto em imagem",
      diz: paginas
        ? `As ${paginas} páginas são digitalizações. Sem reconhecimento, o Kindle não busca palavras nem ajusta o tamanho da letra.`
        : "O arquivo é uma digitalização. Sem reconhecimento, o Kindle não busca palavras nem ajusta o tamanho da letra.",
    });
  } else if (job.is_scanned === false) {
    fora.push({
      titulo: "O texto já está no arquivo",
      diz: "Não é digitalização — nada precisa ser reconhecido, e o texto vai inteiro para o aparelho.",
    });
  }

  /* O NUMERO DE PAGINAS, E NAO UM VEREDITO SOBRE ELAS.
   *
   * Aqui dizia "Nenhuma página corrompida — N de N abriram sem erro", e o
   * backend NAO SABE ISSO: nao ha campo de pagina corrompida no
   * `ProcessingJob`. A frase era verdadeira por acaso e apareceria igual num
   * arquivo com metade das paginas quebradas. */
  if (paginas) {
    fora.push({
      titulo: `${paginas} ${paginas === 1 ? "página" : "páginas"}`,
      diz: "Contadas na análise do arquivo.",
    });
  }

  if (job.detected_language) {
    fora.push({
      titulo: `Idioma: ${job.detected_language}`,
      diz: "Declarado no próprio arquivo.",
    });
  }

  /* SE NADA FOI ENCONTRADO, A TELA DIZ ISSO — e não some. Uma seção vazia
   * sugere que a análise não rodou; uma frase dizendo que não achou nada
   * digno de nota é informação. */
  if (!fora.length) {
    fora.push({
      titulo: "Nada que precise da sua atenção",
      diz: "A análise não encontrou nada que mude o que vai ser feito.",
    });
  }
  return fora;
}

/* O que vai acontecer. Cada linha é uma ação com consequência dita — o que
 * muda no aparelho, e não o nome técnico do passo. */
function planos(job) {
  const fora = [];

  if (job.is_scanned === true) {
    fora.push({
      titulo: `Reconhecer o texto${job.detected_language ? ` em ${job.detected_language}` : ""}`,
      diz: "Depois disso o Kindle acha palavras e você pode mudar o corpo da letra.",
    });
  }

  fora.push({
    titulo: "Converter para EPUB",
    diz: "No EPUB o texto reflui: você muda o corpo da letra e o conteúdo se ajusta. Em PDF, não.",
  });

  if (!job.final_title && !job.detected_title) {
    fora.push({
      titulo: "Usar o nome do arquivo como título",
      diz: "O arquivo não traz título próprio. Dá para trocar abaixo.",
    });
  }

  /* O QUE VAI SER FEITO, sem afirmar de onde a capa veio.
   *
   * A frase dizia "Montar uma com o titulo, o autor e o formato — o arquivo nao
   * tinha nenhuma", e o backend NAO SABE se o arquivo tinha: `cover_path` so e
   * preenchido quando a pessoa escolhe uma miniatura, e as miniaturas sao
   * paginas renderizadas do documento, nao uma capa propria. Minha primeira
   * correcao trocou a afirmacao falsa por outra — "o arquivo ja traz uma" —
   * baseada nessas mesmas miniaturas.
   *
   * O que da para dizer com apoio: se a pessoa escolheu uma pagina, ela vira a
   * capa; se nao escolheu, o Mekora monta uma. */
  const escolhida = job.selected_cover_page;
  fora.push(
    typeof escolhida === "number"
      ? {
          titulo: `Usar a página ${escolhida + 1} como capa`,
          diz: "Foi a que você escolheu.",
        }
      : {
          titulo: "Capa gerada",
          diz: "Montar uma com o título, o autor e o formato, na linguagem da estante.",
        },
  );

  return fora;
}

export function Preparo() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [job, setJob] = useState(null);
  const [erro, setErro] = useState(null);
  const [preparando, setPreparando] = useState(false);
  /* O ANDAMENTO DA CONVERSAO, que ate 01/09 nao tinha onde aparecer: `converter`
   * era chamado e a tela navegava para a Mesa no mesmo instante. Um PDF
   * digitalizado de trezentas paginas leva minutos com OCR, e a pessoa ficava na
   * Mesa sem saber se algo estava acontecendo. */
  const [andamento, setAndamento] = useState(null);
  const [feito, setFeito] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [ajustando, setAjustando] = useState(false);

  const buscar = useCallback(async () => {
    try {
      /* A análise é assíncrona: `analisar` só a DISPARA. Perguntar uma vez e
       * desenhar devolveria uma tela sem páginas, sem idioma e sem saber se é
       * digitalização — que é justamente o que ela existe para contar. */
      await analisar(id);
      const pronto = await esperarAnalise(id);
      if (pronto.estado === "erro") {
        setErro(pronto.motivo || "A análise não terminou.");
        return;
      }
      const j = await analisar(id);
      setJob(j);
      setTitulo(j.final_title || j.detected_title || j.original_filename || "");
      setAutor(j.final_author || j.detected_author || "");
    } catch (e) {
      setErro(e.message);
    }
  }, [id]);

  useEffect(() => { buscar(); }, [buscar]);

  if (erro) {
    return (
      <div className="mesa">
        <Cabecalho lugar="mesa" />
        <main className="preparo-pagina"><p className="preparo-pagina-erro" role="alert">{erro}</p></main>
      </div>
    );
  }

  /* PREPARO — PRONTO. O fim da jornada tem tela, e nao um empurrao de volta
   * para a Mesa: quem esperou a conversao quer saber que ela terminou, e
   * escolher o que fazer com o resultado. */
  if (feito) {
    return (
      <div className="mesa">
        <Cabecalho lugar="mesa" />
        <main className="preparo-pagina">
          <section className="preparo-fim">
            <p className="preparo-fim-marca">Pronto</p>
            <h1>{titulo} está na estante.</h1>
            <p className="preparo-fim-diz">
              O arquivo virou EPUB e entrou no seu acervo. O que você marcar
              lendo fica junto do livro, no trecho onde marcou.
            </p>
            <div className="preparo-fim-acoes">
              <Botao tom="primaria" onClick={() => navegar(`/leitura/${id}`)}>
                Ler agora
              </Botao>
              <Botao tom="secundaria" onClick={() => navegar("/estante")}>
                Ver na estante
              </Botao>
              <Botao tom="secundaria" onClick={() => navegar("/")}>
                Preparar outro
              </Botao>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* PREPARO — EM ANDAMENTO. Diz a etapa e a porcentagem quando o servidor as
   * manda, e diz que nao sabe quando nao manda — em vez de uma barra inventada
   * que anda sozinha, que e a mentira mais comum desta tela em qualquer
   * produto. */
  if (preparando) {
    const pct = andamento?.progresso?.porcento;
    return (
      <div className="mesa">
        <Cabecalho lugar="mesa" />
        <main className="preparo-pagina">
          <section className="preparo-andando">
            <h1>Preparando {titulo}</h1>
            <p className="preparo-andando-etapa" role="status">
              {andamento?.etapa
                ? `${andamento.etapa[0].toUpperCase()}${andamento.etapa.slice(1)}…`
                : "Começando…"}
            </p>
            {typeof pct === "number" ? (
              <div
                className="preparo-barra"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Preparação do arquivo"
              >
                <span style={{ inlineSize: `${Math.max(0, Math.min(100, pct))}%` }} />
              </div>
            ) : (
              <p className="preparo-andando-nota">
                O servidor não informa quanto falta nesta etapa.
              </p>
            )}
            <p className="preparo-andando-nota">
              Dá para fechar esta aba: a preparação continua no servidor, e o
              livro aparece na estante quando terminar.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mesa">
        <Cabecalho lugar="mesa" />
        <main className="preparo-pagina">
          <p className="preparo-pagina-nota" role="status">Analisando o arquivo…</p>
        </main>
      </div>
    );
  }

  const capa = (job.thumbnails ?? [])[0];
  const marcas = [
    job.input_format && job.input_format.toUpperCase(),
    job.page_count && `${job.page_count} páginas`,
    job.detected_language,
  ].filter(Boolean);

  return (
    <div className="mesa">
      <Cabecalho lugar="mesa" />

      <main className="preparo-pagina">
        <Link to="/" className="preparo-pagina-volta">← Mesa</Link>

        <header className="preparo-pagina-pagina-topo">
          <div className="preparo-pagina-capa">
            {capa ? <img src={capa} alt="" /> : <span>{titulo}</span>}
          </div>
          <div>
            <h1>{titulo}</h1>
            <p className="preparo-pagina-marcas">
              {marcas.map((m) => <span key={m} className="marca-arquivo">{m}</span>)}
            </p>
          </div>
        </header>

        {/* O VEREDITO PRIMEIRO. Quem abre esta tela quer saber uma coisa: dá
            para seguir? O detalhe vem depois, para quem quiser. */}
        {/* O VEREDITO PRIMEIRO — mas o que ele afirma precisa ser verdade.
            Aqui dizia "N páginas, todas abriram", e nada no backend responde se
            alguma não abriu. Agora ele diz o que a análise fez, e o que ela
            achou fica na seção de baixo, item a item. */}
        <p className="preparo-pagina-veredito">
          <strong>Analisado. Nada aqui impede a preparação.</strong>
          <span>
            {job.page_count
              ? job.page_count === 1
                ? "1 página lida. "
                : `${job.page_count} páginas lidas. `
              : ""}
            O que precisa da sua atenção está abaixo.
          </span>
        </p>

        <section className="preparo-pagina-secao">
          <h2>O que encontrei</h2>
          <ul className="preparo-pagina-lista">
            {achados(job).map((a) => (
              <li key={a.titulo}>
                <h3>{a.titulo}</h3>
                <p>{a.diz}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="preparo-pagina-secao">
          <h2>O que vou fazer</h2>
          <ul className="preparo-pagina-lista">
            {planos(job).map((p) => (
              <li key={p.titulo}>
                <h3>{p.titulo}</h3>
                <p>{p.diz}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="preparo-pagina-secao">
          <h2>Como vai aparecer na estante</h2>
          {ajustando ? (
            <div className="preparo-pagina-ajuste">
              <Campo rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              <Campo rotulo="Autor" value={autor} onChange={(e) => setAutor(e.target.value)} />
              <p className="preparo-pagina-nota">
                O que você escrever aqui vale mais que o que veio do arquivo.
              </p>
            </div>
          ) : (
            <ul className="preparo-pagina-lista">
              <li>
                <h3>Título: {titulo}</h3>
                <p>{job.detected_title ? "Lido das propriedades do arquivo." : "Vem do nome do arquivo."}</p>
              </li>
              <li>
                <h3>Autor: {autor || "não informado"}</h3>
                <p>{job.detected_author ? "Lido das propriedades do arquivo." : "O arquivo não traz autor."}</p>
              </li>
            </ul>
          )}
        </section>

        <div className="preparo-pagina-pagina-acoes">
          <Botao
            tom="primaria"
            disabled={preparando}
            onClick={async () => {
              setPreparando(true);
              setErro(null);
              try {
                await converter(id);
                /* FICA NA TELA E ACOMPANHA. `acompanhar` para sozinho em tres
                   casos — pronto, erro, ou o teto —, e o teto e relatado. */
                const fim = await acompanhar(id, setAndamento);
                if (fim.estado === "erro") {
                  setErro(fim.motivo || "A preparação não terminou.");
                  setPreparando(false);
                  setAndamento(null);
                  return;
                }
                setFeito(true);
              } catch (e) {
                setErro(e.message);
                setPreparando(false);
                setAndamento(null);
              }
            }}
          >
            {preparando ? "Preparando…" : "Preparar com recomendações"}
          </Botao>
          <Botao tom="secundaria" onClick={() => setAjustando((v) => !v)}>
            {ajustando ? "Voltar às recomendações" : "Ajustar manualmente"}
          </Botao>
        </div>
      </main>
    </div>
  );
}
