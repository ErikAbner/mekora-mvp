import { useEffect, useState } from "react";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { TrilhaConta } from "../componentes/TrilhaConta.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { apagarMinhaConta, lerPrivacidade, levarMeusDados } from "../../../contrato/api.js";
import "./conta.css";
import "./privacidade.css";

/* O que o Mekora guarda sobre você, e como levar embora.
 *
 * A lista é CONTADA no banco, e não escrita aqui. Uma política de privacidade
 * escrita à mão envelhece na primeira coluna nova: o produto passa a guardar
 * mais uma coisa e o texto continua listando as antigas, virando uma promessa
 * que ninguém confere.
 */
export function Privacidade({ pessoa, aoSair, aoApagarConta }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [apagando, setApagando] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [erroApagar, setErroApagar] = useState(null);

  useEffect(() => {
    let vivo = true;
    lerPrivacidade().then((d) => vivo && setDados(d)).catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, []);

  /* O arquivo é montado NO NAVEGADOR, a partir do JSON que o servidor devolve.
   * Pedir ao servidor um arquivo pronto exigiria uma rota que escreve em disco,
   * e o que se quer é justamente o contrário: nada novo guardado por causa
   * disso. */
  async function levar() {
    setErro(null);
    try {
      const tudo = await levarMeusDados();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(tudo, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-mekora.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e.message);
    }
  }

  /* O DESENHO SAIU, E ELE NUNCA FOI UM DESENHO.
   *
   * O `ilustracao-privacidade.svg` era um bloco de texto BRANCO — a citacao em
   * destaque da tela de LEITURA — exportado do Figma sem o fundo escuro que ele
   * tinha la. Na pagina clara virava letra branca sobre papel branco,
   * atravessada por cima do conteudo. O Erik mandou a captura.
   *
   * Exportei o no errado, e nada apontou: o portao mede texto do DOM, e isto e
   * imagem. O arquivo foi apagado junto — asset que so sabe estar errado nao
   * serve de nada guardado.
   */
  return (
    <div className="mesa">
      <Cabecalho />
      <div className="conta">
        <TrilhaConta pessoa={pessoa} aoSair={aoSair} />

        <main className="conta-painel">
          <section className="conta-secao">
            <h2>O que o Mekora guarda</h2>

            {erro && <p className="conta-erro" role="alert">{erro}</p>}
            {!dados && !erro && <p className="conta-nota">Contando…</p>}

            {dados && (
              <>
                <ul className="guardado">
                  {dados.itens.map((i) => (
                    <li key={i.nome}>
                      <p className="guardado-conta">
                        <span className="dado">{i.quantos}</span> {i.nome}
                      </p>
                      <p className="guardado-explicacao">{i.explicacao}</p>
                    </li>
                  ))}
                </ul>

                <div className="conta-condicao">
                  <h3>Para onde as coisas vão</h3>
                  {dados.para_onde_vai.map((linha) => (
                    <p key={linha}>{linha}</p>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* SEUS ARQUIVOS e DADOS DE USO — as duas seções do nó 895:10909 que
              não existiam nesta tela. A de cima contava o que está guardado; o
              que faltava era o que ACONTECE com isso: por quanto tempo o
              original fica, e o que o produto mede enquanto trabalha.

              O texto vem do servidor porque é fato do código — o prazo sai da
              configuração de limpeza, e a lista do que é medido é o esquema da
              tabela de métricas. Escrito à mão aqui, envelheceria na primeira
              coluna nova, que é o defeito que esta tela inteira existe para
              não ter. */}
          {dados?.arquivos && (
            <section className="conta-secao">
              <h2>Seus arquivos</h2>
              <ul className="guardado">
                {dados.arquivos.map((a) => (
                  <li key={a.titulo}>
                    <p className="guardado-conta">{a.titulo}</p>
                    <p className="guardado-explicacao">{a.explicacao}</p>
                    {a.prazo && <p className="guardado-prazo">{a.prazo}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {dados?.uso && (
            <section className="conta-secao">
              <h2>Dados de uso</h2>
              <ul className="guardado">
                {dados.uso.map((u) => (
                  <li key={u.titulo}>
                    <p className="guardado-conta">
                      {u.titulo}
                      {/* A marca à direita é do desenho — "Regra fixa" ao lado
                          do que nunca muda. Onde ele põe um interruptor
                          desligado, aqui está o que é verdade: não existe
                          interruptor, e fingir um seria pior que não ter. */}
                      {u.marca && <span className="marca-arquivo">{u.marca}</span>}
                    </p>
                    <p className="guardado-explicacao">{u.explicacao}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="conta-secao">
            <h2>Levar seus dados</h2>
            <p className="conta-nota">
              Um arquivo com sua conta, suas notas por inteiro, seus livros,
              aparelhos e preferências. Os arquivos convertidos não vão junto —
              eles já podem ser baixados um a um.
            </p>
            <Botao tom="secundaria" onClick={levar}>Baixar tudo em JSON</Botao>
          </section>

          <section className="conta-secao">
            <h2>Apagar a conta</h2>
            <p className="conta-nota">
              Apaga sua conta, suas notas, seus livros e os arquivos no
              servidor. Não há como desfazer, e não guardamos cópia.
            </p>
            {/* `perigo` AQUI é o uso certo: isto destrói, e não há volta. É a
                razão pela qual sair e desligar um Kindle não são vermelhos —
                gastar o alarme neles deixaria este sem força. */}
            <Botao tom="perigo" onClick={() => { setConfirmacao(""); setErroApagar(null); setApagando(true); }}>
              Apagar minha conta
            </Botao>
          </section>
        </main>
      </div>

      <Folha
        aberta={apagando}
        titulo="Apagar a conta"
        aoFechar={() => setApagando(false)}
        acoes={
          <Botao
            tom="perigo"
            disabled={confirmacao.trim().toLowerCase() !== (dados?.email ?? "")}
            onClick={async () => {
              setErroApagar(null);
              try {
                await apagarMinhaConta(confirmacao.trim());
                aoApagarConta?.();
              } catch (e) {
                setErroApagar(e.message);
              }
            }}
          >
            Apagar para sempre
          </Botao>
        }
      >
        <p>
          Isto apaga tudo o que está listado nesta página, e os arquivos no
          servidor. Não há cópia guardada.
        </p>
        <p className="folha-nota">
          Se quiser levar suas notas antes, feche isto e use{" "}
          <strong>Baixar tudo em JSON</strong>.
        </p>
        {/* PEDIR O E-MAIL DIGITADO não é burocracia: é a diferença entre um
            clique errado e uma decisão. Um botão que apaga tudo sozinho vai ser
            clicado por engano por alguém, um dia. */}
        <Campo
          rotulo="Digite seu e-mail para confirmar"
          ajuda={dados?.email}
          tipo="email"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erroApagar}
          autoComplete="off"
        />
      </Folha>
    </div>
  );
}
