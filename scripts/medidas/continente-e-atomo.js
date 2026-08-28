(()=>{S.conta=true;const T=e=>e?e.innerText.replace(/\s+/g," ").trim():null;
 const lum=c=>{const m=(c.match(/\d+/g)||[0,0,0]).slice(0,3).map(Number)
   .map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
   return .2126*m[0]+.7152*m[1]+.0722*m[2];};
 const fundo=lum("rgb(250,249,245)");
 const perfil=()=>{
   const col=document.querySelector(".colE");
   const els=[...col.querySelectorAll("*")];
   const massa=e=>{const t=[...e.childNodes].filter(n=>n.nodeType===3)
     .map(n=>n.textContent.trim()).join(" ").trim();
     if(!t)return 0;const st=getComputedStyle(e),L=lum(st.color);
     return t.length*parseFloat(st.fontSize)*((Math.max(L,fundo)+.05)/(Math.min(L,fundo)+.05));};
   const total=els.reduce((s,e)=>s+massa(e),0);
   const maior=els.map(e=>({e,m:massa(e)})).sort((a,b)=>b.m-a.m)[0];
   return {
     classes:[...new Set(els.flatMap(e=>[...e.classList]))].sort(),
     botoes:[...col.querySelectorAll("button")].map(T).filter(Boolean),
     rotulos:[...col.querySelectorAll(".soltoE,.sublbl")].map(T),
     maiorElemento:{txt:(T(maior.e)||"").slice(0,40),
       px:getComputedStyle(maior.e).fontSize,
       chao:getComputedStyle(maior.e).backgroundColor,
       fracao:+(maior.m/total).toFixed(2)},
     campos:col.querySelectorAll("input,textarea").length};
 };
 S.lugar="notas";S.nfiltro="estudos";S.folha=null;pinta();
 document.querySelector('[data-a="est-abrir"]').click();
 const est=perfil();
 document.querySelector('.grupoE [data-a="nota-abrir"],.trl [data-a="nota-abrir"]').click();
 const nota=perfil();
 const comuns=est.classes.filter(c=>nota.classes.indexOf(c)>-1);
 const botoesIguais=est.botoes.filter(b=>nota.botoes.indexOf(b)>-1);
 return {estudo:{maior:est.maiorElemento,rotulos:est.rotulos,botoes:est.botoes.length},
   nota:{maior:nota.maiorElemento,rotulos:nota.rotulos,botoes:nota.botoes.length},
   classesEmComum:comuns.length+" de "+est.classes.length+" e "+nota.classes.length,
   quaisClassesEmComum:comuns,
   botoesIdenticos:botoesIguais};})()
