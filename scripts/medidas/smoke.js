/* Renderiza todo estado alcançável e denuncia o que estoura ou sai vazio.
   Três telas já terminaram antes da hora por uma vírgula perdida, em silêncio:
   a função encerrava cedo e a seção simplesmente não existia. */
(()=>{
  const erros=[];
  const orig=console.error;console.error=(...a)=>{erros.push(a.join(" "));orig(...a);};
  window.onerror=m=>{erros.push("onerror: "+m);};
  const lugares=["home","mesa","item","livro","estante","leitura","perfil","canvas",
    "novidades","notas","nota","conexoes","estudo"];
  const folhas=[null,"paginas","viewport","ajuda","conta","envio","capa","traduzir","pend",
    "sumario","busca","controles","wiz","usb","nota","apagar-conta","pref-reset"];
  const psecs=["visao","conta","disp","pref","priv","hist","novidades"];
  /* cada filtro da estante e um caminho proprio, e eles acabaram de mudar */
  const fEst=["tudo","lendo","novo","nota","kindle","quadrinho"];
  const feito=[];
  /* Contar bytes de innerHTML prova que a tela montou. Nao prova que ela diz
     coisa com coisa: "undefined de undefined paginas" sobreviveu a 549 casos
     porque nenhum deles leu o texto. Esta rede le. */
  const LIXO=/undefined|NaN|\[object Object\]|,,|null/;
  const olha=nome=>{const t=document.body.innerText;
    const m=LIXO.exec(t);
    if(m){const i=Math.max(0,m.index-50);
      erros.push("lixo na tela "+nome+": …"+t.slice(i,m.index+40).replace(/\s+/g," ")+"…");}};
  /* COM E SEM CONTA. Sem isto a Mesa nunca era montada: vMesa() devolve
     mesaNova() enquanto S.conta e false, que e o padrao do estado zero. */
  for(const conta of [false,true])
  for(const l of lugares)for(const f of folhas){
    S.conta=conta;
    try{
      S.lugar=l;S.folha=f;S.dentro=(l==="leitura");
      if(l==="nota")S.notaK=S.dst.filter(d=>d.nota)[0].k;
      if(l==="estudo"){const g=ideias()[0];
        S.estudos=g?[{id:g.id,nome:"Um nome",sobre:"Uma frase que eu quero testar.",livros:[],
          notas:g.notas.map(d=>d.k),sua:false}]:[];
        S.estK=g?g.id:"nao-existe";}
      pinta();
      olha((conta?"":"sem-conta/")+l+"/"+(f||"-"));
      feito.push((conta?"":"sem-conta/")+l+"/"+(f||"-")+":"+document.body.innerHTML.length);
    }catch(e){erros.push((conta?"":"sem-conta/")+l+"/"+f+" -> "+e.message);}
  }
  for(const fe of fEst){
    try{S.lugar="estante";S.folha=null;S.fEstante=fe;S.fColecao=null;pinta();
      feito.push("estante/"+fe+":"+document.body.innerHTML.length);}
    catch(e){erros.push("estante/"+fe+" -> "+e.message);}
  }
  S.fEstante="tudo";S.conta=true;
  /* O CANVAS SEGURANDO FONTE. Fonte e continente, nota e atomo, e no campo
     isso tem de ser visivel: se os dois cartoes ficarem iguais, o Canvas
     volta a ser uma pilha de retangulos de texto. */
  try{
    const antesC=S.canvasN.slice();
    S.lugar="canvas";S.folha=null;S.cvModo="mover";pinta();
    const cf=document.querySelector(".cvIt.-fonte"),cn=document.querySelector(".cvIt:not(.-fonte)");
    if(!cf)erros.push("canvas: a fonte semeada nao apareceu no campo");
    if(!cn)erros.push("canvas: a nota semeada nao apareceu no campo");
    if(cf&&cn){
      const a=getComputedStyle(cf),b=getComputedStyle(cn);
      if(a.backgroundColor===b.backgroundColor&&a.width===b.width)
        erros.push("canvas: fonte e nota tem o mesmo chao e a mesma largura");
      if(!cf.querySelector("img"))erros.push("canvas: a fonte nao entra pela imagem");}
    feito.push("canvas/com-fonte:"+document.body.innerHTML.length);
    /* por e tirar sao o mesmo gesto */
    const antesARQ2=ARQ;ARQ=LIVROS["Oficina de imagem — aula 4"];
    roteia("cv-fonte","");
    if(!noCanvas(ARQ.titulo))erros.push("canvas: por a fonte no campo nao pos");
    roteia("cv-fonte","");
    if(noCanvas(ARQ.titulo))erros.push("canvas: tirar a fonte do campo nao tirou");
    ARQ=antesARQ2;
    /* ligar ainda nao vale para fonte, e o campo diz isso em vez de calar */
    S.lugar="canvas";S.cvModo="ligar";S.aviso=null;pinta();
    roteia("cv-tocar",S.canvasN.find(ehChaveFonte));
    if(!S.aviso)erros.push("canvas: tocar numa fonte em Ligar nao disse nada");
    S.aviso=null;S.cvModo="mover";S.cvLigando=null;
    feito.push("canvas/ligar-numa-fonte:"+document.body.innerHTML.length);
    /* campo so com fonte, e campo vazio */
    S.canvasN=S.canvasN.filter(ehChaveFonte);pinta();
    feito.push("canvas/so-fonte:"+document.body.innerHTML.length);
    S.canvasN=[];pinta();
    if(!/campo está vazio/.test(document.body.innerText))
      erros.push("canvas: o vazio nao fala do campo");
    feito.push("canvas/vazio:"+document.body.innerHTML.length);
    S.canvasN=antesC;
    /* e Conexoes nao pode voltar a ser citada: ela saiu da navegacao */
    pinta();
    if(/Em Conexões/.test(document.body.innerText))
      erros.push("canvas: a legenda voltou a apontar para Conexoes");
    /* A MESA diz o que esta andando */
    S.lugar="mesa";S.cena="trabalho";S.mesaVar="reduzida";S.mesaEstado="com-pendencia";pinta();
    const and=S.estudos.filter(e=>estadoEstudo(e)==="andando");
    if(and.length&&!document.querySelector(".mand"))
      erros.push("mesa: ha "+and.length+" estudo(s) andando e a Mesa nao diz");
    /* "precisa de voce" nao pode voltar a conhecer so o preparo: eram duas
       listas do mesmo nome, 2 contra 12, que nunca se encontravam. */
    const esperado=mDados().pends.length+pauta().reduce((a,x)=>a+x.n,0);
    const cab=(document.querySelector(".mexc:not(.mand) .cab")||{innerText:""}).innerText;
    if(cab.indexOf(String(esperado).padStart(2,"0"))<0&&cab.indexOf(String(esperado))<0)
      erros.push("mesa: precisa de voce conta "+cab.replace(/\s+/g," ").trim()+" e deveria contar "+esperado);
    const proc=[...document.querySelectorAll(".mexc:not(.mand) .it .qt")].map(e=>e.innerText.trim());
    if(!proc.some(t=>/preparo/.test(t))||!proc.some(t=>/Conhecimento/.test(t)))
      erros.push("mesa: os itens nao dizem de onde vem — "+proc.join(" | "));
    feito.push("mesa/precisa-de-voce-unificado:"+document.body.innerHTML.length);
    S.estudos=[];pinta();
    if(document.querySelector(".mand"))
      erros.push("mesa: sem estudo nenhum, a linha de Andando ficou");
    S.estudos=sementeEstudos();S.lugar="notas";S.nfiltro="estudos";pinta();
  }catch(e){erros.push("canvas com fonte -> "+e.message);}
  /* VIDEO COMO FONTE. O que se prova aqui nao e que video funciona — e que
     ele nao precisou de modelo proprio: a mesma ancora, a mesma nota, a
     mesma lista. Se alguma dessas tres divergir, o modelo estava errado. */
  try{
    /* TODA tela que mostra uma fonte, com um VIDEO aberto. Eu tinha
       construido a fonte e nunca aberto a tela do arquivo com ela: o
       smoke rendia "livro", mas sempre com ARQ sendo um livro, e a tela
       dizia "EPUB · undefined de undefined paginas". */
    const antesARQ=ARQ;
    ARQ=LIVROS["Oficina de imagem — aula 4"];
    for(const l of ["livro","leitura"])
      for(const f of [null,"controles","sumario","envio","capa","paginas","viewport"]){
        S.lugar=l;S.folha=f;S.dentro=(l==="leitura");pinta();
        olha("video/"+l+"/"+(f||"-"));
        const t=document.body.innerText;
        /* a rede pega tambem "Capitulo N", que vazava no cartao de uma nota de
           video — o padrao antigo so olhava o vocabulario do PREPARO. */
        if(/EPUB|páginas|Convertido de PDF|Capítulo \d|cap\. \d/.test(t))
          erros.push("video/"+l+"/"+(f||"-")+": fala de livro sobre um video");
        feito.push("video/"+l+"/"+(f||"-")+":"+document.body.innerHTML.length);
      }
    ARQ=antesARQ;S.dentro=false;S.folha=null;
    const vs=levadas().filter(d=>d.livro&&ehVideo(d.livro));
    if(vs.length<2)erros.push("video: as notas de video nao chegaram ao Conhecimento ("+vs.length+")");
    /* o endereco e um segundo, e nao um capitulo */
    S.lugar="nota";S.notaK=vs[0].k;S.conj=null;S.folha=null;pinta();
    const onde=(document.querySelector(".ondeN")||{innerText:""}).innerText;
    if(onde.indexOf("Vídeo · ")<0||!/\d+:\d\d/.test(onde))
      erros.push("video: a nota nao diz o segundo de onde veio — \""+onde.trim()+"\"");
    if(tempoDe(vs[0])==null)erros.push("video: tempoDe devolveu nulo para nota de video");
    if(tempoDe(levadas().find(d=>d.livro&&!ehVideo(d.livro)))!==null)
      erros.push("video: tempoDe devolveu tempo para nota de LIVRO");
    feito.push("nota/de-video:"+document.body.innerHTML.length);
    /* uma nota de video se liga a notas de livro: a fonte nao muda o que ela e */
    const cruza=vs.some(d=>relacoesDe(d.k).some(r=>{const o=escK(r.k);
      return o&&o.livro&&!ehVideo(o.livro);}));
    if(!cruza)erros.push("video: nenhuma nota de video encosta numa nota de livro");
    /* a superficie: transcricao ancoravel, com o timecode na margem */
    const antes=ARQ;
    ARQ=LIVROS["Oficina de imagem — aula 4"];
    S.lugar="leitura";S.dentro=true;S.folha=null;pinta();
    if(!document.querySelector(".vidT"))erros.push("video: a superficie nao tem o quadro do tempo");
    const tcs=document.querySelectorAll(".vidTc").length;
    const ancoraveis=document.querySelectorAll(".txtE.-vid[data-tr]").length;
    if(!tcs||tcs!==ancoraveis)
      erros.push("video: timecode e paragrafo ancoravel nao batem ("+tcs+" contra "+ancoraveis+")");
    /* e a palavra "capitulo" nao pode sobrar numa aula gravada */
    if(/[Cc]apítulo|cap\./.test(document.body.innerText))
      erros.push("video: sobrou vocabulario de livro na superficie de video");
    feito.push("leitura/transcricao:"+document.body.innerHTML.length);
    /* o Kindle diz POR QUE nao, em vez de sumir */
    S.lugar="livro";S.folha="controles";pinta();
    const txt=document.body.innerText;
    if(txt.indexOf("Enviar ao Kindle")<0)
      erros.push("video: a linha do Kindle sumiu em vez de dizer por que nao");
    if(!/não vai para o Kindle/.test(txt))
      erros.push("video: a linha do Kindle nao explica por que nao");
    feito.push("arquivo/kindle-nao-serve:"+document.body.innerHTML.length);
    ARQ=antes;S.lugar="notas";S.nfiltro="estudos";S.dentro=false;S.folha=null;pinta();
  }catch(e){erros.push("video -> "+e.message);}
  /* O QUE FICOU PELA METADE. A faixa e a unica coisa da entrada com acao
     pendente, e o que ela conta muda com o estado do acervo: cada extremo
     mostra uma versao diferente do cabecalho. */
  try{
    S.lugar="notas";S.nfiltro="estudos";S.folha=null;S.pautaAberta=false;pinta();
    const cab=()=>{const e=document.querySelector(".pmcab");
      return e?e.innerText.replace(/\s+/g," ").trim():"";};
    if(!/QUE FICOU PELA METADE/.test(cab()))erros.push("entrada: a faixa de pendencia sumiu");
    /* conta COISAS e nao linhas: o numero tem de bater com a soma */
    const soma=pauta().reduce((a,x)=>a+x.n,0);
    if(cab().indexOf(String(soma))<0)
      erros.push("faixa: o numero nao e a soma das coisas — diz \""+cab()+"\" e a soma e "+soma);
    feito.push("entrada/faixa-fechada:"+document.body.innerHTML.length);
    S.pautaAberta=true;pinta();
    feito.push("entrada/faixa-aberta:"+document.body.innerHTML.length);
    S.pautaAberta=false;
    /* nada pendente: a faixa some inteira em vez de dizer zero */
    const antesL=S.dst.map(d=>d.levada),antesR=S.rel.slice(),antesN=S.naoRel.slice();
    S.dst.forEach(d=>{if(d.nota)d.levada=true;});
    S.dst.filter(d=>ancora(d)&&!d.nota).forEach(d=>{d.nota="x";d.levada=true;});
    levadas().forEach(a=>levadas().forEach(b=>{if(a.k<b.k)S.rel.push([a.k,b.k]);}));
    pinta();
    feito.push("entrada/faixa-sem-pendencia:"+document.body.innerHTML.length);
    S.dst.forEach((d,k)=>d.levada=antesL[k]);S.rel=antesR;S.naoRel=antesN;
    S.dst=sementes();pinta();
    /* "Para revisar" so existe quando ha nota marcada a mao */
    S.nfiltro="todas";S.rever=[];pinta();
    const abas=()=>[...document.querySelectorAll(".nfila2 button")]
      .map(b=>b.innerText.replace(/\s+/g," ").trim());
    if(abas().some(t=>/Para revisar/.test(t)))
      erros.push("recorte: \"Para revisar\" aparece com zero notas marcadas");
    feito.push("notas/sem-para-revisar:"+document.body.innerHTML.length);
    S.rever=[levadas()[0].k];pinta();
    if(!abas().some(t=>/Para revisar 1/.test(t)))
      erros.push("recorte: marcou uma nota e \"Para revisar 1\" nao apareceu — "+abas().join(" | "));
    S.nfiltro="rever";pinta();
    feito.push("notas/para-revisar-com-uma:"+document.body.innerHTML.length);
    S.rever=[];S.nfiltro="estudos";pinta();
  }catch(e){erros.push("faixa de pendencia -> "+e.message);}
  /* AS VARIANTES DA MESA. Cinco desenhos diferentes do mesmo lugar, e nenhum
     deles tinha caso: a Mesa inteira estava fora da cobertura. */
  try{
    for(const v of ["reduzida","atual","a","b","c"])
      for(const e of ["com-pendencia","sem-pendencia","novo","vazio"]){
        S.lugar="mesa";S.cena="trabalho";S.mesaVar=v;S.mesaEstado=e;S.folha=null;pinta();
        feito.push("mesa/"+v+"/"+e+":"+document.body.innerHTML.length);
      }
    S.mesaVar="reduzida";S.mesaEstado="com-pendencia";
  }catch(e){erros.push("variantes da mesa -> "+e.message);}
  /* A PORTA DA MESA PARA A FILA. Dois textos, e o segundo e o que some se
     alguem achar que o link so faz sentido com varios abertos: quem tem um
     livro so e justamente quem nunca descobriu que a fila existe. */
  try{
    const antes=ACERVO.map(b=>b.prog);
    S.conta=true;S.lugar="mesa";S.cena="trabalho";S.mesaVar="reduzida";
    S.mesaEstado="com-pendencia";S.folha=null;pinta();
    const diz=()=>{const e=document.querySelector(".mfoco .mfila");
      return e?e.innerText.replace(/\s+/g," ").trim():"";};
    if(!/ver a fila/.test(diz()))erros.push("mesa: o bloco Continue perdeu a porta para a Fila");
    feito.push("mesa/porta-para-a-fila:"+document.body.innerHTML.length);
    /* um livro aberto so */
    ACERVO.forEach(b=>{if(estadoDe(b)==="lendo"&&b.t!=="Estudo de Viabilidade")b.prog=0;});
    pinta();
    if(!/Só este aberto/.test(diz()))erros.push("mesa: com um livro so, a porta nao diz o estado certo — "+diz());
    feito.push("mesa/porta-um-livro-so:"+document.body.innerHTML.length);
    ACERVO.forEach((b,k)=>b.prog=antes[k]);pinta();
    /* e a porta leva mesmo para a Fila */
    roteia("ir-fila","");
    /* a Fila mudou de casa: ela e vista do Conhecimento, e nao da Estante */
    if(!(S.lugar==="notas"&&S.nfiltro==="estudos"&&S.estVista==="leitura"))
      erros.push("mesa: ir-fila nao chegou na Leitura ("+S.lugar+"/"+S.nfiltro+"/"+S.estVista+")");
    feito.push("mesa/porta-chega-na-fila:"+document.body.innerHTML.length);
    /* a Mesa nao pode voltar a discordar do acervo sobre o mesmo livro */
    S.lugar="mesa";pinta();
    const b=noAcervo("Estudo de Viabilidade");
    const onde=document.querySelector(".mfoco .onde");
    if(b&&onde&&onde.innerText.indexOf(b.prog+"%")<0)
      erros.push("mesa: o Continue discorda do acervo — diz \""+onde.innerText.trim()+"\" e o acervo diz "+b.prog+"%");
    feito.push("mesa/continue-concorda-com-o-acervo:"+document.body.innerHTML.length);
    S.lugar="estante";S.estante="lista";
  }catch(e){erros.push("porta da mesa -> "+e.message);}
  /* A FILA. Tres colunas derivadas de uma so propriedade (prog), e por isso
     tres extremos que a semente nao cobre: fila vazia, nada aberto, nada
     terminado. O quarto caso e a coluna "Li" estourando o corte de 4. */
  try{
    const antes=ACERVO.map(b=>b.prog);
    S.lugar="notas";S.nfiltro="estudos";S.estVista="leitura";S.folha=null;pinta();
    feito.push("notas/leitura:"+document.body.innerHTML.length);
    /* ordenar a mao, que e a unica coisa manual do quadro */
    const novos=ACERVO.filter(b=>estadoDe(b)==="novo");
    if(novos.length>1){
      S.ordemFila=novos.map(b=>b.c).reverse();pinta();
      feito.push("notas/leitura-ordenada:"+document.body.innerHTML.length);
      roteia("fila-topo",novos[novos.length-1].c);
      feito.push("notas/leitura-topo:"+document.body.innerHTML.length);
      S.ordemFila=[];}
    /* corrigir a derivacao pelos dois lados, do proprio quadro */
    const lendo=ACERVO.find(b=>estadoDe(b)==="lendo");
    if(lendo){roteia("livro-terminei",lendo.c);feito.push("notas/leitura-terminei:"+document.body.innerHTML.length);
      roteia("livro-recomecar",lendo.c);feito.push("notas/leitura-reler:"+document.body.innerHTML.length);}
    ACERVO.forEach(b=>b.prog=0);   pinta();feito.push("notas/leitura-so-a-ler:"+document.body.innerHTML.length);
    ACERVO.forEach(b=>b.prog=50);  pinta();feito.push("notas/leitura-so-lendo:"+document.body.innerHTML.length);
    ACERVO.forEach(b=>b.prog=100); pinta();feito.push("notas/leitura-so-li:"+document.body.innerHTML.length);
    ACERVO.forEach((b,k)=>b.prog=antes[k]);
    /* o recorte de estado nao pode sobreviver a troca de vista */
    pinta();   /* o DOM ainda era do caso anterior, com tudo em "Li" */
    /* cada livro da fila diz a qual estudo serve — era o que faltava para a
       ordem nao ser preferencia solta */
    if(!document.querySelector("#filaPilha .fCard .serve"))
      erros.push("leitura: o cartao nao diz a qual estudo o livro serve");
    feito.push("notas/leitura-com-vinculo:"+document.body.innerHTML.length);
    S.estudos=[];pinta();
    if(!document.querySelector("#filaPilha .fCard .serve.-sem"))
      erros.push("leitura: sem estudo nenhum, o cartao devia dizer \"sem estudo\"");
    feito.push("notas/leitura-sem-estudo:"+document.body.innerHTML.length);
    S.estudos=sementeEstudos();S.estVista="lista";S.ordemFila=[];pinta();
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
    ["notas-estudos",()=>{S.lugar="notas";S.nfiltro="estudos";}],
    /* O QUADRO. Vista nova pede caso novo: a licao desta serie e que o
       instrumento cobre o codigo de ontem se ninguem o estender. */
    ["notas-quadro",()=>{S.lugar="notas";S.nfiltro="estudos";
      S.estudos=sementeEstudos();S.estVista="quadro";}],
    ["notas-quadro-tudo-fechado",()=>{S.estudos.forEach(e=>{e.fechado=true;});}],
    ["notas-quadro-nada-fechado",()=>{S.estudos.forEach(e=>{e.fechado=false;});}],
    ["notas-quadro-sem-estudo",()=>{S.estudos=[];}],
    ["notas-quadro-volta-a-lista",()=>{S.estudos=sementeEstudos();S.estVista="lista";}],
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
    ["notas-estudo-nomeado",()=>{S.lugar="notas";S.nfiltro="estudos";
      const g=ideias()[0];S.estudos=g?[{id:g.id,nome:"Um nome",sobre:"Uma frase que eu quero testar.",livros:[],
        notas:g.notas.map(d=>d.k),sua:false}]:[];}],
    /* os quatro extremos da entrada: sem estudo nenhum, um estudo sem
       pergunta, um sem livros e um sem notas — cada um mostra uma metade do
       cartao que a semente nao mostra. */
    ["notas-estudos-nenhum",()=>{S.estudos=[];}],
    ["notas-estudos-criando",()=>{S.estNova="novo";}],
    ["notas-estudo-sem-centro",()=>{S.estNova=null;
      S.estudos=[{id:"e1",nome:"Sem centro",sobre:"",livros:["Diário 02"],notas:[],sua:true}];}],
    ["notas-estudo-sem-livros",()=>{
      S.estudos=[{id:"e2",nome:"Só notas",sobre:"Uma pergunta?",livros:[],
        notas:levadas().slice(0,2).map(d=>d.k),sua:true}];}],
    ["notas-estudo-vazio",()=>{
      S.estudos=[{id:"e3",nome:"Recém-criado",sobre:"Uma frase que eu quero testar.",livros:[],notas:[],sua:true}];}],
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
    ["nota-vinda-da-lista",()=>{S.lugar="notas";S.nfiltro="todas";S.verEst=null;
      S.recorteMotivo=null;pinta();
      const b=document.querySelector('.grupoE .cab [data-a="nota-abrir"],.grupoE .cit [data-a="nota-abrir"]');
      if(b)b.click();}],
    ["notas-pergunta-como",()=>{S.lugar="notas";S.nfiltro="pergunta";S.pgComo=true;}],
    ["nota-no-comeco-do-conjunto",()=>{const g=ideias()[0];
      S.estudos=g?[{id:g.id,nome:"Um nome",sobre:"Uma frase que eu quero testar.",livros:[],
        notas:g.notas.map(d=>d.k),sua:false}]:[];
      S.conj=g?{lista:g.notas.map(d=>d.k),concId:g.id,nome:"Um nome"}:null;
      S.notaK=g?g.notas[0].k:"n-obs-1";}],
    ["nota-no-fim-do-conjunto",()=>{if(S.conj)S.notaK=S.conj.lista[S.conj.lista.length-1];}],
    ["nota-conjunto-de-um-so",()=>{S.conj={lista:["n-obs-1"],concId:null,nome:"um recorte"};
      S.notaK="n-obs-1";}],
    ["nota-fora-do-conjunto",()=>{S.conj={lista:["n-obs-2"],concId:null,nome:"outro"};
      S.notaK="n-obs-1";}],
    ["estudo-com-trilha",()=>{S.notaAberta=null;S.lugar="estudo";
      S.estudos=g0?[{id:g0.id,nome:"Um nome",sobre:"Uma pergunta?",
        livros:["Diário 02"],notas:g0.notas.map(d=>d.k),sua:false}]:[];
      S.estK=g0?g0.id:null;}],
    ["estudo-rede-aberta",()=>{S.redeAberta=true;}],
    ["estudo-renomeando",()=>{S.redeAberta=false;S.renomeando=S.estK;}],
    /* sem centro a pagina oferece o convite no lugar do titulo grande: e um
       estado, e nao um vazio. E o centro nao precisa ser pergunta. */
    ["estudo-sem-centro",()=>{S.renomeando=null;
      S.estudos=[{id:"u1",nome:"So uma",sobre:"",livros:[],
        notas:["n-obs-1"],sua:true}];S.estK="u1";}],
    ["estudo-sem-livro-nenhum",()=>{
      S.estudos=[{id:"u2",nome:"Sem livro",pergunta:"E agora?",livros:[],notas:[],sua:true}];
      S.estK="u2";}],
    ["estudo-inexistente",()=>{S.estK="nao-existe";}],
    ["conexoes-link-antigo",()=>{S.lugar="conexoes";S.estudos=[];}],
    /* A ROTA, que era o defeito: a nota dentro de um estudo, a nota fora de
       qualquer um, e a relacionada aberta no lugar em vez de navegar. */
    ["nota-dentro-de-estudo",()=>{S.lugar="nota";S.relAberta=null;
      const d=levadas()[0];
      S.estudos=[{id:"r1",nome:"Um estudo",pergunta:"Por quê?",livros:[],
        notas:[d.k],sua:true}];S.notaK=d.k;}],
    ["nota-fora-de-estudo",()=>{S.estudos=[];}],
    ["nota-relacionada-aberta",()=>{const d=escK(S.notaK);
      const r=d?relacoesDe(d.k)[0]:null;S.relAberta=r?r.k:null;}],
    ["nota-em-dois-estudos",()=>{S.relAberta=null;
      S.estudos=[{id:"r1",nome:"Primeiro",sobre:"Uma frase que eu quero testar.",livros:[],notas:[S.notaK],sua:true},
        {id:"r2",nome:"Segundo",sobre:"Uma frase que eu quero testar.",livros:[],notas:[S.notaK],sua:true}];}],
    /* a Estante recortada por um estudo, que era o que a colecao fazia */
    ["estante-recortada-por-estudo",()=>{S.lugar="estante";S.estante="lista";
      S.estudos=[{id:"r1",nome:"Um estudo",sobre:"Uma frase que eu quero testar.",livros:["Diário 02"],notas:[],sua:true}];
      S.fEstudo="r1";}],
    ["estante-estudo-sem-livro",()=>{
      S.estudos=[{id:"r2",nome:"Vazio",sobre:"Uma frase que eu quero testar.",livros:[],notas:[],sua:true}];S.fEstudo="r2";}],
    ["estante-sem-estudo-nenhum",()=>{S.estudos=[];S.fEstudo=null;}],
    ["notas-sem-nota-nenhuma",()=>{S.lugar="notas";S.nfiltro="todas";
      S.dst=S.dst.filter(d=>!d.nota);}],
    ["canvas-com-notas",()=>{S.dst=sementes();S.lugar="canvas";S.canvasN=["n-obs-2"];}],
  ];
  for(const [nome,poe] of casos){
    try{S.folha=null;poe();pinta();
      feito.push(nome+":"+document.body.innerHTML.length);}
    catch(e){erros.push(nome+" -> "+e.message);}
  }
  /* O QUADRO, por verdade e nao por nao-estouro: a coluna tem que sair do
     LIVRO, e o movimento ilegal tem que continuar ilegal. Sem isto o quadro
     passaria a mentir em silencio no dia em que alguem mexer na derivacao. */
  try{
    S.lugar="notas";S.nfiltro="estudos";S.estudos=sementeEstudos();S.estVista="quadro";pinta();
    const onde=id=>{const e=estudoK(id);return e?estadoEstudo(e):"sumiu";};
    if(onde("est-metodo")!=="andando")
      erros.push("quadro: est-metodo tem livro em 78% e nao esta em andando — "+onde("est-metodo"));
    if(onde("est-serie")!=="guardado")
      erros.push("quadro: est-serie nao tem livro aberto e nao esta em guardado — "+onde("est-serie"));
    if(onde("est-decidir")!=="fechado")
      erros.push("quadro: fechar deixou de vencer a derivacao — "+onde("est-decidir"));
    if(qLegal("andando","guardado"))
      erros.push("quadro: andando->guardado virou movimento legal, e arrastar nao e ler");
    if(!qLegal("guardado","fechado")||!qLegal("fechado","andando"))
      erros.push("quadro: fechar ou reabrir deixou de ser possivel");
    /* ler ate o fim tem que MOVER o estudo, senao a derivacao e decorativa.
       TODOS os livros dele: com um so, "andando" continua sendo a resposta
       certa — e foi assim que esta assercao pegou a si mesma. */
    const lv=livrosDoEstudo(estudoK("est-metodo")).map(noAcervo).filter(Boolean);
    const antes=lv.map(b=>b.prog);lv.forEach(b=>{b.prog=100;});
    if(onde("est-metodo")==="andando")
      erros.push("quadro: terminei os "+lv.length+" livros e o estudo continuou andando");
    lv.forEach((b,i)=>{b.prog=antes[i];});
    if(onde("est-metodo")!=="andando")
      erros.push("quadro: devolvi o progresso e o estudo nao voltou a andar");
    S.estudos=sementeEstudos();S.estVista="lista";
  }catch(e){erros.push("quadro -> "+e.message);}
  /* piso de regras: uma emenda derrubou o CSS de 779 para 422 e quatro
     artefatos sairam assim, porque pagina sem metade das regras RENDERIZA.
     "Renderizou?" nao pega isso; contar pega, e custa nada. */
  let regras=-1;
  try{ regras=document.styleSheets[0].cssRules.length; }catch(e){}
  if(regras<700) erros.push("CSS ENGOLIDO: so "+regras+" regras parseadas, esperado 700+");
  return {erros,regras,telas:feito.length,vazias:feito.filter(x=>+x.split(":")[1]<2000)};
})()
