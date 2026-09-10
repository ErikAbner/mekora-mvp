/* As preferências, e o padrão de cada uma.
 *
 * Saíram de dentro de `Conta.jsx` quando o nó 941:23109 passou a precisar
 * delas: aquele aviso conta quantas escolhas estão FORA DO PADRÃO, e para
 * contar é preciso saber qual é o padrão. Com a lista dentro da tela, a Mesa
 * teria de guardar uma segunda cópia dos padrões — e a segunda cópia é como um
 * padrão muda num lugar e o aviso continua contando pelo outro.
 *
 * Um dia vêm do backend. Aí muda a fonte, não a tela — e agora não muda
 * duas telas.
 */
export const GRUPOS = [
  {
    secao: "Experiência",
    escolhas: [
      {
        id: "modo",
        titulo: "Modo ao abrir um arquivo",
        explicacao: "Vale para os próximos arquivos. Nada muda no que já está preparado ou em preparo.",
        padrao: "guiado",
        opcoes: [
          { id: "guiado", rotulo: "Guiado", detalhe: "O Mekora decide, mostra a decisão em texto e pede confirmação uma vez." },
          { id: "personalizado", rotulo: "Personalizado", detalhe: "Abre com controles à vista, já preenchidos com o que o Guiado faria." },
        ],
      },
      {
        id: "dicas",
        titulo: "Dicas de primeiro uso",
        padrao: "uteis",
        opcoes: [
          { id: "uteis", rotulo: "Aparecem quando são úteis", detalhe: "Somem sozinhas depois que você faz a coisa uma vez." },
          { id: "nunca", rotulo: "Não mostrar", detalhe: "Dá para reativar em Ajuda e recursos." },
        ],
      },
    ],
  },
  {
    secao: "Arquivos e resultados",
    escolhas: [
      {
        id: "quando-pronto",
        titulo: "Quando um arquivo fica pronto",
        padrao: "avisar",
        opcoes: [
          { id: "avisar", rotulo: "Não baixar sozinho", detalhe: "Você é avisado na Mesa e decide." },
          { id: "baixar", rotulo: "Baixar quando ficar pronto", detalhe: "O navegador pode perguntar onde salvar a cada vez." },
        ],
      },
      {
        id: "formato",
        titulo: "Formato de saída",
        padrao: "pelo-arquivo",
        opcoes: [
          { id: "pelo-arquivo", rotulo: "Decidir pelo arquivo", detalhe: "Texto vira EPUB; quadrinho vira arquivo de imagem no tamanho do aparelho." },
          { id: "sempre-epub", rotulo: "Sempre EPUB", detalhe: "Mesmo em quadrinho, o que costuma piorar o resultado." },
        ],
      },
    ],
  },
  {
    secao: "Interface",
    escolhas: [
      {
        id: "movimento",
        titulo: "Movimento",
        explicacao: "Não é decoração: o movimento explica de onde uma tela veio, no canvas e nas folhas que abrem por cima.",
        padrao: "sistema",
        opcoes: [
          { id: "sistema", rotulo: "Seguir o sistema", detalhe: "Respeita a preferência de redução de movimento do seu computador." },
          { id: "reduzido", rotulo: "Reduzido", detalhe: "Transições viram troca imediata. Nada se move." },
          { id: "completo", rotulo: "Completo", detalhe: "Mesmo se o sistema pedir redução." },
        ],
      },
      {
        id: "tema",
        titulo: "Tema",
        /* `sistema` continua disponível, mas o padrão do produto é claro.
         *
         * Sem ela, escolher uma vez era permanente: não havia como voltar a
         * seguir o computador. Quem quiser que o Mekora acompanhe a troca do
         * sistema continua podendo escolher isso explicitamente. */
        padrao: "claro",
        opcoes: [
          { id: "sistema", rotulo: "Como o sistema", detalhe: "Acompanha a preferência do seu computador, inclusive quando ela muda sozinha." },
          { id: "claro", rotulo: "Claro" },
          { id: "escuro", rotulo: "Escuro" },
        ],
      },
    ],
  },
];

export const PADROES = Object.fromEntries(
  GRUPOS.flatMap((g) => g.escolhas).map((e) => [e.id, e.padrao]),
);

/* O rótulo da opção escolhida, para o aviso poder NOMEAR o que está fora do
 * padrão em vez de só contar. "1 preferência fora do padrão / Personalizado" é
 * o que o desenho mostra, e "Personalizado" é o rótulo de uma opção — não uma
 * palavra genérica. */
export function rotuloDaEscolha(id, valor) {
  const escolha = GRUPOS.flatMap((g) => g.escolhas).find((e) => e.id === id);
  return escolha?.opcoes.find((o) => o.id === valor)?.rotulo ?? null;
}

/* Quais escolhas divergem do padrão, com o rótulo de cada uma. */
export function foraDoPadrao(escolhas) {
  return Object.entries(escolhas ?? {})
    .filter(([id, valor]) => id in PADROES && valor !== PADROES[id])
    .map(([id, valor]) => ({ id, valor, rotulo: rotuloDaEscolha(id, valor) }))
    .filter((d) => d.rotulo);
}
