/* O tamanho de um arquivo, em palavras de gente.
 *
 * O nó `966:31504` escreve "11.5 MB" — com ponto, que é a notação inglesa. Em
 * português o separador decimal é a VÍRGULA, e o produto é em português: aqui
 * sai "11,5 MB".
 *
 * MIL E VINTE E QUATRO, e não mil. A discussão entre MB e MiB é real e velha, e
 * o que decide aqui é a comparação: o sistema operacional de quem usa mostra
 * 11,5 MB para o mesmo arquivo, e um produto que dissesse 12,1 pareceria estar
 * medindo outra coisa.
 *
 * `null` para tamanho desconhecido, e não "0 B" — trabalho anterior à coluna
 * `input_bytes` não sabe o próprio tamanho, e zero seria o produto afirmando
 * que o arquivo é vazio.
 */
const DEGRAUS = ["B", "KB", "MB", "GB"];

export function tamanhoLegivel(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes === 0) return "0 B";

  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < DEGRAUS.length - 1) {
    n /= 1024;
    i++;
  }

  /* UMA CASA DECIMAL, e nenhuma em bytes: "742,0 B" é ruído — byte não tem
   * fração. E acima de 100 a casa também não informa: "512,3 MB" e "512 MB"
   * dizem a mesma coisa para quem quer saber se cabe. */
  const casas = i === 0 || n >= 100 ? 0 : 1;
  return `${n.toFixed(casas).replace(".", ",")} ${DEGRAUS[i]}`;
}
