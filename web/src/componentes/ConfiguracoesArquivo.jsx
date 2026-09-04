/* Configurações de arquivo — nó 941:23118.
 *
 * Cinco linhas, cada uma com o que faz escrito embaixo do nome, e o botão da
 * ação à direita. O desenho é literal e o texto dele é o texto daqui: quem
 * escreveu "Nada é enviado de novo" estava dizendo que refazer não custa banda,
 * e trocar isso por "Reprocessar" perderia a informação.
 *
 * O QUADRADO À ESQUERDA DE CADA LINHA está VAZIO no Figma — é um vão de ícone
 * de 40px com borda e nada dentro. Ele fica vazio aqui também, e o motivo está
 * em DESVIOS.md: os ícones do Solar 480 passam pelo efeito handmade do Figma,
 * e desenhar cinco à mão produziria ícones que não são do sistema. Vão de ícone
 * é `aria-hidden`: não anuncia nada porque não diz nada.
 *
 * "REMOVER DA ESTANTE" PEDE CONFIRMAÇÃO, e o desenho não a mostra. A razão está
 * no próprio desenho: "Não dá para desfazer". Uma ação irreversível a um clique
 * de distância é a única coisa nesta folha que pode custar caro, e a
 * confirmação diz também o que o botão não diz — que as notas do livro saem
 * junto.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folha } from "./Folha.jsx";
import { Botao } from "./Botao.jsx";
import { Icone } from "./Icone.jsx";
import { refazerPreparo, removerDaEstante, renomearArquivo } from "../../../contrato/api.js";
import "./configuracoes-arquivo.css";

/* Os ícones do Solar 480, com o efeito handmade do Figma. Eles não estavam
 * DENTRO do 941:23118 — os cinco vãos de 40px estão vazios lá —, mas estão no
 * mesmo arquivo, no conjunto que o resto do produto já usa. Desenhá-los à mão
 * produziria ícones que não passaram pelo efeito e não seriam do sistema;
 * pegá-los do conjunto é o que o Erik pediu: "vc já tem o DS e o grupo de
 * ícones usado é o solar - 480". */
const ICONES = {
  renomear: "/icones/icone-renomear.svg",
  paginas: "/icones/icone-paginas.svg",
  baixar: "/icones/icone-baixar.svg",
  refazer: "/icones/icone-refazer.svg",
  remover: "/icones/icone-remover.svg",
};

function Linha({ icone, titulo, sobre, acao, children }) {
  return (
    <div className="arquivo-linha">
      <div className="arquivo-linha-corpo">
        <span className="arquivo-linha-vao">
          <Icone src={icone} />
        </span>
        <div className="arquivo-linha-texto">
          <p className="arquivo-linha-titulo">{titulo}</p>
          <p className="arquivo-linha-sobre">{sobre}</p>
          {children}
        </div>
      </div>
      <div className="arquivo-linha-acao">{acao}</div>
    </div>
  );
}

