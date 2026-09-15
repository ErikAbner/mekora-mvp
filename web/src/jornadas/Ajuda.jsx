/* Ajuda — por tarefa, e não por índice. Do nó 895:11193.
 *
 * A PRIMEIRA VERSÃO DESTA TELA ERA POR ASSUNTO, e o desenho decide o contrário:
 * quatro tarefas em destaque no topo — conectar o Kindle, preparar o primeiro
 * arquivo, o envio que não chegou, os dois modos —, e só abaixo delas a lista
 * por categoria. O próprio changelog do produto já tinha essa decisão escrita:
 * *"Ajuda por tarefa, não por índice."*
 *
 * A diferença não é de arrumação. Quem abre a ajuda está tentando FAZER alguma
 * coisa, e um índice pede que ela primeiro descubra em que categoria o problema
 * dela mora.
 *
 * O QUE NÃO ENTROU, E POR QUÊ: o desenho tem um campo de busca abaixo do
 * título. A busca do produto não existe — o próprio cabeçalho traz o botão
 * desligado dizendo isso —, e uma busca que só olha esta página encontraria
 * menos do que a página mostra inteira. Fica de fora até haver busca de
 * verdade.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Campo } from "../componentes/Campo.jsx";
import { achatar } from "../../../contrato/texto.js";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import { GavetaDeSecao } from "../componentes/GavetaDeSecao.jsx";
import "./ajuda.css";

/* As quatro tarefas do desenho. Cada uma leva ao lugar onde ela se faz — o
 * botão não abre um artigo sobre a tarefa, abre a tarefa. */
const TAREFAS = [
  {
    n: 1,
    titulo: "Conectar meu Kindle",
    diz: "Encontrar o endereço do aparelho e autorizar o Mekora a enviar. Leva dois minutos e só se faz uma vez.",
    acao: "Começar",
    rota: "/conta/kindle",
  },
  {
    n: 2,
    titulo: "Preparar meu primeiro arquivo",
    diz: "Solte um PDF, veja o que o Mekora encontrou e confirme uma vez.",
    acao: "Ir para a Mesa",
    rota: "/mesa",
  },
  {
    n: 3,
    titulo: "Meu envio não chegou",
    diz: "Quase sempre é o remetente não autorizado: a Amazon recusa em silêncio.",
    acao: "Ver o que fazer",
    rota: "/conta/kindle",
  },
  {
    n: 4,
    titulo: "Quando usar cada modo",
    diz: "A diferença entre Guiado e Personalizado, e quando vale trocar.",
    acao: "Entender",
    rota: "/conta/preferencias",
  },
];

/* Pergunta e resposta CURTA, do jeito do desenho: a resposta cabe na linha de
 * baixo. Quando ela não couber, o lugar dela é a tela que responde, e não um
 * parágrafo aqui. */
