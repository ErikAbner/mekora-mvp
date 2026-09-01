import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { AvisoPreferencias } from "../componentes/AvisoPreferencias.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { acompanhar, analisar, cancelarOperacao, converter, enviarAoKindle, esperarAnalise } from "../../../contrato/api.js";
import { tamanhoLegivel } from "../../../contrato/tamanho.js";
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

  /* DUAS LINHAS SAÍRAM DAQUI, e cada uma por um motivo diferente.
   *
   * "Nenhuma página corrompida — N de N abriram sem erro" é do nó 895:7856, e o
   * backend NÃO SABE ISSO: não há campo de página corrompida no
   * `ProcessingJob`. A frase era verdadeira por acaso, e apareceria igual num
   * arquivo com metade das páginas quebradas. Fica de fora até haver de onde
   * tirá-la.
   *
   * "N páginas" e "Idioma: X" saíram por repetição: o veredito acima já conta
   * as páginas, e "O que vou fazer" já traz o idioma com o que importa junto —
   * que nada será traduzido. No desenho, "O que encontrei" é a lista do que
   * PEDE ATENÇÃO, e não o inventário do arquivo; o inventário são os selos do
   * topo.
   */

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
      /* `passo` é o nome que o servidor usa para a etapa — o mesmo `stage` do
         `report_progress`. É o que deixa a lista de "O que vou fazer" marcar
         qual linha está acontecendo agora, em vez de a tela adivinhar pela
         ordem em que as escreveu. */
      passo: "ocr",
      titulo: `Reconhecer o texto${job.detected_language ? ` em ${job.detected_language}` : ""}`,
      diz: "Depois disso o Kindle acha palavras e você pode mudar o corpo da letra.",
    });
  }

  fora.push({
    passo: "convert",
    titulo: "Converter para EPUB",
    diz: "No EPUB o texto reflui: você muda o corpo da letra e o conteúdo se ajusta. Em PDF, não.",
  });

  /* O SUMÁRIO NAVEGÁVEL — linha do nó 895:7856, que não existia aqui.
   *
   * O desenho escreve "A partir dos 14 títulos de capítulo que encontrei", e o
   * número não dá para dizer AINDA: a análise devolve título, autor, idioma,
   * páginas e se é digitalização — nada sobre capítulos. Quem lê o sumário é o
   * `epub.js`, e ele só tem o que ler DEPOIS da conversão.
   *
   * Então a linha entra sem o número, dizendo o que é verdade: o sumário sai
   * dos títulos que o conversor achar. Prometer catorze antes de olhar seria a
   * mesma invenção que esta tela existe para não fazer. */
  fora.push({
    titulo: "Gerar um sumário navegável",
    diz: "A partir dos títulos de capítulo que o conversor encontrar. É ele que vira o índice do livro na leitura.",
  });

  if (!job.final_title && !job.detected_title) {
    fora.push({
      /* `sozinho` marca a decisão que o Mekora tomou sem perguntar. O veredito
         do nó 895:7856 as nomeia — "Uma coisa eu resolvi sozinho e vale você
         conferir: o arquivo não tem capa" —, e é a diferença entre um relatório
         e um pedido de conferência. */
      sozinho: "o arquivo não traz título",
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
          sozinho: "o arquivo não tem capa",
          titulo: "Capa gerada",
          diz: "Montar uma com o título, o autor e o formato, na linguagem da estante.",
        },
  );

  /* O IDIOMA, E O QUE NÃO VAI ACONTECER COM ELE — linha do nó 895:7856.
   *
   * "Nada é traduzido a não ser que você peça" é a única linha desta lista que
   * promete uma AUSÊNCIA, e é por isso que ela importa: um produto que converte
   * arquivo tem toda a cara de quem mexe no texto sem avisar.
   *
   * O desenho põe um botão "Traduzir" ao lado. Ele não está aqui: a tradução
   * existe no backend (`POST /jobs/{id}/translate`) e não existe em tela nenhuma
   * do produto — nem escolha de idioma de destino, nem motor, nem o que fazer
   * quando falha. Um botão que abre um caminho sem tela é pior que um botão a
   * menos. */
  if (job.detected_language) {
    fora.push({
      titulo: `Idioma: ${job.detected_language}, como no original`,
      diz: "Nada é traduzido a não ser que você peça.",
    });
  }

  return fora;
}

