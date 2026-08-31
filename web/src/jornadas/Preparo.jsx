import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { analisar, converter, esperarAnalise } from "../../../contrato/api.js";
import "./preparo.css";

/* O preparo: o que o Mekora encontrou, e o que vai fazer.
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

  if (paginas) {
    fora.push({
      titulo: "Nenhuma página corrompida",
      diz: `${paginas} de ${paginas} abriram sem erro.`,
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

  fora.push({
    titulo: "Capa gerada",
    diz: "Montar uma com o título, o autor e o formato — o arquivo não tinha nenhuma.",
  });

  return fora;
}

export function Preparo() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [job, setJob] = useState(null);
  const [erro, setErro] = useState(null);
  const [preparando, setPreparando] = useState(false);
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
        <main className="preparo"><p className="preparo-erro" role="alert">{erro}</p></main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mesa">
        <Cabecalho lugar="mesa" />
        <main className="preparo">
          <p className="preparo-nota" role="status">Analisando o arquivo…</p>
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

      <main className="preparo">
        <Link to="/" className="preparo-volta">← Mesa</Link>

        <header className="preparo-topo">
          <div className="preparo-capa">
            {capa ? <img src={capa} alt="" /> : <span>{titulo}</span>}
          </div>
          <div>
            <h1>{titulo}</h1>
            <p className="preparo-marcas">
              {marcas.map((m) => <span key={m} className="marca-arquivo">{m}</span>)}
            </p>
          </div>
        </header>

        {/* O VEREDITO PRIMEIRO. Quem abre esta tela quer saber uma coisa: dá
            para seguir? O detalhe vem depois, para quem quiser. */}
        <p className="preparo-veredito">
          <strong>Analisado. Nada aqui impede a preparação.</strong>
          <span>
            {job.page_count ? `${job.page_count} páginas, todas abriram. ` : ""}
            O que precisa da sua atenção está abaixo.
          </span>
        </p>

        <section className="preparo-secao">
          <h2>O que encontrei</h2>
          <ul className="preparo-lista">
            {achados(job).map((a) => (
              <li key={a.titulo}>
                <h3>{a.titulo}</h3>
                <p>{a.diz}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="preparo-secao">
          <h2>O que vou fazer</h2>
          <ul className="preparo-lista">
            {planos(job).map((p) => (
              <li key={p.titulo}>
                <h3>{p.titulo}</h3>
                <p>{p.diz}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="preparo-secao">
          <h2>Como vai aparecer na estante</h2>
          {ajustando ? (
            <div className="preparo-ajuste">
              <Campo rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              <Campo rotulo="Autor" value={autor} onChange={(e) => setAutor(e.target.value)} />
              <p className="preparo-nota">
                O que você escrever aqui vale mais que o que veio do arquivo.
              </p>
            </div>
          ) : (
            <ul className="preparo-lista">
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

        <div className="preparo-acoes">
          <Botao
            tom="primaria"
            disabled={preparando}
            onClick={async () => {
              setPreparando(true);
              setErro(null);
              try {
                await converter(id);
                navegar("/");
              } catch (e) {
                setErro(e.message);
                setPreparando(false);
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
