/* A tela de um lugar que ainda não existe.
 *
 * Ela existe porque a alternativa é pior: um botão no menu que não responde
 * ensina o usuário a não clicar, e uma tela em branco parece defeito.
 *
 * O produto diz o que não sabe. Aqui ele diz o que ainda não faz, com o nome do
 * lugar e o que ele vai ser — e não com "em breve", que não informa nada e não
 * pode ser desmentido.
 */
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import "./ainda-nao.css";

export function AindaNao({ lugar }) {
  return (
    <div className="mesa">
      <Cabecalho />
      <section className="ainda-nao">
        <div className="ainda-nao-texto">
          <h1>{lugar.rotulo}</h1>
          <p className="promessa-curta">{lugar.oQueE}</p>
          {/* O filete marca a fala do produto sobre si mesmo. */}
          <p className="aviso">
            Este lugar está desenhado e ainda não foi construído. Nada do que você
            já preparou depende dele.
          </p>
        </div>
      </section>
    </div>
  );
}
