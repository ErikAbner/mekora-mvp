import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Icone } from "../componentes/Icone.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import { linkDe, usarPrevia } from "./previa.js";
import "./canvas.css";

/* O Canvas: onde as notas se ligam umas às outras.
 *
 *     Canvas organiza. Conexões descobre.  (DEC-0030)
 *
 * A superfície é de organização DELIBERADA: nada se move sozinho, nada é
 * sugerido. O que está aqui foi posto aqui.
 */

/* Antes de mover, é preciso ter certeza de que é arrasto e não clique. Quatro
 * pixels é o limiar que o protótipo já tinha calibrado — abaixo disso, tocar
 * numa nota para lê-la a arrastaria alguns pixels e o clique nunca chegaria. */
const LIMIAR = 4;

/* O TAMANHO DA NOTA, para o traço saber onde é o meio dela. A largura é fixa em
 * CSS; a altura varia com o texto, e 100 é a altura de uma nota de duas linhas
 * com rodapé — a ligação sai perto do centro em vez de exato, e é o suficiente
 * para o olho ler que as duas se falam. */
const NOTA_LARGURA = 220;
const NOTA_ALTURA = 100;

/* Folga em volta da caixa dos traços. Sem ela, uma linha na borda exata do SVG
 * perde metade da espessura no recorte. */
const FOLGA = 8;

/* O menor lado de um grupo. O mesmo número que o backend usa — um retângulo
 * menor que uma nota não agrupa nada, e um de um pixel some da tela sem deixar
 * como pegá-lo de volta. */
const LADO_MINIMO = 120;

/* O cartão da prévia. Ele fica DENTRO da nota, e não ao lado: o link é parte do
 * que foi escrito ali, e um cartão solto viraria um segundo objeto na
 * superfície que ninguém pôs.
 *
 * A imagem carrega do endereço original, e não de uma cópia nossa: guardar a
 * imagem faria o Mekora ter um arquivo de terceiro no disco, que a tela de
 * Privacidade teria de declarar e a pessoa não pediu.
 */
function Previa({ link, previa }) {
  const anfitriao = (() => {
    try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return link; }
  })();

  return (
    <a
      className="nota-previa"
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      /* NEM `pointerdown` NEM `click` PARAM AQUI.
       *
       * Os dois paravam, e o `pointerdown` era o defeito que o Erik descreveu
       * como "eu não consigo mover os post-it": uma nota que virou prévia de
       * link não arrastava, porque o `<a>` engolia o começo do gesto — e a
       * prévia é a maior parte do cartão.
       *
       * Quem cancela o clique depois de um arrasto é a NOTA, no
       * `onClickCapture` dela: ela sabe se o dedo andou, e a captura chega
       * antes de o link agir. */
    >
      {previa?.imagem && <img src={previa.imagem} alt="" loading="lazy" />}
      <span className="nota-previa-texto">
        <span className="nota-previa-titulo">{previa?.titulo || anfitriao}</span>
        {/* O PRODUTO DIZ O QUE NÃO SABE. Sem esta linha, um endereço que recusou
            a prévia ficaria idêntico a um que ainda está carregando. */}
        <span className="nota-previa-site">
          {previa === null
            ? "Buscando a prévia…"
            : previa.recusada
              ? `${anfitriao} · sem prévia`
              : previa.site || anfitriao}
        </span>
      </span>
    </a>
  );
}

/* A data curta do rodapé — "05/08/26", como o desenho escreve. Duas casas no
 * ano porque a linha é estreita e o século não está em disputa. */
