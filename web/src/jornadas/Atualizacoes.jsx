/* Atualizações — o que mudou, na língua de quem usa.
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
 * Construída sem o desenho: o `figma-local` exige o Dev Mode ligado, e a aba
 * estava em modo design.
 */
import { Link } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import "./atualizacoes.css";

/* Data em ISO, e formatada na tela: escrita "1 de setembro" ela não ordena, e
 * ordenar à mão é como a lista sai de ordem sem ninguém ver. */
const MUDANCAS = [
  {
    data: "2026-09-01",
    itens: [
      {
        titulo: "Dá para sair de outro navegador à distância",
        diz: "A conta passou a listar onde você está logado, com quando cada navegador foi usado por último. Um computador emprestado ou um celular perdido não precisa mais estar na sua mão para você sair dele.",
        onde: { rota: "/conta/seguranca", diz: "Ver onde estou logado" },
      },
      {
        titulo: "A preparação mostra o que está fazendo",
        diz: "Antes o arquivo era enviado para converter e a tela voltava para a Mesa no mesmo instante — um PDF de trezentas páginas levava minutos sem dizer nada. Agora a tela fica, diz a etapa, e avisa quando o servidor não informa quanto falta.",
        onde: { rota: "/", diz: "Preparar um arquivo" },
      },
      {
        titulo: "A tela de preparação parou de afirmar o que não sabia",
        diz: "Ela dizia “nenhuma página corrompida, N de N abriram sem erro”, e nada no servidor responde isso. Agora ela diz o que a análise realmente encontrou.",
      },
      {
        titulo: "A conta ganhou uma visão geral",
        diz: "O menu da conta prometia quatro páginas e duas abriam a mesma coisa: “Conta” levava para Dispositivos Kindle. Agora ela existe, com o que a sua conta guarda.",
        onde: { rota: "/conta", diz: "Ver minha conta" },
      },
      {
        titulo: "As telas cabem no celular",
        diz: "O cabeçalho tinha largura fixa e empurrava toda tela de dentro para fora do visor — a página ganhava rolagem lateral em nove lugares diferentes. Não ganha mais.",
      },
    ],
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
          <p>
            O que mudou no Mekora, com o lugar onde cada mudança pode ser vista.
            Correção pequena e arrumação interna não entram — só o que muda o que
            você consegue fazer.
          </p>
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
                  <h3>{i.titulo}</h3>
                  <p>{i.diz}</p>
                  {i.onde && <Link to={i.onde.rota}>{i.onde.diz}</Link>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <Rodape />
    </div>
  );
}
