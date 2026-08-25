(()=>({larguraDaPagina:document.documentElement.scrollWidth,
  janela:window.innerWidth,
  estouraNaHorizontal:document.documentElement.scrollWidth>window.innerWidth+1,
  colunas:getComputedStyle(document.querySelector(".quadro")).gridTemplateColumns,
  cartoes:document.querySelectorAll(".qCard").length,
  cartaoMaisLargo:Math.max(...[...document.querySelectorAll(".qCard")].map(c=>c.scrollWidth))}))()
