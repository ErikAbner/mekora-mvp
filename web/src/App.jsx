/* A jornada, ligada ao backend de verdade.
 *
 * Até agora ela andava com uma lista de exemplo. Exemplo prova layout e mais
 * nada: o estado vinha escrito à mão, e escrito à mão ele nunca discorda de si
 * mesmo. Agora cada estado é derivado da resposta do servidor, pelo contrato.
 *
 * O passo continua sendo estado local porque ainda não há roteamento. O que
 * importa nesta rodada é que os dados são reais, não que a navegação seja
 * definitiva.
 */
import { useEffect, useState } from "react";
import { MesaVazia } from "./jornadas/MesaVazia.jsx";
import { MesaCheia } from "./jornadas/MesaCheia.jsx";
import { Estante } from "./jornadas/Estante.jsx";
import { Leitura } from "./jornadas/Leitura.jsx";
import { useJornada } from "./estado/useJornada.js";

/* Um livro de exemplo para a leitura, enquanto o backend não serve o conteúdo
 * convertido. O texto é o do próprio desenho, e os destaques são por ÍNDICE de
 * caractere — que é como eles vão chegar do servidor um dia, e não por
 * coordenada de tela. */
const EXEMPLO_FILA = [
  { id: 1, nome: "Enviesados.pdf", estado: "trabalhando", etapa: "convertendo", progresso: 85 },
  { id: 2, nome: "Inviesados.pdf", estado: "erro", etapa: "a conversão", motivo: "Formato não reconhecido" },
  { id: 3, nome: "Another.pdf", estado: "pronto", digitalizado: true },
];

const EXEMPLO_ESTANTE = [1, 2, 3, 4, 1, 2, 3, 4].map((n, i) => ({
  chave: i, titulo: "Estudo de viabilidade", autor: "Ana Duarte", notas: 24,
  capa: `/capas/exemplo-${n}.png`,
}));

const EXEMPLO_FICHA = {
  titulo: "Estudo de Viabilidade", autor: "Ana Duarte", formato: "Epub",
  lido: 80, notas: 24,
  amostra: "“…última nota destacada aparece aqui como amostra do pensamento…”",
  etiquetas: ["#Design"],
};

const EXEMPLO_LEITURA = {
  titulo: "Enviesados",
  autor: "Ana Duarte",
  paragrafos: [
    {
      texto:
        "Certa vez, em minha contínua busca por Jeeps Willys — carro militar americano antigo produzido a partir da década de 40 e usado durante a Segunda Guerra Mundial, pelo qual sou um grande admirador por seu design e importância na história do automóvel — passei por várias cidades do interior do Brasil, onde pude encontrar alguns raros Jeeps em suas variadas formas, cores, configurações, e níveis de conservação.",
      destaques: [{ de: 0, ate: 63, cor: "verde" }],
    },
    {
      texto:
        "Há uns meses antes dessa nova busca, eu já havia encontrado um Willys CJ5 verde empoeirado e silenciosamente guardado em um estacionamento em uma pequena cidade próxima à minha. Para a minha felicidade, hoje ele está guardado a salvo na minha garagem.",
      destaques: [{ de: 176, ate: 246, cor: "amarelo" }],
    },
    {
      texto:
        "Mesmo que satisfeito por ter um lindo CJ5, não pude deixar de me apaixonar por um Willys CJ6 (conhecido como “Bernardão”) de um azul tão cristalino, que me fez ficar boquiaberto quando o vi pessoalmente: “Esse é meu!”.",
      destaques: [{ de: 124, ate: 178, cor: "azul" }],
    },
    {
      texto:
        "O simpático senhor o anunciara por R$ 22 mil. Para seu estado de conservação, era um excelente valor. Eu o compraria sem pensar. Mas, não.",
      destaques: [{ de: 101, ate: 138, cor: "rosa" }],
    },
  ],
};

/* O passo pode vir da URL: `?passo=leitura`.
 *
 * Não é atalho de conveniência — é o que faz o PORTÃO conseguir medir cada tela
 * direto. Sem isso ele precisa clicar pela jornada inteira para chegar na
 * última, o que amarra a medição da estante ao funcionamento do upload: uma
 * falha no backend viraria "a estante tem defeito de contraste".
 *
 * Cada tela medível sozinha é a diferença entre um portão que diz ONDE está o
 * problema e um que só diz que existe. */
const PASSOS = ["vazia", "cheia", "estante", "leitura"];

function passoInicial() {
  const p = new URLSearchParams(location.search).get("passo");
  return PASSOS.includes(p) ? p : "vazia";
}

export function App() {
  const [passo, setPasso] = useState(passoInicial);
  const [aberto, setAberto] = useState(null);
  const { arquivos, livros, backend, receber, carregarEstante } = useJornada();

  useEffect(() => {
    if (passo === "estante") carregarEstante();
  }, [passo, carregarEstante]);

  // A tela avança sozinha quando o primeiro arquivo entra: quem soltou um
  // arquivo não deveria precisar clicar de novo para ver o que aconteceu com ele.
  useEffect(() => {
    if (arquivos.length && passo === "vazia") setPasso("cheia");
  }, [arquivos.length, passo]);

  /* Sem backend, a fila e a estante ficariam vazias e a tela pareceria quebrada
   * em vez de desconectada. O exemplo entra SÓ quando a URL pede um passo
   * direto, para medição e para olhar — nunca no caminho normal. */
  const pediuDireto = new URLSearchParams(location.search).has("passo");
  const filaVisivel = arquivos.length || !pediuDireto ? arquivos : EXEMPLO_FILA;
  const estanteVisivel = livros.length || !pediuDireto ? livros : EXEMPLO_ESTANTE;

  if (passo === "vazia") {
    return <MesaVazia aoReceberArquivos={receber} backend={backend} />;
  }
  if (passo === "cheia") {
    return <MesaCheia arquivos={filaVisivel} aoVerEstante={() => setPasso("estante")} />;
  }
  if (passo === "estante") {
    return <Estante livros={estanteVisivel} selecionado={EXEMPLO_FICHA} aoAbrir={() => setPasso("leitura")} />;
  }
  return <Leitura livro={aberto ?? EXEMPLO_LEITURA} />;
}
