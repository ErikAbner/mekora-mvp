import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { pedirLink } from "../../../contrato/api.js";
import "./entrar.css";

/* Entrar no Mekora.
 *
 * Uma caixa de e-mail e um botão. Não há senha para criar, esquecer ou trocar,
 * e não há provedor para escolher — a DEC-0039 §1 tirou os dois do caminho, e
 * o que sobrou é o menor formulário que um produto pode ter.
 *
 * A TELA CARREGA UMA DÍVIDA DO SERVIDOR, e é o ponto mais delicado dela. O
 * backend responde a mesma coisa para e-mail com conta e sem conta, para não
 * deixar ninguém descobrir quem usa o Mekora perguntando um endereço de cada
 * vez. O custo é que quem digita errado espera um e-mail que não vem.
 *
 * Então é AQUI que a dívida se paga: a tela de confirmação diz o que fazer
 * quando não chegar, em vez de o servidor dizer quem existe.
 */
export function Entrar() {
  const [parametros] = useSearchParams();
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("escrevendo");
  const [erro, setErro] = useState(null);

  /* Vir de um link que não vale mais não é um erro do produto, é o que
   * acontece quando alguém abre o mesmo link duas vezes — e a decisão de que o
   * link serve uma vez só torna isso comum, não raro. A mensagem trata como
   * comum. */
  const linkVencido = parametros.get("erro") === "link";

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEstado("enviando");
    try {
      await pedirLink(email.trim());
      setEstado("enviado");
    } catch (e) {
      setEstado("escrevendo");
      setErro(e.status === 400 ? "Esse endereço não parece um e-mail." : e.message);
    }
  }

  if (estado === "enviado") {
    return (
      <main className="entrar">
        <h1>Confira sua caixa de entrada</h1>
        <p className="entrar-conta">
          Se houver uma conta em <strong>{email.trim()}</strong>, o link já está a caminho.
          Ele vale por 15 minutos e por uma vez só.
        </p>

        {/* O que o servidor não conta, a tela explica. Sem esta parte, quem
            errou o endereço fica esperando para sempre sem saber por quê. */}
        <div className="entrar-nao-chegou">
          <h2>Se não chegar</h2>
          <ul>
            <li>Confira o endereço que você digitou — um erro de digitação manda o link para outro lugar.</li>
            <li>Procure na caixa de spam. Mensagem automática cai lá com frequência.</li>
            <li>Espere um minuto antes de pedir outro: o link já enviado continua valendo.</li>
          </ul>
        </div>

        <Botao onClick={() => setEstado("escrevendo")}>Usar outro endereço</Botao>
      </main>
    );
  }

  return (
    <main className="entrar">
      <h1>Entrar no Mekora</h1>
      <p className="entrar-conta">
        Não há senha. Você recebe um link por e-mail e entra com ele.
      </p>

      {linkVencido && (
        <p className="entrar-aviso" role="status">
          Esse link não vale mais — ou já foi usado, ou passou dos 15 minutos.
          Peça outro abaixo.
        </p>
      )}

      <form onSubmit={enviar} noValidate>
        <Campo
          rotulo="Seu e-mail"
          tipo="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erro}
          autoComplete="email"
          /* `autoFocus` porque esta tela tem UM campo e nenhuma leitura antes
             dele: aqui o foco automático não rouba lugar de nada. */
          autoFocus
          required
        />
        <Botao tipo="submit" tom="primaria" disabled={estado === "enviando" || !email.trim()}>
          {estado === "enviando" ? "Enviando…" : "Receber o link"}
        </Botao>
      </form>

      <p className="entrar-rodape">
        Converter um documento não exige conta. Ela existe para guardar o que
        você converteu — a estante é a conta.
      </p>
    </main>
  );
}
