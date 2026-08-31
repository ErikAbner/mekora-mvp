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
import { abrirLivro, irParaCapitulo } from "./leitor/abrir.js";
import { gravarProgresso, lerProgresso } from "../../contrato/api.js";
import { usarNotas } from "./leitor/usarNotas.js";
import { analisar, chaveDe, importarClippings } from "../../contrato/api.js";
import { EXEMPLO_FILA, EXEMPLO_ESTANTE, EXEMPLO_LEITURA } from "./exemplos.js";

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

function usaExemplo() {
  return new URLSearchParams(location.search).has("exemplo");
}

function Mesa() {
  const { arquivos, backend, receber } = useJornada();
  const navegar = useNavigate();
  const lista = arquivos.length ? arquivos : usaExemplo() ? EXEMPLO_FILA : [];

  if (!lista.length) return <MesaVazia aoReceberArquivos={receber} backend={backend} />;
  return <MesaCheia arquivos={lista} aoVerEstante={() => navegar("/estante")} aoReceberArquivos={receber} />;
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
      /* O LIVRO INTEIRO, e nada por cima dele.
       *
       * Era `{ ...EXEMPLO_FICHA, ...selecionado }`: o livro real sobrescrevia
       * título e autor, e o resto do exemplo SOBREVIVIA — porcentagem lida,
       * contagem de notas, uma citação e a etiqueta "#Design" —, porque não
       * havia campo real para substituí-lo. Todo livro da estante mostrava 80%
       * lido e a mesma frase entre aspas.
       *
       * Agora o servidor manda esses campos, e o que ele não sabe vem nulo: a
       * tela cala em vez de completar. */
      selecionado={selecionado}
      aoEscolher={(l) => setAberto(l.chave)}
      aoEnviar={(l) => enviar(l.chave)}
      aoImportar={async (f) => {
        const r = await importarClippings(f);
        /* Recarrega a estante: as notas importadas mudam a contagem da ficha e
         * o recorte "Com nota", e deixar isso para a próxima visita faria a
         * pessoa duvidar de que a importação funcionou. */
        await carregarEstante();
        return r;
      }}
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

  const [progresso, setProgresso] = useState(null);
  const { notas, erro: erroDeNota, marcar, comentar, trocarCor, remover } = usarNotas(id);

  useEffect(() => {
    let vivo = true;
    /* O EPUB é lido NO NAVEGADOR, não servido como texto pelo backend. É o mesmo
     * arquivo que vai para o Kindle, então o que se lê na tela e o que se lê no
     * aparelho não podem divergir. */
    /* O ENDERECO, e nao o numero. `/storage/output/7/...` respondia para quem
     * contasse ate sete, e a DEC-0039 §5 trocou isso pela chave do trabalho.
     * O numero da rota continua sendo o da estante; a chave e buscada aqui. */
    /* O ENDEREÇO DO ARQUIVO PRECISA SOBREVIVER A UM F5.
     *
     * A estante passa a URL pelo estado do roteador, o que é rápido e some ao
     * recarregar — e recarregar no meio de uma leitura é comum. Sem estado, o
     * caminho antigo montava `/storage/output/{id}/livro.epub`, com
     * `livro.epub` sendo um chute; o arquivo real se chama `{slug}.epub`.
     * Resultado: apertar F5 lendo um livro devolvia o TEXTO DE EXEMPLO.
     *
     * Então o estado do roteador vira atalho, e não fonte: quando ele não
     * existe, o endereço é perguntado ao backend, que é quem sabe. */
    const acharUrl = async () =>
      local.state?.url ?? (await analisar(id))?.leitura_url;

    /* A MARCA É LIDA ANTES DE ABRIR O LIVRO, e não em paralelo.
     *
     * O capítulo salvo decide QUAL capítulo carregar. Buscar os dois ao mesmo
     * tempo faria o livro abrir no primeiro e depois pular para o salvo — e
     * pior: o primeiro capítulo teria sido baixado e descartado à toa.
     *
     * O `catch` devolve o começo em vez de propagar. Não conseguir ler a marca
     * é motivo para começar do início, e não para deixar de abrir o livro. */
    lerProgresso(id)
      .catch(() => ({ capitulo: 0, deslocamento: 0, guardado: false }))
      .then(async (marca) => {
        if (!vivo) return;
        setProgresso(marca);
        const url = await acharUrl();
        if (!url) throw new Error("este livro ainda não tem texto para ler");
        const l = await abrirLivro(url, { capitulo: marca?.capitulo ?? 0 });
        if (!vivo) return;
        setLivro(l);
        /* Quantos capítulos o livro tem só se descobre ABRINDO: a espinha do
         * EPUB é lida aqui, no navegador. Sem gravar isso, a estante não teria
         * como dizer onde a leitura está — e a alternativa era a porcentagem
         * inventada que a ficha vinha mostrando. */
        gravarProgresso(id, {
          capitulo: l.capitulo,
          deslocamento: marca?.deslocamento ?? 0,
          capitulos: l.capitulos,
        }).catch(() => {});
      })
      .catch((e) => vivo && setErro(e.message));

    return () => { vivo = false; };
  }, [id]);

  /* Sem o livro, o exemplo — e o produto DIZ que é exemplo, em vez de deixar
   * parecer que aquele é o teu texto. */
  if (erro || !livro) {
    return <Leitura livro={EXEMPLO_LEITURA} aviso={erro ? `Este é um texto de exemplo. O livro não pôde ser aberto: ${erro}` : null} />;
  }

  return (
    <Leitura
      livro={livro}
      progresso={progresso}
      notas={notas}
      erroDeNota={erroDeNota}
      /* O capítulo vem daqui, e não da seleção: quem marca um trecho está no
       * capítulo aberto, e pedir isso à tela seria pedir que ela repita algo que
       * já se sabe — e que pode discordar. */
      aoAnotar={(t) => marcar({ ...t, capitulo: livro.capitulo ?? 0 })}
      aoComentar={comentar}
      aoTrocarCor={trocarCor}
      aoApagarNota={remover}
      aoTrocarCapitulo={async (i) => {
        const novo = await irParaCapitulo(livro, i);
        setLivro(novo);
        /* Virar o capítulo é ler o começo dele. Gravar aqui, e não esperar a
         * rolagem, garante que fechar a aba logo depois de virar não perca a
         * virada — que é o caso mais comum de parar de ler. */
        gravarProgresso(id, { capitulo: novo.capitulo, deslocamento: 0 }).catch(() => {});
        window.scrollTo({ top: 0, behavior: "auto" });
      }}
      aoMarcar={(deslocamento) => {
        /* Falha em silêncio: isto roda enquanto a pessoa lê, e um erro visível
         * a cada rolagem de quem não entrou faria o produto parecer quebrado
         * quando o que acontece é o previsto — sem conta não há onde guardar. */
        gravarProgresso(id, { capitulo: livro.capitulo ?? 0, deslocamento }).catch(() => {});
      }}
    />
  );
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
        <Route path="/conta" element={<SoParaQuemEntrou acesso={acesso}><ContaKindle pessoa={comoChamar(acesso.pessoa)} aoSair={acesso.sair} /></SoParaQuemEntrou>} />
        <Route path="/conta/kindle" element={<SoParaQuemEntrou acesso={acesso}><ContaKindle pessoa={comoChamar(acesso.pessoa)} aoSair={acesso.sair} /></SoParaQuemEntrou>} />
        <Route path="/conta/privacidade" element={<AindaNao lugar={{ rotulo: "Privacidade", oQueE: "O que fica guardado, onde, e por quanto tempo." }} />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}
