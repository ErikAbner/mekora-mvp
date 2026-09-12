/* A causa técnica continua nos logs e no estado do servidor. Na interface,
 * assinaturas de exceção viram uma recuperação que a pessoa consegue seguir. */
export function erroParaPessoa(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "A preparação não terminou. Tente novamente.";
  if (/(traceback|nonetype|not defined|typeerror|nameerror|os\.pathlike|sqlalchemy|exception)/i.test(texto)) {
    return "O Mekora encontrou uma falha interna ao preparar o arquivo. Tente novamente; se ela se repetir, volte à Mesa e envie o arquivo outra vez.";
  }
  return texto;
}