/* O QUE AS DUAS TELAS DE PREPARO TÊM EM COMUM.
 *
 * Nos nós 895:8164 (pronto) e 895:8029 (em andamento) o topo é o MESMO da tela
 * de análise: a capa à esquerda, o título, os selos do arquivo e o alternador.
 * A tela não se esvazia quando a conversão começa — quem está esperando
 * continua vendo qual arquivo é.
 *
 * Aqui isso só era verdade na análise: o "em andamento" trocava a página
 * inteira por uma linha de texto, e a pessoa perdia de vista o que preparava.
 *
 * `inerte` é a conversão em curso: os dois botões continuam à vista, marcando a
 * escolha que foi feita, e não aceitam clique — trocar de modo com o Calibre
 * rodando não muda o arquivo que já está sendo escrito.
 */
function Topo({ job, titulo, ajustando, aoTrocar, inerte = false }) {
  const capa = (job.thumbnails ?? [])[0];
  const marcas = [
    job.input_format && job.input_format.toUpperCase(),
    /* O TAMANHO DO ARQUIVO — o selo "11.5 MB" do nó 966:31504. Ele não existia
       em lugar nenhum do produto: estava só no disco, e o disco esquece quando
       a limpeza por idade apaga o input. Agora vem do banco, gravado na hora em
       que o arquivo chegou. */
    tamanhoLegivel(job.input_bytes),
    job.page_count && `${job.page_count} páginas`,
    job.detected_language,
  ].filter(Boolean);

  return (
    <>
      <header className="preparo-pagina-pagina-topo">
        <div className="preparo-pagina-capa">
          {capa ? <img src={capa} alt="" /> : <span>{titulo}</span>}
        </div>
        <div>
          <h1>{titulo}</h1>
          <p className="preparo-pagina-marcas">
            {marcas.map((m) => <span key={m} className="marca-arquivo">{m}</span>)}
          </p>

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
            {/* PERSONALIZADO PRIMEIRO, como no 895:8164 e no 966:31504 — e o
                Guiado marcado. A ordem do desenho não é arbitrária: o padrão fica
                à direita, onde o polegar chega, e o modo que exige decisão fica à
                esquerda. */}
            {[
              ["personalizado", "Personalizado", true],
              ["guiado", "Guiado", false],
            ].map(([id, rotulo, manual]) => (
              <button
                key={id}
                type="button"
                aria-pressed={ajustando === manual ? "true" : "false"}
                disabled={inerte}
                onClick={() => aoTrocar(manual)}
              >
                {rotulo}
              </button>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}

/* O QUE A ETAPA ESTÁ FAZENDO, EM PORTUGUÊS DE FRASE.
 *
 * `estadoDe` já devolve o rótulo humano da etapa — "convertendo", "analisando".
 * Serve para uma coluna de lista; não serve para o título do nó 895:8029, que é
 * "Preparando, reconhecendo o texto". "Preparando, convertendo" não é frase.
 */
const EM_CURSO = {
  analisando: "lendo o arquivo",
  convertendo: "convertendo para EPUB",
  traduzindo: "traduzindo o texto",
  exportando: "exportando o resultado",
  "enviando ao Kindle": "enviando ao Kindle",
};

/* mm:ss decorridos. O relógio é do navegador porque o começo é o clique — não
 * há acerto de fuso nem de relógio de servidor para dar errado no meio. */
function relogio(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
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
  /* O RELÓGIO DA ESPERA — o "Min 11,30" do canto direito do nó 895:8029.
   *
   * No desenho o número está ao lado de "42 de 96 páginas reconhecidas", e é a
   * única coisa que sobra quando a etapa não conta páginas: o card do próprio
   * desenho diz isso com todas as letras — "as seguintes não avançam de forma
   * linear, então mostro a etapa e o tempo, não uma barra".
   *
   * É TEMPO DECORRIDO, e não tempo restante. Restante seria previsão, e não há
   * de onde tirá-la: o Calibre não estima, o ocrmypdf não estima, e um número
   * inventado numa faixa que existe para dar certeza é o contrário dela.
   * Decorrido eu sei ao certo — começou no clique. */
  const [inicio, setInicio] = useState(null);
  const [agora, setAgora] = useState(0);
  const [cancelando, setCancelando] = useState(false);

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

  useEffect(() => {
    if (!preparando || inicio == null) return undefined;
    const t = setInterval(() => setAgora(Date.now() - inicio), 1000);
    return () => clearInterval(t);
  }, [preparando, inicio]);

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

            {/* O ARQUIVO GERADO, PELO NOME E PELO TAMANHO — "Diário 02.epub ·
                8,4 MB", como o nó 895:8164 escreve.
                
                O tamanho não existia: um comentário aqui dizia que o backend
                não o expunha, e que inventar um número numa faixa que serve
                para dar certeza seria o oposto do que ela faz. Agora ele é
                gravado ao fim da conversão. Quando falta — trabalho convertido
                antes da coluna — sobra o nome, que continua sendo verdade. */}
            {arquivoPronto && (
              <p className="preparo-fim-arquivo">
                {arquivoPronto}
                {tamanhoLegivel(j?.epub_bytes) && <> · {tamanhoLegivel(j.epub_bytes)}</>}
              </p>
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

  /* PREPARO — EM ANDAMENTO, o nó 895:8029.
   *
   * O desenho mantém o topo da tela — capa, título, selos, alternador —, põe um
   * card com regra à esquerda explicando POR QUE a barra existe nesta etapa e
   * não nas seguintes, mostra "42 de 96 páginas reconhecidas" à esquerda com o
   * relógio à direita, repete "O que vou fazer" com a etapa em curso marcada, e
   * termina em dois botões: Cancelar e Continuar navegando.
   *
   * O que havia aqui era um título, uma linha de etapa e uma barra. A parte que
   * mais importa do desenho — a frase que separa "sei contar" de "não sei" —
   * não existia, e é ela a razão de esta tela não ter a barra falsa que todo
   * outro produto põe aqui.
   *
   * DUAS COISAS DO DESENHO NÃO ESTÃO AQUI, e nenhuma por esquecimento:
   *
   * — "42 de 96 páginas reconhecidas" é o OCR contando página a página, e
   *   `apply_ocr` chama o `ocrmypdf` como processo externo, de dentro da
   *   análise, sem `operation_id` e sem retorno por página. Quando houver, a
   *   barra aparece sozinha: o código abaixo já a desenha assim que `feito` e
   *   `total` chegarem.
   *
   * — os tempos por passo ("01:10", "00:40") são previsões, e previsão é
   *   exatamente o que esta tela se recusa a inventar.
   */
  if (preparando) {
    const p = andamento?.progresso;
    const pct = p?.porcento;
    const rotulo = andamento?.etapa ? EM_CURSO[andamento.etapa] || andamento.etapa : null;
    /* A lista é a MESMA de "O que vou fazer" da análise — não uma segunda lista
       de passos escrita à parte, que discordaria da primeira no dia em que uma
       das duas mudasse. */
    const passos = job ? planos(job) : [];

    return (
      <div className="mesa">
        <Cabecalho lugar="mesa" />
        <main className="preparo-pagina">
          {job && (
            <Topo job={job} titulo={titulo} ajustando={ajustando} aoTrocar={setAjustando} inerte />
          )}

          <section className="preparo-andando">
            <div className="preparo-andando-card">
              <h2 role="status">Preparando{rotulo ? `, ${rotulo}` : "…"}</h2>
              {/* A FRASE É DO DESENHO, e ela se parte em duas porque descreve
                  dois casos. Contável: a barra vale. Não contável: etapa e
                  tempo, e barra nenhuma. */}
              <p>
                {typeof pct === "number"
                  ? "Esta etapa eu sei contar, porque é página a página. As seguintes não avançam de forma linear — nelas mostro a etapa e o tempo, não uma barra."
                  : "Esta etapa não avança de forma linear, então mostro a etapa e o tempo, e não uma barra. Uma barra aqui andaria sozinha, sem nada por baixo."}
              </p>
              {p?.recado && <p className="preparo-andando-recado">{p.recado}</p>}
            </div>

            {typeof pct === "number" && (
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
            )}

            <p className="preparo-andando-medida">
              <span>
                {p?.total
                  ? `${p.feito} de ${p.total} páginas reconhecidas`
                  : "Sem contagem nesta etapa"}
              </span>
              <span>{relogio(agora)}</span>
            </p>
          </section>

          <section className="preparo-pagina-secao">
            <h2>O que vou fazer</h2>
            <ul className="preparo-pagina-lista preparo-andando-passos">
              {passos.map((x) => {
                const correndo = Boolean(x.passo) && p?.passo === x.passo;
                return (
                  <li key={x.titulo} aria-current={correndo ? "step" : undefined}>
                    <h3>{x.titulo}</h3>
                    <p>{correndo ? "Em andamento" : x.diz}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="preparo-pagina-pagina-acoes">
            {/* CANCELAR É COOPERATIVO, e o botão não pode fingir o contrário: o
                backend anota o pedido e a etapa o lê entre um passo e outro. Sem
                `operation_id` não há o que cancelar, e aí o botão não existe —
                melhor faltar do que responder 409. */}
            {p?.operacao && (
              <Botao
                tom="primaria"
                disabled={cancelando}
                onClick={async () => {
                  setCancelando(true);
                  try {
                    await cancelarOperacao(id, p.operacao);
                  } catch (e) {
                    setErro(e.message);
                  }
                }}
              >
                {cancelando ? "Cancelando…" : "Cancelar"}
              </Botao>
            )}
            <Botao tom="secundaria" onClick={() => navegar("/mesa")}>
              Continuar navegando
            </Botao>
          </div>

          <p className="preparo-andando-nota">
            {cancelando
              ? "Pedido de cancelamento anotado. A etapa para no fim do passo em que está — programas de fora, como o conversor, não são interrompidos no meio."
              : "Dá para fechar esta aba: a preparação continua no servidor, e o livro aparece na estante quando terminar."}
          </p>
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

  const oQueVouFazer = planos(job);
  const sozinhas = oQueVouFazer.map((x) => x.sozinho).filter(Boolean);

  return (
    <div className="mesa">
      <Cabecalho lugar="mesa" />

      <main className="preparo-pagina">
        <Link to="/mesa" className="preparo-pagina-volta">← Mesa</Link>

        <Topo job={job} titulo={titulo} ajustando={ajustando} aoTrocar={setAjustando} />

        {/* O que cada modo faz, dito uma vez. O rótulo sozinho não diz se
            "Personalizado" abre controles ou muda o resultado. */}
        <p className="preparo-pagina-nota">
          {ajustando
            ? "Os controles ficam à vista, já preenchidos com o que o Guiado faria."
            : "O Mekora decide, mostra a decisão em texto e pede confirmação uma vez."}
        </p>

        {/* O VEREDITO PRIMEIRO. Quem abre esta tela quer saber uma coisa: dá
            para seguir? O detalhe vem depois, para quem quiser.

            O que ele afirma precisa ser verdade. Aqui dizia "N páginas, todas
            abriram", e nada no backend responde se alguma não abriu.

            A SEGUNDA FRASE É A DO NÓ 895:7856 — "Uma coisa eu resolvi sozinho e
            vale você conferir: o arquivo não tem capa". Ela não estava aqui, e é
            a que muda a tela de relatório para pedido de conferência: nomeia o
            que foi decidido sem perguntar, em vez de deixar a decisão espalhada
            no meio da lista de baixo. */}
        <p className="preparo-pagina-veredito">
          <strong>Analisado. Nada aqui impede a preparação.</strong>
          <span>
            {job.page_count
              ? job.page_count === 1
                ? "1 página lida. "
                : `${job.page_count} páginas lidas. `
              : ""}
            {sozinhas.length === 0
              ? "O que precisa da sua atenção está abaixo."
              : sozinhas.length === 1
                ? `Uma coisa eu resolvi sozinho e vale você conferir: ${sozinhas[0]}.`
                : `${sozinhas.length} coisas eu resolvi sozinho e vale você conferir: ${sozinhas.join(", ")}.`}
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
            {oQueVouFazer.map((p) => (
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
            /* O "ALTERAR" POR LINHA — nó 895:7856. As duas linhas mostravam o
               que ia para a estante e não tinham como ser mudadas dali: era
               preciso achar o alternador lá no topo e entender que
               "Personalizado" abria campos. O botão está na linha do dado que
               ele muda. */
            <ul className="preparo-pagina-lista">
              <li>
                <h3>Título: {titulo}</h3>
                <p>{job.detected_title ? "Lido das propriedades do arquivo." : "Vem do nome do arquivo."}</p>
                <Botao tom="secundaria" onClick={() => setAjustando(true)}>Alterar</Botao>
              </li>
              <li>
                <h3>Autor: {autor || "não informado"}</h3>
                <p>{job.detected_author ? "Lido das propriedades do arquivo." : "O arquivo não traz autor."}</p>
                <Botao tom="secundaria" onClick={() => setAjustando(true)}>Alterar</Botao>
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
              setInicio(Date.now());
              setAgora(0);
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
          {/* "AJUSTAR MANUALMENTE" VOLTOU, porque o nó 895:7856 tem os dois.
              Eu o tinha tirado argumentando que o alternador do topo faz a mesma
              coisa — e faz. Mas os dois não estão no mesmo papel: o de cima
              escolhe COMO LER a página, antes de lê-la; este é a decisão do
              fim, ao lado da outra decisão do fim, para quem leu tudo e
              discordou. Quem chegou até aqui não deveria ter de subir. */}
          {!ajustando && (
            <Botao tom="secundaria" onClick={() => setAjustando(true)}>
              Ajustar manualmente
            </Botao>
          )}
        </div>
        </AvisoPreferencias>
      </main>
    </div>
  );
}