function dataCurta(iso) {
  if (!iso) return null;
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/* O PASSO DO CHAO PONTILHADO, em unidades do plano.
 *
 * A malha e de 24 em 24, e ela acompanhava o zoom sem piso nenhum: a 25% os
 * pontos caiam para 6px de distancia na tela, com 2px de diametro cada. Isso
 * deixa de ser textura e vira chiado — foi o que o Erik viu comparando com o
 * Figma, "mais harmonioso, menos pesado, um detalhe e nao o foco". O peso nao
 * estava na cor do ponto: estava na DENSIDADE, e por isso so aparecia longe.
 *
 * Aqui a malha dobra sempre que ficaria mais junta que 18px na tela, entao a
 * distancia entre pontos fica sempre perto de 24px, em qualquer zoom. Dobrar (e
 * nao interpolar) mantem os pontos em cima dos mesmos lugares do plano: some um
 * a cada dois, e os que ficam nao saem do lugar. */
function passoDoChao(escala) {
  let passo = 24;
  while (passo * escala < 18) passo *= 2;
  return passo;
}

function Nota({ no, aoMover, aoTirar, aoLigarDaLista, fio, alvoDoFio, escala = 1 }) {
  const quando = dataCurta(no.criada_em);
  const caixa = useRef(null);
  const arrasto = useRef(null);
  const [posicao, setPosicao] = useState(null);

  /* O endereço vem do TEXTO da nota. A pessoa cola um link numa nota solta, e o
   * cartão vira a prévia daquele endereço — é o que o 895:6938 mostra. */
  /* Nasceu na superfície, sem livro por trás. Ver o bloco de citação abaixo. */
  const daCasa = no.fonte === "solta";

  const link = linkDe(no.texto);
  const previa = usarPrevia(link);

  /* O NÓ NÃO SAI DO LUGAR NO DOM DURANTE O ARRASTO.
   *
   * O `CLAUDE.md` já pagou esta: mover o nó libera a captura de ponteiro no
   * primeiro pixel — `lostpointercapture` — e o arrasto morre. O que se move é
   * o `transform`, que não mexe na árvore.
   *
   * A posição só vai para o servidor ao SOLTAR. */
  const moveu = useRef(false);

  const comecar = (e) => {
    if (e.button !== 0) return;
    /* O GESTO PARA AQUI.
     *
     * O chão também escuta `pointerdown`, e ele estava roubando a captura de
     * ponteiro da nota — quem chama `setPointerCapture` por último ganha. Medido:
     * o dedo andava 120px, a nota andava 0 no plano, e o canvas inteiro andava
     * 120. Era isto que fazia arrastar uma nota parecer travado.
     *
     * A guarda do chão existia, mas procurava a classe `.canvas-nota`, que não
     * existe em lugar nenhum — a classe é `nota-canvas`. Uma lista de exceções
     * escrita à mão erra em silêncio; parar o evento na origem não erra: quem
     * cuida do próprio arrasto não deixa o gesto subir. */
    e.stopPropagation();
    caixa.current?.setPointerCapture(e.pointerId);
    arrasto.current = { x0: e.clientX, y0: e.clientY, mexeu: false };
  };

  const andar = (e) => {
    const a = arrasto.current;
    if (!a) return;
    /* O DESLOCAMENTO DO DEDO É EM PIXELS DE TELA; a nota vive em coordenadas do
     * PLANO. Com zoom em 50%, mover o dedo 100px precisa mover a nota 200 no
     * plano — sem dividir pela escala, a nota anda mais devagar que o dedo e
     * escapa de baixo dele. */
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (!a.mexeu && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < LIMIAR) return;
    a.mexeu = true;
    setPosicao({ dx, dy });
  };

  const soltar = (e) => {
    const a = arrasto.current;
    /* `moveu` sobrevive ao fim do arrasto por um instante: o `click` chega
     * DEPOIS do `pointerup`, e sem esta marca ele não teria como saber que
     * acabou de haver um gesto. */
    moveu.current = Boolean(a?.mexeu);
    if (moveu.current) setTimeout(() => { moveu.current = false; }, 0);
    arrasto.current = null;
    caixa.current?.releasePointerCapture?.(e.pointerId);
    if (!a) return;
    if (a.mexeu) {
      aoMover(no.id, no.x + (e.clientX - a.x0) / escala, no.y + (e.clientY - a.y0) / escala);
    }
    setPosicao(null);
  };

  /* O CLIQUE MORRE SE HOUVE ARRASTO, e a nota é quem sabe disso.
   *
   * Sem isto, terminar um arrasto em cima da prévia abriria a página no instante
   * em que a pessoa só queria soltar a nota. `onClickCapture` porque ele precisa
   * chegar ANTES do `<a>` — na fase de descida, e não na de subida. */
  const talvezCancelarClique = (e) => {
    if (moveu.current) { e.preventDefault(); e.stopPropagation(); }
  };

  const estilo = {
    left: no.x,
    top: no.y,
    transform: posicao ? `translate(${posicao.dx}px, ${posicao.dy}px)` : undefined,
    /* Enquanto arrasta, a nota sobe: passar por baixo de outra faria parecer
       que ela sumiu. */
    zIndex: posicao ? 10 : undefined,
  };

  return (
    <article
      ref={caixa}
      className={`nota-canvas${posicao ? " movendo" : ""}${alvoDoFio ? " alvo-do-fio" : ""}`}
      /* O arrumo precisa da ALTURA REAL de cada cartão, que só o navegador sabe:
       * ela depende do texto, da prévia e do comentário. O id no DOM é como a
       * medida encontra de quem é cada caixa. Ver `organizar`. */
      data-no={no.id}
      data-nota={no.nota_id}
      style={estilo}
      onClickCapture={talvezCancelarClique}
      onPointerDown={comecar}
      onPointerMove={andar}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      {/* AS QUATRO PEGAS DE LIGAÇÃO, uma em cada borda.
       *
       * Ligar duas notas era um MODO: apertava-se um botão do dock, a superfície
       * entrava em "escolhendo", tocava-se numa nota e depois na outra. Isso foi
       * invenção minha. O Erik: "é possível conectar através de um ponto na
       * parte superior, inferior, esquerda e direita que se conecta em outro
       * item, como é visível no Figma".
       *
       * A diferença não é de enfeite. Um modo tira a superfície do estado normal
       * e obriga a pessoa a lembrar em que estado ela está; a pega está EM CIMA
       * da coisa que ela quer ligar, e o gesto é um só, do ponto até a outra
       * nota. Sai um passo, sai um estado, e some a pergunta "o que este clique
       * vai fazer agora".
       *
       * Elas só aparecem no cartão sob o ponteiro ou com o foco dentro —
       * quatro pontos em cada um de trinta cartões seria uma constelação. */}
      {["cima", "baixo", "esquerda", "direita"].map((lado) => (
        <span
          key={lado}
          className={`nota-pega nota-pega-${lado}`}
          /* OS TRÊS PASSOS FICAM NA PEGA, que é quem captura o ponteiro.
           *
           * A outra saída — tratar o movimento lá em cima, no `canvas-mundo`,
           * deixando o evento subir — foi medida e também funciona. Fica esta
           * porque o chão passa a tratar só do chão: sem ela, `chaoMove` começa
           * com um desvio que não é sobre a câmera, e o próximo gesto que
           * alguém acrescentar põe outro. */
          onPointerDown={(e) => fio.comecar(e, no.nota_id)}
          onPointerMove={fio.puxar}
          onPointerUp={fio.largar}
          onPointerCancel={fio.largar}
          aria-hidden="true"
        />
      ))}
      {/* A COR DA NOTA VIRA UMA MARCA, e não o papel inteiro.
          
          O nó 895:6938 mostra cartões BRANCOS, com filete fino e uma sombra
          quase nada — o mesmo cartão para todos. Aqui cada um era uma folha
          amarela, azul ou verde, e com quatro cores no mesmo espaço a cor deixa
          de significar o que ela significa na leitura: ali ela é a marca que a
          pessoa escolheu para o trecho, e aqui virava a identidade do objeto.
          
          A marca guarda a informação e devolve o cartão ao sistema. */}
      {no.cor && (
        <span
          className="nota-marca"
          style={{ background: DESTAQUES[no.cor] ?? DESTAQUES.amarelo }}
          aria-hidden="true"
        />
      )}
      {/* O QUE É CITAÇÃO SE PARECE COM CITAÇÃO.
       *
       * O Erik: "em caso de referenciar alguma anotação, ela deixar claro que é
       * um texto SOBRE ou relacionado a algum bloco de texto de outro arquivo".
       *
       * Os dois textos saíam como parágrafos iguais, e não dava para saber qual
       * era qual: o `trecho` é o que o LIVRO diz, o `comentário` é o que a
       * PESSOA disse sobre ele. Numa superfície onde tudo é cartão branco, essa
       * diferença é a única que separa uma leitura de um pensamento.
       *
       * Quando a nota nasceu aqui, sem livro, não há citação nenhuma — o texto é
       * dela e sai sem filete. Marcar tudo faria a marca não querer dizer nada. */}
      {daCasa ? (
        <p className="nota-texto">{no.texto}</p>
      ) : (
        <blockquote className="nota-trecho">
          <p className="nota-texto">{no.texto}</p>
        </blockquote>
      )}
      {no.comentario && <p className="nota-comentario">{no.comentario}</p>}

      {/* A PRÉVIA DO LINK — nó 895:6938. Só aparece quando há um endereço no
          texto da nota, e o Mekora precisa IR ATÉ ELE para montá-la: essa
          informação não está aqui, está no site. A Política de privacidade diz
          isso com todas as letras. */}
      {link && <Previa link={link} previa={previa} />}

      {/* O RODAPÉ DO DESENHO É ORIGEM E DATA — "Erik · 05/08/26" —, e não uma
          fileira de botões.
          
          "Tirar" estava na cara de TODO cartão, e o `CLAUDE.md` já nomeia o que
          isso faz: *"botão repetido cinco vezes vira textura e some como coisa
          clicável"*. Num canvas de vinte notas eram vinte botões idênticos
          competindo com o texto que a pessoa escreveu.
          
          Ele passou a aparecer só no cartão sob o ponteiro, ou com o foco do
          teclado dentro dele — quem chega de teclado precisa alcançá-lo, e
          `:hover` sozinho o esconderia para sempre. */}
      <footer>
        {/* DE ONDE VEIO, e onde no arquivo. O capítulo entra porque num livro de
            trezentas páginas "do seu livro" ainda deixa a pessoa procurando. */}
        <span className="nota-origem">
          {daCasa
            ? "escrita aqui"
            : [no.origem || "do seu livro", no.capitulo > 0 && `cap. ${no.capitulo}`]
                .filter(Boolean)
                .join(" · ")}
        </span>
        {quando && <span className="nota-quando">{quando}</span>}
        <span className="nota-acoes">
          {no.job_id && (
            <Link to={`/leitura/${no.job_id}`} className="nota-abrir">
              Abrir no livro
            </Link>
          )}
          {/* LIGAR PELO TECLADO. As pegas das bordas são gesto de ponteiro e
              nada mais: quem navega por teclado não tem como puxar um fio, e
              sem esta porta a ligação teria virado um recurso só de quem usa
              mouse. Ela abre uma lista das outras notas — nenhum modo, nenhum
              estado novo na superfície. */}
          <button type="button" onClick={(e) => { e.stopPropagation(); aoLigarDaLista(no.nota_id); }}>
            Ligar a…
          </button>
          {/* TIRAR não apaga: a nota continua na estante e no caderno. O rótulo
              diz "tirar" e não "apagar" por isso. */}
          <button type="button" onClick={(e) => { e.stopPropagation(); aoTirar(no.id); }}>
            Tirar
          </button>
        </span>
      </footer>
    </article>
  );
}


/* UM GRUPO — nó 895:6938.
 *
 * O desenho mostra cartões dentro de uma área tracejada com título: *"Design &
 * Tecnologia"*. É um agrupamento ESPACIAL, e é o que o distingue de um Estudo:
 * o Estudo é uma lista reunida por assunto e existe fora do Canvas; o grupo é
 * um pedaço de chão com nome, e uma nota pertence a ele por estar em cima dele.
 *
 * ELE FICA ATRÁS DAS NOTAS e não captura o ponteiro no meio: arrastar dentro da
 * área move a NOTA, ou o chão, e nunca o retângulo por baixo. O que pega o
 * retângulo é a barra do título — a mesma regra de uma janela.
 */
function Grupo({ grupo, aoMudar, aoApagar, escala, nasceuAgora = 0 }) {
  const arrasto = useRef(null);
  const [desloca, setDesloca] = useState(null);
  const [medindo, setMedindo] = useState(null);
  const [editando, setEditando] = useState(false);

  /* NASCEU AGORA: abre pedindo o nome. O carimbo de tempo entra nas dependências
   * para que dois grupos seguidos disparem duas vezes — um booleano já ligado
   * não dispara. */
  useEffect(() => { if (nasceuAgora) setEditando(true); }, [nasceuAgora]);

  const pegar = (e, qual) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    /* Mesma razão da nota: o chão não pode roubar este gesto. */
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrasto.current = { qual, x0: e.clientX, y0: e.clientY };
  };

  const andar = (e) => {
    const a = arrasto.current;
    if (!a) return;
    /* Dividido pela escala pelo mesmo motivo da nota: o dedo anda em pixels de
     * tela, e a área vive em coordenadas do plano. */
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (a.qual === "mover") setDesloca({ dx, dy });
    else setMedindo({ dx, dy });
  };

  const soltar = (e) => {
    const a = arrasto.current;
    arrasto.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setDesloca(null);
    setMedindo(null);
    if (!a) return;
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (Math.hypot(dx, dy) < LIMIAR) return;
    if (a.qual === "mover") aoMudar(grupo.id, { x: grupo.x + dx, y: grupo.y + dy });
    else aoMudar(grupo.id, {
      largura: Math.max(LADO_MINIMO, grupo.largura + dx),
      altura: Math.max(LADO_MINIMO, grupo.altura + dy),
    });
  };

  const estilo = {
    left: grupo.x,
    top: grupo.y,
    width: Math.max(LADO_MINIMO, grupo.largura + (medindo?.dx ?? 0)),
    height: Math.max(LADO_MINIMO, grupo.altura + (medindo?.dy ?? 0)),
    transform: desloca ? `translate(${desloca.dx}px, ${desloca.dy}px)` : undefined,
  };

  return (
    /* O NOME FICA ACIMA DO RETÂNGULO, e não dentro dele.
     *
     * O `895:7024` põe "Design & Tecnologia" como um parágrafo SOBRE a caixa
     * tracejada, com 24px entre os dois. Eu tinha posto uma barra de título
     * dentro do retângulo, e a diferença não é cosmética: dentro, o nome disputa
     * o espaço com as notas do grupo e cobre a de cima. Acima, ele nomeia a área
     * sem ocupar nada dela. */
    <section className="canvas-grupo" style={estilo} aria-label={grupo.nome || "Grupo sem nome"}>
      <header
        className="canvas-grupo-titulo"
        onPointerDown={(e) => pegar(e, "mover")}
        onPointerMove={andar}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        {editando ? (
          <input
            type="text"
            defaultValue={grupo.nome}
            aria-label="Nome do grupo"
            /* `ref` DE CALLBACK, e não `autoFocus`.
             *
             * O `autoFocus` do React age no monte, e aqui o campo monta no mesmo
             * quadro em que o botão de agrupar ainda tem o foco — medido: o
             * campo abria e o foco continuava no botão, então digitar não escrevia
             * nada. O callback roda com o nó já no documento. */
            ref={(el) => { if (el) { el.focus(); el.select(); } }}
            maxLength={120}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => { setEditando(false); if (e.target.value !== grupo.nome) aoMudar(grupo.id, { nome: e.target.value }); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditando(false); }}
          />
        ) : (
          <button
            type="button"
            className="canvas-grupo-nome"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setEditando(true)}
          >
            {/* Grupo sem nome DIZ que não tem nome, e o rótulo é o convite para
                dar um. Um retângulo com o título em branco parece defeito. */}
            {grupo.nome || "Dar um nome"}
          </button>
        )}
        <button
          type="button"
          className="canvas-grupo-tirar"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => aoApagar(grupo.id)}
        >
          Desfazer grupo
        </button>
      </header>

      {/* O canto que redimensiona. `aria-hidden` porque o teclado não arrasta —
          o tamanho por teclado não existe ainda, e fingir um alvo focável que
          não responde é pior que não oferecer. */}
      {/* A CAIXA TRACEJADA — `895:7025`. Ela é irmã do nome, e não a mãe dele. */}
      <div className="canvas-grupo-area">
        <span
          className="canvas-grupo-canto"
          aria-hidden="true"
          onPointerDown={(e) => pegar(e, "medir")}
          onPointerMove={andar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        />
      </div>
    </section>
  );
}