const CATEGORIAS = [
  {
    titulo: "Formatos",
    itens: [
      { p: "Por que alguns PDFs precisam de OCR", r: "Porque neles não existe texto; existe foto de texto.", detalhes: ["O OCR reconhece as letras dessas imagens para permitir busca, seleção e leitura adaptável.", "Nomes próprios, tabelas e páginas tortas merecem uma conferência no preparo: são os pontos em que o reconhecimento costuma ter mais dúvida."] },
      { p: "PDF, EPUB e a diferença que importa", r: "O EPUB se ajusta à tela. O PDF tem tamanho fixo.", detalhes: ["No PDF, posição, coluna e tamanho pertencem à página. No EPUB, o texto se reorganiza conforme a tela, a fonte e a entrelinha escolhidas.", "O Mekora preserva o original e cria um arquivo de leitura separado; converter não substitui nem altera o PDF enviado."] },
      { p: "CBZ, CBR e pastas de imagens", r: "São quadrinhos: um monte de imagem em ordem.", detalhes: ["A ordem vem dos nomes dos arquivos. Se ela aparecer como 1, 10, 2, use números com zeros — 001, 002, 010 — ou ajuste as páginas no modo Personalizado.", "Imagens muito estreitas, duplas ou com margens incomuns devem ser revistas antes da conversão."] },
    ],
  },
  {
    titulo: "Entenda o processo",
    itens: [
      { p: "O que acontece com os arquivos durante o processamento", r: "O original fica guardado, e o conteúdo não é lido por ninguém.", detalhes: ["O servidor extrai estrutura, imagens e texto para montar a versão de leitura. Processamento automático não significa revisão humana do conteúdo.", "A tela de privacidade mostra quais cópias existem e como removê-las junto com o livro."], onde: { rota: "/conta/privacidade", diz: "Ver o que está guardado" } },
      { p: "Por que não mostramos porcentagem", r: "Porque na maior parte das etapas ela seria inventada.", detalhes: ["Quando há páginas contáveis, a barra usa páginas concluídas. Em tarefas sem unidade confiável, o Mekora mostra a etapa atual em vez de fingir uma precisão.", "Se o nome da etapa continuar igual por muito tempo, volte à Mesa: ali aparecem bloqueios, erros e a ação para tentar de novo."] },
      { p: "Posso fechar a aba no meio?", r: "Pode. O preparo não é feito no seu computador.", detalhes: ["O trabalho continua no servidor. Ao voltar, procure o mesmo arquivo na Mesa; não é necessário enviar outra cópia.", "Se ele precisar de senha ou de uma decisão sua, aparecerá em “Precisa de você”."] },
    ],
  },
  {
    titulo: "Resolver problemas",
    itens: [
      { p: "Mandei para o Kindle e não chegou", r: "Quase sempre é o remetente não autorizado.", detalhes: ["Confirme se o endereço remetente do Mekora está na lista aprovada da Amazon e se o e-mail do aparelho foi copiado sem espaços.", "Depois de corrigir, envie novamente. A Amazon pode levar alguns minutos; uma recusa registrada aparece na Mesa."], onde: { rota: "/conta/kindle", diz: "Conferir Kindle e remetente" } },
      { p: "O arquivo não abre", r: "Costuma ser senha ou download interrompido.", detalhes: ["PDF protegido aparece em “Precisa de você” para receber a senha uma única vez. O Mekora não guarda essa senha.", "Se não houver pedido de senha, baixe novamente o arquivo de origem e compare o tamanho antes de reenviar; uma cópia truncada não pode ser reconstruída."] },
      { p: "A capa não apareceu", r: "Se o arquivo não tinha capa, o Mekora monta uma.", detalhes: ["A capa de reserva usa título, autor e formato para o livro não virar um buraco na estante.", "Antes de enviar ao Kindle, abra “Ver capa proposta” na Mesa e confira se título e autoria identificam o arquivo corretamente."] },
      { p: "As páginas estão fora de ordem", r: "Acontece em quadrinho quando os nomes não têm número.", detalhes: ["Arquivos 1, 2 e 10 podem ser ordenados de maneira diferente conforme a origem. Nomes 001, 002 e 010 eliminam a ambiguidade.", "No modo Personalizado, revise a sequência antes de converter; o original permanece intacto."] },
    ],
  },
  {
    titulo: "Avançado",
    itens: [
      { p: "Quando usar o Guiado e quando usar o Personalizado", r: "No Guiado você confirma. No Personalizado você ajusta.", detalhes: ["Use Guiado quando título, autoria, capa e ordem estiverem corretos. Ele reduz decisões repetidas.", "Use Personalizado quando o arquivo vier de scanner, tiver páginas fora de ordem, metadados ruins ou quando você quiser rever cada escolha."], onde: { rota: "/conta/preferencias", diz: "Escolher o modo padrão" } },
      { p: "Organizar as páginas na mão", r: "Não é etapa obrigatória, e nunca vai ser.", detalhes: ["Faça isso apenas quando a prévia mostrar uma sequência errada, páginas duplicadas ou material que não deveria entrar no livro.", "A alteração vale para a cópia convertida; o arquivo original não é reescrito."] },
      { p: "Tradução", r: "Gera um segundo arquivo. O original fica intacto.", detalhes: ["Escolha origem e destino no preparo. A versão traduzida fica separada para você poder comparar e voltar ao texto original.", "Tradução automática pode errar termos técnicos, nomes e trechos ambíguos; revise essas partes antes de usar a versão como referência."] },
    ],
  },
];

