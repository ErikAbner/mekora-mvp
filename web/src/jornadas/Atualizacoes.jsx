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
    data: "2026-09-02",
    itens: [
      {
        tipo: "novo",
        titulo: "A conta tem nome e retrato, e os dois são opcionais",
        diz: "Antes a conta era só o e-mail — e a trilha ao lado inventava um nome a partir dele, enquanto a tela de privacidade dizia que não havia nome nenhum. Agora você escolhe os dois, ou nenhum. Do retrato o servidor guarda um recorte quadrado feito por ele: junto com a imagem original iriam a câmera, a data e, em foto de celular, a coordenada de onde ela foi tirada.",
        onde: { rota: "/conta", diz: "Ver minha conta" },
      },
      {
        tipo: "novo",
        titulo: "Um PDF com senha para e pergunta, em vez de falhar",
        diz: "Ele era tratado como PDF quebrado: a análise não conseguia ler nada, o arquivo passava por digitalização, e você recebia “OCR falhou” para um arquivo que só precisava de uma senha. Agora ele aparece em “Precisa de você”, na Mesa, com um campo. A senha abre o arquivo e é esquecida — não vai para o banco nem para o log.",
        onde: { rota: "/mesa", diz: "Ver a Mesa" },
      },
      {
        tipo: "novo",
        titulo: "O Mekora mostra os assuntos que atravessaram seus livros",
        diz: "Nos Estudos, “Você ligou” junta notas de livros diferentes que dividem palavras — com as palavras à vista, para você poder discordar. Ele não organiza nada sozinho: oferece juntar num estudo, e a pergunta do centro continua sendo sua.",
        onde: { rota: "/estudos", diz: "Ver meus estudos" },
      },
      {
        tipo: "novo",
        titulo: "A tradução saiu do servidor e apareceu na tela",
        diz: "O Preparo passou a oferecer “Traduzir”, com os idiomas que a sua instalação realmente tem — e, quando não tem nenhum, diz o que falta em vez de mostrar um botão que não funciona. O arquivo original fica intacto: o que sai é um segundo texto.",
        onde: { rota: "/mesa", diz: "Preparar um arquivo" },
      },
      {
        tipo: "melhorado",
        titulo: "As páginas longas dizem onde você está",
        diz: "A ficha de um livro e a página de um estudo ganharam uma coluna de âncoras à esquerda, com a seção que você está lendo marcada. No celular ela não aparece: lá rolar já é o gesto.",
      },
      {
        tipo: "corrigido",
        titulo: "A fila da Mesa parou de sumir quando você recarrega",
        diz: "Ela só existia na aba em que você soltou o arquivo: recarregar no meio de uma conversão de dez minutos apagava a fila da tela, enquanto o trabalho seguia no servidor. Agora ela vem do servidor, e a área de soltar subiu para o topo — dava para acrescentar um arquivo só pelo botão no fim de uma lista que pode ter trinta itens.",
        onde: { rota: "/mesa", diz: "Ver a Mesa" },
      },
      {
        tipo: "novo",
        titulo: "A preparação diz o passo, o tempo e dá para cancelar",
        diz: "A tela de conversão trocava a página inteira por uma linha de texto. Agora ela mantém o arquivo à vista, conta por que a barra existe numa etapa e não na seguinte, mostra o relógio do que já passou — decorrido, não previsto — e traz os botões Cancelar e Continuar navegando.",
        onde: { rota: "/mesa", diz: "Preparar um arquivo" },
      },
      {
        tipo: "novo",
        titulo: "Os Estudos ganharam busca, e uma vista por leitura",
        diz: "Buscar em livros, notas e contextos de uma vez; e um alternador que reparte o acervo em A ler, Lendo e Lido. Na lista, cada estudo virou cartão: as notas ficam dentro dele, e não empilhadas na lista inteira.",
        onde: { rota: "/estudos", diz: "Ver meus estudos" },
      },
      {
        tipo: "novo",
        titulo: "O Mekora sugere quando um grupo de notas vale um estudo",
        diz: "Quando três ou mais notas suas dividem assunto e nenhuma está guardada, a nota oferece juntá-las. Ele não escreve a pergunta do estudo — essa é a única coisa que ninguém pode escrever no seu lugar.",
      },
      {
        tipo: "melhorado",
        titulo: "A ficha do livro conta de onde ele veio e quanto você leu",
        diz: "O nome do arquivo enviado sumia assim que o título era detectado. Voltou, junto com a barra de leitura em porcentagem, a última coisa que você marcou, e os botões de enviar ao Kindle e ver o preparo. Cada nota ganhou “Copiar com origem”, que leva o livro e o capítulo junto.",
        onde: { rota: "/estante", diz: "Abrir a estante" },
      },
      {
        tipo: "corrigido",
        titulo: "O nome dos seus arquivos não entra mais na medição",
        diz: "Quando uma conversão falhava, a mensagem de erro ia para a tabela de métricas com o caminho e o nome do documento dentro — enquanto a tela de privacidade prometia o contrário. Agora eles são trocados por um marcador antes de a linha ser gravada.",
        onde: { rota: "/conta/privacidade", diz: "Ver o que está guardado" },
      },
    ],
  },
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
    /* TRÊS PENDÊNCIAS SAÍRAM DAQUI, e as três pelo mesmo motivo: deixaram de
       ser pendências.

       "A leitura ainda não foi verificada no celular" era a mais antiga, e ela
       ficou aqui depois de deixar de ser verdade: a auditoria mede
       `/leitura/{LIVRO}` a 390 desde que o helper de sessão passou a entregar
       um livro com EPUB, e ela passa. Um item de "não está de pé" que já está
       de pé é o mesmo defeito que esta página existe para não ter. */
    /* TRÊS PENDÊNCIAS SAÍRAM DAQUI, e as três pelo mesmo motivo: deixaram de
       ser pendências.

       "Por quanto tempo guardamos o arquivo original" saiu em 01/09, quando a
       tela de privacidade passou a dizer os trinta dias. "Nome e retrato na
       conta" saiu em 02/09, quando o Erik decidiu e a coisa foi construída — e
       virou uma linha de "novo" lá em cima, que é onde ela passa a valer.

       "A leitura ainda não foi verificada no celular" era a mais antiga, e ela
       ficou aqui DEPOIS de deixar de ser verdade: a auditoria mede
       `/leitura/{LIVRO}` a 390 desde que o helper de sessão passou a entregar
       um livro com EPUB de verdade, e ela passa com 21 nós medidos.

       Manter item antigo aqui seria a página de atualizações desatualizada, que
       é o defeito mais fácil de ter numa página que existe para contar o que
       mudou — e um "não está de pé" que já está de pé é o pior deles, porque
       desfaz a confiança na primeira metade da página. */
    titulo: "A tradução não está instalada nesta máquina",
    diz: "A tela já sabe pedir e mostrar os idiomas que existem, mas o tradutor em si é um pacote à parte e ele não está aqui. Enquanto não estiver, o Preparo diz o que falta na linha do idioma, em vez de oferecer um botão que não funciona.",
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
