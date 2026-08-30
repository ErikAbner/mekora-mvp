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
import { useJornada } from "./estado/useJornada.js";

export function App() {
  const [passo, setPasso] = useState("vazia");
  const { arquivos, livros, backend, receber, carregarEstante } = useJornada();

  useEffect(() => {
    if (passo === "estante") carregarEstante();
  }, [passo, carregarEstante]);

  // A tela avança sozinha quando o primeiro arquivo entra: quem soltou um
  // arquivo não deveria precisar clicar de novo para ver o que aconteceu com ele.
  useEffect(() => {
    if (arquivos.length && passo === "vazia") setPasso("cheia");
  }, [arquivos.length, passo]);

  if (passo === "vazia") {
    return <MesaVazia aoReceberArquivos={receber} backend={backend} />;
  }
  if (passo === "cheia") {
    return <MesaCheia arquivos={arquivos} aoVerEstante={() => setPasso("estante")} />;
  }
  return <Estante livros={livros} />;
}
