/* O botão do Mekora.
 *
 * POR QUE NÃO O DO DESIGN SYSTEM. Ele existe, mas foi remarcado pela metade: o
 * `--interactive-primary-fill-default` virou o nosso `#151515`, e o `hover` e o
 * `pressed` continuaram em `#004e75` e `#00496e` — azuis do produto de onde o
 * template veio. Ele seria **preto parado e azul ao passar o mouse**. Defeito
 * que sobrevive a revisão porque só aparece na interação.
 *
 * OS ESTADOS SÃO DEGRAU DE SUPERFÍCIE, nunca matiz. É a regra do sistema, e ela
 * tem número: o acento estava a 11,9 de distância perceptual do estado de
 * perigo, abaixo do limiar de ~15 em que duas cores se confundem — marcar o
 * gesto mais frequente com o tom do alarme mais raro é sinal invertido.
 *
 * Cada degrau foi medido para ser VISÍVEL: 1,16 na primária clara e 1,13 na
 * secundária. Degrau que não se vê não é estado, é código.
 *
 * TRÊS TONS, e o terceiro é raro de propósito. `perigo` gasta cor, e a regra diz
 * que tinta cheia é o elemento mais alto da paleta e o alto é da exceção.
 *
 * DESLIGAR É DIZER POR QUÊ, e por isso `porque` existe.
 *
 * `disabled={vazio}` apaga o botão e cala: quem usa vê uma coisa apagada e não
 * sabe se falta alguma coisa dele ou se o produto está quebrado. A varredura de
 * fumaça achou cinco assim em quatro telas, e todos os cinco eram do mesmo
 * formato — a condição estava certa, a explicação não existia.
 *
 *     <Botao porque={quantos === 0 && "Nenhum quadrinho na estante"}>
 *
 * O mesmo valor desliga e explica, então não dá para esquecer metade: o que
 * desliga É a razão. `false`, `null` e `""` deixam o botão ligado, o que faz a
 * forma comum — `condição && "motivo"` — funcionar sem ternário.
 *
 * `disabled` cru continua aceito para quem já tem um `title` próprio, e o
 * `scripts/botoes.mjs` recusa os dois juntos ausentes.
 */
import "./botao.css";

export function Botao({
  tom = "secundaria",
  tipo = "button",
  icone,
  porque,
  children,
  ...resto
}) {
  const razao = typeof porque === "string" && porque.trim() ? porque : null;
  return (
    <button
      type={tipo}
      className={`botao ${tom}`}
      {...resto}
      {...(razao ? { disabled: true, title: razao } : null)}
    >
      {icone && <span className="botao-icone" style={{ maskImage: `url(${icone})`, WebkitMaskImage: `url(${icone})` }} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
