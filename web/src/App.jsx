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
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import { MesaVazia } from "./jornadas/MesaVazia.jsx";
import { MesaCheia } from "./jornadas/MesaCheia.jsx";
import { Estante } from "./jornadas/Estante.jsx";
import { Leitura } from "./jornadas/Leitura.jsx";
import { AindaNao } from "./jornadas/AindaNao.jsx";
import { Conta } from "./jornadas/Conta.jsx";
import { ContaKindle } from "./jornadas/ContaKindle.jsx";
import { LUGARES } from "./lugares.js";
import { useJornada } from "./estado/useJornada.js";
import { abrirLivro } from "./leitor/abrir.js";
import { EXEMPLO_FILA, EXEMPLO_ESTANTE, EXEMPLO_FICHA, EXEMPLO_LEITURA } from "./exemplos.js";

/* O exemplo entra SÓ quando a URL pede — `?exemplo`. Nunca no caminho normal,
 * porque tela que inventa dado esconde backend fora do ar. */
/* Enquanto não há autenticação — a AUTH-001 está `proposed`, não aceita — a
 * pessoa é de exemplo. Fica nomeado para ninguém confundir com login. */
const PESSOA = { nome: "Erik Abner", email: "erik@exemplo.com" };

/* Aparelhos de exemplo, com os nomes do desenho. Enquanto o backend não os
 * serve, eles ficam aqui e não dentro da tela. */
const APARELHOS = [
  { id: "paperwhite", nome: "Kindle de Erik", detalhe: "Paperwhite · 1236 × 1680",
    endereco: "erik@kindle.com", ultimoEnvio: "hoje, 09:12", principal: true },
  { id: "scribe", nome: "Scribe do escritório", detalhe: "erik_scribe@kindle.com",
    endereco: "erik_scribe@kindle.com", ultimoEnvio: "6 de agosto", principal: false },
];

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
  const [livro, setLivro] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let vivo = true;
    /* O EPUB é lido NO NAVEGADOR, não servido como texto pelo backend. É o mesmo
     * arquivo que vai para o Kindle, então o que se lê na tela e o que se lê no
     * aparelho não podem divergir. */
    abrirLivro(`/storage/output/${id}/livro.epub`)
      .then((l) => vivo && setLivro(l))
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [id]);

  /* Sem o livro, o exemplo — e o produto DIZ que é exemplo, em vez de deixar
   * parecer que aquele é o teu texto. */
  if (erro || !livro) {
    return <Leitura livro={EXEMPLO_LEITURA} aviso={erro ? `Este é um texto de exemplo. O livro não pôde ser aberto: ${erro}` : null} />;
  }
  return <Leitura livro={livro} />;
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
        {/* Conta tem quatro páginas; só Preferências existe. As outras usam a
            mesma tela de "ainda não", que nomeia o lugar em vez de dar 404. */}
        <Route path="/conta/preferencias" element={<Conta pessoa={PESSOA} />} />
        <Route path="/conta" element={<ContaKindle pessoa={PESSOA} aparelhos={APARELHOS} />} />
        <Route path="/conta/kindle" element={<ContaKindle pessoa={PESSOA} aparelhos={APARELHOS} />} />
        <Route path="/conta/privacidade" element={<AindaNao lugar={{ rotulo: "Privacidade", oQueE: "O que fica guardado, onde, e por quanto tempo." }} />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}
