import { Link } from "react-router-dom";
import { gruposDeLugares } from "../menu.js";

const marca = "/icones/marca-mekora.svg";
import "./rodape.css";

/* O rodapé, com a marca em corpo grande.
 *
 * OS LINKS SÃO OS LUGARES QUE EXISTEM. O desenho traz quatro colunas de "Link
 * link link" — um marcador de posição, porque o rodapé do site ainda não foi
 * decidido. Reproduzir o marcador daria quatro colunas de âncoras que não vão a
 * lugar nenhum, e um link morto é pior que um link a menos.
 *
 * Então ele lista o que o produto tem, e nada além. Quando houver rodapé de
 * site — sobre, contato, o que for —, ele entra aqui.
 */
export function Rodape() {
  return (
    <footer className="rodape">
      {/* AS COLUNAS SAEM DE `menu.js`, e não daqui.
       *
       * A mesma lista passou a ser usada pelo hambúrguer do telefone (nó
       * 964:24606), e duas cópias é como o menu passa a oferecer um lugar que o
       * rodapé não tem — ou como um link morto sobrevive num dos dois. Foi
       * exatamente o que aconteceu com "Dispositivos Kindle", que apontava para
       * `/conta` desde antes de a tela de aparelhos existir. */}
      <div className="rodape-colunas">
        {gruposDeLugares().map((g) => (
          <nav key={g.titulo} aria-label={g.titulo}>
            <h2>{g.titulo}</h2>
            <ul>
              {g.itens.map((i) => (
                <li key={i.rota}><Link to={i.rota}>{i.rotulo}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* A MARCA É O ATIVO SVG, e não texto grande.
          Ela já existia no rodapé da Mesa vazia, e eu criei um segundo rodapé
          sem olhar — com a mesma classe, o que fez meu CSS pintar o antigo. Um
          rodapé só, e a marca vem do arquivo de marca.

          `aria-hidden` porque é ornamento: o nome do produto já está no título
          da página, e um leitor de tela anunciando "Mekora" no fim de cada tela
          é ruído. */}
      <img src={marca} alt="" className="rodape-marca" aria-hidden="true" />
    </footer>
  );
}
