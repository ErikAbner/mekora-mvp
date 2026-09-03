/* COLUNA ESTRANGULADA — o texto que recebeu largura de rótulo.
 *
 *     node scripts/medir.mjs <url> <larg> <alt> scripts/coluna.js
 *
 * POR QUE ISTO EXISTE
 * ===================
 * O portão mede cor, contraste e corpo. Nenhum dos três vê uma frase espremida
 * numa coluna de 14 pixels: as letras continuam pretas, do tamanho certo, com
 * contraste de sobra — e a tela lê "Ruined by Design: How Designers…" com uma
 * palavra por linha, dezessete linhas de altura, o autor sobreposto ao lado.
 *
 * Foi o defeito de 03/09 na lista de "Trazer para a superfície": um
 * `grid-template-columns: 14px 1fr` pensado para a nota, que tem marca de cor na
 * primeira coluna, recebendo o livro, que não tem. O título caiu na coluna de
 * 14px. Ninguém escreveu 14px para um título; a regra fazia sentido para outro
 * filho.
 *
 * A ASSINATURA, e ela é MEDIDA NO RENDER
 * ======================================
 * A primeira versão perguntava se a coluna chegava ao dobro da maior palavra, e
 * era proxy: acusou "Política de privacidade" numa coluna de 182px, que quebra
 * em duas linhas e está perfeita. Cinco rotas, treze falsos positivos, zero
 * defeito — um portão assim ensina a ignorá-lo.
 *
 * O que o defeito produz não é uma razão, é um FATO na tela: **uma palavra por
 * linha**. Então é isso que se mede, e de duas formas:
 *
 *   linhas ≥ palavras     o texto quebrou uma vez por palavra, ou mais
 *   coluna < maior palavra    a palavra não cabe: ou vaza, ou é partida no meio
 *
 * A primeira é o sintoma direto, contado no elemento desenhado. A segunda pega o
 * caso extremo antes de ele virar sintoma — a coluna de 14px do `trazer-texto`,
 * onde nenhuma palavra de título cabe.
 *
 * O QUE ELE NÃO ACUSA, de propósito
 * =================================
 * Uma ou duas palavras — rótulo, número, "Fechar" — não têm o que quebrar.
 * Texto invisível, de largura zero, ou fora da tela: não é layout, é estado.
 * E `white-space: nowrap`, que declara não querer quebrar; ali a coluna estreita
 * vira reticências, e isso é decisão de quem escreveu.
 */
(() => {
  const medidor = document.createElement('canvas').getContext('2d');

  const larguraDaPalavra = (palavra, estilo) => {
    medidor.font = `${estilo.fontStyle} ${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`;
    return medidor.measureText(palavra).width;
  };

  /* SÓ QUEM CARREGA O TEXTO. Um `<div>` que contém um `<p>` tem o texto do filho
   * no `textContent`, e acusá-lo seria acusar o pai pelo tamanho do filho. */
  const folhaDeTexto = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) &&
    ![...el.children].some((f) => (f.textContent || '').trim().length > 3);

  const achados = [];
  let olhados = 0;

  for (const el of document.querySelectorAll('body *')) {
    if (!folhaDeTexto(el)) continue;
    const texto = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const palavras = texto.split(' ').filter(Boolean);
    if (palavras.length < 3) continue;

    const estilo = getComputedStyle(el);
    if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;
    if (estilo.whiteSpace === 'nowrap' || estilo.whiteSpace === 'pre') continue;

    const caixa = el.getBoundingClientRect();
    if (caixa.width < 1 || caixa.height < 1) continue;

    /* A largura de CONTEÚDO, e não a da caixa: 24px de recheio de cada lado
     * numa caixa de 60 deixam 12 para o texto, e é o texto que quebra. */
    const dentro =
      caixa.width -
      parseFloat(estilo.paddingInlineStart || 0) -
      parseFloat(estilo.paddingInlineEnd || 0) -
      parseFloat(estilo.borderInlineStartWidth || 0) -
      parseFloat(estilo.borderInlineEndWidth || 0);
    if (dentro < 1) continue;

    olhados += 1;
    const maior = palavras.reduce((a, b) => (a.length >= b.length ? a : b));
    const larguraMaior = larguraDaPalavra(maior, estilo);
    if (larguraMaior < 1) continue;

    const entrelinha = parseFloat(estilo.lineHeight) || parseFloat(estilo.fontSize) || 16;
    const linhas = Math.round(caixa.height / entrelinha);

    /* `-webkit-line-clamp` corta a altura de propósito: um título clampado em
     * duas linhas tem duas linhas por decisão, e contar isso como quebra por
     * palavra acusaria justamente a defesa contra o defeito. */
    const clampado = (estilo.webkitLineClamp && estilo.webkitLineClamp !== 'none') ? Number(estilo.webkitLineClamp) : 0;

    const umaPorLinha = !clampado && linhas >= palavras.length;
    const naoCabe = dentro < larguraMaior;

    if (umaPorLinha || naoCabe) {
      achados.push({
        por: naoCabe ? 'a maior palavra não cabe na coluna' : 'uma palavra por linha',
        linhas,
        seletor: `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.toString().trim().split(/\s+/).join('.') : ''}`.slice(0, 60),
        texto: texto.slice(0, 48),
        palavras: palavras.length,
        coluna: Math.round(dentro),
        maior_palavra: maior,
        largura_da_maior: Math.round(larguraMaior),
      });
    }
  }

  return {
    rota: location.pathname,
    janela: innerWidth,
    olhados,
    estrangulados: achados.length,
    achados: achados.slice(0, 10),
    passou: achados.length === 0,
  };
})()
