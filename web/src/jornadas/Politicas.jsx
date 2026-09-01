/* Política de privacidade e termos de uso.
 *
 * O Erik pediu as duas quando decidiu que a prévia de link entra: *"modifique a
 * privacidade então, essa feature é importante (…) só precisamos ser
 * transparentes no porquê pedimos isso."*
 *
 * ELAS NÃO SÃO A TELA DE PRIVACIDADE. Aquela mostra o que a **sua conta** tem,
 * com contagem, e serve para levar embora ou apagar. Estas duas são o documento
 * — o que vale para qualquer pessoa, e o que a lei pede que esteja escrito. Uma
 * responde "o que vocês têm de mim"; a outra, "o que vocês podem fazer".
 *
 * ESCRITAS PARA SEREM LIDAS. O gênero costuma ser um muro de parágrafos que
 * ninguém abre, e isso não é acidente: um texto ilegível cumpre a formalidade
 * sem cumprir o propósito. Aqui cada seção começa pela resposta, e a explicação
 * vem depois.
 *
 * O QUE NÃO ESTÁ AQUI: promessa que o produto não pode cumprir. Não há
 * certificação, não há prazo de retenção fixado — o prazo continua indefinido, e
 * a página diz isso em vez de inventar noventa dias.
 */
import { Link, useLocation } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import "./politicas.css";

const PRIVACIDADE = {
  titulo: "Política de privacidade",
  desde: "1 de setembro de 2026",
  abre:
    "O Mekora guarda o mínimo que precisa para funcionar, e esta página diz o quê, " +
    "por quê e para onde vai. Se alguma frase aqui não bater com o que a sua tela " +
    "de Privacidade mostra, é esta página que está errada — lá os números são " +
    "contados do banco, na hora.",
  secoes: [
    {
      t: "O que identifica você",
      p: [
        "Seu e-mail, e nada além dele. Não há nome, telefone, foto nem data de nascimento — e não há senha: você entra por um link que chega no e-mail, vale quinze minutos e serve uma vez.",
        "A consequência disso é direta e vale dizer: quem tem acesso ao seu e-mail entra na sua conta. É onde a segurança do Mekora mora, e vale protegê-la lá.",
      ],
    },
    {
      t: "O que fica guardado",
      p: [
        "Os arquivos que você envia e o que foi convertido a partir deles. O original fica enquanto o livro existir, porque é o que permite refazer a preparação sem você enviar de novo.",
        "O que você marcou lendo, onde parou em cada livro, os endereços de Kindle que ligou à conta, os estudos que montou e os navegadores em que entrou.",
        "A lista completa, com a contagem de cada coisa, está na sua tela de Privacidade — e de lá dá para levar tudo embora num arquivo, ou apagar a conta.",
      ],
    },
    {
      t: "Para onde algo seu sai daqui",
      p: [
        "Só dois lugares, e os dois por escolha sua.",
        "A Amazon, quando você manda um livro ao Kindle. O arquivo vai por e-mail para o endereço que você cadastrou.",
        "O site do link que você cola no Canvas. Para montar a prévia — título e imagem —, o Mekora abre esse endereço, e o site vê o pedido como veria se você mesmo clicasse. Nada além do endereço é enviado, e nada é buscado até você colar um link.",
      ],
    },
    {
      t: "O que não acontece",
      p: [
        "Não há rastreamento, análise de uso nem publicidade. Não vendemos, alugamos nem compartilhamos o que é seu.",
        "O texto dos seus livros não é lido por pessoa nenhuma, e não alimenta modelo nenhum. A conversão é uma máquina, e o que sai dela vai para a sua estante.",
      ],
    },
    {
      t: "Por quanto tempo",
      p: [
        "Enquanto você quiser. Apagar a conta apaga tudo — arquivos, notas, aparelhos e histórico — e não guardamos cópia.",
        "O prazo de retenção do arquivo original ainda não foi decidido, e preferimos dizer isso a escrever um número que não vamos cumprir. Quando for decidido, entra aqui e em Atualizações.",
      ],
    },
    {
      t: "Seus direitos",
      p: [
        "Ver, levar e apagar — os três na sua tela de Privacidade, sem pedir a ninguém e sem esperar prazo. É a LGPD, e é também como o produto foi construído.",
      ],
      onde: { rota: "/conta/privacidade", diz: "Ir para a minha privacidade" },
    },
  ],
};

