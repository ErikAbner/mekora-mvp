(()=>{
 /* O TESTE DOS CINCO SEGUNDOS, medido: numa tela sem ancora, nenhum
    elemento domina. "Massa visual" aqui = area ocupada x contraste com o
    fundo. Se o maior nao for o conteudo, a tela nao diz o que e. */
 const T=e=>e?e.innerText.replace(/\s+/g," ").trim():null;
 const lum=c=>{const m=(c.match(/\d+/g)||[0,0,0]).slice(0,3).map(Number)
   .map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
   return .2126*m[0]+.7152*m[1]+.0722*m[2];};
 const fundo=lum("rgb(250,249,245)");
 const massa=e=>{
   const st=getComputedStyle(e),r=e.getBoundingClientRect();
   if(!r.width||!r.height)return null;
   const t=(e.innerText||"").trim();
   if(!t)return null;
   const L=lum(st.color);
   const contraste=(Math.max(L,fundo)+.05)/(Math.min(L,fundo)+.05);
   const px=parseFloat(st.fontSize);
   /* proprio texto, e nao o dos filhos */
   const proprio=[...e.childNodes].filter(n=>n.nodeType===3)
     .map(n=>n.textContent.trim()).join(" ").trim();
   if(!proprio)return null;
   return {txt:proprio.slice(0,34),px:+px.toFixed(1),peso:st.fontWeight,
     familia:st.fontFamily.split(",")[0].replace(/["']/g,""),
     cor:st.color,contraste:+contraste.toFixed(2),
     fundo:st.backgroundColor,
     massa:Math.round(proprio.length*px*contraste)};
 };
 const varre=sel=>{
   const col=document.querySelector(sel);
   if(!col)return null;
   const es=[...col.querySelectorAll("*")].map(massa).filter(Boolean);
   const tamanhos=[...new Set(es.map(e=>e.px))].sort((a,b)=>b-a);
   const cores=[...new Set(es.map(e=>e.cor))];
   const pesos=[...new Set(es.map(e=>e.peso))];
   const total=es.reduce((s,e)=>s+e.massa,0);
   const top=es.sort((a,b)=>b.massa-a.massa).slice(0,5);
   return {
     elementosComTexto:es.length,
     tamanhosDistintos:tamanhos,
     coresDistintas:cores.length,
     pesosDistintos:pesos,
     abaixoDe14px:es.filter(e=>e.px<14).length,
     fracaoDaMassaNoMaior:+(top[0].massa/total).toFixed(2),
     cincoMaiores:top.map(e=>e.px+"px "+e.familia+" · massa "+e.massa+" · "+e.txt)
   };
 };
 const out={};
 S.conta=true;
 /* 3 · a pagina de uma nota */
 S.lugar="notas";S.nfiltro="livros";pinta();
 const b=document.querySelector('.grupoE .cab [data-a="nota-abrir"]');
 if(b)b.click();
 out.paginaDaNota=varre(".colE");
 /* a inversao suspeita: o trecho tem fundo e a nota nao? */
 const nota=document.querySelector(".notaG"),trecho=document.querySelector(".trechoN");
 out.inversao={
   notaTemFundo:nota?getComputedStyle(nota).backgroundColor:"sem nota",
   trechoTemFundo:trecho?getComputedStyle(trecho).backgroundColor:"sem trecho"};
 /* 2 · a lista */
 S.lugar="notas";S.nfiltro="todas";pinta();
 out.lista=varre(".colE");
 const pai=document.querySelector(".grupoE .cab"),filho=document.querySelector(".grupoE .cit");
 out.paiEFilho={
   paiTemFundo:pai?getComputedStyle(pai).backgroundColor:null,
   filhoTemFundo:filho?getComputedStyle(filho).backgroundColor:null};
 /* 1 · o painel do livro */
 S.lugar="leitura";S.dentro=true;S.folha="sumario";S.sumAba="marcas";pinta();
 const abas=[...document.querySelectorAll(".plabas button")];
 out.painel={
   larguraDoPainel:Math.round(document.querySelector(".painelLado").getBoundingClientRect().width),
   abas:abas.map(a=>T(a)),
   linhasPorAba:abas.map(a=>{const h=a.getBoundingClientRect().height;
     return Math.round(h/parseFloat(getComputedStyle(a).lineHeight||18));}),
   larguraSomadaDasAbas:Math.round(abas.reduce((s,a)=>s+a.getBoundingClientRect().width,0)),
   abaComZero:abas.filter(a=>/\b0\b/.test(T(a))).map(a=>T(a)),
   campoDeBusca:(()=>{const c=document.getElementById("qLivro");
     return c?Math.round(c.getBoundingClientRect().height):null;})(),
   vazio:(T(document.querySelector(".plnota"))||"").length};
 return out;
})()
