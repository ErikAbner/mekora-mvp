(()=>{
 /* AUDITORIA — somente leitura. Contagem, nunca adjetivo. */
 const T=e=>e?e.innerText.replace(/\s+/g," ").trim():null;
 S.conta=true;S.lugar="nota";S.notaK="n-solta-1";pinta();
 const corpo=document.querySelector(".corpo"),col=document.querySelector(".colE");
 const cr=col.getBoundingClientRect();
 const filhos=[...col.children];
 const cx=e=>{const r=e.getBoundingClientRect();
   return {tag:e.tagName.toLowerCase()+"."+(e.className||"").split(" ")[0],
     txt:(T(e)||"").slice(0,42),topo:Math.round(r.top-cr.top),alt:Math.round(r.height)};};
 const mapa=filhos.map(cx);
 /* vazio vertical: soma dos intervalos entre blocos */
 const vaos=[];
 for(let i=1;i<mapa.length;i++){
   const g=mapa[i].topo-(mapa[i-1].topo+mapa[i-1].alt);
   if(g>0)vaos.push({entre:mapa[i-1].txt.slice(0,22)+" -> "+mapa[i].txt.slice(0,22),px:g});
 }
 const alturaTotal=mapa.length?mapa[mapa.length-1].topo+mapa[mapa.length-1].alt:0;
 const somaVaos=vaos.reduce((s,v)=>s+v.px,0);

 /* cabecalhos de secao: quantos, e todos com o mesmo tratamento? */
 const cabs=[...col.querySelectorAll(".soltoE")].map(e=>{
   const st=getComputedStyle(e);
   return {txt:T(e),estilo:st.fontFamily.split(",")[0]+" "+st.fontSize+" "+st.fontWeight+" "+st.color};});
 const estilosDistintos=[...new Set(cabs.map(c=>c.estilo))].length;

 /* controles: quantos, e quantos pesos distintos? */
 const bts=[...col.querySelectorAll("button")].map(b=>{
   const st=getComputedStyle(b);
   return {txt:T(b),peso:st.fontSize+"/"+st.fontWeight+"/"+(st.borderTopWidth!=="0px"?"caixa":"texto")};});
 const pesos=[...new Set(bts.map(b=>b.peso))];

 /* a migalha repete o titulo? */
 const ult=T(col.querySelector(".migl [aria-current]"))||"";
 const h1=T(col.querySelector(".notaG"))||"";
 const repete=h1.indexOf(ult.replace(/…$/,""))===0;

 /* copy que explica o algoritmo, dentro do conteudo */
 const explica=[...col.querySelectorAll(".relX,.pgN,.vazioN")].map(T)
   .filter(t=>t&&/Mekora|palavra|radical|algoritmo|repetem/.test(t));

 /* contraste do texto mais claro em uso */
 const lum=c=>{const m=c.match(/\d+/g).slice(0,3).map(Number)
   .map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
   return .2126*m[0]+.7152*m[1]+.0722*m[2];};
 const fundo=lum(getComputedStyle(document.body).backgroundColor||"rgb(250,249,245)");
 const textos=[...col.querySelectorAll("p,span,cite,button,label")].map(e=>{
   const st=getComputedStyle(e);
   if(!T(e))return null;
   const L=lum(st.color);
   const r=(Math.max(L,fundo)+.05)/(Math.min(L,fundo)+.05);
   return {txt:(T(e)||"").slice(0,26),cor:st.color,tam:st.fontSize,razao:+r.toFixed(2)};
 }).filter(Boolean);
 const reprova=textos.filter(t=>t.razao<4.5);

 return {
  blocos:mapa.length,
  alturaDaColuna:alturaTotal,
  vazioVerticalSomado:somaVaos,
  proporcaoVazia:+(somaVaos/alturaTotal).toFixed(2),
  maioresVaos:vaos.sort((a,b)=>b.px-a.px).slice(0,5),
  cabecalhos:cabs.map(c=>c.txt),
  estilosDeCabecalhoDistintos:estilosDistintos,
  controles:bts.length,
  pesosDeControle:pesos,
  migalhaRepeteOTitulo:repete,
  frasesQueExplicamOAlgoritmo:explica,
  textosAbaixoDe45:reprova
 };
})()
