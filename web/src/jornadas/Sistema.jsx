/* O catálogo dos componentes — a pergunta C19 do `ABERTO.md`.
 *
 * POR QUE ELE EXISTE. O `DESIGN-SYSTEM.md` cobre fundamentos e composição, e
 * nenhum componente tinha uma página que mostrasse os ESTADOS dele. A
 * consequência não é estética: um estado que ninguém vê lado a lado é um estado
 * que ninguém percebe ter quebrado. O botão de perigo no tema escuro, o campo
 * com erro, a escolha de três opções — cada um só aparecia dentro da tela onde
 * mora, uma tela por vez.
 *
 * ELE NÃO É UMA TELA DO PRODUTO, e por isso não está no Figma nem no menu: a
 * rota só é registrada quando `import.meta.env.DEV` é verdadeiro. Em produção
 * ela não existe — nem como caminho, nem no pacote, porque o `import` fica atrás
 * da mesma condição e o Rollup corta o ramo morto.
 *
 * A razão de não ser produto é simples: o Erik disse que o escopo da V1 é o
 * Figma inteiro, e uma tela que o Figma não tem seria eu acrescentando escopo
 * sozinho. Isto é instrumento, como o `scripts/portao.js` — serve para OLHAR o
 * que já existe.
 *
 * E ELE USA OS COMPONENTES DE VERDADE, e não cópias. Uma cópia envelhece: o
 * catálogo mostraria um botão que o produto não tem mais, e ninguém notaria —
 * que é exatamente o defeito que ele existe para evitar.
 */
import { useState } from "react";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import { Escolha } from "../componentes/Escolha.jsx";
import { Folha } from "../componentes/Folha.jsx";
import { Icone } from "../componentes/Icone.jsx";
import { Formatos } from "../componentes/Formatos.jsx";
import { TrilhaDaPagina } from "../componentes/TrilhaDaPagina.jsx";
import "./sistema.css";

/* A escala do sistema, e ela é a MESMA lista que o `scripts/portao.js` usa para
 * recusar. Escrevê-la de novo aqui seria uma segunda verdade sobre a mesma
 * coisa — e a que o portão não lê é a que fica errada. */
const CORPOS = [14, 16, 18, 20, 22, 24, 28, 32, 40, 48, 56, 64];

/* Os papéis de cor do sistema, pelos nomes das variáveis. O quadrado mostra a
 * cor; o nome mostra por onde ela é pedida. */
const TINTAS = [
  ["--foreground", "tinta cheia"],
  ["--muted-foreground", "tinta secundária"],
  ["--background", "papel"],
  ["--background-secondary", "papel rebaixado"],
  ["--card", "cartão"],
  ["--border", "filete"],
  ["--destructive", "alarme"],
];

/* O RÓTULO É O QUE O ÍCONE QUER DIZER, e não o nome do arquivo.
 *
 * A primeira versão mostrava o nome do arquivo — `preferencias`, `nota-nova` —,
 * e o portão recusou: ele acusa palavra sem acento em texto de interface,
 * porque é assim que identificador interno vaza para a tela. Ele estava certo
 * duas vezes: além de parecer código, "preferencias" não diz o que o desenho
 * significa, e um catálogo em que o rótulo é o nome do arquivo obriga a abrir o
 * arquivo para saber o que se está vendo.
 *
 * O nome do arquivo continua alcançável, no `title` — que é onde o dado técnico
 * pertence. */
const ICONES = [
  ["mesa", "Mesa"], ["estante", "Estante"], ["canvas", "Canvas"],
  ["estudos", "Estudos"], ["buscar", "Buscar"], ["conta", "Conta"],
  ["menu", "Menu"], ["caderno", "Caderno"], ["atalho", "Atalho"],
  ["indice", "Índice"], ["marcador", "Marcador"], ["paginas", "Páginas"],
  ["preferencias", "Preferências"], ["privacidade", "Privacidade"],
  ["refazer", "Refazer"], ["remover", "Remover"], ["renomear", "Renomear"],
  ["aparelho", "Aparelho"], ["baixar", "Baixar"], ["copiar", "Copiar"],
  ["enviar", "Enviar"], ["nota-nova", "Nota nova"],
];

