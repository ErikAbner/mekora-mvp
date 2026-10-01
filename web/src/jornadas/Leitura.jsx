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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Icone } from "../componentes/Icone.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { comDeslocamentos, irPara, irParaOComeco, ondeEstouNoLivro, trechoEm } from "../leitor/onde-parei.js";
import { AJUSTES, GRUPOS, aplicarAparencia, gravarAparencia, lerAparencia, limitarAparencia, limitesDaColuna } from "../leitor/aparencia.js";
import { aplicarTema, temaEspelhado } from "../estado/tema.js";
import { lerSelecao, notasDoBloco } from "../leitor/selecao.js";
import { EXPLICACAO, procurarNoLivro, reancorar } from "../leitor/ancora.js";
import { ondeComeca, tituloDoCapitulo, usarSumario } from "../leitor/sumario.js";
import { blocosDoCapitulo } from "../leitor/abrir.js";
import { imagemEFragmento, larguraDaImagem } from "../leitor/imagem.js";
import "./leitura.css";
import { medir } from "../medir.js";

const iconeCaderno = "/icones/icone-caderno.svg";
/* O ícone do índice é uma LISTA, e não o da estante: aquele é o lugar onde os
 * livros ficam, e usá-lo aqui fazia o botão do sumário parecer um atalho para
 * fora do livro. */
const iconeIndice = "/icones/icone-indice.svg";
const iconeNotaNova = "/icones/icone-nota-nova.svg";
const iconeCopiar = "/icones/icone-copiar.svg";
const iconeMarcador = "/icones/icone-marcador.svg";
const iconeBuscar = "/icones/icone-buscar.svg";
const ornamentoAbertura = "/icones/ornamento-abertura.svg";

function Flutuante({ children }) {
  /* As ferramentas usam coordenadas da viewport. Mantê-las em `body` evita
   * que a rolagem da longa folha do livro seja descontada dessas coordenadas. */
  return createPortal(children, document.body);
}

function ControleDeFaixa({ ajuste, valor, minimo = ajuste.minimo, maximo = ajuste.maximo, aoMudar }) {
  const numero = Number(valor);
  const mostrado = ajuste.id === "entrelinha"
    ? `${numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`
    : `${Math.round(numero)} ${ajuste.unidade}`;
  return (
    <section className="aparencia-faixa">
      <label htmlFor={`aparencia-${ajuste.id}`}>
        <span>{ajuste.rotulo}</span>
        <output htmlFor={`aparencia-${ajuste.id}`}>{mostrado}</output>
      </label>
      <input
        id={`aparencia-${ajuste.id}`}
        type="range"
        min={minimo}
        max={maximo}
        step={ajuste.passo}
        value={numero}
        aria-valuetext={mostrado}
        onChange={(e) => aoMudar(Number(e.target.value))}
      />
      <div className="aparencia-faixa-limites" aria-hidden="true">
        <span>{ajuste.id === "entrelinha" ? "Compacta" : "Menor"}</span>
        <span>{ajuste.id === "entrelinha" ? "Arejada" : "Maior"}</span>
      </div>
    </section>
  );
}

function alvoDaAncora(secao, ancora) {
  if (!secao || !ancora) return null;
  const blocos = [...secao.querySelectorAll("[data-de]")];
  const inicio = blocos.findIndex((el) => el.dataset.ancora === ancora);
  if (inicio < 0) return null;
  /* A âncora pode cair numa tira de imagem descartada. O lugar continua sendo
   * válido; quem recebe a rolagem é o primeiro bloco visível a partir dali. */
  return blocos.slice(inicio).find((el) => !el.hidden && el.getClientRects().length) ?? null;
}

/* As quatro cores de destaque. O nome diz o papel, e o valor é o conjunto claro
 * — o único em que a prosa continua legível por cima. */
/* A ORDEM É A DO NÓ `941:23120`: verde, amarelo, azul, rosa. Ela não é
   alfabética nem arbitrária — é a que a paleta desenha, e a paleta é montada a
   partir das chaves deste objeto. */
export const DESTAQUES = {
  verde: "var(--nota-verde, #efffbf)",
  amarelo: "var(--nota-amarelo, #fff8bf)",
  azul: "var(--nota-azul, #bfdfff)",
  rosa: "var(--nota-rosa, #ffbfc0)",
};

/* O bloco do EPUB e o parágrafo do exemplo passam pelo MESMO componente: os dois
 * carregam texto e marcas por deslocamento de caractere. Foi para isso que a
 * ênfase do livro virou deslocamento em vez de HTML aninhado — o destaque do
 * usuário e a ênfase do autor vivem no mesmo sistema de coordenadas, e a tela
 * não precisa saber de onde cada um veio. */
const TAG = { titulo: "h2", subtitulo: "h3", citacao: "blockquote", epigrafe: "blockquote", item: "li", legenda: "figcaption" };

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
function Ilustracao({ src, alt, de, ancora, marcador = false }) {
  /* A classe só entra DEPOIS de a imagem carregar, porque antes disso não há
   * dimensão nenhuma para medir. Começar na coluna e alargar depois é a ordem
   * certa: o contrário faria toda imagem piscar larga antes de encolher. */
  const [largura, setLargura] = useState("");
  const [natural, setNatural] = useState(null);
  const [fragmento, setFragmento] = useState(false);

  return (
    <figure
      className={`bloco ilustracao${largura ? ` ${largura}` : ""}${marcador ? " com-marcador" : ""}`}
      data-de={de}
      data-ancora={ancora || undefined}
      hidden={fragmento}
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
          setFragmento(imagemEFragmento(w, h));
          setNatural(w || null);
          setLargura(larguraDaImagem(w, h));
        }}
      />
    </figure>
  );
}

function Bloco({ tipo = "paragrafo", texto, destaques = [], marcas = [], de = 0, src, alt = "", ancora, marcador = false, aoAbrirDestaque }) {
  /* A imagem é um bloco próprio, com legenda vazia se o EPUB não deu nenhuma.
   * O `alt` vem do arquivo COMO ESTÁ, incluindo vazio: `alt=""` num EPUB quer
   * dizer "decorativa, não anuncie", e inventar uma descrição faria o leitor de
   * tela narrar enfeite. */
  if (tipo === "imagem") {
    return <Ilustracao src={src} alt={alt} de={de} ancora={ancora} marcador={marcador} />;
  }

  const Como = TAG[tipo] ?? "p";
  const todas = [
    ...marcas.map((m) => ({ ...m, classe: m.tipo })),
    ...destaques.map((d) => ({ ...d, classe: "destaque", cor: d.cor })),
  ].sort((a, b) => a.de - b.de);

  if (!todas.length) return <Como className={`bloco ${tipo}${marcador ? " com-marcador" : ""}`} data-de={de} data-ancora={ancora || undefined}>{texto}</Como>;

  const partes = [];
  let i = 0;
  for (const m of todas) {
    if (m.de < i) continue;   // sobreposição: a primeira ganha, e a segunda some
    if (m.de > i) partes.push(texto.slice(i, m.de));
    partes.push(
      m.classe === "destaque" ? (
        <mark
          key={`${m.de}-d`}
          data-cor={m.cor}
          data-destaque=""
          data-nota-id={m.id}
          role="button"
          tabIndex={0}
          aria-label="Destaque: editar ou remover"
          onClick={(e) => { e.stopPropagation(); aoAbrirDestaque?.(m, e.currentTarget); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              aoAbrirDestaque?.(m, e.currentTarget);
            }
          }}
        >{texto.slice(m.de, m.ate)}</mark>
      ) : (
        <em key={`${m.de}-${m.classe}`} className={m.classe}>{texto.slice(m.de, m.ate)}</em>
      ),
    );
    i = m.ate;
  }
  if (i < texto.length) partes.push(texto.slice(i));
  return <Como className={`bloco ${tipo}${marcador ? " com-marcador" : ""}`} data-de={de} data-ancora={ancora || undefined}>{partes}</Como>;
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
      <mark key={d.de} data-cor={d.cor} data-destaque="">
        {texto.slice(d.de, d.ate)}
      </mark>,
    );
    i = d.ate;
  }
  if (i < texto.length) partes.push(texto.slice(i));
  return <p>{partes}</p>;
}

