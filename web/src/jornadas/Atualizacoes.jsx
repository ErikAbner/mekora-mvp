/* Atualizações — o que mudou, e o que ainda não é confiável.
 *
 * NÃO É O `git log`. Derivar esta lista dos commits seria fácil e errado: o
 * commit fala de arquivo, o usuário quer saber o que passou a funcionar. As duas
 * listas têm tamanhos diferentes de propósito — refatoração não é notícia, e
 * três commits podem virar uma linha.
 *
 * A CURADORIA É DO ERIK. O que está aqui foi escrito a partir do que
 * efetivamente entrou, e ele decide o que merece aparecer. Está em DESVIOS.md.
 *
 * Cada entrada leva ao lugar onde a mudança pode ser vista — anúncio que não
 * mostra o que anunciou é publicidade.
 *
 * A METADE QUE FALTAVA ERA A SEGUNDA. Construí a tela sem o desenho e ela virou
 * uma lista de novidades; o desenho (895:11060) tem uma seção final chamada
 * **"O que ainda não está de pé"**, e o subtítulo é *"O que mudou e,
 * principalmente, o que ainda não é confiável"*.
 *
 * Isso não é detalhe de layout: é o produto dizendo o que não faz, na página
 * que existe para se gabar. Uma tela de atualizações só com acertos é release
 * note; com a segunda metade, é um lugar onde dá para confiar no que a primeira
 * diz.
 */
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import "./atualizacoes.css";

/* Data em ISO, e formatada na tela: escrita "1 de setembro" ela não ordena, e
 * ordenar à mão é como a lista sai de ordem sem ninguém ver. */
/* `tipo` é o que a etiqueta vertical diz no desenho: novo, melhorado, corrigido.
 * Três, e não cinco: a diferença entre "melhorado" e "ajustado" não muda o que
 * a pessoa faz com a informação. */
const MUDANCAS = [
  {
    data: "2026-09-01",
    itens: [
      {
        tipo: "novo",
        titulo: "Dá para sair de outro navegador à distância",
        diz: "A conta passou a listar onde você está logado, com quando cada navegador foi usado por último. Um computador emprestado ou um celular perdido não precisa mais estar na sua mão para você sair dele.",
        onde: { rota: "/conta/seguranca", diz: "Ver onde estou logado" },
      },
      {
        tipo: "novo",
        titulo: "A preparação mostra o que está fazendo",
        diz: "Antes o arquivo era enviado para converter e a tela voltava para a Mesa no mesmo instante — um PDF de trezentas páginas levava minutos sem dizer nada. Agora a tela fica, diz a etapa, e avisa quando o servidor não informa quanto falta.",
        onde: { rota: "/mesa", diz: "Preparar um arquivo" },
      },
      {
        tipo: "novo",
        titulo: "Ajuda e Atualizações existem",
        diz: "As duas eram citadas e nunca tinham sido escritas. Esta página é uma delas.",
        onde: { rota: "/ajuda", diz: "Ver a Ajuda" },
      },
      {
        tipo: "corrigido",
        titulo: "A tela de preparação parou de afirmar o que não sabia",
        diz: "Ela dizia “nenhuma página corrompida, N de N abriram sem erro”, e nada no servidor responde isso. E mostrava “Running…” em inglês para quem esperava a conversão, porque o vocabulário interno estava vazando para a tela.",
      },
      {
        tipo: "corrigido",
        titulo: "As telas cabem no celular",
        diz: "O cabeçalho tinha largura fixa e empurrava toda tela de dentro para fora do visor — a página ganhava rolagem lateral em nove lugares diferentes. Não ganha mais.",
      },
      {
        tipo: "melhorado",
        titulo: "Um estudo tem página própria",
        diz: "A lista mostrava cada estudo inteiro, e três estudos de vinte notas viravam uma rolagem onde nenhum deles se lia. Agora o título abre o estudo sozinho.",
        onde: { rota: "/estudos", diz: "Ver meus estudos" },
      },
    ],
  },
];

/* O QUE O PRODUTO NÃO FAZ, dito por ele mesmo. Vem do desenho, com um item a
 * menos: "Entrar e sair da conta" saiu porque a decisão foi tomada — é link por
 * e-mail, sem senha —, e a tela de sessões que ele dizia não existir agora
 * existe. Uma pendência resolvida que continua listada é pior que nenhuma
 * lista: ela ensina que a lista não é atualizada. */
const NAO_ESTA_DE_PE = [
  {
    titulo: "Tradução de quadrinhos e mangás — não disponível",
    diz: "Aqui o texto vive dentro da imagem: é preciso achar o balão, ler, apagar e recompor. Funciona em página simples e erra em arte densa. Não está atrás de um interruptor escondido — está fora.",
  },
  {
    titulo: "Por quanto tempo guardamos o arquivo original — decisão pendente",
    diz: "Ele fica enquanto o livro existir, porque é o que permite refazer a preparação sem você enviar de novo. O prazo exato ainda não foi decidido, e não vamos escrever um número antes de decidir.",
    onde: { rota: "/conta/privacidade", diz: "Ver o que está guardado" },
  },
  {
    titulo: "A leitura ainda não foi verificada no celular",
    diz: "Todas as outras telas foram medidas a 390 pixels e cabem. A de leitura não: verificá-la exige um livro já convertido, e isso ainda não está no caminho da medida.",
  },
];

const data = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
};

export function Atualizacoes() {
  return (
    <div className="mesa">
      <Cabecalho />

      <main className="atualizacoes">
        <header className="atualizacoes-topo">
          <h1>Atualizações</h1>
          {/* O "principalmente" é do desenho, e ele é a tese da página: a
              segunda metade vale mais que a primeira. */}
          <p>O que mudou e, principalmente, o que ainda não é confiável.</p>
        </header>

        {MUDANCAS.map((lote) => (
          <section key={lote.data} className="atualizacoes-lote">
            {/* `<time>` com `dateTime` legível por máquina, e o texto em
                português para quem lê. */}
            <h2>
              <time dateTime={lote.data}>{data(lote.data)}</time>
            </h2>
            <ul>
              {lote.itens.map((i) => (
                <li key={i.titulo}>
                  {/* A etiqueta é vertical no desenho, e o rótulo aqui não é
                      decorativo: "corrigido" diz que algo estava errado, o que é
                      informação diferente de "novo". */}
                  <span className={`atualizacoes-tipo ${i.tipo}`}>{i.tipo}</span>
                  <div className="atualizacoes-texto">
                    <h3>{i.titulo}</h3>
                    <p>{i.diz}</p>
                    {i.onde && <Link to={i.onde.rota}>{i.onde.diz}</Link>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* A SEGUNDA METADE. Uma tela de atualizações só com acertos é release
            note; é esta seção que faz a de cima merecer crédito. */}
        <section className="atualizacoes-pendente">
          <h2>O que ainda não está de pé</h2>
          <ul>
            {NAO_ESTA_DE_PE.map((i) => (
              <li key={i.titulo}>
                <h3>{i.titulo}</h3>
                <p>{i.diz}</p>
                {i.onde && <Link to={i.onde.rota}>{i.onde.diz}</Link>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Rodape />
    </div>
  );
}
