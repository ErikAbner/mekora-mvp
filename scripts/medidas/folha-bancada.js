/* As folhas tinham uma medida só: 560px valia para a que carrega um parágrafo
   e para a que carrega três colunas. Descontado o resto, sobravam 200px de
   prévia — duas palavras por linha, com rio no meio. Os breakpoints internos
   também olhavam a janela, e não a folha, então nunca disparavam no desktop.
   Roda com setup que abra a folha (S.folha="aa" ou "paginas"). */
(()=>{
  const px=e=>e?Math.round(e.getBoundingClientRect().width):null;
  const f=document.querySelector(".folha");
  if(!f)return "nenhuma folha aberta — use um setup que abra uma";
  const cols=document.querySelector(".aacols"),prev=document.querySelector(".aaprev");
  const ed=document.querySelector(".ed2"),tira=document.querySelector(".pgrade");
  let previa=null;
  const p=prev&&prev.querySelector("p"),t=p&&p.firstChild;
  if(t&&t.nodeType===3){
    const r=document.createRange(),linhas=new Set();
    for(let i=0;i<t.length;i++){r.setStart(t,i);r.setEnd(t,i+1);
      linhas.add(Math.round(r.getBoundingClientRect().top));}
    previa={linhas:linhas.size,caracteresPorLinha:Math.round(t.length/linhas.size)};
  }
  const its=[...document.querySelectorAll(".pg2")];
  const topo=its.length?Math.round(its[0].getBoundingClientRect().top):null;
  return {janela:innerWidth,folha:px(f),classe:f.className,
    colunas:cols?getComputedStyle(cols).gridTemplateColumns:null,previa:px(prev),textoDaPrevia:previa,
    editor:ed?getComputedStyle(ed).gridTemplateColumns:null,tira:px(tira),
    miniaturasPorLinha:its.length?its.filter(e=>Math.round(e.getBoundingClientRect().top)===topo).length:null,
    suportaContainerQuery:CSS.supports("container-type:inline-size")};
})()
