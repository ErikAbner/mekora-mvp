/* Aplicar o tema escolhido.
 *
 * A ESCOLHA VIVE NO SERVIDOR, e chega tarde demais para desenhar a primeira
 * tela. Entre abrir a página e a resposta de `/preferencias` há uma ida à rede,
 * e nesse tempo a tela já foi pintada — com o tema do SISTEMA. Quem escolheu
 * escuro num computador claro veria a página branca e depois escurecer.
 *
 * Então a escolha é ESPELHADA no navegador, e o espelho é lido de forma
 * síncrona antes do primeiro desenho. O servidor continua sendo a verdade: ele
 * corrige o espelho quando responde, e é dele que a escolha vem em outro
 * aparelho.
 *
 * `localStorage` aqui é cache, não guarda-tudo: se ele sumir, a única
 * consequência é um piscar na próxima abertura.
 */

const CHAVE = "mekora-tema";

/** Põe o tema no documento. `sistema` tira o atributo e devolve ao sistema. */
export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === "claro" || tema === "escuro" || tema === "sepia") {
    raiz.setAttribute("data-tema", tema);
  } else {
    raiz.removeAttribute("data-tema");
  }
  try {
    if (tema) localStorage.setItem(CHAVE, tema);
  } catch {
    /* Modo privado, ou armazenamento cheio. O tema continua funcionando nesta
     * aba; só não sobrevive a um recarregamento. */
  }
}

/** Lê o espelho. Chamado antes do React montar. */
export function temaEspelhado() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

/* Aplica na hora do import, que é antes de qualquer componente montar. Isso é
 * deliberadamente um efeito colateral de módulo: um `useEffect` rodaria depois
 * do primeiro desenho, que é exatamente o que se quer evitar. */
export function aplicarEspelhoAgora() {
  const t = temaEspelhado();
  if (t) aplicarTema(t);
}
