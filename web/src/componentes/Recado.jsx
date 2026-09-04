/* A caixa de recado — o único lugar onde a pessoa fala, em vez de ser medida.
 *
 * POR QUE ELA EXISTE, e por que não veio do Figma: não há tela de recado no
 * desenho. Ela nasceu de uma decisão do Erik em 03/09, e da diferença entre
 * medir e escutar. Rastreamento diz onde alguém clicou e onde desistiu; ele
 * nunca diz POR QUÊ, e o porquê é o que muda um produto.
 *
 * AS TRÊS ESCOLHAS QUE ELA FAZ
 * ============================
 * **Ela não aparece sozinha.** Nenhum temporizador, nenhum "gostando do
 * Mekora?" no meio de uma leitura. O convite mora no menu e no rodapé, onde
 * quem quer falar procura. Um popup que interrompe colhe a opinião de quem foi
 * interrompido, e isso é uma amostra do humor errado.
 *
 * **O humor é opcional, e o texto não.** O contrário — carinha obrigatória,
 * texto opcional — é o formato que enche banco de dados de números sem nenhuma
 * frase, e número sem frase não diz o que consertar.
 *
 * **O campo de e-mail só aparece para quem não entrou.** Quem tem conta já tem
 * endereço; pedir de novo é fazer a pessoa digitar o que o Mekora já sabe.
 */
import { useState } from "react";
import { Folha } from "./Folha.jsx";
import { Botao } from "./Botao.jsx";
import { Campo } from "./Campo.jsx";
import { LIMITE_DO_RECADO, mandarRecado } from "../../../contrato/api.js";
import "./recado.css";

const HUMORES = [
  { id: "ruim", rotulo: "Atrapalhou" },
  { id: "ok", rotulo: "Deu para usar" },
  { id: "bom", rotulo: "Funcionou bem" },
];

export function Recado({ aberta, aoFechar, onde, temConta }) {
  const [humor, setHumor] = useState(null);
  const [texto, setTexto] = useState("");
  const [email, setEmail] = useState("");
  const [mandando, setMandando] = useState(false);
  const [erro, setErro] = useState(null);
  const [foi, setFoi] = useState(false);

  const restam = LIMITE_DO_RECADO - texto.length;

  function fechar() {
    /* O estado zera ao FECHAR, e não ao abrir. Quem fechou sem querer no meio
       de uma frase perde a frase de um jeito ou de outro; zerar aqui garante ao
       menos que a próxima abertura não mostre o "obrigado" da vez passada. */
    setHumor(null);
    setTexto("");
    setEmail("");
    setErro(null);
    setFoi(false);
    aoFechar?.();
  }

  async function mandar() {
    if (!texto.trim() || mandando) return;
    setMandando(true);
    setErro(null);
    try {
      await mandarRecado({ texto, humor, onde, email: temConta ? null : email });
      setFoi(true);
    } catch (e) {
      /* A MENSAGEM DIZ O QUE FAZER COM O TEXTO. Um "erro ao enviar" sozinho faz
         a pessoa fechar a folha e perder o que escreveu — e ela não vai
         escrever de novo. */
      setErro(
        e?.status === 429
          ? "Você já mandou vários recados agora. O texto continua aqui — tente daqui a pouco."
          : "Não consegui enviar agora. O texto continua aqui; tente de novo em instantes.",
      );
    } finally {
      setMandando(false);
    }
  }

  return (
    <Folha
      aberta={aberta}
      titulo={foi ? "Recebido" : "Deixe um recado"}
      aoFechar={fechar}
      acoes={
        foi ? null : (
          <Botao tom="primaria" onClick={mandar} porque={!texto.trim() ? "Escreva o recado antes de enviar" : mandando ? "Enviando…" : null}>
            {mandando ? "Enviando…" : "Enviar"}
          </Botao>
        )
      }
    >
      {foi ? (
        <div className="recado-fim">
          <p>Chegou. Obrigado por escrever.</p>
          <p className="recado-miudo">
            O Mekora é feito por uma pessoa só, então cada recado é lido — mas a
            resposta pode demorar.
          </p>
        </div>
      ) : (
        <div className="recado-corpo" data-clarity-mask="true">
          <p className="recado-abre">
            O que deu errado, o que faltou, o que você esperava e não achou. Escreva
            do jeito que vier.
          </p>

          <fieldset className="recado-humor">
            <legend>Como foi até aqui? <span className="recado-miudo">(opcional)</span></legend>
            <div className="recado-humor-linha">
              {HUMORES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="recado-degrau"
                  aria-pressed={humor === h.id}
                  onClick={() => setHumor(humor === h.id ? null : h.id)}
                >
                  {h.rotulo}
                </button>
              ))}
            </div>
          </fieldset>

          <Campo
            rotulo="Seu recado"
            tipo="area"
            value={texto}
            maxLength={LIMITE_DO_RECADO}
            rows={6}
            onChange={(e) => setTexto(e.target.value)}
            ajuda={
              restam < 200
                ? `Faltam ${restam} caracteres.`
                : "Se puder, conte o que você estava tentando fazer."
            }
          />

          {!temConta && (
            <Campo
              rotulo="Seu e-mail"
              tipo="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              ajuda="Só para poder responder. Deixe em branco se preferir não deixar."
            />
          )}

          {erro && <p className="recado-erro" role="alert">{erro}</p>}
        </div>
      )}
    </Folha>
  );
}
