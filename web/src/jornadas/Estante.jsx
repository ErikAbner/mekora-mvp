/* Estante — grade. O fim da jornada: o arquivo virou livro.
 *
 * Vem do nó 895:7315. Aqui a jornada fecha: o que entrou pela Mesa aparece como
 * objeto na estante, com autor, contagem de notas e o ponto onde a leitura
 * parou.
 *
 * Duas regras do sistema aparecem juntas nesta tela:
 *
 * O FILTRO É NOMEADO, e não um eixo repetido. "Tudo · Com nota · No Kindle ·
 * Quadrinhos" são recortes que a grade não mostra sozinha — um recorte não pode
 * repetir o eixo da vista.
 *
 * A TAG É PÍLULA, e por regra: `--rp` é de dado — tag, chip, trilho,
 * interruptor. Pílula e círculo são os 5% que quebram a retidão, e funcionam por
 * serem raros.
 */
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { espessuraMm, espessuraPx } from "../../../contrato/lombada.js";
import { TrilhaLinhas } from "../componentes/TrilhaLinhas.jsx";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Rodape } from "../componentes/Rodape.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { DESTAQUES } from "./Leitura.jsx";
import "./estante.css";
import { CapaDeReserva } from "../componentes/CapaDeReserva.jsx";

const marcador = "/icones/marcador-notas.svg";
const RECORTES = [
  { id: "tudo", rotulo: "Tudo", cabe: () => true },
  { id: "nota", rotulo: "Com nota", cabe: (l) => (l.notas ?? 0) > 0 },
  { id: "kindle", rotulo: "No Kindle", cabe: (l) => !!l.noKindle },
  { id: "quadrinho", rotulo: "Quadrinhos", cabe: (l) => !!l.quadrinho },
];

/* Onde a leitura está, em palavras que o produto pode sustentar.
 *
 * A PORCENTAGEM PASSOU A EXISTIR. Este comentário dizia "não devolve
 * porcentagem: o servidor não conhece o tamanho do texto" — e a primeira metade
 * continua verdadeira. A conclusão é que estava errada: o CLIENTE conhece, o
 * EPUB é aberto nele, e a extensão de cada capítulo vem do índice do zip sem
 * custo nenhum. Agora ele calcula e grava, e aqui é só mostrar.
 *
 * O "capítulo N de M" continua como plano B, para livro cuja leitura foi
 * registrada antes disso. E ele não é equivalente: num livro com prefácio de
 * vinte páginas e dois capítulos de quinhentas, terminar o prefácio marcava um
 * terço lido, e o número real é dois por cento.
 *
 * `null` quando ninguém abriu, e a linha não mostra nada — em vez de "0% lido",
 * que afirma algo sobre uma leitura que não começou. */
function onde(l) {
  if (typeof l.fracao === "number") {
    if (l.fracao >= 1) return "lido";
    const pct = Math.floor(l.fracao * 100);
    /* Arredonda para BAIXO, e nunca diz "lido" antes do fim: 99,6% virando
     * "100%" faz quem abre o livro encontrar um capítulo inteiro pela frente. */
    return pct <= 0 ? "começou" : `${pct}% lido`;
  }
  if (!l.capitulos) return null;
  if (l.capitulo + 1 >= l.capitulos) return "no último capítulo";
  return `capítulo ${l.capitulo + 1} de ${l.capitulos}`;
}

/* A ESTANTE EM 3D — livros DEITADOS, empilhados na vertical.
 *
 * A primeira versão os pôs EM PÉ, lado a lado, como numa prateleira de livraria.
 * O nó `895:7506` mostra o contrário: uma pilha, vista de lado e de cima, com o
 * livro escolhido maior e à frente e os outros recuando atrás dele.
 *
 * A diferença não é de gosto. Em pé, a espessura vira largura e uma estante de
 * cinquenta livros não cabe na tela; deitados, a espessura vira ALTURA da fatia
 * e a pilha cresce para baixo — que é a direção em que a página já rola.
 *
 * A colheita no GitHub de 31/08 continua valendo aqui: a espessura sai de
 * `contrato/lombada.js`, em milímetros de papel, e o título é legível na
 * superfície rotacionada. O que mudou foi a orientação, não a conta.
 *
 * SEM Three.js: são retângulos com `rotateX`, e um canvas traria uma árvore que
 * leitor de tela não percorre.
 */
