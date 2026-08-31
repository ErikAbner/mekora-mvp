/* Estante — grade. O fim da jornada: o arquivo virou livro.
 *
 * Vem do nó 895:7315. Aqui a jornada fecha: o que entrou pela Mesa aparece como
 * objeto na estante, com autor, contagem de notas e o ponto onde a leitura
 * parou.
 *
 * Duas regras do sistema aparecem juntas nesta tela:
 *
 * O FILTRO É NOMEADO, e não um eixo repetido. "Tudo · Com nota · No Kindle ·
 * Quadrinhos" são recortes que a grade não mostra sozinha — um recorte não pode
 * repetir o eixo da vista.
 *
 * A TAG É PÍLULA, e por regra: `--rp` é de dado — tag, chip, trilho,
 * interruptor. Pílula e círculo são os 5% que quebram a retidão, e funcionam por
 * serem raros.
 */
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import "./estante.css";

const marcador = "/icones/marcador-notas.svg";
const RECORTES = [
  { id: "tudo", rotulo: "Tudo", cabe: () => true },
  { id: "nota", rotulo: "Com nota", cabe: (l) => (l.notas ?? 0) > 0 },
  { id: "kindle", rotulo: "No Kindle", cabe: (l) => !!l.noKindle },
  { id: "quadrinho", rotulo: "Quadrinhos", cabe: (l) => !!l.quadrinho },
];

/* Onde a leitura está, em palavras que o produto pode sustentar.
 *
 * Não devolve porcentagem: o servidor não conhece o tamanho do texto. Devolve
 * `null` quando ninguém abriu o livro, e a linha simplesmente não mostra nada —
 * em vez de "0% lido", que afirma algo sobre uma leitura que não começou. */
function onde(l) {
  if (!l.capitulos) return null;
  if (l.capitulo + 1 >= l.capitulos) return "no último capítulo";
  return `capítulo ${l.capitulo + 1} de ${l.capitulos}`;
}

function Livro({ titulo, autor, notas, capa, aoEscolher, escolhido }) {
  return (
    <li className="livro">
      {/* O livro inteiro é o alvo do clique, e é um `button` de verdade: o
          teclado chega nele, o leitor de tela o anuncia como ação, e o Enter
          funciona. Um `div` com `onClick` pareceria igual e não seria. */}
      <button
        type="button"
        className={`livro-alvo${escolhido ? " escolhido" : ""}`}
        onClick={() => aoEscolher?.()}
        aria-pressed={escolhido ? "true" : "false"}
      >
        <span className="visualmente-oculto">{titulo}{autor ? `, de ${autor}` : ""}</span>
      </button>
      <div className="capa-caixa">
        {/* Livro sem capa não vira buraco: a caixa fica, com o título dentro.
            Uma grade com lacunas parece defeito de carregamento. */}
        {notas > 0 && (
          <span
            className="marcador"
            style={{ maskImage: `url(${marcador})`, WebkitMaskImage: `url(${marcador})` }}
          >
            <span className="marcador-numero dado">{notas}</span>
          </span>
        )}
        {capa ? (
          <img src={capa} alt={`Capa de ${titulo}`} className="capa" />
        ) : (
          <div className="capa capa-vazia" aria-hidden="true">
            <span>{titulo}</span>
          </div>
        )}
      </div>
      <div className="livro-texto">
        <h3>{titulo}</h3>
        <p>{autor}</p>
      </div>
    </li>
  );
}

