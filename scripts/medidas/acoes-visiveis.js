(()=>{S.conta=true;
 const visivel=e=>{for(let x=e;x&&x!==document.body;x=x.parentElement){
   const s=getComputedStyle(x);
   if(s.display==="none"||s.visibility==="hidden"||parseFloat(s.opacity)===0)return false;}
   return true;};
 const conta=()=>{const col=document.querySelector(".colE");
   const bs=[...col.querySelectorAll("button")];
   return {noDom:bs.length,visiveis:bs.filter(visivel).length,
     alcancaveisPorTab:bs.filter(b=>b.tabIndex>=0).length};};
 S.lugar="notas";S.nfiltro="estudos";S.folha=null;pinta();
 document.querySelector('[data-a="est-abrir"]').click();
 const est=conta();
 document.querySelector('.grupoE [data-a="nota-abrir"],.trl [data-a="nota-abrir"]').click();
 const nota=conta();
 return {estudo:est,nota:nota,
   razaoEmRepouso:+(nota.visiveis/est.visiveis).toFixed(2)};})()
