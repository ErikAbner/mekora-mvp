/* de "andando" para "guardado": o movimento que o produto recusa */
(()=>{const c=document.querySelector('.qCol[data-c="andando"] .qCard');
 const d=c.getBoundingClientRect();
 const alvo=document.querySelector('.qCol[data-c="guardado"] .qPil').getBoundingClientRect();
 const x0=d.left+d.width/2,y0=d.top+18,x1=alvo.left+alvo.width/2,y1=alvo.top+30,p=[];
 for(let i=0;i<=14;i++)p.push({x:x0+(x1-x0)*i/14,y:y0+(y1-y0)*i/14});return p;})()
