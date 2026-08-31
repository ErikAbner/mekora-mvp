(()=>{
 /* O TESTE DOS CINCO SEGUNDOS, medido: numa tela sem ancora, nenhum
    elemento domina. "Massa visual" aqui = area ocupada x contraste com o
    fundo. Se o maior nao for o conteudo, a tela nao diz o que e. */
 const T=e=>e?e.innerText.replace(/\s+/g," ").trim():null;
 const lum=c=>{const m=(c.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number)
   .map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
   return .2126*m[0]+.7152*m[1]+.0722*m[2];};

 /* ── O FUNDO E O DO ELEMENTO, e nao uma constante (R-009) ──────────────
    Aqui havia `const fundo = lum("rgb(250,249,245)")`. A constante NAO era
    arbitraria: #faf9f5 e exatamente o token --bg, o fundo da pagina. Por isso
    o defeito passou despercebido — para texto direto sobre --bg o contraste
    saia certo, com erro zero.

    Ele aparece onde o elemento esta sobre OUTRA superficie: cartao, destaque,
    painel. Medido antes de corrigir, na pagina de uma nota: de 46 elementos com
    texto, 1 estava sobre rgb(244,243,239) e media 17,33 em vez de 16,45 — 5,4%
    de erro. Um so hoje, e a probabilidade e alta porque a interface ganha
    superficie a cada tela nova.

    O metodo e o do `color-contrast-evaluate.js` do dequelabs/axe-core, avaliado
    em docs/references/colheita-github-mekora-2026-08-31.md: sobe a arvore
    compondo alfa ate achar uma superficie opaca. O que NAO veio de la e a
    sombra de texto — o idioma da casa tem poucas sombras, e tratar o que nao
    existe seria carregar codigo que nunca roda.

    Uma coisa esta fora do alcance de qualquer medida por arvore: fundo que vem
    de imagem, gradiente ou de um irmao posicionado por cima. Nesses casos o
    valor devolvido e o da superficie mais proxima na arvore, e nao o que o olho
    ve. Fica dito porque medida que nao conhece o proprio limite e pior que
    medida nenhuma. */
 const rgba=c=>{const p=(c.match(/[\d.]+/g)||[]).map(Number);
   return p.length?{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}:null;};
 const fundoDe=el=>{
   let pilha=[],n=el;
   while(n&&n!==document.documentElement){
     const c=rgba(getComputedStyle(n).backgroundColor);
     if(c&&c.a>0){pilha.push(c);if(c.a>=1)break;}
     n=n.parentElement;
   }
   if(!pilha.length||pilha[pilha.length-1].a<1)
     pilha.push(rgba(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1});
   /* compoe de tras para frente: a superficie opaca por baixo, as
      semitransparentes por cima, uma a uma. */
   let f=pilha.pop();
   while(pilha.length){
     const t=pilha.pop();
     f={r:t.r*t.a+f.r*(1-t.a),g:t.g*t.a+f.g*(1-t.a),b:t.b*t.a+f.b*(1-t.a),a:1};
   }
   return f;
 };
 const massa=e=>{
   const st=getComputedStyle(e),r=e.getBoundingClientRect();
   if(!r.width||!r.height)return null;
   const t=(e.innerText||"").trim();
   if(!t)return null;
   const L=lum(st.color);
   const fr=fundoDe(e),fundoCor="rgb("+Math.round(fr.r)+", "+Math.round(fr.g)+", "+Math.round(fr.b)+")";
   const fundo=lum(fundoCor);
   const contraste=(Math.max(L,fundo)+.05)/(Math.min(L,fundo)+.05);
   const px=parseFloat(st.fontSize);
   /* proprio texto, e nao o dos filhos */
   const proprio=[...e.childNodes].filter(n=>n.nodeType===3)
     .map(n=>n.textContent.trim()).join(" ").trim();
   if(!proprio)return null;
   return {txt:proprio.slice(0,34),px:+px.toFixed(1),peso:st.fontWeight,
     familia:st.fontFamily.split(",")[0].replace(/["']/g,""),
     cor:st.color,contraste:+contraste.toFixed(2),
     /* `fundo` passa a ser o fundo CONTRA O QUAL o contraste foi medido, e nao
        o `background-color` do proprio elemento — que e `transparent` na maioria
        deles e nao dizia nada. O antigo fica ao lado, para quem lia o campo. */
     fundo:fundoCor,fundoDeclarado:st.backgroundColor,
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
