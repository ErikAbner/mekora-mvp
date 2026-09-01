/* A área que recebe o arquivo, usada em duas telas.
 *
 * Ela nasceu dentro da `MesaVazia` e saiu daqui quando a `Apresentação` passou a
 * precisar da mesma coisa — duas vezes, inclusive, porque o desenho repete a
 * área no topo e no fim da página. Copiar valeria sessenta linhas em três
 * lugares, e a lista de formatos é justamente o que não pode divergir: ela vem
 * do servidor, e cada cópia é uma chance de uma delas parar de buscar.
 *
 * O componente não sabe o que fazer com o arquivo. Quem chama decide.
 */
import { useRef, useState } from "react";
import { Botao } from "./Botao.jsx";
import { Formatos } from "./Formatos.jsx";
import "./soltar.css";

const ilustracaoSoltar = "/icones/ilustracao-soltar-arquivo.svg";
const iconeEnviar = "/icones/icone-enviar.svg";

export function Soltar({ aoReceberArquivos, backend, id }) {
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
    /* Arrastar É a instrução principal da tela, então a área toda recebe o
       arquivo — não só o botão. */
    <div
      id={id}
      className={`soltar${sobre ? " sobre" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
      onDragLeave={() => setSobre(false)}
      onDrop={soltar}
    >
      <img src={ilustracaoSoltar} alt="" className="ilustracao-soltar" aria-hidden="true" />
      <h2>Arraste arquivos ou clique para selecionar</h2>

      <Formatos />

      <input
        ref={campo}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && aoReceberArquivos?.(e.target.files)}
      />
      <Botao tom="primaria" icone={iconeEnviar} onClick={() => campo.current?.click()}>
        Selecionar arquivos
      </Botao>

      <p className="sem-conta">
        {/* O produto diz o que não sabe. Uma área de soltar que não funciona
            porque o servidor caiu é pior que uma que avisa. */}
        {backend === "fora do ar"
          ? "O conversor não está respondendo. Os arquivos não seriam preparados agora."
          : "Não é preciso criar conta para converter."}
      </p>
    </div>
  );
}