/* O ÍNDICE — nó 941:23112.
 *
 * Ele vem do EPUB — do `nav` de EPUB 3 ou do `toc.ncx` de EPUB 2 —, e não de
 * uma contagem. "Capítulo 1, Capítulo 2, Capítulo 3" seria uma lista com cara
 * de sumário e sem nenhuma das informações de um: o livro tem nomes para as
 * suas partes, e são eles que dizem onde a pessoa quer chegar.
 *
 * A COLUNA DA DIREITA é onde o capítulo começa, em por cento. O desenho mostra
 * "20", "30", "40" — números de página, que o produto não tem porque o EPUB não
 * tem. A porcentagem é a mesma medida que sustenta a ficha da estante, e é a
 * única posição que ele conhece de verdade.
 *
 * A linha onde a pessoa está troca o número por "Você está aqui" e ganha o
 * filete à esquerda, como no desenho — que escreve "Vc esta aqui", abreviado e
 * sem acento.
 *
 * Quando o livro NÃO traz sumário, o painel diz isso. Um EPUB pode legitimamente
 * não ter índice, e inventar um seria a tela afirmando uma estrutura que
 * ninguém escreveu.
 */
function Indice({ livro, aqui, raiz, aoIr, aoFechar }) {
  const { itens, erro } = usarSumario(livro);
  let ativo = -1;
  if (itens?.length && aqui) {
    const secao = raiz?.current?.querySelector(`[data-capitulo="${aqui.capitulo}"]`);
    itens.forEach((item, n) => {
      if (item.capitulo !== aqui.capitulo) return;
      const alvo = alvoDaAncora(secao, item.ancora);
      const de = alvo ? Number(alvo.dataset.de) || 0 : (item.ancora ? Infinity : 0);
      if (de <= aqui.deslocamento) ativo = n;
    });
  }

  return (
    <aside className="indice" aria-label="Índice do livro">
      <header>
        <h2>Índice</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar o índice">Fechar</button>
      </header>

      {erro && <p className="indice-aviso" role="alert">O sumário deste livro não pôde ser lido: {erro}</p>}
      {!erro && itens === null && <p className="indice-aviso">Lendo o sumário…</p>}
      {!erro && itens?.length === 0 && (
        <p className="indice-aviso">
          Este livro não traz sumário. Ele existe inteiro — o que falta é a lista
          de partes, que quem montou o arquivo não escreveu.
        </p>
      )}

      {!!itens?.length && (
        <ol className="indice-lista">
          {itens.map((i, n) => {
            const nele = n === ativo;
            const onde = ondeComeca(livro?.extensao, i.capitulo);
            return (
              <li key={`${i.capitulo}-${n}`} className={nele ? "aqui" : undefined} style={{ "--nivel": i.nivel }}>
                <button
                  type="button"
                  aria-current={nele ? "true" : undefined}
                  onClick={() => { aoIr?.(i); aoFechar?.(); }}
                >
                  <span className="titulo-24 discreto indice-titulo">{i.titulo}</span>
                  {nele ? (
                    <span className="indice-aqui">Você está aqui</span>
                  ) : (
                    onde !== null && <span className="indice-onde dado">{onde}%</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}


/* BUSCAR NO LIVRO — o botão que estava `disabled` desde sempre (A-26).
 *
 * Ele não tem painel desenhado no Figma, e por isso ficou desligado. Mas o
 * ícone está no cromo desde o começo, e um leitor em que não se pode procurar
 * uma palavra é um leitor pela metade — então ele usa a forma dos outros
 * painéis da leitura, que estão desenhados: gaveta à esquerda, campo em cima,
 * resultados embaixo.
 *
 * ELA PROCURA NO LIVRO INTEIRO, e não só no que está carregado.
 *
 * A rolagem é em janela — três capítulos por vez —, e uma busca que olhasse só
 * a janela acharia menos do que o livro tem e diria "nada encontrado" com a
 * palavra três capítulos abaixo. Então ela abre os capítulos que faltam, um a
 * um, direto do EPUB. Custa tempo, e a tela diz quanto falta enquanto procura.
 *
 * O QUE ELA NÃO FAZ: acentos contam. "expedicao" não acha "expedição". Ignorar
 * acento exigiria normalizar o texto do livro inteiro a cada busca, e o produto
 * é em português — quem procura "método" escreve "método".
 */
const POR_VOLTA = 60;   /* letras de contexto de cada lado do achado */

function BuscaNoLivro({ livro, aoIr, aoFechar }) {
  const { itens } = usarSumario(livro);
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState(null);
  const [andando, setAndando] = useState(null);
  const campo = useRef(null);

  useEffect(() => { campo.current?.focus(); }, []);

  const procurar = useCallback(async (texto) => {
    const alvo = texto.trim().toLowerCase();
    if (alvo.length < 2) { setAchados(null); setAndando(null); return; }

    setAchados([]);
    const fora = [];
    for (let i = 0; i < livro.capitulos; i++) {
      setAndando({ feito: i, total: livro.capitulos });
      const blocos = await blocosDoCapitulo(livro, i);
      if (!blocos) continue;
      for (const b of blocos) {
        const texto_ = b.texto ?? "";
        let onde = texto_.toLowerCase().indexOf(alvo);
        while (onde !== -1) {
          fora.push({
            capitulo: i,
            de: onde,
            antes: texto_.slice(Math.max(0, onde - POR_VOLTA), onde),
            achado: texto_.slice(onde, onde + alvo.length),
            depois: texto_.slice(onde + alvo.length, onde + alvo.length + POR_VOLTA),
          });
          onde = texto_.toLowerCase().indexOf(alvo, onde + alvo.length);
        }
      }
      /* Mostra o que já achou a cada capítulo, em vez de esperar o livro
         inteiro: num livro de oitenta capítulos a primeira resposta chegaria
         depois de todos. */
      setAchados([...fora]);
    }
    setAndando(null);
  }, [livro]);

  return (
    <aside className="indice busca-livro" aria-label="Buscar no livro">
      <header>
        <h2>Buscar no livro</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar a busca">Fechar</button>
      </header>

      <input
        ref={campo}
        type="search"
        className="caderno-procura"
        placeholder="Uma palavra ou trecho"
        aria-label="Procurar no texto do livro"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") procurar(termo); }}
      />

      {/* O PRODUTO DIZ O QUE ESTÁ FAZENDO. Abrir oitenta capítulos leva tempo,
          e uma lista que cresce sem explicação parece defeito. */}
      {andando && (
        <p className="indice-aviso" role="status">
          Procurando — capítulo <span className="dado">{andando.feito + 1}</span> de{" "}
          <span className="dado">{andando.total}</span>.
        </p>
      )}

      {achados === null && termo.trim().length > 0 && termo.trim().length < 2 && (
        <p className="indice-aviso">Escreva ao menos duas letras.</p>
      )}
      {achados !== null && !achados.length && !andando && (
        <p className="indice-aviso">
          Nada com esse texto neste livro. A busca conta os acentos: "método" e
          "metodo" são coisas diferentes para ela.
        </p>
      )}

      {!!achados?.length && (
        <ul className="busca-livro-lista">
          {achados.map((a, n) => (
            <li key={`${a.capitulo}-${a.de}-${n}`}>
              <button type="button" onClick={() => { aoIr?.(a.capitulo); aoFechar?.(); }}>
                <span className="busca-livro-trecho">
                  {a.antes ? `…${a.antes}` : ""}
                  <mark>{a.achado}</mark>
                  {a.depois ? `${a.depois}…` : ""}
                </span>
                <span className="busca-livro-onde">
                  Capítulo {a.capitulo + 1}
                  {tituloDoCapitulo(itens, a.capitulo) ? ` — ${tituloDoCapitulo(itens, a.capitulo)}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

/* MARCADORES — o outro botão que estava `disabled` desde sempre (A-26).
 *
 * Ele também não tem painel desenhado no Figma, e veste a mesma gaveta do
 * índice e da busca pela mesma razão: os três são jeitos de IR A UM LUGAR do
 * livro. Uma terceira forma de gaveta seriam três desenhos para uma ideia.
 *
 * O QUE É UM MARCADOR, e por que ele não é uma nota: a nota é o que a pessoa
 * marcou e escreveu — tem trecho selecionado, cor, comentário, e aparece no
 * Canvas, nos Estudos e em `/notas`. O marcador não é sobre o texto, é sobre a
 * VOLTA. Guardá-lo em `notas` faria cada dobra de página virar uma linha nas
 * telas cujo assunto inteiro é o que se escreveu.
 *
 * DOBRAR É UM CLIQUE, e não uma seleção. Marcar um trecho exige escolher o
 * trecho; dobrar é o gesto de quem vai fechar o livro. Por isso a ação mora no
 * topo da gaveta, e não na barra de seleção.
 *
 * A LISTA MOSTRA O TEXTO daquele ponto, e não o número: "capítulo 4, caractere
 * 8112" não diz nada sobre o lugar que se quis guardar.
 */
function Marcadores({ livro, marcadores, aqui, erro, aoDobrar, aoDesdobrar, aoIr, aoFechar }) {
  /* O sumário vem daqui, como na busca: é ele que dá nome ao capítulo, e o
   * nome é o que situa o trecho. */
  const { itens } = usarSumario(livro);

  /* JÁ DOBRADO É "IR", E NÃO "DOBRAR DE NOVO". A rota é idempotente e não
   * duplicaria nada, mas um botão que diz "marcar" e não acrescenta linha
   * nenhuma parece quebrado. */
  const jaDobrado = aqui
    ? marcadores.find((m) => m.capitulo === aqui.capitulo && m.deslocamento === aqui.deslocamento)
    : null;

  return (
    <aside className="indice marcadores" aria-label="Marcadores">
      <header>
        <h2>Marcadores</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar os marcadores">Fechar</button>
      </header>

      {/* O BOTÃO DO SISTEMA, e não uma caixa desenhada aqui.
          A primeira versão era um `<button>` de largura cheia com filete de 1px
          e tinta apagada — e isso é o desenho de um CAMPO, não de uma ação. É a
          mesma armadilha que a lista de "Trazer para a superfície" pagou. O
          `Botao` secundário tem 58px de altura, rótulo centrado e a BORDA DE
          CONTROLE, que é o token que a WCAG cobra em componente de interface. */}
      <div className="marcadores-acao">
        <Botao
          tom="secundaria"
          onClick={aoDobrar}
          disabled={Boolean(jaDobrado)}
          title={jaDobrado ? "Este lugar já está marcado." : undefined}
        >
          {jaDobrado ? "Este lugar já está marcado" : "Marcar onde estou"}
        </Botao>
      </div>

      {erro && <p className="indice-aviso" role="alert">{erro}</p>}

      {!marcadores.length && !erro && (
        <p className="indice-aviso">
          Nenhum marcador neste livro. Marque o lugar antes de fechar, e ele
          espera aqui — em qualquer aparelho onde você entrar.
        </p>
      )}

      {!!marcadores.length && (
        <ul className="marcadores-lista">
          {marcadores.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => aoIr?.(m)}>
                {/* O TRECHO PRIMEIRO, e o capítulo embaixo: é o texto que
                    identifica o lugar, e o número que o situa. */}
                <span className="marcadores-trecho">
                  {m.trecho ? `${m.trecho}…` : "Um lugar sem texto guardado"}
                </span>
                <span className="marcadores-onde">
                  Capítulo {m.capitulo + 1}
                  {tituloDoCapitulo(itens, m.capitulo) ? ` — ${tituloDoCapitulo(itens, m.capitulo)}` : ""}
                </span>
              </button>
              <button
                type="button"
                className="marcadores-tirar"
                onClick={() => aoDesdobrar?.(m.id)}
                aria-label={`Tirar o marcador do capítulo ${m.capitulo + 1}`}
                title="Tirar este marcador"
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

/* NOTA · CARTÃO — nó 941:23113.
 *
 * O popup onde se escreve a nota. Ele abre logo depois de marcar um trecho pelo
 * "Adicionar nota" da barra de seleção: nota é destaque COM comentário, e sem
 * um lugar para escrever o comentário o botão só mudava a cor do texto.
 *
 * A versão anterior abria o caderno inteiro — a coluna com todas as notas do
 * livro — para escrever uma linha sobre a que acabou de ser feita. Era abrir um
 * arquivo para anotar um papel.
 *
 * O cabeçalho traz a HORA, como o desenho. Ele escreve "12:46 pm"; aqui é
 * "12:46", porque em português não se usa am/pm — e a hora sozinha basta:
 * a nota acabou de nascer, e o dia é hoje.
 */
function CartaoDeNota({ nota, aoSalvar, aoFechar }) {
  const [texto, setTexto] = useState(nota?.comentario ?? "");
  const campo = useRef(null);
  const dialogo = useRef(null);

  /* O foco vai para o campo ao abrir. Quem clicou em "Adicionar nota" quer
   * escrever — pedir um segundo clique para começar é o produto cobrando um
   * gesto que ele já sabe qual é. */
  useEffect(() => {
    if (!nota) return undefined;
    if (!dialogo.current?.open) dialogo.current?.showModal();
    const quadro = requestAnimationFrame(() => campo.current?.focus());
    return () => cancelAnimationFrame(quadro);
  }, [nota?.id]);

  if (!nota) return null;

  const hora = nota.criada_em
    ? new Date(nota.criada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <dialog
      ref={dialogo}
      className="cartao-nota-fundo"
      aria-labelledby="cartao-nota-titulo"
      onCancel={(e) => { e.preventDefault(); aoFechar?.(); }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) aoFechar?.(); }}
    >
      <form
        className="cartao-nota"
        onSubmit={(e) => { e.preventDefault(); aoSalvar?.(texto); }}
      >
        <header>
          <h2 id="cartao-nota-titulo">Nota</h2>
          {hora && <span className="cartao-nota-hora">{hora}</span>}
          <button type="button" className="cartao-nota-x" aria-label="Fechar" onClick={aoFechar}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {/* O trecho marcado, com o filete na cor da nota. É o que a nota é
            sobre, e sem ele o campo de escrita não tem assunto. */}
        <blockquote data-cor={nota.cor}>
          {`\u201c${nota.trecho}\u201d`}
        </blockquote>

        <div className="cartao-nota-campo">
          <label htmlFor="comentario-da-nota">Sua nota</label>
          <textarea
            id="comentario-da-nota"
            ref={campo}
            autoFocus
            value={texto}
            placeholder="Escreva o que você quer lembrar…"
            aria-describedby="atalho-da-nota"
            onChange={(e) => setTexto(e.target.value)}
            /* `Esc` fecha sem salvar, e `Ctrl/Cmd+Enter` salva. São os dois atalhos
               que um campo de texto dentro de um diálogo deve ter. */
            onKeyDown={(e) => {
              if (e.key === "Escape") aoFechar?.();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) aoSalvar?.(texto);
            }}
          />
          <p id="atalho-da-nota">Ctrl/⌘ + Enter para salvar</p>
        </div>

        <footer>
          <Botao tom="primaria" tipo="submit">Salvar nota</Botao>
        </footer>
      </form>
    </dialog>
  );
}

/* NOTAS E DESTAQUES — nó 941:23111.
 *
 * Lista TODAS as notas do livro, e não só as do capítulo aberto: é o lugar de
 * rever o que se marcou no livro inteiro, e limitar ao capítulo transformaria
 * isso num resumo da página. As de outro capítulo levam até lá.
 *
 * Cada item tem o filete à esquerda, o comentário em cima, "Capítulo N — título"
 * e a data de um lado ao outro, e o trecho citado embaixo. O TÍTULO DO CAPÍTULO
 * vem do sumário do próprio livro; quando o livro não dá um, sobra o número.
 *
 * O FILETE TEM A COR DA NOTA. No desenho ele é cinza em todos, e aí o painel não
 * consegue dizer uma nota verde de uma rosa — a cor é o único dado que as
 * separa, e no Mekora cor é objetivo. Continua sendo forma, não decoração.
 *
 * O QUE O DESENHO NÃO TEM e ficou: trocar a cor, apagar e escrever o comentário.
 * Tirá-los para casar com um desenho estático seria trocar função por semelhança.
 */
function quando(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  /* Hoje e ontem por NOME, e o resto por data. "há 3 dias" obriga a contar de
   * cabeça para saber quando foi. */
  const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const passados = Math.round((dia(new Date()) - dia(d)) / 86400000);
  if (passados === 0) return "Hoje";
  if (passados === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function Caderno({ livro, notas, capitulo, aoComentar, aoTrocarCor, aoApagar, aoIr, aoFechar, aoProcurarNoLivro, procurando, semParadeiro }) {
  const { itens } = usarSumario(livro);
  const [procura, setProcura] = useState("");

  const achadas = useMemo(() => {
    const t = procura.trim().toLowerCase();
    if (!t) return notas;
    return notas.filter(
      (n) => n.trecho?.toLowerCase().includes(t) || n.comentario?.toLowerCase().includes(t),
    );
  }, [notas, procura]);

  return (
    <aside className="caderno" aria-label="Notas e destaques">
      <header>
        <h2>Notas e destaques</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar as notas">Fechar</button>
      </header>

      {/* O campo do desenho diz "Buscar em Mekora" — é o componente da busca
          global reaproveitado. Aqui ele procura NAS NOTAS DESTE LIVRO, e o
          rótulo diz isso: um campo que promete o Mekora inteiro e devolve só as
          notas de um livro é a tela afirmando o que não faz. */}
      {notas.length > 0 && (
        <input
          type="search"
          className="caderno-procura"
          placeholder="Buscar nas notas deste livro"
          aria-label="Buscar nas notas deste livro"
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
        />
      )}

      {!notas.length && (
        <p className="caderno-vazio">
          Selecione um trecho do texto para marcar. A cor é sua; o comentário é
          opcional.
        </p>
      )}
      {!!notas.length && !achadas.length && (
        <p className="caderno-vazio">Nenhuma nota com esse texto.</p>
      )}

      <ul>
        {achadas.map((n) => {
          const nome = tituloDoCapitulo(itens, n.capitulo);
          return (
            <li
              key={n.id}
              className={n.capitulo === capitulo ? "aqui" : ""}
              data-cor={n.cor}
            >
              {n.comentario && <p className="titulo-24 nota-titulo">{n.comentario}</p>}

              <p className="nota-onde">
                <span>
                  Capítulo {n.capitulo + 1}
                  {nome ? ` — ${nome}` : ""}
                  {n.fonte === "kindle" ? " · trazida do Kindle" : ""}
                </span>
                <span className="nota-quando">{quando(n.criada_em)}</span>
              </p>

              {/* O trecho marcado. É por ele que se reconhece a nota — a data e o
                  número do capítulo não dizem nada sobre o que foi marcado.

                  E ELE É O QUE SOBRA quando a âncora se perde: a `DEC-0016`
                  manda mostrar a citação guardada em vez de apontar para o lugar
                  errado. */}
              <blockquote>{n.trecho}</blockquote>

              {/* O DEGRAU, quando não foi o primeiro.
                  A norma pede que a tela DIGA como reencontrou — silêncio aqui
                  faz uma nota reancorada por semelhança parecer tão certa quanto
                  uma que nunca se moveu. */}
              {n.degrau && n.degrau !== "exata" && (
                <p className={`nota-degrau${n.degrau === "perdida" ? " perdida" : ""}`} role="status">
                  {EXPLICACAO[n.degrau]}
                  {n.degrau === "perdida" && (
                    /* O DEGRAU 5 É UM CONVITE, e depois um fato. Antes de
                       procurar, "não está neste capítulo" é tudo que se sabe;
                       depois de varrer o livro e não achar, a frase muda — e
                       oferecer de novo o mesmo botão faria a pessoa repetir uma
                       varredura cuja resposta já se tem. */
                    semParadeiro?.has(n.id) ? (
                      <> Procurado no livro inteiro: o trecho não está mais lá.</>
                    ) : (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="nota-procurar"
                          disabled={procurando === n.id}
                          title={procurando === n.id ? "Procurando no livro inteiro…" : null}
                          onClick={() => aoProcurarNoLivro?.(n)}
                        >
                          {procurando === n.id ? "Procurando no livro…" : "Procurar no livro inteiro"}
                        </button>
                      </>
                    )
                  )}
                </p>
              )}

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
          );
        })}
      </ul>
    </aside>
  );
}


export function Leitura({ livro, aviso, voltarPara = "/estante", capitulos: janela, aoPedirMais, aoPedirAntes, temMais = false, temAntes = false, progresso, aoMarcar, notas = [], aoAnotar, aoComentar, aoTrocarCor, aoApagarNota, erroDeNota, aoIrParaCapitulo, marcadores = [], aoDobrar, aoDesdobrar, erroDeMarcador }) {
  /* O CROMO PASSA A CONTAR QUEM O USA.
   *
   * O Erik decidiu em 04/09 manter o marcador de páginas e deixar o uso real
   * decidir: "lança com os cinco, instrumenta os cinco, e o que ninguém tocar
   * em três semanas sai depois". Medido no mesmo dia: o `medir()` do
   * `medir.js` não era chamado em lugar NENHUM do produto — o PostHog captura
   * `$pageview` e mais nada. A decisão dependia de um dado que não existia.
   *
   * Um evento, um campo. Nome do painel e nada mais: quantas vezes cada um dos
   * cinco é aberto responde a pergunta inteira, e qualquer campo a mais aqui é
   * dado pessoal saindo de uma tela de leitura sem precisar. */
  const contarCromo = useCallback((qual) => medir("leitura:cromo", { painel: qual }), []);

  const [cromoVisivel, setCromo] = useState(true);

  /* O CROMO RECOLHE SOZINHO ENQUANTO SE LÊ.
   *
   * Nenhum dos botões é de alta frequência — índice, aparência e busca são de
   * vez em quando, e nota se cria selecionando texto, não clicando em botão.
   * Uma barra permanente disputa a tela o tempo todo para servir ao que
   * acontece raramente.
   *
   * Descer recolhe, subir devolve: quem rola para baixo está lendo, quem rola
   * para cima está procurando alguma coisa — e o que se procura numa página de
   * leitura costuma estar no topo. É a leitura do GESTO, e não um tempo fixo
   * que apaga a barra no meio de quem estava mirando nela.
   *
   * O ESTADO SÓ MUDA QUANDO MUDA. Rolagem dispara dezenas de vezes por segundo;
   * chamar `setCromo` a cada evento renderiza a tela inteira à toa. O `ref`
   * guarda o último valor e o `setState` só é chamado na virada.
   *
   * `passive: true` porque este ouvinte não impede nada, e sem isso o navegador
   * espera por ele antes de rolar. */
  const ultimoY = useRef(0);
  const cromoRef = useRef(true);
  useEffect(() => {
    const LIMIAR = 8;   /* menos que isso é tremor de dedo, não gesto */
    const TOPO = 64;    /* perto do topo o cromo fica, sempre */
    /* A ROLAGEM DA ABERTURA NÃO É DA PESSOA.
     *
     * A leitura devolve quem volta ao ponto onde parou, e esse salto chega aqui
     * como descida. Medido: o cromo nascia com 0,15 de opacidade — a pessoa
     * abria o livro e a barra já estava apagada sem ela ter tocado em nada.
     *
     * Pular só o PRIMEIRO evento não resolveu, e a segunda medida disse por
     * quê: a restauração não é um salto, é uma sequência. O que separa ela de
     * um gesto é o TEMPO desde a abertura, não a contagem de eventos. */
    const nascido = performance.now();
    const BERCO = 1200;
    const aoRolar = () => {
      const y = window.scrollY;
      if (performance.now() - nascido < BERCO) { ultimoY.current = y; return; }
      const desceu = y - ultimoY.current > LIMIAR;
      const subiu = ultimoY.current - y > LIMIAR;
      if (!desceu && !subiu) return;
      ultimoY.current = y;
      const querVisivel = subiu || y < TOPO;
      if (querVisivel !== cromoRef.current) {
        cromoRef.current = querVisivel;
        setCromo(querVisivel);
      }
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);
  const [paleta, setPaleta] = useState(null);

  /* MARCAR O TRECHO. Sai do JSX porque as duas ações do 941:23120 fazem a mesma
   * coisa com um passo a mais: "Adicionar nota" marca e abre o caderno, para a
   * pessoa poder escrever ao lado do que acabou de marcar. */
  const marcar = async (cor, { escrever = false } = {}) => {
    if (!paleta) return;
    if (paleta.existenteId) {
      if (cor && cor !== paleta.cor) await aoTrocarCor?.(paleta.existenteId, cor);
      if (escrever) {
        const existente = notas.find((n) => n.id === paleta.existenteId);
        if (existente) setCartao(existente);
      }
      setPaleta(null);
      return;
    }
    const nova = await aoAnotar?.({
      de: paleta.de, ate: paleta.ate, cor, trecho: paleta.trecho,
      antes: paleta.antes, depois: paleta.depois,
      /* O capítulo vem da seleção — ver o porquê em `leitor/selecao.js`. */
      capitulo: paleta.capitulo,
    });
    setPaleta(null);
    /* Limpa a seleção: deixá-la azul por cima do destaque recém-feito esconde
       exatamente o que a pessoa acabou de marcar. */
    window.getSelection?.()?.removeAllRanges();
    /* "Adicionar nota" abre O CARTÃO, e não o caderno inteiro.
       Abrir a coluna com todas as notas do livro para escrever uma linha sobre
       a que acabou de nascer era abrir um arquivo para anotar um papel. */
    if (escrever && nova) setCartao(nova);
  };
  /* UMA GAVETA, UM ESTADO. Cinco booleanos independentes permitiam combinações
   * impossíveis (aparência e notas abertas ao mesmo tempo) e faziam dois cliques
   * rápidos alternarem estados diferentes. O valor guarda qual painel está
   * aberto; `null` é a leitura sem painel. */
  const [painelAberto, setPainelAberto] = useState(null);
  const caderno = painelAberto === "caderno";
  const painel = painelAberto === "painel";
  const indice = painelAberto === "indice";
  const procurando = painelAberto === "procurando";
  const dobras = painelAberto === "dobras";
  const fecharPainel = useCallback((qual) => {
    setPainelAberto((atual) => atual === qual ? null : atual);
  }, []);
  const prosa = useRef(null);
  const restaurado = useRef(null);

  const abrirDestaque = useCallback((recorte, elemento) => {
    const nota = notas.find((n) => n.id === recorte.id);
    if (!nota || !elemento) return;
    const caixa = elemento.getBoundingClientRect();
    setPaleta({
      ...nota,
      existenteId: nota.id,
      onde: { x: caixa.left + caixa.width / 2, y: caixa.top, yBaixo: caixa.bottom },
    });
    window.getSelection?.()?.removeAllRanges();
  }, [notas]);

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

  /* A JANELA JÁ CONTADA, e as notas dela JÁ REANCORADAS.
   *
   * A `DEC-0016` diz que o deslocamento guardado é dica de busca, e não
   * endereço: a nota resolve pela citação mais o texto em volta, em cinco
   * degraus. Isso acontece aqui, uma vez por capítulo carregado, e não a cada
   * bloco — a escada varre o texto do capítulo inteiro, e chamá-la por parágrafo
   * multiplicaria a varredura pelo número de parágrafos.
   *
   * A contagem dos blocos vem junto porque ela já era feita duas vezes: uma para
   * a restauração da marca e outra dentro do `map` do desenho. */
  const janelaResolvida = useMemo(
    () =>
      capitulos.map(({ indice, blocos: b }) => {
        const comDe = comDeslocamentos(b);
        return {
          indice,
          blocos: comDe,
          notas: notas
            .filter((n) => n.capitulo === indice)
            .map((n) => ({ ...n, ...reancorar(n, comDe) })),
        };
      }),
    [capitulos, notas],
  );

  /* AS NOTAS COM DEGRAU, para o caderno. A nota de um capítulo que não está
   * carregado continua como veio: dizer "perdida" sobre um texto que ninguém
   * abriu seria afirmar o que não se procurou. */
  const notasComDegrau = useMemo(() => {
    const porId = new Map();
    for (const c of janelaResolvida) for (const n of c.notas) porId.set(n.id, n);
    return notas.map((n) => porId.get(n.id) ?? n);
  }, [notas, janelaResolvida]);

  /* Só as notas deste capítulo. As outras continuam carregadas — virar o
   * capítulo com elas em mãos é imediato, contra um pedido a cada virada que
   * faria o destaque aparecer um instante depois do texto. */
  /* A PALETA APARECE AO SOLTAR O DEDO, e não a cada movimento da seleção.
   * Durante o arrasto a seleção muda continuamente, e uma paleta que segue o
   * cursor atrapalha justamente o gesto de escolher o trecho. */
  const capturarSelecao = useCallback(() => {
    if (!aoAnotar) return;
    requestAnimationFrame(() => {
      const sel = lerSelecao(prosa.current);
      if (sel) setPaleta(sel);
    });
  }, [aoAnotar]);

  useEffect(() => {
    if (!aoAnotar) return;
    document.addEventListener("keyup", capturarSelecao);
    /* Rolar fecha a paleta: ela é posicionada em coordenadas de tela, e sem
     * isto ficaria pairando longe do texto que marcou. */
    const fechar = () => setPaleta(null);
    window.addEventListener("scroll", fechar, { passive: true });
    return () => {
      document.removeEventListener("keyup", capturarSelecao);
      window.removeEventListener("scroll", fechar);
    };
  }, [aoAnotar, capturarSelecao]);

  useEffect(() => {
    if (!paleta) return undefined;
    const fecharComTeclado = (e) => {
      if (e.key === "Escape") {
        setPaleta(null);
        window.getSelection?.()?.removeAllRanges();
      }
    };
    const fecharFora = (e) => {
      if (e.target.closest?.(".paleta, mark[data-destaque]")) return;
      setPaleta(null);
      window.getSelection?.()?.removeAllRanges();
    };
    document.addEventListener("keydown", fecharComTeclado);
    document.addEventListener("pointerdown", fecharFora, true);
    return () => {
      document.removeEventListener("keydown", fecharComTeclado);
      document.removeEventListener("pointerdown", fecharFora, true);
    };
  }, [paleta]);

  /* RESTAURAR uma vez por capítulo, e não a cada render. Sem a trava, qualquer
   * re-render depois de a pessoa ter rolado a puxaria de volta para a marca —
   * a tela brigando com quem lê. */
  useEffect(() => {
    const chave = `${livro?.capitulo ?? 0}`;
    /* Durante a abertura, o App mostra o texto de exemplo enquanto o EPUB é
     * carregado. Ele ocupa o mesmo componente, mas não traz `progresso`. Marcar
     * o capítulo como restaurado nessa passagem fazia o livro real herdar a
     * trava e ignorar a posição salva. */
    if (!progresso || restaurado.current === chave || !blocos.length) return;
    if (Number(progresso?.capitulo) === Number(livro?.capitulo ?? 0) && progresso?.deslocamento) {
      /* A leitura abre dentro de uma gaveta Vaul. Durante a animação de entrada,
       * a biblioteca termina de posicionar e focar a folha; uma rolagem feita
       * no primeiro efeito era aceita pelo navegador e logo devolvida ao topo.
       * Fazemos a restauração já no primeiro quadro útil e a confirmamos quando
       * a entrada termina. A segunda chamada é idempotente e acontece só ao
       * abrir o capítulo, portanto não disputa a rolagem normal da leitura. */
      const restaurar = () => {
        const secao = prosa.current?.querySelector(
          `[data-capitulo="${Number(progresso.capitulo) || 0}"]`,
        );
        return irPara(secao ?? prosa.current, progresso.deslocamento);
      };
      let quadro2 = null;
      const quadro1 = requestAnimationFrame(() => {
        quadro2 = requestAnimationFrame(restaurar);
      });
      const confirmar = window.setTimeout(() => {
        restaurar();
        restaurado.current = chave;
      }, 420);
      return () => {
        cancelAnimationFrame(quadro1);
        if (quadro2 !== null) cancelAnimationFrame(quadro2);
        clearTimeout(confirmar);
      };
    }
    restaurado.current = chave;
    return undefined;
  }, [blocos.length, livro?.capitulo, progresso?.capitulo, progresso?.deslocamento]);

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
  /* A APARÊNCIA DA LEITURA. Ela é lida uma vez e aplicada como variáveis de CSS
   * na raiz — nenhum bloco precisa saber que a preferência existe. */
  const [aparencia, setAparencia] = useState(() => lerAparencia());

  const [copiado, setCopiado] = useState(null);
  /* A nota que o cartão do 941:23113 está mostrando. `null` é "não há cartão". */
  const [cartao, setCartao] = useState(null);
  /* ONDE O MARCADOR CLICADO QUER LEVAR, quando o capítulo dele ainda não está
   * na tela. O salto é do pai — ele é quem replanta a janela —, e só depois de
   * os blocos chegarem é que dá para rolar até o deslocamento. `null` é "não há
   * viagem pendente". */
  const [destino, setDestino] = useState(null);

  /* O DEGRAU 5, sob demanda: procurar a citação no livro inteiro.
   *
   * Ele não roda sozinho, e a razão é de custo: abrir oitenta capítulos para
   * desenhar UMA nota travaria a leitura de todo livro por causa de uma
   * marcação em cem. A pessoa pede, e a tela diz que está procurando.
   *
   * Achou: leva até lá pelo mesmo caminho do marcador — o pai replanta a janela,
   * e a viagem fica pendente até os blocos chegarem. Ao chegar, a escada resolve
   * a nota naquele capítulo sozinha, e o caderno passa a dizer "reencontrado no
   * livro" sem que ninguém precise guardar isso à mão.
   *
   * Não achou: a nota continua perdida, e o `null` é dito na tela. */
  const [procurandoNota, setProcurandoNota] = useState(null);
  const [semParadeiro, setSemParadeiro] = useState(() => new Set());

  const procurarACitacao = async (nota) => {
    if (!livro?.capitulos) return;
    setProcurandoNota(nota.id);
    try {
      const achada = await procurarNoLivro(nota, livro.capitulos, (i) => blocosDoCapitulo(livro, i));
      if (!achada) {
        setSemParadeiro((antes) => new Set(antes).add(nota.id));
        return;
      }
      setDestino({ capitulo: achada.capitulo, deslocamento: achada.de });
      aoIrParaCapitulo?.(achada.capitulo);
      fecharPainel("caderno");
    } finally {
      setProcurandoNota(null);
    }
  };

  /* UM PAINEL DE CADA VEZ.
   *
   * Índice, caderno e aparência passaram a abrir todos do lado ESQUERDO — do
   * lado dos botões deles, que era o que o Erik apontou. Como eram três estados
   * independentes, dois abertos juntos ficariam empilhados no mesmo lugar, e o
   * de cima cobriria o de baixo sem dizer nada.
   *
   * Abrir um fecha os outros. É o que a pessoa espera de qualquer gaveta lateral
   * — e resolve o empilhamento pela regra, e não por `z-index`. */
  const abrirSo = (qual) => {
    /* A contagem entra AQUI, e não em cada botão: `abrirSo` é o caminho por
       onde os cinco passam. Contar em cinco lugares é como o quinto fica de
       fora sem ninguém notar. */
    contarCromo(qual);
    /* Um clique num controle é intenção de usar a interface. O cromo pode ter
       sido atenuado pela rolagem; devolvê-lo à tinta cheia confirma o gesto e
       impede que o painel pareça ter aberto a partir de um botão "apagado". */
    cromoRef.current = true;
    setCromo(true);
    if (qual === "indice") setAqui(indice ? null : ondeEstouNoLivro(prosa.current));
    setPainelAberto((atual) => atual === qual ? null : qual);
  };

  /* Clique fora e Escape fecham QUALQUER painel lateral pela mesma regra. Antes
   * só a paleta de seleção fazia isso; aparência, índice, busca, marcadores e
   * notas exigiam acertar novamente o ícone que os abriu. */
  useEffect(() => {
    if (!painelAberto) return undefined;
    const fecharFora = (e) => {
      if (e.target.closest?.(".cromo-caixa, .aparencia, .caderno, .indice")) return;
      setPainelAberto(null);
    };
    const fecharComTeclado = (e) => {
      if (e.key === "Escape") setPainelAberto(null);
    };
    document.addEventListener("pointerdown", fecharFora, true);
    document.addEventListener("keydown", fecharComTeclado);
    return () => {
      document.removeEventListener("pointerdown", fecharFora, true);
      document.removeEventListener("keydown", fecharComTeclado);
    };
  }, [painelAberto]);

  /* ONDE A PESSOA ESTÁ, para a gaveta de marcadores saber se este lugar já está
   * dobrado. Lido ao ABRIR, e não a cada rolagem: um estado que muda dezenas de
   * vezes por segundo re-renderizaria a leitura inteira para responder uma
   * pergunta que só interessa com a gaveta aberta. */
  const [aqui, setAqui] = useState(null);

  /* Enquanto uma gaveta que depende da posição está aberta, acompanha a
   * leitura. Fora dela, não há motivo para re-renderizar o livro durante cada
   * rolagem. */
  useEffect(() => {
    if (!indice && !dobras) return undefined;
    let quadro = null;
    const atualizar = () => {
      if (quadro !== null) return;
      quadro = requestAnimationFrame(() => {
        quadro = null;
        const proxima = ondeEstouNoLivro(prosa.current);
        setAqui((anterior) =>
          anterior?.capitulo === proxima.capitulo &&
          anterior?.deslocamento === proxima.deslocamento &&
          anterior?.ancora === proxima.ancora ? anterior : proxima,
        );
      });
    };
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    return () => {
      if (quadro !== null) cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", atualizar);
    };
  }, [indice, dobras]);

  const abrirDobras = () => {
    /* Sem `contarCromo` aqui: o `abrirSo("dobras")` abaixo já conta, e contar
       duas vezes dobraria justamente o número do item que o Erik vai usar para
       decidir se o marcador fica. */
    setAqui(dobras ? null : ondeEstouNoLivro(prosa.current));
    abrirSo("dobras");
  };

  /* DOBRAR AQUI. O lugar sai do MESMO cálculo do progresso — o último bloco que
   * começa acima da linha de leitura —, e o trecho sai do DOM naquele ponto. Os
   * dois juntos, e da mesma fonte: um marcador que mostra um texto e leva a
   * outro é pior que nenhum. */
  const dobrarAqui = async () => {
    const onde = ondeEstouNoLivro(prosa.current);
    const secao = prosa.current?.querySelector(`[data-capitulo="${onde.capitulo}"]`) ?? prosa.current;
    await aoDobrar?.({ ...onde, trecho: trechoEm(secao, onde.deslocamento) });
    setAqui(onde);
  };

  /* IR ATÉ UM MARCADOR.
   *
   * Se o capítulo já está na janela, é rolagem — ele pode estar dois capítulos
   * acima, e trocar de capítulo ali jogaria fora o que já está carregado. Se não
   * está, o pai replanta a janela e a viagem fica pendente até os blocos
   * chegarem. */
  const irAoMarcador = (m) => {
    const secao = prosa.current?.querySelector(`[data-capitulo="${m.capitulo}"]`);
    if (secao) {
      /* O começo do capítulo é o caso do marcador com deslocamento zero — e
         rolar até ele é rolar até o primeiro BLOCO, porque a seção não tem
         caixa (`display: contents`). */
      irPara(secao, m.deslocamento) || irParaOComeco(secao);
      fecharPainel("dobras");
      return;
    }
    setDestino({ capitulo: m.capitulo, deslocamento: m.deslocamento });
    aoIrParaCapitulo?.(m.capitulo);
    fecharPainel("dobras");
  };

  const irAoItemDoIndice = (item) => {
    const secao = prosa.current?.querySelector(`[data-capitulo="${item.capitulo}"]`);
    if (secao) {
      const alvo = alvoDaAncora(secao, item.ancora);
      if (alvo) alvo.scrollIntoView({ behavior: "instant", block: "start" });
      else irParaOComeco(secao);
      fecharPainel("indice");
      return;
    }
    setDestino({ capitulo: item.capitulo, deslocamento: 0, ancora: item.ancora ?? null });
    aoIrParaCapitulo?.(item.capitulo);
    fecharPainel("indice");
  };

  /* A VIAGEM PENDENTE, quando os blocos chegam.
   *
   * A condição olha `capitulos[0].indice`, e não `livro.capitulo`: quem replanta
   * a janela é o pai, e o objeto do livro continua dizendo o capítulo em que ele
   * foi ABERTO. Usar o do livro faria a viagem nunca acontecer — ou acontecer no
   * capítulo errado.
   *
   * E este efeito é declarado DEPOIS do que restaura o progresso, de propósito:
   * os dois rolam a página no mesmo commit, e quem roda por último é quem
   * decide. Se a pessoa pediu um marcador, é ao marcador que ela vai. */
  useEffect(() => {
    if (!destino || !blocos.length) return;
    if (capitulos[0]?.indice !== destino.capitulo) return;
    const secao = prosa.current?.querySelector(`[data-capitulo="${destino.capitulo}"]`) ?? prosa.current;
    const alvo = alvoDaAncora(secao, destino.ancora);
    if (alvo) alvo.scrollIntoView({ behavior: "instant", block: "start" });
    else irPara(secao, destino.deslocamento) || irParaOComeco(secao);
    setDestino(null);
  }, [destino, blocos, capitulos]);
  useEffect(() => { aplicarAparencia(aparencia); gravarAparencia(aparencia); }, [aparencia]);

  const mudarAjuste = (id, valor) => {
    setAparencia((antes) => limitarAparencia({ ...antes, [id]: valor }));
  };
  const limitesColuna = limitesDaColuna(aparencia.corpo);

  /* O TEMA FICA NO PAINEL TAMBÉM, como o desenho põe — e continua sendo o mesmo
   * tema das Preferências da conta, lido e escrito pelo mesmo módulo. Dois
   * lugares para a mesma escolha é conveniência; duas escolhas diferentes com o
   * mesmo nome seria defeito. */
  const [tema, setTema] = useState(() => temaEspelhado() ?? "sistema");
  const trocarTema = (t) => { setTema(t); aplicarTema(t); };

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
      <Flutuante><div className={`cromo${cromoVisivel ? "" : " recolhido"}`}>
        <nav className="cromo-caixa" aria-label="Leitura">
          {/* SAIR DA LEITURA É PARTE DA LEITURA. Usar o histórico do navegador
              deixava esta tela sem saída quando ela era aberta em nova aba,
              por favorito ou após um F5. O destino explícito é a ficha deste
              livro: preserva o contexto e dali a Estante continua a um passo. */}
          <Link className="cromo-link cromo-voltar" to={voltarPara} aria-label="Voltar ao livro">
            <span aria-hidden="true">←</span>
          </Link>
          {/* O BOTÃO "MENU" SAIU EM 04/09, e ele não era menu: era
              `setCromo(v => !v)`, o gatilho que recolhia o próprio cromo. Ficava
              ao lado do Índice com o MESMO glifo — os arquivos
              `icone-menu.svg` e `icone-indice.svg` são idênticos byte a byte,
              porque o desenho usa o nó `910:1671` para os dois.

              Recolher virou automático (ver `useEffect` acima): quem lê rola
              para baixo, e o cromo sai da frente sozinho. Um botão para
              esconder a interface é interface a mais para esconder interface. */}
          {/* O ÍNDICE. Ele não existia — nem botão, nem painel —, e é a única
              forma de ir a um capítulo pelo nome dele numa leitura que rola sem
              costura. Só aparece quando o livro sabe dar um sumário. */}
          {aoIrParaCapitulo && (
            <button
              type="button"
              aria-label="Índice do livro"
              aria-pressed={indice ? "true" : "false"}
              onClick={() => abrirSo("indice")}
            >
              <Icone src={iconeIndice} />
            </button>
          )}
          <button
            type="button"
            aria-label={`Notas (${notas.length})`}
            aria-pressed={caderno ? "true" : "false"}
            onClick={() => abrirSo("caderno")}
          >
            <Icone src={iconeCaderno} />
          </button>
          {/* OS MARCADORES EXISTEM AGORA (A-26). O botão estava no cromo desde o
              começo e ficava `disabled`, porque o painel não estava desenhado em
              lugar nenhum. Ele veste a gaveta do índice e da busca: os três são
              formas de ir a um lugar do livro. */}
          <button
            type="button"
            aria-label={`Marcadores (${marcadores.length})`}
            aria-pressed={dobras ? "true" : "false"}
            disabled={!aoDobrar}
            title={aoDobrar ? undefined : "Sem livro aberto, não há lugar para marcar."}
            onClick={abrirDobras}
          >
            <Icone src={iconeMarcador} />
          </button>
        </nav>
        <nav className="cromo-caixa" aria-label="Ferramentas">
          {/* APARÊNCIA. O nó 973:32215 põe este painel na leitura, e é ele que
              torna editável o que o desenho fixa — corpo, fonte, entrelinha,
              coluna e destaques.

              ELA MUDOU DE LADO EM 04/09, e não por fidelidade: por assunto. O
              nó `919:18714` a põe à direita, junto da busca, e a razão fica
              clara quando se lê os dois grupos como frases — à esquerda "onde
              estou e o que marquei", à direita "como leio e o que procuro".
              Com essa divisão, a regra de o painel abrir do lado do próprio
              botão deixa de ser detalhe e passa a ter motivo. É o item 24 do
              Erik: "itens abrem do lado contrário ao do ícone". */}
          <button
            type="button"
            aria-label="Aparência da leitura"
            aria-pressed={painel ? "true" : "false"}
            onClick={() => abrirSo("painel")}
          >
            <span className="cromo-aa" aria-hidden="true">Aa</span>
          </button>
          {/* AINDA NÃO RESPONDEM, e agora se sabe por quê: os quatro painéis da
              leitura estão desenhados — aparência (941:23110), notas e
              destaques (941:23111), índice (941:23112) e a barra de seleção
              (941:23120) — e nenhum deles é a busca dentro do livro nem os
              marcadores. Os dois ícones existem no cromo e o painel de cada um
              não existe em lugar nenhum.

              Ficam `disabled` com o motivo no título, em vez de aceitar o
              clique e não fazer nada — botão que não responde ensina a não
              clicar. Sair do cromo seria apagar do produto duas intenções que o
              desenho registrou. */}
          {/* A BUSCA NO LIVRO EXISTE AGORA (A-26). Ela não tem painel desenhado,
              e por isso usa a forma dos outros painéis da leitura — gaveta à
              esquerda, campo em cima, resultados embaixo. Só aparece quando há
              livro de verdade: no texto de exemplo não há o que procurar. */}
          <button
            type="button"
            aria-label="Buscar no livro"
            aria-pressed={procurando ? "true" : "false"}
            disabled={!aoIrParaCapitulo}
            title={aoIrParaCapitulo ? undefined : "Sem livro aberto, não há o que procurar."}
            onClick={() => abrirSo("procurando")}
          >
            <Icone src={iconeBuscar} />
          </button>
          {/* A CONTA SAIU DAQUI EM 04/09, por decisão do Erik.
              Ler é um MODO, não uma tela. O nó `919:18714` traz dois itens à
              direita — aparência e busca —, e nenhum deles é conta. Um botão de
              conta no meio da leitura só serve para tirar a pessoa do livro, e
              ela existe no cabeçalho de todas as outras telas. */}
        </nav>
      </div></Flutuante>

      <header className="abertura">
        <h1>{livro.titulo}</h1>
        <p className="autoria">Escrito por {livro.autor}</p>
        {/enviesados/i.test(livro.titulo ?? "") && (
          <img src={ornamentoAbertura} alt="" className="ornamento" aria-hidden="true" />
        )}
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
        data-clarity-mask="true"
        ref={prosa}
        data-vaul-no-drag
        onPointerUp={capturarSelecao}
        data-capitulos={livro.capitulos ?? 1}
        data-carregados={capitulos.length}
        data-tem-mais={temMais ? "sim" : "nao"}
        data-ultimo={capitulos[capitulos.length - 1]?.indice ?? -1}
        data-progresso-capitulo={progresso?.capitulo ?? ""}
        data-progresso-deslocamento={progresso?.deslocamento ?? ""}
        data-livro-capitulo={livro?.capitulo ?? ""}
      >
        {/* A SENTINELA DE CIMA. Quem abre no capítulo 8 precisa poder subir, e
            sem ela os sete anteriores ficariam inalcançáveis — a rolagem
            contínua tirou os botões de virar e, com eles, a única forma de
            voltar que existia. */}
        {temAntes && <div ref={sentinelaAcima} className="sentinela" aria-hidden="true" />}
        {janelaResolvida.map(({ indice, blocos: b, notas: daqui_ }) => (
          <section key={indice} className="capitulo" data-capitulo={indice}>
            {b.map((bloco, i) => {
              const proximo = b[i + 1]?.de ?? Infinity;
              const temMarcador = marcadores.some(
                (m) => m.capitulo === indice && m.deslocamento >= bloco.de && m.deslocamento < proximo,
              );
              return <Bloco
                key={i}
                {...bloco}
                marcador={temMarcador}
                aoAbrirDestaque={abrirDestaque}
                /* A NOTA PERDIDA NÃO PINTA NADA. Ela não tem onde: o trecho não
                   existe mais neste texto, e pintar no deslocamento guardado é
                   exatamente o defeito que a escada existe para acabar —
                   destacar a palavra errada com toda a confiança. Ela continua
                   no caderno, com a citação guardada e o estado dito. */
                destaques={notasDoBloco(
                  daqui_.filter((n) => n.degrau !== "perdida"),
                  bloco.de,
                  (bloco.texto ?? "").length,
                )}
              />;
            })}
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
      {paleta && <Flutuante>{(
        /* PARA BAIXO QUANDO NÃO CABE PARA CIMA. O painel tem duas fileiras e
           fica em torno de 236px de altura; abaixo de 280 do topo da janela ele
           sairia pela borda. Aí ele abre sob o trecho, ancorado no fim da
           seleção. */
        <div
          className={`paleta${paleta.onde.y < 280 ? " paleta-abaixo" : ""}`}
          style={{
            left: paleta.onde.x,
            top: paleta.onde.y < 280 ? (paleta.onde.yBaixo ?? paleta.onde.y) : paleta.onde.y,
          }}
          role="group"
          aria-label="O que fazer com o trecho"
        >
          <div className="paleta-cores">
            {Object.keys(DESTAQUES).map((cor) => (
              <button
                key={cor}
                type="button"
                className={`paleta-cor${paleta.existenteId && paleta.cor === cor ? " escolhida" : ""}`}
                style={{ background: DESTAQUES[cor] }}
                aria-label={`${paleta.existenteId ? "Trocar destaque para" : "Marcar de"} ${cor}`}
                aria-pressed={paleta.existenteId ? paleta.cor === cor : undefined}
                onClick={() => marcar(cor)}
              />
            ))}
          </div>

          {/* AS TRÊS AÇÕES do nó 941:23120. Marcar de uma cor é só metade do
              que se faz com um trecho selecionado — o desenho tem também
              "Adicionar nota", "Copiar" e "Cancelar", e nenhuma existia. */}
          <div className={`paleta-acoes${paleta.existenteId ? " existente" : ""}`}>
              {/* "Adicionar nota" MARCA E ABRE O CADERNO no mesmo gesto: nota é
                  destaque com comentário, e sem o caderno aberto não há onde
                  escrever o comentário. A cor é a primeira da paleta — a pessoa
                  troca depois, e obrigá-la a escolher a cor antes de escrever
                  poria uma decisão de forma na frente de uma de conteúdo. */}
              <button type="button" className="paleta-botao" onClick={() => marcar(paleta.cor ?? "amarelo", { escrever: true })}>
                <Icone src={iconeNotaNova} />
                {paleta.existenteId ? "Editar nota" : "Adicionar nota"}
              </button>
              <button
                type="button"
                className="paleta-botao"
                onClick={async () => {
                  /* `clipboard.write` pode ser recusado — permissão negada,
                     documento sem foco, navegador antigo. O produto diz quando
                     não conseguiu, em vez de fingir que copiou. */
                  try {
                    await navigator.clipboard.writeText(paleta.trecho);
                    setCopiado("Trecho copiado.");
                  } catch {
                    setCopiado("O navegador não deixou copiar. Use Ctrl+C.");
                  }
                  setTimeout(() => setCopiado(null), 2500);
                }}
              >
                <Icone src={iconeCopiar} />
                Copiar
              </button>
            {paleta.existenteId && (
              <button
                type="button"
                className="paleta-botao paleta-remover"
                onClick={async () => {
                  await aoApagarNota?.(paleta.existenteId);
                  setPaleta(null);
                }}
              >
                Remover destaque
              </button>
            )}
            {!paleta.existenteId && (
            <button
              type="button"
              className="paleta-botao paleta-cancelar"
              onClick={() => { setPaleta(null); window.getSelection?.()?.removeAllRanges(); }}
            >
              Cancelar
            </button>
            )}
          </div>

          {copiado && <p className="paleta-recado" role="status">{copiado}</p>}
        </div>
      )}</Flutuante>}

      {cartao && (
        <CartaoDeNota
          nota={cartao}
          aoFechar={() => setCartao(null)}
          aoSalvar={async (texto) => {
            if (texto !== cartao.comentario) await aoComentar?.(cartao.id, texto);
            setCartao(null);
          }}
        />
      )}

      {procurando && <Flutuante>{(
        <BuscaNoLivro
          livro={livro}
          aoIr={aoIrParaCapitulo}
          aoFechar={() => fecharPainel("procurando")}
        />
      )}</Flutuante>}

      {dobras && <Flutuante>{(
        <Marcadores
          livro={livro}
          marcadores={marcadores}
          aqui={aqui}
          erro={erroDeMarcador}
          aoDobrar={dobrarAqui}
          aoDesdobrar={aoDesdobrar}
          aoIr={irAoMarcador}
          aoFechar={() => fecharPainel("dobras")}
        />
      )}</Flutuante>}

      {indice && <Flutuante>{(
        <Indice
          livro={livro}
          aqui={aqui}
          raiz={prosa}
          aoIr={irAoItemDoIndice}
          aoFechar={() => fecharPainel("indice")}
        />
      )}</Flutuante>}

      {painel && <Flutuante>{(
        <aside className="aparencia" aria-label="Aparência da leitura">
          <header>
            <h2>Aparência</h2>
            <button type="button" aria-label="Fechar" onClick={() => fecharPainel("painel")}>×</button>
          </header>
          <section>
            <h3>Tema</h3>
            <div className="aparencia-opcoes" role="group" aria-label="Tema">
              {[
                ["claro", "Claro"],
                ["sepia", "Sépia"],
                ["escuro", "Escuro"],
                /* "Sistema" não está no desenho e fica: sem ele, quem tem o
                   telefone em automático perde isso ao tocar uma vez aqui, e não
                   tem como voltar.

                   UMA PALAVRA, e não duas. Era "Do sistema", e as outras três
                   têm uma palavra só — a quarta quebrava em duas linhas e
                   desalinhava a fileira inteira. O "Do" não carregava sentido
                   nenhum que "Sistema" não carregue. */
                ["sistema", "Sistema"],
              ].map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tema === id ? "true" : "false"}
                  onClick={() => trocarTema(id)}
                >
                  <span className={`amostra amostra-tema amostra-${id}`} aria-hidden="true" />
                  <span className="amostra-rotulo">{rotulo}</span>
                </button>
              ))}
            </div>
          </section>

          {AJUSTES.map((ajuste) => (
            <ControleDeFaixa
              key={ajuste.id}
              ajuste={ajuste}
              valor={aparencia[ajuste.id]}
              aoMudar={(valor) => mudarAjuste(ajuste.id, valor)}
            />
          ))}

          <ControleDeFaixa
            ajuste={{ id: "coluna", rotulo: "Largura da leitura", passo: 20, unidade: "px" }}
            valor={aparencia.coluna}
            minimo={limitesColuna.minimo}
            maximo={limitesColuna.maximo}
            aoMudar={(valor) => mudarAjuste("coluna", valor)}
          />
          <p className="aparencia-coluna-ajuda">
            A faixa acompanha o tamanho do texto para manter linhas confortáveis,
            sem ficar estreita ou longa demais.
          </p>

          {GRUPOS.map((g) => (
            <section key={g.id}>
              <h3>{g.rotulo}</h3>
              <div className="aparencia-opcoes" role="group" aria-label={g.rotulo}>
                {g.opcoes.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={aparencia[g.id] === o.id ? "true" : "false"}
                    onClick={() => setAparencia((a) => ({ ...a, [g.id]: o.id }))}
                  >
                    {/* A AMOSTRA MOSTRA O QUE A ESCOLHA FAZ, e não um rótulo só:
                        "Solta" não diz nada até se ver a entrelinha solta. */}
                    <span className={`amostra amostra-${g.id} amostra-${o.id}`} aria-hidden="true">
                      {g.id === "entrelinha" || g.id === "coluna" ? (
                        <><i /><i /><i /></>
                      ) : (
                        "Ab"
                      )}
                    </span>
                    <span className="amostra-rotulo">{o.rotulo}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <p className="aparencia-nota">
            Vale neste aparelho. Ler com letra maior é preferência de onde se lê,
            e não da conta — o mesmo leitor quer corpo grande no telefone e a
            medida cheia no monitor.
          </p>
        </aside>
      )}</Flutuante>}

      {erroDeNota && <p className="nota-erro" role="alert">{erroDeNota}</p>}

      {caderno && <Flutuante>{(
        <Caderno
          livro={livro}
          notas={notasComDegrau}
          capitulo={livro.capitulo ?? 0}
          aoComentar={aoComentar}
          aoTrocarCor={aoTrocarCor}
          aoApagar={aoApagarNota}
          /* IR A UMA NOTA DE OUTRO CAPÍTULO agora é rolar até ela, e não trocar
             de capítulo — ela pode já estar na tela, alguns capítulos acima. */
          aoIr={(cap) => {
            /* O ALVO É O PRIMEIRO BLOCO, e não a `<section>`: ela é
               `display: contents` e não tem caixa para rolar até — o
               `scrollIntoView` nela não fazia nada. */
            const alvo = prosa.current?.querySelector(`[data-capitulo="${cap}"] [data-de]`);
            if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          aoProcurarNoLivro={procurarACitacao}
          procurando={procurandoNota}
          semParadeiro={semParadeiro}
          aoFechar={() => fecharPainel("caderno")}
        />
      )}</Flutuante>}

      {/* OS BOTÕES DE VIRAR CAPÍTULO SAÍRAM. O desenho (895:10472) não os tem:
          a leitura é uma rolagem só, do título ao fim. Eles existiam porque o
          leitor mostrava um capítulo por vez, e agora a janela emenda os
          capítulos conforme a pessoa desce.

          O que ficou no lugar não é um controle: é a ausência dele. */}
    </div>
  );
}
