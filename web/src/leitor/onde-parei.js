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
