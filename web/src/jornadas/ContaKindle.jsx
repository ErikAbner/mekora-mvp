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
  const { aparelhos, modelos, erro: erroDoServidor, carregando, ligar, mudar, desligar } = usarAparelhos();
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

  /* EDITAR UM APARELHO — o botão que o 966:25554 tem em cada cartão e a tela
   * não tinha. A rota já existia (`PATCH /aparelhos/{id}`) e ninguém a usava
   * para nome nem endereço: dava para tornar principal e desligar, e não dava
   * para corrigir um endereço digitado errado — só apagar e refazer.
   *
   * O `editando` guarda o APARELHO INTEIRO, e não o id: a folha precisa dos
   * valores para preencher os campos, e buscá-los pela lista a cada render faria
   * a folha piscar quando a lista recarregasse. */
  const [editando, setEditando] = useState(null);
  const [nomeNovo, setNomeNovo] = useState("");
  const [enderecoNovo, setEnderecoNovo] = useState("");
  const [erroEditar, setErroEditar] = useState(null);
  /* QUAL KINDLE É ESTE — nó 895:10599. A Amazon não conta o modelo, e não há
     como descobrir pelo endereço: quem sabe é a pessoa. Saber muda o que o
     preparo faz — quadrinho passa a sair no tamanho da tela deste aparelho, e
     não no perfil único da instalação. */
  const [modeloNovo, setModeloNovo] = useState("");

  const abrirEdicao = (ap) => {
    setEditando(ap);
    setNomeNovo(ap.nome ?? "");
    setEnderecoNovo(ap.endereco ?? "");
    setModeloNovo(ap.modelo ?? "");
    setErroEditar(null);
  };

  const guardarEdicao = async () => {
    const endereco = enderecoNovo.trim();
    if (!endereco.includes("@")) {
      setErroEditar("Um endereço de Kindle tem @ — é um e-mail.");
      return;
    }
    /* `modelo: ""` APAGA e `null` não mexe — os dois querem dizer coisas
       diferentes, e aqui a pessoa sempre responde alguma coisa, inclusive "não
       sei". */
    const deu = await mudar(editando.id, { nome: nomeNovo.trim(), endereco, modelo: modeloNovo });
    /* A MENSAGEM DO SERVIDOR, e não uma minha. Ele sabe dizer "já tem um
     * aparelho com esse endereço" e "precisa terminar em @kindle.com"; trocar
     * isso por "não deu para guardar" apagaria a única informação útil. */
    if (deu === false) { setErroEditar(erroDoServidor ?? "Não deu para guardar agora."); return; }
    setEditando(null);
  };

  return (
    /* A moldura — chão, cabeçalho e gaveta — mora na `AreaDaConta`, no `App`:
       ela monta uma vez quando se entra na conta, e as cinco telas trocam DENTRO
       dela. Aqui só o painel desta seção e as folhas que ela abre. */
    <>
    <main className="conta-painel">
          {/* A ILUSTRAÇÃO DESTA TELA — e a escolha dela é minha, com o motivo à
              vista. O nó do Kindle (`966:25687`) põe aqui "secure profile
              settings", que é EXATAMENTE o mesmo desenho que o nó da conta
              (`934:10740`) já põe em /conta: baixei os dois e os traços são o
              mesmo, só em escalas diferentes. Duas abas vizinhas da mesma área
              com o mesmo ornamento leem como defeito.

              Então esta usa "magic password" (`966:25339`, 139x164), que é o
              único desenho da família da conta que nenhuma tela estava usando.
              É ornamento, `aria-hidden`, e é trocável numa linha se o Erik
              preferir repetir o do nó. */}
          {/* A ILUSTRAÇÃO É A MESMA DE `/conta`, e isso é decisão do desenho.
              O nó `966:25687` põe aqui, traço por traço, o "secure profile
              settings" que a visão geral usa — conferido nas duas capturas.

              Eu havia trocado por outro desenho da biblioteca, achando que duas
              abas vizinhas com o mesmo ornamento leem como defeito. O Erik
              fechou em 07/09: "não substituir uma decisão explícita do desenho
              por outra ilustração apenas para evitar repetição". Se um dia
              houver uma própria, será alteração deliberada — não conserto meu. */}
          <img className="conta-desenho" src="/icones/ilustracao-conta.svg" alt="" aria-hidden="true" />
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
                    {/* "Paperwhite (11ª geração) · 1236 × 1648" — a frase vem
                        montada do servidor. A resolução é do MODELO, e derivá-la
                        aqui seria uma segunda tabela para discordar da primeira.
                        Sem modelo a linha não aparece: "modelo desconhecido" não
                        é informação, é ruído em todo cartão. */}
                    {ap.modelo_diz && <p className="aparelho-modelo">{ap.modelo_diz}</p>}
                    {ap.ultimoEnvio && <p className="aparelho-envio">Último envio {ap.ultimoEnvio}</p>}
                  </div>
                  <div className="aparelho-acoes">
                    <Botao tom="secundaria" onClick={() => abrirEdicao(ap)}>
                      Editar
                    </Botao>
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

      <Folha
        aberta={!!editando}
        titulo="Editar o aparelho"
        aoFechar={() => setEditando(null)}
        acoes={<Botao tom="primaria" onClick={guardarEdicao}>Guardar</Botao>}
      >
        <p>
          O nome é só para você reconhecer o aparelho na lista. O endereço é para
          onde o Mekora manda — trocá-lo passa a valer no próximo envio.
        </p>
        <Campo
          rotulo="Nome"
          ajuda="Como você chama este Kindle."
          placeholder="Kindle da sala"
          value={nomeNovo}
          onChange={(e) => { setNomeNovo(e.target.value); setErroEditar(null); }}
        />
        <Campo
          rotulo="Endereço do aparelho"
          ajuda="Aparece no próprio Kindle, em Configurações › Sua conta."
          tipo="email"
          placeholder="nome@kindle.com"
          value={enderecoNovo}
          onChange={(e) => { setEnderecoNovo(e.target.value); setErroEditar(null); }}
          erro={erroEditar}
        />

        {/* QUAL KINDLE É ESTE. A Amazon não conta, e não dá para descobrir pelo
            endereço — quem sabe é você.

            E ISSO NÃO É ETIQUETA: até aqui, quadrinho saía no perfil de tela da
            instalação, um valor só para todo mundo, e quem tem um Oasis recebia
            páginas montadas para um Paperwhite. Sabendo o modelo, o preparo usa
            a tela deste aparelho.

            "Não sei" é a primeira opção e é uma resposta de verdade: sem ela, o
            produto segue exatamente como sempre seguiu. */}
        {modelos.length > 0 && (
          <div className="campo">
            <label htmlFor="modelo-do-kindle">Modelo</label>
            <p className="campo-ajuda">
              Serve para o quadrinho sair no tamanho certo da tela. Nos livros de
              texto não muda nada — ali o texto se ajusta sozinho.
            </p>
            <select
              id="modelo-do-kindle"
              value={modeloNovo}
              onChange={(e) => { setModeloNovo(e.target.value); setErroEditar(null); }}
            >
              <option value="">Não sei / outro</option>
              {modelos.map((m) => (
                <option key={m.chave} value={m.chave}>{m.nome} · {m.tela}</option>
              ))}
            </select>
          </div>
        )}
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
    </>
  );
}
