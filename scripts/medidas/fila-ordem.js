/* O que a fila diz depois do gesto. ordemNoEstado vazio = o arrasto nao
   chegou a escrever nada, que foi o defeito de 24 ago: lostpointercapture no
   primeiro pixel porque o no era movido no DOM durante o arrasto. */
(()=>({
  ordemNaTela:[...document.querySelectorAll("#filaPilha .fCard .ttl")].map(t=>t.innerText.trim()),
  ordemNoEstado:S.ordemFila.slice(),
  posicoes:[...document.querySelectorAll("#filaPilha .fCard .pos")].map(p=>p.innerText.trim()),
  sobrouTransform:[...document.querySelectorAll("#filaPilha .fCard")]
    .filter(c=>c.style.transform).length,
  sobrouArrastando:document.querySelectorAll("#filaPilha .fCard.-arrastando").length
}))()