export function Ajuda() {
  /* A BUSCA DA AJUDA — o campo do nó 895:11193, logo abaixo do título.
   *
   * Ele não existia, e a página tem vinte e uma perguntas em quatro
   * categorias: quem chega com uma dúvida específica lê as vinte para achar a
   * dela. A trilha de categorias ajuda quem sabe em qual delas procurar, que é
   * justamente o que quem tem um problema não sabe.
   *
   * A busca é NA PÁGINA, e não no servidor: as perguntas estão todas aqui,
   * escritas neste arquivo. Pedir ao backend seria uma volta pela rede para
   * filtrar uma lista que já está na memória.
   */
  const [procura, setProcura] = useState("");
  const alvo = achatar(procura.trim());

  const categorias = alvo
    ? CATEGORIAS.map((c) => ({
        ...c,
        itens: c.itens.filter((i) => achatar(`${i.p} ${i.r} ${(i.detalhes ?? []).join(" ")}`).includes(alvo)),
      })).filter((c) => c.itens.length)
    : CATEGORIAS;

  const quantas = categorias.reduce((n, c) => n + c.itens.length, 0);

  return (
    <div className="mesa chao">
      <Cabecalho />
      <GavetaDeSecao titulo="Ajuda e recursos">
      <div className="ajuda-folha">
      <main className="ajuda">
        <header className="ajuda-topo">
          <h1>Por onde você quer começar</h1>
          <Campo
            tipo="search"
            rotulo="Buscar na Ajuda"
            rotuloOculto
            placeholder="Buscar na Ajuda"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
          />
          {/* O resultado é dito, e não só mostrado: quem filtrou precisa saber
              que a lista encurtou de propósito — e quem usa leitor de tela não
              vê a lista encurtar. */}
          {alvo && (
            <p className="ajuda-resultado" role="status">
              {quantas === 0
                ? `Nenhuma pergunta com “${procura.trim()}”. A lista inteira volta apagando a busca.`
                : `${quantas} ${quantas === 1 ? "pergunta" : "perguntas"} com “${procura.trim()}”.`}
            </p>
          )}
        </header>

        <ul className="ajuda-tarefas">
          {TAREFAS.map((t) => (
            <li key={t.n}>
              {/* O número é figura: o `<ol>` numeraria de novo para quem ouve, e
                  "1 1 Conectar meu Kindle" é o que sai disso. */}
              {/* OS DOIS GRUPOS DO NÓ (`895:11255` e `966:27948`): o algarismo
                  solto, e abaixo dele um bloco com o par título+texto e o botão.
                  Isso não é arrumação por arrumação — os vãos do desenho são 40
                  do algarismo até o título, 24 do título até o texto e 40 até o
                  botão, e uma coluna só, de vão único, não sabe dizer três
                  números diferentes. */}
              <span className="ajuda-numero" aria-hidden="true">{t.n}</span>
              <div className="ajuda-tarefa-corpo">
                <div className="ajuda-tarefa-dizer">
                  <h2>{t.titulo}</h2>
                  <p>{t.diz}</p>
                </div>
                <Link to={t.rota} className="botao primaria">{t.acao}</Link>
              </div>
            </li>
          ))}
        </ul>

        <div className="ajuda-corpo">
          {/* A trilha repete os títulos das categorias como âncoras. É navegação
              dentro da página, e não um segundo menu: cada item leva ao bloco
              que já está abaixo. */}
          <nav className="ajuda-trilha" aria-label="Categorias da ajuda">
            <ul>
              {categorias.map((c) => (
                <li key={c.titulo}>
                  <a href={`#${c.titulo.toLowerCase().replace(/\s+/g, "-")}`}>{c.titulo}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ajuda-listas">
            {categorias.map((c) => (
              <section
                key={c.titulo}
                className="ajuda-categoria"
                id={c.titulo.toLowerCase().replace(/\s+/g, "-")}
              >
                <h2>{c.titulo}</h2>
                <ul>
                  {c.itens.map((i) => (
                    <li key={i.p}>
                      <details>
                        <summary>
                          <span className="ajuda-pergunta">{i.p}</span>
                          <span className="ajuda-resposta-curta">{i.r}</span>
                        </summary>
                        <div className="ajuda-resposta-completa">
                          {(i.detalhes ?? []).map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
                          {i.onde && <Link to={i.onde.rota}>{i.onde.diz}</Link>}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <section className="ajuda-resto">
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
      </GavetaDeSecao>
    </div>
  );
}
