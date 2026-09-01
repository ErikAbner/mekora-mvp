/* Leitura. O passo pelo qual o produto existe.
 *
 * Vem do nó 895:10472. Duas correções ao desenho estão em DESVIOS.md, e as duas
 * são medidas, não gosto:
 *
 * A PROSA VAI PARA A TINTA CHEIA. O desenho põe o texto do livro em
 * `text/secondary` — a tinta mais fraca do sistema, no conteúdo que é a razão de
 * o produto existir. Com destaque atrás, o rosa dá 3,47 e o azul 3,92: reprovam.
 * Com `text/strong`, os oito pares passam, o pior deles em 11,71.
 *
 * O DESTAQUE É O CONJUNTO CLARO, e eu tinha chamado esse conjunto de `capa/*`.
 * Errei: o claro existe para receber texto por cima. O vivo reprova nos quatro
 * matizes com a tinta da prosa. Marca-texto é nota, e nota é um dos três
 * endereços onde a cor é permitida.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Icone } from "../componentes/Icone.jsx";
import { comDeslocamentos, irPara, ondeEstouNoLivro } from "../leitor/onde-parei.js";
import { lerSelecao, notasDoBloco } from "../leitor/selecao.js";
import "./leitura.css";

const iconeMenu = "/icones/icone-menu.svg";
const iconeCaderno = "/icones/icone-caderno.svg";
const iconeMarcador = "/icones/icone-marcador.svg";
const iconeBuscar = "/icones/icone-buscar.svg";
const iconeConta = "/icones/icone-conta.svg";
const ornamentoAbertura = "/icones/ornamento-abertura.svg";

/* As quatro cores de destaque. O nome diz o papel, e o valor é o conjunto claro
 * — o único em que a prosa continua legível por cima. */
export const DESTAQUES = {
  verde: "var(--nota-verde, #efffbf)",
  amarelo: "var(--nota-amarelo, #fff8bf)",
  rosa: "var(--nota-rosa, #ffbfc0)",
  azul: "var(--nota-azul, #bfdfff)",
};

/* O bloco do EPUB e o parágrafo do exemplo passam pelo MESMO componente: os dois
 * carregam texto e marcas por deslocamento de caractere. Foi para isso que a
 * ênfase do livro virou deslocamento em vez de HTML aninhado — o destaque do
 * usuário e a ênfase do autor vivem no mesmo sistema de coordenadas, e a tela
 * não precisa saber de onde cada um veio. */
const TAG = { titulo: "h2", subtitulo: "h3", citacao: "blockquote", item: "li", legenda: "figcaption" };

/* QUAL LARGURA CADA IMAGEM RECEBE — e o EPUB não diz.
 *
 * O desenho (895:10472) usa três medidas na leitura: a coluna de texto em 680,
 * a imagem larga em 1540, e a faixa que sangra até a borda. Nenhum livro marca
 * "esta imagem é larga", então o critério tem de sair de algo que exista no
 * arquivo — e o que existe é a RESOLUÇÃO NATIVA.
 *
 * Uma figura de 1600px de largura foi feita para ser vista grande; uma de 400px
 * não. Esticar a pequena até 1540 não a torna maior, torna borrada — e é o que
 * um critério por proporção sozinho faria com toda ilustração panorâmica
 * pequena.
 *
 * Os dois limiares estão escritos aqui, e não escondidos, porque limiar
 * escondido é limiar em que ninguém pode discordar:
 *
 *   LARGA  ≥ 900px de largura nativa  E proporção ≥ 1,4
 *   CHEIA  ≥ 1600px de largura nativa E proporção ≥ 2,2
 *
 * E A IMAGEM NUNCA PASSA DO PRÓPRIO TAMANHO. Os limiares primeiro foram 1200 e
 * 1600 — ambos MENORES que as larguras de destino, 1540 e 1792 —, e uma
 * varredura do critério mostrou 32 casos em que uma figura de 1210px seria
 * esticada até 1540. Subir o limiar até a largura de destino resolveria e
 * jogaria toda imagem de 1400px de volta para a coluna de 680, que é
 * desperdício do outro lado.
 *
 * A saída é a imagem levar o próprio tamanho como teto: `--natural` vira
 * `max-inline-size`, e aí "larga" quer dizer "pode passar da coluna, até onde
 * seus pixels alcançarem".
 */
