/* Dados de exemplo, fora das telas e fora do roteador.
 *
 * Tela que carrega o próprio dado não se prova com outro, e roteador que carrega
 * exemplo mistura navegação com conteúdo. Aqui eles ficam disponíveis e entram
 * só quando a URL pede — `?exemplo`.
 */
export const EXEMPLO_FILA = [
  { id: 1, nome: "Enviesados.pdf", estado: "trabalhando", etapa: "convertendo", progresso: 85 },
  { id: 2, nome: "Inviesados.pdf", estado: "erro", etapa: "a conversão", motivo: "Formato não reconhecido" },
  { id: 3, nome: "Another.pdf", estado: "pronto", digitalizado: true },
];

export const EXEMPLO_ESTANTE = [1, 2, 3, 4, 1, 2, 3, 4].map((n, i) => ({
  chave: i + 1, titulo: "Estudo de viabilidade", autor: "Ana Duarte", notas: 24,
  capa: `/capas/exemplo-${n}.png`,
}));

export const EXEMPLO_FICHA = {
  titulo: "Estudo de Viabilidade", autor: "Ana Duarte", formato: "Epub",
  lido: 80, notas: 24,
  amostra: "“…última nota destacada aparece aqui como amostra do pensamento…”",
  etiquetas: ["#Design"],
};

/* Os destaques vêm por ÍNDICE de caractere, que é como chegarão do servidor —
 * nunca por coordenada de tela. */
export const EXEMPLO_LEITURA = {
  titulo: "Enviesados",
  autor: "Ana Duarte",
  paragrafos: [
    { texto: "Certa vez, em minha contínua busca por Jeeps Willys — carro militar americano antigo produzido a partir da década de 40 e usado durante a Segunda Guerra Mundial, pelo qual sou um grande admirador por seu design e importância na história do automóvel — passei por várias cidades do interior do Brasil, onde pude encontrar alguns raros Jeeps em suas variadas formas, cores, configurações, e níveis de conservação.",
      destaques: [{ de: 0, ate: 63, cor: "verde" }] },
    { texto: "Há uns meses antes dessa nova busca, eu já havia encontrado um Willys CJ5 verde empoeirado e silenciosamente guardado em um estacionamento em uma pequena cidade próxima à minha. Para a minha felicidade, hoje ele está guardado a salvo na minha garagem.",
      destaques: [{ de: 176, ate: 246, cor: "amarelo" }] },
    { texto: "Mesmo que satisfeito por ter um lindo CJ5, não pude deixar de me apaixonar por um Willys CJ6 (conhecido como “Bernardão”) de um azul tão cristalino, que me fez ficar boquiaberto quando o vi pessoalmente: “Esse é meu!”.",
      destaques: [{ de: 124, ate: 178, cor: "azul" }] },
    { texto: "O simpático senhor o anunciara por R$ 22 mil. Para seu estado de conservação, era um excelente valor. Eu o compraria sem pensar. Mas, não.",
      destaques: [{ de: 101, ate: 138, cor: "rosa" }] },
  ],
};
