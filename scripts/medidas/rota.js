(()=>{
 S.conta=true;
 const T=e=>e?e.innerText.replace(/\s+/g," ").trim():null;
 const onde=()=>({migalha:T(document.querySelector(".migl"))||"(nenhuma)",
   titulo:(T(document.querySelector(".notaG"))||T(document.querySelector("h1"))||"").slice(0,40)});
 const passos=[];
 S.lugar="notas";S.nfiltro="estudos";S.conj=null;pinta();
 passos.push(Object.assign({passo:"0 - a entrada"},onde(),
   {estudos:document.querySelectorAll(".estC").length,
    sugeridos:document.querySelectorAll(".ideia").length,
    foraDeEstudo:document.querySelectorAll(".grupoE .cit").length,
    abasNoTopo:[...document.querySelectorAll(".nfila button[data-a=nota-filtro]")].map(T),
    abasNoSegundoNivel:[...document.querySelectorAll(".nfila2 button")].map(T)}));
 document.querySelector('.estC [data-a="est-abrir"]').click();
 passos.push(Object.assign({passo:"1 - abri o estudo"},onde(),
   {livros:document.querySelectorAll(".estLvI").length}));
 document.querySelector('.grupoE [data-a="nota-abrir"],.trl [data-a="nota-abrir"]').click();
 passos.push(Object.assign({passo:"2 - abri uma nota"},onde()));
 /* e agora o que ANTES ciclava: seguir a primeira relacionada, quatro vezes */
 for(let n=3;n<=6;n++){
   const r=document.querySelector('.relG [data-a="rel-abrir"]');
   if(!r){passos.push({passo:n+" - sem relacionada"});break;}
   r.click();
   passos.push(Object.assign({passo:n+" - toquei na primeira relacionada"},onde(),
     {abriuNoLugar:!!document.querySelector(".relG .cit.-aberta"),
      trocouDeTela:document.querySelectorAll(".notaG").length}));
 }
 return passos;})()
