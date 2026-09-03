/* SELETOR MORTO — a regra que não alcança nada.
 *
 *     node scripts/medir.mjs <url> <larg> <alt> scripts/seletores.js
 *
 * Devolve, por rota, quantos elementos cada seletor do pacote alcança. Sozinho
 * ele não acusa nada: uma regra do Canvas não casa na Mesa, e está certo. Quem
 * acusa é a SOMA de todas as rotas e estados — `scripts/seletores.mjs`, que roda
 * este aqui em cada uma e cruza os resultados.
 *
 * POR QUE ISTO EXISTE
 * ===================
 * `.cabecalho-acoes > .acao:not(.cabecalho-menu) { display: none }` existia para
 * esconder os dois atalhos no telefone. Ela nunca escondeu nada: os dois moram
 * dentro de `.cabecalho-atalhos`, então são NETOS da caixa, e `>` só pega filho.
 * A tela parecia certa — o hambúrguer aparecia, a busca aparecia — e o defeito
 * só apareceu quando a busca ficou com 70px de largura num telefone.
 *
 * Uma regra que não casa com nada é uma de duas coisas, e as duas pedem mão:
 * código morto, ou um modelo errado do DOM escrito com confiança.
 *
 * O QUE ELE NÃO CONSEGUE TESTAR, e por isso não acusa
 * ==================================================
 * `:hover`, `:focus`, `:active` e companhia descrevem ESTADO do ponteiro, e
 * `querySelectorAll` não os simula. Pseudo-elemento (`::before`, `::placeholder`)
 * não é elemento. Nos dois casos o seletor é reduzido à parte estrutural — se
 * sobrar algo testável, testa-se isso; se não sobrar, ele é declarado não
 * testável em vez de morto.
 */
(() => {
  /* O ESTADO tem de aparecer no relatório: a mesma rota com a folha aberta e
   * fechada alcança conjuntos diferentes, e somar as duas sem saber qual é qual
   * esconde o que só existe aberto. */
  const estado = location.pathname + (document.querySelector('.folha') ? ' [folha]' : '');

  const DINAMICAS = /:(?:hover|focus|focus-visible|focus-within|active|visited|target|any-link|autofill|placeholder-shown|user-invalid|open)\b/g;
  const PSEUDO_ELEMENTO = /::[\w-]+(\([^)]*\))?/g;

  const limpar = (sel) =>
    sel.replace(PSEUDO_ELEMENTO, '').replace(DINAMICAS, '').trim();

  const contagem = new Map();
  let regras = 0;
  let naoTestaveis = 0;

  /* A REGRA COMUM TAMBÉM TEM `cssRules` — e foi assim que esta medida nasceu
   * verde sem medir nada.
   *
   * Desde o CSS aninhado, `CSSStyleRule` implementa `CSSGroupingRule`: toda
   * regra de estilo carrega um `cssRules` VAZIO. Vazio, mas objeto — e objeto é
   * truthy. A primeira versão fazia `if (regra.cssRules) { recorre; continue }`,
   * então TODA regra caía no ramo da recursão, recorria numa lista vazia e
   * seguia. Resultado: 46 folhas, 1678 regras, e o relatório dizendo "0
   * seletores" sem erro nenhum — o pior tipo de verde, o que vem de não ter
   * olhado.
   *
   * Agora as duas coisas acontecem na ordem certa: quem tem seletor é medido, e
   * quem tem filhos DE VERDADE é percorrido. */
  const anda = (lista) => {
    for (const regra of lista) {
      if (regra.cssRules && regra.cssRules.length) anda(regra.cssRules);
      if (!regra.selectorText) continue;
      regras += 1;
      for (const bruto of regra.selectorText.split(',')) {
        const original = bruto.trim();
        if (!original) continue;
        const sel = limpar(original);
        if (!sel || sel === '*' || /^[>+~]/.test(sel)) { naoTestaveis += 1; continue; }
        let quantos = null;
        try { quantos = document.querySelectorAll(sel).length; }
        catch { naoTestaveis += 1; continue; }
        const antes = contagem.get(original);
        contagem.set(original, Math.max(antes ?? 0, quantos));
      }
    }
  };

  const problemas = [];
  for (const folha of document.styleSheets) {
    /* Folha de outro domínio levanta `SecurityError` ao ler as regras. E o
     * `catch` REGISTRA em vez de engolir: a primeira versão engolia, e uma folha
     * que estourava na primeira regra saía do relatório sem deixar rastro — o
     * portão dizia "zero seletores" e parecia verde. */
    try { anda(folha.cssRules); } catch (e) { problemas.push(`${folha.href || '(inline)'}: ${e.name} ${e.message}`.slice(0, 120)); }
  }

  return {
    estado,
    folhas: document.styleSheets.length,
    regras,
    seletores: contagem.size,
    nao_testaveis: naoTestaveis,
    problemas,
    /* O nome e a contagem, crus. Quem decide o que é morto é a soma. */
    alcance: Object.fromEntries(contagem),
  };
})()