export function ConfiguracoesArquivo({ aberta, aoFechar, livro, notas = 0, aoMudar }) {
  const navegar = useNavigate();
  const [renomeando, setRenomeando] = useState(false);
  const [nome, setNome] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const [erro, setErro] = useState(null);

  if (!livro) return null;

  const id = livro.upload_id ?? livro.id;
  const paginas = livro.page_count;

  /* O PREPARADO SIM, O ORIGINAL NÃO — e é por isso que a frase desta linha não
   * é a do desenho.
   *
   * O desenho promete "O EPUB preparado, ou o PDF original do jeito que
   * chegou". O segundo não existe hoje: `files.py` fecha `/storage/{rest}` com
   * 404 de propósito, e `input/` está do lado de dentro dessa porta. Abrir uma
   * rota para servir o arquivo enviado é decisão de segurança, não detalhe de
   * tela — está anotada em ABERTO.md para o Erik decidir.
   *
   * Enquanto isso a linha diz o que ela faz. Prometer o original e entregar 404
   * seria pior que não prometer. */
  const baixavel = livro.epub_url || null;

  const tentar = async (qual, feito) => {
    setOcupado(qual);
    setErro(null);
    try { await feito(); }
    catch (e) { setErro(e.message); }
    finally { setOcupado(null); }
  };

  return (
    <Folha ampla aberta={aberta} titulo="Configurações de arquivo" aoFechar={aoFechar}>
      {erro && <p className="arquivo-erro" role="alert">{erro}</p>}

      <div className="arquivo-linhas">
        <Linha
          icone={ICONES.renomear}
          titulo="Renomear"
          sobre="Muda só o nome do arquivo final. O original guarda o nome que tinha."
          acao={
            !renomeando ? (
              <Botao tom="secundaria" onClick={() => { setNome(livro.final_filename || ""); setRenomeando(true); }}>
                Renomear
              </Botao>
            ) : (
              <Botao
                tom="secundaria"
                disabled={ocupado === "nome" || !nome.trim()}
                onClick={() => tentar("nome", async () => {
                  await renomearArquivo(id, nome.trim());
                  setRenomeando(false);
                  aoMudar?.();
                })}
              >
                {ocupado === "nome" ? "Gravando…" : "Guardar"}
              </Botao>
            )
          }
        >
          {renomeando && (
            <input
              type="text"
              className="arquivo-campo"
              aria-label="Nome do arquivo final"
              value={nome}
              autoFocus
              onChange={(e) => setNome(e.target.value)}
            />
          )}
        </Linha>

        {/* O NÚMERO É O DO ARQUIVO, e some quando o servidor não o sabe. O
            desenho escreve "Ver todas as 96 páginas"; escrever "as 0 páginas"
            quando `page_count` é nulo seria a tela afirmando uma contagem que
            ninguém fez. */}
        <Linha
          icone={ICONES.paginas}
          titulo={paginas ? `Ver todas as ${paginas} páginas` : "Ver todas as páginas"}
          sobre="Conferir o reconhecimento, escolher capa, deixar página de fora."
          acao={
            <Botao tom="secundaria" onClick={() => { aoFechar?.(); navegar(`/preparo/${id}`); }}>
              Abrir
            </Botao>
          }
        />

        <Linha
          icone={ICONES.baixar}
          titulo="Baixar"
          sobre={
            baixavel
              ? "O EPUB preparado, do jeito que vai para o aparelho."
              : "Ainda não há EPUB para baixar: a preparação não terminou."
          }
          acao={
            baixavel ? (
              <a className="botao secundaria" href={baixavel} download>Baixar</a>
            ) : (
              <Botao tom="secundaria" disabled>Baixar</Botao>
            )
          }
        />

        <Linha
          icone={ICONES.refazer}
          titulo="Refazer a preparação"
          sobre="Volta ao começo com o mesmo arquivo. Nada é enviado de novo."
          acao={
            <Botao
              tom="secundaria"
              disabled={ocupado === "refazer"}
              onClick={() => tentar("refazer", async () => {
                const novo = await refazerPreparo(id);
                aoFechar?.();
                navegar(`/preparo/${novo.id}`);
              })}
            >
              {ocupado === "refazer" ? "Refazendo…" : "Refazer"}
            </Botao>
          }
        />

        <Linha
          icone={ICONES.remover}
          titulo="Remover da estante"
          sobre="O arquivo preparado e o original saem. Não dá para desfazer."
          acao={
            !confirmando ? (
              <Botao tom="secundaria" onClick={() => setConfirmando(true)}>Remover</Botao>
            ) : (
              <Botao
                tom="perigo"
                disabled={ocupado === "remover"}
                onClick={() => tentar("remover", async () => {
                  await removerDaEstante(id);
                  aoFechar?.();
                  navegar("/estante");
                })}
              >
                {ocupado === "remover" ? "Removendo…" : "Remover mesmo"}
              </Botao>
            )
          }
        >
          {confirmando && (
            <p className="arquivo-confirma">
              {/* AS NOTAS FICAM, e este aviso dizia o contrário — ele contava
                  quantas iam sumir. A `DEC-0021 §15` manda que elas sobrevivam,
                  com a origem marcada como removida, e desde 03/09 é o que
                  acontece. O aviso passou a dizer o que de fato some. */}
              {notas
                ? `${notas} ${notas === 1 ? "nota deste livro fica" : "notas deste livro ficam"}, com a origem marcada como removida. O arquivo, não: não dá para desfazer.`
                : "Não dá para desfazer."}{" "}
              <button type="button" className="arquivo-desistir" onClick={() => setConfirmando(false)}>
                Deixar na estante
              </button>
            </p>
          )}
        </Linha>
      </div>
    </Folha>
  );
}
