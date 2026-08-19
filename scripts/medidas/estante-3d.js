/* Quanto da prateleira as lombadas ocupam. É o número que sustenta o selo de
   experimento na vista 3D: dizer "experimento" sem dizer o que ele faz pior
   seria selo decorativo.
   Espera as imagens: lombada é <img> com largura natural, e medir antes de
   carregar devolve zero — que seria um número errado, não uma medida. */
(async()=>{
  S.lugar="estante";S.estante="3d";S.folha=null;pinta();
  const imgs=[...document.querySelectorAll(".lombs img")];
  await Promise.all(imgs.map(i=>i.complete?null:new Promise(r=>{
    i.addEventListener("load",r,{once:true});i.addEventListener("error",r,{once:true});
  })));
  const prateleiras=[...document.querySelectorAll(".prat")].map(p=>{
    const tabua=p.querySelector(".tabua").getBoundingClientRect().width;
    const bts=[...p.querySelectorAll(".lombs button")];
    const ocupado=bts.reduce((a,b)=>a+b.getBoundingClientRect().width,0);
    return {lombadas:bts.length,tabua:Math.round(tabua),ocupado:Math.round(ocupado),
      porcento:Math.round(ocupado/tabua*100)};
  });
  S.estante="lista";pinta();
  return {prateleiras,titulosLegiveisEmCapas:document.querySelectorAll(".grade .bk .t").length};
})()
