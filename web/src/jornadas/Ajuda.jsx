/* Ajuda — as perguntas que o produto levanta.
 *
 * ELA NÃO EXISTIA. E a razão de existir não é ter uma seção de ajuda: é que o
 * Mekora faz três coisas que não se parecem com nada — entrar sem senha, mandar
 * para o Kindle por e-mail, e converter um arquivo que a pessoa já tem. Cada uma
 * gera uma dúvida previsível, e sem lugar para ela a dúvida vira e-mail ou
 * abandono.
 *
 * O QUE ESTÁ AQUI É O QUE O PRODUTO FAZ, e não o que ele gostaria de fazer. Toda
 * resposta abaixo pode ser desmentida abrindo a tela correspondente — e é assim
 * que ela precisa continuar: se uma capacidade mudar, esta página está errada, e
 * a pessoa descobre antes de nós.
 *
 * O que ela NÃO tem: busca, categorias, artigos numerados, "isto foi útil?".
 * São nove perguntas. Uma estrutura de central de ajuda em cima de nove
 * perguntas é mais navegação que conteúdo.
 *
 * Construída sem o desenho: o `figma-local` exige o Dev Mode ligado, e a aba
 * estava em modo design. Está em DESVIOS.md, para o pente fino.
 */
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import "./ajuda.css";

/* Cada resposta cita o lugar onde ela pode ser conferida. Ajuda que não leva a
 * lugar nenhum obriga a pessoa a procurar de novo, agora com a resposta na
 * cabeça e sem saber onde aplicá-la. */
const ASSUNTOS = [
  {
    titulo: "Entrar e sair",
    perguntas: [
      {
        p: "Por que não tem senha?",
        r: "Porque senha é mais uma coisa para você guardar, e o e-mail já é o que identifica sua conta. Você pede um link, ele chega, vale quinze minutos e serve uma vez. Quem tem acesso ao seu e-mail entra na sua conta — é onde a segurança mora, e vale protegê-la lá.",
        onde: { rota: "/conta/seguranca", diz: "Ver onde estou logado" },
      },
      {
        p: "Pedi o link e ele não chegou.",
        r: "Olhe o spam primeiro. Se não estiver lá, peça outro: o anterior deixa de valer assim que você pede um novo. Um mesmo e-mail pode pedir cinco links a cada dez minutos — o limite existe para o campo aberto na internet não virar máquina de incomodar quem alguém quiser.",
      },
      {
        p: "Entrei em um computador que não é meu.",
        r: "Dá para sair dele à distância. A tela de Segurança lista os navegadores em que você entrou, e você encerra o que quiser sem precisar voltar até ele.",
        onde: { rota: "/conta/seguranca", diz: "Ir para Segurança" },
      },
    ],
  },
  {
    titulo: "Preparar arquivos",
    perguntas: [
      {
        p: "Preciso de conta para converter?",
        r: "Não. Você solta o arquivo, ele é preparado e você baixa. A conta entra depois, e ela é a estante: o lugar onde o acervo fica, onde o seu Kindle fica salvo e onde o que você marcou continua. Sem conta, a aba aberta é o único endereço do seu trabalho.",
        onde: { rota: "/", diz: "Ir para a Mesa" },
      },
      {
        p: "Que formatos são aceitos?",
        r: "A lista aparece na área de soltar arquivo, e ela vem do servidor — não de uma lista escrita à mão que poderia estar desatualizada. Se o formato aparece lá, ele é aceito.",
        onde: { rota: "/", diz: "Ver a lista" },
      },
      {
        p: "Por que converter um PDF que eu já consigo abrir?",
        r: "Porque PDF digitalizado é imagem de texto. Você aumenta a letra e nada acontece, a busca não encontra nada, e não há sumário para pular capítulos. Convertido para EPUB, o texto reflui e o aparelho passa a saber o que está escrito.",
        onde: { rota: "/apresentacao", diz: "A explicação inteira" },
      },
      {
        p: "Quanto tempo demora?",
        r: "Depende do arquivo. Documento com texto é rápido; digitalização de trezentas páginas precisa de reconhecimento e leva minutos. A tela de preparação mostra a etapa, e diz quando o servidor não informa quanto falta — em vez de uma barra que anda sozinha.",
      },
    ],
  },
  {
    titulo: "Kindle e leitura",
    perguntas: [
      {
        p: "Como o arquivo chega no meu Kindle?",
        r: "Por e-mail. Cada Kindle tem um endereço próprio terminado em @kindle.com, e você o cadastra na conta. É preciso também autorizar o remetente do Mekora na Amazon, senão ela descarta a mensagem sem avisar ninguém.",
        onde: { rota: "/conta/kindle", diz: "Cadastrar um aparelho" },
      },
      {
        p: "O que acontece com o que eu marco lendo?",
        r: "Fica preso ao trecho, e não num caderno separado. Voltar ao livro seis meses depois devolve o que você pensou lendo aquilo, no lugar onde pensou. E o que você marcou no próprio Kindle pode ser trazido para cá.",
        onde: { rota: "/notas", diz: "Ver minhas notas" },
      },
    ],
  },
  {
    titulo: "Seus dados",
    perguntas: [
      {
        p: "O que o Mekora guarda sobre mim?",
        r: "A lista completa está na tela de Privacidade, com a contagem de cada coisa e o que ela é em português. De lá também dá para levar tudo embora, e apagar a conta.",
        onde: { rota: "/conta/privacidade", diz: "Ver o que está guardado" },
      },
    ],
  },
];

export function Ajuda() {
  return (
    <div className="mesa">
      <Cabecalho />

      <main className="ajuda">
        <header className="ajuda-topo">
          <h1>Ajuda</h1>
          <p>
            As perguntas que o Mekora costuma levantar, e onde conferir cada
            resposta. Se alguma delas estiver errada, a tela citada é que manda.
          </p>
        </header>

        {ASSUNTOS.map((a) => (
          <section key={a.titulo} className="ajuda-secao">
            <h2>{a.titulo}</h2>
            <ul>
              {a.perguntas.map((q) => (
                <li key={q.p}>
                  {/* `<details>` nativo, e não um acordeão de `<div>`: ele já
                      abre com teclado, entra na busca da página em navegadores
                      que a suportam, e imprime aberto. */}
                  <details>
                    <summary>{q.p}</summary>
                    <div className="ajuda-resposta">
                      <p>{q.r}</p>
                      {q.onde && <Link to={q.onde.rota}>{q.onde.diz}</Link>}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="ajuda-secao ajuda-resto">
          <h2>Não achou</h2>
          <p>
            O Mekora ainda é novo e feito por uma pessoa só. Se a sua pergunta não
            está aqui, ela provavelmente vale para outras pessoas também — e a
            resposta entra nesta página.
          </p>
        </section>
      </main>

      <Rodape />
    </div>
  );
}