const TERMOS = {
  titulo: "Termos de uso",
  desde: "1 de setembro de 2026",
  abre:
    "O que o Mekora se compromete a fazer, e o que ele espera de quem usa. " +
    "Está curto porque o serviço é simples.",
  secoes: [
    {
      t: "O que o Mekora faz",
      p: [
        "Prepara arquivos que você já tem para ler no Kindle, guarda o resultado numa estante que é sua, e mantém o que você marcou junto do trecho onde marcou.",
        "Converter não exige conta. A conta existe para o acervo ficar: sem ela, a aba aberta é o único endereço do seu trabalho.",
      ],
    },
    {
      t: "O que você traz",
      p: [
        "Arquivos que você tem o direito de usar — comprados, seus, ou de domínio público.",
        "O Mekora não quebra proteção de cópia e não extrai conteúdo de loja nenhuma. Um arquivo com DRM não é aceito, e isso não é uma limitação técnica a ser contornada: é o limite do que o produto se propõe a fazer.",
      ],
    },
    {
      t: "O que é seu continua seu",
      p: [
        "Nada do que você envia passa a nos pertencer. Não usamos seu conteúdo para nada além de preparar, guardar e devolver a você.",
      ],
    },
    {
      t: "O que pode falhar",
      p: [
        "Conversão de arquivo é imperfeita. Digitalização ruim gera reconhecimento ruim, quadrinho com página dupla exige escolha, e alguns PDFs simplesmente não viram um bom EPUB.",
        "O Mekora mostra o que encontrou antes de converter, e diz quando não sabe. O que ele não faz é prometer um resultado que depende do arquivo que chegou.",
        "O envio ao Kindle depende da Amazon aceitar. Se o remetente não estiver autorizado na sua conta lá, ela recusa em silêncio — e é por isso que o assistente insiste nesse passo.",
      ],
    },
    {
      t: "Interrupções",
      p: [
        "É um produto novo, feito por uma pessoa só. Pode sair do ar, pode ter defeito, e pode mudar. O que não vai acontecer sem aviso é o seu acervo sumir: se o Mekora precisar fechar, você terá tempo e um caminho para levar tudo embora.",
      ],
    },
    {
      t: "Encerrar",
      p: [
        "A qualquer momento, sem pedir a ninguém. Apagar a conta apaga tudo, e não guardamos cópia.",
      ],
      onde: { rota: "/conta/privacidade", diz: "Apagar minha conta" },
    },
  ],
};

export function Politicas() {
  /* O documento sai do CAMINHO, e não de um parâmetro: são duas rotas fixas —
   * `/privacidade` e `/termos` — e não uma rota com variável. Endereço de
   * documento legal é citado por escrito, e `/politicas/privacidade` seria uma
   * camada a mais para nada. */
  const eTermos = useLocation().pathname.startsWith("/termos-de-uso");
  const doc = eTermos ? TERMOS : PRIVACIDADE;
  const outro = eTermos ? PRIVACIDADE : TERMOS;
  const rotaDoOutro = eTermos ? "/politica-de-privacidade" : "/termos-de-uso";

  return (
    <div className="mesa">
      <Cabecalho />

      <main className="politicas">
        <header>
          <h1>{doc.titulo}</h1>
          {/* A DATA IMPORTA MAIS QUE O TÍTULO num documento destes: ela é o que
              diz se o que está escrito ainda vale. */}
          <p className="politicas-desde">Em vigor desde {doc.desde}</p>
          <p className="politicas-abre">{doc.abre}</p>
        </header>

        {doc.secoes.map((s) => (
          <section key={s.t}>
            <h2>{s.t}</h2>
            {s.p.map((texto) => <p key={texto}>{texto}</p>)}
            {s.onde && <Link to={s.onde.rota}>{s.onde.diz}</Link>}
          </section>
        ))}

        <footer className="politicas-fim">
          <Link to={rotaDoOutro}>Ler também: {outro.titulo.toLowerCase()}</Link>
        </footer>
      </main>

      <Rodape />
    </div>
  );
}
