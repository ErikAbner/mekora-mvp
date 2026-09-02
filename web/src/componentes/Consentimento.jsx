/* A pergunta sobre medição.
 *
 * POR QUE ELA EXISTE, e por que não existia antes: até 03/09 o Mekora não
 * carregava rastreador nenhum. O `stage_metrics` mede o próprio serviço, sem
 * dado pessoal, e para isso não se pergunta — se avisa, e o aviso está na tela
 * de privacidade. Consentimento é a base legal de UMA situação: terceiro com
 * propósito próprio. PostHog e Clarity são exatamente isso, e é por eles que
 * esta faixa aparece.
 *
 * A REGRA QUE ELA SEGUE: "o serviço ainda funciona se a pessoa disser não?" Se
 * sim, tem de perguntar. Aqui a resposta é sim — o Mekora converte, guarda e
 * envia igual sem medir nada. Então pergunta-se, e o "não" não custa nada a
 * quem responde.
 *
 * O QUE ELA NÃO FAZ
 * =================
 * Não bloqueia a tela. Não escurece o fundo. Não tem um "aceitar" grande e um
 * "recusar" escondido em cinza claro — os dois botões têm o mesmo peso, e o
 * "Não" vem primeiro na ordem de leitura porque é a resposta que não pede nada
 * de ninguém.
 *
 * E não volta a perguntar. Quem responde uma vez respondeu; insistir é o que
 * transforma a pergunta em pedágio.
 */
import { useEffect, useState } from "react";
import { medindo, respostaSobreMedicao, responderSobreMedicao } from "../medir.js";
import { Botao } from "./Botao.jsx";
import "./consentimento.css";

export function Consentimento() {
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    /* Depois da primeira pintura. A faixa não é o assunto de ninguém que acabou
     * de abrir o produto, e disputar o primeiro quadro com o conteúdo é o que
     * faz banner de consentimento ser odiado. */
    /* Onde não se mede, não se pergunta. Em desenvolvimento e na prova local a
       faixa não aparece: perguntar sobre uma coisa que não vai acontecer é
       ruído, e ainda esconde o rodapé de quem está trabalhando na tela. */
    if (!medindo()) return undefined;
    const t = setTimeout(() => setAberta(respostaSobreMedicao() === null), 900);
    return () => clearTimeout(t);
  }, []);

  if (!aberta) return null;

  function responder(r) {
    responderSobreMedicao(r);
    setAberta(false);
  }

  return (
    /* `role="region"` e não `dialog`: ela não é modal, não prende o foco e não
     * impede nada. Quem quiser ignorar, ignora e usa o produto. */
    <section className="consentimento" role="region" aria-label="Sobre medir o uso">
      <p className="consentimento-diz">
        O Mekora quer entender onde as pessoas travam — e para isso precisa de
        duas ferramentas de fora, que gravam a navegação.{" "}
        <strong>O texto dos seus livros e das suas notas fica tapado nessas
        gravações</strong>, sempre. Nada disso é preciso para converter, guardar
        ou enviar: dizer não não tira nada de você.
      </p>
      <div className="consentimento-acoes">
        <Botao tom="secundaria" onClick={() => responder("nao")}>
          Não medir
        </Botao>
        <Botao tom="primaria" onClick={() => responder("sim")}>
          Pode medir
        </Botao>
      </div>
    </section>
  );
}
