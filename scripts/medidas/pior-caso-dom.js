(() => {
  const elementos = [...document.querySelectorAll("body *")];
  const conta = (chave) => [...elementos.reduce((mapa, el) => {
    const valor = chave(el);
    mapa.set(valor, (mapa.get(valor) || 0) + 1);
    return mapa;
  }, new Map())].sort((a, b) => b[1] - a[1]).slice(0, 20);
  return {
    rota: location.pathname,
    total: elementos.length,
    por_tag: conta((el) => el.tagName.toLowerCase()),
    por_classe: conta((el) => typeof el.className === "string" && el.className.trim()
      ? el.className.trim().split(/\s+/)[0]
      : "(sem classe)"),
    estudos: document.querySelectorAll(".estudo-cartao").length,
    notas_de_estudo: document.querySelectorAll(".estudo-nota").length,
    capas: document.querySelectorAll(".capa-reserva").length,
  };
})()
