/* A TELA DE ANDAMENTO, que a bancada nunca mostra por si.
 *
 * O conversor da bancada falha na hora — `POST /jobs/{id}/convert` volta com
 * "Erro inesperado na conversão" antes de qualquer barra aparecer —, então a
 * tela que o nó `967:31833` desenha não tem como ser medida no navegador.
 * Medir só o CSS seria verde por omissão: a folha diz um número e ninguém viu
 * a tela.
 *
 * Este arquivo é o setup do `medir.mjs`. Ele envelopa o `fetch` da PÁGINA (não
 * do produto) para que `/convert` responda 200 e `/status` responda
 * "convertendo" com 42 de 96, e clica em "Preparar com recomendações" assim
 * que o botão existe. O que se mede depois disso é a tela de verdade, com os
 * componentes de verdade — só a resposta do servidor é de mentira.
 *
 *     node scripts/medir.mjs "$WEB/preparo/$ID" 390 844 \
 *       scripts/medidas/andando-de-mentira.js scripts/medidas/tela.js --sessao=$TOKEN
 */
(() => {
  const orig = window.fetch.bind(window);
  window.fetch = async (url, opts) => {
    const u = String(url && url.url ? url.url : url);
    if (/\/jobs\/\d+\/convert/.test(u)) {
      return new Response(JSON.stringify({ id: 1, status: "converting", active_operation: "convert:medida" }),
        { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (/\/jobs\/\d+\/status/.test(u)) {
      return new Response(JSON.stringify({
        status: "converting", active_operation: "convert:medida",
        stage: "ocr", progress: { percent: 43.75, done: 42, total: 96, message: null },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return orig(url, opts);
  };
  const bate = setInterval(() => {
    const b = [...document.querySelectorAll("button")]
      .find((e) => /Preparar com recomenda/.test(e.textContent || ""));
    if (b) { clearInterval(bate); b.click(); }
  }, 150);
  setTimeout(() => clearInterval(bate), 8000);
})()
