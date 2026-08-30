/* O ícone como MÁSCARA, não como imagem.
 *
 * Os SVG vieram do Figma com a tinta cravada dentro — #6A6A6A em três,
 * #878787 em outros três, e #F3F3F3 no da Mesa ativa. Dois problemas nisso, e o
 * segundo é o grave.
 *
 * O primeiro: o #878787 não existe no sistema. Entrou porque cor cravada em
 * asset não passa por decisão nenhuma.
 *
 * O segundo: o PORTÃO NÃO VÊ. Ele lê CSS computado de nó de texto, e tinta
 * cozida dentro de um SVG é invisível para ele. Passou verde com um #878787 na
 * tela. Verde por omissão é pior que vermelho.
 *
 * A saída não é redesenhar o ícone — os caminhos ficam intactos, byte por byte,
 * porque desenhar vetor à mão é inventar com cara de fidelidade. A saída é
 * tirar do asset uma decisão que pertence ao sistema: o SVG vira MÁSCARA, e a
 * cor vem de `currentColor`, herdada de quem usa. Aí o ícone segue a tinta do
 * texto ao lado dele, sempre, sem ninguém lembrar.
 */
export function Icone({ src, tamanho = 24 }) {
  return (
    <span
      aria-hidden="true"
      className="icone"
      style={{
        width: tamanho,
        height: tamanho,
        backgroundColor: "currentColor",
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        display: "block",
        flex: "none",
      }}
    />
  );
}
