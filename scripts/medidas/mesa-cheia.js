/* Põe um arquivo na mesa antes de medir.
 *
 * A mesa CHEIA é outra tela, com estados, contagens e a tinta de erro — e o
 * portão só via a vazia, porque é o que uma sessão nova mostra. Medir a vazia e
 * dar verde é verde por omissão: a interface que carrega cor de estado é
 * justamente a que não estava sendo olhada.
 */
(async () => {
  await new Promise((r) => setTimeout(r, 2500));
  const ruim = new File([new Uint8Array([9, 9, 9])], "planilha.xlsx", { type: "application/vnd.ms-excel" });
  const input = document.querySelector('input[type=file]');
  const dt = new DataTransfer();
  dt.items.add(ruim);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 4000));
  return { linhas: document.querySelectorAll(".lista li").length };
})()
