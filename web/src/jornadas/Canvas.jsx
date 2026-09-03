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
const FOLGA_DOS_TRACOS = 8;

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

/* A CURVA ENTRE DOIS CARTOES — geometria pura, fora do componente.
 *
 * Ela precisa existir em dois lugares: no desenho do React, e no repinte
 * IMPERATIVO durante o arrasto. Duas copias da mesma conta divergiriam no
 * primeiro ajuste, e o sintoma seria a linha pulando ao soltar. */
function caminhoDaLigacao(ca, cb) {
  const cxA = ca.x + ca.largura / 2;
  const cyA = ca.y + ca.altura / 2;
  const cxB = cb.x + cb.largura / 2;
  const cyB = cb.y + cb.altura / 2;
  const vaoX = Math.max(cb.x - (ca.x + ca.largura), ca.x - (cb.x + cb.largura));
  const vaoY = Math.max(cb.y - (ca.y + ca.altura), ca.y - (cb.y + cb.altura));
  const deitado = vaoX >= vaoY;
  const vao = Math.hypot(cxB - cxA, cyB - cyA);
  const peso = Math.min(72, Math.max(14, vao * 0.16));

  let x1, y1, x2, y2, c1x, c1y, c2x, c2y;
  if (deitado) {
    const paraDireita = cxA <= cxB;
    x1 = paraDireita ? ca.x + ca.largura : ca.x;
    x2 = paraDireita ? cb.x : cb.x + cb.largura;
    y1 = cyA; y2 = cyB;
    const alca = Math.min(160, Math.max(16, Math.abs(x2 - x1) / 2));
    c1x = x1 + (paraDireita ? alca : -alca);
    c2x = x2 + (paraDireita ? -alca : alca);
    c1y = y1 + peso; c2y = y2 + peso;
  } else {
    const paraBaixo = cyA <= cyB;
    y1 = paraBaixo ? ca.y + ca.altura : ca.y;
    y2 = paraBaixo ? cb.y : cb.y + cb.altura;
    x1 = cxA; x2 = cxB;
    const alca = Math.min(160, Math.max(16, Math.abs(y2 - y1) / 2));
    c1x = x1; c2x = x2;
    c1y = y1 + (paraBaixo ? alca : -alca) + peso;
    c2y = y2 + (paraBaixo ? -alca : alca) + peso;
  }
  return {
    d: `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`,
    mx: (x1 + 3 * c1x + 3 * c2x + x2) / 8,
    my: (y1 + 3 * c1y + 3 * c2y + y2) / 8,
    pontas: [[x1, y1], [x2, y2], [c1x, c1y], [c2x, c2y]],
  };
}

/* O DETALHE QUE CABE EM CADA DISTÂNCIA.
 *
 * Escalar a mesma interface até o texto ficar ilegível não é um sistema de zoom
 * — é a mesma tela menor. A 25%, um corpo de 20px vira 5px: continua ocupando o
 * espaço, continua custando o desenho, e não informa nada.
 *
 * O que muda por nível não é "menos coisas": é O QUE AINDA SE RECONHECE. De
 * longe, um livro é uma capa, uma nota é um papel com uma marca de cor, uma foto
 * é a foto e um vídeo é a capa com o play. A DIFERENÇA ENTRE OS TIPOS é a última
 * coisa a sumir, porque é ela que permite achar algo num plano cheio.
 *
 * Os cortes vêm do tamanho do texto, e não de gosto: o corpo do cartão é 20px, e
 * abaixo de 0,6 ele cai de 12px — o limite em que ainda se lê uma palavra. Abaixo
 * de 0,35 são 7px, e aí não se lê nada, então o texto sai e sobra a forma. */
