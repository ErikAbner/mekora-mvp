/* A faixa global é fixa; portanto o aplicativo precisa reservar no fim da
 * página pelo menos a altura dela. Esta medida cria um resultado concluído no
 * perfil descartável do Chrome e confere o encaixe real, inclusive o id do nó
 * raiz (`#raiz`, não o `#root` comum de outros projetos). */
(async () => {
  localStorage.setItem("mekora:atividades", JSON.stringify([{
    id: 999999,
    tipo: "conversao",
    iniciadoEm: new Date().toISOString(),
    resultado: "sucesso",
    terminadoEm: new Date().toISOString(),
    progresso: 100,
  }]));
  window.dispatchEvent(new CustomEvent("mekora:atividades"));
  await new Promise((resolve) => setTimeout(resolve, 200));

  const raiz = document.getElementById("raiz");
  const faixa = document.querySelector(".lote-global");
  const padding = parseFloat(getComputedStyle(raiz).paddingBottom) || 0;
  const altura = faixa?.getBoundingClientRect().height || 0;
  return {
    encontrou: Boolean(faixa),
    padding,
    altura,
    reservaSuficiente: Boolean(faixa) && padding >= altura + 24,
    centralizada: faixa
      ? Math.abs((faixa.getBoundingClientRect().left + faixa.getBoundingClientRect().width / 2) - innerWidth / 2) < 1
      : false,
  };
})()
