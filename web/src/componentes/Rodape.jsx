import { Link } from "react-router-dom";
import { LUGARES } from "../lugares.js";

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
      <div className="rodape-colunas">
        <nav aria-label="Lugares">
          <h2>No Mekora</h2>
          <ul>
            {LUGARES.filter((l) => l.pronto).map((l) => (
              <li key={l.id}><Link to={l.rota}>{l.rotulo}</Link></li>
            ))}
            <li><Link to="/notas">Notas</Link></li>
          </ul>
        </nav>

        {/* Ajuda e Atualizacoes sao publicas, entao ficam fora da coluna da
            conta: quem nao entrou tambem precisa delas. */}
        <nav aria-label="O produto">
          <h2>O produto</h2>
          <ul>
            <li><Link to="/apresentacao">O que é o Mekora</Link></li>
            <li><Link to="/ajuda">Ajuda</Link></li>
            <li><Link to="/atualizacoes">Atualizações</Link></li>
            {/* O documento fica no rodape, que e onde se procura por ele. */}
            <li><Link to="/politica-de-privacidade">Política de privacidade</Link></li>
            <li><Link to="/termos-de-uso">Termos de uso</Link></li>
          </ul>
        </nav>

        <nav aria-label="Sua conta">
          <h2>Sua conta</h2>
          <ul>
            <li><Link to="/conta">Dispositivos Kindle</Link></li>
            <li><Link to="/conta/preferencias">Preferências</Link></li>
            <li><Link to="/conta/privacidade">Privacidade</Link></li>
          </ul>
        </nav>
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