function detalheDoZoom(escala) {
  if (escala >= 0.6) return "tudo";
  if (escala >= 0.35) return "menos";
  return "silhueta";
}

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
function NotaCrua({ no, aoMover, aoTirar, aoLigarDaLista, aoMedir, aoSeguir, aoEscolher, aoInscrever, fio, alvoDoFio, carregada, escolhido, entreVarios, escala = 1 }) {
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
  /* A FICHA DESTE CARTÃO NA CENA. `ler` fecha sobre as propriedades atuais, e o
   * efeito reinscreve quando elas mudam — inscrever é um `Map.set`, e acontece
   * quando o dado muda, nunca por quadro. */
  useEffect(() => {
    if (!aoInscrever) return undefined;
    return aoInscrever(`nota:${no.id}`, {
      tipo: "nota",
      pega: true,
      no: caixa.current,
      ler: () => ({
        x: no.x, y: no.y,
        largura: caixa.current?.offsetWidth ?? largura,
        altura: caixa.current?.offsetHeight ?? 200,
        grupo_id: no.grupo_id ?? null,
      }),
      mover: (x, y, l) => aoMover(no.id, x, y, l),
    });
  }, [aoInscrever, no.id, no.x, no.y, no.grupo_id, largura, aoMover]);

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
    aoSeguir?.(`nota:${no.id}`, agora);
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
    aoSeguir?.(`nota:${no.id}`, null);
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
        aoSeguir?.(`nota:${no.id}`, {
          soltou: true, esticou: true,
          antes: { x: no.x, y: no.y, largura },
          depois: { x: no.x + fim.dx, y: no.y, largura: fim.largura },
        });
      } else {
        /* NÃO CHAMA `aoMover` AQUI. Quem confirma é o Canvas, no `soltou`: só ele
         * sabe em que seção o cartão caiu, e mandar duas vezes gravaria a
         * posição sem o vínculo e depois com ele. */
        aoSeguir?.(`nota:${no.id}`, { dx, dy, soltou: true });
      }
    } else {
      aoSeguir?.(`nota:${no.id}`, null);
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
      /* O CURSOR VIRA CLASSE, e não estilo em linha.
       *
       * Em linha, nada vence: com o espaço apertado, passar sobre um cartão
       * trocava o cursor de volta para o de arrastar objeto, e a mão via uma
       * promessa que o roteador não ia cumprir. Como classe, a regra do modo de
       * deslocar ganha por especificidade, sem `!important`. */
      onPointerMove={(e) => {
        if (arrasto.current) return;
        const borda = ondeEncostou(e, e.currentTarget);
        e.currentTarget.classList.toggle("na-lateral", borda === "o" || borda === "l");
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

/* UM LIVRO NA SUPERFÍCIE.
 *
 * Ele não é um cartão de texto com o título dentro. O Erik: "a Book should not
 * simply become a generic card containing text. It should remain recognizable as
 * a Book" — e há uma razão medida por trás disso: a 25% de zoom, texto de 20px é
 * ilegível, e a CAPA é a única coisa que continua se reconhecendo. O livro é o
 * primeiro objeto da superfície que justifica níveis de detalhe por zoom.
 *
 * ELE USA O MESMO ARRASTO DA NOTA, de propósito. O pedido diz "do not create an
 * isolated special-case implementation", e a prova é esta: escolher, arrastar
 * junto, entrar numa seção e desfazer não sabem que existe um tipo novo.
 */
function LivroCrua({ livro, aoMover, aoTirar, aoEscolher, aoSeguir, aoInscrever, carregada, escolhido, entreVarios, escala = 1 }) {
  const caixa = useRef(null);
  const arrasto = useRef(null);
  const [posicao, setPosicao] = useState(null);
  const [semCapa, setSemCapa] = useState(false);

  const largarOuvintes = () => {
    window.removeEventListener("pointermove", andar);
    window.removeEventListener("pointerup", soltar);
    window.removeEventListener("pointercancel", abortar);
  };

  useEffect(() => {
    if (!aoInscrever) return undefined;
    return aoInscrever(`livro:${livro.id}`, {
      tipo: "livro",
      pega: true,
      no: caixa.current,
      ler: () => ({
        x: livro.x, y: livro.y,
        largura: caixa.current?.offsetWidth ?? (livro.largura || 280),
        altura: caixa.current?.offsetHeight ?? 420,
        grupo_id: livro.grupo_id ?? null,
      }),
      mover: (x, y, l) => aoMover(livro.id, x, y, l),
    });
  }, [aoInscrever, livro.id, livro.x, livro.y, livro.largura, livro.grupo_id, aoMover]);

  const comecar = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    aoEscolher?.(`livro:${livro.id}`, { juntando: e.shiftKey || e.metaKey || e.ctrlKey });
    arrasto.current = { x0: e.clientX, y0: e.clientY, mexeu: false };
    window.addEventListener("pointermove", andar);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", abortar);
  };

  const andar = (e) => {
    const a = arrasto.current;
    if (!a) return;
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    if (!a.mexeu && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < LIMIAR) return;
    a.mexeu = true;
    setPosicao({ dx, dy });
    aoSeguir?.(`livro:${livro.id}`, { dx, dy });
  };

  const abortar = () => {
    largarOuvintes();
    arrasto.current = null;
    setPosicao(null);
    aoSeguir?.(`livro:${livro.id}`, null);
  };

  const soltar = (e) => {
    const a = arrasto.current;
    largarOuvintes();
    arrasto.current = null;
    setPosicao(null);
    if (!a?.mexeu) { aoSeguir?.(`livro:${livro.id}`, null); return; }
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    /* Idem à nota: quem confirma é o Canvas. */
    aoSeguir?.(`livro:${livro.id}`, { dx, dy, soltou: true });
  };

  return (
    <article
      ref={caixa}
      className={`livro-canvas${posicao ? " movendo" : ""}${escolhido ? " escolhido" : ""}${escolhido && entreVarios ? " entre-varios" : ""}`}
      data-livro={livro.id}
      style={{
        left: livro.x,
        top: livro.y,
        inlineSize: livro.largura || 280,
        transform:
          posicao || carregada
            ? `translate(${(posicao?.dx ?? 0) + (carregada?.dx ?? 0)}px, ${(posicao?.dy ?? 0) + (carregada?.dy ?? 0)}px)`
            : undefined,
        zIndex: posicao ? 10 : undefined,
      }}
      onPointerDown={comecar}
    >
      {/* A CAPA CAI PARA O TÍTULO quando não há imagem — o mesmo caminho do
          Preparo. Endereço existir não é a imagem existir: `/storage/temp` é
          apagado por idade. */}
      <span className="livro-capa">
        {livro.capa && !semCapa ? (
          <img src={livro.capa} alt="" draggable="false" loading="lazy" onError={() => setSemCapa(true)} />
        ) : (
          <span className="livro-capa-vazia">{livro.titulo}</span>
        )}
      </span>
      <span className="livro-texto">
        <span className="livro-titulo">{livro.titulo}</span>
        {livro.autor && <span className="livro-autor">{livro.autor}</span>}
      </span>
      <span className="nota-acoes">
        <MenuDoCartao rotulo="Ações do livro">
          <Link to={`/leitura/${livro.job_id}`} role="menuitem">Abrir no livro</Link>
          {/* TIRAR NÃO APAGA — e aqui a distinção é mais importante do que na
              nota: o livro é um arquivo, e some do Canvas sem sair da estante. */}
          <button type="button" role="menuitem" onClick={() => aoTirar(livro.id)}>
            Tirar da superfície
          </button>
        </MenuDoCartao>
      </span>
    </article>
  );
}

const Livro = memo(LivroCrua);

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
function Grupo({ grupo, aoMudar, aoApagar, escala, nasceuAgora = 0, aoLevar, aoEscolher, aoInscrever, escolhido }) {
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

  const corpo = useRef(null);

  useEffect(() => {
    if (!aoInscrever) return undefined;
    return aoInscrever(`secao:${grupo.id}`, {
      tipo: "secao",
      pega: true,
      no: corpo.current,
      ler: () => ({ x: grupo.x, y: grupo.y, largura: grupo.largura, altura: grupo.altura }),
      mover: (x, y) => aoMudar(grupo.id, { x, y }),
    });
  }, [aoInscrever, grupo.id, grupo.x, grupo.y, grupo.largura, grupo.altura, aoMudar]);

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
      ref={corpo}
      className={`canvas-grupo${escolhido ? " escolhido" : ""}${grupo.nome ? " com-nome" : " sem-nome"}`}
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

export function Canvas({ nos = [], ligacoes = [], grupos = [], livros = [], acervo = [], notas = [], erro, aoTrazer, aoTrazerMidia, aoTrazerLivro, aoMoverLivro, aoTirarLivro, aoMover, aoTirar, aoLigar, aoDesligar, aoAgrupar, aoMudarArea, aoDesagrupar, aoDevolverGrupo }) {
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

  /* Os livros da estante que ainda não estão na superfície. */
  /* `chave` É O ID DO LIVRO na lista da estante — ela vem de `upload_id`, e não
   * de um campo `id`, que a lista não tem. Usar `l.id` fazia o pedido sair sem
   * `job_id` e o servidor recusar com 422. */
  const jaNaMesa = new Set(livros.map((l) => l.job_id));
  const foraDaSuperficie = acervo.filter((l) => !jaNaMesa.has(l.chave));

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
  const medidasRef = useRef(null);
  medidasRef.current = medidas;
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
  /* A CENA — o registro de tudo que existe na superfície.
   *
   * O Erik: "the next Canvas object type should not require us to remember: add
   * it to click selection, add it to lasso, add it to multi-move, add it to
   * undo, add it to Section bounds". O Livro provou metade disso — entrou sem
   * tocar em clique, arrasto e desfazer — e reprovou a outra metade: o laço
   * percorria `nos` e `grupos` À MÃO, e o livro ficou de fora.
   *
   * Aqui cada objeto se inscreve com uma FICHA, e quem precisa de "todos os
   * objetos" pergunta à cena em vez de listar tipos:
   *
   *   chave      `nota:12` — identidade, já usada pela escolha
   *   tipo       para quem precisa distinguir (poucos precisam)
   *   no         o elemento, para o desenho imperativo do arrasto
   *   ler()      a caixa em coordenadas do plano
   *   mover()    aplica posição e largura
   *   pega       se ele pode ser escolhido
   *
   * A ficha é um `ref` por objeto: ela muda de conteúdo sem trocar de
   * identidade, então inscrever não redesenha nada e ler é sempre atual. */
  const cena = useRef(new Map());
  const inscrever = useCallback((chave, ficha) => {
    cena.current.set(chave, ficha);
    return () => { cena.current.delete(chave); };
  }, []);

  /* O QUE ESTÁ DENTRO DE UM RETÂNGULO DO PLANO. Uma pergunta, uma resposta, e
   * nenhum tipo citado — é isto que faz o laço, a seção e o próximo tipo de
   * objeto usarem a mesma regra sem combinarem nada. */
  const oQueEstaEm = useCallback((a, b, { encostar = true, so = null } = {}) => {
    const achados = [];
    for (const [chave, ficha] of cena.current) {
      if (!ficha.pega) continue;
      if (so && !so.includes(ficha.tipo)) continue;
      const c = ficha.ler();
      if (!c) continue;
      const cruza = c.x < b.x && c.x + c.largura > a.x && c.y < b.y && c.y + c.altura > a.y;
      const centroDentro =
        c.x + c.largura / 2 >= a.x && c.x + c.largura / 2 <= b.x
        && c.y + c.altura / 2 >= a.y && c.y + c.altura / 2 <= b.y;
      if (encostar ? cruza : centroDentro) achados.push(chave);
    }
    return achados;
  }, []);

  /* AS DUAS LISTAS VIVAS, para funções estáveis lerem sem virar dependência.
   * Ver a razão medida em `seguirArrasto`. */
  const escolhaRef = useRef(null);
  const nosRef = useRef(nos);
  const livrosRef = useRef(livros);
  const ligacoesRef = useRef(ligacoes);
  /* O espaço vive num `ref` porque quem o lê é o roteador de gesto, que roda na
   * fase de captura — antes de qualquer desenho ter acontecido. */
  const espacoRef = useRef(false);
  nosRef.current = nos;
  livrosRef.current = livros;
  ligacoesRef.current = ligacoes;

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
      /* O vínculo entra no passo: desfazer um arrasto que tirou algo de uma
       * seção tem de devolvê-lo à seção, e não só à posição. */
      desfazer: () => mudancas.forEach((m) => moverChaveRef.current(m.chave, m.antes.x, m.antes.y, m.antes.largura, m.antes.grupo)),
      refazer: () => mudancas.forEach((m) => moverChaveRef.current(m.chave, m.depois.x, m.depois.y, m.depois.largura, m.depois.grupo)),
    });
  }, [historia]);
  /* `moverChave` nasce depois desta função e é usada por ela só quando alguém
   * desfaz — por `ref`, para a ordem de declaração não virar dependência. */
  const moverChaveRef = useRef(null);

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
    const deVolta = [];
    const secoes = [];
    for (const chave of escolha) {
      const [tipo, id] = chave.split(":");
      if (tipo === "nota") {
        const n = nosRef.current.find((x) => x.id === Number(id));
        if (n) { notas.push({ nota_id: n.nota_id, x: n.x, y: n.y }); aoTirar(n.id); }
      }
      if (tipo === "livro") {
        const l = livrosRef.current.find((x) => x.id === Number(id));
        /* TIRAR O LIVRO NÃO APAGA O LIVRO — só a posição. Desfazer o traz de
         * volta pelo `job_id`, que é o livro de verdade e nunca saiu da estante. */
        if (l) { deVolta.push({ job_id: l.job_id, x: l.x, y: l.y }); aoTirarLivro(l.id); }
      }
      if (tipo === "secao") {
        const g = grupos.find((x) => x.id === Number(id));
        /* Só o id: a seção não é recriada, ela VOLTA. */
        if (g) { secoes.push(g.id); aoDesagrupar(g.id); }
      }
    }
    limparEscolha();
    if (!notas.length && !secoes.length && !deVolta.length) return;
    historia.registrar({
      rotulo: notas.length + secoes.length + deVolta.length > 1
        ? `${notas.length + secoes.length + deVolta.length} tirados`
        : "Tirado da superfície",
      /* DESFAZER TRAZ DE VOLTA COM ID NOVO. A nota é a mesma — o que se recria é
       * a POSIÇÃO dela na superfície, que é o que "tirar" apagou. Para a seção,
       * o objeto em si é recriado, e o id muda: um refazer encadeado depois disso
       * não encontraria a seção antiga. Está anotado em docs/CANVAS.md. */
      desfazer: async () => {
        for (const n of notas) await aoTrazer(n);
        for (const l of deVolta) await aoTrazerLivro(l.job_id, l.x, l.y);
        for (const id of secoes) await aoDevolverGrupo(id);
      },
      /* REFAZER PROCURA PELA IDENTIDADE QUE SOBREVIVE, e não pelo id da linha.
       *
       * Desfazer um "tirar" recria a POSIÇÃO da nota na superfície, e essa linha
       * nasce com id novo — mas a NOTA é a mesma, e `nota_id` é o que não muda.
       * Refazer então acha o nó atual daquela nota e o tira de novo. Mesma coisa
       * para o livro, pelo `job_id`.
       *
       * Sem isto, `⌘Z ⌘⇧Z` devolvia a nota e não a tirava de volta: medido, o
       * refazer deixava três cartões onde deviam ficar dois. */
      refazer: async () => {
        for (const n of notas) {
          const atual = nosRef.current.find((x) => x.nota_id === n.nota_id);
          if (atual) aoTirar(atual.id);
        }
        for (const l of deVolta) {
          const atual = livrosRef.current.find((x) => x.job_id === l.job_id);
          if (atual) aoTirarLivro(atual.id);
        }
        for (const id of secoes) await aoDesagrupar(id);
      },
    });
  }, [escolha, aoTirar, aoTirarLivro, aoDesagrupar, aoDevolverGrupo, limparEscolha, grupos, historia, aoTrazer, aoTrazerLivro]);

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

  /* O ARRASTO NÃO REDESENHA O CANVAS — e esta é a mudança de arquitetura.
   *
   * Antes, cada quadro escrevia estado no Canvas para a linha seguir o cartão e
   * para os acompanhantes andarem. Isso obrigava o React a reconciliar a
   * superfície inteira sessenta vezes por segundo. Medido:
   *
   *   com 3 cartões    pior quadro 23,8ms, nenhuma tarefa longa
   *   com 123 cartões  pior quadro 83,2ms, três tarefas longas de ~55ms
   *
   * O custo escalava com o número de objetos — que é a assinatura de um
   * redesenho global, não de um gesto caro. E o pico estava no PRIMEIRO quadro
   * do arrasto, não no soltar: eu havia lido isso errado antes, e o registro
   * está corrigido.
   *
   * `begin → preview → commit` continua valendo. O que muda é que a PREVIEW
   * deixou de passar pelo React: ela escreve `transform` nos elementos e `d` nos
   * traços, direto. O `commit`, no soltar, continua sendo uma atualização de
   * estado — uma só, e nada mais. */
  const tracosNoDom = useRef(new Map());
  const inscreverTraco = useCallback((id, el) => {
    if (el) tracosNoDom.current.set(id, el);
    else tracosNoDom.current.delete(id);
  }, []);

  const pintados = useRef(new Set());

  const pintarArrasto = useCallback((deslocamentos) => {
    /* Os acompanhantes andam por `transform`, que é a mesma propriedade que o
     * cartão arrastado já usa — e que não custa layout. */
    for (const [chave, d] of deslocamentos) {
      const ficha = cena.current.get(chave);
      if (ficha?.no && !d.souEu) {
        ficha.no.style.transform = d ? `translate(${d.dx}px, ${d.dy}px)` : "";
        pintados.current.add(chave);
      }
    }
    /* E as linhas são recalculadas com a MESMA conta do desenho — ver
     * `caminhoDaLigacao`. Duas cópias divergiriam, e o sintoma seria a linha
     * pulando ao soltar. */
    for (const [id, el] of tracosNoDom.current) {
      const l = ligacoesRef.current.find((x) => x.id === id);
      if (!l) continue;
      const a = nosRef.current.find((n) => n.nota_id === l.de_id);
      const b = nosRef.current.find((n) => n.nota_id === l.para_id);
      if (!a || !b) continue;
      const cx = (n) => {
        const m = medidasRef.current[n.id] ?? { largura: n.largura || 375, altura: 200 };
        const d = deslocamentos.get(`nota:${n.id}`);
        return { x: n.x + (d?.dx ?? 0), y: n.y + (d?.dy ?? 0), largura: d?.largura ?? m.largura, altura: m.altura };
      };
      el.setAttribute("d", caminhoDaLigacao(cx(a), cx(b)).d);
    }
  }, []);

  /* O QUE VAI JUNTO, DITO ENQUANTO O GESTO ACONTECE.
   *
   * O Erik: "right now the user cannot reliably understand what belongs to the
   * Section; what will move with it; what is about to enter it; what is about to
   * leave it."
   *
   * Isto TORNA LEGÍVEL a semântica que já existe — não cria nenhuma nova. Não há
   * pertencimento persistido aqui: quem vai junto continua sendo quem está por
   * cima, lido uma vez no começo do gesto. O que muda é que agora dá para VER.
   *
   * E aparece só durante a interação. Uma seção brilhando o tempo todo, ou todo
   * filho contornado, seria ruído permanente para responder a uma pergunta que
   * só se faz no momento de arrastar. */
  const marcados = useRef([]);
  const marcar = useCallback((chaves, classe) => {
    for (const { chave, classe: c } of marcados.current) {
      cena.current.get(chave)?.no?.classList.remove(c);
    }
    marcados.current = [];
    for (const chave of chaves) {
      const no = cena.current.get(chave)?.no;
      if (!no) continue;
      no.classList.add(classe);
      marcados.current.push({ chave, classe });
    }
  }, []);

  /* SOBRE QUAL SEÇÃO O OBJETO ESTÁ AGORA — a resposta de "vai entrar" e "vai
   * sair", dada com o dedo ainda no ar. O centro decide, que é a mesma regra da
   * contenção; ver `filhosDe`. */
  const secaoSobRef = useRef(null);
  const secaoSob = useCallback((chave, dx, dy) => {
    const ficha = cena.current.get(chave);
    if (!ficha) return null;
    const c = ficha.ler();
    const cx = c.x + dx + c.largura / 2;
    const cy = c.y + dy + c.altura / 2;
    for (const [k, f] of cena.current) {
      if (f.tipo !== "secao") continue;
      const g = f.ler();
      if (cx >= g.x && cx <= g.x + g.largura && cy >= g.y && cy <= g.y + g.altura) return k;
    }
    return null;
  }, []);
  secaoSobRef.current = secaoSob;

  /* A CHAVE VIRA ID AQUI, num lugar só.
   *
   * `secaoSob` devolve `secao:123` porque é isso que o marcador visual precisa;
   * o servidor quer o número. Converter no ponto de uso deixou passar: o
   * pedido saía com `grupo_id: "secao:123"`, o vínculo não gravava, e nada
   * reclamava — medido, soltar dentro da área não fazia a nota entrar nela. */
  const idDaSecao = useCallback((chave) => (chave ? Number(chave.split(":")[1]) : null), []);

  /* A JANELINHA DE DIAGNÓSTICO.
   *
   * O Erik: "do not optimize based on a cause you have not reproduced. But add
   * enough instrumentation that if it occurs again we know". O pico de 50–83ms
   * no arrasto de UM cartão não foi reproduzido no perfil isolado, e otimizar
   * sem causa seria mexer no escuro.
   *
   * Isto não custa nada quando ninguém pergunta: é um contador e um objeto
   * pendurado na janela. Quem investigar lê `window.__canvas` e sabe quantos
   * desenhos o Canvas fez, quantos objetos existem, quanto está escolhido e
   * quantos nós há na superfície — os números que separam "gesto caro" de
   * "redesenho global". */
  const desenhos = useRef(0);
  desenhos.current += 1;
  if (typeof window !== "undefined") {
    window.__canvas = {
      desenhos: desenhos.current,
      objetos: nos.length + livros.length + grupos.length,
      escolhidos: escolha.size,
      naCena: cena.current.size,
      tracos: ligacoes.length,
      nosNoDom: () => document.querySelectorAll(".canvas-mundo *").length,
    };
  }

  /* LIMPAR SÓ O QUE FOI PINTADO.
   *
   * A primeira versão percorria a cena INTEIRA zerando `transform` — 123 escritas
   * de estilo no último quadro do gesto, para desfazer no máximo três. Guardar
   * quem foi pintado troca isso por três escritas. */
  /* A seção revelada por hover. Imperativo: é hover, e redesenhar a superfície
   * a cada cartão que o ponteiro cruza seria caro e desnecessário. */
  const revelado = useRef(null);
  const revelar = useCallback((chave) => {
    if (revelado.current === chave) return;
    if (revelado.current) cena.current.get(revelado.current)?.no?.classList.remove("revelada");
    revelado.current = chave;
    if (chave) cena.current.get(chave)?.no?.classList.add("revelada");
  }, []);

  /* Quem é membro da seção sob o ponteiro. Imperativo, como o resto do feedback:
   * é hover, e redesenhar a superfície por isso seria caro à toa. */
  const membrosMarcados = useRef([]);
  const marcarMembros = useCallback((chaveSecao) => {
    for (const c of membrosMarcados.current) cena.current.get(c)?.no?.classList.remove("membro");
    membrosMarcados.current = [];
    if (!chaveSecao) return;
    const id = Number(chaveSecao.split(":")[1]);
    for (const [chave, f] of cena.current) {
      if (f.tipo === "secao") continue;
      const o = f.ler();
      if (o?.grupo_id === id) {
        f.no?.classList.add("membro");
        membrosMarcados.current.push(chave);
      }
    }
  }, []);

  const limparPintura = useCallback(() => {
    for (const chave of pintados.current) {
      const ficha = cena.current.get(chave);
      if (ficha?.no) ficha.no.style.transform = "";
    }
    pintados.current.clear();
    marcar([], "");
  }, [marcar]);

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
    if (!desloca) {
      acompanhantes.current = [];
      limparPintura();
      return;
    }
    /* A lista é fixada no primeiro quadro do gesto: recalcular a cada quadro
     * faria a escolha mudar de tamanho enquanto o dedo anda. */
    if (!acompanhantes.current.length) {
      acompanhantes.current = escolhaRef.current.has(id)
        ? [...escolhaRef.current].filter((c) => c !== id && !c.startsWith("secao:"))
        : [];
    }

    if (desloca.soltou) {
      const mudancas = [];
      if (desloca.esticou) {
        mudancas.push({ chave: id, antes: desloca.antes, depois: desloca.depois });
      } else {
        const eu = ondeEstaRef.current(id);
        if (eu) {
          /* O VÍNCULO COMEÇA E TERMINA AQUI. Soltar dentro de uma área entra
           * nela; soltar fora sai. É o único momento em que a relação muda, e
           * ela tem uma causa visível: o gesto que a pessoa acabou de fazer. */
          const secao = idDaSecao(secaoSobRef.current(id, desloca.dx, desloca.dy));
          moverChaveRef.current(id, eu.x + desloca.dx, eu.y + desloca.dy, undefined, secao);
          mudancas.push({
            chave: id,
            antes: { x: eu.x, y: eu.y, largura: eu.largura, grupo: eu.grupo_id ?? null },
            depois: { x: eu.x + desloca.dx, y: eu.y + desloca.dy, largura: eu.largura, grupo: secao },
          });
        }
      }
      for (const outro of acompanhantes.current) {
        const o = ondeEstaRef.current(outro);
        if (!o) continue;
        const secaoOutro = idDaSecao(secaoSobRef.current(outro, desloca.dx, desloca.dy));
        moverChaveRef.current(outro, o.x + desloca.dx, o.y + desloca.dy, undefined, secaoOutro);
        mudancas.push({
          chave: outro,
          antes: { x: o.x, y: o.y, largura: o.largura, grupo: o.grupo_id ?? null },
          depois: { x: o.x + desloca.dx, y: o.y + desloca.dy, largura: o.largura, grupo: secaoOutro },
        });
      }
      registrarMovimento(
        desloca.esticou ? "Cartão esticado" : mudancas.length > 1 ? `${mudancas.length} movidos` : "Cartão movido",
        mudancas,
      );
      acompanhantes.current = [];
      limparPintura();
      return;
    }

    /* PREVIEW SEM REACT. O cartão arrastado já se move sozinho, com estado
     * local; daqui saem só os acompanhantes e as linhas. */
    const passo = new Map();
    passo.set(id, { ...desloca, souEu: true });
    for (const outro of acompanhantes.current) passo.set(outro, desloca);
    pintarArrasto(passo);

    /* A seção que receberia este objeto se ele fosse solto agora. */
    const alvo = secaoSob(id, desloca.dx, desloca.dy);
    marcar(alvo ? [alvo] : [], "secao-alvo");
  }, [registrarMovimento, pintarArrasto, limparPintura, secaoSob, marcar, idDaSecao]);

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
  /* CRIAR UMA SEÇÃO A PARTIR DO QUE ESTÁ ESCOLHIDO.
   *
   * É o "organizar depois" em um gesto, e o Erik foi enfático: "do not require
   * configuration before creation". Não há passo de configuração nenhum —
   * escolher, apertar, pronto. O nome abre em edição junto, e `Esc` deixa a
   * seção sem nome: nomear é oferecido, não cobrado.
   *
   * A ÁREA SAI DA CAIXA DO QUE FOI ESCOLHIDO, com uma folga que é a do próprio
   * sistema. Sem folga, os cartões encostam no traço e a área parece apertada em
   * volta deles; com folga demais, ela deixa de dizer o que contém.
   *
   * E ELA NÃO MEXE EM NADA. Nenhum objeto é movido, reordenado ou reparentado:
   * quem está dentro continua sendo quem está por cima. A seção pousa em volta
   * do que já estava lá. */
  const FOLGA_DA_SECAO = 40;
  const criarSecaoDaEscolha = useCallback(async () => {
    /* Só o que pode virar membro entra na conta — seção não pertence a seção. */
    const escolhidos = [...escolha].filter((c) => !c.startsWith("secao:"));
    const posicaoDe = (chave) => {
      const o = ondeEstaRef.current(chave);
      return [o.x, o.y];
    };
    const caixas = escolhidos
      .map((chave) => {
        const ficha = cena.current.get(chave);
        return ficha?.ler();
      })
      .filter(Boolean);
    if (!caixas.length) return;
    const x = Math.min(...caixas.map((c) => c.x)) - FOLGA_DA_SECAO;
    const y = Math.min(...caixas.map((c) => c.y)) - FOLGA_DA_SECAO - 54;
    const direita = Math.max(...caixas.map((c) => c.x + c.largura)) + FOLGA_DA_SECAO;
    const baixo = Math.max(...caixas.map((c) => c.y + c.altura)) + FOLGA_DA_SECAO;

    idsDeAntes.current = new Set(grupos.map((g) => g.id));
    const nova = await aoAgrupar?.({ nome: "", x, y, largura: direita - x, altura: baixo - y });
    if (!nova) { limparEscolha(); return; }

    /* O QUE FICA ESCOLHIDO DEPOIS: A SEÇÃO NOVA — e isto é escolha, não sobra de
     * atualização de estado.
     *
     * Quatro respostas eram possíveis: nada, os objetos de antes, a seção, ou a
     * seção mais os filhos. A seção ganha porque ela é o SUJEITO DA PRÓXIMA
     * AÇÃO: quem acabou de criar uma área vai renomeá-la, movê-la ou
     * redimensioná-la, e nenhuma dessas é sobre os cartões que já estavam ali.
     *
     * Manter os objetos escolhidos seria pior de um jeito específico: a seção
     * nasce por cima deles, e um `Delete` distraído tiraria o conteúdo em vez da
     * área que acabou de aparecer. */
    /* OS ESCOLHIDOS VIRAM MEMBROS — e este é o sinal de pertencimento mais forte
     * que existe no produto.
     *
     * A pessoa selecionou aqueles objetos e pediu uma área em volta deles: a
     * intenção já está dita, e não há nada a perguntar. É o "criar primeiro,
     * organizar depois" acontecendo sem passo administrativo nenhum. */
    for (const chave of escolhidos) moverChaveRef.current(chave, ...posicaoDe(chave), undefined, nova.id);

    setEscolha(new Set([`secao:${nova.id}`]));
    /* DESFAZER E REFAZER GUARDAM A IDENTIDADE. Apagar é uma marca, e não uma
     * exclusão — então refazer devolve A MESMA seção, com o mesmo id. Sem isto,
     * qualquer coisa que aponte para ela (uma ligação, uma referência de Estudo)
     * ficaria apontando para o vazio depois de um `⌘Z ⌘⇧Z`. */
    /* Desfazer tira a seção, e o `SET NULL` do banco solta os membros junto —
     * refazer não os traz de volta sozinho, então ele os revincula. */
    historia.registrar({
      rotulo: "Seção criada",
      desfazer: () => aoDesagrupar(nova.id),
      refazer: async () => {
        await aoDevolverGrupo(nova.id);
        for (const chave of escolhidos) {
          const o = ondeEstaRef.current(chave);
          if (o) moverChaveRef.current(chave, o.x, o.y, undefined, nova.id);
        }
      },
    });
  }, [escolha, grupos, aoAgrupar, aoDesagrupar, aoDevolverGrupo, limparEscolha, historia]);

  const [levando, setLevando] = useState(null);
  /* QUEM ESTÁ DENTRO DA ÁREA — em CHAVES, e não em ids de nota.
   *
   * Foi aqui que o Livro provou que a contenção é agnóstica de tipo: a função
   * ganhou uma linha para percorrer os livros também, e mais nada do sistema
   * mudou. Arrastar a seção leva livro e nota juntos, e desfazer devolve os
   * dois. */
  /* QUEM PERTENCE A UMA SEÇÃO — pelo VÍNCULO, e não pela geometria.
   *
   * A versão anterior perguntava "quem está por cima dela agora?" a cada gesto.
   * Foi testada e reprovou: com duas áreas sobrepostas o objeto andava com as
   * duas, e esticar uma área por respiro adotava tudo que o traço cruzasse. A
   * relação mudava sem ninguém tê-la mudado.
   *
   * Agora a geometria SUGERE — ela acende a área candidata durante o arrasto — e
   * o gesto DECIDE. Aqui se lê o que foi decidido.
   *
   * SEÇÃO NÃO PERTENCE A SEÇÃO: elas não têm `grupo_id`, então o aninhamento
   * simplesmente não existe no modelo. Uma área pode cobrir outra na tela sem
   * virar mãe dela — e foi o cenário 7 que mostrou por que isso importa. */
  const filhosDe = useCallback(
    (grupo) => [
      ...nos.filter((n) => n.grupo_id === grupo.id).map((n) => `nota:${n.id}`),
      ...livros.filter((l) => l.grupo_id === grupo.id).map((l) => `livro:${l.id}`),
    ],
    [nos, livros],
  );

  /* MOVER UMA CHAVE, seja ela do tipo que for. É o único lugar do Canvas que
   * sabe traduzir chave em ação, e por isso é o único que precisa mudar quando
   * um tipo novo entra. */
  const moverChave = useCallback((chave, x, y, largura, grupo) => {
    const [tipo, id] = chave.split(":");
    if (tipo === "nota") aoMover(Number(id), x, y, largura, grupo);
    if (tipo === "livro") aoMoverLivro(Number(id), x, y, largura, grupo);
  }, [aoMover, aoMoverLivro]);

  moverChaveRef.current = moverChave;

  const ondeEstaRef = useRef(null);
  const ondeEsta = useCallback((chave) => {
    const [tipo, id] = chave.split(":");
    if (tipo === "nota") return nosRef.current.find((n) => n.id === Number(id));
    if (tipo === "livro") return livrosRef.current.find((l) => l.id === Number(id));
    return null;
  }, []);
  ondeEstaRef.current = ondeEsta;

  const levarGrupo = useCallback((grupoId, desloca) => {
    if (!desloca) { limparPintura(); setLevando(null); return; }
    setLevando((atual) => {
      const filhos = atual?.id === grupoId ? atual.filhos : filhosDe(grupos.find((g) => g.id === grupoId) ?? {});
      if (desloca.soltou) {
        limparPintura();
        /* No fim do gesto, cada nota vai para o servidor com o mesmo passo que a
         * área deu — e a área mais tudo que ela levou viram UM passo da história.
         * Desfazer um arrasto de seção tem de devolver a seção E o conteúdo. */
        const g = grupos.find((x) => x.id === grupoId);
        const mudancas = [];
        for (const chave of filhos) {
          const o = ondeEsta(chave);
          if (!o) continue;
          moverChave(chave, o.x + desloca.dx, o.y + desloca.dy);
          mudancas.push({
            chave, antes: { x: o.x, y: o.y, largura: o.largura },
            depois: { x: o.x + desloca.dx, y: o.y + desloca.dy, largura: o.largura },
          });
        }
        if (g) {
          const antes = { x: g.x, y: g.y };
          const depois = { x: g.x + desloca.dx, y: g.y + desloca.dy };
          historia.registrar({
            rotulo: filhos.length ? `Seção e ${filhos.length} movidos` : "Seção movida",
            desfazer: () => {
              aoMudarArea(grupoId, antes);
              mudancas.forEach((m) => moverChave(m.chave, m.antes.x, m.antes.y, m.antes.largura));
            },
            refazer: () => {
              aoMudarArea(grupoId, depois);
              mudancas.forEach((m) => moverChave(m.chave, m.depois.x, m.depois.y, m.depois.largura));
            },
          });
        }
        return null;
      }
      const passo = new Map();
      for (const chave of filhos) passo.set(chave, desloca);
      pintarArrasto(passo);
      marcar(filhos, "vai-junto");
      return { id: grupoId, dx: desloca.dx, dy: desloca.dy, filhos };
    });
  }, [filhosDe, grupos, moverChave, ondeEsta, aoMudarArea, historia, pintarArrasto, limparPintura, marcar]);

  const tracos = useMemo(() => {
    const linhas = [];
    const pontas = [];
    const caixaDe = (n) => {
      const m = medidas[n.id] ?? { largura: n.largura || 375, altura: 200 };
      return { x: n.x, y: n.y, largura: m.largura, altura: m.altura };
    };

    for (const l of ligacoes) {
      const a = nos.find((n) => n.nota_id === l.de_id);
      const b = nos.find((n) => n.nota_id === l.para_id);
      if (!a || !b) continue;
      const forma = caminhoDaLigacao(caixaDe(a), caixaDe(b));
      linhas.push({ id: l.id, de: a.id, para: b.id, ...forma });
      pontas.push(...forma.pontas);
    }
    if (!linhas.length) return null;

    /* A CAIXA DO SVG é justa, e quem resolve o arrasto é `overflow: visible` no
     * CSS: durante o gesto as linhas são repintadas sem o React e o `viewBox`
     * não acompanha, então elas precisam poder desenhar fora dele. Uma folga
     * enorme resolveria também, e criaria um SVG de milhares de pixels por cima
     * da superfície inteira. */
    const xs = pontas.map((p) => p[0]);
    const ys = pontas.map((p) => p[1]);
    const x = Math.min(...xs) - FOLGA_DOS_TRACOS;
    const y = Math.min(...ys) - FOLGA_DOS_TRACOS;
    return {
      x, y,
      largura: Math.max(...xs) - x + FOLGA_DOS_TRACOS,
      altura: Math.max(...ys) - y + FOLGA_DOS_TRACOS,
      linhas,
    };
  }, [ligacoes, nos, medidas]);

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
  espacoRef.current = espaco;
  useEffect(() => {
    const desce = (e) => {
      if (e.code !== "Space" || e.repeat) return;
      /* Escrevendo, espaço é espaço. */
      if (e.target.closest?.("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      setEspaco(true);
    };
    const sobe = (e) => { if (e.code === "Space") setEspaco(false); };
    /* O ESPAÇO SOLTA POR TODOS OS CAMINHOS EM QUE O `keyup` SE PERDE.
     *
     * `blur` cobre trocar de janela; `visibilitychange` cobre trocar de aba, que
     * em alguns navegadores não dispara `blur`; e `pointercancel` cobre o
     * sistema tomando o gesto. Sem os três, `⌘Tab` volta com a superfície presa
     * em modo de deslocar e nenhum jeito óbvio de sair — porque o `keyup`
     * aconteceu na outra janela e nunca chegou aqui. */
    const larga = () => setEspaco(false);
    const escondeu = () => { if (document.hidden) setEspaco(false); };
    window.addEventListener("keydown", desce);
    window.addEventListener("keyup", sobe);
    window.addEventListener("blur", larga);
    window.addEventListener("pointercancel", larga);
    document.addEventListener("visibilitychange", escondeu);
    return () => {
      window.removeEventListener("keydown", desce);
      window.removeEventListener("keyup", sobe);
      window.removeEventListener("blur", larga);
      window.removeEventListener("pointercancel", larga);
      document.removeEventListener("visibilitychange", escondeu);
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

    /* TOCOU, ESTÁ DENTRO. Exigir o objeto INTEIRO dentro do laço obriga a
     * pessoa a cercar tudo com folga, e com cartões de 375px isso vira um gesto
     * enorme. Interseção é o que todo editor faz, e é o que a mão espera.
     *
     * E A PERGUNTA VAI PARA A CENA, sem citar tipo nenhum. A versão anterior
     * percorria `nos` e `grupos` à mão — e o Livro, que não precisou de nada
     * para clicar, arrastar e desfazer, ficou de fora do laço em silêncio.
     * Foi o defeito que provou que faltava este registro. */
    const pega = new Set(oQueEstaEm(a, b));

    /* Com Shift o laço SOMA ao que já estava escolhido, em vez de trocar. */
    setEscolha((atual) => (e.shiftKey ? new Set([...atual, ...pega]) : pega));
  };

  /* O ROTEADOR DE GESTO — quem decide o que o ponteiro significa.
   *
   * ESTE É O CONSERTO DO DEFEITO DO ESPAÇO, e ele não é um `if` a mais.
   *
   * Antes, cada objeto decidia sozinho: a nota parava o `pointerdown` na origem,
   * e o chão — que é quem sabe do espaço — nunca via o evento. Segurar espaço
   * deslocava a superfície, até o ponteiro cruzar um cartão; aí o cartão roubava
   * o gesto. "Mover pela superfície, a não ser que meu ponteiro passe sem querer
   * por cima de uma nota."
   *
   * A ordem certa é a inversa da que estava:
   *
   *     estado da entrada  ->  escolher o dono do gesto  ->  executar
   *                        ->  só então o comportamento do alvo
   *
   * Por isso ele mora na FASE DE CAPTURA. A captura desce do mundo até o alvo,
   * então este tratador roda ANTES de qualquer `pointerdown` de objeto — e se o
   * modo de deslocar estiver ligado, ele fica com o gesto e para o evento ali.
   * Nenhum objeto se mexe, nenhuma escolha muda, nenhum vínculo muda.
   *
   * A POSSE É ESTÁVEL PELA VIDA DO GESTO. Soltar o espaço no meio não devolve o
   * gesto ao objeto — quem começou como deslocamento termina como deslocamento,
   * e o modo só volta a valer no próximo `pointerdown`. É por isso que o
   * deslocamento tem os próprios ouvintes de janela em vez de olhar `espaco` a
   * cada movimento. */
  const arrastandoChaoVivo = useRef(null);

  const largarOChao = () => {
    window.removeEventListener("pointermove", chaoMove);
    window.removeEventListener("pointerup", chaoSobe);
    window.removeEventListener("pointercancel", chaoSobe);
  };

  const rotearGesto = (e) => {
    const querDeslocar = espacoRef.current || e.button === 1;
    if (!querDeslocar) return;
    /* PARA AQUI. Nem o objeto sob o ponteiro nem o laço veem este gesto. */
    e.stopPropagation();
    e.preventDefault();
    setSaltando(false);
    const estado = { x0: e.clientX, y0: e.clientY, cx: camera.x, cy: camera.y };
    arrastandoChao.current = estado;
    arrastandoChaoVivo.current = estado;
    window.addEventListener("pointermove", chaoMove);
    window.addEventListener("pointerup", chaoSobe);
    window.addEventListener("pointercancel", chaoSobe);
  };

  const chaoDesce = () => {};
  const chaoMove = (e) => {
    const a = arrastandoChaoVivo.current;
    if (!a) return;
    setCamera((c) => ({ ...c, x: a.cx + (e.clientX - a.x0), y: a.cy + (e.clientY - a.y0) }));
  };
  const chaoSobe = () => {
    largarOChao();
    arrastandoChao.current = null;
    arrastandoChaoVivo.current = null;
  };

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
            {escolha.size > 1 && (
              <button type="button" onClick={criarSecaoDaEscolha}>Criar seção</button>
            )}
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
          /* POR QUE ESTES ANDAM JUNTOS? A resposta chega ao passar o dedo.
           *
           * Uma seção sem nome é quase invisível parada — e isso abriria
           * exatamente o buraco pelo qual eu recusei o Grupo: objetos que andam
           * juntos sem nada explicando por quê. Passar sobre um membro revela a
           * área dele.
           *
           * Por delegação, e não um ouvinte por cartão: com 123 objetos são 123
           * inscrições para responder a uma pergunta que se faz uma vez. */
          onPointerOver={(e) => {
            /* A PERGUNTA TEM DOIS SENTIDOS, e os dois precisam de resposta.
             *
             * De um membro para a área: "por que estes andam juntos?" — passar
             * sobre um deles acende a área.
             *
             * Da área para os membros: "o que é desta seção?" — passar sobre ela
             * marca quem é dela. Sem este lado, um objeto que está VISUALMENTE
             * dentro sem ser membro fica idêntico a um que é, e a única forma de
             * descobrir seria arrastando. É a fraqueza que o pertencimento
             * explícito cria, e ela se paga aqui. */
            const secao = e.target.closest?.(".canvas-grupo");
            if (secao) {
              const chaveSecao = [...cena.current].find(([, f]) => f.no === secao)?.[0];
              revelar(chaveSecao ?? null);
              marcarMembros(chaveSecao);
              return;
            }
            const alvo = e.target.closest?.("[data-nota], [data-livro]");
            if (!alvo) { revelar(null); marcarMembros(null); return; }
            const chave = alvo.dataset.nota ? `nota:${alvo.dataset.no}` : `livro:${alvo.dataset.livro}`;
            const o = ondeEstaRef.current(chave);
            revelar(o?.grupo_id ? `secao:${o.grupo_id}` : null);
            marcarMembros(null);
          }}
          onPointerLeave={() => { revelar(null); marcarMembros(null); }}
          /* NA CAPTURA, e não no borbulho: ver `rotearGesto`. É o que faz o
             espaço valer mesmo com o ponteiro sobre um cartão. */
          onPointerDownCapture={rotearGesto}
          onPointerDown={(e) => {
            /* Sem espaço e sem botão do meio, o gesto no vazio é o LAÇO. Se o
               toque caiu num objeto, ele já parou o evento antes de chegar aqui;
               se o roteador ficou com ele, também. */
            if (e.button === 0) lacoDesce(e);
          }}
          onPointerMove={chaoMove}
          onPointerUp={chaoSobe}
          onPointerCancel={chaoSobe}
        >
          <div
            className={`canvas-plano${saltando ? " saltando" : ""}`}
            /* Um atributo no PLANO, e não uma propriedade em cada cartão: o
               nível vale para todos ao mesmo tempo, e mandá-lo objeto a objeto
               redesenharia 123 componentes a cada passo de zoom. Aqui o CSS
               resolve, e o React não faz nada. */
            data-detalhe={detalheDoZoom(camera.escala)}
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
              aoInscrever={inscrever}
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
                  <path ref={(el) => inscreverTraco(l.id, el)} d={l.d} className="traco" fill="none" />
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

          {livros.map((l) => (
            <Livro
              key={l.id}
              livro={l}
              aoMover={aoMoverLivro}
              aoTirar={aoTirarLivro}
              aoEscolher={escolher}
              aoSeguir={seguirArrasto}
              aoInscrever={inscrever}
              escolhido={escolha.has(`livro:${l.id}`)}
              entreVarios={escolha.size > 1}
              escala={camera.escala}
            />
          ))}

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
              aoInscrever={inscrever}
              escolhido={escolha.has(`nota:${no.id}`)}
              entreVarios={escolha.size > 1}
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
              traga uma nota ou um livro que você já tem
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
        titulo="Trazer para a superfície"
        aoFechar={() => setTrazendo(false)}
      >
        {/* LIVRO E NOTA MORAM NA MESMA PORTA.
            
            O Erik listou nove formas possíveis de um livro entrar no Canvas. A
            que eu escolhi não acrescenta nenhuma ferramenta ao dock — que tem
            três, e o desenho manda que tenha três: "trazer o que já existe" é UM
            gesto, e o que muda é o que se traz. Uma quarta ferramenta só para
            livro diria que livro é outra categoria de coisa, e o resto do
            trabalho de hoje foi provar que não é.
            
            Só o que ainda NÃO está na superfície aparece: oferecer o que já está
            lá é oferecer um clique que não faz nada. */}
        {foraDaSuperficie.length > 0 && (
          <>
            <p className="trazer-titulo">Livros</p>
            <ul className="trazer-lista">
              {foraDaSuperficie.map((l, i) => (
                <li key={l.chave}>
                  <button
                    type="button"
                    onClick={async () => {
                      const onde = meioDaVista(280, 420);
                      await aoTrazerLivro(l.chave, onde.x + (i % 4) * 40, onde.y + (i % 4) * 30);
                      setTrazendo(false);
                    }}
                  >
                    <span className="trazer-texto">{l.titulo}</span>
                    <span className="trazer-origem">{l.autor || "livro da sua estante"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="trazer-titulo">Notas</p>
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