const LARGA_MINIMA = 900;
const LARGA_PROPORCAO = 1.4;
const CHEIA_MINIMA = 1600;
const CHEIA_PROPORCAO = 2.2;

export function larguraDaImagem(w, h) {
  if (!w || !h) return "";
  const proporcao = w / h;
  if (w >= CHEIA_MINIMA && proporcao >= CHEIA_PROPORCAO) return "cheia";
  if (w >= LARGA_MINIMA && proporcao >= LARGA_PROPORCAO) return "larga";
  return "";
}

function Ilustracao({ src, alt, de }) {
  /* A classe só entra DEPOIS de a imagem carregar, porque antes disso não há
   * dimensão nenhuma para medir. Começar na coluna e alargar depois é a ordem
   * certa: o contrário faria toda imagem piscar larga antes de encolher. */
  const [largura, setLargura] = useState("");
  const [natural, setNatural] = useState(null);

  return (
    <figure
      className={`bloco ilustracao${largura ? ` ${largura}` : ""}`}
      data-de={de}
      /* O teto em pixels da própria imagem. Sem ele, `inline-size: 100%` na
         coluna larga amplia o que não tem pixel para isso. */
      style={natural ? { "--natural": `${natural}px` } : undefined}
    >
      {/* SEM `loading="lazy"`, e a razão não é o teste que ele atrapalhou.
          O atributo existe para economizar REDE, e aqui não há rede: a imagem
          já é um `blob:` na memória, extraído do EPUB que o navegador baixou
          inteiro. Adiar o desenho de algo que já está em mãos só acrescenta um
          comportamento que pode não acontecer — e ele de fato não aconteceu,
          deixando a figura em 0x0 sem um erro em lugar nenhum. */}
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.target;
          setNatural(w || null);
          setLargura(larguraDaImagem(w, h));
        }}
      />
    </figure>
  );
}

function Bloco({ tipo = "paragrafo", texto, destaques = [], marcas = [], de = 0, src, alt = "" }) {
  /* A imagem é um bloco próprio, com legenda vazia se o EPUB não deu nenhuma.
   * O `alt` vem do arquivo COMO ESTÁ, incluindo vazio: `alt=""` num EPUB quer
   * dizer "decorativa, não anuncie", e inventar uma descrição faria o leitor de
   * tela narrar enfeite. */
  if (tipo === "imagem") {
    return <Ilustracao src={src} alt={alt} de={de} />;
  }

  const Como = TAG[tipo] ?? "p";
  const todas = [
    ...marcas.map((m) => ({ ...m, classe: m.tipo })),
    ...destaques.map((d) => ({ ...d, classe: "destaque", cor: d.cor })),
  ].sort((a, b) => a.de - b.de);

  if (!todas.length) return <Como className={`bloco ${tipo}`} data-de={de}>{texto}</Como>;

  const partes = [];
  let i = 0;
  for (const m of todas) {
    if (m.de < i) continue;   // sobreposição: a primeira ganha, e a segunda some
    if (m.de > i) partes.push(texto.slice(i, m.de));
    partes.push(
      m.classe === "destaque" ? (
        <mark key={`${m.de}-d`} style={{ background: DESTAQUES[m.cor] }}>{texto.slice(m.de, m.ate)}</mark>
      ) : (
        <em key={`${m.de}-${m.classe}`} className={m.classe}>{texto.slice(m.de, m.ate)}</em>
      ),
    );
    i = m.ate;
  }
  if (i < texto.length) partes.push(texto.slice(i));
  return <Como className={`bloco ${tipo}`} data-de={de}>{partes}</Como>;
}

