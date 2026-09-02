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
  /* A MESA NAO E A PRIMEIRA TELA. Ela morava em "/" e a Apresentacao numa rota
   * propria, com a razao escrita de que "/" seria onde quem ja usa o produto
   * quer cair. Estava invertido: a LP e a primeira tela do projeto, e so depois
   * de entrar a pessoa chega na Estante. */
  { id: "mesa", rotulo: "Mesa", rota: "/mesa", icone: "/icones/icone-mesa.svg", pronto: true,
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

/* ONDE VOCÊ ESTÁ, quando a tela aberta não é um dos quatro lugares.
 *
 * O CABEÇALHO É QUASE UM RASTRO. O Erik nomeou isso olhando o `895:10599`: lá a
 * tela de Conta está aberta e o cabeçalho marca ESTANTE. Não é engano do
 * desenho — tecnicamente a pessoa não saiu da Estante, o conteúdo foi
 * sobreposto. A Conta é uma gaveta por cima, e o rastro continua apontando para
 * onde ela estava.
 *
 * Então o lugar ativo não sai da rota atual: sai da última rota que ERA um
 * lugar. `sessionStorage` e não memória, porque recarregar com a gaveta aberta
 * não pode apagar o rastro — e não `localStorage`, porque o rastro é desta aba e
 * desta visita, não uma preferência.
 *
 * QUEM ABRE `/conta` DIRETO, por link, não recebe rastro nenhum, e é o certo:
 * marcar Estante ali seria inventar um caminho que a pessoa não percorreu.
 */
const RASTRO = "mekora-lugar";

export function lembrarLugar(caminho) {
  const l = lugarDaRota(caminho);
  if (!l) return;
  try {
    sessionStorage.setItem(RASTRO, l.id);
  } catch {
    /* Modo privado. O rastro vale enquanto a aba viver na memória do React. */
  }
}

/** O lugar do rastro, ou `undefined` se não houver. */
export function lugarDoRastro() {
  try {
    const id = sessionStorage.getItem(RASTRO);
    return LUGARES.find((l) => l.id === id);
  } catch {
    return undefined;
  }
}
