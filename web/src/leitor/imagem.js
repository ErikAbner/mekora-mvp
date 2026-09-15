/* Decisões que dependem apenas das dimensões nativas da imagem.
 *
 * Mantê-las fora do componente permite provar o comportamento sem montar a
 * interface e impede que o teste repita uma regra parecida, mas diferente da
 * usada pelo leitor. */
const LARGA_MINIMA = 900;
const LARGA_PROPORCAO = 1.4;
const CHEIA_MINIMA = 1600;
const CHEIA_PROPORCAO = 2.2;

export function larguraDaImagem(w, h) {
  if (!w || !h) return "";
  const proporcao = w / h;
  if (w >= CHEIA_MINIMA && proporcao >= CHEIA_PROPORCAO) return "cheia";
  if (w >= LARGA_MINIMA && proporcao >= LARGA_PROPORCAO) return "larga";
  return "";
}

export function imagemEFragmento(w, h) {
  /* Conversores de PDF às vezes recortam uma página em dezenas de imagens e
   * usam CSS para remontá-las. Como o leitor extrai conteúdo e descarta o CSS
   * editorial, tiras de 17×2174px viravam “ilustrações” gigantes. Elas não são
   * imagens autônomas: são resíduos da montagem. */
  return Boolean(w && h && w <= 200 && h / w >= 8);
}
