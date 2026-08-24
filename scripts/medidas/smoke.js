/* Renderiza todo estado alcançável e denuncia o que estoura ou sai vazio.
   Três telas já terminaram antes da hora por uma vírgula perdida, em silêncio:
   a função encerrava cedo e a seção simplesmente não existia. */
(()=>{
  const erros=[];
  const orig=console.error;console.error=(...a)=>{erros.push(a.join(" "));orig(...a);};
  window.onerror=m=>{erros.push("onerror: "+m);};
  const lugares=["home","mesa","item","livro","estante","leitura","perfil","canvas",
    "novidades","notas","nota","conexoes","conceito"];
  const folhas=[null,"paginas","viewport","ajuda","conta","envio","capa","traduzir","pend",
    "sumario","busca","controles","wiz","usb","nota","apagar-conta","pref-reset"];
  const psecs=["visao","conta","disp","pref","priv","hist","novidades"];
  /* cada filtro da estante e um caminho proprio, e eles acabaram de mudar */
  const fEst=["tudo","lendo","novo","nota","kindle","quadrinho"];
  const feito=[];
  for(const l of lugares)for(const f of folhas){
    try{
      S.lugar=l;S.folha=f;S.dentro=(l==="leitura");
      if(l==="nota")S.notaK=S.dst.filter(d=>d.nota)[0].k;
      if(l==="conceito"){const g=ideias()[0];
        S.terr=g?[{id:g.id,nome:"Um nome",notas:g.notas.map(d=>d.k)}]:[];
        S.concK=g?g.id:"nao-existe";}
      pinta();
      feito.push(l+"/"+(f||"-")+":"+document.body.innerHTML.length);
    }catch(e){erros.push(l+"/"+f+" -> "+e.message);}
  }
  for(const fe of fEst){
    try{S.lugar="estante";S.folha=null;S.fEstante=fe;S.fColecao=null;pinta();
      feito.push("estante/"+fe+":"+document.body.innerHTML.length);}
    catch(e){erros.push("estante/"+fe+" -> "+e.message);}
  }
  S.fEstante="tudo";
  /* A FILA. Tres colunas derivadas de uma so propriedade (prog), e por isso
     tres extremos que a semente nao cobre: fila vazia, nada aberto, nada
     terminado. O quarto caso e a coluna "Li" estourando o corte de 4. */
  try{
    const antes=ACERVO.map(b=>b.prog);
    S.lugar="estante";S.estante="fila";S.folha=null;S.fColecao=null;pinta();
    feito.push("estante/fila:"+document.body.innerHTML.length);
    /* ordenar a mao, que e a unica coisa manual do quadro */
    const novos=ACERVO.filter(b=>estadoDe(b)==="novo");
    if(novos.length>1){
      S.ordemFila=novos.map(b=>b.c).reverse();pinta();
      feito.push("estante/fila-ordenada:"+document.body.innerHTML.length);
      roteia("fila-topo",novos[novos.length-1].c);
      feito.push("estante/fila-topo:"+document.body.innerHTML.length);
      S.ordemFila=[];}
    /* corrigir a derivacao pelos dois lados, do proprio quadro */
    const lendo=ACERVO.find(b=>estadoDe(b)==="lendo");
    if(lendo){roteia("livro-terminei",lendo.c);feito.push("estante/fila-terminei:"+document.body.innerHTML.length);
      roteia("livro-recomecar",lendo.c);feito.push("estante/fila-reler:"+document.body.innerHTML.length);}
    ACERVO.forEach(b=>b.prog=0);   pinta();feito.push("estante/fila-so-a-ler:"+document.body.innerHTML.length);
    ACERVO.forEach(b=>b.prog=50);  pinta();feito.push("estante/fila-so-lendo:"+document.body.innerHTML.length);
    ACERVO.forEach(b=>b.prog=100); pinta();feito.push("estante/fila-so-li:"+document.body.innerHTML.length);
    ACERVO.forEach((b,k)=>b.prog=antes[k]);
    /* o recorte de estado nao pode sobreviver a troca de vista */
    S.estante="lista";S.fEstante="lendo";roteia("vista","fila");pinta();
    if(S.fEstante!=="tudo")erros.push("fila: recorte de estado sobreviveu a troca de vista");
    feito.push("estante/fila-sem-eixo-repetido:"+document.body.innerHTML.length);
    S.estante="lista";S.fEstante="tudo";S.ordemFila=[];pinta();
  }catch(e){erros.push("fila -> "+e.message);}
  /* o estado de leitura agora e escrito pela leitura e corrigivel a mao:
     os dois caminhos precisam de caso, senao o filtro volta a ser enfeite. */
  try{
    const b=ACERVO[0],antes=b.prog;
    b.prog=0;  S.lugar="estante";pinta();feito.push("estante/livro-em-zero:"+document.body.innerHTML.length);
    b.prog=50; pinta();feito.push("estante/livro-lendo:"+document.body.innerHTML.length);
    b.prog=100;pinta();feito.push("estante/livro-lido:"+document.body.innerHTML.length);
    S.lugar="livro";S.folha="controles";pinta();
    feito.push("arquivo/marcar-lido:"+document.body.innerHTML.length);
    b.prog=antes;S.folha=null;
  }catch(e){erros.push("estado de leitura -> "+e.message);}
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
    /* a vista Ideias entrou depois destes casos e ficou sem cobertura: ela
       estourava ao abrir, e o smoke respondia 0 erros. Caso novo, vista
       nova — senao o instrumento cobre o codigo de ontem. */
    ["notas-ideias",()=>{S.lugar="notas";S.nfiltro="ideias";}],
    ["notas-pergunta-vazia",()=>{S.lugar="notas";S.nfiltro="pergunta";S.qPergunta="";}],
    ["notas-pergunta-com-acerto",()=>{S.qPergunta="repeticao";}],
    ["notas-pergunta-sem-acerto",()=>{S.qPergunta="blockchain";}],
    ["notas-nada-levado",()=>{S.qPergunta="";S.nfiltro="todas";
      S.dst.forEach(d=>{d.levada=false;});}],
    ["notas-tudo-levado",()=>{S.dst.forEach(d=>{if(d.nota)d.levada=true;});}],
    /* o painel do livro so era renderizado na aba Conteudo: itemPainel
       inteiro estava sem cobertura, e um "gesto is not defined" passou. */
    ["painel-destaques",()=>{S.lugar="leitura";S.dentro=true;S.folha="sumario";S.sumAba="destaques";}],
    ["painel-notas",()=>{S.sumAba="notas";}],
    ["painel-marcas",()=>{S.sumAba="marcas";}],
    ["painel-busca",()=>{S.sumAba="conteudo";S.qLivro="repeti";}],
    ["painel-paginas",()=>{S.qLivro="";S.conteudoVista="paginas";}],
    ["notas-ideias-nomeada",()=>{S.lugar="notas";S.nfiltro="ideias";
      const g=ideias()[0];S.terr=g?[{id:g.id,nome:"Um nome",notas:g.notas.map(d=>d.k),sua:true}]:[];}],
    ["notas-busca",()=>{S.lugar="notas";S.nfiltro="todas";S.qNotas="zzzz";}],
    ["notas-recorte",()=>{S.qNotas="";S.verTerr=g0?g0.notas.map(d=>d.k):["n-obs-1"];}],
    ["notas-nomeando",()=>{S.verTerr=null;S.nomeando=g0?g0.id:null;}],
    ["notas-ignorada",()=>{S.nomeando=null;S.ignoradas=g0?[g0.id]:[];}],
    ["nota-inexistente",()=>{S.ignoradas=[];S.lugar="nota";S.notaK="nao-existe";}],
    ["nota-editando",()=>{S.notaK="n-obs-1";S.notaAberta="n-obs-1";S.rasc={"n-obs-1":"x"};}],
    /* a faixa do conjunto e a migalha mudam conforme de onde voce entrou:
       tres entradas, tres estados, e nenhum deles tinha cobertura. */
    ["nota-sem-conjunto",()=>{S.notaAberta=null;S.conj=null;S.notaK="n-obs-1";}],
    /* o caminho que eu tinha esquecido: abrir uma nota DA LISTA. Quatro dos
       seis defeitos da ultima rodada estavam so nele. */
    ["nota-vinda-da-lista",()=>{S.lugar="notas";S.nfiltro="todas";S.verTerr=null;
      S.recorteMotivo=null;pinta();
      const b=document.querySelector('.grupoE .cab [data-a="nota-abrir"],.grupoE .cit [data-a="nota-abrir"]');
      if(b)b.click();}],
    ["notas-pergunta-como",()=>{S.lugar="notas";S.nfiltro="pergunta";S.pgComo=true;}],
    ["nota-no-comeco-do-conjunto",()=>{const g=ideias()[0];
      S.terr=g?[{id:g.id,nome:"Um nome",notas:g.notas.map(d=>d.k)}]:[];
      S.conj=g?{lista:g.notas.map(d=>d.k),concId:g.id,nome:"Um nome"}:null;
      S.notaK=g?g.notas[0].k:"n-obs-1";}],
    ["nota-no-fim-do-conjunto",()=>{if(S.conj)S.notaK=S.conj.lista[S.conj.lista.length-1];}],
    ["nota-conjunto-de-um-so",()=>{S.conj={lista:["n-obs-1"],concId:null,nome:"um recorte"};
      S.notaK="n-obs-1";}],
    ["nota-fora-do-conjunto",()=>{S.conj={lista:["n-obs-2"],concId:null,nome:"outro"};
      S.notaK="n-obs-1";}],
    ["conceito-com-trilha",()=>{S.notaAberta=null;S.lugar="conceito";
      S.terr=g0?[{id:g0.id,nome:"Um nome",notas:g0.notas.map(d=>d.k)}]:[];
      S.concK=g0?g0.id:null;}],
    ["conceito-rede-aberta",()=>{S.redeAberta=true;}],
    ["conceito-renomeando",()=>{S.redeAberta=false;S.renomeando=S.concK;}],
    ["conceito-de-uma-nota-so",()=>{S.renomeando=null;
      S.terr=[{id:"u1",nome:"So uma",notas:["n-obs-1"],sua:true}];S.concK="u1";}],
    ["conceito-inexistente",()=>{S.concK="nao-existe";}],
    ["conexoes-link-antigo",()=>{S.lugar="conexoes";S.terr=[];}],
    ["notas-sem-nota-nenhuma",()=>{S.lugar="notas";S.nfiltro="todas";
      S.dst=S.dst.filter(d=>!d.nota);}],
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
