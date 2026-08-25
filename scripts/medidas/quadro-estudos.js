/* O quadro dos estudos: derivacao correta, e so o fechar e movimento. */
S.lugar="notas";S.nfiltro="estudos";S.estVista="quadro";pinta();
const col=k=>[...document.querySelectorAll('.qCol[data-c="'+k+'"] .qCard')]
  .map(c=>c.querySelector("h3").textContent.trim());
const r={
  andando:col("andando"), guardado:col("guardado"), fechado:col("fechado"),
  regra:!!document.querySelector(".qRegra"),
  /* o centro do cartao guardado e uma AFIRMACAO, nao pergunta */
  centroGuardado:(document.querySelector('.qCol[data-c="guardado"] .sobre')||{}).textContent||"",
  legal:{ guardadoParaFechado:qLegal("guardado","fechado"),
          fechadoParaAndando:qLegal("fechado","andando"),
          andandoParaGuardado:qLegal("andando","guardado") }
};
/* fechar pelo botao, e conferir que a carta troca de coluna */
roteia("est-fechar","est-serie",null);pinta();
r.depoisDeFechar={guardado:col("guardado"),fechado:col("fechado")};
roteia("est-reabrir","est-serie",null);pinta();
r.depoisDeReabrir={guardado:col("guardado"),fechado:col("fechado")};
r;
