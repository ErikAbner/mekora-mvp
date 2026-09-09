import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { achatar } from "../../../contrato/texto.js";
import { Folha } from "../componentes/Folha.jsx";
import { TrilhaDaPagina } from "../componentes/TrilhaDaPagina.jsx";
import { criarEstudo, declararEstadoDeLeitura, gravarProgresso, ignorarGrupo, lerAgrupadas, ordenarLeituras, ouvirGruposDeNovo, reunirNoEstudo } from "../../../contrato/api.js";
import { ESTADOS_DE_LEITURA, estadoDeLeitura, leituraDivergeDaDeclaracao } from "../../../contrato/estado.js";
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
  /* A busca DENTRO do estudo — nó 895:8260, logo abaixo da faixa de livros. Um
     estudo que cumpriu seu papel tem trinta notas de cinco livros, e é aí que
     ele fica difícil de usar: a busca é o que o mantém utilizável depois de
     ficar grande. */
  const [procura, setProcura] = useState("");
  const [copiada, setCopiada] = useState(null);
  const dentro = new Set(estudo.notas.map((n) => n.id));
  /* RASCUNHO NÃO APARECE PARA REUNIR. O servidor recusa — é a regra que dá
     sentido ao estado —, e oferecer aqui seria levar a pessoa a um 409. */
  const deFora = notasDisponiveis.filter((n) => !dentro.has(n.id) && n.estado !== "rascunho");
  const alvo = achatar(procura.trim());
  const notasVisiveis = estudo.notas.filter(
    (n) => !alvo || achatar(`${n.trecho ?? ""} ${n.comentario ?? ""} ${n.origem ?? ""}`).includes(alvo),
  );

  return (
    <article className={`estudo${estudo.fechado ? " fechado" : ""}`}>
      <header id="estudo-inicio">
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
        <div className="estudo-livros" id="estudo-livros">
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

      {/* "COMO ISSO SE FORMOU" — o título que o nó 895:8260 põe sobre as notas.
          A lista aparecia sem nome nenhum, e um estudo é a pergunta MAIS o que
          foi juntado em volta: sem o título, as notas parecem o estudo inteiro
          em vez da resposta que se acumulou. */}
      {!resumido && estudo.notas.length > 0 && (
        <div className="estudo-formou" id="estudo-formou">
          <h3>Como isso se formou</h3>
          {estudo.notas.length > 3 && (
            <Campo
              tipo="search"
              rotulo={`Buscar nas notas de ${estudo.nome}`}
              rotuloOculto
              placeholder="Buscar em livros, notas e contextos"
              value={procura}
              onChange={(e) => setProcura(e.target.value)}
            />
          )}
          {!notasVisiveis.length && (
            <p className="estudo-vazio" role="status">
              Nenhuma nota deste estudo combina com o que você procurou.
            </p>
          )}
        </div>
      )}

      {!resumido && estudo.notas.length > 0 && (
        <ul className="estudo-notas" data-clarity-mask="true">
          {notasVisiveis.map((n) => (
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
                <blockquote className="trecho-citado" data-cor={n.cor}>{n.trecho}</blockquote>
              </div>
              {n.comentario && <p className="estudo-comentario">{n.comentario}</p>}
              <div className="estudo-nota-acoes">
                <span className="estudo-origem">
                  {n.fonte === "kindle" ? `Kindle · ${n.origem}` : n.origem || "do seu livro"}
                </span>
                {n.job_id && <Link to={`/leitura/${n.job_id}`}>Abrir no livro</Link>}
                {/* COPIAR COM ORIGEM — o desenho o põe em toda nota, aqui e na
                    ficha do livro. É o que separa uma nota de um recorte solto:
                    o que vai para a área de transferência leva de onde veio. */}
                <button
                  type="button"
                  onClick={async () => {
                    const veio = n.origem || estudo.nome;
                    const texto = [n.trecho && `“${n.trecho}”`, n.comentario, `— ${veio}`]
                      .filter(Boolean)
                      .join("\n");
                    try {
                      await navigator.clipboard.writeText(texto);
                      setCopiada(n.id);
                    } catch {
                      setCopiada(null);
                    }
                  }}
                >
                  {copiada === n.id ? "Copiado" : "Copiar com origem"}
                </button>
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
        <Botao tom="secundaria" onClick={() => setReunindo(true)} porque={!deFora.length ? "Todas as suas notas já estão neste estudo" : null}>
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
/* O QUADRO SE ARRASTA, E O ARRASTO ESCREVE O ESTADO — não o progresso.
 *
 * O Erik, em 07/09, depois de ver a primeira versão:
 *
 *   "Não considero correto usar o progresso para representar o estado da
 *   coluna. Mover para A ler não deve zerar progresso; Lendo não deve fabricar
 *   capítulo 1/N; Lido não deve silenciosamente alterar a posição real de
 *   leitura. Estado de leitura e progresso de leitura são conceitos diferentes.
 *   O drag-and-drop altera o estado. A leitura efetiva altera o progresso."
 *
 * A versão anterior gravava a marca de leitura para representar a declaração, e
 * o argumento — "estado derivado, corrigível à mão" — não cobria o dano: quem
 * arrastasse um livro pela metade para "Lido" perdia onde tinha parado, como
 * efeito colateral de um gesto que não prometia mexer no histórico.
 *
 * Agora há uma coluna `estado_leitura` em `progressos`, anulável, e a rota
 * `PUT /jobs/{id}/estado-leitura` escreve ela e nada mais.
 *
 * E CONTINUA HAVENDO UMA FONTE SÓ. `estadoDeLeitura`, no contrato, é o único
 * lugar com a precedência: declarou, vale o que ela disse; não declarou, o
 * estado sai da fração como sempre saiu. Duas verdades seria guardar o estado E
 * seguir derivando sem dizer qual manda.
 */
const COLUNAS = [
  { id: "to_read", rotulo: "A ler" },
  { id: "reading", rotulo: "Lendo" },
  { id: "read", rotulo: "Lido" },
];

function ordemDoQuadro(livros) {
  return [...livros]
    .sort((a, b) => {
      const oa = Number.isInteger(a.ordemLeitura) ? a.ordemLeitura : Number.MAX_SAFE_INTEGER;
      const ob = Number.isInteger(b.ordemLeitura) ? b.ordemLeitura : Number.MAX_SAFE_INTEGER;
      return oa - ob;
    })
    .map((livro) => livro.chave);
}

/* OS RECORTES DOS ESTUDOS — o nó 966:31095 os tem, e a tela não tinha.
 *
 * "Fechado" não quer dizer apagado: fechar um estudo é dizer que a pergunta foi
 * respondida, e o que se respondeu continua valendo a releitura. Por isso o
 * recorte, e não um filtro que some com eles. */
/* Quantas notas soltas a tela mostra antes de mandar para as Notas. Vinte é o
 * que cabe numa rolagem sem virar uma segunda tela de Notas dentro dos Estudos. */
const LIMITE_DAS_SOLTAS = 20;

/* OS TRÊS RECORTES DO DESENHO — `895:8911`, `895:8913` e `895:8915`.
 *
 * Eu tinha inventado "Abertos / Respondidos / Tudo", um filtro por ESTADO do
 * estudo. O desenho não filtra estado: ele troca o que a tela MOSTRA.
 *
 * Os três são vistas do mesmo acervo, e nenhuma precisa de campo novo:
 *
 *   Estudos          o que você reuniu, por estudo
 *   Todas as notas   tudo o que você marcou, sem passar por estudo nenhum
 *   Por pergunta     as notas agrupadas pela pergunta do estudo a que pertencem
 */
const RECORTES = [
  { id: "estudos", rotulo: "Estudos" },
  { id: "notas", rotulo: "Todas as notas" },
  { id: "pergunta", rotulo: "Por pergunta" },
];

export function Estudos({ estudos = [], notas = [], livros = [], erro, aoCriar, aoMudar, aoApagar, aoReunir, aoTirar, aoReler }) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [sobre, setSobre] = useState("");
  const [recorte, setRecorte] = useState("estudos");
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
  /* "VOCÊ LIGOU" — nó 895:8849. Os assuntos que apareceram no acervo sem
     ninguém organizar nada. É a promessa da Apresentação ganhando tela: "o que
     você marcou em livros diferentes sobre o mesmo assunto se encontra". */
  const [ligou, setLigou] = useState(null);

  /* O ARRASTO DO QUADRO. Ponteiro, e não o drag-and-drop nativo do HTML: o
   * nativo não existe em toque, e o produto já tem o padrão do Canvas —
   * limiar de 4px, captura no container, estado escrito só ao soltar.
   *
   * O QUE ESTÁ SENDO ARRASTADO NÃO SAI DO LUGAR no DOM. Mover o nó libera a
   * captura de ponteiro no primeiro pixel e o arrasto morre — é a primeira das
   * armadilhas já pagas do CLAUDE.md. Quem segue o dedo é um fantasma
   * `position: fixed`, e o cartão original só clareia. */
  const quadroRef = useRef(null);
  const gesto = useRef(null);
  const [arrasto, setArrasto] = useState(null);   // { chave, titulo, x, y, de }
  const [colunaSobODedo, setColunaSobODedo] = useState(null);
  const [posicaoSobODedo, setPosicaoSobODedo] = useState(null);
  const [movendo, setMovendo] = useState(null);
  const [ordemLocal, setOrdemLocal] = useState(() => ordemDoQuadro(livros));

  useEffect(() => { setOrdemLocal(ordemDoQuadro(livros)); }, [livros]);

  const indiceDaOrdem = new Map(ordemLocal.map((chave, indice) => [String(chave), indice]));
  const livrosOrdenados = [...livros].sort((a, b) =>
    (indiceDaOrdem.get(String(a.chave)) ?? Number.MAX_SAFE_INTEGER)
    - (indiceDaOrdem.get(String(b.chave)) ?? Number.MAX_SAFE_INTEGER));

  const mover = useCallback(async (livro, destino, posicao = null) => {
    if (!livro || !ESTADOS_DE_LEITURA.includes(destino)) return;
    const origem = estadoDeLeitura(livro);
    const atuais = [...livros].sort((a, b) => {
      const ia = ordemLocal.findIndex((chave) => String(chave) === String(a.chave));
      const ib = ordemLocal.findIndex((chave) => String(chave) === String(b.chave));
      return (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) - (ib < 0 ? Number.MAX_SAFE_INTEGER : ib);
    });
    const porColuna = new Map(COLUNAS.map((c) => [c.id, []]));
    for (const item of atuais) {
      if (String(item.chave) === String(livro.chave)) continue;
      porColuna.get(estadoDeLeitura(item))?.push(item);
    }
    const destinoAtual = porColuna.get(destino);
    let onde = destinoAtual.length;
    if (posicao?.chave != null) {
      const alvo = destinoAtual.findIndex((item) => String(item.chave) === String(posicao.chave));
      if (alvo >= 0) onde = alvo + (posicao.depois ? 1 : 0);
    }
    destinoAtual.splice(onde, 0, livro);
    const novaOrdem = COLUNAS.flatMap((c) => porColuna.get(c.id)).map((item) => item.chave);
    const naoMudou = novaOrdem.length === ordemLocal.length
      && novaOrdem.every((chave, indice) => String(chave) === String(ordemLocal[indice]));
    if (origem === destino && naoMudou) return;

    const ordemAnterior = ordemLocal;
    setOrdemLocal(novaOrdem);
    setMovendo(livro.chave);
    try {
      /* UMA COLUNA, E NENHUMA OUTRA. A rota escreve `estado_leitura`; capítulo,
       * deslocamento e fração ficam onde estavam. Se a pessoa marcar "Lido"
       * com o livro pela metade, o quadro NÃO conclui a leitura por ela — quem
       * oferece isso é o aviso de divergência, com um botão e um nome. */
      if (origem !== destino) await declararEstadoDeLeitura(livro.chave, destino);
      await ordenarLeituras(novaOrdem);
      await aoReler?.(livro.chave);
    } catch {
      /* A ordem otimista não pode mentir depois de uma falha de rede. Volta
       * imediatamente e pede a fonte novamente; assim o quadro nunca parece
       * ter guardado uma posição que o servidor recusou. */
      setOrdemLocal(ordemAnterior);
      await aoReler?.(livro.chave);
    } finally {
      setMovendo(null);
    }
  }, [aoReler, livros, ordemLocal]);

  /* CONCLUIR A LEITURA é a "ação adicional" que o Erik pediu que existisse
   * explicitamente: ela mexe no progresso, e por isso tem botão e nome próprios
   * em vez de acontecer junto com o arrasto. */
  const concluirLeitura = useCallback(async (livro) => {
    setMovendo(livro.chave);
    try {
      await gravarProgresso(livro.chave, {
        capitulo: Math.max(0, (livro.capitulos ?? 1) - 1),
        deslocamento: 0,
        fracao: 1,
      });
      aoReler?.(livro.chave);
    } finally {
      setMovendo(null);
    }
  }, [aoReler]);

  const comecaGesto = (e, livro) => {
    /* Só o botão principal, e nunca em cima de um controle: o cartão tem um
       link e um menu dentro, e capturar o ponteiro deles mataria os dois. */
    if (e.button !== 0 || e.target.closest("button, [role=menu]")) return;
    gesto.current = { chave: livro.chave, livro, x0: e.clientX, y0: e.clientY, ativo: false, id: e.pointerId };
  };

  const andaGesto = (e) => {
    const g = gesto.current;
    if (!g) return;
    if (!g.ativo) {
      if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 4) return;
      g.ativo = true;
      try { quadroRef.current?.setPointerCapture(g.id); } catch { /* já foi */ }
      setArrasto({ chave: g.chave, titulo: g.livro.titulo, x: e.clientX, y: e.clientY, de: estadoDeLeitura(g.livro) });
    } else {
      setArrasto((a) => (a ? { ...a, x: e.clientX, y: e.clientY } : a));
    }
    /* `elementFromPoint` e não `e.target`: com a captura no quadro, o alvo do
       evento é sempre o quadro. */
    const sob = document.elementFromPoint(e.clientX, e.clientY)?.closest(".estudos-coluna");
    setColunaSobODedo(sob?.dataset.coluna ?? null);
    const cartao = document.elementFromPoint(e.clientX, e.clientY)?.closest("li[data-livro]");
    if (cartao && cartao.dataset.livro !== String(g.chave)) {
      const caixa = cartao.getBoundingClientRect();
      setPosicaoSobODedo({
        chave: cartao.dataset.livro,
        depois: e.clientY > caixa.top + caixa.height / 2,
      });
    } else setPosicaoSobODedo(null);
  };

  const soltaGesto = () => {
    const g = gesto.current;
    gesto.current = null;
    const destino = colunaSobODedo;
    const posicao = posicaoSobODedo;
    setArrasto(null);
    setColunaSobODedo(null);
    setPosicaoSobODedo(null);
    if (!g?.ativo) return;          // foi clique: o link cuida
    if (destino) mover(g.livro, destino, posicao);
  };
  const [montando, setMontando] = useState(null);
  const [calando, setCalando] = useState(null);
  const navegar = useNavigate();

  useEffect(() => {
    let vivo = true;
    lerAgrupadas().then((r) => vivo && setLigou(r)).catch(() => {});
    return () => { vivo = false; };
  }, []);

  /* AS NOTAS QUE NÃO ESTÃO EM ESTUDO NENHUM — a seção "Fora de estudo" do
   * 966:31095, e a que fecha o gesto: sem ela não há de onde puxar. Um estudo
   * se monta a partir do que sobrou solto, e a tela não mostrava esse resto em
   * lugar nenhum.
   *
   * A conta é feita AQUI e não no servidor: as duas listas já chegam inteiras
   * para desenhar os estudos, e uma rota nova só para subtrair uma da outra
   * seria uma ida à rede para uma diferença de conjuntos. */
  const reunidas = new Set(estudos.flatMap((e) => (e.notas ?? []).map((n) => n.id)));
  /* "Fora de estudo" é de onde se PUXA para montar um estudo, e rascunho não
     entra em estudo nenhum. Listá-lo aqui seria oferecer o que será recusado. */
  const soltas = notas.filter((n) => !reunidas.has(n.id) && n.estado !== "rascunho");

  /* AS ANOTAÇÕES ESCRITAS E NÃO LEVADAS — o cartão cinza do desenho, "4
     anotações escritas e ainda não levadas". É um subconjunto do "Fora de
     estudo": as que têm COMENTÁRIO, ou seja, aquelas em que a pessoa parou para
     escrever alguma coisa e mesmo assim não as levou para lugar nenhum. Marcar
     um trecho é barato; escrever sobre ele não é. */
  const escritasESoltas = soltas.filter((n) => n.comentario);

  const alvo = achatar(procura.trim());

  /* O QUE CADA RECORTE CONTA. Os três olham o mesmo acervo de ângulos
   * diferentes, e o número ao lado do rótulo é o que a pessoa vai encontrar se
   * clicar — não um total genérico. */
  const contaDoRecorte = {
    estudos: estudos.length,
    notas: notas.length,
    /* "Por pergunta" agrupa pelas perguntas que TÊM nota reunida: uma pergunta
     * sem nenhuma nota não é um agrupamento, é um estudo vazio, e ele já
     * aparece no recorte de Estudos. */
    pergunta: estudos.filter((e) => (e.notas ?? []).length > 0).length,
  };

  const visiveis = estudos
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

      {/* A TRILHA DE ÂNCORAS — nó 895:8849, a mesma coluna do livro e do estudo.
          A lista de Estudos é a mais alta das três: o cartão do que ficou pela
          metade, os fios que o Mekora achou, a lista dos estudos e as notas
          soltas, cada bloco com sua própria rolagem.

          Os itens são MONTADOS DO QUE EXISTE, e não fixos: uma conta sem fio
          nenhum não deve ter "Parecem do mesmo assunto" na coluna, apontando para uma seção
          que não está lá. */}
      <div className="estudos-com-trilha" data-clarity-mask="true">
      <section className="estudos">
        {/* O TOPO É CENTRADO, e não uma barra com o botão puxado para a
            direita. Nos nós 900:56142 e 895:8849 o título, a frase e a busca são
            uma coluna estreita no meio, e as ações começam na FILEIRA DE BAIXO,
            junto dos recortes.

            A diferença não é gosto: com o botão colado no título, "Começar um
            estudo" pesa igual ao nome da área toda vez que alguém abre a
            página — e começar um estudo é uma coisa que se faz de vez em
            quando. */}
        <header className="estudos-topo" id="estudos-inicio">
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
        </header>

        {erro && <p className="estudos-erro" role="alert">{erro}</p>}

        {/* A ORDEM É A DOS DOIS NÓS: os recortes vêm ANTES do cartão do que
            ficou pela metade, e não depois. `900:56142` e `966:30771` escrevem
            os dois na mesma ordem — "Todas as notas / Por pergunta / Escrever
            uma nota" e só então "O que ficou pela metade". O produto tinha o
            cartão colado no cabeçalho, o que fazia o lembrete parecer o assunto
            da página em vez do filtro do que se vê. */}
        {/* A contagem ao lado de cada recorte vem da MESMA lista que ele filtra:
            um recorte vazio se anuncia antes de ser clicado, em vez de levar a
            uma tela em branco sem explicação. */}
        {/* A FILEIRA DE CONTROLE: os recortes à esquerda, a ação na ponta —
            como os dois nós a desenham. O botão saiu do cabeçalho para cá. */}
        <div className="estudos-fileira">
          <nav className="recortes soltos estudos-recortes" aria-label="O que mostrar">
            {RECORTES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === recorte ? "true" : "false"}
                onClick={() => setRecorte(r.id)}
              >
                {r.rotulo} <span className="dado">{contaDoRecorte[r.id]}</span>
              </button>
            ))}
          </nav>
          {/* "ESCREVER UMA NOTA" LEVA AO CANVAS, e não abre um formulário aqui.
              
              No modelo toda nota pertence a um livro — `criarNota` pede um
              `jobId` —, e daqui não há livro escolhido. O Erik decidiu onde mora
              a nota sem livro: "Canvas é lugar de nota sem livro, mas acredito
              que só faça sentido se o usuário criar essa nota lá".
              
              E há uma segunda razão, do lado desta tela: os Estudos são sobre
              ORGANIZAR o que já existe. Um verbo de criação aqui produziria uma
              nota sem contexto de leitura — que é justamente o que separa uma
              nota do Mekora de um arquivo de texto.
              
              Então o botão do desenho existe, e faz a coisa honesta: leva ao
              lugar onde aquilo se escreve. */}
          <Botao tom="primaria" onClick={() => navegar("/canvas")}>
            Escrever uma nota
          </Botao>
        </div>

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

        {/* O QUE FICOU PELA METADE — o cartão cinza do desenho. Ele não é um
            aviso: é o lembrete de que escrever e arquivar são gestos
            diferentes, e que o segundo é sempre da pessoa. */}
        {escritasESoltas.length > 0 && (
          <aside className="estudos-metade" id="estudos-metade">
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

        {/* O ALTERNADOR LISTA / LEITURA — nós 900:56142 e 895:8849. Mesma forma
            dos outros alternadores do sistema: uma caixa, dois botões, o ativo
            em tinta cheia. */}
        {/* A FILEIRA DO ALTERNADOR — nó `895:8930`: a caixa de Lista/Leitura e o
            botão de criar na MESMA linha, com 56 entre eles. */}
        {recorte === "estudos" && livros.length > 0 && (
        <div className="estudos-fileira-vistas">
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
          {/* FORA DA CAIXA. Dentro dela ele se lia como uma terceira VISTA, ao
              lado de Lista e Leitura, e não como a ação que é. */}
          <Botao tom="secundaria" onClick={() => { setNome(""); setSobre(""); setCriando(true); }}>
            Criar novo estudo
          </Botao>
        </div>
        )}

        {recorte === "estudos" && vista === "leitura" && (
          <div
            className="estudos-quadro"
            ref={quadroRef}
            data-arrastando={arrasto ? "sim" : undefined}
            onPointerMove={andaGesto}
            onPointerUp={soltaGesto}
            onPointerCancel={soltaGesto}
          >
            {COLUNAS.map(({ id, rotulo }) => {
              /* A COLUNA VEM DO CONTRATO. `estadoDeLeitura` é o único lugar com
                 a precedência entre o que a pessoa declarou e o que a fração
                 diz — a Estante, a ficha e a prova leem do mesmo lugar. */
              const dela = livrosOrdenados.filter((l) => estadoDeLeitura(l) === id);
              return (
                <section
                  key={id}
                  className="estudos-coluna"
                  data-coluna={id}
                  /* A coluna de ORIGEM não acende: soltar onde já se estava não
                     é um movimento, e acender lá prometeria uma mudança que não
                     vai acontecer. */
                  data-alvo={arrasto && colunaSobODedo === id ? "sim" : undefined}
                >
                  <h2>
                    {rotulo} <span className="dado">{dela.length}</span>
                  </h2>
                  {!dela.length && <p className="estudos-vazio">Nenhum aqui.</p>}
                  <ul>
                    {dela.map((l, indice) => (
                      <li
                        key={l.chave}
                        data-livro={l.chave}
                        onPointerDown={(e) => comecaGesto(e, l)}
                        data-arrastado={arrasto?.chave === l.chave ? "sim" : undefined}
                        data-movendo={movendo === l.chave ? "sim" : undefined}
                        data-inserir={arrasto && posicaoSobODedo?.chave === String(l.chave)
                          ? (posicaoSobODedo.depois ? "depois" : "antes")
                          : undefined}
                      >
                        {/* `draggable={false}` NO LINK E NA CAPA, e sem isto o
                            arrasto morre no segundo pixel.
                            
                            `<a>` e `<img>` são arrastáveis por padrão: ao mover
                            o mouse com o botão apertado sobre eles, o Chrome
                            inicia o SEU drag — o de trocar um link de aba — e
                            engole os eventos de ponteiro. Medido: com o gesto
                            do `medir.mjs`, chegavam `pointerdown` e DOIS
                            `pointermove`, e depois nada, nem o `pointerup`.
                            
                            É irmã da armadilha que o CLAUDE.md já registra
                            sobre mover o nó no DOM: o arrasto não morre por
                            causa do código do arrasto, e sim de algo que o
                            navegador faz por conta. */}
                        <Link to={`/estante/${l.chave}`} draggable={false}>
                          {l.capa
                            ? <img src={l.capa} alt="" aria-hidden="true" loading="lazy" draggable={false} />
                            : <span className="estudos-livro-vazio">{l.titulo}</span>}
                          <span className="estudos-livro-texto">
                            <span className="estudos-livro-nome">{l.titulo}</span>
                            {l.autor && <span className="estudos-livro-autor">{l.autor}</span>}
                            {/* A porcentagem e a barra só existem em quem está
                                sendo lido: no "A ler" elas seriam zero em toda
                                linha, e zero repetido não informa. */}
                            {id === "reading" && (
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
                        {/* O CAMINHO CLICÁVEL, ao lado do arrasto. Decisão do
                            Erik em 07/09: "não depender exclusivamente de drag:
                            preservar alternativas clicáveis/contextuais para
                            mudança de estado".
                            
                            Não é acessibilidade de enfeite: arrasto não existe
                            para quem usa teclado, para quem usa leitor de tela,
                            e é impreciso em telas pequenas. Os dois caminhos
                            escrevem a mesma coisa: a rota do estado.
                            
                            O "Reler" do `895:8849` deixou de ser um botão à
                            parte. Ele era o nome que o desenho dava ao
                            movimento de "Lido" para "A ler" quando esse
                            movimento ZERAVA o progresso — e ele não zera mais.
                            Chamar de "Reler" um botão que só troca a
                            declaração prometeria o que ele não faz. */}
                        {/* A DECLARAÇÃO E O PROGRESSO PODEM DISCORDAR, e isso
                            não é erro: é o caso de quem terminou o livro no
                            papel, ou desistiu e quer tirá-lo da fila sem apagar
                            onde parou.
                            
                            O Erik: "se marcar como Lido enquanto ainda houver
                            progresso incompleto precisar oferecer uma ação
                            adicional para concluir o progresso, isso pode ser
                            tratado explicitamente na interface, mas não quero
                            mutação silenciosa de histórico como efeito colateral
                            do Kanban".
                            
                            Então o aviso diz o número, e o botão diz o que vai
                            fazer. Quem não clicar fica com o livro em "Lido" e a
                            marca onde estava — que é uma combinação legítima. */}
                        {(() => {
                          const briga = leituraDivergeDaDeclaracao(l);
                          if (!briga || briga.falta !== "concluir") return null;
                          return (
                            <p className="estudos-diverge">
                              <span>
                                Marcado como lido, e a leitura parou em{" "}
                                <span className="dado">
                                  {briga.fracao === null ? "nada" : `${Math.round(briga.fracao * 100)}%`}
                                </span>.
                              </span>
                              {movendo === l.chave
                                ? <span className="estudos-movendo" role="status">Atualizando…</span>
                                : (
                                  <button
                                    type="button"
                                    className="estudos-mover-botao"
                                    onClick={() => concluirLeitura(l)}
                                  >
                                    Concluir a leitura também
                                  </button>
                                )}
                            </p>
                          );
                        })()}
                        <span className="estudos-mover">
                          {movendo === l.chave ? (
                            <span className="estudos-movendo" role="status">Atualizando…</span>
                          ) : (
                            <>
                              <span className="estudos-mover-rotulo">Organizar</span>
                              {indice > 0 && (
                                <button type="button" className="estudos-mover-botao" onClick={() => mover(l, id, { chave: dela[indice - 1].chave })}>
                                  Subir
                                </button>
                              )}
                              {indice < dela.length - 1 && (
                                <button type="button" className="estudos-mover-botao" onClick={() => mover(l, id, { chave: dela[indice + 1].chave, depois: true })}>
                                  Descer
                                </button>
                              )}
                              <span className="estudos-mover-rotulo">Mover para</span>
                              {COLUNAS.filter((c) => c.id !== id).map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="estudos-mover-botao"
                                  onClick={() => mover(l, c.id)}
                                >
                                  {c.rotulo}
                                </button>
                              ))}
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {/* O FANTASMA. Ele é `position: fixed` e `pointer-events: none`:
                seguir o dedo com o próprio cartão exigiria tirá-lo da coluna, e
                mover o nó libera a captura de ponteiro no primeiro pixel. */}
            {arrasto && (
              <span
                className="estudos-fantasma"
                aria-hidden="true"
                style={{ transform: `translate3d(${arrasto.x}px, ${arrasto.y}px, 0)` }}
              >
                {arrasto.titulo}
              </span>
            )}
          </div>
        )}

        {/* A LISTA DOS ESTUDOS FICA NA PARTE DE CIMA, e não ao lado da
            trilha. Quando embrulhei as seções de baixo, ela foi varrida para
            dentro da fileira e passou a medir 974px numa página de 1222 — a
            "div central com 2 larguras sem necessidade" que o Erik viu. */}
        <div className="estudos-lista" id="estudos-lista" hidden={recorte !== "estudos" || vista !== "lista"}>
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

        {/* A TRILHA VIVE AQUI, e não no topo da página.
            
            O Erik: "você decidiu por livre e espontânea vontade que iria
            adicionar nav como uma rádio de música antiga em todo lugar, sendo
            que existem lugares que ela é válida e outros que você SIMPLESMENTE
            forçou". O `895:8849` a põe numa fileira só — a de baixo, ao lado de
            "Parecem do mesmo assunto" —, e não como coluna da página inteira. Em cima ela não
            tem o que indexar: título, busca, recortes e quadro se veem de uma
            olhada.
            
            E ela lista as NOTAS, como no Livro (`895:7631`): "Isso serve
            para… / Que método de… / Solto no livro…" são o texto das próprias
            notas soltas, cortado. */}
        <div className="estudos-fileira-de-baixo">
        <TrilhaDaPagina
          rotulo="Nesta parte"
          itens={[
            ...(ligou?.grupos?.length ? [{ id: "estudos-ligou", rotulo: "Parecem do mesmo assunto" }] : []),
            ...(soltas.length ? [{ id: "estudos-soltas", rotulo: "Fora de estudo" }] : []),
          ]}
        />

        <div className="estudos-de-baixo">

        {/* O NOME DIZ QUEM AGRUPOU, e até 03/09 ele dizia o contrário.
            
            A seção se chamava "Você ligou" e vem de `/notas/agrupadas`, que é
            VARREDURA: quem agrupou foi o sistema, e o corpo dela já admitia isso
            três linhas abaixo do título — "Nada foi organizado por você". Título
            e corpo se contradiziam, e o título atribuía à pessoa um ato que não
            foi dela.
            
            "Parecem do mesmo assunto" casa com o tom das faixas de Conexões —
            "Parecem próximas", "Talvez" —, e a divisão de trabalho é a que o
            `CLAUDE.md` pede: o TÍTULO carrega a postura (é palpite, pode ser
            discordado) e o CORPO carrega o critério (N notas, M livros, P
            palavras). "Palavras em comum" nomearia o critério e perderia a
            ressalva. */}
        {/* A SEÇÃO SÓ EXISTE QUANDO HÁ GRUPO. Uma seção vazia
            afirma que o acervo não tem fio nenhum — e o que ela quer dizer é
            que ainda não há notas suficientes para atravessar livros. Calar é
            mais honesto que anunciar ausência. */}
        {ligou?.grupos?.length > 0 && (
          <section className="estudos-ligou" id="estudos-ligou">
            <h2>Parecem do mesmo assunto</h2>
            <p className="estudos-ligou-criterio">
              Grupos de <span className="dado">{ligou.criterios.notas}</span> notas
              ou mais que dividem pelo menos{" "}
              <span className="dado">{ligou.criterios.palavras}</span> palavras de
              assunto, em <span className="dado">{ligou.criterios.livros}</span>{" "}
              livros ou mais. Nada foi organizado por você.
              {ligou.olhadas >= ligou.teto && (
                <> Das suas notas, as <span className="dado">{ligou.teto}</span> mais recentes entraram na conta.</>
              )}
            </p>

            <ul className="estudos-fios">
              {ligou.grupos.map((g) => {
                /* A chave é o menor id do grupo: ele não muda enquanto o grupo
                   for o mesmo, e o índice mudaria a cada recarga. */
                const chave = Math.min(...g.notas.map((n) => n.id));
                /* EXEMPLOS, NÃO ECO. A varredura pode reunir notas diferentes
                   com o mesmo trecho — importações repetidas, citações iguais
                   ou testes. Mostrar quatro cópias não aumenta a evidência;
                   só empurra a decisão para baixo. O grupo inteiro continua na
                   ação, mas a leitura inicial mostra no máximo dois textos
                   distintos. */
                const vistos = new Set();
                const exemplos = g.notas.filter((n) => {
                  const texto = achatar(n.trecho || n.comentario || "");
                  if (!texto || vistos.has(texto)) return false;
                  vistos.add(texto);
                  return true;
                }).slice(0, 2);
                return (
                  <li key={chave}>
                    <p className="estudos-fio-conta">
                      <span className="dado">{g.quantas}</span> notas suas, em{" "}
                      <span className="dado">{g.livros}</span>{" "}
                      {g.livros === 1 ? "livro" : "livros diferentes"}, usam as mesmas palavras.
                    </p>
                    {/* AS PALAVRAS VÃO JUNTO. Sem elas o produto afirma um
                        assunto e não diz de onde o tirou — e ninguém pode
                        discordar de uma afirmação sem evidência. */}
                    <p className="estudos-fio-palavras">{g.palavras.join(" · ")}</p>

                    <ul className="estudos-fio-notas">
                      {exemplos.map((n) => (
                        <li key={n.id}>
                          <Link to={`/nota/${n.id}`}>
                            <span className="estudos-fio-trecho">{n.trecho || n.comentario}</span>
                            {n.origem && <span className="estudos-fio-origem">{n.origem}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {g.notas.length > exemplos.length && (
                      <p className="estudos-fio-resto">
                        Mais {g.notas.length - exemplos.length}{" "}
                        {g.notas.length - exemplos.length === 1 ? "nota faz" : "notas fazem"} parte deste grupo.
                      </p>
                    )}

                    {/* O produto NÃO CRIA o estudo sozinho e não escreve a
                        pergunta: ele monta com as notas dentro e leva até lá. A
                        pergunta do centro é o estudo inteiro, e é a única coisa
                        que ninguém pode escrever no lugar da pessoa. */}
                    <div className="estudos-fio-acoes">
                      <Botao
                        tom="secundaria"
                        porque={montando === chave ? "Montando o estudo…" : null}
                        onClick={async () => {
                          setMontando(chave);
                          try {
                            const semente = (g.palavras.slice(0, 3).join(", ") || "Notas parecidas");
                            const novo = await criarEstudo({ nome: semente, sobre: "" });
                            for (const n of g.notas) {
                              await reunirNoEstudo(novo.id, n.id).catch(() => {});
                            }
                            navegar(`/estudo/${novo.id}`);
                          } catch {
                            setMontando(null);
                          }
                        }}
                      >
                        {montando === chave ? "Montando…" : `Criar estudo com estas ${g.quantas} notas`}
                      </Botao>

                      {/* "IGNORAR" — o botão do desenho, e ele ficou de fora até
                          existir onde LEMBRAR. Um botão que esquece ao
                          recarregar é pior que botão nenhum.

                          O grupo some da tela na hora, sem esperar a rede: o
                          gesto é "não quero ver isto", e ver o bloco piscando
                          por meio segundo é o contrário. Se a gravação falhar,
                          ele volta na próxima visita — que é honesto. */}
                      <Botao
                        tom="secundaria"
                        porque={calando === chave ? "Dispensando…" : null}
                        onClick={async () => {
                          setCalando(chave);
                          try {
                            await ignorarGrupo(g.notas.map((n) => n.id));
                            setLigou((x) => ({
                              ...x,
                              grupos: x.grupos.filter((y) => y !== g),
                              calados: (x.calados ?? 0) + 1,
                            }));
                          } finally {
                            setCalando(null);
                          }
                        }}
                      >
                        {calando === chave ? "Calando…" : "Ignorar"}
                      </Botao>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* O QUE FOI CALADO, e como voltar. Sem esta linha, ignorar é
                irreversível — e ignorar não é apagar: é dizer "já entendi", que
                é o tipo de coisa de que se muda de ideia. */}
            {ligou.calados > 0 && (
              <p className="estudos-ligou-calados">
                <span className="dado">{ligou.calados}</span>{" "}
                {ligou.calados === 1 ? "grupo está calado" : "grupos estão calados"}.{" "}
                <button
                  type="button"
                  className="estudos-ligou-voltar"
                  onClick={async () => {
                    await ouvirGruposDeNovo();
                    setLigou(await lerAgrupadas());
                  }}
                >
                  Mostrar de novo
                </button>
              </p>
            )}
          </section>
        )}

        {/* A SEÇÃO SOME QUANDO NÃO SOBRA GRUPO, mas o que foi calado precisa
            continuar alcançável — senão o gesto vira uma porta sem volta. */}
        {ligou?.grupos?.length === 0 && ligou?.calados > 0 && (
          <p className="estudos-ligou-calados">
            Você calou <span className="dado">{ligou.calados}</span>{" "}
            {ligou.calados === 1 ? "grupo" : "grupos"}, e não há outros para mostrar.{" "}
            <button
              type="button"
              className="estudos-ligou-voltar"
              onClick={async () => {
                await ouvirGruposDeNovo();
                setLigou(await lerAgrupadas());
              }}
            >
              Mostrar de novo
            </button>
          </p>
        )}

        {/* TODAS AS NOTAS — o segundo recorte. Sem passar por estudo nenhum:
            é o acervo de marcações inteiro, que a pessoa pode não ter organizado
            em lugar nenhum. */}
        {recorte === "notas" && (
          <section className="estudos-todas" id="estudos-todas">
            <h2>Todas as notas <span className="dado">{notas.length}</span></h2>
            <ul className="estudos-notas-cruas">
              {notas.slice(0, LIMITE_DAS_SOLTAS).map((n) => (
                <li key={n.id}>
                  {n.trecho && <blockquote className="trecho-citado" data-cor={n.cor}>{n.trecho}</blockquote>}
                  {n.comentario && <p className="estudos-solta-comentario">{n.comentario}</p>}
                  <p className="estudos-solta-origem">
                    {n.origem || (n.fonte === "solta" ? "escrita no Canvas" : "de um livro seu")}
                  </p>
                </li>
              ))}
            </ul>
            {notas.length > LIMITE_DAS_SOLTAS && (
              <p className="estudos-sobre">
                Mostrando {LIMITE_DAS_SOLTAS} de <span className="dado">{notas.length}</span>.
                As outras estão em <Link to="/notas">Notas</Link>.
              </p>
            )}
          </section>
        )}

        {/* POR PERGUNTA — o terceiro. As mesmas notas, reunidas debaixo da
            pergunta do estudo a que pertencem. Pergunta sem nota nenhuma fica de
            fora: ela não é um agrupamento, é um estudo vazio, e ele já aparece
            no primeiro recorte. */}
        {recorte === "pergunta" && (
          <section className="estudos-por-pergunta" id="estudos-por-pergunta">
            {estudos.filter((e) => (e.notas ?? []).length > 0).map((e) => (
              <article key={e.id} className="estudos-pergunta">
                <h2>{e.sobre || e.nome}</h2>
                <ul className="estudos-notas-cruas">
                  {(e.notas ?? []).map((n) => (
                    <li key={n.id}>
                      {n.trecho && <blockquote className="trecho-citado" data-cor={n.cor}>{n.trecho}</blockquote>}
                      {n.comentario && <p className="estudos-solta-comentario">{n.comentario}</p>}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            {!estudos.some((e) => (e.notas ?? []).length > 0) && (
              <p className="estudos-vazio">
                Nenhuma pergunta reuniu nota ainda. Um estudo com notas dentro aparece aqui.
              </p>
            )}
          </section>
        )}

        {/* FORA DE ESTUDO — o que sobrou solto, e de onde um estudo se monta.
            O nó 966:31095 tem esta seção, e sem ela a tela mostra o que já foi
            reunido e esconde o material. */}
        {soltas.length > 0 && (
          <section className="estudos-soltas" id="estudos-soltas">
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
                  {n.trecho && (
                    <blockquote className="trecho-citado" data-cor={n.cor}>{n.trecho}</blockquote>
                  )}
                  {/* O COMENTARIO E O QUE A PESSOA ESCREVEU, e esta secao era a
                      unica das tres que o engolia: "Todas as notas" e "Por
                      pergunta" ja o mostravam, com a mesma classe. Uma nota que
                      so tem comentario aparecia aqui como um filete e uma
                      origem, sem o texto dela. */}
                  {n.comentario && <p className="estudos-solta-comentario">{n.comentario}</p>}
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
        </div>
        </div>
      </section>
      </div>

      <Folha
        aberta={criando}
        titulo="Começar um estudo"
        aoFechar={() => setCriando(false)}
        acoes={
          <Botao
            tom="primaria"
            porque={!nome.trim() ? "Dê um nome ao estudo" : null}
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
    
    </div>
  );
}
