import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { AvisoPreferencias } from "../componentes/AvisoPreferencias.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { acompanhar, analisar, converter, enviarAoKindle, esperarAnalise } from "../../../contrato/api.js";
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
  /* O JOB DEPOIS DA CONVERSAO. `epub_path` so existe quando o EPUB existe, e a
   * tela de pronto precisa dele para oferecer o download — o job carregado na
   * analise ainda o traz vazio. */
  const [convertido, setConvertido] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
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
    /* O nome do EPUB sai do `epub_path`, que e caminho no servidor: o que
       interessa a pessoa e o ultimo pedaco. */
    const j = convertido ?? job;
    const arquivoPronto = j?.epub_path ? j.epub_path.split("/").pop() : null;
    /* O download passa pelo `endereco` — o token publico do trabalho —, que e o
       que a rota de arquivo aceita sem sessao. Sem ele, sem botao: melhor faltar
       o botao do que oferecer um que responde 404.
    
       CAMINHO RELATIVO, sem base. E a mesma regra que o contrato ja escreveu: o
       caminho da chamada e o MESMO em dev e em producao, porque a borda repassa
       /storage para /storage. Nao ha ambiente onde ele seja outro, logo nao ha o
       que configurar nem como configurar errado. */
    const baixar =
      j?.endereco && arquivoPronto
        ? `/storage/output/${j.endereco}/${arquivoPronto}`
        : null;
    return (
      <div className="mesa">
        <Cabecalho lugar="mesa" />
        <main className="preparo-pagina">
          <section className="preparo-fim">
            <p className="preparo-fim-marca">Pronto</p>
            <h1>{titulo} está na estante.</h1>

            {/* O ARQUIVO GERADO, PELO NOME. O desenho traz também o tamanho —
                "8,4 MB" —, e o backend não o expõe em lugar nenhum: nem o
                `status` nem o job completo têm bytes. Inventar um número numa
                faixa que existe para dar certeza seria o oposto do que ela faz.
                Fica o nome, que é verdade. */}
            {arquivoPronto && (
              <p className="preparo-fim-arquivo">{arquivoPronto}</p>
            )}

            <p className="preparo-fim-diz">
              O arquivo virou EPUB e entrou no seu acervo. O que você marcar
              lendo fica junto do livro, no trecho onde marcou.
            </p>

            {enviado && (
              <p className="preparo-fim-aviso" role="status">
                Enviado. Ele chega no aparelho em alguns minutos — e se a Amazon
                recusar, o erro aparece na Mesa.
              </p>
            )}

            <div className="preparo-fim-acoes">
              {/* AS DUAS AÇÕES QUE FALTAVAM. A tela terminava em "Ler agora" e
                  "Ver na estante", e o produto promete na Apresentação "receba o
                  resultado e baixe" — não havia como baixar em tela nenhuma. */}
              <Botao
                tom="primaria"
                disabled={enviando || enviado}
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
                {enviando ? "Enviando…" : enviado ? "Enviado" : "Enviar ao Kindle"}
              </Botao>

              {baixar && (
                <a className="botao secundaria" href={baixar} download>
                  Baixar EPUB
                </a>
              )}

              <Botao tom="secundaria" onClick={() => navegar("/estante")}>
                Abrir na estante
              </Botao>
              <Botao tom="secundaria" onClick={() => navegar("/mesa")}>
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
        <Link to="/mesa" className="preparo-pagina-volta">← Mesa</Link>

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

        {/* O ALTERNADOR GUIADO / PERSONALIZADO, no topo — nó 966:31504.
         *
         * Ele existia só como um botão no fim da página, "Ajustar manualmente",
         * depois de tudo o que o Mekora decidiu. Quem quer decidir por conta
         * própria tinha de rolar a tela inteira lendo as decisões que ia
         * descartar.
         *
         * No desenho é um alternador de dois estados, antes do conteúdo — a
         * escolha de COMO ler esta tela vem antes de lê-la. Marcado por
         * superfície, como todo alternador do sistema. */}
        <nav className="preparo-pagina-modo" aria-label="Modo de preparo">
          {[
            ["guiado", "Guiado", false],
            ["personalizado", "Personalizado", true],
          ].map(([id, rotulo, manual]) => (
            <button
              key={id}
              type="button"
              aria-pressed={ajustando === manual ? "true" : "false"}
              onClick={() => setAjustando(manual)}
            >
              {rotulo}
            </button>
          ))}
        </nav>

        {/* O que cada modo faz, dito uma vez. O rótulo sozinho não diz se
            "Personalizado" abre controles ou muda o resultado. */}
        <p className="preparo-pagina-nota">
          {ajustando
            ? "Os controles ficam à vista, já preenchidos com o que o Guiado faria."
            : "O Mekora decide, mostra a decisão em texto e pede confirmação uma vez."}
        </p>

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

        {/* O aviso do 941:23109 envolve a ação quando há preferência fora do
            padrão, e some quando não há. Preparar é o momento em que a escolha
            deixa de ser abstrata — é aqui que ela vira o arquivo. */}
        <AvisoPreferencias>
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
                /* Rebusca: o job da analise nao tem `epub_path`, e sem ele a
                   tela de pronto nao sabe o que oferecer para baixar. */
                try { setConvertido(await analisar(id)); } catch { /* a tela funciona sem */ }
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
          {/* O botão do fim saiu: o alternador do topo faz a mesma coisa, e
              dois controles para uma escolha em pontas opostas da página é a
              pessoa procurando qual dos dois vale. */}
        </div>
        </AvisoPreferencias>
      </main>
    </div>
  );
}
