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
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { MesaVazia } from "./jornadas/MesaVazia.jsx";
import { MesaCheia } from "./jornadas/MesaCheia.jsx";
import { Estante } from "./jornadas/Estante.jsx";
import { Leitura } from "./jornadas/Leitura.jsx";
import { AindaNao } from "./jornadas/AindaNao.jsx";
import { Conta } from "./jornadas/Conta.jsx";
import { Entrar } from "./jornadas/Entrar.jsx";
import { ContaKindle } from "./jornadas/ContaKindle.jsx";
import { LUGARES } from "./lugares.js";
import { useJornada } from "./estado/useJornada.js";
import { usePessoa } from "./estado/usePessoa.js";
import { abrirLivro } from "./leitor/abrir.js";
import { chaveDe } from "../../contrato/api.js";
import { EXEMPLO_FILA, EXEMPLO_ESTANTE, EXEMPLO_FICHA, EXEMPLO_LEITURA } from "./exemplos.js";

/* O exemplo entra SÓ quando a URL pede — `?exemplo`. Nunca no caminho normal,
 * porque tela que inventa dado esconde backend fora do ar. */
/* Enquanto não há autenticação — a AUTH-001 está `proposed`, não aceita — a
 * pessoa é de exemplo. Fica nomeado para ninguém confundir com login. */
/* A pessoa VEM DO SERVIDOR agora. O que sobrou do exemplo é o nome, porque a
 * conta guarda um e-mail e nada mais — a DEC-0039 §1 não pede nome, e pedir um
 * dado que o produto não usa é coletar por hábito. */
function comoChamar(pessoa) {
  return pessoa ? { nome: pessoa.email.split("@")[0], email: pessoa.email } : null;
}

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
  const { livros, carregarEstante, enviar } = useJornada();
  const [aberto, setAberto] = useState(null);
  const navegar = useNavigate();
  useEffect(() => { carregarEstante(); }, [carregarEstante]);
  const lista = livros.length ? livros : usaExemplo() ? EXEMPLO_ESTANTE : [];

  /* A ficha mostra o livro ESCOLHIDO, e não um exemplo fixo. Antes ela exibia
   * sempre o mesmo registro escrito à mão, o que fazia a estante parecer
   * funcionar enquanto clicar em qualquer livro mostrava outro. */
  const selecionado = lista.find((l) => l.chave === aberto) ?? lista[0] ?? null;

  return (
    <Estante
      livros={lista}
      selecionado={selecionado ? { ...EXEMPLO_FICHA, ...selecionado } : null}
      aoEscolher={(l) => setAberto(l.chave)}
      aoEnviar={(l) => enviar(l.chave)}
      aoAbrir={(l) => {
        /* Sem arquivo convertido não há o que abrir. Navegar mesmo assim
         * levaria a um leitor em branco, e o leitor em branco não distingue
         * "ainda convertendo" de "quebrou". */
        if (!l?.leituraUrl) return;
        navegar(`/leitura/${l.chave}`, { state: { url: l.leituraUrl, titulo: l.titulo } });
      }}
    />
  );
}

function PaginaLeitura() {
  const { id } = useParams();
  const local = useLocation();
  const [livro, setLivro] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let vivo = true;
    /* O EPUB é lido NO NAVEGADOR, não servido como texto pelo backend. É o mesmo
     * arquivo que vai para o Kindle, então o que se lê na tela e o que se lê no
     * aparelho não podem divergir. */
    /* O ENDERECO, e nao o numero. `/storage/output/7/...` respondia para quem
     * contasse ate sete, e a DEC-0039 §5 trocou isso pela chave do trabalho.
     * O numero da rota continua sendo o da estante; a chave e buscada aqui. */
    /* A URL vem de quem mandou abrir — a estante já a recebeu pronta do
     * backend. O caminho antigo montava `/storage/output/{id}/livro.epub`, e
     * `livro.epub` era um chute: o arquivo real se chama `{slug}.epub`. */
    const url = local.state?.url ?? `/storage/output/${chaveDe(id) ?? id}/livro.epub`;
    abrirLivro(url)
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

/* Uma página que só existe para quem entrou.
 *
 * Enquanto NÃO SE SABE, não decide nada: mandar para /entrar durante a
 * verificação faria quem já está logado ser expulso a cada abertura de página,
 * e voltar sozinho um instante depois. */
function SoParaQuemEntrou({ acesso, children }) {
  if (acesso.carregando) return <main className="carregando" aria-busy="true" />;
  if (!acesso.pessoa) return <Navigate to="/entrar" replace />;
  return children;
}

export function App() {
  const acesso = usePessoa();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/" element={<Mesa />} />
        {/* A estante É a conta (DEC-0018). Sem entrar não há o que listar —
            e listar tudo seria mostrar a estante de todo mundo. */}
        <Route path="/estante" element={<SoParaQuemEntrou acesso={acesso}><PaginaEstante /></SoParaQuemEntrou>} />
        <Route path="/leitura/:id" element={<PaginaLeitura />} />
        {LUGARES.filter((l) => !l.pronto).map((l) => (
          <Route key={l.id} path={l.rota} element={<AindaNao lugar={l} />} />
        ))}
        {/* Conta tem quatro páginas; só Preferências existe. As outras usam a
            mesma tela de "ainda não", que nomeia o lugar em vez de dar 404. */}
        <Route path="/conta/preferencias" element={<SoParaQuemEntrou acesso={acesso}><Conta pessoa={comoChamar(acesso.pessoa)} aoSair={acesso.sair} /></SoParaQuemEntrou>} />
        <Route path="/conta" element={<SoParaQuemEntrou acesso={acesso}><ContaKindle pessoa={comoChamar(acesso.pessoa)} aparelhos={APARELHOS} aoSair={acesso.sair} /></SoParaQuemEntrou>} />
        <Route path="/conta/kindle" element={<SoParaQuemEntrou acesso={acesso}><ContaKindle pessoa={comoChamar(acesso.pessoa)} aparelhos={APARELHOS} aoSair={acesso.sair} /></SoParaQuemEntrou>} />
        <Route path="/conta/privacidade" element={<AindaNao lugar={{ rotulo: "Privacidade", oQueE: "O que fica guardado, onde, e por quanto tempo." }} />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}
