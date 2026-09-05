/* O Canvas é de computador. Esta medida cobra isso da tela servida.
 *
 * A DECISÃO. Erik, 04/09: "canvas n vai existir no telefone, ja falamos sobre
 * isso" — e o "já falamos" é o ponto. A decisão era antiga, vivia só na
 * conversa, e o produto não a conhecia: medido a 390px, o Canvas renderizava
 * inteiro e aparecia na barra de lugares como qualquer outro.
 *
 * O QUE ELA COBRA, nos dois tamanhos, porque uma medida que só sabe reprovar o
 * telefone deixaria eu "consertar" apagando o Canvas de todo lugar:
 *
 *   a 390   a barra de lugares NÃO oferece o Canvas, o rodapé NÃO o lista, e a
 *           rota /canvas responde com a EXPLICAÇÃO — não com a tela, e não com
 *           uma página em branco.
 *   a 1920  o Canvas está na barra, está no rodapé, e /canvas abre o Canvas.
 *
 * CONTROLE NEGATIVO. Zero vindo de seletor errado é idêntico a zero vindo de
 * acerto (CLAUDE.md, "A busca também precisa de controle negativo"). Antes de
 * dizer "o Canvas não está lá", esta medida prova que sabe achar: a Estante tem
 * de aparecer na barra nos dois tamanhos. Se ela não aparece, o seletor está
 * errado e a resposta é INDETERMINADA (97), não aprovação.
 */
(async () => {
  await new Promise((r) => setTimeout(r, 1400));

  /* ABRE O HAMBÚRGUER quando ele existe (só no telefone). O `--dentro` do
     `medir.mjs` não serve: ele exige que a rota mude, e este botão abre uma
     folha por cima. Sem abrir, a lista do menu nunca está no DOM e a medida
     leria zero item — zero de menu fechado, idêntico a zero de menu certo. */
  document.querySelector(".cabecalho-menu")?.click();
  await new Promise((r) => setTimeout(r, 500));

  const texto = (s) => [...document.querySelectorAll(s)].map((e) => e.textContent.trim());

  /* A barra de lugares pelo RÓTULO ACESSÍVEL, e não pela classe. A prova cobra o
     requisito, não o nome interno — renomear `.lugar` não pode apagar a medida
     (foi assim que a prova r47 do terminal quebrou). */
  const barra = document.querySelector('nav[aria-label="Lugares do Mekora"]');
  const naBarra = barra ? [...barra.querySelectorAll("a")].map((a) => a.textContent.trim()) : [];

  /* O RODAPÉ NÃO ESTÁ EM TODA TELA — a Estante e o Canvas não têm um. Sem este
     controle, "canvasNoRodape: false" numa tela sem rodapé é indistinguível de
     rodapé certo, e é o verde por omissão de sempre. */
  const rodape = document.querySelector("footer.rodape");
  const noRodape = rodape ? [...rodape.querySelectorAll("a, button")].map((e) => e.textContent.trim()) : [];

  const janela = { largura: window.innerWidth, altura: window.innerHeight };
  const rota = location.pathname;

  return {
    janela,
    rota,
    naBarra,
    canvasNaBarra: naBarra.some((t) => /canvas/i.test(t)),
    temRodape: !!rodape,
    canvasNoRodape: rodape ? noRodape.some((t) => /canvas/i.test(t)) : null,
    /* A TELA em si: a superfície do Canvas, e a explicação que a substitui. */
    /* O HAMBÚRGUER DO TELEFONE (nó 964:24606) usa a mesma lista do rodapé, e
       "usa a mesma lista" é justamente o tipo de garantia que este repositório
       já viu falhar. Medido aberto, e não deduzido. Vazio quando fechado — daí
       o `itensNoMenu` no controle. */
    canvasNoMenu: [...document.querySelectorAll('[role="dialog"] a, .menu-grupo a')]
      .map((a) => a.textContent.trim())
      .some((t) => /canvas/i.test(t)),
    telaDoCanvas: !!document.querySelector("section.canvas"),
    telaDeExplicacao: !!document.querySelector("section.ainda-nao"),
    explicacao: document.querySelector("section.ainda-nao .aviso")?.textContent.trim() ?? null,
    /* CONTROLE NEGATIVO: se a Estante não aparece, o seletor não acha nada e o
       "canvasNaBarra: false" acima não vale como resposta. */
    controle: {
      estanteNaBarra: naBarra.some((t) => /estante/i.test(t)),
      itensNaBarra: naBarra.length,
      estanteNoRodape: rodape ? noRodape.some((t) => /estante/i.test(t)) : null,
      itensNoRodape: noRodape.length,
      itensNoMenu: document.querySelectorAll('[role="dialog"] a, .menu-grupo a').length,
    },
  };
})();
