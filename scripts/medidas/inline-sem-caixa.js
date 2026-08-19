/* Regra de CSS com altura ou largura caindo em elemento que computa
   display:inline. Elemento de linha ignora as duas, e o resultado não é erro
   nenhum no console: é um retângulo de 2px onde devia haver uma miniatura.
   Foi assim que as 96 páginas da organização avançada passaram seis dias
   invisíveis. Varre todos os estados, não só o que está na tela. */
(()=>{
  const achados=new Map(),regras=[];
  for(const folha of document.styleSheets){
    let rs;try{rs=folha.cssRules;}catch{continue;}
    (function anda(lista){
      for(const r of lista){
        if(r.cssRules)anda(r.cssRules);
        if(!r.selectorText||!r.style)continue;
        const decl=["height","width","min-height","min-width","aspect-ratio"]
          .map(p=>[p,r.style.getPropertyValue(p)])
          .filter(([,v])=>v&&v!=="auto").map(([p,v])=>p+":"+v);
        if(decl.length)regras.push({sel:r.selectorText,decl});
      }
    })(rs);
  }
  const trocados=["img","svg","input","select","textarea","button","br","canvas","video"];
  const visita=()=>{
    for(const {sel,decl} of regras){
      let els;try{els=document.querySelectorAll(sel);}catch{continue;}
      for(const e of els){
        if(getComputedStyle(e).display!=="inline")continue;
        if(trocados.includes(e.tagName.toLowerCase()))continue;
        const b=e.getBoundingClientRect(),k=sel+"|"+e.tagName;
        if(!achados.has(k))achados.set(k,{sel,tag:e.tagName.toLowerCase(),cls:e.className,
          decl,medido:Math.round(b.width)+"x"+Math.round(b.height)});
      }
    }
  };
  const estados=[
    ()=>{S.lugar="home";S.folha=null;},()=>{S.lugar="mesa";S.folha=null;},
    ()=>{S.lugar="item";S.folha=null;},()=>{S.lugar="livro";S.folha=null;},
    ()=>{S.lugar="estante";S.folha=null;},()=>{S.lugar="leitura";S.dentro=true;S.folha=null;},
    ()=>{S.lugar="perfil";S.folha=null;},
    ()=>{S.folha="paginas";},()=>{S.folha="aa";},()=>{S.folha="viewport";},
    ()=>{S.folha="ajuda";},()=>{S.folha="conta";},()=>{S.folha="envio";},
    ()=>{S.folha="capa";},()=>{S.folha="traduzir";},()=>{S.folha="pend";},
    ()=>{S.folha="sumario";},()=>{S.folha="busca";},()=>{S.folha="controles";},
    ()=>{S.folha="wiz";},()=>{S.folha="usb";},
  ];
  for(const f of estados){try{f();pinta();visita();}catch{/* estado indisponível */}}
  return [...achados.values()].sort((a,b)=>a.sel.localeCompare(b.sel));
})()