function Peca({ id, nome, diz, children }) {
  return (
    <section className="peca" id={id}>
      <h2>{nome}</h2>
      <p className="peca-diz">{diz}</p>
      <div className="peca-corpo">{children}</div>
    </section>
  );
}

/* Cada estado com o NOME dele embaixo. Um catálogo sem os nomes é uma vitrine:
 * dá para ver que são diferentes, e não dá para pedir um. */
function Estado({ rotulo, children }) {
  return (
    <div className="estado">
      <div className="estado-palco">{children}</div>
      <p className="estado-rotulo">{rotulo}</p>
    </div>
  );
}

export function Sistema() {
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [escolha, setEscolha] = useState("guiado");
  const [texto, setTexto] = useState("");

  return (
    <div className="mesa">
      <Cabecalho />

      <div className="sistema">
        <TrilhaDaPagina
          rotulo="Neste catálogo"
          itens={[
            { id: "sistema-inicio", rotulo: "Início" },
            { id: "peca-tinta", rotulo: "Tintas" },
            { id: "peca-corpo", rotulo: "Corpos" },
            { id: "peca-botao", rotulo: "Botão" },
            { id: "peca-campo", rotulo: "Campo" },
            { id: "peca-escolha", rotulo: "Escolha" },
            { id: "peca-folha", rotulo: "Folha" },
            { id: "peca-icone", rotulo: "Ícone" },
            { id: "peca-compostos", rotulo: "Compostos" },
          ]}
        />

        <main className="sistema-corpo">
          <header className="sistema-topo" id="sistema-inicio">
            <p className="sistema-marca">Instrumento · não é tela do produto</p>
            <h1>Os componentes, e os estados de cada um</h1>
            <p className="sistema-sobre">
              Esta página só existe em desenvolvimento. Ela usa os componentes de
              verdade — não cópias —, então um estado que quebrar no produto
              quebra aqui, que é o motivo de ela existir.
            </p>
          </header>

          <Peca
            id="peca-tinta"
            nome="Tintas"
            diz="Os papéis de cor, pelo nome da variável. O portão recusa qualquer cor que não venha de um destes."
          >
            <ul className="tintas">
              {TINTAS.map(([variavel, papel]) => (
                <li key={variavel}>
                  <span className="tinta-quadro" style={{ background: `var(${variavel})` }} />
                  <span className="tinta-nome">{papel}</span>
                  <code>{variavel}</code>
                </li>
              ))}
            </ul>
          </Peca>

          <Peca
            id="peca-corpo"
            nome="Corpos"
            diz="A escala do sistema. Um tamanho fora dela é recusado pelo portão — e a lista aqui é a mesma que ele usa."
          >
            <ul className="corpos">
              {CORPOS.map((c) => (
                <li key={c}>
                  <span style={{ fontSize: `${c}px`, lineHeight: 1.2 }}>Ag</span>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
          </Peca>

          <Peca
            id="peca-botao"
            nome="Botão"
            diz="Três tons. O alarme é para o que não tem volta — gastá-lo em ação reversível deixa o próximo sem força."
          >
            <Estado rotulo="primária"><Botao tom="primaria">Preparar</Botao></Estado>
            <Estado rotulo="secundária"><Botao tom="secundaria">Ver na estante</Botao></Estado>
            <Estado rotulo="perigo"><Botao tom="perigo">Apagar minha conta</Botao></Estado>
            <Estado rotulo="primária, desligada"><Botao tom="primaria" disabled>Enviando…</Botao></Estado>
            <Estado rotulo="secundária, desligada"><Botao tom="secundaria" disabled>Trazer nota</Botao></Estado>
            <Estado rotulo="com ícone">
              <Botao tom="primaria" icone="/icones/icone-enviar.svg">Enviar ao Kindle</Botao>
            </Estado>
          </Peca>

          <Peca
            id="peca-campo"
            nome="Campo"
            diz="O rótulo é sempre elemento, mesmo quando não se vê: um `placeholder` some ao digitar, e leitor de tela nenhum é obrigado a lê-lo."
          >
            <Estado rotulo="normal">
              <Campo rotulo="Título" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </Estado>
            <Estado rotulo="com ajuda">
              <Campo rotulo="Endereço do aparelho" ajuda="Aparece no próprio Kindle, em Configurações › Sua conta." defaultValue="" />
            </Estado>
            <Estado rotulo="com erro">
              <Campo rotulo="Senha do arquivo" tipo="password" erro="Essa senha não abre o arquivo." defaultValue="" />
            </Estado>
            <Estado rotulo="rótulo oculto">
              <Campo rotulo="Buscar" rotuloOculto tipo="search" placeholder="Buscar em livros, notas e contextos" defaultValue="" />
            </Estado>
          </Peca>

          <Peca
            id="peca-escolha"
            nome="Escolha"
            diz="Um grupo de opções com o que cada uma faz dito ao lado. `fieldset` e `legend` são o que faz o leitor de tela anunciar o título antes de cada opção."
          >
            <Estado rotulo="duas opções, com explicação">
              <Escolha
                nome="catalogo-modo"
                titulo="Modo ao abrir um arquivo"
                explicacao="Vale para os próximos arquivos. Nada muda no que já está preparado."
                valor={escolha}
                aoTrocar={setEscolha}
                opcoes={[
                  { id: "guiado", rotulo: "Guiado", detalhe: "O Mekora decide e pede confirmação uma vez." },
                  { id: "personalizado", rotulo: "Personalizado", detalhe: "Abre com os controles à vista." },
                ]}
              />
            </Estado>
            <Estado rotulo="três opções, com aviso">
              <Escolha
                nome="catalogo-movimento"
                titulo="Movimento"
                valor="sistema"
                aoTrocar={() => {}}
                aviso="Guardado, mas ainda sem efeito no produto."
                opcoes={[
                  { id: "sistema", rotulo: "Seguir o sistema" },
                  { id: "reduzido", rotulo: "Reduzido", detalhe: "Nada se move." },
                  { id: "completo", rotulo: "Completo" },
                ]}
              />
            </Estado>
          </Peca>

          <Peca
            id="peca-folha"
            nome="Folha"
            diz="A camada que abre por cima. É `<dialog>` de verdade: fecha no Esc, prende o foco dentro, e o resto da página vira inerte sem ninguém escrever isso."
          >
            <Estado rotulo="fechada, e o gesto que abre">
              <Botao tom="secundaria" onClick={() => setFolhaAberta(true)}>Abrir a folha</Botao>
            </Estado>
          </Peca>

          <Peca
            id="peca-icone"
            nome="Ícone"
            diz="Máscara, e não imagem: a tinta vem do `currentColor`, então o mesmo arquivo serve nos dois temas e dentro de um botão invertido."
          >
            <ul className="icones">
              {ICONES.map(([arquivo, nome]) => (
                <li key={arquivo} title={`icone-${arquivo}.svg`}>
                  <Icone src={`/icones/icone-${arquivo}.svg`} />
                  <span>{nome}</span>
                </li>
              ))}
            </ul>
          </Peca>

          <Peca
            id="peca-compostos"
            nome="Compostos"
            diz="Estes só existem dentro de uma tela — eles leem rota, sessão ou lista, e um palco vazio mostraria uma casca. O que se vê aqui é o que funciona sem contexto."
          >
            <Estado rotulo="Formatos — vem do servidor">
              <Formatos />
            </Estado>
            <Estado rotulo="Trilha da página — a desta página, à esquerda">
              <p className="peca-nota">
                Ela está viva na coluna ao lado: role e o traço acompanha.
              </p>
            </Estado>
            <Estado rotulo="Cabeçalho, Rodapé, Busca, Trilha da conta, Soltar…">
              <p className="peca-nota">
                Leem rota, sessão ou lista. O Cabeçalho está no topo desta página,
                e os outros vivem nas telas que os usam.
              </p>
            </Estado>
          </Peca>
        </main>
      </div>

      <Folha
        aberta={folhaAberta}
        titulo="Uma folha de exemplo"
        aoFechar={() => setFolhaAberta(false)}
        acoes={<Botao tom="primaria" onClick={() => setFolhaAberta(false)}>Guardar</Botao>}
      >
        <p>
          O conteúdo entra aqui. A folha cresce com ele até o teto da tela, e daí
          rola por dentro — a página atrás não rola junto.
        </p>
        <Campo rotulo="Um campo dentro da folha" defaultValue="" />
      </Folha>
    </div>
  );
}
