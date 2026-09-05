import { Cabecalho } from "./Cabecalho.jsx";
import { useEstreito } from "../estreito.js";
import "../jornadas/ainda-nao.css";

/* O lugar que existe, e não neste tamanho de tela.
 *
 * Irmão do `AindaNao`, e pela mesma razão escrita lá: "um botão no menu que não
 * responde ensina o usuário a não clicar, e uma tela em branco parece defeito".
 * Aqui o problema é outro — o lugar existe e funciona, só não neste aparelho —,
 * e a resposta é a mesma: o produto diz o que não faz, com o motivo.
 *
 * POR QUE ISTO NASCEU: o Erik decidiu que o Canvas é de computador, e reafirmou
 * em 04/09 — "canvas n vai existir no telefone, ja falamos sobre isso". Medido
 * no mesmo dia: a 390 o Canvas renderizava inteiro e aparecia no dock como
 * qualquer outro lugar. A decisão morava só na conversa.
 *
 * A DIVISÃO. No telefone o Canvas sai do menu e da barra de baixo — ele não
 * existe ali, e oferecer o que não funciona ensina que o produto está quebrado.
 * Mas a ROTA continua respondendo: quem guardou o endereço, ou abriu no
 * computador e voltou pelo histórico, recebe o motivo em vez de uma tela em
 * branco. Não anunciado onde não serve; não quebrado onde for pedido.
 */
export function SoNoComputador({ lugar, children }) {
  const estreito = useEstreito();

  if (!estreito) return children;

  return (
    <div className="mesa">
      <Cabecalho />
      <section className="ainda-nao">
        <div className="ainda-nao-texto">
          <h1>{lugar.rotulo}</h1>
          <p className="promessa-curta">{lugar.oQueE}</p>
          <p className="aviso">{lugar.porqueSoNoComputador}</p>
        </div>
      </section>
    </div>
  );
}
