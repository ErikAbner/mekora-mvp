/* Escolha — um grupo onde só uma opção vale.
 *
 * POR QUE ESTE COMPONENTE EXISTE. O design system tem onze componentes
 * construídos e NENHUM deles é rádio, caixa de marcar ou interruptor. A tela de
 * Preferências é feita de seis grupos de escolha, então ela não podia ser
 * montada com o que havia. Isto é o que faltava, e ele é do produto — não do
 * `@ds/components-react`, que é cópia de terceiro sob MIT.
 *
 * É UM `<input type="radio">` DE VERDADE, escondido e desenhado por cima. Um
 * `<div>` com `onClick` parece igual e não é: perde seta do teclado, perde
 * agrupamento por `name`, perde o anúncio de "opção 2 de 3" no leitor de tela, e
 * perde o comportamento de formulário. O que se desenha é a aparência; o que
 * responde continua sendo o controle nativo.
 *
 * A FORMA É QUADRADA, e isso vem do desenho e da regra: raio zero em ação e
 * estrutura. Fica registrado o custo, porque ele é real — redondo contra
 * quadrado é como o olho distingue "escolha uma" de "marque quantas quiser". Se
 * um dia existir caixa de marcar no produto, ela precisa de outra distinção que
 * não seja a forma.
 *
 * O SELECIONADO É DEGRAU DE SUPERFÍCIE, e essa parte o desenho não mostrava:
 * todos os quadrados estão vazios nele. A regra do sistema decidiu — seleção é
 * superfície, nunca matiz, porque o acento media 11,9 de distância do estado de
 * perigo e marcar o gesto mais frequente com o tom do alarme mais raro é sinal
 * invertido.
 */
import { useId } from "react";
import "./escolha.css";

export function Escolha({ titulo, explicacao, opcoes, valor, aoTrocar, nome, aviso }) {
  const id = useId();
  const grupo = nome ?? id;

  return (
    <fieldset className="escolha">
      {/* `fieldset` e `legend` não são decoração: são o que faz o leitor de tela
          anunciar o título do grupo antes de cada opção. Um `<p>` solto acima
          das opções fica órfão. */}
      <legend>
        <span className="escolha-titulo">{titulo}</span>
        {explicacao && <span className="escolha-explicacao">{explicacao}</span>}
        {/* DENTRO da `legend` de propósito: assim o leitor de tela anuncia o
            aviso ANTES das opções, e não depois de a pessoa ter escolhido. */}
        {aviso && <span className="escolha-aviso">{aviso}</span>}
      </legend>

      <div className="escolha-opcoes">
        {opcoes.map((o) => (
          <label key={o.id} className="opcao">
            <input
              type="radio"
              name={grupo}
              value={o.id}
              checked={valor === o.id}
              onChange={() => aoTrocar?.(o.id)}
            />
            <span className="marca" aria-hidden="true" />
            <span className="opcao-texto">
              <span className="opcao-rotulo">{o.rotulo}</span>
              {o.detalhe && <span className="opcao-detalhe">{o.detalhe}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
