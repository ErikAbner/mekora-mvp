/* Conta — preferências.
 *
 * Vem do nó 895:10715. É a primeira tela que testa se os componentes do design
 * system servem, e a resposta está em DESVIOS.md: **não servem para esta**. Ela
 * é feita de seis grupos de escolha, e não existe rádio, caixa de marcar nem
 * interruptor entre os onze componentes construídos.
 *
 * As preferências são DERIVADAS de um estado só, e cada uma diz o que muda. A
 * regra do produto vale aqui como em qualquer lugar: o produto diz o que faz, e
 * não promete o que não faz — "Vale para os próximos arquivos. Nada muda no que
 * já está preparado ou em preparo" é a frase do desenho, e ela é boa porque pode
 * ser desmentida.
 */
import { useState } from "react";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Escolha } from "../componentes/Escolha.jsx";
import { TrilhaConta } from "../componentes/TrilhaConta.jsx";
import "./conta.css";

/* As preferências, com o padrão de cada uma. Ficam aqui e não dentro do
 * componente porque um dia vêm do backend — e aí muda a fonte, não a tela. */
const GRUPOS = [
  {
    secao: "Experiência",
    escolhas: [
      {
        id: "modo",
        titulo: "Modo ao abrir um arquivo",
        explicacao: "Vale para os próximos arquivos. Nada muda no que já está preparado ou em preparo.",
        padrao: "guiado",
        opcoes: [
          { id: "guiado", rotulo: "Guiado", detalhe: "O Mekora decide, mostra a decisão em texto e pede confirmação uma vez." },
          { id: "personalizado", rotulo: "Personalizado", detalhe: "Abre com controles à vista, já preenchidos com o que o Guiado faria." },
        ],
      },
      {
        id: "dicas",
        titulo: "Dicas de primeiro uso",
        padrao: "uteis",
        opcoes: [
          { id: "uteis", rotulo: "Aparecem quando são úteis", detalhe: "Somem sozinhas depois que você faz a coisa uma vez." },
          { id: "nunca", rotulo: "Não mostrar", detalhe: "Dá para reativar em Ajuda e recursos." },
        ],
      },
    ],
  },
  {
    secao: "Arquivos e resultados",
    escolhas: [
      {
        id: "quando-pronto",
        titulo: "Quando um arquivo fica pronto",
        padrao: "avisar",
        opcoes: [
          { id: "avisar", rotulo: "Não baixar sozinho", detalhe: "Você é avisado na Mesa e decide." },
          { id: "baixar", rotulo: "Baixar quando ficar pronto", detalhe: "O navegador pode perguntar onde salvar a cada vez." },
        ],
      },
      {
        id: "formato",
        titulo: "Formato de saída",
        padrao: "pelo-arquivo",
        opcoes: [
          { id: "pelo-arquivo", rotulo: "Decidir pelo arquivo", detalhe: "Texto vira EPUB; quadrinho vira arquivo de imagem no tamanho do aparelho." },
          { id: "sempre-epub", rotulo: "Sempre EPUB", detalhe: "Mesmo em quadrinho, o que costuma piorar o resultado." },
        ],
      },
    ],
  },
  {
    secao: "Interface",
    escolhas: [
      {
        id: "movimento",
        titulo: "Movimento",
        explicacao: "Não é decoração: o movimento explica de onde uma tela veio, no canvas e nas folhas que abrem por cima.",
        padrao: "sistema",
        opcoes: [
          { id: "sistema", rotulo: "Seguir o sistema", detalhe: "Respeita a preferência de redução de movimento do seu computador." },
          { id: "reduzido", rotulo: "Reduzido", detalhe: "Transições viram troca imediata. Nada se move." },
          { id: "completo", rotulo: "Completo", detalhe: "Mesmo se o sistema pedir redução." },
        ],
      },
      {
        id: "tema",
        titulo: "Tema",
        padrao: "claro",
        opcoes: [
          { id: "claro", rotulo: "Claro" },
          { id: "escuro", rotulo: "Escuro" },
        ],
      },
    ],
  },
];

const PADROES = Object.fromEntries(
  GRUPOS.flatMap((g) => g.escolhas).map((e) => [e.id, e.padrao]),
);

export function Conta({ pessoa , aoSair }) {
  const [pref, setPref] = useState(PADROES);

  return (
    <div className="mesa">
      <Cabecalho />
      <div className="conta">
        <TrilhaConta pessoa={pessoa} aoSair={aoSair} aqui="preferencias" />

        <main className="conta-painel">
          {GRUPOS.map((g) => (
            <section key={g.secao} className="conta-secao">
              <h2>{g.secao}</h2>
              <div className="conta-escolhas">
                {g.escolhas.map((e) => (
                  <Escolha
                    key={e.id}
                    nome={e.id}
                    titulo={e.titulo}
                    explicacao={e.explicacao}
                    opcoes={e.opcoes}
                    valor={pref[e.id]}
                    aoTrocar={(v) => setPref((p) => ({ ...p, [e.id]: v }))}
                  />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