function Paragrafo({ texto, destaques = [] }) {
  if (!destaques.length) return <p>{texto}</p>;

  /* O destaque é desenhado com `<mark>` e não com um bloco absoluto atrás.
   *
   * O desenho usa retângulos posicionados por coordenada — oito deles, com
   * `top` e `left` em pixel. Isso quebra na primeira mudança de corpo, de
   * largura ou de idioma, e some para leitor de tela: o trecho destacado deixa
   * de ser destacado, vira um retângulo colorido ao lado de um texto qualquer.
   *
   * `<mark>` acompanha o texto porque É o texto, e é anunciado como marcação.
   */
  const partes = [];
  let i = 0;
  for (const d of [...destaques].sort((a, b) => a.de - b.de)) {
    if (d.de > i) partes.push(texto.slice(i, d.de));
    partes.push(
      <mark key={d.de} style={{ background: DESTAQUES[d.cor] }}>
        {texto.slice(d.de, d.ate)}
      </mark>,
    );
    i = d.ate;
  }
  if (i < texto.length) partes.push(texto.slice(i));
  return <p>{partes}</p>;
}

/* O caderno: as notas do livro, fora do texto.
 *
 * Ele lista TODAS, e não só as do capítulo aberto — é o lugar de rever o que se
 * marcou no livro inteiro, e limitar ao capítulo transformaria isso num resumo
 * da página. As de outro capítulo levam até lá.
 */
