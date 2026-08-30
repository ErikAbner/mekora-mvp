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
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { TrilhaConta } from "../componentes/TrilhaConta.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import "./conta-kindle.css";

export function ContaKindle({ pessoa, aparelhos: iniciais = [] }) {
  const [aparelhos, setAparelhos] = useState(iniciais);
  const [conectando, setConectando] = useState(false);
  const [endereco, setEndereco] = useState("");
  const [erro, setErro] = useState(null);

  const conectar = () => {
    /* A validação diz o que fazer, não que está inválido. O endereço do Kindle
     * tem forma conhecida, e apontar a forma é o que resolve. */
    if (!/@kindle\.com$/i.test(endereco.trim())) {
      setErro("O endereço precisa terminar em @kindle.com. Ele aparece em Configurações › Sua conta, no próprio aparelho.");
      return;
    }
    setAparelhos((a) => [...a, { id: endereco, nome: endereco.split("@")[0], endereco, principal: a.length === 0 }]);
    setEndereco(""); setErro(null); setConectando(false);
  };

  const tornarPrincipal = (id) =>
    setAparelhos((a) => a.map((x) => ({ ...x, principal: x.id === id })));

  return (
    <div className="mesa">
      <Cabecalho />
      <div className="conta">
        <TrilhaConta pessoa={pessoa} />

        <main className="conta-painel">
          <section className="conta-secao">
            <h2>Dispositivos Kindle</h2>
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
                    <Botao tom="secundaria">Editar</Botao>
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
    </div>
  );
}
