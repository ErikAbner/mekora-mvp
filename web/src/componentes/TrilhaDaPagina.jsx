/* A trilha de âncoras das páginas longas.
 *
 * Nos nós 895:7631 (livro), 895:8260 (estudo) e 895:8849 (estudos) há uma
 * coluna à esquerda com um traço antes de cada item, e o item de onde a leitura
 * está com o traço em tinta cheia. Não é um segundo menu: todos os destinos já
 * estão na página, abaixo, e ela existe porque essas páginas passam de três
 * telas de altura — a ficha de um livro com trinta notas rola por muito tempo
 * sem dizer onde se está.
 *
 * O MARCADO NÃO É O QUE FOI CLICADO, é o que está sendo lido. Guardar o clique
 * seria mais simples e mentiria em dois casos comuns: quem rola com a roda
 * nunca clica em nada, e quem clica e depois rola para longe continua vendo o
 * item antigo marcado.
 *
 * A PRIMEIRA VERSÃO USAVA `IntersectionObserver`, e ela está registrada aqui
 * porque a razão de ter saído é útil.
 *
 * A ideia era observar as seções com o topo da tela recortado numa faixa fina,
 * e marcar a que passasse por ela. Funcionou em três das quatro seções e falhou
 * na última — sempre. Medido: com a janela no fim do documento, o topo de "Este
 * arquivo" ficava a 542px, longe da faixa, e a seção anterior continuava
 * ganhando. É o caso de sempre: a última seção quase nunca chega ao alto da
 * tela, porque não há rolagem embaixo dela.
 *
 * A emenda — "se a janela está no fim, marque o último" — não resolveu: o
 * observador dispara DEPOIS do evento de rolagem e escrevia por cima. Duas
 * fontes decidindo a mesma coisa, e a que chega por último vence.
 *
 * O que existe agora é uma fonte só: a cada rolagem, mede as seções e escolhe.
 * Ler `getBoundingClientRect` a cada evento é trabalho, e o argumento contra
 * isso — "posição calculada envelhece" — vale para posição GUARDADA, não para
 * posição lida na hora. Nada é guardado entre um evento e outro, e com quatro
 * seções a medida é barata; `requestAnimationFrame` garante uma por quadro.
 */
import { useEffect, useState } from "react";
import "./trilha-da-pagina.css";

/* Onde fica a linha de leitura: um quarto da altura da janela. Acima dela está
 * o que já passou; a seção marcada é a última que cruzou essa linha. */
const LINHA = 0.25;

export function TrilhaDaPagina({ itens = [], rotulo = "Nesta página" }) {
  const [aqui, setAqui] = useState(itens[0]?.id ?? null);
  /* Depende do TEXTO da lista, e não do vetor: quem chama monta os itens no
   * corpo do render, e um vetor novo a cada render religaria tudo a cada
   * quadro. */
  const chaves = itens.map((i) => i.id).join("|");

  useEffect(() => {
    const ids = chaves ? chaves.split("|") : [];
    if (ids.length < 2) return undefined;

    let pedido = null;

    const medir = () => {
      pedido = null;

      /* O FIM DO DOCUMENTO GANHA DE TUDO. Os 2px de folga existem porque a soma
       * dá fracionária em tela com zoom ou densidade não inteira, e `>=` exato
       * nunca fecha nessas. */
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setAqui(ids[ids.length - 1]);
        return;
      }

      const linha = window.innerHeight * LINHA;
      let escolhido = ids[0];
      for (const id of ids) {
        const alvo = document.getElementById(id);
        if (!alvo) continue;
        if (alvo.getBoundingClientRect().top <= linha) escolhido = id;
      }
      setAqui(escolhido);
    };

    const agendar = () => {
      if (pedido === null) pedido = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      if (pedido !== null) cancelAnimationFrame(pedido);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, [chaves]);

  if (itens.length < 2) return null;

  return (
    <nav className="trilha-pagina" aria-label={rotulo}>
      <ul>
        {itens.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              /* `aria-current="location"` é o valor para "este é o lugar onde
                 se está dentro de um conjunto" — `page` diria que é a página
                 atual do site, que não é o caso: é a seção. */
              aria-current={i.id === aqui ? "location" : undefined}
            >
              <span className="trilha-pagina-traco" aria-hidden="true" />
              {i.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
