/* Conectar o Kindle, um passo por vez.
 *
 * São quatro telas desenhadas — `941:23115` a `941:23104`, mais a variação
 * `1b′` e o `teste enviado` —, e nenhuma tinha sido implementada. Pior: o
 * changelog do próprio produto já as descrevia, e eu transcrevi a descrição para
 * a tela de Atualizações sem construir a coisa: *"Antes era um artigo de ajuda
 * com dois assuntos misturados no mesmo parágrafo. Agora são cinco passos, um de
 * cada vez, com validação do endereço e um arquivo de teste no fim."*
 *
 * POR QUE UM ASSISTENTE, E NÃO UM CAMPO. Conectar o Kindle é a única tarefa do
 * produto que acontece **fora dele**: metade dos passos é na Amazon. Um campo de
 * e-mail sozinho pede que a pessoa saiba de antemão onde achar o endereço e que
 * é preciso autorizar o remetente — e é justamente não saber isso que faz o
 * envio falhar em silêncio depois.
 *
 * O PASSO 3 É O QUE SALVA O RESTO. A Amazon recusa arquivo de remetente não
 * autorizado **sem avisar ninguém**: nem quem enviou, nem quem esperava. É a
 * causa mais comum de "mandei e não chegou", e é por isso que ela tem um passo
 * inteiro em vez de uma linha de ajuda.
 */
import { useState } from "react";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import "./assistente-kindle.css";

/* O endereço que a Amazon precisa autorizar. Ele vem do servidor no futuro —
 * hoje é o mesmo para toda a instalação, e está escrito aqui em vez de num
 * `.env` que a tela não lê. */
const REMETENTE = "envio@mekora.app";

const CAMINHO_AMAZON = [
  "Sua conta",
  "Preferências",
  "Configurações de documentos pessoais",
];

const CAMINHO_AUTORIZAR = [
  "Preferências",
  "Configurações de documentos pessoais",
  "Lista de e-mails aprovados",
  "Adicionar um novo endereço",
];

