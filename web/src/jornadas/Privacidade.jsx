import { useEffect, useState } from "react";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { apagarMinhaConta, lerPrivacidade, levarMeusDados } from "../../../contrato/api.js";
import { respostaSobreMedicao, responderSobreMedicao } from "../medir.js";
import "./conta.css";
import "./privacidade.css";

/* O que o Mekora guarda sobre você, e como levar embora.
 *
 * A lista é CONTADA no banco, e não escrita aqui. Uma política de privacidade
 * escrita à mão envelhece na primeira coluna nova: o produto passa a guardar
 * mais uma coisa e o texto continua listando as antigas, virando uma promessa
 * que ninguém confere.
 */
/* O CONTROLE DA MEDIÇÃO DE NAVEGAÇÃO.
 *
 * Ele não pergunta ao servidor: quem guarda a resposta é o `localStorage`, pelo
 * `medir.js`, porque são os scripts do CLIENTE que sobem ou não sobem. Ler do
 * servidor aqui daria uma tela que discorda do que o navegador faz.
 *
 * Desligar tem efeito imediato para as próximas aberturas — o `ligarMedicao` só
 * corre depois de um "sim" —, e não desfaz o que já subiu nesta aba. A frase
 * diz isso, porque prometer que some tudo seria a mesma mentira que este
 * controle veio consertar. */
function BotaoDaMedicao() {
  const [resposta, setResposta] = useState(() => respostaSobreMedicao());
  const ligado = resposta === "sim";
  return (
    <span className="conta-interruptor">
      <Botao
        tom="secundaria"
        onClick={() => { const nova = ligado ? "nao" : "sim"; responderSobreMedicao(nova); setResposta(nova); }}
      >
        {ligado ? "Desligar" : "Ligar"}
      </Botao>
      <span className="marca-arquivo">{ligado ? "Ligado" : "Desligado"}</span>
    </span>
  );
}

/* COMO A LISTA DO "O QUE O MEKORA GUARDA" SE LÊ.
 *
 * A ordem dos grupos é a da jornada — a conta, os arquivos, o que a pessoa
 * escreveu, o Canvas, e o que o Mekora guarda sobre o próprio uso. Dentro de
 * cada grupo, a ordem é a que o servidor mandou.
 *
 * `resto` NÃO é decoração: se o servidor passar a devolver uma chave que este
 * mapa não conhece, ela aparece em "Outras coisas". Uma tela de privacidade que
 * esconde um item por falta de mapa é pior que uma tela desorganizada. */
const GRUPOS = [
  { titulo: "Sua conta", chaves: ["conta", "sessoes", "links"] },
  { titulo: "Seus arquivos", chaves: ["livros", "leituras", "aparelhos", "preferencias"] },
  { titulo: "O que você escreveu", chaves: ["notas", "marcadores", "estudos", "ligacoes"] },
  { titulo: "No Canvas", chaves: ["no_canvas", "grupos_do_canvas", "midias_do_canvas", "livros_do_canvas"] },
  /* O NOME SAI DOS CAMPOS, e não de uma figura de linguagem. Decisão do Erik em
   * 07/09: numa tela de privacidade, linguagem literal em vez de
   * antropomorfização — "O que o Mekora aprendeu com você" dizia que o produto
   * aprende, que é o oposto do que esta tela existe para explicar.
   *
   * Ele sugeriu "Preferências e histórico", e o nome NÃO SERVE por um motivo
   * que está na própria página: `preferencias` já é um item, no grupo "Seus
   * arquivos" — "as escolhas que você fez em Preferências". Dois "preferências"
   * na mesma tela, apontando para coisas diferentes, é pior que um nome frouxo.
   *
   * "escreveu" também está tomado, pelo grupo das notas. Sobra o que os três
   * campos são, lidos um a um no `privacidade.py`: dois deles são sugestões que
   * a pessoa dispensou — pares de notas e grupos calados, guardados para não
   * sugerir de novo —, e o terceiro é o recado que ela escreveu, com a tela em
   * que estava. */
  { titulo: "Sugestões dispensadas e recados", chaves: ["sugestoes_dispensadas", "grupos_calados", "recados"] },
];

const NOME_NO_SINGULAR = {
  livros: "livro",
  notas: "nota",
  leituras: "leitura",
  marcadores: "marcador",
  aparelhos: "aparelho",
  preferencias: "preferência",
  estudos: "estudo",
  no_canvas: "nota no Canvas",
  grupos_do_canvas: "grupo no Canvas",
  ligacoes: "ligação",
  midias_do_canvas: "imagem no Canvas",
  livros_do_canvas: "livro no Canvas",
  sugestoes_dispensadas: "sugestão que você recusou",
  grupos_calados: "grupo que você mandou parar",
  sessoes: "sessão",
  links: "link de entrada",
  recados: "recado",
};

function nomeContado(item) {
  return item.quantos === 1 ? (NOME_NO_SINGULAR[item.chave] ?? item.nome) : item.nome;
}

