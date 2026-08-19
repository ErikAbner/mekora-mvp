/* Renderiza todo estado alcançável e denuncia o que estoura ou sai vazio.
   Três telas já terminaram antes da hora por uma vírgula perdida, em silêncio:
   a função encerrava cedo e a seção simplesmente não existia. */
(()=>{
  const erros=[];
  const orig=console.error;console.error=(...a)=>{erros.push(a.join(" "));orig(...a);};
  window.onerror=m=>{erros.push("onerror: "+m);};
  const lugares=["home","mesa","item","livro","estante","leitura","perfil","canvas","novidades"];
  const folhas=[null,"paginas","aa","viewport","ajuda","conta","envio","capa","traduzir","pend",
    "sumario","busca","controles","wiz","usb","nota","apagar-conta","pref-reset"];
  const psecs=["visao","conta","disp","pref","priv","hist","novidades"];
  const feito=[];
  for(const l of lugares)for(const f of folhas){
    try{
      S.lugar=l;S.folha=f;S.dentro=(l==="leitura");pinta();
      feito.push(l+"/"+(f||"-")+":"+document.body.innerHTML.length);
    }catch(e){erros.push(l+"/"+f+" -> "+e.message);}
  }
  for(const s of psecs){
    try{S.lugar="perfil";S.folha=null;S.psec=s;pinta();}
    catch(e){erros.push("perfil/"+s+" -> "+e.message);}
  }
  return {erros,telas:feito.length,vazias:feito.filter(x=>+x.split(":")[1]<2000)};
})()
