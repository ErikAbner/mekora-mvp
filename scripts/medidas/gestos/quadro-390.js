/* a 390 as colunas empilham: arrastar de lado NAO pode fechar nada */
(()=>{const c=document.querySelector('.qCol[data-c="andando"] .qCard');
 const d=c.getBoundingClientRect(),p=[];
 const y=d.top+18;
 for(let i=0;i<=12;i++)p.push({x:d.left+20+(d.width-60)*i/12,y});return p;})()
