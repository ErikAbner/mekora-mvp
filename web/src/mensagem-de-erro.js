/* A causa técnica continua nos logs e no estado do servidor. Na interface,
 * assinaturas de exceção viram uma recuperação que a pessoa consegue seguir. */
export function erroParaPessoa(valor) {
  const extrair = (v, vistos = new Set()) => {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (typeof v !== "object" || vistos.has(v)) return "";
    vistos.add(v);
    for (const chave of ["detail", "message", "motivo", "error", "erro"]) {
      const achado = extrair(v[chave], vistos).trim();
      if (achado) return achado;
    }
    try { return JSON.stringify(v); } catch { return ""; }
  };
  const texto = extrair(valor).trim();
  if (!texto) return "A preparação não terminou. Tente novamente.";
  if (texto === "{}" || texto === "[object Object]") {
    return "A preparação não terminou e o servidor não explicou o motivo. Tente novamente.";
  }
  if (/(traceback|nonetype|not defined|typeerror|nameerror|os\.pathlike|sqlalchemy|exception)/i.test(texto)) {
    return "O Mekora encontrou uma falha interna ao preparar o arquivo. Tente novamente; se ela se repetir, volte à Mesa e envie o arquivo outra vez.";
  }
  return texto;
}
