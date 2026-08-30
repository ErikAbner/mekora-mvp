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
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import "./estante.css";

const marcador = "/icones/marcador-notas.svg";
const RECORTES = ["Tudo", "Com nota", "No Kindle", "Quadrinhos"];

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

export function Estante({ livros = [], selecionado, aoAbrir, aoEscolher, aoEnviar }) {
  return (
    <div className="mesa">
      <Cabecalho lugar="estante" />

      <section className="estante">
        <div className="estante-grade">
          {/* Recorte nomeado, nao eixo repetido. */}
          <nav className="recortes" aria-label="Recortes da estante">
            {RECORTES.map((r, i) => (
              <button key={r} type="button" aria-pressed={i === 0}>
                {r}
              </button>
            ))}
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
              {livros.map((l) => (
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
                <p className="ficha-meta">
                  {selecionado.autor} · {selecionado.formato} ·{" "}
                  <span className="dado">{selecionado.lido}%</span> lido
                </p>
              </header>

              {/* O progresso e derivado da leitura, nunca um campo mantido. */}
              <div
                className="progresso"
                role="progressbar"
                aria-valuenow={selecionado.lido}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${selecionado.titulo}: ${selecionado.lido}% lido`}
              >
                <div className="progresso-feito" style={{ inlineSize: `${selecionado.lido}%` }} />
              </div>

              <div className="ficha-notas">
                <h3>
                  <span className="dado">{selecionado.notas}</span> notas
                </h3>
                {/* O filete marca a citacao; o chao marca o conteudo. */}
                <blockquote>{selecionado.amostra}</blockquote>
                <p className="etiquetas">
                  {selecionado.etiquetas.map((e) => (
                    <span key={e} className="etiqueta">{e}</span>
                  ))}
                </p>
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
    </div>
  );
}
