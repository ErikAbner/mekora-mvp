/* Onde cada estudo esta DEPOIS do gesto, e o que sobrou no DOM. */
(()=>{const col=k=>[...document.querySelectorAll('.qCol[data-c="'+k+'"] .qCard h3')]
   .map(t=>t.innerText.trim());
 return {andando:col("andando"),guardado:col("guardado"),fechado:col("fechado"),
   fechadosNoEstado:S.estudos.filter(e=>e.fechado).map(e=>e.id),
   sobrouTransform:[...document.querySelectorAll(".qCard")].filter(c=>c.style.transform).length,
   sobrouArrastando:document.querySelectorAll(".qCard.-arrastando").length,
   sobrouMira:document.querySelectorAll(".qCol.-alvo,.qCol.-recusa").length};})()
