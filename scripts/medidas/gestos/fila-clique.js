/* dois pixels: e clique, e nao arrasto. Sem limiar isto reescrevia a ordem e
   repintava a tela a cada toque no corpo do cartao. */
(()=>{const c=document.querySelector("#filaPilha .fCard").getBoundingClientRect();
 const x=c.left+40,y=c.top+c.height/2;return [{x,y},{x,y:y+1},{x,y:y+2}];})()
