(()=>{
 /* A pergunta: a POSICAO no mapa quer dizer alguma coisa?
    Se duas notas muito parecidas nao ficam mais perto do que duas sem
    nada em comum, entao o desenho nao carrega informacao nenhuma — ele
    so desenha as arestas, e a posicao e enfeite. */
 S.conta=true;S.lugar="conexoes";S.mapaZoom=1;S.mapaFoco=null;pinta();
 const pts=[...document.querySelectorAll('.mapa [data-a="mapa-foco"]')].map(e=>({
   k:e.dataset.v,x:+e.getAttribute("x")+ +e.getAttribute("width")/2,
   y:+e.getAttribute("y")+ +e.getAttribute("height")/2}));
 const notas=pts.filter(p=>escK(p.k));
 const pares=[];
 for(let i=0;i<notas.length;i++)for(let j=i+1;j<notas.length;j++){
   const a=escK(notas[i].k),b=escK(notas[j].k);
   const forca=comuns(a,b).length;
   const dist=Math.hypot(notas[i].x-notas[j].x,notas[i].y-notas[j].y);
   pares.push({forca:forca,dist:dist});
 }
 /* correlacao de Pearson entre forca da relacao e proximidade */
 const n=pares.length;
 const mf=pares.reduce((s,p)=>s+p.forca,0)/n, md=pares.reduce((s,p)=>s+p.dist,0)/n;
 let num=0,da=0,db=0;
 pares.forEach(p=>{const x=p.forca-mf,y=-(p.dist-md);num+=x*y;da+=x*x;db+=y*y;});
 const r=(da&&db)?num/Math.sqrt(da*db):0;
 const ligados=pares.filter(p=>p.forca>0),soltos=pares.filter(p=>p.forca===0);
 const med=l=>l.length?Math.round(l.reduce((s,p)=>s+p.dist,0)/l.length):null;
 return {
  pontos:notas.length,pares:n,
  correlacaoForcaProximidade:+r.toFixed(3),
  distanciaMediaEntreNotasRELACIONADAS:med(ligados),
  distanciaMediaEntreNotasSEMNADAEMCOMUM:med(soltos),
  rotulos:[...document.querySelectorAll(".mapa .rot")].map(t=>t.textContent)
 };
})()