function agrupar(itens) {
  const usadas = new Set();
  const grupos = GRUPOS.map(({ titulo, chaves }) => {
    const dentro = chaves
      .map((c) => itens.find((i) => i.chave === c))
      .filter(Boolean);
    dentro.forEach((i) => usadas.add(i.chave));
    return { titulo, itens: dentro };
  }).filter((g) => g.itens.length);

  const resto = itens.filter((i) => !usadas.has(i.chave));
  if (resto.length) grupos.push({ titulo: "Outras coisas", itens: resto });
  return grupos;
}

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
    /* A moldura — chão, cabeçalho e gaveta — mora na `AreaDaConta`, no `App`.
       Aqui só o painel desta seção e a folha que ela abre.

       O FRAGMENTO É NECESSÁRIO: a folha de apagar a conta é IRMÃ do painel, e
       não filha dele. Ela precisa abrir por cima de tudo, e dentro do painel
       ficaria presa à rolagem dele. */
    <>
    <main className="conta-painel conta-painel-privacidade">
      {/* A ILUSTRAÇÃO DESTA TELA — `1016:30615`, "exploring new horizons", do
          component set que o Erik mandou em 05/09. Ela não saía pelo
          `get_design_context`, que exporta cada vetor separado (77, nesta), e
          sai inteira pelo `download_assets` com `defaultFormat: svg`. O
          retângulo `#F5F5F5` que vem junto é o artboard do component set, e não
          o desenho: sai na gravação. */}
      <img className="conta-desenho" src="/icones/ilustracao-privacidade.svg" alt="" aria-hidden="true" />
          <section className="conta-secao">
            <h2>O que o Mekora guarda</h2>

            {erro && <p className="conta-erro" role="alert">{erro}</p>}
            {!dados && !erro && <p className="conta-nota">Contando…</p>}

            {dados && (
              <>
                {/* DEZOITO LINHAS SEGUIDAS VIRAM UMA PAREDE, e era isso que
                    esta lista era: dezoito itens de mesmo peso, cada um com
                    título e explicação, sem nada que os agrupasse. O Erik, no
                    R-30: "texto quebrado e minúsculo por toda parte"; e em
                    07/09: "primeiro corrija legibilidade, hierarquia, tamanho e
                    quantidade de texto".

                    O nó `895:10909` agrupa: ele põe as coisas em seções — "Seus
                    arquivos", "Dados de uso" —, cada uma com os seus cartões. A
                    tela tinha uma seção só com tudo dentro.

                    O AGRUPAMENTO É DA TELA, e não do servidor, de propósito: o
                    servidor responde o que EXISTE, e como se lê é decisão de
                    quem mostra. E o balde final garante que nada suma — uma
                    chave nova que o mapa não conheça aparece em "Outras
                    coisas", em vez de desaparecer da política de privacidade,
                    que é o pior lugar do produto para um item sumir. */}
                {agrupar(dados.itens).map((grupo) => (
                  <div className="guardado-grupo" key={grupo.titulo}>
                    <h3 className="guardado-grupo-titulo">{grupo.titulo}</h3>
                    <ul className="guardado">
                      {grupo.itens.map((i) => (
                        <li key={i.nome}>
                          <p className="guardado-conta">
                            <span className="dado">{i.quantos}</span> {nomeContado(i)}
                          </p>
                          <p className="guardado-explicacao">{i.explicacao}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

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
                          do que nunca muda. Onde a linha TEM controle, o
                          controle aparece no lugar da marca.

                          O comentário aqui dizia, até 05/09, que "não existe
                          interruptor, e fingir um seria pior que não ter". Era
                          verdade para as linhas do servidor, e deixou de ser
                          para a da medição de navegação: a máquina existe desde
                          que as três ferramentas de fora entraram — o
                          `medir.js` guarda a resposta e só sobe os scripts
                          depois de um "sim" —, e a própria explicação da linha
                          PROMETE que "a resposta pode ser mudada aqui a
                          qualquer momento". Prometer um controle que não existe
                          é pior que não ter marca nenhuma. */}
                      {u.interruptor === "medicao"
                        ? <BotaoDaMedicao />
                        : u.marca && <span className="marca-arquivo">{u.marca}</span>}
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

          {/* A ÚNICA AÇÃO SEM VOLTA DA TELA, e ela é a única com borda vermelha —
              nó `895:10909`. As outras quatro seções têm a borda neutra; esta
              não, porque o que ela faz não se desfaz. Marcar destrutivo pela
              cor da BORDA, e não só pelo texto, é o que separa "eu li o aviso"
              de "eu vi que aqui é diferente". */}
          <section className="conta-secao conta-secao-perigo">
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

      <Folha
        aberta={apagando}
        titulo="Apagar a conta"
        aoFechar={() => setApagando(false)}
        acoes={
          <Botao
            tom="perigo"
            porque={confirmacao.trim().toLowerCase() !== (dados?.email ?? "") ? "Escreva o seu email exatamente como ele está acima" : null}
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
    </>
  );
}
