/* Um estudo sozinho, com o espaço todo.
 *
 * A LISTA JÁ MOSTRAVA O ESTUDO INTEIRO — pergunta, notas, trechos, ações —, e
 * era isso o problema: três estudos de vinte notas cada viram uma página de
 * rolagem infinita onde nenhum deles se lê. A pergunta que o estudo faz some no
 * meio das notas dos outros.
 *
 * REUSA O MESMO COMPONENTE `Estudo` da lista, e não uma cópia. Duas cópias
 * divergem: uma ação acrescentada num lugar aparece só nele, até alguém notar
 * meses depois. O que muda é o entorno, e não o estudo.
 *
 * A ROTA É `/estudo/:id`, no SINGULAR. `/estudos/:id` cairia abaixo de
 * `/estudos`, que é caminho do backend, e a borda manda tudo abaixo dele para a
 * API — a tela viria em branco em produção e funcionaria em desenvolvimento.
 * `scripts/rotas.py` pegou isso antes, e é o mesmo caso que `/notas` teve.
 *
 * Construída sem o desenho: o `figma-local` exige o Dev Mode ligado, e a aba
 * estava em modo design. Está em DESVIOS.md, para o pente fino.
 */
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import { Estudo } from "./Estudos.jsx";
import "./estudo-pagina.css";

export function EstudoPagina({ estudo, notas = [], erro, aoMudar, aoApagar, aoReunir, aoTirar, carregando }) {
  return (
    <div className="mesa">
      <Cabecalho lugar="estudos" />

      <main className="estudo-pagina">
        <Link to="/estudos" className="estudo-pagina-volta">← Estudos</Link>

        {erro && <p className="estudos-erro" role="alert">{erro}</p>}

        {/* TRÊS ESTADOS, e não dois. "Buscando" e "não existe" são coisas
            diferentes, e mostrar "não existe" enquanto ainda se busca é a
            maneira mais rápida de a pessoa ir embora de uma página que ia
            carregar. */}
        {!estudo && carregando && (
          <p className="estudo-pagina-nota" role="status">Buscando o estudo…</p>
        )}

        {!estudo && !carregando && !erro && (
          <div className="estudo-pagina-nao">
            <h1>Este estudo não existe.</h1>
            <p>
              Ou ele foi apagado, ou o endereço está errado. Os seus estudos
              estão na lista.
            </p>
            <Link to="/estudos">Ver meus estudos</Link>
          </div>
        )}

        {estudo && (
          <Estudo
            estudo={estudo}
            notasDisponiveis={notas}
            aoMudar={aoMudar}
            aoApagar={aoApagar}
            aoReunir={aoReunir}
            aoTirar={aoTirar}
            semLink
          />
        )}
      </main>

      <Rodape />
    </div>
  );
}