const ALTURA_LOMBADA = 297;   // a "capa" de referência, para a escala da espessura

function Estante3D({ livros, selecionado, aoEscolher }) {
  return (
    <div className="pilha-caixa">
      {/* O ÍNDICE À ESQUERDA É O `LineSidebar`, e não uma lista à mão.
          O Erik trouxe o componente e disse onde ele vive: é a navegação da
          estante em 3D e da maior parte das navegações do projeto. O que eu
          tinha escrito aqui era uma aproximação dele — traços de comprimento
          fixo e nenhuma resposta ao cursor. */}
      <TrilhaLinhas
        rotulo="Os livros da pilha"
        itens={livros.map((l) => l.titulo)}
        ativo={livros.findIndex((l) => l.chave === selecionado?.chave)}
        aoEscolher={(i) => aoEscolher?.(livros[i])}
        className="pilha-indice"
      />

      <ul className="pilha">
        {livros.map((l, ordem) => {
          const px = espessuraPx(l.paginas, ALTURA_LOMBADA);
          const mm = espessuraMm(l.paginas);
          const escolhido = l.chave === selecionado?.chave;
          return (
            /* AS DUAS VARIÁVEIS FICAM NO `<li>`, e não no botão.
               `--espessura` desce por herança e serve igual lá dentro. `--ordem`
               PRECISA estar aqui: quem empilha é o `<li>` — ele tem a margem
               negativa e é irmão dos outros —, e propriedade custom só herda
               para baixo. Com ela no botão, todo `<li>` lia o valor padrão zero,
               os seis ficavam com o mesmo `z-index` e a ordem do DOM decidia:
               o livro de baixo cobria a lombada do de cima, que é o defeito que
               o Erik descreveu em 04/09. */
            <li key={l.chave} style={{ "--espessura": `${px ?? 2}px`, "--ordem": ordem }}>
              <button
                type="button"
                className={`livro-deitado${escolhido ? " escolhido" : ""}`}
                onClick={() => aoEscolher?.(l)}
                aria-label={
                  mm === null
                    ? `${l.titulo}, de ${l.autor || "autor desconhecido"} — espessura desconhecida`
                    : `${l.titulo}, de ${l.autor || "autor desconhecido"} — ${Math.round(mm)} milímetros`
                }
                title={mm === null ? "O arquivo não trouxe contagem de páginas" : undefined}
              >
                {/* A face de cima — o corte das páginas. Um livro deitado
                    mostra o papel por cima; a capa fica embaixo, contra a mesa.
                    Eu já tinha posto a capa aqui uma vez, e a imagem espremida
                    numa faixa girada virava mancha listrada sobre o título do
                    livro de baixo. */}
                <span className="deitado-topo" aria-hidden="true" />
                {/* A frente da fatia. A altura dela é a espessura do livro. */}
                <span className="deitado-lombada" aria-hidden="true">
                  {/* O TÍTULO SÓ APARECE NO ESCOLHIDO, e de pé na borda
                      esquerda — é o que o 895:7506 mostra. Antes ele estava
                      dentro de TODAS as fatias, deitado: numa pilha de seis, os
                      títulos se cruzavam porque a altura de cada fatia é a
                      espessura do livro, e um livro de 88 páginas não tem altura
                      para uma linha de texto. Os nomes moram na trilha ao lado.

                      O bloco escuro na ponta direita é o marcador do desenho. */}
                  {escolhido && <span className="deitado-titulo">{l.titulo}</span>}
                  {escolhido && <span className="deitado-marca" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Livro({ chave, titulo, autor, formato, estado, notas, capa, aoEscolher, escolhido }) {
  return (
    <li className={`livro${escolhido ? " escolhido" : ""}`}>
      {/* O livro inteiro é o alvo do clique, e é um `button` de verdade: o
          teclado chega nele, o leitor de tela o anuncia como ação, e o Enter
          funciona. Um `div` com `onClick` pareceria igual e não seria. */}
      <button
        type="button"
        className={`livro-alvo${escolhido ? " escolhido" : ""}`}
        onClick={() => aoEscolher?.()}
        aria-pressed={escolhido ? "true" : "false"}
      >
        <span className="visualmente-oculto">{titulo}{autor ? `, de ${autor}` : ""}</span>
      </button>
      <div className="capa-caixa">
        {/* O MARCADOR VEM ANTES DA CAPA, e é isso que o põe ATRÁS dela.
            O nó 895:7386 é um irmão do 895:7389 com `mb: -13px` — o livro é
            pintado por cima, e do marcador só sobra a ponta acima da capa.
            A versão anterior o punha absoluto com `z-index: 1`, na frente: a
            etiqueta pousava sobre a capa em vez de sair de dentro do livro. */}
        {notas > 0 && (
          <span
            className="marcador"
            style={{ maskImage: `url(${marcador})`, WebkitMaskImage: `url(${marcador})` }}
          >
            <span className="marcador-numero dado">{notas}</span>
          </span>
        )}
        {/* Livro sem capa não vira buraco: a caixa fica, com o título dentro.
            Uma grade com lacunas parece defeito de carregamento. */}
        {capa ? (
          <img src={capa} alt={`Capa de ${titulo}`} className="capa" />
        ) : (
          <CapaDeReserva className="capa" titulo={titulo} autor={autor} formato={formato} chave={chave} />
        )}
      </div>
      <div className="livro-texto">
        {/* `title` porque o nome para em duas linhas no CSS: cortar sem deixar
            como ler seria esconder o livro em vez de resumir o nome dele. */}
        <h3 title={titulo}>{titulo}</h3>
        {/* ONDE O LIVRO PRONTO DIZ O AUTOR, O ARQUIVO EM PREPARO DIZ O ESTADO.
            Mesmo lugar, mesma tipografia, sem selo novo nem cor nova: a linha
            já existia e estava vazia nesse cartão. E responde à pergunta que a
            pessoa tem ANTES de clicar — "posso ler isto agora?" */}
        <p>{estado && estado !== "pronto" ? "Em preparo" : autor}</p>
      </div>
    </li>
  );
}

export function Estante({ livros = [], selecionado, aoAbrir, aoEscolher }) {
  /* OS RECORTES FILTRAM AGORA.
   *
   * Eram quatro botões sem `onClick`, com "Tudo" marcado por `aria-pressed={i === 0}`
   * — um valor fixo, então nem a marcação mudava. Quatro alvos que respondiam ao
   * clique com nada, o que é lido como produto quebrado e não como recurso
   * ausente.
   *
   * A contagem ao lado de cada um vem da mesma lista que ele filtra: assim um
   * recorte vazio se anuncia antes de ser clicado, em vez de levar a uma estante
   * em branco sem explicação. */
  const [recorte, setRecorte] = useState("tudo");
  /* O funil do telefone (nó 964:24606): abre os mesmos recortes que o computador
     mostra em linha. */
  const [filtrando, setFiltrando] = useState(false);
  /* A vista começa em "capas", e não em 3D: quem abre a estante quer achar o
   * livro, e a capa de frente é o que se reconhece de longe. A estante de pé é
   * para olhar o acervo, que é outra coisa e vem por escolha. */
  const [vista, setVista] = useState("capas");
  const regra = RECORTES.find((r) => r.id === recorte) ?? RECORTES[0];
  const mostrados = livros.filter(regra.cabe);
  return (
    <div className="mesa">
      <Cabecalho lugar="estante" />

      <Folha
        aberta={filtrando}
        titulo="Mostrar na estante"
        aoFechar={() => setFiltrando(false)}
      >
        <nav className="estante-filtros" aria-label="Recortes da estante">
          {RECORTES.map((r) => {
            const quantos = livros.filter(r.cabe).length;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === recorte ? "true" : "false"}
                disabled={quantos === 0 && r.id !== "tudo"}
                title={quantos === 0 && r.id !== "tudo" ? `Nenhum livro em ${r.rotulo.toLowerCase()}` : null}
                onClick={() => { setRecorte(r.id); setFiltrando(false); }}
              >
                <span>{r.rotulo}</span>
                <span className="dado">{quantos}</span>
              </button>
            );
          })}
        </nav>
      </Folha>

      <section className="estante">
        <div className="estante-grade">
          {/* "TRAZER NOTAS DO KINDLE" SAIU DAQUI, e ele nunca esteve no desenho.
              O nó 895:7315 tem os recortes e a grade, e mais nada — eu pus o
              botão aqui por conta própria. O Erik apontou.

              A feature continua existindo: ela mora em `/notas`, que é o lugar
              das notas, e é para lá que a importação leva. Tirar do desenho o
              que ele não tem é a regra; apagar uma feature que funciona não é.
              Ver a Folha no fim deste arquivo — ela agora vive na tela de
              Notas. */}
          <nav className="recortes" aria-label="Recortes da estante">
            {RECORTES.map((r) => {
              const quantos = livros.filter(r.cabe).length;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={r.id === recorte ? "true" : "false"}
                  onClick={() => setRecorte(r.id)}
                  /* Um recorte sem nada dentro não é clicável: levar alguém a
                     uma estante vazia é fazê-lo procurar o erro num lugar onde
                     não há erro. */
                  disabled={quantos === 0 && r.id !== "tudo"}
                  title={quantos === 0 && r.id !== "tudo" ? `Nenhum livro em ${r.rotulo.toLowerCase()}` : null}
                >
                  {r.rotulo} <span className="dado">{quantos}</span>
                </button>
              );
            })}
          </nav>

          {/* A ESTANTE VAZIA PRECISA FALAR. Uma conta recém-criada chega
              exatamente aqui, e uma tela em branco não distingue "você ainda não
              tem nada" de "alguma coisa quebrou" — e quem acabou de entrar pela
              primeira vez está inclinado a supor o segundo.

              O texto diz o que ela é e onde começa, e o único caminho oferecido
              é o que resolve: a Mesa. */}
          {livros.length === 0 ? (
            <div className="estante-vazia">
              <h2>Sua estante ainda está vazia</h2>
              <p>
                Ela guarda o que você preparou: os documentos convertidos, as
                notas que fez neles, e o que já foi para o Kindle.
              </p>
              <Link to="/mesa" className="estante-comecar">Preparar um documento</Link>
            </div>
          ) : vista === "3d" ? (
            <Estante3D
              livros={mostrados}
              selecionado={selecionado}
              aoEscolher={aoEscolher}
            />
          ) : (
            <ul className="grade">
              {mostrados.map((l) => (
                <Livro
                  key={l.chave}
                  {...l}
                  escolhido={l.chave === selecionado?.chave}
                  aoEscolher={() => aoEscolher?.(l)}
                />
              ))}
            </ul>
          )}
        </div>

        <aside className="ficha" aria-label="Livro selecionado">
          {/* O ALTERNADOR EXISTIA E NÃO FAZIA NADA: dois botões com
              `aria-pressed` cravado e sem `onClick`. A vista 3D era o desenho
              prometendo o que o produto não tinha. */}
          {/* O ALTERNADOR E O FUNIL SÃO IRMÃOS, e no telefone a caixa deles vira
              uma fileira — que é onde o nó 964:24606 os põe. No computador ela
              dissolve (`display: contents`) e o alternador continua sendo filho
              direto da ficha, como sempre foi. */}
          <div className="estante-vista">
            <nav className="recortes vista" aria-label="Modo de vista">
              {["capas", "3d"].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={vista === v ? "true" : "false"}
                  onClick={() => setVista(v)}
                >
                  {v === "capas" ? "Capas" : "Estante em 3D"}
                </button>
              ))}
            </nav>

          {/* O FUNIL DO TELEFONE — nó 964:24606, ao lado do alternador de vista.
           *
           * Ele existia no desenho e não tinha painel desenhado em lugar nenhum
           * do arquivo. A decisão foi tomada em 02/09, e ela não inventa nada: o
           * que o funil abre são OS MESMOS RECORTES que o computador mostra em
           * linha. Num telefone de 390 os cinco recortes ou quebram em duas
           * fileiras — comendo um terço da tela antes do primeiro livro — ou
           * rolam para o lado, e recorte que rola para o lado é recorte que
           * ninguém vê.
           *
           * O botão diz QUAL recorte está valendo quando não é "tudo": um funil
           * mudo esconde que a estante está filtrada, e aí a pessoa procura um
           * livro que está ali. */}
          <button
            type="button"
            className="estante-funil"
            aria-expanded={filtrando ? "true" : "false"}
            onClick={() => setFiltrando(true)}
          >
            {/* SEM ÍCONE, e isso é escolha. Não existe funil no conjunto de
                ícones do produto, e o mais parecido é a LUPA — que quer dizer
                busca, e a busca de verdade está a dois centímetros dali, no
                cabeçalho. Dois significados no mesmo símbolo na mesma tela é
                pior que um botão só com texto.
                
                Quando o funil for exportado do Figma, ele entra aqui. */}
            <span>{recorte === "tudo" ? "Filtrar" : RECORTES.find((r) => r.id === recorte)?.rotulo}</span>
          </button>
          </div>

          {selecionado && (
            <article className="ficha-caixa">
              <header>
                {/* O TÍTULO LEVA À FICHA. A ficha lateral cabe o resumo; o que
                    não cabe — todas as notas, e o que a conversão fez — tem
                    tela própria. */}
                <h2>
                  <Link to={`/estante/${selecionado.chave}`}>{selecionado.titulo}</Link>
                </h2>
                {/* CADA PEDAÇO SÓ APARECE SE EXISTIR.
                    A linha era `autor · formato · 80% lido`, com formato e
                    porcentagem vindos de um exemplo — iguais em todo livro. */}
                <p className="ficha-meta">
                  {[
                    selecionado.autor || null,
                    selecionado.formato || null,
                    onde(selecionado),
                  ].filter(Boolean).join(" · ")}
                </p>
              </header>

              {/* A BARRA MEDE CAPÍTULOS, e o rótulo diz isso.
                  Ela media uma porcentagem que ninguém calculava: o servidor não
                  conhece o tamanho do texto, porque o EPUB é lido no navegador.
                  Capítulo lido de capítulos totais é aproximado — capítulos têm
                  tamanhos diferentes — mas é DERIVADO, e o rótulo não promete
                  mais do que isso.

                  Sem ninguém ter aberto o livro, não há barra: uma barra vazia
                  diz "0% lido", que é diferente de "ainda não sei". */}
              {/* A BARRA MEDE O QUE O RÓTULO DIZ. Quando há fração, ela é a
                  fração real do texto; quando não há, ela volta a medir
                  capítulos, e o rótulo ao lado continua dizendo "capítulo N de
                  M". As duas nunca aparecem juntas dizendo coisas diferentes. */}
              {(typeof selecionado.fracao === "number" || selecionado.capitulos > 0) && (() => {
                const porFracao = typeof selecionado.fracao === "number";
                const pct = porFracao
                  ? Math.max(0, Math.min(100, selecionado.fracao * 100))
                  : ((selecionado.capitulo + 1) / selecionado.capitulos) * 100;
                return (
                  <div
                    className="progresso"
                    role="progressbar"
                    aria-valuenow={Math.floor(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={
                      porFracao
                        ? `${selecionado.titulo}: ${Math.floor(pct)} por cento lido`
                        : `${selecionado.titulo}: capítulo ${selecionado.capitulo + 1} de ${selecionado.capitulos}`
                    }
                  >
                    <div className="progresso-feito" style={{ inlineSize: `${pct}%` }} />
                  </div>
                );
              })()}

              <div className="ficha-notas">
                <h3>
                  <span className="dado">{selecionado.notas ?? 0}</span>{" "}
                  {selecionado.notas === 1 ? "nota" : "notas"}
                </h3>

                {/* A ÚLTIMA NOTA DE VERDADE, ou nada.
                    Aqui havia uma frase de enfeite entre aspas, apresentada como
                    citação do livro — em todo livro, a mesma. */}
                {selecionado.ultima_nota ? (
                  <blockquote style={{ background: DESTAQUES[selecionado.ultima_nota.cor] }}>
                    {selecionado.ultima_nota.trecho}
                  </blockquote>
                ) : (
                  <p className="ficha-nota">
                    Nada marcado ainda. Selecione um trecho durante a leitura para
                    guardar aqui.
                  </p>
                )}
              </div>

              {/* OS DADOS DO ARQUIVO. Selecionar existe para isto: ver o que
                  aquele arquivo é, e o que a conversão fez com ele. A ficha
                  dizia só o que a leitura sabe — progresso, notas, citação —, e
                  o que o arquivo é ficava a um clique de distância, na tela do
                  livro.

                  Cada linha só aparece quando há o que dizer. Uma lista com
                  seis "—" descreve a ausência de informação com a mesma ênfase
                  da informação. */}
              {(() => {
                const linhas = [
                  ["Páginas", selecionado.paginas ? String(selecionado.paginas) : null],
                  ["Digitalizado",
                    selecionado.digitalizado === true
                      ? (selecionado.ocr ? "Sim — texto reconhecido por OCR" : "Sim")
                      : selecionado.digitalizado === false
                        ? "Não — o texto já estava no arquivo"
                        : null],
                  ["Traduzido",
                    selecionado.traduzido
                      ? `De ${selecionado.traduzido.de || "?"} para ${selecionado.traduzido.para || "?"}`
                      : null],
                  ["Quadrinho",
                    selecionado.quadrinho
                      ? (selecionado.mangaRtl ? "Sim, lido da direita para a esquerda" : "Sim")
                      : null],
                  ["No Kindle", selecionado.noKindle ? "Enviado" : "Ainda não enviado"],
                  ["Chegou em",
                    selecionado.chegouEm
                      ? new Date(selecionado.chegouEm).toLocaleDateString("pt-BR", {
                          day: "numeric", month: "long", year: "numeric",
                        })
                      : null],
                ].filter(([, v]) => v);

                if (!linhas.length) return null;
                /* DOBRADO, e aberto por quem quiser. Seis linhas de dados
                   empurravam "Continuar" para fora da tela — e o que a pessoa
                   faz sempre é continuar lendo; o que ela faz de vez em quando
                   é conferir o arquivo.

                   `<details>` nativo e não um estado meu: ele já vem com
                   teclado, com o anúncio de "expandido/recolhido" no leitor de
                   tela, e com a busca do navegador (Ctrl+F) abrindo o conteúdo
                   escondido para achar o que está lá dentro. */
                return (
                  <details className="ficha-detalhes">
                    <summary>
                      Ver detalhes do arquivo
                      <span className="dado">{linhas.length}</span>
                    </summary>
                    <dl className="ficha-dados">
                      {linhas.map(([rotulo, valor]) => (
                        <div key={rotulo} className="ficha-dados-linha">
                          <dt>{rotulo}</dt>
                          <dd>{valor}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                );
              })()}

              <div className="ficha-acoes">
                {/* SEM ARQUIVO NÃO HÁ O QUE ABRIR, e o botão diz isso em vez de
                    ficar clicável e não fazer nada. Um botão que não responde é
                    lido como produto quebrado; um botão desabilitado com o
                    motivo ao lado é lido como estado. */}
                <Botao
                  tom="primaria"
                  onClick={() => aoAbrir?.(selecionado)}
                  porque={!selecionado.leituraUrl ? "Este livro ainda não tem texto para ler aqui" : null}
                >
                  Continuar
                </Botao>
                {/* ELE NÃO FAZIA NADA: `<Botao>` sem `onClick`. As notas do
                    livro moram na ficha inteira, que é onde cabem todas. */}
                <Link className="botao secundaria" to={`/estante/${selecionado.chave}#notas`}>
                  Notas
                </Link>
              </div>

              {/* O ENVIO AO KINDLE NÃO MORA AQUI, e a razão é do Erik: "não
                  precisa do botão enviar ao Kindle na Estante — o usuário faz
                  isso na tela do livro" (R-05).

                  A ficha lateral é um RESUMO: ela cabe o que o livro é e para
                  onde ir. Mandar um arquivo para um aparelho é a ação que sai
                  da tela, é a mais cara de desfazer, e ela pede a tela inteira
                  do livro — onde ela está, com o estado do envio e o erro do
                  servidor ao lado (`Livro.jsx`). Aqui ela dividia espaço com
                  "Continuar" e "Notas", que agem dentro da tela, e a diferença
                  entre as três sumia.

                  O estado CONTINUA visível na ficha: "No Kindle · Enviado" está
                  nos dados do arquivo, acima. Tirar o botão não é esconder o
                  fato — é tirar o gatilho de onde ele não é o assunto. */}
              {!selecionado.leituraUrl && (
                <p className="ficha-aviso">
                  Ainda em preparo. O texto abre quando a conversão terminar.
                </p>
              )}
            </article>
          )}
        </aside>
      </section>

    
      <Rodape />
    </div>
  );
}
