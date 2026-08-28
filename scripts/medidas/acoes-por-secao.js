(()=>{S.conta=true;const T=e=>e?e.innerText.replace(/\s+/g," ").trim():null;
 const conta=()=>{const col=document.querySelector(".colE");
   const por={};
   [...col.querySelectorAll("button")].forEach(b=>{
     let sec="(topo)";
     for(let e=b;e&&e!==col;e=e.parentElement){
       if(e.classList.contains("rels")){sec="Relacionadas";break;}
       if(e.classList.contains("conc")){sec="Classificar";break;}
       if(e.classList.contains("acsN")){sec="Acoes da nota";break;}
       if(e.classList.contains("trechoN")){sec="Trecho";break;}
       if(e.classList.contains("estLv")){sec="As fontes";break;}
       if(e.classList.contains("trl")){sec="Trilha";break;}
       if(e.classList.contains("migl")){sec="Migalha";break;}
       if(e.classList.contains("conj")){sec="Tira";break;}
     }
     por[sec]=(por[sec]||0)+1;});
   return por;};
 S.lugar="notas";S.nfiltro="estudos";S.folha=null;pinta();
 document.querySelector('[data-a="est-abrir"]').click();
 const est=conta();
 const eEst=estudoK(S.estK);
 const oEstado=estadoEstudo(eEst);
 const diz=(document.querySelector(".colE")||{innerText:""}).innerText;
 document.querySelector('.grupoE [data-a="nota-abrir"],.trl [data-a="nota-abrir"]').click();
 return {botoesDoEstudo:est,botoesDaNota:conta(),
   estadoDoEstudo:oEstado,
   aPaginaDoEstudoDizOEstado:/andando|guardado|fechado/i.test(diz)};})()
