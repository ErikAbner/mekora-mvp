import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { usarHistoria } from "../estado/usarHistoria.js";
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
      className={`nota-previa${previa?.video ? " de-video" : ""}`}
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      /* O NAVEGADOR NÃO ARRASTA ISTO. Link e imagem são arrastáveis por padrão:
       * puxar a prévia começava um arrasto NATIVO, que rouba a captura de
       * ponteiro e mata o arrasto da nota no meio. Era a causa do cartão de
       * vídeo se desmanchar e reaparecer em outro lugar. */
      draggable="false"
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
      {/* A CAPA, e o selo de play quando é vídeo.
       *
       * `onError` troca pela menor: o `maxresdefault` do YouTube não existe para
       * todo vídeo — os antigos e os de baixa resolução só têm a média —, e sem
       * a troca o cartão fica com o quadrado vazio de imagem quebrada. Uma vez
       * só, senão um endereço morto dos dois lados vira laço. */}
      {previa?.imagem && (
        <span className={`nota-previa-capa${previa.video ? " de-video" : ""}`}>
          <img
            src={previa.imagem}
            alt=""
            loading="lazy"
            draggable="false"
            /* `onLoad` E `onError`, e o `onLoad` é o que importa.
             *
             * Quando um vídeo não tem `maxresdefault`, o YouTube não responde
             * 404: responde **200** com um retângulo cinza de 120×90 — o
             * "video unavailable". O `onError` nunca dispara, e a capa vira uma
             * mancha cinza esticada. Foi o que apareceu na primeira captura.
             *
             * Quem denuncia é o TAMANHO: uma capa de verdade tem 1280 de
             * largura. Abaixo de 200 é o substituto, e aí vale a menor, que
             * sempre existe. */
            onLoad={(e) => {
              if (previa.imagem_menor && e.currentTarget.naturalWidth < 200) {
                e.currentTarget.src = previa.imagem_menor;
              }
            }}
            onError={(e) => {
              if (previa.imagem_menor && e.currentTarget.src !== previa.imagem_menor) {
                e.currentTarget.src = previa.imagem_menor;
              }
            }}
          />
          {previa.video && <span className="nota-previa-play" aria-hidden="true" />}
        </span>
      )}
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

/* ONDE O DEDO ENCOSTOU: no miolo, ou numa borda?
 *
 * O Erik: "click em itens deveria redimensionar quando o click é nas laterais do
 * objeto, ou então é para mover itens". É o comportamento de toda janela e de
 * todo objeto de canvas, e a mao ja sabe: perto da borda, estica; no meio, anda.
 *
 * A MARGEM É EM PIXELS DE TELA, e por isso ela é dividida pela escala antes de
 * comparar com a caixa — a caixa vem do `getBoundingClientRect`, que já está em
 * pixels de tela. Uma margem em coordenadas do plano encolheria com o zoom até
 * ficar impossível de acertar. */
const BORDA = 10;

/* A malha do plano, em unidades do plano. É a mesma do chão pontilhado: uma área
 * que encosta na malha fica alinhada com o que a pessoa VÊ atrás dela. */
const MALHA_DO_PLANO = 24;

/* Os mesmos limites que o servidor aplica. Aqui para o cartão não passar deles
 * enquanto o dedo ainda está em cima; lá porque um pedido escrito à mão não
 * passa por aqui. */
const limitarLargura = (v) => Math.max(200, Math.min(1200, v));

function ondeEncostou(e, elemento) {
  const c = elemento.getBoundingClientRect();
  const x = e.clientX - c.left;
  const y = e.clientY - c.top;
  const perto = Math.min(BORDA, c.width / 3, c.height / 3);
  const oeste = x < perto;
  const leste = x > c.width - perto;
  const norte = y < perto;
  const sul = y > c.height - perto;
  if (!oeste && !leste && !norte && !sul) return null;
  return `${norte ? "n" : sul ? "s" : ""}${oeste ? "o" : leste ? "l" : ""}`;
}

/* O cursor que cada borda pede. Sem ele a borda estica em silêncio: a pessoa só
 * descobre que dá para esticar depois de esticar sem querer. */
const CURSOR_DA_BORDA = {
  n: "ns-resize", s: "ns-resize", o: "ew-resize", l: "ew-resize",
  no: "nwse-resize", sl: "nwse-resize", nl: "nesw-resize", so: "nesw-resize",
};

/* O MENU DO CARTÃO — três ações num botão só.
 *
 * O Erik: "os itens / botões das notas é horrível". Estava: "Abrir no livro",
 * "Ligar a…" e "Tirar", os três em caixa, na mesma linha de um cartão de 375px.
 * Não cabiam: quebravam em duas linhas e empurravam o rodapé. Três botões
 * competindo pelo mesmo canto do mesmo cartão, vinte vezes na superfície.
 *
 * Um ponto de entrada só, e as ações dentro dele. O cartão volta a ser o texto.
 *
 * ELE ABRE DO LADO DO BOTÃO, e não do lado contrário — o Erik já tinha apontado
 * esse defeito no menu de Leitura. O canto de cima à direita do menu encosta no
 * botão, e a escala parte dali: um popover que cresce do meio parece ter vindo
 * de outro lugar. */
function MenuDoCartao({ children, rotulo = "Ações da nota" }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => { if (e.key === "Escape") setAberto(false); };
    /* `pointerdown` e não `click`: o clique do próprio botão chegaria aqui na
     * mesma volta e fecharia o menu no instante em que ele abre. */
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false); };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", fora);
    };
  }, [aberto]);

  return (
    <span className="nota-menu" ref={caixa}>
      <button
        type="button"
        className="nota-menu-botao"
        aria-label={rotulo}
        aria-expanded={aberto}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setAberto((v) => !v); }}
      >
        <span aria-hidden="true">···</span>
      </button>
      {aberto && (
        <div className="nota-menu-lista" role="menu" onClick={() => setAberto(false)}>
          {children}
        </div>
      )}
    </span>
  );
}

/* MEMOIZADA, e a razão é medida.
 *
 * Arrastar uma nota escreve estado no Canvas a cada quadro — a linha precisa
 * seguir o cartão. Sem `memo`, esse estado redesenha TODAS as notas: com 123
 * cartões na superfície, o pior quadro de um arrasto foi de 66ms, quatro
 * quadros perdidos de uma vez.
 *
 * Com `memo`, só o cartão que mudou redesenha. As funções que chegam por
 * propriedade são todas `useCallback` no pai, senão a comparação nunca casaria
 * e a memoização não valeria nada. */
