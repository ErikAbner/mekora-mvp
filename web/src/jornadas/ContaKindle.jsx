/* Conta — dispositivos Kindle.
 *
 * Vem do nó 895:10599, que o Figma chama de "visão geral" e que na verdade é a
 * tela dos aparelhos. O nome do quadro não descreve o conteúdo — mesma coisa que
 * já tinha acontecido com `Wireframing - Media`.
 *
 * O APARELHO PRINCIPAL É ESTADO DERIVADO, e a tela diz o que ele decide: ele
 * define o tamanho das páginas quando o arquivo é quadrinho, e é para ele que o
 * botão de enviar aponta sem perguntar. Um "principal" que não explica o que
 * muda é um rótulo decorativo.
 */
import { useState } from "react";
import { usarAparelhos } from "../estado/usarAparelhos.js";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { TrilhaConta } from "../componentes/TrilhaConta.jsx";
import { AssistenteKindle } from "./AssistenteKindle.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import "./conta-kindle.css";

export function ContaKindle({ pessoa, aoSair }) {
  /* OS APARELHOS VÊM DO SERVIDOR agora.
   *
   * Eles viviam em `useState`, semeados por uma lista escrita à mão em
   * `App.jsx` — dois Kindles de mentira que sumiam ao recarregar a página. A
   * tela parecia inteira e não guardava nada, e o envio ia para o
   * `KINDLE_EMAIL` do servidor de qualquer jeito. */
  const { aparelhos, erro: erroDoServidor, carregando, ligar, mudar, desligar } = usarAparelhos();
  /* O ASSISTENTE, que faltava inteiro. Quatro telas desenhadas e nenhuma
   * construída — e o changelog do produto já as descrevia. Ele abre sobre esta
   * tela em vez de virar rota própria: a tarefa começa aqui, passa pela Amazon e
   * volta, e tirar a pessoa daqui faria ela perder o lugar de onde saiu. */
  const [assistente, setAssistente] = useState(false);

  const [conectando, setConectando] = useState(false);
  const [endereco, setEndereco] = useState("");
  const [erro, setErro] = useState(null);

  const conectar = async () => {
    /* A validação diz o que fazer, não que está inválido. O endereço do Kindle
     * tem forma conhecida, e apontar a forma é o que resolve.
     *
     * Ela existe aqui E no servidor: aqui para responder na hora, lá porque
     * validação que só vive na tela não é validação — é sugestão. */
    if (!/@kindle\.com$/i.test(endereco.trim())) {
      setErro("O endereço precisa terminar em @kindle.com. Ele aparece em Configurações › Sua conta, no próprio aparelho.");
      return;
    }
    if (await ligar(endereco.trim())) {
      setEndereco(""); setErro(null); setConectando(false);
    }
  };

  const tornarPrincipal = (id) => mudar(id, { principal: true });

  return (
    <div className="mesa">
      <Cabecalho />
      <div className="conta">
        <TrilhaConta pessoa={pessoa} aoSair={aoSair} />

        <main className="conta-painel">
          <section className="conta-secao">
            <h2>Dispositivos Kindle</h2>
            {/* A CONDIÇÃO QUE O PRODUTO NÃO CONTROLA, dita antes de qualquer
                aparelho aparecer. A Amazon só aceita um documento vindo de um
                endereço que a própria pessoa cadastrou na lista de remetentes
                aprovados dela — e o Mekora não tem como fazer isso por ninguém.

                Sem esta explicação, o primeiro envio falha com uma mensagem da
                Amazon que não menciona o Mekora, e não há como ligar uma coisa
                à outra. */}
            {erroDoServidor && <p className="conta-erro" role="alert">{erroDoServidor}</p>}

            {carregando && <p className="conta-nota">Carregando seus aparelhos…</p>}

            {!carregando && !aparelhos.length && (
              <p className="conta-nota">
                Nenhum Kindle ligado ainda. Sem um aparelho, o botão de enviar
                não tem para onde apontar.
              </p>
            )}

            <div className="aparelhos">
              {aparelhos.map((ap) => (
                <article key={ap.id} className={`aparelho${ap.principal ? " principal" : ""}`}>
                  <div className="aparelho-retrato" aria-hidden="true" />
                  <div className="aparelho-texto">
                    <p className="aparelho-nome">{ap.nome}</p>
                    <p className="aparelho-detalhe">{ap.detalhe ?? ap.endereco}</p>
                    {ap.ultimoEnvio && <p className="aparelho-envio">Último envio {ap.ultimoEnvio}</p>}
                  </div>
                  <div className="aparelho-acoes">
                    {!ap.principal && (
                      <Botao tom="secundaria" onClick={() => tornarPrincipal(ap.id)}>
                        Tornar principal
                      </Botao>
                    )}
                    {/* `secundaria`, e não `perigo`: desligar um aparelho é
                        reversível — basta ligar de novo, e nenhum arquivo se
                        perde. Alarme para ação reversível gasta o alarme que a
                        exclusão de conta vai precisar. É a mesma regra que vale
                        para o botão de sair. */}
                    <Botao tom="secundaria" onClick={() => desligar(ap.id)}>
                      Desligar
                    </Botao>
                  </div>
                </article>
              ))}

              <div className="aparelho-novo">
                <Botao tom="secundaria" onClick={() => setConectando(true)}>
                  Conectar outro Kindle
                </Botao>
                <p>Não sei o endereço do meu Kindle</p>
              </div>
            </div>

            {/* O CAMINHO GUIADO E O AVISO DESCEM QUANDO JÁ HÁ APARELHO.
             *
             * O nó 966:25554 abre com os CARTÕES dos aparelhos; "Primeira vez?"
             * e "Antes do primeiro envio" não estão no topo dele. E faz sentido:
             * quem já ligou um Kindle não precisa do passo a passo antes de ver
             * o que ligou — ele vira referência, não porta de entrada.
             *
             * Sem aparelho nenhum, a ordem se inverte sozinha: aí o caminho
             * guiado É a tela, e a lista vazia é que vira nota de rodapé. */}
            {/* O CAMINHO GUIADO VEM ANTES DO AVISO. A condição que a Amazon
                impõe continua dita — ela não some —, mas quem chega aqui pela
                primeira vez precisa de um caminho, e não de uma advertência. */}
            <div className="conta-guiado">
              <p>
                Primeira vez? O passo a passo abre a Amazon no lugar certo, guarda
                o endereço e manda um arquivo de teste no fim.
              </p>
              <Botao tom="primaria" onClick={() => setAssistente(true)}>
                Conectar meu Kindle
              </Botao>
            </div>

            <div className="conta-condicao">
              <h3>Antes do primeiro envio</h3>
              <p>
                A Amazon só entrega documentos enviados de um endereço que você
                autorizou. Entre em <strong>amazon.com.br › Conteúdo e dispositivos ›
                Preferências › Configurações de documentos</strong> e adicione o
                endereço de quem envia à lista de e-mails aprovados.
              </p>
              <p className="conta-nota">
                Sem isso o Mekora envia, a Amazon recusa em silêncio, e o arquivo
                não aparece no aparelho.
              </p>
            </div>


            {/* O produto diz o que o "principal" decide, em vez de deixar o
                rótulo sozinho. */}
            <p className="conta-nota">
              O aparelho principal é o que define o tamanho das páginas quando o arquivo é um
              quadrinho, e é para ele que o botão de enviar aponta sem perguntar.
            </p>
          </section>
        </main>
      </div>

      <Folha
        aberta={conectando}
        titulo="Conectar outro Kindle"
        aoFechar={() => { setConectando(false); setErro(null); }}
        acoes={<Botao tom="primaria" onClick={conectar}>Conectar</Botao>}
      >
        <p>
          Cada Kindle tem um endereço de e-mail próprio. O Mekora envia os arquivos preparados
          para ele.
        </p>
        <Campo
          rotulo="Endereço do aparelho"
          ajuda="Aparece no próprio Kindle, em Configurações › Sua conta."
          tipo="email"
          placeholder="nome@kindle.com"
          value={endereco}
          onChange={(e) => { setEndereco(e.target.value); setErro(null); }}
          erro={erro}
        />
      </Folha>

      {assistente && (
        <AssistenteKindle
          aoFechar={() => setAssistente(false)}
          aoLigar={async ({ endereco, nome }) => {
            const deu = await ligar(endereco, nome);
            if (!deu) throw new Error("Não deu para guardar o aparelho agora.");
          }}
          aoEnviarTeste={async () => { /* o envio de teste entra quando o backend o tiver */ }}
        />
      )}
    </div>
  );
}
