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

export function MesaVazia({ aoEscolherArquivos }) {
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
        <div className="soltar">
          <img src={ilustracaoSoltar} alt="" className="ilustracao-soltar" aria-hidden="true" />
          <h2>Arraste arquivos ou clique para selecionar</h2>

          <ul className="formatos">
            {FORMATOS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          <button type="button" className="primaria" onClick={aoEscolherArquivos}>
            <Icone src={iconeEnviar} />
            <span>Selecionar arquivos</span>
          </button>

          <p className="sem-conta">Não é preciso criar conta para converter.</p>
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
