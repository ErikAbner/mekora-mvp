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
 */
import "./botao.css";

export function Botao({
  tom = "secundaria",
  tipo = "button",
  icone,
  children,
  ...resto
}) {
  return (
    <button type={tipo} className={`botao ${tom}`} {...resto}>
      {icone && <span className="botao-icone" style={{ maskImage: `url(${icone})`, WebkitMaskImage: `url(${icone})` }} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