export function Estante({ livros = [], selecionado, aoAbrir, aoEscolher, aoEnviar, aoImportar }) {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroImportar, setErroImportar] = useState(null);
  const arquivo = useRef(null);
  /* OS RECORTES FILTRAM AGORA.
   *
   * Eram quatro botões sem `onClick`, com "Tudo" marcado por `aria-pressed={i === 0}`
   * — um valor fixo, então nem a marcação mudava. Quatro alvos que respondiam ao
   * clique com nada, o que é lido como produto quebrado e não como recurso
   * ausente.
   *
   * A contagem ao lado de cada um vem da mesma lista que ele filtra: assim um
   * recorte vazio se anuncia antes de ser clicado, em vez de levar a uma estante
   * em branco sem explicação. */
  const [recorte, setRecorte] = useState("tudo");
  const regra = RECORTES.find((r) => r.id === recorte) ?? RECORTES[0];
  const mostrados = livros.filter(regra.cabe);
  return (
    <div className="mesa">
      <Cabecalho lugar="estante" />

      <section className="estante">
        <div className="estante-grade">
          {/* Recorte nomeado, nao eixo repetido. */}
          {aoImportar && (
            <div className="estante-importar">
              <Botao tom="secundaria" onClick={() => { setResultado(null); setErroImportar(null); setImportando(true); }}>
                Trazer notas do Kindle
              </Botao>
            </div>
          )}

          <nav className="recortes" aria-label="Recortes da estante">
            {RECORTES.map((r) => {
              const quantos = livros.filter(r.cabe).length;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={r.id === recorte ? "true" : "false"}
                  onClick={() => setRecorte(r.id)}
                  /* Um recorte sem nada dentro não é clicável: levar alguém a
                     uma estante vazia é fazê-lo procurar o erro num lugar onde
                     não há erro. */
                  disabled={quantos === 0 && r.id !== "tudo"}
                >
                  {r.rotulo} <span className="dado">{quantos}</span>
                </button>
              );
            })}
          </nav>

          {/* A ESTANTE VAZIA PRECISA FALAR. Uma conta recém-criada chega
              exatamente aqui, e uma tela em branco não distingue "você ainda não
              tem nada" de "alguma coisa quebrou" — e quem acabou de entrar pela
              primeira vez está inclinado a supor o segundo.

              O texto diz o que ela é e onde começa, e o único caminho oferecido
              é o que resolve: a Mesa. */}
          {livros.length === 0 ? (
            <div className="estante-vazia">
              <h2>Sua estante ainda está vazia</h2>
              <p>
                Ela guarda o que você preparou: os documentos convertidos, as
                notas que fez neles, e o que já foi para o Kindle.
              </p>
              <Link to="/" className="estante-comecar">Preparar um documento</Link>
            </div>
          ) : (
            <ul className="grade">
              {mostrados.map((l) => (
                <Livro
                  key={l.chave}
                  {...l}
                  escolhido={l.chave === selecionado?.chave}
                  aoEscolher={() => aoEscolher?.(l)}
                />
              ))}
            </ul>
          )}
        </div>

        <aside className="ficha" aria-label="Livro selecionado">
          <nav className="recortes vista" aria-label="Modo de vista">
            <button type="button" aria-pressed={true}>Capas</button>
            <button type="button" aria-pressed={false}>Estante em 3D</button>
          </nav>

          {selecionado && (
            <article className="ficha-caixa">
              <header>
                <h2>{selecionado.titulo}</h2>
                {/* CADA PEDAÇO SÓ APARECE SE EXISTIR.
                    A linha era `autor · formato · 80% lido`, com formato e
                    porcentagem vindos de um exemplo — iguais em todo livro. */}
                <p className="ficha-meta">
                  {[
                    selecionado.autor || null,
                    selecionado.formato || null,
                    onde(selecionado),
                  ].filter(Boolean).join(" · ")}
                </p>
              </header>

              {/* A BARRA MEDE CAPÍTULOS, e o rótulo diz isso.
                  Ela media uma porcentagem que ninguém calculava: o servidor não
                  conhece o tamanho do texto, porque o EPUB é lido no navegador.
                  Capítulo lido de capítulos totais é aproximado — capítulos têm
                  tamanhos diferentes — mas é DERIVADO, e o rótulo não promete
                  mais do que isso.

                  Sem ninguém ter aberto o livro, não há barra: uma barra vazia
                  diz "0% lido", que é diferente de "ainda não sei". */}
              {selecionado.capitulos > 0 && (
                <div
                  className="progresso"
                  role="progressbar"
                  aria-valuenow={selecionado.capitulo + 1}
                  aria-valuemin={1}
                  aria-valuemax={selecionado.capitulos}
                  aria-label={`${selecionado.titulo}: capítulo ${selecionado.capitulo + 1} de ${selecionado.capitulos}`}
                >
                  <div
                    className="progresso-feito"
                    style={{ inlineSize: `${((selecionado.capitulo + 1) / selecionado.capitulos) * 100}%` }}
                  />
                </div>
              )}

              <div className="ficha-notas">
                <h3>
                  <span className="dado">{selecionado.notas ?? 0}</span>{" "}
                  {selecionado.notas === 1 ? "nota" : "notas"}
                </h3>

                {/* A ÚLTIMA NOTA DE VERDADE, ou nada.
                    Aqui havia uma frase de enfeite entre aspas, apresentada como
                    citação do livro — em todo livro, a mesma. */}
                {selecionado.ultima_nota ? (
                  <blockquote style={{ background: DESTAQUES[selecionado.ultima_nota.cor] }}>
                    {selecionado.ultima_nota.trecho}
                  </blockquote>
                ) : (
                  <p className="ficha-nota">
                    Nada marcado ainda. Selecione um trecho durante a leitura para
                    guardar aqui.
                  </p>
                )}
              </div>

              <div className="ficha-acoes">
                {/* SEM ARQUIVO NÃO HÁ O QUE ABRIR, e o botão diz isso em vez de
                    ficar clicável e não fazer nada. Um botão que não responde é
                    lido como produto quebrado; um botão desabilitado com o
                    motivo ao lado é lido como estado. */}
                <Botao
                  tom="primaria"
                  onClick={() => aoAbrir?.(selecionado)}
                  disabled={!selecionado.leituraUrl}
                >
                  Continuar
                </Botao>
                <Botao tom="secundaria">Notas</Botao>
              </div>

              {/* ENVIAR AO KINDLE. É a promessa que dá nome ao produto, e até
                  30/08 nenhuma tela a cumpria — o contrato tinha a chamada e
                  ninguém a usava, então dava para converter e nunca mandar.

                  Já enviado NÃO vira botão desabilitado: reenviar é legítimo
                  (a pessoa apagou do aparelho, trocou de Kindle), e um botão
                  morto ao lado de "No Kindle" faria parecer que não dá. O que
                  muda é o rótulo, que passa a dizer o que o clique faz. */}
              {selecionado.leituraUrl && (
                <div className="ficha-kindle">
                  <Botao
                    tom="secundaria"
                    onClick={() => aoEnviar?.(selecionado)}
                    disabled={selecionado.envio === "enviando"}
                  >
                    {selecionado.envio === "enviando"
                      ? "Enviando…"
                      : selecionado.noKindle
                        ? "Enviar de novo ao Kindle"
                        : "Enviar ao Kindle"}
                  </Botao>
                  {selecionado.envio === "erro" && (
                    <p className="ficha-erro" role="alert">
                      {/* A mensagem do backend, e não "falhou": ela diz se foi
                          SMTP, remetente não autorizado na Amazon, ou tamanho —
                          e cada uma tem uma saída diferente. */}
                      {selecionado.envioErro}
                    </p>
                  )}
                  {selecionado.noKindle && selecionado.envio !== "erro" && (
                    <p className="ficha-nota">Já está no seu Kindle.</p>
                  )}
                </div>
              )}
              {!selecionado.leituraUrl && (
                <p className="ficha-aviso">
                  Ainda em preparo. O texto abre quando a conversão terminar.
                </p>
              )}
            </article>
          )}
        </aside>
      </section>

      <Folha
        aberta={importando}
        titulo="Trazer notas do Kindle"
        aoFechar={() => setImportando(false)}
        acoes={
          resultado ? (
            <Botao tom="primaria" onClick={() => setImportando(false)}>Pronto</Botao>
          ) : (
            <Botao tom="primaria" onClick={() => arquivo.current?.click()}>Escolher o arquivo</Botao>
          )
        }
      >
        {!resultado && (
          <>
            <p>
              Todo Kindle guarda um arquivo com tudo o que você marcou, em todos
              os livros. Ele se chama <strong>My Clippings.txt</strong> e fica na
              raiz do aparelho quando você o liga no computador por cabo.
            </p>
            {/* O QUE ACONTECE ANTES DE ACONTECER. Importar mexe na estante, e
                dizer o resultado depois deixa a pessoa descobrir sozinha se
                pode repetir — e ela vai querer repetir, porque o arquivo cresce. */}
            <p className="folha-nota">
              Trazer de novo mais tarde não duplica nada: o que já está aqui é
              reconhecido e ignorado. As notas de livros que também estão na sua
              estante ficam ligadas a eles; as de outros livros ficam guardadas
              com o nome do livro.
            </p>
            {erroImportar && <p className="folha-erro" role="alert">{erroImportar}</p>}
            <input
              ref={arquivo}
              type="file"
              accept=".txt,text/plain"
              className="campo-arquivo"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setErroImportar(null);
                try {
                  setResultado(await aoImportar(f));
                } catch (erro) {
                  setErroImportar(erro.message);
                }
              }}
            />
          </>
        )}

        {resultado && (
          <div className="importou">
            <p>
              <span className="dado">{resultado.novas}</span>{" "}
              {resultado.novas === 1 ? "nota nova" : "notas novas"}
              {resultado.repetidas > 0 && (
                <>
                  {" · "}
                  <span className="dado">{resultado.repetidas}</span> já estavam aqui
                </>
              )}
            </p>
            {resultado.livros?.length > 0 && (
              <ul className="importou-livros">
                {resultado.livros.map((l) => <li key={l}>{l}</li>)}
              </ul>
            )}
            {resultado.novas === 0 && resultado.repetidas > 0 && (
              <p className="folha-nota">
                Nada novo desta vez — todas as notas do arquivo já estavam na sua
                estante.
              </p>
            )}
          </div>
        )}
      </Folha>
    </div>
  );
}
