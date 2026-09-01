/* D · Apresentação — a landing pública. Vem do nó 895:7063 do Figma.
 *
 * É a única tela do produto escrita para quem ainda não é usuário, e por isso
 * ela não usa o `Cabecalho` das jornadas: aquele lista os quatro lugares, e
 * oferecer Canvas e Estudos a quem nunca soltou um arquivo é oferecer portas
 * que não abrem. O cabeçalho daqui tem duas coisas, e as duas levam a algum
 * lugar.
 *
 * O que mudou em relação ao desenho, e por quê, está em DESVIOS.md ao lado
 * deste arquivo.
 */
import { Link } from "react-router-dom";
import { Rodape } from "../componentes/Rodape.jsx";
import { Soltar } from "../componentes/Soltar.jsx";
import { Formatos } from "../componentes/Formatos.jsx";
import "./apresentacao.css";

const marca = "/icones/marca-mekora.svg";

/* As três capas são as do próprio produto, servidas de `publico/capas/`. O
 * desenho traz três retângulos de imagem sem conteúdo, e a legenda ao lado fala
 * exatamente de capa montada pelo Mekora — mostrar capa de verdade é o que a
 * seção afirma. */
const CAPAS = [
  { arquivo: "/capas/exemplo-1.png", titulo: "Primeira capa da estante" },
  { arquivo: "/capas/exemplo-2.png", titulo: "Segunda capa da estante" },
  { arquivo: "/capas/exemplo-3.png", titulo: "Terceira capa da estante" },
];

const PASSOS = [
  { n: 1, o: "Você solta o arquivo", como: "PDF, EPUB, DOCX, CBZ, CBR, ZIP ou imagens" },
  { n: 2, o: "O Mekora vê o que tem dentro", como: "Páginas, idioma, capítulos, se o texto é texto" },
  { n: 3, o: "Mostra o que encontrou e o que vai fazer", como: "Uma tela, uma lista, um botão" },
  { n: 4, o: "Você recebe", como: "Baixa o arquivo ou manda direto para o Kindle" },
];

const O_QUE_FICA = [
  {
    titulo: "A estante",
    texto: "Tudo o que você preparou, com capa, inclusive as que o Mekora montou para arquivos que não tinham nenhuma. Dá para achar de longe, que é o que uma estante precisa fazer.",
  },
  {
    titulo: "O que você marcou",
    texto: "Destaque e nota ficam no trecho de origem. Voltar ao livro seis meses depois devolve o que você pensou lendo aquilo, no lugar onde pensou.",
  },
  {
    titulo: "As conexões",
    texto: "O que você marcou em livros diferentes sobre o mesmo assunto se encontra. Sem você organizar pasta nenhuma.",
  },
];

const QUEM_LE = [
  {
    titulo: "Quem lê para estudar",
    texto: "Chegam vinte artigos de uma vez, todos digitalizados, todos sem sumário. Você vai marcar, vai voltar, e daqui a um semestre vai precisar achar de novo aquele parágrafo, sem lembrar em qual arquivo ele estava.",
  },
  {
    titulo: "Quem lê por prazer",
    texto: "Você tem mangá em CBZ, livro que só existe em PDF e coisa que baixou e nunca conseguiu ler direito no aparelho. Cada um exige um ajuste diferente, e você não quer aprender nenhum deles.",
  },
];

