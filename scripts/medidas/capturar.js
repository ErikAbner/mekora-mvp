/* Semeia e navega, para a captura mostrar a tela cheia e não a vazia. */
(async () => {
  const tela = window.__MEKORA_TELA__ || "/conta/kindle";
  await new Promise((r) => setTimeout(r, 1200));
  const post = (u, c) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).then((r) => (r.ok ? r.json() : null));

  const CORES = ["amarelo", "verde", "rosa", "azul"];
  const notas = [];
  for (let i = 0; i < CORES.length; i++) {
    const n = await post("/canvas/nos", {
      texto: ["A repetição produz o que uma foto isolada não produz.",
              "Uma imagem sozinha permite lembrar; a série permite comparar.",
              "O simpático senhor o anunciara por R$ 22 mil.",
              "Nenhuma decisão sobreviveu ao primeiro contato com o terreno."][i],
      cor: CORES[i], x: 40 + (i % 3) * 250, y: 40 + Math.floor(i / 3) * 170,
    });
    if (n) notas.push(n);
  }
  if (notas.length >= 2) await post("/canvas/ligacoes", { de_id: notas[0].nota_id, para_id: notas[1].nota_id });
  if (notas.length >= 4) await post("/canvas/ligacoes", { de_id: notas[1].nota_id, para_id: notas[3].nota_id });

  await post("/aparelhos", { endereco: "erik@kindle.com", nome: "Paperwhite" });

  const e = await post("/estudos/novo", { nome: "Método de campo", sobre: "O que a repetição produz que uma foto isolada não produz?" });
  if (e && notas.length) {
    await post(`/estudos/${e.id}/notas`, { nota_id: notas[0].nota_id });
    await post(`/estudos/${e.id}/notas`, { nota_id: notas[1].nota_id });
  }

  history.pushState({}, "", tela);
  window.dispatchEvent(new PopStateEvent("popstate"));

  const conta = () => [...document.querySelectorAll("body *")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).length;
  let ant = -1, est = 0;
  for (let i = 0; i < 40 && est < 3; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const a = conta();
    est = a === ant ? est + 1 : 0;
    ant = a;
  }
  return { onde: location.pathname, nos: ant };
})()
