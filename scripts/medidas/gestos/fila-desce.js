/* o primeiro cartao desce ate o sexto */
(()=>{const c=[...document.querySelectorAll("#filaPilha .fCard")];
 const de=c[0].getBoundingClientRect(),ate=c[5].getBoundingClientRect();
 const x=de.left+40,y0=de.top+de.height/2,y1=ate.top+ate.height/2,p=[];
 for(let i=0;i<=12;i++)p.push({x,y:y0+(y1-y0)*i/12});return p;})()