function NotaCrua({ no, aoMover, aoTirar, aoLigarDaLista, aoMedir, aoSeguir, aoEscolher, fio, alvoDoFio, carregada, escolhido, entreVarios, escala = 1 }) {
  const quando = dataCurta(no.criada_em);
  const caixa = useRef(null);
  const arrasto = useRef(null);
  const [posicao, setPosicao] = useState(null);

  /* O endereço vem do TEXTO da nota. A pessoa cola um link numa nota solta, e o
   * cartão vira a prévia daquele endereço — é o que o 895:6938 mostra. */
  /* NASCEU NA SUPERFÍCIE, sem livro por trás — e são DUAS fontes, não uma.
   *
   * Era só `"solta"`, e a foto entrava com `fonte="midia"`: o rodapé do cartão
   * de foto dizia "do seu livro", que é falso, e a foto ainda ganhava o filete
   * de citação como se fosse trecho de outra pessoa. */
  const daCasa = no.fonte === "solta" || no.fonte === "midia";

  const largura = no.largura || 375;

  const link = linkDe(no.texto);
  /* A nota é só um endereço, e nada mais. */
  const soLink = Boolean(link) && no.texto?.trim() === link;
  const previa = usarPrevia(link);

  /* O NÓ NÃO SAI DO LUGAR NO DOM DURANTE O ARRASTO.
   *
   * O `CLAUDE.md` já pagou esta: mover o nó libera a captura de ponteiro no
   * primeiro pixel — `lostpointercapture` — e o arrasto morre. O que se move é
   * o `transform`, que não mexe na árvore.
   *
   * A posição só vai para o servidor ao SOLTAR. */
  const moveu = useRef(false);

  /* O CARTÃO DIZ O TAMANHO QUE TEM. Só o navegador sabe: a altura vem do texto,
   * da prévia e da legenda, e a largura pode ter sido esticada. Quem desenha os
   * traços precisa da caixa de verdade — ver `medidas` no Canvas. */
  useEffect(() => {
    const el = caixa.current;
    if (!el || !aoMedir) return undefined;
    const olho = new ResizeObserver(() => {
      aoMedir(no.id, { largura: el.offsetWidth, altura: el.offsetHeight });
    });
    olho.observe(el);
    return () => olho.disconnect();
  }, [aoMedir, no.id]);

  const comecar = (e) => {
    if (e.button !== 0) return;
    /* PERTO DA BORDA, ESTICA; no meio, anda. Ver `ondeEncostou`. Só as laterais:
     * a altura do cartão vem do texto, e uma altura fixa cortaria o que a pessoa
     * escreveu. */
    const borda = ondeEncostou(e, e.currentTarget);
    const lado = borda === "o" || borda === "l" ? borda : null;
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
    /* ESCOLHER ACONTECE NO `pointerdown`, e não no clique.
     *
     * Quem aperta um cartão para arrastá-lo espera que ele já esteja escolhido
     * quando o gesto começa — senão a barra de ações aparece só depois de
     * soltar, e o arrasto de vários nunca poderia existir: no `pointerdown` é
     * que se decide quem vai junto. */
    aoEscolher?.(`nota:${no.id}`, { juntando: e.shiftKey || e.metaKey || e.ctrlKey });
    /* SEM CAPTURA DE PONTEIRO. O ARRASTO OUVE A JANELA.
     *
     * Enquanto um elemento tem a captura, o `click` é entregue A ELE e não ao
     * alvo real — então todo botão DENTRO do cartão ficava morto. Medido: o
     * clique em "Tirar" chegava no `article.nota-canvas`, e o `onClick` do botão
     * nunca rodava. Era o "botões não funcionam em nenhum item do canvas".
     *
     * Capturar só depois do limiar tambem nao serve: um arrasto que comeca na
     * BORDA para esticar tira o dedo do cartão nos primeiros pixels, e aí não
     * chega `pointermove` nenhum para cruzar limiar algum. Medido também —
     * esticar parou de funcionar.
     *
     * Ouvir a janela resolve os dois: o movimento chega venha de onde vier, e
     * como não há captura, o clique vai para quem foi clicado. */
    arrasto.current = { x0: e.clientX, y0: e.clientY, mexeu: false, lado };
    window.addEventListener("pointermove", andar);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", abortar);
  };

  const largarOuvintes = () => {
    window.removeEventListener("pointermove", andar);
    window.removeEventListener("pointerup", soltar);
    window.removeEventListener("pointercancel", abortar);
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
    const agora = a.lado ? { ...esticar(a.lado, dx), esticando: true } : { dx, dy };
    setPosicao(agora);
    /* O TRAÇO ANDA JUNTO. Sem isto a linha fica parada enquanto a nota anda, e
     * as duas se reencontram com um salto ao soltar. */
    aoSeguir?.(no.id, agora);
  };

  /* Puxar a borda ESQUERDA cresce para a esquerda: a largura aumenta e a
   * posição recua na mesma medida. Sem o recuo, o cartão inteiro andaria. */
  const esticar = (lado, dx) => {
    if (lado === "l") return { dx: 0, dy: 0, largura: limitarLargura(largura + dx) };
    const nova = limitarLargura(largura - dx);
    return { dx: largura - nova, dy: 0, largura: nova };
  };

  /* CANCELAR NÃO É SOLTAR, e essa diferença era um teleporte.
   *
   * `pointercancel` dizia "o gesto foi interrompido" e eu tratava como se a
   * pessoa tivesse largado a nota — inclusive lendo `clientX` do evento de
   * cancelamento, que chega ZERADO. Medido: dedo andou +168/+112 e o cartão foi
   * parar em −388/−613, do outro lado da tela.
   *
   * Interrompido volta para onde estava. Nada vai para o servidor. */
  const abortar = () => {
    largarOuvintes();
    arrasto.current = null;
    setPosicao(null);
    aoSeguir?.(no.id, null);
  };

  const soltar = (e) => {
    const a = arrasto.current;
    /* `moveu` sobrevive ao fim do arrasto por um instante: o `click` chega
     * DEPOIS do `pointerup`, e sem esta marca ele não teria como saber que
     * acabou de haver um gesto. */
    moveu.current = Boolean(a?.mexeu);
    if (moveu.current) setTimeout(() => { moveu.current = false; }, 0);
    largarOuvintes();
    arrasto.current = null;
    if (!a) return;
    if (a.mexeu) {
      const dx = (e.clientX - a.x0) / escala;
      const dy = (e.clientY - a.y0) / escala;
      if (a.lado) {
        const fim = esticar(a.lado, dx);
        aoMover(no.id, no.x + fim.dx, no.y, fim.largura);
        /* O confirmar do esticar leva o antes e o depois: é o que a história
         * precisa, e ela mora no Canvas porque um gesto pode mexer em vários. */
        aoSeguir?.(no.id, {
          soltou: true, esticou: true,
          antes: { x: no.x, y: no.y, largura },
          depois: { x: no.x + fim.dx, y: no.y, largura: fim.largura },
        });
      } else {
        aoMover(no.id, no.x + dx, no.y + dy);
        /* `soltou` leva os acompanhantes ao servidor com o mesmo passo. */
        aoSeguir?.(no.id, { dx, dy, soltou: true });
      }
    } else {
      aoSeguir?.(no.id, null);
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
    inlineSize: posicao?.largura ?? largura,
    /* `carregada` é o passo que a ÁREA está dando com a nota dentro dela. Soma
     * com o arrasto próprio porque os dois são deslocamentos do mesmo cartão. */
    transform:
      posicao || carregada
        ? `translate(${(posicao?.dx ?? 0) + (carregada?.dx ?? 0)}px, ${(posicao?.dy ?? 0) + (carregada?.dy ?? 0)}px)`
        : undefined,
    /* Enquanto arrasta, a nota sobe: passar por baixo de outra faria parecer
       que ela sumiu. */
    zIndex: posicao ? 10 : undefined,
  };

  return (
    <article
      ref={caixa}
      className={`nota-canvas${posicao ? " movendo" : ""}${alvoDoFio ? " alvo-do-fio" : ""}${escolhido ? " escolhido" : ""}${escolhido && entreVarios ? " entre-varios" : ""}`}
      /* O arrumo precisa da ALTURA REAL de cada cartão, que só o navegador sabe:
       * ela depende do texto, da prévia e do comentário. O id no DOM é como a
       * medida encontra de quem é cada caixa. Ver `organizar`. */
      data-no={no.id}
      data-nota={no.nota_id}
      style={estilo}
      onClickCapture={talvezCancelarClique}
      onPointerDown={comecar}
      /* O movimento é ouvido na JANELA — ver `comecar`. Aqui fica só o cursor,
         que precisa do ponteiro sobre o cartão para ter o que dizer. */
      onPointerMove={(e) => {
        if (arrasto.current) return;
        const borda = ondeEncostou(e, e.currentTarget);
        e.currentTarget.style.cursor = borda === "o" || borda === "l" ? "ew-resize" : "grab";
      }}
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
      {/* A IMAGEM QUE A PESSOA SUBIU. Vem antes do texto porque, num cartão de
          mídia, o texto é a legenda dela — e legenda embaixo é onde se procura.
          A proporção sai do tamanho guardado no servidor, então o cartão já
          nasce com a altura certa e a superfície não dá um pulo quando a imagem
          chega. */}
      {no.midia && (
        <img
          className="nota-imagem"
          src={`/canvas/midia/${no.midia.token}`}
          alt={no.texto || "Imagem sem legenda"}
          width={no.midia.largura}
          height={no.midia.altura}
          draggable="false"
          loading="lazy"
        />
      )}
      {/* O TEXTO NAO REPETE O ENDERECO. Quando a nota inteira é um link, a prévia
          logo abaixo já mostra título, canal e capa — deixar a URL crua acima
          dela é o mesmo endereço duas vezes, e a versão crua é a pior das duas.
          Nota com texto E link continua mostrando o texto. */}
      {no.midia ? (
        no.texto && <p className="nota-legenda">{no.texto}</p>
      ) : soLink ? null : daCasa ? (
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
          {no.fonte === "midia"
            ? "posta aqui"
            : daCasa
            ? "escrita aqui"
            : [no.origem || "do seu livro", no.capitulo > 0 && `cap. ${no.capitulo}`]
                .filter(Boolean)
                .join(" · ")}
        </span>
        {quando && <span className="nota-quando">{quando}</span>}
        <span className="nota-acoes">
          <MenuDoCartao>
            {no.job_id && (
              <Link to={`/leitura/${no.job_id}`} role="menuitem">
                Abrir no livro
              </Link>
            )}
            {/* LIGAR PELO TECLADO. As pegas das bordas são gesto de ponteiro e
                nada mais: quem navega por teclado não tem como puxar um fio, e
                sem esta porta a ligação teria virado um recurso só de quem usa
                mouse. Ela abre uma lista das outras notas — nenhum modo, nenhum
                estado novo na superfície. */}
            <button type="button" role="menuitem" onClick={() => aoLigarDaLista(no.nota_id)}>
              Ligar a…
            </button>
            {/* TIRAR não apaga: a nota continua na estante e no caderno. O rótulo
                diz "tirar" e não "apagar" por isso. */}
            <button type="button" role="menuitem" onClick={() => aoTirar(no.id)}>
              Tirar
            </button>
          </MenuDoCartao>
        </span>
      </footer>
    </article>
  );
}


const Nota = memo(NotaCrua);

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
function Grupo({ grupo, aoMudar, aoApagar, escala, nasceuAgora = 0, aoLevar, aoEscolher, escolhido }) {
  const arrasto = useRef(null);
  const [desloca, setDesloca] = useState(null);
  const [medindo, setMedindo] = useState(null);
  const [editando, setEditando] = useState(false);

  /* NASCEU AGORA: abre pedindo o nome. O carimbo de tempo entra nas dependências
   * para que dois grupos seguidos disparem duas vezes — um booleano já ligado
   * não dispara. */
  useEffect(() => { if (nasceuAgora) setEditando(true); }, [nasceuAgora]);

  /* O CLIQUE MORRE SE HOUVE ARRASTO — o mesmo truque da nota. Sem isto, arrastar
   * o grupo pelo nome abriria o campo de edição ao soltar. */
  const moveu = useRef(false);

  const focarUmaVez = useCallback((el) => {
    if (el) { el.focus(); el.select(); }
  }, []);

  const pegar = (e, qual) => {
    if (e.button !== 0) return;
    /* Mesma razão da nota: o chão não pode roubar este gesto. */
    e.stopPropagation();
    aoEscolher?.(`secao:${grupo.id}`, { juntando: e.shiftKey || e.metaKey || e.ctrlKey });
    /* Mesma razão da nota: captura mataria o botão do nome e o "Desfazer grupo",
     * porque o clique vai para quem capturou. O movimento é ouvido na janela. */
    arrasto.current = { qual, x0: e.clientX, y0: e.clientY, mexeu: false };
    window.addEventListener("pointermove", andar);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", abortar);
  };

  const largarOuvintes = () => {
    window.removeEventListener("pointermove", andar);
    window.removeEventListener("pointerup", soltar);
    window.removeEventListener("pointercancel", abortar);
  };

  /* AS QUATRO BORDAS ESTICAM, e não só o canto.
   *
   * A área tinha um triângulo no canto inferior direito e mais nada: para
   * alargar sem alterar a altura era preciso esticar as duas e corrigir. Cada
   * borda mexe no que ela toca, e as de cima e da esquerda mexem TAMBÉM na
   * posição — puxar a borda esquerda para a esquerda cresce para aquele lado, e
   * não faz o retângulo inteiro andar. */
  const esticar = (borda, dx, dy) => {
    const mudanca = {};
    if (borda.includes("l")) mudanca.largura = Math.max(LADO_MINIMO, grupo.largura + dx);
    if (borda.includes("o")) {
      const largura = Math.max(LADO_MINIMO, grupo.largura - dx);
      mudanca.largura = largura;
      mudanca.x = grupo.x + (grupo.largura - largura);
    }
    if (borda.includes("s")) mudanca.altura = Math.max(LADO_MINIMO, grupo.altura + dy);
    if (borda.includes("n")) {
      const altura = Math.max(LADO_MINIMO, grupo.altura - dy);
      mudanca.altura = altura;
      mudanca.y = grupo.y + (grupo.altura - altura);
    }
    return mudanca;
  };

  const andar = (e) => {
    const a = arrasto.current;
    if (!a) return;
    /* Dividido pela escala pelo mesmo motivo da nota: o dedo anda em pixels de
     * tela, e a área vive em coordenadas do plano. */
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (!a.mexeu && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < LIMIAR) return;
    if (!a.mexeu && a.qual === "mover") aoLevar?.(grupo.id, { dx: 0, dy: 0 });
    a.mexeu = true;
    if (a.qual === "mover") {
      setDesloca({ dx, dy });
      /* A ÁREA LEVA O QUE ESTÁ DENTRO DELA. Ver `grupoVivo` no Canvas: quem
       * decide de quem é cada nota é a geometria, e ela é lida uma vez, no
       * começo do gesto. */
      aoLevar?.(grupo.id, { dx, dy });
    } else setMedindo(esticar(a.qual, dx, dy));
  };

  /* Mesma razão da nota: interrompido volta, e não confirma. */
  const abortar = () => {
    largarOuvintes();
    arrasto.current = null;
    setDesloca(null);
    setMedindo(null);
    aoLevar?.(grupo.id, null);
  };

  const soltar = (e) => {
    const a = arrasto.current;
    moveu.current = Boolean(a?.mexeu);
    if (moveu.current) setTimeout(() => { moveu.current = false; }, 0);
    largarOuvintes();
    arrasto.current = null;
    setDesloca(null);
    setMedindo(null);
    if (!a || !a.mexeu) { aoLevar?.(grupo.id, null); return; }
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (a.qual === "mover") {
      /* ENCOSTA NA MALHA AO SOLTAR, e não durante o gesto: um imã que age
       * enquanto o dedo anda faz a área grudar e escapar, e a mão sente que
       * perdeu o controle. No fim, ele só arruma o resto. */
      const px = Math.round((grupo.x + dx) / MALHA_DO_PLANO) * MALHA_DO_PLANO;
      const py = Math.round((grupo.y + dy) / MALHA_DO_PLANO) * MALHA_DO_PLANO;
      aoLevar?.(grupo.id, { dx: px - grupo.x, dy: py - grupo.y, soltou: true });
      aoMudar(grupo.id, { x: px, y: py });
    } else {
      aoLevar?.(grupo.id, null);
      aoMudar(grupo.id, esticar(a.qual, dx, dy));
    }
  };

  const talvezCancelarClique = (e) => {
    if (moveu.current) { e.preventDefault(); e.stopPropagation(); }
  };

  const estilo = {
    left: medindo?.x ?? grupo.x,
    top: medindo?.y ?? grupo.y,
    width: medindo?.largura ?? grupo.largura,
    height: medindo?.altura ?? grupo.altura,
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
    <section
      className={`canvas-grupo${escolhido ? " escolhido" : ""}`}
      style={estilo}
      aria-label={grupo.nome || "Grupo sem nome"}
    >
      <header
        className="canvas-grupo-titulo"
        onPointerDown={(e) => pegar(e, "mover")}
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
             * nada. O callback roda com o nó já no documento.
             *
             * E ELE SÓ FOCA UMA VEZ. Escrito solto, o callback roda a CADA
             * desenho: mover a câmera com o campo aberto devolvia o foco e dava
             * `select()` de novo, e a próxima tecla apagava o nome inteiro.
             * `useCallback` sem dependências faz a função ser a mesma entre
             * desenhos, e o React só a chama quando o nó entra ou sai. */
            ref={focarUmaVez}
            maxLength={120}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => { setEditando(false); if (e.target.value !== grupo.nome) aoMudar(grupo.id, { nome: e.target.value }); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditando(false); }}
          />
        ) : (
          /* SEM `stopPropagation` AQUI, e essa foi a razão de o grupo não se
             mover. O nome ocupa a ponta esquerda da faixa e "Desfazer grupo" a
             direita, e os dois barravam o gesto: sobrava o vazio do meio. O Erik
             pegou pelo nome, como qualquer um pegaria, e o que aconteceu foi o
             navegador SELECIONAR o texto — dá para ver na captura dele.
             
             Agora arrastar pelo nome move o grupo, e o clique parado abre a
             edição. `onClickCapture` cancela o clique quando houve arrasto. */
          <button
            type="button"
            className="canvas-grupo-nome"
            onClickCapture={talvezCancelarClique}
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
      {/* A MOLDURA QUE ESTICA — uma faixa de 10px em volta da área, e nada no
          meio. O meio continua sem receber o ponteiro: arrastar ali move a NOTA
          que está por cima, que é o que a pessoa espera. */}
      <div
        className="canvas-grupo-area"
        /* O MIOLO DA ÁREA ARRASTA, e não só a faixa do nome.
         *
         * Antes, a única pegada era uma faixa de 30px no topo — o corpo da área
         * era `pointer-events: none` e não fazia nada. Mover um retângulo de
         * 480×320 exigindo acertar 30px dele é o que fazia o gesto parecer duro.
         *
         * As notas continuam ganhando: elas são desenhadas por cima, então um
         * toque sobre um cartão vai para o cartão. O miolo vazio é da área. */
        onPointerDown={(e) => pegar(e, ondeEncostou(e, e.currentTarget) || "mover")}
        /* Só o cursor mora aqui: o movimento é ouvido na janela. */
        onPointerMove={(e) => {
          if (arrasto.current) return;
          const borda = ondeEncostou(e, e.currentTarget);
          e.currentTarget.style.cursor = borda ? CURSOR_DA_BORDA[borda] : "grab";
        }}
      />
    </section>
  );
}

export function Canvas({ nos = [], ligacoes = [], grupos = [], notas = [], erro, aoTrazer, aoTrazerMidia, aoMover, aoTirar, aoLigar, aoDesligar, aoAgrupar, aoMudarArea, aoDesagrupar }) {
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
  const [foto, setFoto] = useState(null);
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
  /* O TAMANHO REAL DE CADA CARTÃO, medido no navegador.
   *
   * As pontas do traço saíam de duas CONSTANTES — 375 por uma altura fixa —, e
   * nenhuma das duas é verdade: a largura agora é esticável e a altura vem do
   * texto, da prévia e da legenda. Com a caixa errada, a linha nascia longe do
   * cartão e o ponto do meio ficava boiando: é a "bola que descola do item" que
   * o Erik viu, e ela transmitia bug porque ERA bug. */
  const [medidas, setMedidas] = useState({});
  const anotarMedida = useCallback((id, caixa) => {
    setMedidas((m) => {
      const antes = m[id];
      if (antes && antes.largura === caixa.largura && antes.altura === caixa.altura) return m;
      return { ...m, [id]: caixa };
    });
  }, []);

  /* ONDE A NOTA ESTÁ AGORA, e não onde o servidor acha que ela está.
   *
   * "Linhas duras que não acompanham movimento": as pontas vinham de `nos`, que
   * só muda ao SOLTAR. Enquanto o dedo arrastava, a nota andava e a linha ficava
   * parada — e as duas se reencontravam com um salto no fim. */
  /* A ESCOLHA — o primitivo que faltava.
   *
   * O Erik: "selection needs to become a real Canvas primitive, not something
   * implemented only to enable Create Section". Por isso ela guarda CHAVES
   * COMPOSTAS — `nota:12`, `secao:3`, e amanhã `livro:7` — e não ids de nota: o
   * conjunto tem de valer para qualquer objeto da superfície sem que nenhuma
   * parte dele saiba que tipos existem.
   *
   * `Set` e não array: as três perguntas que se faz o tempo todo são "está
   * escolhido?", "entra" e "sai", e as três são O(1) nele. */
  /* A HISTÓRIA. Um gesto inteiro é um passo; ver `usarHistoria`. Os passos são
   * registrados no CONFIRMAR de cada gesto — nunca durante a previsão. */
  /* AS DUAS LISTAS VIVAS, para funções estáveis lerem sem virar dependência.
   * Ver a razão medida em `seguirArrasto`. */
  const escolhaRef = useRef(null);
  const nosRef = useRef(nos);
  nosRef.current = nos;

  const historia = usarHistoria();

  /* O QUE MUDOU, dito em uma linha, quando se desfaz ou refaz. Sem isto,
   * `⌘Z` mexe em coisa que pode estar fora da tela e nada avisa que mexeu. */
  const [recadoDaHistoria, setRecadoDaHistoria] = useState(null);
  const relogioDoRecado = useRef(null);
  const avisar = useCallback((texto) => {
    setRecadoDaHistoria(texto);
    clearTimeout(relogioDoRecado.current);
    relogioDoRecado.current = setTimeout(() => setRecadoDaHistoria(null), 3000);
  }, []);

  /* MOVER É O PASSO MAIS COMUM, e todos os gestos que mexem em posição ou
   * largura cabem nesta forma: uma lista de "este nó estava assim, ficou
   * assado". Multi-arrasto, carregar uma seção e esticar um cartão são todos
   * ela, com listas de tamanhos diferentes. */
  const registrarMovimento = useCallback((rotulo, mudancas) => {
    if (!mudancas.length) return;
    historia.registrar({
      rotulo,
      desfazer: () => mudancas.forEach((m) => aoMover(m.id, m.antes.x, m.antes.y, m.antes.largura)),
      refazer: () => mudancas.forEach((m) => aoMover(m.id, m.depois.x, m.depois.y, m.depois.largura)),
    });
  }, [historia, aoMover]);

  const [escolha, setEscolha] = useState(() => new Set());
  escolhaRef.current = escolha;

  const escolher = useCallback((chave, { juntando = false } = {}) => {
    setEscolha((atual) => {
      if (!juntando) {
        /* Já escolhido e sozinho: o clique não faz nada, e é o certo — clicar
         * de novo no que já está escolhido não deveria desescolher. */
        if (atual.size === 1 && atual.has(chave)) return atual;
        return new Set([chave]);
      }
      const nova = new Set(atual);
      if (nova.has(chave)) nova.delete(chave); else nova.add(chave);
      return nova;
    });
  }, []);

  const limparEscolha = useCallback(() => {
    setEscolha((atual) => (atual.size ? new Set() : atual));
  }, []);

  const tirarEscolhidos = useCallback(() => {
    /* O QUE ESTAVA LÁ, guardado antes de sumir: sem a posição e o `nota_id`, não
     * há como trazer de volta. É a diferença entre desfazer e "criar de novo". */
    const notas = [];
    const secoes = [];
    for (const chave of escolha) {
      const [tipo, id] = chave.split(":");
      if (tipo === "nota") {
        const n = nosRef.current.find((x) => x.id === Number(id));
        if (n) { notas.push({ nota_id: n.nota_id, x: n.x, y: n.y }); aoTirar(n.id); }
      }
      if (tipo === "secao") {
        const g = grupos.find((x) => x.id === Number(id));
        if (g) { secoes.push({ nome: g.nome, x: g.x, y: g.y, largura: g.largura, altura: g.altura }); aoDesagrupar(g.id); }
      }
    }
    limparEscolha();
    if (!notas.length && !secoes.length) return;
    historia.registrar({
      rotulo: notas.length + secoes.length > 1 ? `${notas.length + secoes.length} tirados` : "Tirado da superfície",
      /* DESFAZER TRAZ DE VOLTA COM ID NOVO. A nota é a mesma — o que se recria é
       * a POSIÇÃO dela na superfície, que é o que "tirar" apagou. Para a seção,
       * o objeto em si é recriado, e o id muda: um refazer encadeado depois disso
       * não encontraria a seção antiga. Está anotado em docs/CANVAS.md. */
      desfazer: async () => {
        for (const n of notas) await aoTrazer(n);
        for (const g of secoes) await aoAgrupar(g);
      },
      refazer: () => {},
    });
  }, [escolha, aoTirar, aoDesagrupar, limparEscolha, grupos, historia, aoTrazer, aoAgrupar]);

  /* O TECLADO CHEGA NA ESCOLHA. `Esc` larga tudo; `Delete` e `Backspace` tiram
   * da superfície o que estiver escolhido.
   *
   * TIRAR NÃO APAGA: a nota continua na estante e no caderno, e é a mesma
   * distinção que o rótulo do menu já faz. Por isso a tecla não pede confirmação
   * — ela não destrói nada.
   *
   * Digitando, as teclas são do campo: sem esta guarda, apagar uma letra do nome
   * de uma seção tiraria uma nota da superfície. */
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.target.closest?.("input, textarea, [contenteditable=true]")) return;
      /* `⌘Z` desfaz, `⌘⇧Z` refaz. `metaKey` no Mac e `ctrlKey` no resto — os dois
       * aceitos, porque quem usa teclado externo troca de máquina sem trocar de
       * dedo. */
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        (e.shiftKey ? historia.refazer() : historia.desfazer()).then((rotulo) => {
          if (rotulo) avisar(`${e.shiftKey ? "Refeito" : "Desfeito"}: ${rotulo.toLowerCase()}`);
        });
        return;
      }
      if (e.key === "Escape") { limparEscolha(); return; }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!escolha.size) return;
      e.preventDefault();
      tirarEscolhidos();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [escolha, limparEscolha, tirarEscolhidos, historia, avisar]);


  const [vivo, setVivo] = useState(null);

  /* OS ESCOLHIDOS ANDAM JUNTOS.
   *
   * Arrastar um cartão que faz parte de uma escolha múltipla leva os outros — é
   * a razão principal de a escolha existir, e o Erik pediu "moving selected
   * objects together" com todas as letras.
   *
   * O caminho é o MESMO que a seção já usa para carregar o que está dentro
   * dela: um deslocamento vivo com uma lista de quem acompanha. Duas mecânicas
   * diferentes para "estes objetos andam com aquele" seria duas verdades sobre a
   * mesma coisa. */
  const acompanhantes = useRef([]);

  /* A ESCOLHA E A LISTA DE NÓS CHEGAM POR `ref`, e não por dependência.
   *
   * `seguirArrasto` vai como propriedade para as 123 notas memoizadas. Com
   * `escolha` e `nos` nas dependências, a função troca de identidade toda vez
   * que alguém é escolhido — e o `memo` de todas as notas quebra de uma vez, no
   * `pointerdown`, que é justamente o quadro em que a mão está esperando
   * resposta.
   *
   * MEDIDO: com as dependências, o pior quadro de um arrasto com 123 cartões
   * voltou de 17,4ms para 83,9ms. Com `ref`, a função é a mesma para sempre e o
   * conteúdo dela continua atual. */
  const seguirArrasto = useCallback((id, desloca) => {
    setVivo(desloca ? { id, ...desloca } : null);

    if (!desloca) {
      acompanhantes.current = [];
      setLevando(null);
      return;
    }
    /* A lista é fixada no primeiro quadro do gesto: recalcular a cada quadro
     * faria a escolha mudar de tamanho enquanto o dedo anda. */
    if (!acompanhantes.current.length) {
      acompanhantes.current = escolhaRef.current.has(`nota:${id}`)
        ? [...escolhaRef.current]
            .filter((c) => c.startsWith("nota:") && c !== `nota:${id}`)
            .map((c) => Number(c.split(":")[1]))
        : [];
    }
    /* A GUARDA DOS ACOMPANHANTES NÃO PODE VIR ANTES DO CONFIRMAR — e vinha.
     *
     * Arrastando um cartão sozinho, a lista de acompanhantes é vazia, a função
     * saía aqui, e o passo NUNCA era registrado: `⌘Z` não devolvia o cartão.
     * Medido — arrasto de 160 para 304, desfazer deixou em 304.
     *
     * Confirmar é sobre o gesto, e não sobre quem foi junto. */
    if (desloca.soltou) {
      const mudancas = [];
      if (desloca.esticou) {
        mudancas.push({ id, antes: desloca.antes, depois: desloca.depois });
      } else {
        /* `nosRef` AINDA TEM O VALOR DE ANTES.
         *
         * O cartão chama `aoMover` e só depois confirma aqui, e `setNos` é
         * assíncrono — então o que se lê agora é a posição de origem. É o que a
         * história quer para o `antes`; o `depois` sai da soma, e não da leitura. */
        const eu = nosRef.current.find((x) => x.id === id);
        if (eu) {
          mudancas.push({
            id,
            antes: { x: eu.x, y: eu.y, largura: eu.largura },
            depois: { x: eu.x + desloca.dx, y: eu.y + desloca.dy, largura: eu.largura },
          });
        }
      }
      for (const outro of acompanhantes.current) {
        const n = nosRef.current.find((x) => x.id === outro);
        if (!n) continue;
        aoMover(outro, n.x + desloca.dx, n.y + desloca.dy);
        mudancas.push({
          id: outro,
          antes: { x: n.x, y: n.y, largura: n.largura },
          depois: { x: n.x + desloca.dx, y: n.y + desloca.dy, largura: n.largura },
        });
      }
      registrarMovimento(
        desloca.esticou ? "Cartão esticado" : mudancas.length > 1 ? `${mudancas.length} movidos` : "Cartão movido",
        mudancas,
      );
      acompanhantes.current = [];
      setLevando(null);
      return;
    }
    if (!acompanhantes.current.length) return;
    setLevando({ id: `escolha:${id}`, dx: desloca.dx, dy: desloca.dy, filhos: acompanhantes.current });
  }, [aoMover, registrarMovimento]);

  /* A ÁREA LEVA O QUE ESTÁ DENTRO DELA — e antes ela não levava nada.
   *
   * Medido: arrastar o grupo 144px deixou a nota de dentro parada em 0. Um
   * retângulo que desliza por baixo do próprio conteúdo não é um contêiner; é
   * um desenho. Era o defeito de fundo do "mover grupo é ruim", e nenhuma
   * animação o consertaria.
   *
   * QUEM É DE QUEM SAI DA GEOMETRIA, e não de uma coluna no banco. É a decisão
   * que já estava no modelo (`GrupoCanvas` não guarda a lista de notas), e ela
   * está certa: com a lista guardada, arrastar uma nota para dentro da área
   * deixaria duas verdades — dentro na tela, fora na tabela.
   *
   * A lista é lida UMA VEZ, no começo do gesto, e não a cada quadro: durante o
   * arrasto a área passa por cima de outras notas, e recalcular faria a área ir
   * catando gente pelo caminho. */
  const [levando, setLevando] = useState(null);
  const filhosDe = useCallback(
    (grupo) =>
      nos
        .filter((n) => {
          const m = medidas[n.id] ?? { largura: n.largura || 375, altura: 200 };
          const cx = n.x + m.largura / 2;
          const cy = n.y + m.altura / 2;
          /* O CENTRO decide, e não a caixa inteira. Exigir a nota toda dentro
           * deixaria de fora qualquer cartão que encoste na borda — e é
           * justamente ali que as pessoas encostam. */
          return cx >= grupo.x && cx <= grupo.x + grupo.largura
            && cy >= grupo.y && cy <= grupo.y + grupo.altura;
        })
        .map((n) => n.id),
    [nos, medidas],
  );

  const levarGrupo = useCallback((grupoId, desloca) => {
    if (!desloca) { setLevando(null); return; }
    setLevando((atual) => {
      const filhos = atual?.id === grupoId ? atual.filhos : filhosDe(grupos.find((g) => g.id === grupoId) ?? {});
      if (desloca.soltou) {
        /* No fim do gesto, cada nota vai para o servidor com o mesmo passo que a
         * área deu — e a área mais tudo que ela levou viram UM passo da história.
         * Desfazer um arrasto de seção tem de devolver a seção E o conteúdo. */
        const g = grupos.find((x) => x.id === grupoId);
        const mudancas = [];
        for (const id of filhos) {
          const n = nos.find((x) => x.id === id);
          if (!n) continue;
          aoMover(id, n.x + desloca.dx, n.y + desloca.dy);
          mudancas.push({
            id, antes: { x: n.x, y: n.y, largura: n.largura },
            depois: { x: n.x + desloca.dx, y: n.y + desloca.dy, largura: n.largura },
          });
        }
        if (g) {
          const antes = { x: g.x, y: g.y };
          const depois = { x: g.x + desloca.dx, y: g.y + desloca.dy };
          historia.registrar({
            rotulo: filhos.length ? `Seção e ${filhos.length} movidos` : "Seção movida",
            desfazer: () => {
              aoMudarArea(grupoId, antes);
              mudancas.forEach((m) => aoMover(m.id, m.antes.x, m.antes.y, m.antes.largura));
            },
            refazer: () => {
              aoMudarArea(grupoId, depois);
              mudancas.forEach((m) => aoMover(m.id, m.depois.x, m.depois.y, m.depois.largura));
            },
          });
        }
        return null;
      }
      return { id: grupoId, dx: desloca.dx, dy: desloca.dy, filhos };
    });
  }, [filhosDe, grupos, nos, aoMover, aoMudarArea, historia]);

  const tracos = useMemo(() => {
    const linhas = [];
    const pontas = [];
    const caixaDe = (n) => {
      const m = medidas[n.id] ?? { largura: n.largura || 375, altura: 200 };
      const desloca = vivo?.id === n.id ? vivo : null;
      return {
        x: n.x + (desloca?.dx ?? 0),
        y: n.y + (desloca?.dy ?? 0),
        largura: desloca?.largura ?? m.largura,
        altura: m.altura,
      };
    };

    for (const l of ligacoes) {
      const a = nos.find((n) => n.nota_id === l.de_id);
      const b = nos.find((n) => n.nota_id === l.para_id);
      if (!a || !b) continue;
      const ca = caixaDe(a);
      const cb = caixaDe(b);

      /* A LINHA SAI DA BORDA VOLTADA PARA A OUTRA NOTA, e não do centro.
       *
       * Do centro, ela nasce debaixo do cartão e só aparece depois de atravessá-lo
       * — parece que o traço vem de dentro do papel. Da borda, ela encosta onde
       * a pega de ligação está, que é de onde a pessoa a puxou.
       *
       * E O EIXO É ESCOLHIDO, não fixo. Só com alças horizontais, duas notas
       * empilhadas ganhavam uma curva que voltava por cima de si mesma — medido,
       * um laço. As pegas são quatro; a linha usa o par que a geometria pede:
       * lado a lado sai pelas laterais, uma sobre a outra sai por cima e por
       * baixo. */
      const cxA = ca.x + ca.largura / 2;
      const cyA = ca.y + ca.altura / 2;
      const cxB = cb.x + cb.largura / 2;
      const cyB = cb.y + cb.altura / 2;
      /* O EIXO SAI DO VÃO ENTRE AS CAIXAS, e não da distância entre os centros.
       *
       * Pelos centros, dois cartões quase empilhados davam `deitado` por uma
       * margem de sete pixels — porque metade da largura de cada um entra na
       * conta — e a curva saía pelas laterais com alças de 40px que se cruzavam:
       * um laço. Medido: `C 575 …, 520 …` com a linha começando em 535.
       *
       * O vão é a distância entre as BORDAS. Ele responde a pergunta certa: por
       * onde estes dois cartões se olham? */
      const vaoX = Math.max(cb.x - (ca.x + ca.largura), ca.x - (cb.x + cb.largura));
      const vaoY = Math.max(cb.y - (ca.y + ca.altura), ca.y - (cb.y + cb.altura));
      const deitado = vaoX >= vaoY;

      let x1, y1, x2, y2, c1x, c1y, c2x, c2y;
      /* A CORDA PESA. O Erik: "elas deveriam ter gravidade e pender".
       *
       * A alça reta sozinha desenha o cabo de diagrama de nós — correto e sem
       * peso. Somando uma queda às duas alças, a curva afunda no meio como um
       * fio pendurado entre dois pontos: quanto mais longe as notas, mais ele
       * cede, com teto para não virar um U.
       *
       * Não é uma catenária de verdade. Uma Bézier cúbica com as duas alças
       * baixadas na mesma medida é indistinguível dela nesta escala, e custa uma
       * conta em vez de um integrador. */
      const vao = Math.hypot(cxB - cxA, cyB - cyA);
      const peso = Math.min(72, Math.max(14, vao * 0.16));

      if (deitado) {
        const paraDireita = cxA <= cxB;
        x1 = paraDireita ? ca.x + ca.largura : ca.x;
        x2 = paraDireita ? cb.x : cb.x + cb.largura;
        y1 = cyA;
        y2 = cyB;
        /* A alça nunca passa da metade do vão: passando, os dois pontos de
         * controle se cruzam e a curva volta por cima de si mesma. */
        const alca = Math.min(160, Math.max(16, Math.abs(x2 - x1) / 2));
        c1x = x1 + (paraDireita ? alca : -alca);
        c2x = x2 + (paraDireita ? -alca : alca);
        c1y = y1 + peso;
        c2y = y2 + peso;
      } else {
        const paraBaixo = cyA <= cyB;
        y1 = paraBaixo ? ca.y + ca.altura : ca.y;
        y2 = paraBaixo ? cb.y : cb.y + cb.altura;
        x1 = cxA;
        x2 = cxB;
        const alca = Math.min(160, Math.max(16, Math.abs(y2 - y1) / 2));
        c1x = x1;
        c2x = x2;
        /* De cima para baixo o peso ACOMPANHA o sentido; de baixo para cima ele
         * encurta a alça em vez de esticá-la, senão a corda subiria — e corda
         * não sobe. */
        c1y = y1 + (paraBaixo ? alca : -alca) + peso;
        c2y = y2 + (paraBaixo ? -alca : alca) + peso;
      }

      linhas.push({
        id: l.id,
        d: `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`,
        /* O meio da curva, para o alvo de desfazer. Numa Bézier cúbica, t=0,5 é
         * a média ponderada 1-3-3-1 dos quatro pontos. */
        mx: (x1 + 3 * c1x + 3 * c2x + x2) / 8,
        my: (y1 + 3 * c1y + 3 * c2y + y2) / 8,
      });
      pontas.push([x1, y1], [x2, y2], [c1x, c1y], [c2x, c2y]);
    }
    if (!linhas.length) return null;

    /* A CAIXA DO SVG saía com `NaN`: ela era montada a partir de `l.x1`/`l.x2`,
     * que nunca foram guardados no objeto da linha. O navegador descartava a
     * regra inteira e o SVG ficava do tamanho que desse — funcionava por sorte. */
    const xs = pontas.map((p) => p[0]);
    const ys = pontas.map((p) => p[1]);
    const x = Math.min(...xs) - FOLGA;
    const y = Math.min(...ys) - FOLGA;
    return {
      x, y,
      largura: Math.max(...xs) - x + FOLGA,
      altura: Math.max(...ys) - y + FOLGA,
      linhas,
    };
  }, [ligacoes, nos, medidas, vivo]);

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
    const encaixar = (v) => Math.round(v / MALHA_DO_PLANO) * MALHA_DO_PLANO;

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
        y += MALHA_DO_PLANO;
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

  /* O ESPAÇO É QUEM ARRASTA A SUPERFÍCIE, e não o clique.
   *
   * Antes, arrastar em qualquer lugar vazio deslocava a câmera. O Erik: "click
   * na tela desloca... pra mim esses padrões não estão certos; pra deslocar na
   * tela, segurando espaço". Ele tem razão, e a razão não é gosto: o clique
   * arrastado no vazio é o gesto de SELECIONAR uma área em toda ferramenta deste
   * tipo, e gastá-lo com deslocamento fecha essa porta. Segurar espaço é o que o
   * Figma, o Miro e o Sketch fazem, e é o que a mão já sabe.
   *
   * O botão do meio também arrasta, que é o outro padrão da casa — quem tem
   * mouse de três botões não precisa da outra mão.
   *
   * A JANELA PERDENDO O FOCO SOLTA O ESPAÇO. Sem isso, trocar de aba com a tecla
   * apertada volta com a superfície presa em modo de arrasto e nenhum jeito
   * óbvio de sair: o `keyup` acontece na outra janela e nunca chega aqui. */
  const [espaco, setEspaco] = useState(false);
  useEffect(() => {
    const desce = (e) => {
      if (e.code !== "Space" || e.repeat) return;
      /* Escrevendo, espaço é espaço. */
      if (e.target.closest?.("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      setEspaco(true);
    };
    const sobe = (e) => { if (e.code === "Space") setEspaco(false); };
    const larga = () => setEspaco(false);
    window.addEventListener("keydown", desce);
    window.addEventListener("keyup", sobe);
    window.addEventListener("blur", larga);
    return () => {
      window.removeEventListener("keydown", desce);
      window.removeEventListener("keyup", sobe);
      window.removeEventListener("blur", larga);
    };
  }, []);

  /* O LAÇO — arrastar no vazio escolhe o que ele cobrir.
   *
   * Este é o gesto que eu tinha deixado vago de propósito ao tirar o
   * deslocamento do clique simples: numa superfície espacial, arrastar no vazio
   * é SELECIONAR, e o deslocamento é do espaço. Ele vive em coordenadas da
   * janela, como o fio, para não precisar saber de câmera nem de escala. */
  const [laco, setLaco] = useState(null);
  const lacoVivo = useRef(null);

  const lacoDesce = (e) => {
    if (e.button !== 0 || espaco) return;
    const caixa = mundo.current.getBoundingClientRect();
    const novo = { x0: e.clientX - caixa.left, y0: e.clientY - caixa.top, x: e.clientX - caixa.left, y: e.clientY - caixa.top, mexeu: false };
    lacoVivo.current = novo;
    setLaco(novo);
    window.addEventListener("pointermove", lacoMove);
    window.addEventListener("pointerup", lacoSobe);
    window.addEventListener("pointercancel", lacoAborta);
  };

  const largarLaco = () => {
    window.removeEventListener("pointermove", lacoMove);
    window.removeEventListener("pointerup", lacoSobe);
    window.removeEventListener("pointercancel", lacoAborta);
  };

  const lacoMove = (e) => {
    const l = lacoVivo.current;
    if (!l) return;
    const caixa = mundo.current.getBoundingClientRect();
    const novo = { ...l, x: e.clientX - caixa.left, y: e.clientY - caixa.top };
    if (!novo.mexeu && Math.hypot(novo.x - l.x0, novo.y - l.y0) >= LIMIAR) novo.mexeu = true;
    lacoVivo.current = novo;
    setLaco(novo);
  };

  const lacoAborta = () => { largarLaco(); lacoVivo.current = null; setLaco(null); };

  const lacoSobe = (e) => {
    const l = lacoVivo.current;
    largarLaco();
    lacoVivo.current = null;
    setLaco(null);
    if (!l) return;
    /* SEM ARRASTO, É UM CLIQUE NO VAZIO — e clicar no vazio limpa a escolha. */
    if (!l.mexeu) { limparEscolha(); return; }

    const caixa = mundo.current.getBoundingClientRect();
    /* O retângulo do laço volta para coordenadas do PLANO: o que ele cobre é
     * medido lá, onde os objetos moram. */
    const paraOPlano = (x, y) => ({
      x: (x - camera.x) / camera.escala,
      y: (y - camera.y) / camera.escala,
    });
    const a = paraOPlano(Math.min(l.x0, l.x), Math.min(l.y0, l.y));
    const b = paraOPlano(Math.max(l.x0, l.x), Math.max(l.y0, l.y));

    /* TOCOU, ESTÁ DENTRO. Exigir o objeto INTEIRO dentro do laço obriga a pessoa
     * a cercar tudo com folga, e num plano onde os cartões têm 375px de largura
     * isso vira um gesto enorme. Interseção é o que todo editor faz, e é o que a
     * mão espera. */
    const pega = new Set();
    for (const n of nos) {
      const m = medidas[n.id] ?? { largura: n.largura || 375, altura: 200 };
      if (n.x < b.x && n.x + m.largura > a.x && n.y < b.y && n.y + m.altura > a.y) {
        pega.add(`nota:${n.id}`);
      }
    }
    for (const g of grupos) {
      if (g.x < b.x && g.x + g.largura > a.x && g.y < b.y && g.y + g.altura > a.y) {
        pega.add(`secao:${g.id}`);
      }
    }
    /* Com Shift o laço SOMA ao que já estava escolhido, em vez de trocar. */
    setEscolha((atual) => (e.shiftKey ? new Set([...atual, ...pega]) : pega));
  };

  const chaoDesce = (e) => {
    if (!espaco && e.button !== 1) return;
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
      /* CTRL OU CMD. O navegador manda a pinça do trackpad como roda com
       * `ctrlKey`, e é assim que ela chega; `metaKey` é o que a pessoa aperta de
       * propósito no Mac quando quer aproximar com a roda. Aceitar só o primeiro
       * deixava metade do gesto de fora — o Erik apontou isso. */
      if (!e.ctrlKey && !e.metaKey) {
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
        {recadoDaHistoria && (
          <p className="canvas-recado" role="status">{recadoDaHistoria}</p>
        )}

        {desfazerArrumo && (
          <p className="canvas-recado" role="status">
            Superfície organizada.{" "}
            <button type="button" onClick={desfazerOrganizar}>Desfazer</button>
          </p>
        )}

        {/* A BARRA DA ESCOLHA — o único lugar em que as ações sobre VÁRIOS
            objetos existem. Ela não empurra a superfície: flutua, como o recado. */}
        {escolha.size > 0 && !laco?.mexeu && (
          <div className="canvas-barra-escolha" role="toolbar" aria-label="O que está escolhido">
            <span className="conta">
              {escolha.size === 1 ? "1 escolhido" : `${escolha.size} escolhidos`}
            </span>
            <button type="button" onClick={tirarEscolhidos}>Tirar</button>
            <button type="button" onClick={limparEscolha}>Largar</button>
          </div>
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
          className={`canvas-mundo${espaco ? " de-mao" : ""}`}
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
          onPointerDown={(e) => {
            chaoDesce(e);
            /* Sem espaço e sem botão do meio, o gesto no vazio é o LAÇO. Se o
               toque caiu num objeto, ele já parou o evento antes de chegar aqui. */
            if (!espaco && e.button === 0) lacoDesce(e);
          }}
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
              aoLevar={levarGrupo}
              aoEscolher={escolher}
              escolhido={escolha.has(`secao:${g.id}`)}
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
                <g key={l.id} className="traco-grupo">
                  <path d={l.d} className="traco" fill="none" />
                  {/* A LINHA INTEIRA É O ALVO, e ela é invisível: uma curva de
                      1px é impossível de acertar com o dedo. */}
                  <path d={l.d} className="traco-pegada" fill="none" />
                  {/* DESFAZER MORA NA PRÓPRIA LIGAÇÃO.
                  
                      Havia uma lista "Ligações N" abaixo do canvas, com um
                      "Desfazer" por linha — e ela não está no desenho, por um
                      motivo que se vê usando: para desfazer a ligação entre
                      duas notas que estão na tela, a pessoa rolava para fora do
                      canvas, procurava a linha certa entre trinta parecidas
                      ("A expedição partiu de manhã, c… — Uma foto é obser…") e
                      clicava. A ligação está ali, desenhada.
                      
                      A JUNTA SÓ EXISTE SOB O PONTEIRO. Ela ficava desenhada
                      o tempo todo, no meio do vão — o Erik: "uma bola que
                      descola do item e fica no meio da linha, isso transmite
                      justamente a ideia de bug". E transmitia: uma bolinha
                      solta no meio do nada não se parece com nada do produto.
                      Escondida, a linha volta a ser uma linha; sob o dedo, ela
                      oferece o × onde a ligação está. */}
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
              aoMedir={anotarMedida}
              aoSeguir={seguirArrasto}
              aoEscolher={escolher}
              escolhido={escolha.has(`nota:${no.id}`)}
              entreVarios={escolha.size > 1}
              carregada={levando?.filhos?.includes(no.id) ? levando : null}
              alvoDoFio={fio?.sobre === no.nota_id}
              escala={camera.escala}
            />
          ))}
          </div>

          {/* O RETÂNGULO DO LAÇO, em coordenadas da janela — como o fio, pela
              mesma razão: assim ele fica exatamente sob o dedo em qualquer zoom.
              Só aparece depois do limiar, senão um clique pisca um quadrado. */}
          {laco?.mexeu && (
            <div
              className="canvas-laco"
              aria-hidden="true"
              style={{
                left: Math.min(laco.x0, laco.x),
                top: Math.min(laco.y0, laco.y),
                width: Math.abs(laco.x - laco.x0),
                height: Math.abs(laco.y - laco.y0),
              }}
            />
          )}

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
            disabled={!endereco.trim() && !foto}
            onClick={async () => {
              const onde = meioDaVista(375, 220);
              /* A FOTO GANHA do endereço quando os dois estão preenchidos: ela é
               * a escolha mais recente e a mais deliberada — escolher um arquivo
               * dá mais trabalho que colar um endereço. */
              const feito = foto
                ? await aoTrazerMidia(foto, onde.x, onde.y, endereco.trim().startsWith("http") ? "" : endereco.trim())
                : await aoTrazer({ texto: endereco.trim(), x: onde.x, y: onde.y });
              if (feito) { setPondoMidia(false); setFoto(null); }
            }}
          >
            Pôr na superfície
          </Botao>
        }
      >
        <p>
          Cole o endereço de um vídeo ou de uma página, ou escolha uma foto. Para
          montar a prévia de um endereço, o Mekora precisa visitar esse endereço;
          a foto fica só aqui.
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

        {/* A FOTO É O OUTRO CAMINHO DA MESMA FOLHA, e não uma quarta ferramenta
            no dock: "adicionar mídia" é um gesto só, e o que muda é de onde a
            mídia vem. Quem escolhe uma foto não precisa mais do endereço, e o
            rótulo passa a dizer o nome do arquivo — sem isso a pessoa escolhe e
            a tela não dá sinal nenhum de que recebeu. */}
        <p className="canvas-ou-foto">
          Ou{" "}
          <label className="canvas-escolher-foto">
            <span>{foto ? foto.name : "escolha uma foto"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="visualmente-oculto"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
          </label>
          {foto && (
            <>
              {" — "}
              <button type="button" onClick={() => setFoto(null)}>trocar</button>
            </>
          )}
        </p>
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
