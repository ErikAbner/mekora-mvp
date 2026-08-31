/* Prova que o detector de acento detecta.
 *
 * Verde pode significar "não há erro" ou "o detector não olha", e os dois são
 * indistinguíveis de fora. Isto injeta uma frase errada e o portão TEM que
 * reprovar — se passar, o detector é decoração.
 */
(async () => {
  await new Promise((r) => setTimeout(r, 2000));
  const p = document.createElement("p");
  p.textContent = "Nao foi possivel completar a conversao.";
  document.body.appendChild(p);
  return { injetado: p.textContent };
})()
