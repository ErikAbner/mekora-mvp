/* Mesa — vazia. A entrada da jornada: soltar um arquivo.
 *
 * Vem do nó 895:10286 do Figma. O que mudou em relação ao desenho, e por quê,
 * está em DESVIOS.md ao lado deste arquivo: nada foi "melhorado" em silêncio.
 *
 * A tela diz o que NÃO está acontecendo — "A mesa está limpa. Nada esperando por
 * você, nada em preparo" — em vez de mostrar uma área vazia e deixar o usuário
 * decidir se aquilo é estado ou defeito. É a regra do produto dizer o que não
 * sabe, aplicada ao que ele sabe que não tem.
 */
import { useRef, useState } from "react";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
// Assets do Figma, servidos de `publico/`. Caminho e nao import: o import ES
// so vale para asset dentro de src/, que o Vite processa e versiona.
const ilustracaoSoltar = "/icones/ilustracao-soltar-arquivo.svg";
const ilustracaoLimpa = "/icones/ilustracao-mesa-limpa.svg";
const iconeEnviar = "/icones/icone-enviar.svg";
const marca = "/icones/marca-mekora.svg";

import { Icone } from "../componentes/Icone.jsx";

import "./mesa-vazia.css";

const FORMATOS = [".pdf", ".epub", ".docx", ".cbz", ".cbr", ".zip"];

export function MesaVazia({ aoReceberArquivos, backend }) {
  /* O input fica escondido e o botão o aciona: input de arquivo nativo não se
   * estiliza, e recriar um por fora quebraria teclado e leitor de tela. */
  const campo = useRef(null);
  const [sobre, setSobre] = useState(false);

  const soltar = (e) => {
    e.preventDefault();
    setSobre(false);
    if (e.dataTransfer?.files?.length) aoReceberArquivos?.(e.dataTransfer.files);
  };

  return (
    <div className="mesa">
      <Cabecalho lugar="mesa" />

      <section className="promessa">
        <h1>
          Uma estante para aquilo
          <br />
          que ainda está em movimento.
        </h1>
      </section>

      <section className="entrada">
        {/* Arrastar É a instrução principal da tela, então a área toda recebe o
            arquivo — não só o botão. */}
        <div
          className={`soltar${sobre ? " sobre" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
          onDragLeave={() => setSobre(false)}
          onDrop={soltar}
        >
          <img src={ilustracaoSoltar} alt="" className="ilustracao-soltar" aria-hidden="true" />
          <h2>Arraste arquivos ou clique para selecionar</h2>

          <ul className="formatos">
            {FORMATOS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          <input
            ref={campo}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files?.length && aoReceberArquivos?.(e.target.files)}
          />
          <button type="button" className="primaria" onClick={() => campo.current?.click()}>
            <Icone src={iconeEnviar} />
            <span>Selecionar arquivos</span>
          </button>

          <p className="sem-conta">
            {/* O produto diz o que não sabe. Uma área de soltar que não funciona
                porque o servidor caiu é pior que uma que avisa. */}
            {backend === "fora do ar"
              ? "O conversor não está respondendo. Os arquivos não seriam preparados agora."
              : "Não é preciso criar conta para converter."}
          </p>
        </div>
      </section>

      {/* O estado vazio explicado, e não uma area em branco. */}
      <section className="vazio">
        <img src={ilustracaoLimpa} alt="" className="ilustracao-limpa" aria-hidden="true" />
        <div className="vazio-texto">
          <h2>A mesa está limpa.</h2>
          <p>
            Nada esperando por você, nada em preparo. Quando um arquivo chegar, ele aparece
            aqui e continua aparecendo até virar livro na estante.
          </p>
        </div>
      </section>

      <footer className="rodape">
        <img src={marca} alt="Mekora" className="marca" />
      </footer>
    </div>
  );
}
