/* O progresso da leitura tem de sair do texto, não do pixel: mudar corpo,
   entrelinha ou largura de coluna muda a altura do documento e não pode mudar
   onde a pessoa está. A última linha da tabela é a que prova isso. */
(()=>{
  const passos=[];
  S.lugar="leitura";S.dentro=true;S.folha=null;pinta();
  const c=document.querySelector(".corpo");
  const ler=onde=>({onde,rotulo:(document.getElementById("progT")||{}).textContent,
    fio:(document.getElementById("progF")||{}).style.width,capitulo:S.cap+1,paragrafo:S.leit.par});
  for(const f of [0,.25,.5,.75,1]){
    c.scrollTop=Math.round((c.scrollHeight-c.clientHeight)*f);
    c.dispatchEvent(new Event("scroll"));
    passos.push(ler("scroll "+f*100+"%"));
  }
  const guardado=S.leit.par;
  S.lugar="livro";pinta();S.lugar="leitura";S.dentro=true;pinta();
  passos.push({...ler("saiu e voltou"),guardado});
  const antes=S.leit.par;
  S.corpo=2;S.largura=2;S.entre=2;pinta();
  passos.push({onde:"corpo maior, coluna larga",paragrafoAntes:antes,paragrafoDepois:S.leit.par,
    alturaDoDocumento:Math.round(document.querySelector(".corpo").scrollHeight)});
  return passos;
})()
