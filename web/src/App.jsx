/* As rotas do Mekora.
 *
 * Antes disto o passo era estado local e o cabeçalho era decoração: os quatro
 * botões não levavam a lugar nenhum. Agora cada lugar tem endereço, o voltar do
 * navegador funciona, e um link pode ser guardado.
 *
 * `react-router` e não um roteador meu, e a razão é o dia 05/09: roteador
 * caseiro tem quarenta linhas e nenhuma documentação fora deste repositório.
 * Depois que o agente sair, ferramenta conhecida vale mais que ferramenta
 * enxuta — resposta para `react-router` existe em qualquer lugar.
 */
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import { MesaVazia } from "./jornadas/MesaVazia.jsx";
import { MesaCheia } from "./jornadas/MesaCheia.jsx";
import { Estante } from "./jornadas/Estante.jsx";
import { Leitura } from "./jornadas/Leitura.jsx";
import { AindaNao } from "./jornadas/AindaNao.jsx";
import { LUGARES } from "./lugares.js";
import { useJornada } from "./estado/useJornada.js";
import { EXEMPLO_FILA, EXEMPLO_ESTANTE, EXEMPLO_FICHA, EXEMPLO_LEITURA } from "./exemplos.js";

/* O exemplo entra SÓ quando a URL pede — `?exemplo`. Nunca no caminho normal,
 * porque tela que inventa dado esconde backend fora do ar. */
function usaExemplo() {
  return new URLSearchParams(location.search).has("exemplo");
}

function Mesa() {
  const { arquivos, backend, receber } = useJornada();
  const navegar = useNavigate();
  const lista = arquivos.length ? arquivos : usaExemplo() ? EXEMPLO_FILA : [];

  if (!lista.length) return <MesaVazia aoReceberArquivos={receber} backend={backend} />;
  return <MesaCheia arquivos={lista} aoVerEstante={() => navegar("/estante")} />;
}

function PaginaEstante() {
  const { livros, carregarEstante } = useJornada();
  const navegar = useNavigate();
  useEffect(() => { carregarEstante(); }, [carregarEstante]);
  const lista = livros.length ? livros : usaExemplo() ? EXEMPLO_ESTANTE : [];
  return (
    <Estante
      livros={lista}
      selecionado={lista.length ? EXEMPLO_FICHA : null}
      aoAbrir={(l) => navegar(`/leitura/${l?.chave ?? 1}`)}
    />
  );
}

function PaginaLeitura() {
  const { id } = useParams();
  /* O conteúdo do livro ainda não vem do backend: a rota já carrega o id para
   * que, quando vier, seja só trocar a fonte — e não a navegação. */
  return <Leitura livro={{ ...EXEMPLO_LEITURA, id }} />;
}

/* Rota que não existe não é erro do usuário: é o produto ainda não ter chegado
 * ali. Cai no lugar mais próximo, e diz. */
function NaoEncontrada() {
  const { pathname } = useLocation();
  return (
    <AindaNao
      lugar={{
        rotulo: "Este endereço não existe",
        oQueE: `Nada responde em ${pathname}.`,
      }}
    />
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mesa />} />
        <Route path="/estante" element={<PaginaEstante />} />
        <Route path="/leitura/:id" element={<PaginaLeitura />} />
        {LUGARES.filter((l) => !l.pronto).map((l) => (
          <Route key={l.id} path={l.rota} element={<AindaNao lugar={l} />} />
        ))}
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}
