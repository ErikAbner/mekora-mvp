(()=>{
 /* A pergunta e sempre a mesma: a nota ainda acha o trecho dela? E, desde
    que a reancoragem passou a ser aproximada, uma segunda: COM QUE NUMERO?
    Reancorar em silencio e reancorar sem poder ser discordado. */
 const num=r=>r?pc(r.score):null;
 const est=d=>{const r=ancoraDe(d),q=quaseDe(d);
   return {como:r?r.como:"PERDIDA",cap:r?r.cap:null,par:r?r.par:null,
     confere:num(r),cita:r?pc(r.pC):(q?pc(q.pC):null),
     recusado:q?pc(q.score):null,
     txt:escTxt(d).slice(0,52)};};

 const out={};
 out["limiares"]={composto:pc(LIMIAR),piso_da_citacao:pc(PISO_CITA)};

 /* ── I · CONVERSAO: o texto muda EM VOLTA do trecho ──────────────── */
 const K="n-obs-1", d=escK(K);
 const cap=2,par=0;
 const original=LIVROS["Diário 02"].caps[cap].p[par];
 const outro=LIVROS["Diário 02"].caps[3].p[0];   /* guardar o texto INTEIRO, e nao so tirar o prefixo */
 const poe=(txt,capNovo,parNovo)=>{
   const L=LIVROS["Diário 02"];
   L.caps[cap].p[par]=original;                 /* desfaz o teste anterior */
   L.caps[3].p[0]=outro;
   if(capNovo!=null){L.caps[cap].p[par]="Parágrafo trocado por outro assunto.";
     L.caps[capNovo].p[parNovo]="[movido] "+original;}
   else L.caps[cap].p[par]=txt;
   versaoTexto++;
 };
 out["0 · como foi semeada"]=est(d);

 /* 1 · OCR corrigido: uma palavra ANTES do trecho muda */
 poe(original.replace("Fotografia a cada duzentos metros","Fotografía a cada 200 metros"));
 out["1 · palavra antes do trecho muda"]=est(d);

 /* 2 · o paragrafo ganha uma frase na frente (remontagem) */
 poe("Nota do tradutor: o método aparece aqui pela primeira vez. "+original);
 out["2 · frase inserida antes"]=est(d);

 /* 3 · o contexto imediato muda dos dois lados */
 poe(original.replace("sempre com a mesma lente.","sempre com a mesma objetiva, e no mesmo horário.")
             .replace("O que não cabia","O que nunca coube"));
 out["3 · contexto dos dois lados muda"]=est(d);

 /* 4 · o trecho migra para outro capitulo */
 poe(null,3,0);
 out["4 · trecho migra de capitulo"]=est(d);

 /* 5 · o trecho deixa de existir. O que se olha aqui NAO e so "perdida":
        e se a busca aproximada, que agora existe, deixou de recusar. Sem o
        piso da citacao ela reancoraria num paragrafo qualquer que ainda
        falasse de repeticao, e a nota apontaria para o lugar errado com
        cara de certa. */
 const L=LIVROS["Diário 02"];
 L.caps[3].p[0]=outro;
 L.caps[cap].p[par]="Este parágrafo foi reescrito e não fala mais de repetição.";
 versaoTexto++;
 out["5 · trecho some"]=est(d);
 out["5 · a nota continua sua"]={nota:d.nota.slice(0,44),perdida:perdida(d)};

 /* devolve tudo ao lugar */
 L.caps[cap].p[par]=original;versaoTexto++;
 out["6 · restaurado"]=est(d);

 /* ── II · REVISAO DE TRANSCRICAO: o texto muda DENTRO do trecho ──────
    E o caso que motivou a reancoragem aproximada, e ele nao e hipotetico:
    a superficie de leitura de uma fonte de video e a transcricao, e a
    ficha dela ja dizia "automatica, revisada por voce em 3 trechos".
    Toda revisao troca palavra dentro da fala e parte fala em duas.

    A revisao aqui NAO e reescrita: e o proprio botao do instrumento que
    roda, para a medida provar o que a tela faz e nao uma copia dele. */
 const VID="Oficina de imagem — aula 4";
 const v1=escK("n-vid-1"), v2=escK("n-vid-2");
 out["7 · video, antes da revisao"]={"n-vid-1":est(v1),"n-vid-2":est(v2)};

 const arqAntes=ARQ;
 ARQ=LIVROS[VID];
 document.getElementById("btConv").click();
 out["8 · palavra corrigida DENTRO da citacao"]=est(v1);
 out["8 · fala PARTIDA em duas no meio da citacao"]=est(v2);
 /* o timecode e o numero da tela que dependia do paragrafo GRAVADO. A
    primeira fala do capitulo foi partida em duas, e tudo depois dela andou
    um indice: se o tempo nao seguir a ancora RESOLVIDA, a nota aponta para
    o tempo do paragrafo errado. */
 const tpGravado=x=>{const c=LIVROS[x.livro].caps[x.cap];
   return mmss(c.tp&&c.tp[x.par]!=null?c.tp[x.par]:c.t);};
 out["8 · o timecode segue a ancora"]={
   "n-vid-1":{pela_ancora:mmss(tempoDe(v1)),pelo_paragrafo_gravado:tpGravado(v1),
     par_gravado:v1.par,par_resolvido:ancoraDe(v1)?ancoraDe(v1).par:null},
   "n-vid-2":{pela_ancora:mmss(tempoDe(v2)),pelo_paragrafo_gravado:tpGravado(v2),
     par_gravado:v2.par,par_resolvido:ancoraDe(v2)?ancoraDe(v2).par:null}};

 /* ── III · O ACERVO INTEIRO, contado ─────────────────────────────── */
 const inventario=()=>{
   const com=S.dst.filter(x=>x.cita);
   const r=com.map(x=>({k:x.k,r:ancoraDe(x),q:quaseDe(x)}));
   const porComo={};
   r.forEach(x=>{const c=x.r?x.r.como:"orfa";porComo[c]=(porComo[c]||0)+1;});
   const scores=r.filter(x=>x.r).map(x=>x.r.score).sort((a,b)=>a-b);
   return {notas_com_citacao:com.length,por_como:porComo,
     reancoradas:scores.length,orfas:r.length-scores.length,
     menor_score:scores.length?pc(scores[0]):null,
     maior_score:scores.length?pc(scores[scores.length-1]):null,
     orfas_e_o_melhor_candidato:r.filter(x=>!x.r)
       .map(x=>({k:x.k,melhor:x.q?pc(x.q.score):null,cita:x.q?pc(x.q.pC):null}))};
 };
 out["9 · acervo com a transcricao revisada"]=inventario();

 /* devolve a transcricao, e mede o acervo em repouso */
 document.getElementById("btConv").click();
 ARQ=arqAntes;
 out["10 · acervo em repouso"]=inventario();
 return out;
})()