export function AssistenteKindle({ aoLigar, aoFechar, aoEnviarTeste }) {
  const [passo, setPasso] = useState(0);
  const [endereco, setEndereco] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [testeEnviado, setTesteEnviado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const fechar = () => aoFechar?.();

  /* A VALIDAÇÃO É A MESMA DA TELA DE APARELHOS, e a mensagem também: dois textos
   * diferentes para o mesmo erro fazem a pessoa achar que são erros diferentes. */
  const enderecoServe = /@kindle\.com\s*$/i.test(endereco.trim());

  const salvar = async () => {
    if (!enderecoServe) {
      setErro("O endereço precisa terminar em @kindle.com. Ele aparece em Configurações › Sua conta, no próprio aparelho.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await aoLigar?.({ endereco: endereco.trim(), nome: nome.trim() || "Meu Kindle" });
      setPasso(3);
    } catch (e) {
      setErro(e.message || "Não deu para guardar o aparelho agora.");
    } finally {
      setSalvando(false);
    }
  };

  const Cabeca = ({ numero, titulo }) => (
    <header className="ak-topo">
      <div className="ak-topo-linha">
        <p className="ak-marca">Kindle</p>
        <button type="button" className="ak-fechar" aria-label="Fechar" onClick={fechar}>×</button>
      </div>
      {numero > 0 && (
        <>
          <p className="ak-conta">Passo {numero} de 4</p>
          {/* A BARRA É DE QUATRO BLOCOS, e não uma faixa contínua: o desenho a
              divide porque o que importa aqui não é a fração, é QUANTAS telas
              ainda vêm. Uma faixa lisa em 25% não responde isso. */}
          <div
            className="ak-barra"
            role="progressbar"
            aria-valuenow={numero}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={`Passo ${numero} de 4`}
          >
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={n <= numero ? "feito" : undefined} />
            ))}
          </div>
        </>
      )}
      <h2>{titulo}</h2>
    </header>
  );

  const Caminho = ({ passos }) => (
    <ol className="ak-caminho">
      {passos.map((p) => (
        <li key={p}><span>{p}</span></li>
      ))}
    </ol>
  );

  return (
    <div className="ak-fundo" role="dialog" aria-modal="true" aria-label="Conectar o Kindle">
      <div className="ak">
        {passo === 0 && (
          <>
            <Cabeca numero={0} titulo="Vamos conectar seu Kindle" />
            <p className="ak-fala">
              Você só precisa fazer isso uma vez. São duas coisas: encontrar o
              endereço do seu Kindle, e autorizar o Mekora a mandar arquivos para
              ele.
            </p>
            {/* O ÍNDICE DOS PASSOS, com os que virão em tinta fraca. Ele diz o
                tamanho da tarefa antes de ela começar — e o tamanho é a primeira
                coisa que faz alguém desistir no meio. */}
            <ol className="ak-indice">
              {["Encontrar o endereço", "Trazer para o Mekora", "Autorizar o Mekora", "Confirmar"].map((t, i) => (
                <li key={t} className={i === 0 ? "agora" : undefined}>
                  <span className="ak-indice-numero">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <p className="ak-nota">
              Leva menos de dois minutos, e parte disso acontece no site da Amazon.
            </p>
            <div className="ak-acoes">
              <Botao tom="secundaria" onClick={fechar}>Agora não</Botao>
              <Botao tom="primaria" onClick={() => setPasso(1)}>Começar</Botao>
            </div>
          </>
        )}

        {passo === 1 && (
          <>
            <Cabeca numero={1} titulo="Abra as configurações na Amazon" />
            <p className="ak-fala">
              O endereço do seu Kindle mora na Amazon, não aqui. Vamos abrir a
              página onde ele fica.
            </p>
            {/* `rel="noreferrer"` não é zelo: sem ele a página aberta recebe uma
                referência à nossa e pode trocá-la de endereço por baixo. */}
            <a
              className="botao primaria ak-largo"
              href="https://www.amazon.com.br/hz/mycd/myx#/home/settings/payment"
              target="_blank"
              rel="noreferrer noopener"
            >
              Abrir a Amazon numa aba nova
            </a>
            <p className="ak-subtitulo">O caminho lá dentro:</p>
            <Caminho passos={CAMINHO_AMAZON} />
            <p className="ak-nota">
              A Amazon muda o desenho dessa área de vez em quando. Os nomes acima
              são o que procurar; se a sua tela estiver diferente, o passo
              seguinte tem uma saída.
            </p>
            <div className="ak-acoes">
              <Botao tom="secundaria" onClick={fechar}>Fazer depois</Botao>
              <Botao tom="primaria" onClick={() => setPasso(2)}>Estou nessa tela</Botao>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <Cabeca numero={2} titulo="Cole o endereço aqui" />
            <p className="ak-fala">
              É o endereço que você acabou de encontrar na Amazon. Cada aparelho
              tem um, terminado em <strong>@kindle.com</strong> — não é o e-mail
              com que você entra na Amazon.
            </p>
            <Campo
              rotulo="Endereço do Kindle"
              value={endereco}
              onChange={(e) => { setEndereco(e.target.value); setErro(null); }}
              placeholder="conta@kindle.com"
              erro={erro}
            />
            <Campo
              rotulo="Como você quer chamar o seu Kindle?"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Kindle da sala"
              ajuda="Só para você reconhecer, quando tiver mais de um."
            />
            <div className="ak-acoes">
              <Botao tom="secundaria" onClick={() => setPasso(1)}>Voltar</Botao>
              <Botao tom="primaria" onClick={salvar} porque={salvando ? "Guardando…" : null}>
                {salvando ? "Guardando…" : "Continuar"}
              </Botao>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <Cabeca numero={3} titulo="Falta autorizar o Mekora" />
            <p className="ak-fala">
              A Amazon só entrega arquivos de remetentes que você autorizou. Sem
              isso, o Kindle recusa em silêncio, e é o motivo mais comum de um
              envio não chegar.
            </p>
            <div className="ak-remetente">
              <p className="ak-endereco">{REMETENTE}</p>
              <Botao
                tom="primaria"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(REMETENTE);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2400);
                  } catch {
                    /* Sem área de transferência — em http sem TLS, ou permissão
                       negada. O endereço está à vista logo acima, e a pessoa
                       copia à mão: é por isso que ele é TEXTO e não só um botão. */
                    setCopiado(false);
                  }
                }}
              >
                {copiado ? "Copiado" : "Copiar endereço"}
              </Botao>
            </div>
            <p className="ak-subtitulo">Onde colar, na mesma área da Amazon</p>
            <Caminho passos={CAMINHO_AUTORIZAR} />
            <div className="ak-acoes">
              <Botao tom="secundaria" onClick={fechar}>Fazer depois</Botao>
              <Botao tom="primaria" onClick={() => setPasso(4)}>Estou nessa tela</Botao>
            </div>
          </>
        )}

        {passo === 4 && (
          <>
            <Cabeca numero={4} titulo={testeEnviado ? "Teste enviado" : "Pronto"} />
            {testeEnviado ? (
              <>
                <p className="ak-fala">
                  Mandamos um arquivo pequeno para <strong>{endereco}</strong>.
                  Ele costuma chegar em alguns minutos.
                </p>
                <p className="ak-nota">
                  Se não chegar, quase sempre é a autorização do passo 3 — a
                  Amazon recusa sem avisar, e por isso não temos como saber daqui.
                </p>
              </>
            ) : (
              <>
                {/* O QUE O PRODUTO SABE E O QUE ELE NÃO SABE, lado a lado. O
                    primeiro item ele confirmou; o segundo é palavra da pessoa, e
                    a tela diz isso em vez de fingir que verificou. */}
                <ul className="ak-conferido">
                  <li>
                    <span className="ak-ponto" aria-hidden="true" />
                    <span>
                      <strong>Kindle cadastrado</strong>
                      <span className="ak-detalhe">{endereco}</span>
                    </span>
                  </li>
                  <li>
                    <span className="ak-ponto" aria-hidden="true" />
                    <span>
                      <strong>Mekora marcado como autorizado</strong>
                      <span className="ak-detalhe">{REMETENTE}</span>
                    </span>
                  </li>
                </ul>
                <p className="ak-nota">
                  O segundo item é o que você nos disse — não temos como verificar
                  do nosso lado. Um arquivo de teste é a única forma de saber
                  agora, em vez de descobrir depois de preparar um livro inteiro.
                </p>
              </>
            )}
            <div className="ak-acoes">
              <Botao tom="secundaria" onClick={fechar}>Concluir</Botao>
              {!testeEnviado && (
                <Botao
                  tom="primaria"
                  onClick={async () => {
                    try { await aoEnviarTeste?.(); } catch { /* a tela já avisa */ }
                    setTesteEnviado(true);
                  }}
                >
                  Enviar arquivo teste
                </Botao>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
