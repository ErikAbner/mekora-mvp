import { capaDoLivro } from "./capa-substituta.js";

/* A lombada usa a mesma variante da capa de reserva. As duas partes nasceram
 * juntas no conjunto 1016:31030 e precisam continuar pareadas: trocar a chave
 * aqui faria o mesmo livro ganhar duas identidades visuais. */
export function varianteDaLombada(chave) {
  return capaDoLivro(chave);
}

function cortarEmPalavra(texto, limite) {
  const limpo = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  const cabem = limpo.slice(0, limite - 1);
  const ultimoEspaco = cabem.lastIndexOf(" ");
  const corte = ultimoEspaco >= Math.floor(limite * 0.58)
    ? cabem.slice(0, ultimoEspaco)
    : cabem;
  return `${corte.trimEnd()}…`;
}

export function tituloNaLombada(titulo, limite = 48) {
  const limpo = String(titulo ?? "Sem título").replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;

  /* Subtítulo é a primeira coisa que sai. Na estante, "Ruined by Design" é
   * uma identificação melhor que quarenta e oito caracteres seguidos de uma
   * reticência no meio de "Designers". */
  const principal = limpo.split(/\s(?:—|–)\s|:\s/)[0].trim();
  if (principal.length >= 8 && principal.length <= limite) return principal;
  return cortarEmPalavra(limpo, limite);
}

export function autorNaLombada(autor, limite = 28) {
  const limpo = String(autor ?? "").replace(/\s+/g, " ").trim();
  if (!limpo || limpo.length <= limite) return limpo;

  const partes = limpo.split(" ").filter(Boolean);
  if (partes.length < 3) return cortarEmPalavra(limpo, limite);

  const primeiro = partes[0];
  const ultimo = partes.at(-1);
  const meio = partes.slice(1, -1)
    .filter((p) => !/^(da|das|de|do|dos|e)$/i.test(p))
    .map((p) => `${p[0]}.`)
    .join(" ");
  return cortarEmPalavra([primeiro, meio, ultimo].filter(Boolean).join(" "), limite);
}

/* Recebe RGBA de um canvas pequeno e devolve a família cromática que mais
 * ocupa a capa. Agrupar em degraus de 32 evita que compressão JPEG transforme
 * uma superfície visualmente única em centenas de cores quase iguais. */
export function corPrincipalDosPixels(dados) {
  const grupos = new Map();
  for (let i = 0; i < dados.length; i += 4) {
    const a = dados[i + 3];
    if (a < 160) continue;
    const r = dados[i];
    const g = dados[i + 1];
    const b = dados[i + 2];
    const chave = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const grupo = grupos.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 };
    grupo.n += 1;
    grupo.r += r;
    grupo.g += g;
    grupo.b += b;
    grupos.set(chave, grupo);
  }

  let maior = null;
  for (const grupo of grupos.values()) {
    if (!maior || grupo.n > maior.n) maior = grupo;
  }
  if (!maior) return null;
  return [
    Math.round(maior.r / maior.n),
    Math.round(maior.g / maior.n),
    Math.round(maior.b / maior.n),
  ];
}

export function paletaDaLombada(rgb) {
  if (!rgb) return { fundo: "#d9d9d9", tinta: "#101010" };
  const [r, g, b] = rgb;
  const canal = (n) => {
    const s = n / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminancia = 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  return {
    fundo: `rgb(${r} ${g} ${b})`,
    tinta: luminancia > 0.36 ? "#101010" : "#f4f2ec",
  };
}