function Caderno({ notas, capitulo, aoComentar, aoTrocarCor, aoApagar, aoIr, aoFechar }) {
  return (
    <aside className="caderno" aria-label="Notas do livro">
      <header>
        <h2>Notas <span className="dado">{notas.length}</span></h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar as notas">Fechar</button>
      </header>

      {!notas.length && (
        <p className="caderno-vazio">
          Selecione um trecho do texto para marcar. A cor é sua; o comentário é
          opcional.
        </p>
      )}

      <ul>
        {notas.map((n) => (
          <li key={n.id} className={n.capitulo === capitulo ? "aqui" : ""}>
            {/* O trecho marcado, na cor escolhida. É por ele que se reconhece a
                nota — a data e o número do capítulo não dizem nada sobre o que
                foi marcado. */}
            <blockquote style={{ background: DESTAQUES[n.cor] }}>{n.trecho}</blockquote>

            <textarea
              defaultValue={n.comentario}
              placeholder="Escrever ao lado…"
              aria-label="Comentário desta nota"
              /* Grava ao SAIR do campo, e não a cada tecla: um pedido por
                 caractere digitado é ruído, e o que interessa é o que ficou. */
              onBlur={(e) => {
                if (e.target.value !== n.comentario) aoComentar?.(n.id, e.target.value);
              }}
            />

            <div className="nota-acoes">
              <div className="nota-cores" role="group" aria-label="Trocar a cor">
                {Object.keys(DESTAQUES).map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className={`paleta-cor${cor === n.cor ? " escolhida" : ""}`}
                    style={{ background: DESTAQUES[cor] }}
                    aria-label={`Trocar para ${cor}`}
                    aria-pressed={cor === n.cor ? "true" : "false"}
                    onClick={() => aoTrocarCor?.(n.id, cor)}
                  />
                ))}
              </div>
              {n.capitulo !== capitulo && (
                <button type="button" className="nota-ir" onClick={() => aoIr?.(n.capitulo)}>
                  Ir ao capítulo {n.capitulo + 1}
                </button>
              )}
              <button type="button" className="nota-apagar" onClick={() => aoApagar?.(n.id)}>
                Apagar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function Leitura({ livro, aviso, capitulos: janela, aoPedirMais, aoPedirAntes, temMais = false, temAntes = false, progresso, aoMarcar, notas = [], aoAnotar, aoComentar, aoTrocarCor, aoApagarNota, erroDeNota }) {
  const [cromoVisivel, setCromo] = useState(true);
  const [paleta, setPaleta] = useState(null);
  const [caderno, setCaderno] = useState(false);
  const prosa = useRef(null);
  const restaurado = useRef(null);

  /* A JANELA, ou o livro sozinho. O texto de exemplo e a prova não passam
   * janela nenhuma, e continuar funcionando com um capítulo só é o que mantém
   * essa tela testável sem um EPUB inteiro atrás. */
  const capitulos = useMemo(
    () =>
      janela?.length
        ? janela
        : [{ indice: livro?.capitulo ?? 0, blocos: livro?.blocos ?? livro?.paragrafos ?? [] }],
    [janela, livro?.blocos, livro?.paragrafos, livro?.capitulo],
  );

  /* Os blocos do PRIMEIRO capítulo da janela, para a restauração da marca. Os
   * outros têm a própria contagem, dentro da própria `<section>`. */
  const blocos = useMemo(
    () => comDeslocamentos(capitulos[0]?.blocos ?? []),
    [capitulos],
  );

  /* Só as notas deste capítulo. As outras continuam carregadas — virar o
   * capítulo com elas em mãos é imediato, contra um pedido a cada virada que
   * faria o destaque aparecer um instante depois do texto. */
  const daqui = useMemo(
    () => notas.filter((n) => n.capitulo === (livro?.capitulo ?? 0)),
    [notas, livro?.capitulo],
  );

  /* A PALETA APARECE AO SOLTAR O DEDO, e não a cada movimento da seleção.
   * Durante o arrasto a seleção muda continuamente, e uma paleta que segue o
   * cursor atrapalha justamente o gesto de escolher o trecho. */
  useEffect(() => {
    if (!aoAnotar) return;
    const aoSoltar = () => {
      const sel = lerSelecao(prosa.current);
      setPaleta(sel);
    };
    document.addEventListener("mouseup", aoSoltar);
    document.addEventListener("touchend", aoSoltar);
    /* Rolar fecha a paleta: ela é posicionada em coordenadas de tela, e sem
     * isto ficaria pairando longe do texto que marcou. */
    const fechar = () => setPaleta(null);
    window.addEventListener("scroll", fechar, { passive: true });
    return () => {
      document.removeEventListener("mouseup", aoSoltar);
      document.removeEventListener("touchend", aoSoltar);
      window.removeEventListener("scroll", fechar);
    };
  }, [aoAnotar]);

  /* RESTAURAR uma vez por capítulo, e não a cada render. Sem a trava, qualquer
   * re-render depois de a pessoa ter rolado a puxaria de volta para a marca —
   * a tela brigando com quem lê. */
  useEffect(() => {
    const chave = `${livro?.capitulo ?? 0}`;
    if (restaurado.current === chave || !blocos.length) return;
    restaurado.current = chave;
    if (progresso?.capitulo === livro?.capitulo && progresso?.deslocamento) {
      irPara(prosa.current, progresso.deslocamento);
    }
  }, [blocos, livro?.capitulo, progresso]);

  /* A SENTINELA PEDE O PRÓXIMO CAPÍTULO quando entra em cena.
   *
   * `IntersectionObserver`, e não o evento de rolagem: o evento dispara dezenas
   * de vezes por segundo e obrigaria a medir a posição em cada uma. O
   * observador avisa uma vez, quando o elemento cruza a borda.
   *
   * `rootMargin` de 800px faz o pedido acontecer ANTES de a sentinela aparecer —
   * é a diferença entre o capítulo seguinte já estar lá quando a pessoa chega e
   * ela ver um pulo. É o "carrega mais quando ele está na oitava" do Erik: a
   * margem é o que define o quão antes.
   *
   * A função vive num ref pela mesma razão do gravador de rolagem: ela chega
   * como arrow de quem usa a tela, e pô-la nas dependências remontaria o
   * observador a cada render. */
  const sentinela = useRef(null);
  const sentinelaAcima = useRef(null);
  const pedirAgora = useRef(aoPedirMais);
  const pedirAntesAgora = useRef(aoPedirAntes);
  pedirAgora.current = aoPedirMais;
  pedirAntesAgora.current = aoPedirAntes;

  useEffect(() => {
    const abaixo = temMais ? sentinela.current : null;
    const acima = temAntes ? sentinelaAcima.current : null;
    if (!abaixo && !acima) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          if (e.target === abaixo) pedirAgora.current?.();
          if (e.target === acima) pedirAntesAgora.current?.();
        }
      },
      { rootMargin: "800px 0px" },
    );
    if (abaixo) obs.observe(abaixo);
    if (acima) obs.observe(acima);
    return () => obs.disconnect();
  }, [temMais, temAntes, capitulos.length]);

  /* A função mais recente fica num ref, e o efeito NÃO depende dela.
   *
   * `aoMarcar` chega como arrow function de quem usa a tela — o normal em
   * React —, e isso quer dizer referência nova a cada render. Com ela na lista
   * de dependências, o efeito era desmontado e remontado toda vez, e a limpeza
   * chamava `clearTimeout` no relógio pendente: o temporizador nunca chegava
   * aos 900ms e NADA era gravado.
   *
   * O defeito não dava erro nenhum. A rolagem funcionava, a marca era
   * calculada certo — medida em 16 quando o servidor tinha 0 — e o progresso
   * simplesmente não andava.
   *
   * O ref resolve sem exigir que quem chama envolva a função em `useCallback`:
   * um componente que só funciona se quem o usa lembrar de memoizar é um
   * componente que vai quebrar em silêncio no próximo lugar onde for usado. */
  const marcarAgora = useRef(aoMarcar);
  marcarAgora.current = aoMarcar;

  /* GRAVAR depois que a rolagem PARA, e não durante.
   *
   * Rolar dispara dezenas de vezes por segundo; gravar em cada uma faria o
   * leitor mandar centenas de pedidos por minuto ao servidor para registrar
   * posições pelas quais a pessoa só passou. O que interessa é onde ela ficou. */
  useEffect(() => {
    if (!blocos.length) return;
    let relogio;
    const aoRolar = () => {
      clearTimeout(relogio);
      /* Os dois saem juntos: com vários capítulos na tela, o número do
                 capítulo e o deslocamento precisam vir do MESMO ponto. */
              relogio = setTimeout(() => marcarAgora.current?.(ondeEstouNoLivro(prosa.current)), 900);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => { clearTimeout(relogio); window.removeEventListener("scroll", aoRolar); };
  }, [blocos.length]);

  if (!livro) return null;

  return (
    <div className="leitura">
      {/* O cromo recolhe. Numa tela de leitura, a interface que fica é a que
          disputa atenção com o texto — e aqui o texto é o produto. */}
      <div className={`cromo${cromoVisivel ? "" : " recolhido"}`}>
        <nav className="cromo-caixa" aria-label="Leitura">
          <button type="button" aria-label="Menu" onClick={() => setCromo((v) => !v)}>
            <Icone src={iconeMenu} />
          </button>
          <button
            type="button"
            aria-label={`Notas (${notas.length})`}
            aria-pressed={caderno ? "true" : "false"}
            onClick={() => setCaderno((v) => !v)}
          >
            <Icone src={iconeCaderno} />
          </button>
          <button type="button" aria-label="Marcadores"><Icone src={iconeMarcador} /></button>
        </nav>
        <nav className="cromo-caixa" aria-label="Ferramentas">
          <button type="button" aria-label="Buscar no livro"><Icone src={iconeBuscar} /></button>
          <button type="button" aria-label="Conta"><Icone src={iconeConta} /></button>
        </nav>
      </div>

      <header className="abertura">
        <h1>{livro.titulo}</h1>
        <p className="autoria">Escrito por {livro.autor}</p>
        <img src={ornamentoAbertura} alt="" className="ornamento" aria-hidden="true" />
      </header>

      {/* A medida vem do sistema: 680px é a coluna do desenho, e a 20px dá
          cerca de 65 caracteres por linha — dentro da faixa confortável. */}
      {/* O produto diz o que não sabe. Um texto de exemplo sem aviso passaria por
          conteúdo do usuário, que é a pior confusão possível numa tela de leitura. */}
      {aviso && <p className="leitura-aviso" role="status">{aviso}</p>}

      {/* A ROLAGEM E CONTINUA: os capítulos carregados vêm um atrás do outro,
          sem botão entre eles. Cada um é uma `<section>` com o próprio índice,
          e é isso que permite saber em qual a pessoa está — sem esse marcador,
          o progresso e a nota não teriam a que se prender.

          Os deslocamentos são POR CAPÍTULO. Emendar tudo numa contagem só
          quebraria toda nota já gravada: elas guardam a posição dentro do
          capítulo, e a âncora por citação as reancora, mas o número mudaria de
          significado no meio do caminho. */}
      {/* `data-capitulos` e `data-carregados` existem para a MEDIDA: sem eles,
          "a janela cresceu?" só se responde contando `<section>`, e "cresceu até
          onde deveria?" não se responde de jeito nenhum. É estado que a tela já
          tem, declarado onde um instrumento alcança. */}
      <article
        className="prosa"
        ref={prosa}
        data-capitulos={livro.capitulos ?? 1}
        data-carregados={capitulos.length}
        data-tem-mais={temMais ? "sim" : "nao"}
        data-ultimo={capitulos[capitulos.length - 1]?.indice ?? -1}
      >
        {/* A SENTINELA DE CIMA. Quem abre no capítulo 8 precisa poder subir, e
            sem ela os sete anteriores ficariam inalcançáveis — a rolagem
            contínua tirou os botões de virar e, com eles, a única forma de
            voltar que existia. */}
        {temAntes && <div ref={sentinelaAcima} className="sentinela" aria-hidden="true" />}
        {capitulos.map(({ indice, blocos: b }) => (
          <section key={indice} className="capitulo" data-capitulo={indice}>
            {comDeslocamentos(b).map((bloco, i) => (
              <Bloco
                key={i}
                {...bloco}
                destaques={notasDoBloco(
                  notas.filter((n) => n.capitulo === indice),
                  bloco.de,
                  (bloco.texto ?? "").length,
                )}
              />
            ))}
          </section>
        ))}
        {/* A SENTINELA. Quando ela entra em cena, o capítulo seguinte é pedido —
            é o "chegou na oitava, carrega mais dez" aplicado a capítulo.

            Ela fica DEPOIS do último bloco e não no fim de cada capítulo: o que
            dispara o carregamento é a pessoa se aproximar do fim do que existe,
            e não passar por uma fronteira interna. */}
        {temMais && <div ref={sentinela} className="sentinela" aria-hidden="true" />}
      </article>

      {/* VIRAR O CAPÍTULO. Sem isto o leitor mostrava um capítulo e acabava —
          o livro inteiro estava carregado e não havia como chegar no resto.

          Os dois botões ficam DEPOIS do texto, e não flutuando por cima: numa
          tela de leitura, o que fica sempre visível disputa atenção com a
          única coisa que importa ali. */}
      {/* A PALETA, junto do que foi marcado. Em canto fixo obrigaria a olhar
          para longe do texto e voltar — e num leitor o olho está no texto. */}
      {paleta && (
        <div
          className="paleta"
          style={{ left: paleta.onde.x, top: paleta.onde.y }}
          role="group"
          aria-label="Marcar o trecho"
        >
          {Object.keys(DESTAQUES).map((cor) => (
            <button
              key={cor}
              type="button"
              className="paleta-cor"
              style={{ background: DESTAQUES[cor] }}
              aria-label={`Marcar de ${cor}`}
              onClick={async () => {
                await aoAnotar?.({ de: paleta.de, ate: paleta.ate, cor, trecho: paleta.trecho });
                setPaleta(null);
                /* Limpa a seleção: deixá-la azul por cima do destaque recém
                   feito esconde exatamente o que a pessoa acabou de marcar. */
                window.getSelection?.()?.removeAllRanges();
              }}
            />
          ))}
        </div>
      )}

      {erroDeNota && <p className="nota-erro" role="alert">{erroDeNota}</p>}

      {caderno && (
        <Caderno
          notas={notas}
          capitulo={livro.capitulo ?? 0}
          aoComentar={aoComentar}
          aoTrocarCor={aoTrocarCor}
          aoApagar={aoApagarNota}
          /* IR A UMA NOTA DE OUTRO CAPÍTULO agora é rolar até ela, e não trocar
             de capítulo — ela pode já estar na tela, alguns capítulos acima. */
          aoIr={(cap) => {
            const alvo = prosa.current?.querySelector(`[data-capitulo="${cap}"]`);
            if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          aoFechar={() => setCaderno(false)}
        />
      )}

      {/* OS BOTÕES DE VIRAR CAPÍTULO SAÍRAM. O desenho (895:10472) não os tem:
          a leitura é uma rolagem só, do título ao fim. Eles existiam porque o
          leitor mostrava um capítulo por vez, e agora a janela emenda os
          capítulos conforme a pessoa desce.

          O que ficou no lugar não é um controle: é a ausência dele. */}
    </div>
  );
}
