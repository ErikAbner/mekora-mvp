/* Os cinco lugares do Mekora, num arquivo só.
 *
 * A `DEC-0024` fixa quais são, e o cabeçalho, o roteador e a página de "ainda
 * não existe" leem daqui. Ter a lista em três lugares é como o menu passa a
 * oferecer um lugar que a rota não conhece — e o clique vira tela branca.
 *
 * `pronto: false` não é rascunho esquecido: é o produto dizendo o que ainda não
 * faz, em vez de deixar um botão que não leva a lugar nenhum. Botão que não
 * responde ensina o usuário a não clicar.
 */
export const LUGARES = [
  { id: "mesa", rotulo: "Mesa", rota: "/", icone: "/icones/icone-mesa.svg", pronto: true,
    oQueE: "Onde o arquivo chega e é preparado." },
  { id: "estante", rotulo: "Estante", rota: "/estante", icone: "/icones/icone-estante.svg", pronto: true,
    oQueE: "Os livros prontos, com notas e leitura." },
  { id: "canvas", rotulo: "Canvas", rota: "/canvas", icone: "/icones/icone-canvas.svg", pronto: true,
    oQueE: "O espaço onde as notas se ligam umas às outras." },
  { id: "estudos", rotulo: "Estudos", rota: "/estudos", icone: "/icones/icone-estudos.svg", pronto: true,
    oQueE: "Os recortes que você monta a partir do que leu." },
];

export const lugarDaRota = (caminho) =>
  LUGARES.find((l) => l.rota === caminho) ??
  LUGARES.find((l) => l.rota !== "/" && caminho.startsWith(l.rota));
