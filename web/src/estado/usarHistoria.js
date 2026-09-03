/* Desfazer e refazer, por OPERAÇÃO — e não por quadro.
 *
 * O Erik pediu isso com todas as letras: "one drag = one history entry. One
 * resize = one entry. One multi-object move = one entry. Avoid recording every
 * transient frame."
 *
 * É por isso que a história mora aqui e não dentro do gesto. O gesto já tem a
 * forma certa — **começar → prever → confirmar** —, com a previsão vivendo em
 * estado local do objeto e nada indo ao servidor até soltar. A história se
 * pendura no ÚLTIMO desses três: um arrasto de cem quadros registra um passo, na
 * hora em que ele vira fato.
 *
 * O QUE UM PASSO GUARDA são duas funções, e não um retrato do mundo. Guardar o
 * estado inteiro antes e depois seria simples de escrever e errado de usar: o
 * Canvas tem servidor atrás, e restaurar um retrato mandaria de volta coisas que
 * ninguém mexeu. Duas funções dizem exatamente o que reverter.
 *
 * A PILHA DE REFAZER MORRE A CADA AÇÃO NOVA. É a regra de todo editor, e a razão
 * é que o futuro deixou de existir: refazer depois de ter feito outra coisa
 * aplicaria uma mudança sobre um mundo que não é mais aquele.
 */
import { useCallback, useRef, useState } from "react";

/* Teto da pilha. Sessenta passos é mais do que qualquer sessão de arrumação
 * alcança, e o que passa disso é memória parada — cada passo segura referências
 * às posições de antes. */
const TETO = 60;

export function usarHistoria() {
  const feitos = useRef([]);
  const desfeitos = useRef([]);
  /* Um contador só para a tela saber que a pilha mudou. As pilhas são `ref`
   * porque quem as lê são funções de teclado, e não o desenho. */
  const [versao, setVersao] = useState(0);
  const marcar = () => setVersao((v) => v + 1);

  const registrar = useCallback((passo) => {
    feitos.current.push(passo);
    if (feitos.current.length > TETO) feitos.current.shift();
    desfeitos.current = [];
    marcar();
  }, []);

  const desfazer = useCallback(async () => {
    const passo = feitos.current.pop();
    if (!passo) return null;
    await passo.desfazer();
    desfeitos.current.push(passo);
    marcar();
    return passo.rotulo;
  }, []);

  const refazer = useCallback(async () => {
    const passo = desfeitos.current.pop();
    if (!passo) return null;
    await passo.refazer();
    feitos.current.push(passo);
    marcar();
    return passo.rotulo;
  }, []);

  /* Esquecer tudo. Trocar de superfície não deveria deixar um desfazer apontando
   * para objetos de outra. */
  const esquecer = useCallback(() => {
    feitos.current = [];
    desfeitos.current = [];
    marcar();
  }, []);

  return {
    registrar,
    desfazer,
    refazer,
    esquecer,
    temDesfazer: feitos.current.length > 0,
    temRefazer: desfeitos.current.length > 0,
    versao,
  };
}
