/* TRAZER NOTAS DO KINDLE.
 *
 * Ela vivia na ESTANTE, num botão que eu pus lá por conta própria — o nó
 * 895:7315 tem os recortes e a grade, e mais nada. O Erik apontou, e o botão
 * saiu de lá.
 *
 * A feature continua existindo, e agora mora onde as notas moram: em `/notas`.
 * Tirar do desenho o que ele não tem é a regra; apagar uma feature que funciona
 * não é.
 */
import { useRef, useState } from "react";
import { Botao } from "./Botao.jsx";
import { Folha } from "./Folha.jsx";

export function TrazerDoKindle({ aoTrazer }) {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroImportar, setErroImportar] = useState(null);
  const arquivo = useRef(null);

  if (!aoTrazer) return null;

  return (
    <>
      <Botao
        tom="secundaria"
        onClick={() => { setResultado(null); setErroImportar(null); setImportando(true); }}
      >
        Trazer notas do Kindle
      </Botao>

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
            setResultado(await aoTrazer(f));
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
    </>
  );
}
