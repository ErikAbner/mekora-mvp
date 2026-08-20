/* Renderiza todo estado alcançável e denuncia o que estoura ou sai vazio.
   Três telas já terminaram antes da hora por uma vírgula perdida, em silêncio:
   a função encerrava cedo e a seção simplesmente não existia. */
(()=>{
  const erros=[];
  const orig=console.error;console.error=(...a)=>{erros.push(a.join(" "));orig(...a);};
  window.onerror=m=>{erros.push("onerror: "+m);};
  const lugares=["home","mesa","item","livro","estante","leitura","perfil","canvas",
    "novidades","notas","nota","conexoes"];
  const folhas=[null,"paginas","viewport","ajuda","conta","envio","capa","traduzir","pend",
    "sumario","busca","controles","wiz","usb","nota","apagar-conta","pref-reset"];
  const psecs=["visao","conta","disp","pref","priv","hist","novidades"];
  const feito=[];
  for(const l of lugares)for(const f of folhas){
    try{
      S.lugar=l;S.folha=f;S.dentro=(l==="leitura");
      if(l==="nota")S.notaK=S.dst.filter(d=>d.nota)[0].k;
      pinta();
      feito.push(l+"/"+(f||"-")+":"+document.body.innerHTML.length);
    }catch(e){erros.push(l+"/"+f+" -> "+e.message);}
  }
  for(const s of psecs){
    try{S.lugar="perfil";S.folha=null;S.psec=s;pinta();}
    catch(e){erros.push("perfil/"+s+" -> "+e.message);}
  }
  /* Os estados da area de Notas e de Conexoes: filtro, recorte por
     territorio, campo de nome aberto e nota inexistente. A tela de uma nota
     apagada tem que dizer que ela nao existe, e nao estourar. */
  const g0=(typeof ideias==="function"&&ideias()[0])||null;
  const casos=[
    ["notas-todas",()=>{S.lugar="notas";S.nfiltro="todas";}],
    ["notas-livros",()=>{S.lugar="notas";S.nfiltro="livros";}],
    ["notas-soltas",()=>{S.lugar="notas";S.nfiltro="soltas";}],
    ["notas-rever",()=>{S.lugar="notas";S.nfiltro="rever";}],
    ["notas-busca",()=>{S.lugar="notas";S.nfiltro="todas";S.qNotas="zzzz";}],
    ["notas-recorte",()=>{S.qNotas="";S.verTerr=g0?g0.notas.map(d=>d.k):["n-obs-1"];}],
    ["notas-nomeando",()=>{S.verTerr=null;S.nomeando=g0?g0.id:null;}],
    ["notas-ignorada",()=>{S.nomeando=null;S.ignoradas=g0?[g0.id]:[];}],
    ["nota-inexistente",()=>{S.ignoradas=[];S.lugar="nota";S.notaK="nao-existe";}],
    ["nota-editando",()=>{S.notaK="n-obs-1";S.notaAberta="n-obs-1";S.rasc={"n-obs-1":"x"};}],
    ["conexoes-nomeado",()=>{S.notaAberta=null;S.lugar="conexoes";
      S.terr=g0?[{id:g0.id,nome:"Um nome",notas:g0.notas.map(d=>d.k)}]:[];}],
    ["conexoes-vazio",()=>{S.terr=[];S.dst=S.dst.filter(d=>!d.nota);}],
    ["canvas-com-notas",()=>{S.dst=sementes();S.lugar="canvas";S.canvasN=["n-obs-2"];}],
  ];
  for(const [nome,poe] of casos){
    try{S.folha=null;poe();pinta();
      feito.push(nome+":"+document.body.innerHTML.length);}
    catch(e){erros.push(nome+" -> "+e.message);}
  }
  /* piso de regras: uma emenda derrubou o CSS de 779 para 422 e quatro
     artefatos sairam assim, porque pagina sem metade das regras RENDERIZA.
     "Renderizou?" nao pega isso; contar pega, e custa nada. */
  let regras=-1;
  try{ regras=document.styleSheets[0].cssRules.length; }catch(e){}
  if(regras<700) erros.push("CSS ENGOLIDO: so "+regras+" regras parseadas, esperado 700+");
  return {erros,regras,telas:feito.length,vazias:feito.filter(x=>+x.split(":")[1]<2000)};
})()