export function Canvas({ nos = [], ligacoes = [], grupos = [], notas = [], erro, aoTrazer, aoMover, aoTirar, aoLigar, aoDesligar, aoAgrupar, aoMudarArea, aoDesagrupar }) {
  /* O FIO QUE ESTÁ SENDO PUXADO, em coordenadas da JANELA e não do plano.
   *
   * Da janela porque ele é desenhado por cima de tudo, e não dentro do plano:
   * assim ele não precisa saber de câmera nem de escala, e a ponta fica
   * exatamente sob o dedo em qualquer zoom. */
  const [fio, setFio] = useState(null);
  /* O MESMO FIO NUM `ref`, porque o primeiro movimento chega antes do estado.
   * O `useState` só vale a partir do próximo desenho, e o gesto começa agora. */
  const fioVivo = useRef(null);
  /* Qual nota está esperando a segunda ponta, quando a ligação vem do teclado. */
  const [ligandoDaLista, setLigandoDaLista] = useState(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const [pondoMidia, setPondoMidia] = useState(false);
  const [endereco, setEndereco] = useState("");
  const [texto, setTexto] = useState("");
  const [trazendo, setTrazendo] = useState(false);

  const naSuperficie = new Set(nos.map((n) => n.nota_id));
  const deFora = notas.filter((n) => !naSuperficie.has(n.id));

  const posicaoDe = useCallback(
    (notaId) => nos.find((n) => n.nota_id === notaId),
    [nos],
  );

  /* A CAIXA DOS TRAÇOS: onde cada linha começa e acaba, e o retângulo que
   * contém todas. `null` quando não há nenhuma ligação desenhável — e aí não há
   * SVG na árvore, em vez de um elemento vazio de tamanho indefinido. */
  const tracos = useMemo(() => {
    const linhas = [];
    for (const l of ligacoes) {
      const a = nos.find((n) => n.nota_id === l.de_id);
      const b = nos.find((n) => n.nota_id === l.para_id);
      if (!a || !b) continue;
      const x1 = a.x + NOTA_LARGURA / 2;
      const y1 = a.y + NOTA_ALTURA / 2;
      const x2 = b.x + NOTA_LARGURA / 2;
      const y2 = b.y + NOTA_ALTURA / 2;
      /* A CURVA DO DESENHO, e não um segmento reto.
       *
       * O nó 895:6938 liga os cartões com uma curva que SAI E CHEGA NA
       * HORIZONTAL, e isso não é enfeite: com reta, duas notas quase alinhadas
       * produzem uma diagonal de um grau que parece um erro de renderização, e
       * quatro ligações saindo de uma nota viram um leque ilegível.
       *
       * A curva é uma Bézier cúbica com as duas alças horizontais, a metade da
       * distância — a mesma forma dos diagramas de nó de todo editor visual,
       * pela mesma razão. */
      const alca = Math.max(40, Math.abs(x2 - x1) / 2);
      linhas.push({
        id: l.id,
        d: `M ${x1} ${y1} C ${x1 + alca} ${y1}, ${x2 - alca} ${y2}, ${x2} ${y2}`,
        /* O MEIO DA CURVA, e não o meio da reta: é onde o ponto de desfazer
           mora, e ele tem de cair EM CIMA do traço. Numa Bézier com alças
           horizontais, t=0,5 dá exatamente isto. */
        mx: (x1 + 3 * (x1 + alca) + 3 * (x2 - alca) + x2) / 8,
        my: (y1 + 3 * y1 + 3 * y2 + y2) / 8,
      });
    }
    if (!linhas.length) return null;

    const xs = linhas.flatMap((l) => [l.x1, l.x2]);
    const ys = linhas.flatMap((l) => [l.y1, l.y2]);
    const x = Math.min(...xs) - FOLGA;
    const y = Math.min(...ys) - FOLGA;
    return {
      x, y,
      largura: Math.max(...xs) - x + FOLGA,
      altura: Math.max(...ys) - y + FOLGA,
      linhas,
    };
  }, [ligacoes, nos]);

  /* O CENTRO DO QUE ESTÁ SENDO VISTO, em coordenadas do plano. É onde o grupo
   * novo nasce — a origem do plano pode estar a mil pixels daqui. */
  const mundo = useRef(null);

  /* ONDE, NO PLANO, ESTÁ O MEIO DA TELA — descontando metade do objeto que vai
   * nascer, para que ele fique centrado e não com o canto no meio. */
  const meioDaVista = (largura = 0, altura = 0) => {
    const caixa = mundo.current?.getBoundingClientRect();
    if (!caixa) return { x: 0, y: 0 };
    return {
      x: (caixa.width / 2 - camera.x) / camera.escala - largura / 2,
      y: (caixa.height / 2 - camera.y) / camera.escala - altura / 2,
    };
  };

  const criarAqui = () => {
    const meio = meioDaVista(480, 320);
    /* O GRUPO NASCE PEDINDO O NOME.
     *
     * Ele nascia sem nome nenhum, e ficava um retângulo tracejado anônimo no
     * meio da tela — a pessoa tinha de descobrir que o rótulo "Dar um nome" era
     * clicável. No desenho, todo grupo tem nome: o `895:7024` é "Design &
     * Tecnologia", e um grupo é uma ÁREA COM ASSUNTO. Sem assunto ele é só uma
     * caixa.
     *
     * `recemCriado` faz o campo do nome abrir já em edição, com o foco dentro.
     * Quem não quiser nomear aperta `Esc` e o grupo continua lá. */
    /* GUARDA OS IDS DE ANTES, e não a posição.
     *
     * A primeira versão marcava "o último da lista", e a lista se reordena
     * quando ela volta do servidor: medido, DOIS campos de nome abriam ao mesmo
     * tempo — o grupo que era o último antes, e o que passou a ser depois.
     *
     * Id é o que não muda de lugar. */
    idsDeAntes.current = new Set(grupos.map((g) => g.id));
    return aoAgrupar?.({ nome: "", x: meio.x, y: meio.y, largura: 480, altura: 320 });
  };

  /* ORGANIZAR: ALINHAR E DESENCAVALAR, e não redistribuir tudo.
   *
   * O Erik: "o ícone de camadas é para organizar o canvas, já que são muitos
   * itens é perigoso do usuário se perder, então isso dá uma LEVE organizada" —
   * e ele mesmo duvidou de que fosse útil. A dúvida é justa, e ela decide o
   * desenho: uma arrumação que joga tudo numa grade nova destrói o mapa mental
   * que a pessoa construiu pondo cada coisa onde pôs. Aí sim ela se perde, e foi
   * o botão que a perdeu.
   *
   * O que este faz é o mínimo que resolve a bagunça sem apagar o sentido:
   * encosta cada nota na malha de 24 e empurra para baixo o que estiver por cima
   * de outra. A ordem relativa fica de pé — o que estava à esquerda continua à
   * esquerda —, e é o princípio do Muse que o Erik mandou: você nunca perde a
   * orientação.
   *
   * As posições de antes ficam guardadas para o DESFAZER. Uma ação que mexe em
   * trinta objetos de uma vez e não tem volta é uma armadilha. */
  const MALHA = 24;
  const [desfazerArrumo, setDesfazerArrumo] = useState(null);
  const relogioDoArrumo = useRef(null);

  const alturasNaTela = () => {
    const alturas = new Map();
    for (const el of document.querySelectorAll(".nota-canvas")) {
      const id = Number(el.dataset.no);
      if (id) alturas.set(id, el.getBoundingClientRect().height / camera.escala);
    }
    return alturas;
  };

  const organizar = () => {
    if (nos.length < 2) return;
    const alturas = alturasNaTela();
    const alturaDe = (n) => alturas.get(n.id) ?? 160;
    const encaixar = (v) => Math.round(v / MALHA) * MALHA;

    const antes = nos.map((n) => ({ id: n.id, x: n.x, y: n.y }));
    const postas = [];
    const depois = [];

    for (const n of [...nos].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const largura = 375;
      const altura = alturaDe(n);
      let x = encaixar(n.x);
      let y = encaixar(n.y);
      /* Empurra para BAIXO, e nunca para os lados: mexer no x trocaria a ordem
       * da esquerda para a direita, que costuma ser a leitura que a pessoa deu
       * ao arranjo. */
      let seguro = 0;
      while (
        seguro++ < 400 &&
        postas.some(
          (o) => x < o.x + o.largura + 8 && x + largura + 8 > o.x && y < o.y + o.altura + 8 && y + altura + 8 > o.y,
        )
      ) {
        y += MALHA;
      }
      postas.push({ x, y, largura, altura });
      if (x !== n.x || y !== n.y) depois.push({ id: n.id, x, y });
    }

    if (!depois.length) return;
    for (const m of depois) aoMover(m.id, m.x, m.y);
    setDesfazerArrumo(antes);
    clearTimeout(relogioDoArrumo.current);
    relogioDoArrumo.current = setTimeout(() => setDesfazerArrumo(null), 12000);
  };

  const desfazerOrganizar = () => {
    if (!desfazerArrumo) return;
    for (const m of desfazerArrumo) aoMover(m.id, m.x, m.y);
    clearTimeout(relogioDoArrumo.current);
    setDesfazerArrumo(null);
  };

  const comecarFio = (e, notaId) => {
    if (e.button !== 0) return;
    /* Como a nota e o chão: quem cuida do próprio gesto não deixa ele subir. */
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const caixa = mundo.current.getBoundingClientRect();
    const pega = e.currentTarget.getBoundingClientRect();
    const novo = {
      de: notaId,
      x0: pega.left + pega.width / 2 - caixa.left,
      y0: pega.top + pega.height / 2 - caixa.top,
      x: e.clientX - caixa.left,
      y: e.clientY - caixa.top,
      sobre: null,
    };
    fioVivo.current = novo;
    setFio(novo);
  };

  /* QUEM ESTÁ SOB O DEDO. `elementFromPoint` e não a lista de notas, porque só
   * o navegador sabe quem ficou por cima de quem depois do zoom e do arrasto. */
  const notaSobOPonteiro = (e) =>
    Number(document.elementFromPoint(e.clientX, e.clientY)?.closest(".nota-canvas")?.dataset.nota) || null;

  const puxarFio = (e) => {
    if (!fioVivo.current) return;
    const caixa = mundo.current.getBoundingClientRect();
    const sobre = notaSobOPonteiro(e);
    const novo = {
      ...fioVivo.current,
      x: e.clientX - caixa.left,
      y: e.clientY - caixa.top,
      sobre: sobre === fioVivo.current.de ? null : sobre,
    };
    fioVivo.current = novo;
    setFio(novo);
  };

  const largarFio = (e) => {
    const f = fioVivo.current;
    if (!f) return;
    const alvo = notaSobOPonteiro(e);
    /* Soltar no vazio CANCELA, e soltar na mesma nota também. Cancelar no meio
     * do gesto é o que o Muse chama de poder mudar de ideia sem custo. */
    if (alvo && alvo !== f.de) aoLigar(f.de, alvo);
    fioVivo.current = null;
    setFio(null);
  };

  const maoDoFio = useMemo(
    () => ({ comecar: comecarFio, puxar: puxarFio, largar: largarFio }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aoLigar],
  );

  /* A CÂMERA. O Canvas é uma superfície SEM FIM, e o que a tela mostra é um
   * recorte dela — `deslocamento` diz onde esse recorte está, `escala` diz de
   * quão longe se olha.
   *
   * A primeira versão era uma caixa de 560px com `overflow: auto`: uma nota
   * arrastada para fora do quadro sumia, e não havia como ir atrás dela. O nó
   * `895:6938` mostra o contrário — chão pontilhado que continua para todo lado,
   * e um controle de zoom no canto.
   *
   * O PLANO É QUE SE MOVE, e não a rolagem: `transform` não mexe na árvore, roda
   * na placa de vídeo, e é o que permite arrastar mil notas sem engasgo. */
  const [camera, setCamera] = useState({ x: 0, y: 0, escala: 1 });
  const arrastandoChao = useRef(null);

  const ESCALA_MIN = 0.25;
  const ESCALA_MAX = 2;
  /* O SALTO DO BOTÃO ANIMA; o gesto não.
   *
   * Arrastar e a pinça mandam dezenas de valores por segundo, e uma transição
   * ali põe atraso entre o dedo e a superfície — é o que faz um canvas parecer
   * que patina. Os botões saltam de 100 para 110 de uma vez, e sem transição o
   * salto lê como um piscar.
   *
   * A marca dura o tempo da transição e sai sozinha. Se a pessoa começar a
   * arrastar nesse meio tempo, o próximo `pointerdown` a tira antes. */
  const [saltando, setSaltando] = useState(false);
  const idsDeAntes = useRef(null);
  const relogioDoSalto = useRef(null);

  /* APROXIMAR SEM PERDER O QUE SE OLHAVA.
   *
   * O botão só mexia na escala. Como o plano tem `transform-origin: 0 0`, tudo
   * crescia e encolhia a partir do canto do plano, e não do que estava na tela:
   * afastar duas vezes jogava as notas para fora do enquadramento, e a pessoa
   * tinha de sair procurando. Medido numa captura a 25% — as notas escaparam
   * para o canto superior esquerdo.
   *
   * É o princípio do Muse que o Erik mandou, "você nunca perde a orientação",
   * e a pinça já o respeitava: ela ancora no cursor. O botão não tem cursor,
   * então ancora no CENTRO DA JANELA, que é onde a atenção está.
   *
   * A conta é a mesma dos dois: o ponto do plano que está sob a âncora tem de
   * continuar sob a âncora depois da escala — por isso ela mora num lugar só. */
  const escalarEmVolta = (c, nova, ax, ay) => {
    if (nova === c.escala) return c;
    const noPlanoX = (ax - c.x) / c.escala;
    const noPlanoY = (ay - c.y) / c.escala;
    return { x: ax - noPlanoX * nova, y: ay - noPlanoY * nova, escala: nova };
  };

  const aproximar = (passo) => {
    setSaltando(true);
    clearTimeout(relogioDoSalto.current);
    relogioDoSalto.current = setTimeout(() => setSaltando(false), 220);
    const caixa = mundo.current?.getBoundingClientRect();
    const ax = caixa ? caixa.width / 2 : 0;
    const ay = caixa ? caixa.height / 2 : 0;
    setCamera((c) =>
      escalarEmVolta(
        c,
        Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, +(c.escala + passo).toFixed(2))),
        ax,
        ay,
      ),
    );
  };

  /* ARRASTAR O CHÃO leva a câmera junto. Só o chão: começar o arrasto sobre uma
   * nota move a nota, e é o que a pessoa espera dos dois gestos. */
  const chaoDesce = (e) => {
    /* O gesto tira a transição na hora: nada de o plano seguir o dedo com
     * 200ms de atraso porque um botão foi apertado meio segundo antes. */
    setSaltando(false);
    arrastandoChao.current = { x0: e.clientX, y0: e.clientY, cx: camera.x, cy: camera.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const chaoMove = (e) => {
    const a = arrastandoChao.current;
    if (!a) return;
    setCamera((c) => ({ ...c, x: a.cx + (e.clientX - a.x0), y: a.cy + (e.clientY - a.y0) }));
  };
  const chaoSobe = () => { arrastandoChao.current = null; };

  /* DOIS DEDOS ANDAM, E A PINÇA APROXIMA — e isto é o que faltava.
   *
   * O Erik: "o canvas é travado". Medi antes de mexer, e o arrasto do chão
   * funcionava (−150px exatos) e os dois botões de zoom também. O que não
   * existia era a RODA: num trackpad, dois dedos não faziam nada e a pinça não
   * fazia nada. Sobrava arrastar clicando, que é o gesto do mouse — e ninguém
   * navega um plano infinito assim.
   *
   * O NAVEGADOR RELATA A PINÇA COMO RODA COM `ctrlKey`. Não é gambiarra: é como
   * o Safari e o Chrome entregam o gesto de dois dedos no macOS, e é o único
   * jeito de recebê-lo.
   *
   * A PINÇA APROXIMA NO PONTEIRO, e não no centro. É o princípio do Muse que o
   * Erik mandou — "você nunca perde a orientação": aproximar pelo meio da tela
   * joga para longe o que a pessoa estava olhando, e ela tem de procurar de
   * novo. Ancorado no cursor, o ponto sob o dedo fica parado e o resto cresce em
   * volta dele.
   *
   * A conta é essa: o ponto do PLANO que está sob o cursor tem de continuar sob
   * o cursor depois da escala. */
  const rodar = (e) => {
    e.preventDefault();
    setSaltando(false);
    const caixa = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - caixa.left;
    const py = e.clientY - caixa.top;

    setCamera((c) => {
      if (!e.ctrlKey) {
        /* Dois dedos: anda. O sinal é invertido porque rolar para baixo leva a
         * vista para baixo, e a vista é a câmera ao contrário. */
        return { ...c, x: c.x - e.deltaX, y: c.y - e.deltaY };
      }
      /* O PASSO SERVE AOS DOIS APARELHOS, e o primeiro que escrevi não servia
       * a nenhum: `exp(-deltaY/120)` levou 100% a 200% num único evento.
       *
       * A pinça do trackpad manda MUITOS eventos com delta pequeno (1 a 10); a
       * roda com `ctrl` manda um evento de 100 a 120. `0.999^deltaY` dá 0,5% no
       * primeiro caso e 13% no segundo — suave onde o gesto é contínuo, e um
       * degrau perceptível onde ele é discreto. */
      const nova = Math.min(
        ESCALA_MAX,
        Math.max(ESCALA_MIN, c.escala * Math.pow(0.999, Math.max(-240, Math.min(240, e.deltaY)))),
      );
      return escalarEmVolta(c, nova, px, py);
    });
  };

  return (
    /* `chao` E `com-cabecalho-solto`: no Canvas o chão pontilhado vai de borda a
       borda e o cabeçalho FLUTUA sobre ele. O `895:6938` põe as duas caixas dele
       como `absolute` a 16px dos cantos — e não como a barra de 32 das outras
       telas —, porque aqui a página inteira é o plano. */
    <div className="mesa chao canvas-com-cabecalho-solto">
      <Cabecalho lugar="canvas" />

      <section className="canvas">
        {/* A BARRA DE FERRAMENTAS, FLUTUANDO À ESQUERDA — nó 895:6938.
         *
         * O que havia aqui era um título "Canvas", um parágrafo explicando o que
         * ele é, e quatro botões largos numa fileira. Nada disso está no
         * desenho, e o motivo é o que a tela é: no desenho o canvas É a página,
         * de borda a borda, e as ferramentas flutuam sobre ele numa coluna
         * estreita.
         *
         * O título dizia "Canvas" a três centímetros do item "Canvas" marcado no
         * menu, e o parágrafo explicava a área toda vez que alguém a abre — a
         * milésima vez inclusive. Numa tela de trabalho, o que ocupa o alto é o
         * trabalho.
         *
         * OS RÓTULOS NÃO SUMIRAM: cada botão tem `aria-label` e título, e o nome
         * aparece ao passar o ponteiro. Ícone sem nome é adivinhação, e é o
         * defeito mais comum de barra de ferramenta. */}
        {/* OS TRÊS ÍCONES SÃO OS DO DESENHO, exportados do `900:52962`.
            
            Nenhum dos meus servia: o dock traz um alfinete, uma nota com "+" e
            uma pilha de camadas, e o que eu tinha era caderno, cúpula e livro.
            Trocar por parecidos seria a mesma coisa que aconteceu com o ícone da
            Estante — usar pelo nome, sem olhar o desenho.
            
            O QUE CADA UM SIGNIFICA é leitura minha, e está aqui para o Erik
            corrigir numa linha: a pilha de camadas é o agrupar (camada = área),
            a nota com "+" é escrever, e o alfinete ficou com ligar. Os dois
            primeiros são quase certos; o alfinete é o que eu chutaria de novo se
            ninguém disser. */}
        {/* O DOCK DIZ TRÊS COISAS, E EU TINHA POSTO OUTRAS TRÊS.
            
            O Erik corrigiu uma a uma. A do quadro com "+" é ADICIONAR MÍDIA —
            foto ou endereço de vídeo —, e eu a usava para "escrever uma nota";
            o nome do arquivo já dizia `nota-imagem`, e eu o usei pelo lugar e
            não pelo que ele desenha. A de camadas é ORGANIZAR a superfície, e eu
            a usava para agrupar. A terceira era LIGAR DUAS NOTAS, que foi ideia
            minha e não do desenho.
            
            É o mesmo erro dos ícones da Estante: escolher pelo que parece, em
            vez de perguntar o que é. */}
        <nav className="canvas-ferramentas" aria-label="Ferramentas do Canvas">
          <button
            type="button"
            title="Adicionar mídia"
            aria-label="Adicionar mídia"
            onClick={() => { setEndereco(""); setPondoMidia(true); }}
          >
            <Icone src="/icones/icone-nota-imagem.svg" />
          </button>
          <button
            type="button"
            title="Organizar a superfície"
            aria-label="Organizar a superfície"
            onClick={organizar}
            disabled={nos.length < 2}
          >
            <Icone src="/icones/icone-camadas.svg" />
          </button>
          {/* CRIAR UMA SEÇÃO. Ela nasce no meio do que está sendo visto, e não
              na origem do plano: numa superfície sem fim, a origem pode estar
              a mil pixels de distância, e o retângulo apareceria fora da tela. */}
          <button
            type="button"
            title="Criar uma seção"
            aria-label="Criar uma seção"
            onClick={criarAqui}
          >
            <Icone src="/icones/icone-fixar.svg" />
          </button>
        </nav>

        {erro && <p className="canvas-erro" role="alert">{erro}</p>}

        {/* O DESFAZER DO ARRUMO. Ver `organizar`: mexer em trinta objetos de
            uma vez sem volta é uma armadilha, e ele some sozinho em 12s. */}
        {desfazerArrumo && (
          <p className="canvas-recado" role="status">
            Superfície organizada.{" "}
            <button type="button" onClick={desfazerOrganizar}>Desfazer</button>
          </p>
        )}

        {fio && (
          <p className="canvas-recado" role="status">
            {fio.sobre ? "Solte para ligar." : "Leve até outra nota. Soltar no vazio cancela."}
          </p>
        )}

        {/* O MUNDO é a janela; o PLANO é a superfície, e ela não tem borda.
            Duas camadas porque só assim o zoom e o arrasto valem para tudo o que
            está dentro sem cada nota precisar saber da câmera. */}
        <div
          ref={mundo}
          className="canvas-mundo"
          onWheel={rodar}
          /* O chão pontilhado anda com a câmera: as duas variáveis são lidas
             pelo `background-position` e pelo `background-size` em canvas.css. */
          style={{
            "--camera-x": `${camera.x}px`,
            "--camera-y": `${camera.y}px`,
            "--escala": camera.escala,
            "--passo": `${passoDoChao(camera.escala)}px`,
          }}
          /* DOIS TOQUES NO VAZIO ESCREVEM UMA NOTA.
             
             O dock do `900:52962` tem três ferramentas, e nenhuma delas é
             escrever — eu tinha posto "escrever" numa delas e empurrado o resto
             para fora. Escrever não sumiu por isso: ele é o gesto direto de toda
             superfície deste tipo, do Figma ao Heptabase, e a mão já está no
             lugar onde a nota vai nascer. */
          onDoubleClick={(e) => {
            if (e.target.closest(".nota-canvas, .canvas-grupo, .canvas-ferramentas, .canvas-zoom")) return;
            setTexto("");
            setEscrevendo(true);
          }}
          onPointerDown={chaoDesce}
          onPointerMove={chaoMove}
          onPointerUp={chaoSobe}
          onPointerCancel={chaoSobe}
        >
          <div
            className={`canvas-plano${saltando ? " saltando" : ""}`}
            style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.escala})` }}
          >
          {!nos.length && (
            <p className="canvas-vazio">
              Nada aqui ainda. Traga uma nota que você já marcou, ou escreva uma
              solta — as duas viram a mesma coisa depois de estarem na superfície.
            </p>
          )}

          {/* OS TRAÇOS FICAM ATRÁS, num SVG que cobre a superfície inteira.
              Desenhá-los como bordas entre elementos exigiria que cada nota
              soubesse das outras; assim, a ligação é desenhada por quem sabe
              onde as duas estão. */}
          {/* OS GRUPOS FICAM NO FUNDO: eles são o chão, e as notas estão em
              cima. Vêm antes no DOM, e é isso que os põe atrás. */}
          {grupos.map((g) => (
            <Grupo
              key={g.id}
              grupo={g}
              aoMudar={aoMudarArea}
              aoApagar={aoDesagrupar}
              escala={camera.escala}
              /* O grupo cujo id NÃO existia antes da última criação abre já
                 pedindo o nome. Ver `idsDeAntes`. */
              nasceuAgora={idsDeAntes.current && !idsDeAntes.current.has(g.id) ? g.id : 0}
            />
          ))}

          {/* OS TRAÇOS TÊM CAIXA PRÓPRIA, medida a partir das ligações.
              A versão anterior era `inset: 0` com 100% de largura e altura — e o
              plano é uma superfície SEM FIM, então "100%" não quer dizer nada:
              o SVG media 0×0 e as linhas só apareciam porque o navegador não as
              recortava. Funcionava por sorte, e qualquer `overflow` num
              ancestral apagaria todas as ligações de uma vez, sem erro nenhum.

              Agora a caixa é o retângulo que contém as pontas, e o `viewBox` põe
              o sistema de coordenadas do SVG em cima do sistema do plano — a
              linha usa as mesmas posições que as notas. */}
          {tracos && (
            <svg
              className="canvas-tracos"
              aria-hidden="true"
              style={{ left: tracos.x, top: tracos.y, width: tracos.largura, height: tracos.altura }}
              viewBox={`${tracos.x} ${tracos.y} ${tracos.largura} ${tracos.altura}`}
            >
              {tracos.linhas.map((l) => (
                <g key={l.id}>
                  <path d={l.d} className="traco" fill="none" />
                  {/* DESFAZER MORA NA PRÓPRIA LIGAÇÃO.
                  
                      Havia uma lista "Ligações N" abaixo do canvas, com um
                      "Desfazer" por linha — e ela não está no desenho, por um
                      motivo que se vê usando: para desfazer a ligação entre
                      duas notas que estão na tela, a pessoa rolava para fora do
                      canvas, procurava a linha certa entre trinta parecidas
                      ("A expedição partiu de manhã, c… — Uma foto é obser…") e
                      clicava. A ligação está ali, desenhada.
                      
                      O ponto é o círculo que o desenho põe na junta. Ele só
                      ganha o × sob o ponteiro; parado, é a junta. */}
                  <g
                    className="traco-junta"
                    transform={`translate(${l.mx} ${l.my})`}
                    role="button"
                    tabIndex={0}
                    aria-label="Desfazer esta ligação"
                    onClick={() => aoDesligar(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aoDesligar(l.id); }
                    }}
                  >
                    <circle r="9" className="traco-alvo" />
                    <circle r="4" className="traco-ponto" />
                    <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" className="traco-x" />
                  </g>
                </g>
              ))}
            </svg>
          )}

          {nos.map((no) => (
            <Nota
              key={no.id}
              no={no}
              aoMover={aoMover}
              aoTirar={aoTirar}
              fio={maoDoFio}
              aoLigarDaLista={setLigandoDaLista}
              alvoDoFio={fio?.sobre === no.nota_id}
              escala={camera.escala}
            />
          ))}
          </div>

          {/* O FIO QUE ESTÁ SENDO PUXADO, por cima de tudo e sem receber toque.
              Fica FORA do plano de propósito: em coordenadas da janela ele não
              precisa saber de câmera nem de escala, e a ponta fica exatamente
              sob o dedo em qualquer zoom.

              A curva é a mesma dos traços já ligados — puxar um fio tem de
              parecer com o que ele vai virar. */}
          {fio && (
            <svg className="canvas-fio" aria-hidden="true">
              <path
                d={`M ${fio.x0} ${fio.y0} C ${fio.x0} ${(fio.y0 + fio.y) / 2}, ${fio.x} ${(fio.y0 + fio.y) / 2}, ${fio.x} ${fio.y}`}
                fill="none"
              />
              <circle cx={fio.x} cy={fio.y} r="4" />
            </svg>
          )}

          {/* O CONTROLE DE ZOOM, do canto do desenho. Ele mostra a porcentagem
              porque "menos" e "mais" sem número não deixam voltar ao tamanho
              original — e voltar é a coisa mais pedida depois de se perder. */}
          <div className="canvas-zoom">
            <button type="button" aria-label="Aproximar" onClick={() => aproximar(0.1)}>+</button>
            <button
              type="button"
              className="canvas-zoom-valor"
              onClick={() => setCamera({ x: 0, y: 0, escala: 1 })}
              title="Voltar ao começo"
            >
              {Math.round(camera.escala * 100)}%
            </button>
            <button type="button" aria-label="Afastar" onClick={() => aproximar(-0.1)}>−</button>
          </div>
        </div>

        {/* A LISTA "LIGAÇÕES N" SAIU. Ela não está no desenho, e o custo dela
            aparecia usando: para desfazer a ligação entre duas notas visíveis na
            tela, era preciso rolar para fora do canvas e achar a linha certa
            entre trinta parecidas. O ponto na junta da curva faz o mesmo gesto
            onde a ligação está. */}
      </section>

      <Folha
        aberta={escrevendo}
        titulo="Escrever uma nota"
        aoFechar={() => setEscrevendo(false)}
        acoes={
          <Botao
            tom="primaria"
            disabled={!texto.trim()}
            onClick={async () => {
              /* A NOTA NASCE ONDE A PESSOA ESTÁ OLHANDO.
               *
               * Era `x: 40, y: 40` — fixo, no canto do PLANO. Quem tivesse
               * andado pela superfície escrevia uma nota e ela nascia longe,
               * fora da tela, sem nada dizendo para onde ela foi. */
              const onde = meioDaVista(375, 120);
              if (await aoTrazer({ texto: texto.trim(), x: onde.x, y: onde.y })) setEscrevendo(false);
            }}
          >
            Pôr na superfície
          </Botao>
        }
      >
        <p>
          Uma nota que nasce aqui, sem livro. Ela vale o mesmo que as outras: dá
          para ligar, mover e encontrar depois.
        </p>
        <Campo
          rotulo="A nota"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
        />

        {/* TRAZER UMA NOTA MORA AQUI AGORA, e não numa quarta ferramenta.
            
            O `900:52962` tem TRÊS itens no dock, e eu tinha quatro. O que saiu
            da barra não sumiu: pôr uma nota na superfície é o mesmo gesto,
            venha ela do teclado ou do acervo — e a escolha entre os dois cabe
            neste passo, que é onde a pessoa já está.
            
            Só aparece quando há o que trazer. Um caminho para lista vazia é uma
            porta que se abre num quarto sem nada. */}
        {deFora.length > 0 && (
          <p className="canvas-ou-trazer">
            Ou{" "}
            <button
              type="button"
              onClick={() => { setEscrevendo(false); setTrazendo(true); }}
            >
              traga uma que você já tem
            </button>{" "}
            — <span className="dado">{deFora.length}</span> ainda estão fora da superfície.
          </p>
        )}
      </Folha>

      {/* A LISTA DE PARA-ONDE-LIGAR — o caminho de teclado do fio. Só as notas
          que ainda não estão ligadas a esta aparecem: oferecer o que já existe
          é oferecer um clique que não faz nada. */}
      <Folha
        aberta={ligandoDaLista !== null}
        titulo="Ligar a qual nota?"
        aoFechar={() => setLigandoDaLista(null)}
      >
        <ul className="canvas-lista-de-ligar">
          {nos
            .filter((o) => o.nota_id !== ligandoDaLista)
            .filter((o) => !ligacoes.some((l) =>
              (l.de_id === ligandoDaLista && l.para_id === o.nota_id) ||
              (l.para_id === ligandoDaLista && l.de_id === o.nota_id)))
            .map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => { aoLigar(ligandoDaLista, o.nota_id); setLigandoDaLista(null); }}
                >
                  {o.texto}
                </button>
              </li>
            ))}
        </ul>
      </Folha>

      {/* ADICIONAR MÍDIA. O que entra é um ENDEREÇO, e o cartão vira a prévia
          dele — título, descrição e capa, lidas no próprio site. O aviso não é
          formalidade: o Mekora precisa IR ATÉ o endereço para montar a prévia, e
          a tela de Privacidade diz isso com todas as letras. */}
      <Folha
        aberta={pondoMidia}
        titulo="Adicionar mídia"
        aoFechar={() => setPondoMidia(false)}
        acoes={
          <Botao
            tom="primaria"
            disabled={!endereco.trim()}
            onClick={async () => {
              const onde = meioDaVista(375, 220);
              if (await aoTrazer({ texto: endereco.trim(), x: onde.x, y: onde.y })) setPondoMidia(false);
            }}
          >
            Pôr na superfície
          </Botao>
        }
      >
        <p>
          Cole o endereço de um vídeo ou de uma página. O cartão vira a prévia
          dele — e para montá-la o Mekora precisa visitar esse endereço.
        </p>
        <Campo
          rotulo="O endereço"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          autoFocus
        />
      </Folha>

      <Folha
        aberta={trazendo}
        titulo="Trazer uma nota"
        aoFechar={() => setTrazendo(false)}
      >
        <p>As notas que você já tem e que ainda não estão na superfície.</p>
        <ul className="trazer-lista">
          {deFora.map((n, i) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={async () => {
                  /* Espalha em diagonal: empilhar tudo em 40,40 esconderia
                     todas menos a última, e a pessoa acharia que só uma veio. */
                  await aoTrazer({ nota_id: n.id, x: 40 + (i % 5) * 40, y: 40 + (i % 5) * 30 });
                  setTrazendo(false);
                }}
              >
                <span className="trazer-marca" style={{ background: DESTAQUES[n.cor] }} />
                <span className="trazer-texto">{n.trecho}</span>
                <span className="trazer-origem">
                  {n.fonte === "kindle" ? `Kindle · ${n.origem}` : n.origem || "do seu livro"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Folha>
    
      {/* SEM RODAPÉ AQUI. O Canvas é uma superfície SEM FIM, e um rodapé com
          links institucionais logo abaixo dela diz que o plano acabou ali — o
          contrário do que a tela é. Nenhuma outra tela de trabalho contínuo tem
          um: a Leitura também não tem. */}
    </div>
  );
}
