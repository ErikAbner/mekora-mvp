/* Traduzir rolagem em deslocamento de caractere, e de volta.
 *
 * O progresso é guardado como capítulo + deslocamento — a mesma âncora do
 * destaque. Mas a tela conhece PIXELS, e a rolagem não sabe nada sobre
 * caracteres. Estas duas funções fazem a tradução, e cada uma tem um jeito
 * errado óbvio que foi evitado.
 */

/* O deslocamento acumulado de cada bloco, para pôr no DOM. Somar aqui, uma vez,
 * em vez de a cada rolagem: rolar dispara dezenas de vezes por segundo. */
export function comDeslocamentos(blocos) {
  let de = 0;
  return blocos.map((b) => {
    const bloco = { ...b, de };
    de += (b.texto ?? "").length;
    return bloco;
  });
}

/* Qual deslocamento está no topo da tela AGORA.
 *
 * O bloco escolhido é o último que começa acima da linha de leitura, e não o
 * primeiro visível. A diferença aparece num parágrafo longo: com o primeiro
 * visível, um parágrafo que ocupa a tela inteira nunca é "o atual" enquanto seu
 * topo estiver fora — e o progresso trava no anterior enquanto a pessoa lê.
 *
 * A linha fica a um quinto da altura, e não no topo exato: é onde o olho está
 * quando alguém para de rolar, e não na borda de cima.
 */
export function ondeEstou(raiz) {
  if (!raiz) return 0;
  const linha = window.innerHeight * 0.2;
  let atual = 0;
  for (const el of raiz.querySelectorAll("[data-de]")) {
    if (el.getBoundingClientRect().top > linha) break;
    atual = Number(el.dataset.de) || 0;
  }
  return atual;
}

/* EM QUE CAPÍTULO A PESSOA ESTÁ, com vários na tela.
 *
 * Com a rolagem contínua, a tela tem uma pilha de capítulos e "o capítulo
 * atual" deixou de ser um dado da aplicação: ele passou a ser uma pergunta
 * sobre o que está na frente dos olhos.
 *
 * O critério é o mesmo do deslocamento — o último que começa acima da linha de
 * leitura —, e ele precisa ser o mesmo: se o deslocamento vier de um capítulo e
 * o número do capítulo de outro, o progresso grava uma posição que não existe,
 * e reabrir o livro leva para o lugar errado.
 *
 * Devolve `{ capitulo, deslocamento }` do MESMO ponto, e por isso os dois saem
 * juntos daqui em vez de serem calculados em lugares diferentes.
 */
export function ondeEstouNoLivro(raiz) {
  if (!raiz) return { capitulo: 0, deslocamento: 0 };
  const linha = window.innerHeight * 0.2;

  let secao = null;
  for (const s of raiz.querySelectorAll("[data-capitulo]")) {
    if (s.getBoundingClientRect().top > linha) break;
    secao = s;
  }
  /* Nenhuma seção começou acima da linha: a pessoa está no topo do primeiro
   * capítulo, antes de ele cruzar a linha. O primeiro é a resposta. */
  if (!secao) secao = raiz.querySelector("[data-capitulo]");
  if (!secao) return { capitulo: 0, deslocamento: ondeEstou(raiz) };

  return {
    capitulo: Number(secao.dataset.capitulo) || 0,
    /* O deslocamento é lido DENTRO da seção, e não na raiz: as contagens são por
     * capítulo, e medir na raiz devolveria a do último capítulo carregado. */
    deslocamento: ondeEstou(secao),
  };
}

/* Levar a tela até um deslocamento.
 *
 * Vai para o bloco que CONTÉM o deslocamento, e não para o que começa nele:
 * quem parou no meio de um parágrafo tem um deslocamento que não é o início de
 * bloco nenhum, e procurar igualdade exata não acharia nada.
 *
 * `auto` e não `smooth`: rolagem animada ao ABRIR uma página é a tela se mexendo
 * sozinha antes de a pessoa ter feito nada, e num leitor isso é desorientador.
 */
export function irPara(raiz, deslocamento) {
  if (!raiz || !deslocamento) return false;
  let alvo = null;
  for (const el of raiz.querySelectorAll("[data-de]")) {
    if ((Number(el.dataset.de) || 0) <= deslocamento) alvo = el;
    else break;
  }
  if (!alvo) return false;
  alvo.scrollIntoView({ behavior: "auto", block: "start" });
  return true;
}