export function Apresentacao({ aoReceberArquivos, backend }) {
  return (
    <div className="apresentacao">
      <header className="apresentacao-cabecalho">
        <Link to="/" className="apresentacao-marca" aria-label="Mekora, início">
          <img src={marca} alt="" aria-hidden="true" />
        </Link>
        <nav aria-label="Atalhos">
          {/* Âncora, e não rota: a explicação está nesta mesma página, e mandar
              para outra tela o que está oitocentos pixels abaixo é perder a
              pessoa no caminho. */}
          <a href="#como-funciona">Como funciona</a>
          <Link to="/entrar" className="apresentacao-entrar">Entrar</Link>
        </nav>
      </header>

      <section className="apresentacao-abertura">
        <div className="abertura-dizer">
          <h1>
            Uma estante para os livros
            <br />
            que não vêm de loja
          </h1>
          <p className="abertura-explica">
            PDF digitalizado, artigo, apostila, mangá. O Mekora prepara para o seu Kindle,
            guarda numa estante que é sua, e mantém o que você marcou junto do livro onde
            você marcou.
          </p>
        </div>
        <Soltar aoReceberArquivos={aoReceberArquivos} backend={backend} />
      </section>

      <section className="apresentacao-problema">
        <h2>
          PDF não é um livro.
          <br />
          É uma fotografia de um livro.
        </h2>
        <blockquote>
          Você aumenta a letra e nada acontece, porque não há letra, há imagem.
        </blockquote>
        <div className="problema-texto">
          <p>
            A busca não encontra nada, não existe sumário para pular capítulos e a capa, na
            biblioteca, é um retângulo cinza com o nome do arquivo. O livro convertido vira
            mais um arquivo numa pasta. Você lê, marca alguma coisa, e seis meses depois não
            sabe em qual dos quarenta PDFs aquilo estava.
          </p>
          <p>
            O problema não é somente converter. É transformar um arquivo em algo que se
            comporta como um livro.
          </p>
        </div>
      </section>

      <section className="apresentacao-capas">
        <ul className="capas-fila">
          {CAPAS.map((c) => (
            <li key={c.arquivo}>
              {/* A lombada ao lado da capa, como na estante. É ornamento, então
                  sai da árvore de acessibilidade. */}
              <span className="capa-lombada" aria-hidden="true" />
              <img src={c.arquivo} alt={c.titulo} />
            </li>
          ))}
        </ul>
        <p className="capas-legenda">
          Um relatório de pesquisa sem capa. O Mekora monta uma com o título, o autor e o
          formato, na linguagem da sua estante, porque uma estante só funciona se der para
          reconhecer os livros de longe.
        </p>
      </section>

      <section className="apresentacao-passos" id="como-funciona">
        <h2>
          Quatro passos,
          <br />e só um deles é seu.
        </h2>
        <ol className="passos-lista">
          {PASSOS.map((p) => (
            <li key={p.n}>
              {/* O número é figura, não contagem: o `<ol>` já numera para quem
                  ouve, e ler "1 1 Você solta o arquivo" é o que acontece quando
                  o ornamento entra na árvore. */}
              <span className="passo-numero" aria-hidden="true">{p.n}</span>
              <div className="passo-dizer">
                <h3>{p.o}</h3>
                <p>{p.como}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="apresentacao-depois">
        <h2>
          O livro não termina
          <br />
          quando o arquivo fica pronto.
        </h2>
        <blockquote>
          <p>É aqui que o Mekora deixa de ser um conversor.</p>
          <p>
            O que você preparou vira um item com capa, ficha e origem, e o que você marcou
            fica preso ao trecho, não a um caderno separado que ninguém reabre.
          </p>
        </blockquote>

        <ul className="depois-lista">
          {[...O_QUE_FICA, ...QUEM_LE].map((b) => (
            <li key={b.titulo}>
              <h3>{b.titulo}</h3>
              <p>{b.texto}</p>
            </li>
          ))}
        </ul>

        <div className="depois-fecho">
          <p>
            Nos dois casos o problema não é converter uma vez.
            <br />É que o acervo cresce e nada o segura.
          </p>
          {/* Os mesmos chips da área de soltar, e pela mesma razão: aqui eles
              afirmam o que o produto aceita, e afirmar isso com uma lista
              escrita à mão é o que faz a landing prometer formato que o
              servidor recusa. */}
          <Formatos />
          <p>
            Documento vira EPUB com texto reconhecido e sumário.
            <br />
            Quadrinho vira arquivo no tamanho exato do seu aparelho.
            <br />
            Tradução gera um segundo arquivo, sem tocar no original — para quadrinhos ainda
            não.
          </p>
        </div>
      </section>

      <section className="apresentacao-chamada">
        <h2>Comece pelo arquivo que você nunca conseguiu ler direito.</h2>
        <div className="chamada-texto">
          <p>
            Todo mundo tem um, costuma ser um PDF digitalizado de trezentas páginas. Solte
            ele agora, receba o resultado e baixe: sem cadastro, sem e-mail.
          </p>
          <p>
            A conta entra depois, e ela é a estante: o lugar onde o acervo existe, onde o seu
            Kindle fica salvo e onde o que você marcou continua te esperando. Sem conta, esta
            aba é o único endereço do seu trabalho.
          </p>
        </div>
        <div className="chamada-botoes">
          {/* O primário rola para a área de soltar do fim da página, que é a
              ação que ele nomeia. Um botão "Preparar arquivos" que abre outra
              tela para pedir o arquivo de novo é um passo a mais sem motivo. */}
          <a className="botao primaria" href="#soltar-fim">Preparar arquivos</a>
          <Link className="botao secundaria" to="/entrar">Criar conta</Link>
        </div>
      </section>

      <section className="apresentacao-fim">
        <Soltar id="soltar-fim" aoReceberArquivos={aoReceberArquivos} backend={backend} />
      </section>

      <Rodape />
    </div>
  );
}
