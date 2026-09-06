/* Abre o assistente do Kindle e avança até o passo 3 (`941:23103`), preenchendo
   o endereço que o passo 2 exige. */
(() => { const bate=setInterval(()=>{
  const ak=document.querySelector('.ak');
  if(!ak){
    const b=[...document.querySelectorAll('a,button')].find(e=>/Conectar meu Kindle|passo a passo|Conectar o Kindle/i.test(e.textContent||''));
    if(b) b.click(); return;
  }
  const conta=(ak.querySelector('.ak-conta')||{}).textContent||'';
  if(/Passo 3 de 4/.test(conta)){ clearInterval(bate); return; }
  const campos=[...ak.querySelectorAll('input')];
  const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  if(campos[0] && !campos[0].value){ setter.call(campos[0],'medida_'+Date.now()+'@kindle.com'); campos[0].dispatchEvent(new Event('input',{bubbles:true})); return; }
  if(campos[1] && !campos[1].value){ setter.call(campos[1],'Kindle da medida'); campos[1].dispatchEvent(new Event('input',{bubbles:true})); return; }
  const av=ak.querySelector('[role=alert]'); if(av) window.__aviso=(av.textContent||'').slice(0,80);
  const b=[...ak.querySelectorAll('button')].find(e=>/^(Começar|Estou nessa tela|Salvar|Continuar)$/.test((e.textContent||'').trim()) && !e.disabled);
  if(b) b.click();
},500); setTimeout(()=>clearInterval(bate),16000); })()
