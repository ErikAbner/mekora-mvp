/* A jornada inteira num lugar só, para poder ser percorrida de ponta a ponta.
 *
 * A Fase 1 do plano não pede uma biblioteca de componentes: pede UMA JORNADA que
 * o usuário faz inteira. Enquanto não existe roteamento nem servidor, o passo é
 * estado local — o que importa agora é que as três telas existam LIGADAS, e não
 * que a navegação seja definitiva.
 */
import { useState } from "react";
import { MesaVazia } from "./jornadas/MesaVazia.jsx";
import { MesaCheia } from "./jornadas/MesaCheia.jsx";
import { Estante } from "./jornadas/Estante.jsx";

/* Dados de exemplo com os nomes do desenho. Ficam aqui, e não dentro da tela,
 * porque tela que carrega o próprio dado não se prova com outro. */
const ARQUIVOS = [
  { nome: "Enviesados.pdf", estado: "enviando", feito: 16, total: 24, progresso: 85, detalhe: "Pronto em 3 segundos" },
  { nome: "Inviesados.pdf", estado: "erro", progresso: 85, detalhe: "Interrompido" },
  { nome: "Another.pdf", estado: "pronto", detalhe: "Na estante" },
];

const LIVROS = [1, 2, 3, 4, 1, 2, 3, 4].map((n, i) => ({
  titulo: "Estudo de viabilidade",
  autor: "Ana Duarte",
  notas: 24,
  capa: `/capas/exemplo-${n}.png`,
  chave: i,
}));

const SELECIONADO = {
  titulo: "Estudo de Viabilidade",
  autor: "Ana Duarte",
  formato: "Epub",
  lido: 80,
  notas: 24,
  amostra: "“…última nota destacada aparece aqui como amostra do pensamento…”",
  etiquetas: ["#Design"],
};

const PASSOS = { vazia: 0, cheia: 1, estante: 2 };

export function App() {
  const [passo, setPasso] = useState("vazia");
  if (passo === "vazia") return <MesaVazia aoEscolherArquivos={() => setPasso("cheia")} />;
  if (passo === "cheia") return <MesaCheia arquivos={ARQUIVOS} aoVerEstante={() => setPasso("estante")} />;
  return <Estante livros={LIVROS} selecionado={SELECIONADO} />;
}
