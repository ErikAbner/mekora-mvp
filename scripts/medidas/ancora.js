(()=>{
 /* Quatro coisas que a conversao faz com o texto, uma de cada vez, e a
    pergunta e sempre a mesma: a nota ainda acha o trecho dela? */
 const K="n-obs-1", d=escK(K);
 const cap=2,par=0;
 const original=LIVROS["Diário 02"].caps[cap].p[par];
 const outro=LIVROS["Diário 02"].caps[3].p[0];   /* guardar o texto INTEIRO, e nao so tirar o prefixo */
 const est=()=>{const r=ancoraDe(d);
   return {como:r?r.como:"PERDIDA",cap:r?r.cap:null,par:r?r.par:null,
     txt:escTxt(d).slice(0,52)};};
 const poe=(txt,capNovo,parNovo)=>{
   const L=LIVROS["Diário 02"];
   L.caps[cap].p[par]=original;                 /* desfaz o teste anterior */
   L.caps[3].p[0]=outro;
   if(capNovo!=null){L.caps[cap].p[par]="Parágrafo trocado por outro assunto.";
     L.caps[capNovo].p[parNovo]="[movido] "+original;}
   else L.caps[cap].p[par]=txt;
   versaoTexto++;
 };
 const out={};
 out["0 · como foi semeada"]=est();

 /* 1 · OCR corrigido: uma palavra ANTES do trecho muda */
 poe(original.replace("Fotografia a cada duzentos metros","Fotografía a cada 200 metros"));
 out["1 · palavra antes do trecho muda"]=est();

 /* 2 · o paragrafo ganha uma frase na frente (remontagem) */
 poe("Nota do tradutor: o método aparece aqui pela primeira vez. "+original);
 out["2 · frase inserida antes"]=est();

 /* 3 · o contexto imediato muda dos dois lados */
 poe(original.replace("sempre com a mesma lente.","sempre com a mesma objetiva, e no mesmo horário.")
             .replace("O que não cabia","O que nunca coube"));
 out["3 · contexto dos dois lados muda"]=est();

 /* 4 · o trecho migra para outro capitulo */
 poe(null,3,0);
 out["4 · trecho migra de capitulo"]=est();

 /* 5 · o trecho deixa de existir */
 const L=LIVROS["Diário 02"];
 L.caps[3].p[0]=outro;
 L.caps[cap].p[par]="Este parágrafo foi reescrito e não fala mais de repetição.";
 versaoTexto++;
 out["5 · trecho some"]=est();
 out["5 · a nota continua sua"]={nota:d.nota.slice(0,44),perdida:perdida(d)};

 /* devolve tudo ao lugar */
 L.caps[cap].p[par]=original;versaoTexto++;
 out["6 · restaurado"]=est();
 return out;
})()
