/* Os códigos de idioma, e como uma pessoa os chama.
 *
 * O backend fala ISO 639-2 de três letras — `por`, `eng`, `spa` —, que é o que
 * o Argos usa. A tela não pode mostrar isso: "traduzir de por para eng" não é
 * português nem inglês.
 *
 * A LISTA É CURTA DE PROPÓSITO, e só cobre o que aparece. Ela não é um catálogo
 * de idiomas do mundo: é a tradução dos códigos que o motor instalado devolve,
 * e um código que não estiver aqui aparece como ele mesmo — em maiúsculas, para
 * ficar claro que é código e não nome. Melhor "NLD" que um nome errado.
 */
const NOMES = {
  por: "Português",
  eng: "Inglês",
  spa: "Espanhol",
  fra: "Francês",
  deu: "Alemão",
  ita: "Italiano",
  nld: "Holandês",
  rus: "Russo",
  jpn: "Japonês",
  zho: "Chinês",
  ara: "Árabe",
  cat: "Catalão",
  pol: "Polonês",
  tur: "Turco",
  swe: "Sueco",
  dan: "Dinamarquês",
  nor: "Norueguês",
  fin: "Finlandês",
  ces: "Tcheco",
  ell: "Grego",
  heb: "Hebraico",
  hin: "Híndi",
  kor: "Coreano",
  ukr: "Ucraniano",
};

export function nomeDoIdioma(codigo) {
  if (!codigo) return null;
  const chave = String(codigo).trim().toLowerCase();
  return NOMES[chave] ?? chave.toUpperCase();
}

/**
 * Para quais idiomas dá para traduzir a partir deste, com os pares instalados.
 *
 * `pares` é o que `/translation/engines/pairs` devolve para um motor:
 * `[{src, tgt}]`. Devolve `[{codigo, nome}]` ordenado por nome — a ordem do
 * servidor é a de instalação, que não diz nada a quem lê.
 */
export function paraOndeTraduzir(pares, de) {
  if (!Array.isArray(pares) || !de) return [];
  const origem = String(de).trim().toLowerCase();
  const vistos = new Set();
  const fora = [];
  for (const par of pares) {
    if (String(par?.src ?? "").toLowerCase() !== origem) continue;
    const destino = String(par?.tgt ?? "").toLowerCase();
    if (!destino || destino === origem || vistos.has(destino)) continue;
    vistos.add(destino);
    fora.push({ codigo: destino, nome: nomeDoIdioma(destino) });
  }
  return fora.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
